/**
 * Critic Agent
 * Reviews and critiques newsletter drafts using Claude API
 */

import { ChatAnthropic } from '@langchain/anthropic';
import { CRITIC_PROMPTS, QUALITY_CRITERIA } from '../utils/prompt-templates.js';
import { Critique } from '../models/critique.js';
import { AGENT_CONFIG } from '../config/agent-config.js';
import createLogger from '../../utils/logger.js';

const logger = createLogger('CriticAgent');

export class CriticAgent {
  constructor(options = {}) {
    this.options = {
      temperature: options.temperature || AGENT_CONFIG.critic.temperature,
      maxTokens: options.maxTokens || AGENT_CONFIG.critic.maxTokens,
      modelName: options.modelName || AGENT_CONFIG.modelName,
      qualityThreshold: options.qualityThreshold || AGENT_CONFIG.critic.defaultThreshold
    };

    this.llm = new ChatAnthropic({
      modelName: this.options.modelName,
      temperature: this.options.temperature,
      maxTokens: this.options.maxTokens,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY
    });
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

    // Try parsing as-is first
    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      logger.debug('Initial JSON parse failed, applying fixes...');
    }

    // Fix common issues
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
   * Review a draft and provide critique
   */
  async review(draft, articles) {
    try {
      logger.info(`Critic reviewing draft ${draft.id}...`);

      const prompt = CRITIC_PROMPTS.review(draft.toJSON(), articles);

      const response = await this.llm.invoke(prompt);
      const content = response.content;

      // Parse JSON response using helper
      let critiqueData;
      try {
        critiqueData = this.extractJSON(content);
      } catch (error) {
        logger.error('Failed to parse Critic response as JSON:', error.message);
        logger.debug('Raw response:', content.substring(0, 500));
        throw new Error('Invalid JSON response from Critic agent');
      }

      // Create critique object
      const critique = new Critique({
        draftId: draft.id,
        iteration: draft.iteration,
        ...critiqueData
      });

      // Calculate overall score
      critique.calculateOverallScore();

      // Determine if satisfactory
      critique.determineSatisfactory(this.options.qualityThreshold);

      logger.success(`Critique complete: ${critique.id}`);
      logger.info(`  Overall score: ${critique.overallScore}/10`);
      logger.info(`  Satisfactory: ${critique.isSatisfactory ? 'Yes' : 'No'}`);

      if (critique.topImprovements.length > 0) {
        logger.info('  Top improvements needed:');
        critique.topImprovements.forEach((improvement, i) => {
          logger.info(`    ${i + 1}. ${improvement}`);
        });
      }

      // Log individual criteria scores
      logger.info('  Criteria scores:');
      for (const [criterion, data] of Object.entries(critique.criteria)) {
        logger.info(`    ${criterion}: ${data.score}/10 ${data.feedback ? '- ' + data.feedback.substring(0, 50) : ''}`);
      }

      return critique;
    } catch (error) {
      logger.error('Failed to review draft:', error.message);
      throw error;
    }
  }

  /**
   * Get quality criteria weights
   */
  getQualityCriteria() {
    return QUALITY_CRITERIA;
  }

  /**
   * Get quality threshold
   */
  getQualityThreshold() {
    return this.options.qualityThreshold;
  }
}

export default CriticAgent;
