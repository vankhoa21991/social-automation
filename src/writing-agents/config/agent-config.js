/**
 * Agent Configuration
 * Centralized configuration for Writer and Critic agents
 */

export const AGENT_CONFIG = {
  // Workflow settings
  maxIterations: parseInt(process.env.WRITING_AGENTS_MAX_ITERATIONS || '3'),
  qualityThreshold: parseInt(process.env.WRITING_AGENTS_QUALITY_THRESHOLD || '8'),
  verbose: process.env.WRITING_AGENTS_VERBOSE !== 'false',

  // Model settings
  modelName: process.env.WRITING_AGENTS_MODEL || 'claude-sonnet-4-20250514',

  // Writer Agent settings
  writer: {
    temperature: parseFloat(process.env.WRITER_AGENT_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.WRITER_AGENT_MAX_TOKENS || '4000'),
    defaultIterations: 3
  },

  // Critic Agent settings
  critic: {
    temperature: parseFloat(process.env.CRITIC_AGENT_TEMPERATURE || '0.3'),
    maxTokens: parseInt(process.env.CRITIC_AGENT_MAX_TOKENS || '2000'),
    defaultThreshold: 8
  },

  // Quality criteria weights
  qualityCriteria: {
    accuracy: { weight: 0.2, description: "Claims supported by sources" },
    clarity: { weight: 0.2, description: "Clear and understandable" },
    value: { weight: 0.25, description: "Actionable insights" },
    completeness: { weight: 0.15, description: "Key points covered" },
    voice: { weight: 0.1, description: "AI Keytake tone" },
    citations: { weight: 0.1, description: "Sources properly credited" }
  },

  // Cost tracking (estimated costs per 1K tokens)
  costs: {
    inputCostPer1K: 0.003,  // $0.003 per 1K input tokens
    outputCostPer1K: 0.015   // $0.015 per 1K output tokens
  }
};

/**
 * Get agent configuration with overrides
 */
export function getAgentConfig(overrides = {}) {
  return {
    ...AGENT_CONFIG,
    ...overrides,
    writer: { ...AGENT_CONFIG.writer, ...overrides.writer },
    critic: { ...AGENT_CONFIG.critic, ...overrides.critic }
  };
}

/**
 * Estimate cost for tokens
 */
export function estimateCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1000) * AGENT_CONFIG.costs.inputCostPer1K;
  const outputCost = (outputTokens / 1000) * AGENT_CONFIG.costs.outputCostPer1K;
  return inputCost + outputCost;
}

export default AGENT_CONFIG;
