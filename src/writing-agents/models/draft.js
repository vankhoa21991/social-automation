/**
 * Draft Data Model
 * Represents a newsletter draft through the writing process
 */

export class Draft {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.version = data.version || 1;
    this.iteration = data.iteration || 0;
    this.title = data.title || '';
    this.summary = data.summary || '';
    this.insights = data.insights || [];
    this.recommendations = data.recommendations || [];
    this.citations = data.citations || [];
    this.subject = data.subject || '';
    this.previewText = data.previewText || '';
    this.htmlContent = data.htmlContent || '';
    this.textContent = data.textContent || '';
    this.metadata = data.metadata || {
      wordCount: 0,
      readingTime: 0,
      insightCount: 0,
      recommendationCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.history = data.history || [];
  }

  generateId() {
    return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new version of this draft
   */
  newVersion() {
    const newDraft = new Draft({
      ...this,
      id: this.generateId(),
      version: this.version + 1,
      history: [
        ...this.history,
        {
          version: this.version,
          iteration: this.iteration,
          content: this.toJSON(),
          timestamp: new Date().toISOString()
        }
      ]
    });
    return newDraft;
  }

  /**
   * Update draft with new content
   */
  update(updates) {
    Object.assign(this, updates);
    this.metadata.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      version: this.version,
      iteration: this.iteration,
      title: this.title,
      summary: this.summary,
      insights: this.insights,
      recommendations: this.recommendations,
      citations: this.citations,
      subject: this.subject,
      previewText: this.previewText,
      htmlContent: this.htmlContent,
      textContent: this.textContent,
      metadata: this.metadata
    };
  }

  /**
   * Check if draft is finalized (has HTML/text content)
   */
  isFinalized() {
    return !!this.htmlContent && !!this.textContent;
  }
}

export default Draft;
