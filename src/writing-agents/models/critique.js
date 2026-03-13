/**
 * Critique Data Model
 * Represents a critic's review of a draft
 */

export class Critique {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.draftId = data.draftId || '';
    this.iteration = data.iteration || 0;
    this.criteria = data.criteria || {
      accuracy: { score: 0, feedback: '', weaknesses: [] },
      clarity: { score: 0, feedback: '', weaknesses: [] },
      value: { score: 0, feedback: '', weaknesses: [] },
      completeness: { score: 0, feedback: '', weaknesses: [] },
      voice: { score: 0, feedback: '', weaknesses: [] },
      citations: { score: 0, feedback: '', weaknesses: [] }
    };
    this.overallScore = data.overallScore || 0;
    this.isSatisfactory = data.isSatisfactory || false;
    this.topImprovements = data.topImprovements || [];
    this.strengths = data.strengths || [];
    this.detailedFeedback = data.detailedFeedback || '';
    this.timestamp = data.timestamp || new Date().toISOString();
  }

  generateId() {
    return `critique_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate overall score from criteria
   */
  calculateOverallScore() {
    const weights = {
      accuracy: 0.2,
      clarity: 0.2,
      value: 0.25,
      completeness: 0.15,
      voice: 0.1,
      citations: 0.1
    };

    let total = 0;
    for (const [criterion, data] of Object.entries(this.criteria)) {
      total += data.score * weights[criterion];
    }

    this.overallScore = Math.round(total * 10) / 10;
    return this.overallScore;
  }

  /**
   * Determine if critique is satisfactory
   */
  determineSatisfactory(threshold = 8) {
    this.isSatisfactory = this.overallScore >= threshold;
    return this.isSatisfactory;
  }

  /**
   * Check if a criterion meets minimum score
   */
  criterionMeetsThreshold(criterion, threshold = 5) {
    return this.criteria[criterion]?.score >= threshold;
  }

  /**
   * Get all weaknesses across all criteria
   */
  getAllWeaknesses() {
    const weaknesses = [];
    for (const [criterion, data] of Object.entries(this.criteria)) {
      if (data.weaknesses && data.weaknesses.length > 0) {
        weaknesses.push({
          criterion,
          issues: data.weaknesses
        });
      }
    }
    return weaknesses;
  }

  /**
   * Get summary of critique
   */
  getSummary() {
    return {
      overallScore: this.overallScore,
      isSatisfactory: this.isSatisfactory,
      topImprovements: this.topImprovements,
      strengths: this.strengths,
      iteration: this.iteration
    };
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      draftId: this.draftId,
      iteration: this.iteration,
      criteria: this.criteria,
      overallScore: this.overallScore,
      isSatisfactory: this.isSatisfactory,
      topImprovements: this.topImprovements,
      strengths: this.strengths,
      detailedFeedback: this.detailedFeedback,
      timestamp: this.timestamp
    };
  }
}

export default Critique;
