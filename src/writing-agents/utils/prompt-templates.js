/**
 * Prompt Templates for Writer and Critic Agents
 */

export const WRITER_PROMPTS = {
  /**
   * Generate initial draft from articles
   */
  generateInitial: (articles) => `You are an AI analyst writing for AI Keytake newsletter. Your role is to analyze and synthesize AI industry news.

TASK: Write an objective analysis of these trending AI articles. Focus ONLY on what the articles say - their insights, trends, and implications. Do NOT mention AI Keytake services or business offerings.

ARTICLES:
${articles.map((a, i) => `
${i + 1}. ${a.title}
   Source: ${a.sources.join(', ')}
   Score: ${a.score}
   Summary: ${a.summary || 'No summary'}
   URL: ${a.url}
`).join('\n')}

REQUIREMENTS:
- Analyze the articles objectively - focus on the content, not on selling anything
- Extract key insights and trends from the articles themselves
- Provide analysis of what these developments mean for the AI industry
- Write in a clear, informative journalistic style
- Avoid promotional language or business pitches
- Properly cite sources
- Write in French (primary language) with English quotes where appropriate
- NO apostrophes in French words - use "l intelligence" or "lintelligence" instead of "l'intelligence"

CRITICAL JSON REQUIREMENTS:
- Your ENTIRE response must be ONLY the JSON object wrapped in \`\`\`json code blocks
- NO text outside the JSON
- NO commentary before or after
- NO apostrophes - replace L'IA with "L IA" or "l intelligence artificielle"
- NO single quotes - use only double quotes for strings
- NO trailing commas

OUTPUT FORMAT (JSON ONLY):
\`\`\`json
{
  "title": "Analysis title based on article themes",
  "summary": "Brief objective summary of key developments",
  "insights": [
    {
      "title": "Key insight from articles",
      "description": "Detailed explanation of what the articles reveal",
      "sourceArticles": [0],
      "implications": "What this means for the AI industry"
    }
  ],
  "recommendations": [
    {
      "priority": "high",
      "action": "Objective recommendation based on article content",
      "rationale": "Why this matters according to the articles",
      "timeframe": "Relevant timeframe mentioned or implied"
    }
  ],
  "citations": [
    {
      "title": "Article title",
      "url": "Article URL",
      "relevance": "How this source informed the analysis"
    }
  ]
}
\`\`\`

Generate ONLY the JSON. No other text.`,

  /**
   * Revise draft based on critique
   */
  revise: (draft, critique) => `You are an AI analyst writing for AI Keytake newsletter.

TASK: Revise the analysis draft based on the critic's feedback. Focus on improving the objectivity and clarity of your analysis.

CURRENT DRAFT:
${JSON.stringify(draft, null, 2)}

CRITIC FEEDBACK:
${JSON.stringify(critique, null, 2)}

INSTRUCTIONS:
Address each point in the critique:
- Fix any weaknesses or gaps in the analysis
- Improve clarity and flow
- Add missing elements from the articles
- Ensure all claims are supported by the sources
- Maintain objective, analytical tone
- Check that all citations are accurate

CRITICAL JSON REQUIREMENTS:
- Your ENTIRE response must be ONLY the JSON object wrapped in \`\`\`json code blocks
- NO text outside the JSON
- NO commentary before or after
- NO apostrophes in French words
- NO single quotes - use only double quotes
- NO trailing commas

OUTPUT FORMAT (JSON ONLY):
\`\`\`json
{
  "title": "Analysis title",
  "summary": "Brief objective summary",
  "insights": [...],
  "recommendations": [...],
  "citations": [...]
}
\`\`\`

Revise and return ONLY the JSON. No other text.`,

  /**
   * Finalize draft for newsletter
   */
  finalize: (draft) => `You are an AI analyst writing for AI Keytake newsletter.

TASK: Finalize the analysis for email delivery. Add a brief intro and outro - focus on the content value, not on promoting services.

DRAFT:
${JSON.stringify(draft, null, 2)}

REQUIREMENTS:
- Polish language and flow for readability
- Ensure compelling, accurate headlines
- Verify all citations are correct
- Add a brief intro that sets context (what readers will learn)
- Add a brief outro that wraps up the key takeaways
- Keep AI Keytake only as the newsletter brand/identifier
- NO promotional language or service pitches

CRITICAL JSON REQUIREMENTS:
- Your ENTIRE response must be ONLY the JSON object wrapped in \`\`\`json code blocks
- NO text outside the JSON
- NO commentary before or after
- NO apostrophes in French words
- Keep responses concise
- NO trailing commas

OUTPUT FORMAT (JSON ONLY):
\`\`\`json
{
  "subject": "Brief subject line under 50 chars",
  "previewText": "Short preview under 100 chars",
  "intro": "Brief context-setting intro (what this analysis covers)",
  "outro": "Brief summary of key takeaways",
  "cta": "Simple brand signature: AI Keytake - Intelligence Artificielle",
  "metadata": {
    "wordCount": ${draft.metadata.wordCount || 0},
    "readingTime": "5 min read",
    "insightCount": ${draft.insights?.length || 0},
    "recommendationCount": ${draft.recommendations?.length || 0}
  }
}
\`\`\`

Finalize and return ONLY the JSON. No other text.`,
};

export const CRITIC_PROMPTS = {
  /**
   * Review newsletter draft
   */
  review: (draft, articles) => `You are a critical reviewer for AI Keytake newsletter. Your job is to ensure high-quality, objective analysis.

DRAFT TO REVIEW:
${JSON.stringify(draft, null, 2)}

ORIGINAL ARTICLES:
${articles.map((a, i) => `
${i + 1}. ${a.title}
   URL: ${a.url}
   Summary: ${a.summary || 'No summary'}
`).join('\n')}

EVALUATE THE DRAFT ON:

1. **Accuracy (20%)**: Are claims supported by sources? Are there factual errors or misrepresentations?
2. **Clarity (20%)**: Is the analysis clear and understandable? Any confusing or ambiguous parts?
3. **Value (25%)**: Does it provide meaningful insights from the articles? Is the analysis substantive?
4. **Completeness (15%)**: Are key points from the articles covered? What important insights are missing?
5. **Voice (10%)**: Is the tone objective and analytical? Avoid promotional language.
6. **Citations (10%)**: Are sources properly credited and accurately represented?

FOR EACH CRITERION:
- Score 1-10
- Provide specific feedback
- Note any weaknesses or gaps
- Suggest improvements

OVERALL EVALUATION:
- Calculate overall score (weighted average)
- Determine if satisfactory (score >= 8/10)
- List top 3 improvements needed

CRITICAL JSON REQUIREMENTS:
- Your ENTIRE response must be ONLY the JSON object wrapped in \`\`\`json code blocks
- NO text outside the JSON
- NO commentary before or after
- Keep feedback concise to avoid parsing issues
- NO trailing commas

OUTPUT FORMAT (JSON ONLY):
\`\`\`json
{
  "criteria": {
    "accuracy": {"score": 8, "feedback": "specific feedback", "weaknesses": []},
    "clarity": {"score": 7, "feedback": "specific feedback", "weaknesses": []},
    "value": {"score": 9, "feedback": "specific feedback", "weaknesses": []},
    "completeness": {"score": 6, "feedback": "specific feedback", "weaknesses": []},
    "voice": {"score": 8, "feedback": "specific feedback", "weaknesses": []},
    "citations": {"score": 7, "feedback": "specific feedback", "weaknesses": []}
  },
  "overallScore": 7.5,
  "isSatisfactory": false,
  "topImprovements": [
    "Add specific example",
    "Clarify technical term",
    "Include more recommendations"
  ],
  "strengths": ["Good insight", "Clear recommendations"],
  "detailedFeedback": "Comprehensive feedback"
}
\`\`\`

Review and return ONLY the JSON. No other text.`
};

export const QUALITY_CRITERIA = {
  accuracy: { weight: 0.2, description: "Claims supported by sources" },
  clarity: { weight: 0.2, description: "Clear and understandable" },
  value: { weight: 0.25, description: "Actionable insights" },
  completeness: { weight: 0.15, description: "Key points covered" },
  voice: { weight: 0.1, description: "AI Keytake tone" },
  citations: { weight: 0.1, description: "Sources properly credited" }
};
