/**
 * Writer Agent
 * Generates and revises newsletter content using Claude API
 */

import { ChatAnthropic } from '@langchain/anthropic';
import { WRITER_PROMPTS } from '../utils/prompt-templates.js';
import { Draft } from '../models/draft.js';
import { getCacheManager } from '../utils/cache-manager.js';
import { AGENT_CONFIG } from '../config/agent-config.js';
import createLogger from '../../utils/logger.js';

const logger = createLogger('WriterAgent');

export class WriterAgent {
  constructor(options = {}) {
    this.options = {
      temperature: options.temperature || AGENT_CONFIG.writer.temperature,
      maxTokens: options.maxTokens || AGENT_CONFIG.writer.maxTokens,
      modelName: options.modelName || AGENT_CONFIG.modelName
    };

    this.llm = new ChatAnthropic({
      modelName: this.options.modelName,
      temperature: this.options.temperature,
      maxTokens: this.options.maxTokens,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY
    });

    this.draft = null;
    this.cache = getCacheManager({ enabled: process.env.WRITING_AGENTS_CACHE_ENABLED !== 'false' });
  }

  /**
   * Helper: Extract JSON from LLM response
   */
  extractJSON(content) {
    // Extract JSON from content
    let jsonStr = content;

    // Try to extract from ```json code blocks first
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    } else {
      // Try to find JSON object directly (greedy match)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      jsonStr = jsonMatch[0];
    }

    // Try parsing as-is first (LLM may return valid JSON now with improved prompts)
    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      logger.debug('Initial JSON parse failed, applying fixes...');
    }

    // Fix common issues
    // 1. Remove trailing commas
    let fixedJson = jsonStr.replace(/,(\s*[}\]])/g, '$1');

    try {
      return JSON.parse(fixedJson);
    } catch (error) {
      logger.debug('JSON parse error after fixes:', error.message);
      logger.debug('Attempted to parse:', fixedJson.substring(0, 500));
      throw new Error(`Invalid JSON: ${error.message}`);
    }
  }

  /**
   * Generate initial draft from articles
   */
  async generateInitial(articles) {
    try {
      logger.info('Generating initial draft...');
      const prompt = WRITER_PROMPTS.generateInitial(articles);

      // Check cache
      const cached = await this.cache.get(prompt, { type: 'generateInitial' });
      if (cached) {
        logger.info('Using cached response for initial draft');
        const draftData = cached;
        const draft = new Draft({
          ...draftData,
          iteration: 0,
          metadata: {
            ...draftData.metadata,
            createdAt: new Date().toISOString(),
            generatedBy: 'writer-agent'
          }
        });
        this.draft = draft;
        return draft;
      }

      const response = await this.llm.invoke(prompt);
      const content = response.content;

      // Parse JSON response using helper
      let draftData;
      try {
        draftData = this.extractJSON(content);
      } catch (error) {
        logger.error('Failed to parse Writer response as JSON:', error.message);
        logger.debug('Raw response:', content.substring(0, 500));
        throw new Error('Invalid JSON response from Writer agent');
      }

      // Cache the response
      await this.cache.set(prompt, draftData, { type: 'generateInitial' });

      // Create draft object
      this.draft = new Draft({
        ...draftData,
        iteration: 0,
        metadata: {
          ...draftData.metadata,
          createdAt: new Date().toISOString(),
          generatedBy: 'writer-agent'
        }
      });

      logger.success(`Initial draft generated: ${this.draft.id}`);
      logger.info(`  Title: ${this.draft.title}`);
      logger.info(`  Insights: ${this.draft.insights.length}`);
      logger.info(`  Recommendations: ${this.draft.recommendations.length}`);

      return this.draft;
    } catch (error) {
      logger.error('Failed to generate initial draft:', error.message);
      throw error;
    }
  }

  /**
   * Revise draft based on critique
   */
  async revise(draft, critique) {
    try {
      logger.info(`Revising draft (iteration ${draft.iteration + 1})...`);

      if (critique.topImprovements.length > 0) {
        logger.info('  Top improvements to address:');
        critique.topImprovements.forEach((improvement, i) => {
          logger.info(`    ${i + 1}. ${improvement}`);
        });
      }

      const prompt = WRITER_PROMPTS.revise(draft.toJSON(), critique.toJSON());

      const response = await this.llm.invoke(prompt);
      const content = response.content;

      // Parse JSON response using helper
      let revisedData;
      try {
        revisedData = this.extractJSON(content);
      } catch (error) {
        logger.error('Failed to parse Writer revision as JSON:', error.message);
        logger.debug('Raw response:', content.substring(0, 500));
        throw new Error('Invalid JSON response from Writer agent');
      }

      // Create new version of draft
      const revisedDraft = draft.newVersion();
      Object.assign(revisedDraft, revisedData);
      revisedDraft.iteration = draft.iteration + 1;
      revisedDraft.metadata.updatedAt = new Date().toISOString();
      revisedDraft.metadata.lastRevisedBy = 'writer-agent';

      this.draft = revisedDraft;

      logger.success(`Draft revised: version ${revisedDraft.version}, iteration ${revisedDraft.iteration}`);
      logger.info(`  Title: ${revisedDraft.title}`);

      return revisedDraft;
    } catch (error) {
      logger.error('Failed to revise draft:', error.message);
      throw error;
    }
  }

  /**
   * Finalize draft for newsletter delivery
   */
  async finalize(draft) {
    try {
      logger.info('Finalizing draft for newsletter...');

      const prompt = WRITER_PROMPTS.finalize(draft.toJSON());

      const response = await this.llm.invoke(prompt);
      const content = response.content;

      // Parse JSON response using helper
      let finalizedData;
      try {
        finalizedData = this.extractJSON(content);
      } catch (error) {
        logger.error('Failed to parse Writer finalization as JSON:', error.message);
        logger.debug('Raw response:', content.substring(0, 500));
        throw new Error('Invalid JSON response from Writer agent');
      }

      // Generate HTML and text content programmatically
      const htmlContent = this.generateHTMLContent(draft, finalizedData);
      const textContent = this.generateTextContent(draft, finalizedData);

      // Update draft with finalized content
      const finalizedDraft = draft.newVersion();
      Object.assign(finalizedDraft, finalizedData);
      finalizedDraft.htmlContent = htmlContent;
      finalizedDraft.textContent = textContent;
      finalizedDraft.iteration = draft.iteration;
      finalizedDraft.metadata.finalizedAt = new Date().toISOString();
      finalizedDraft.metadata.finalizedBy = 'writer-agent';

      this.draft = finalizedDraft;

      logger.success(`Draft finalized: ${finalizedDraft.id}`);
      logger.info(`  Subject: ${finalizedDraft.subject}`);
      logger.info(`  Word count: ${finalizedDraft.metadata.wordCount}`);
      logger.info(`  Reading time: ${finalizedDraft.metadata.readingTime}`);

      return finalizedDraft;
    } catch (error) {
      logger.error('Failed to finalize draft:', error.message);
      throw error;
    }
  }

  /**
   * Generate HTML content for newsletter
   */
  generateHTMLContent(draft, finalizedData) {
    const { intro, outro, cta } = finalizedData;

    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${draft.title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #1E40AF; }
    h2 { color: #3B82F6; margin-top: 30px; }
    .intro { font-size: 1.1em; color: #666; margin-bottom: 30px; }
    .insight { background: #F3F4F6; padding: 15px; margin: 20px 0; border-left: 4px solid #3B82F6; }
    .recommendation { background: #ECFDF5; padding: 15px; margin: 20px 0; border-left: 4px solid #10B981; }
    .recommendation.high { border-left-color: #EF4444; }
    .recommendation.medium { border-left-color: #F59E0B; }
    .brand { background: #F9FAFB; padding: 15px; margin: 30px 0; text-align: center; border-radius: 4px; }
    .outro { color: #666; margin-top: 30px; font-style: italic; }
    .footer { border-top: 1px solid #E5E7EB; padding-top: 20px; margin-top: 40px; font-size: 0.9em; color: #9CA3AF; }
  </style>
</head>
<body>
  <h1>${draft.title}</h1>

  <div class="intro">${intro}</div>

  <p><strong>${draft.summary}</strong></p>

  <h2>Points Clés</h2>
`;

    // Add insights
    draft.insights.forEach(insight => {
      html += `
  <div class="insight">
    <h3>${insight.title}</h3>
    <p>${insight.description}</p>
    <p><em>Implication : ${insight.implications}</em></p>
  </div>
`;
    });

    html += `
  <h2>Recommandations</h2>
`;

    // Add recommendations
    draft.recommendations.forEach(rec => {
      html += `
  <div class="recommendation ${rec.priority}">
    <h3>🎯 ${rec.action}</h3>
    <p><strong>Pourquoi ?</strong> ${rec.rationale}</p>
    <p><strong>Quand ?</strong> ${rec.timeframe}</p>
  </div>
`;
    });

    html += `
  <div class="brand">
    <p>${cta}</p>
  </div>

  <div class="outro">${outro}</div>

  <div class="footer">
    <p><strong>AI Keytake</strong> - Intelligence Artificielle</p>
    <p style="margin-top: 20px; font-size: 0.8em;">Sources :</p>
`;

    // Add citations
    draft.citations.forEach(citation => {
      html += `    <p>• <a href="${citation.url}">${citation.title}</a></p>\n`;
    });

    html += `
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * Generate plain text content for newsletter
   */
  generateTextContent(draft, finalizedData) {
    const { intro, outro, cta } = finalizedData;

    let text = `${draft.title}\n`;
    text += `${'='.repeat(draft.title.length)}\n\n`;

    text += `${intro}\n\n`;
    text += `${draft.summary}\n\n`;

    text += `POINTS CLÉS\n`;
    text += `${'-'.repeat(50)}\n\n`;

    draft.insights.forEach((insight, i) => {
      text += `${i + 1}. ${insight.title}\n`;
      text += `   ${insight.description}\n`;
      text += `   Implication : ${insight.implications}\n\n`;
    });

    text += `RECOMMANDATIONS\n`;
    text += `${'-'.repeat(50)}\n\n`;

    draft.recommendations.forEach((rec, i) => {
      text += `${i + 1}. [${rec.priority.toUpperCase()}] ${rec.action}\n`;
      text += `   Pourquoi ? ${rec.rationale}\n`;
      text += `   Quand ? ${rec.timeframe}\n\n`;
    });

    text += `${cta}\n\n`;
    text += `${outro}\n\n`;

    text += `---\n`;
    text += `AI Keytake - Intelligence Artificielle\n\n`;

    text += `Sources :\n`;
    draft.citations.forEach(citation => {
      text += `• ${citation.title}\n  ${citation.url}\n`;
    });

    return text;
  }

  /**
   * Get current draft
   */
  getDraft() {
    return this.draft;
  }
}

export default WriterAgent;
