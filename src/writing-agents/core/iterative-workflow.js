/**
 * Iterative Workflow
 * Orchestrates Writer and Critic agents in an iterative loop
 */

import { WriterAgent } from '../agents/writer-agent.js';
import { CriticAgent } from '../agents/critic-agent.js';
import createLogger from '../../utils/logger.js';

const logger = createLogger('IterativeWorkflow');

export class IterativeWorkflow {
  constructor(options = {}) {
    this.options = {
      maxIterations: options.maxIterations || 3,
      qualityThreshold: options.qualityThreshold || 8,
      verbose: options.verbose !== false,
      ...options
    };

    // Initialize agents
    this.writer = new WriterAgent({
      temperature: 0.7,
      maxTokens: 4000
    });

    this.critic = new CriticAgent({
      temperature: 0.3,
      maxTokens: 2000,
      qualityThreshold: this.options.qualityThreshold
    });
  }

  /**
   * Run the iterative workflow
   */
  async run(articles, options = {}) {
    const runOptions = {
      maxIterations: options.maxIterations || this.options.maxIterations,
      verbose: options.verbose !== undefined ? options.verbose : this.options.verbose
    };

    if (runOptions.verbose) {
      console.log(`\n🤖 Starting iterative writing workflow`);
      console.log(`   Max iterations: ${runOptions.maxIterations}`);
      console.log(`   Quality threshold: ${this.options.qualityThreshold}/10`);
      console.log(`   Articles: ${articles.length}`);
    }

    let draft = null;
    let critique = null;
    let iteration = 0;

    try {
      // Step 1: Generate initial draft
      if (runOptions.verbose) {
        console.log(`\n✍️  Iteration 0: Writer generating initial draft...`);
      }
      draft = await this.writer.generateInitial(articles);

      // Iterative refinement loop
      for (iteration = 1; iteration <= runOptions.maxIterations; iteration++) {
        // Step 2: Critic reviews draft
        if (runOptions.verbose) {
          console.log(`\n🔍 Iteration ${iteration}: Critic reviewing draft...`);
        }
        critique = await this.critic.review(draft, articles);

        // Step 3: Check if satisfactory
        if (critique.isSatisfactory) {
          if (runOptions.verbose) {
            console.log(`\n✅ Quality threshold met (${critique.overallScore}/10 >= ${this.options.qualityThreshold}/10)`);
            console.log(`   Early termination at iteration ${iteration}`);
          }
          break;
        }

        // Step 4: Writer revises based on critique
        if (runOptions.verbose) {
          console.log(`\n✍️  Iteration ${iteration}: Writer revising draft...`);
          if (critique.topImprovements.length > 0) {
            console.log(`   Top improvements to address:`);
            critique.topImprovements.forEach((improvement, i) => {
              console.log(`     ${i + 1}. ${improvement}`);
            });
          }
        }
        draft = await this.writer.revise(draft, critique);
      }

      // Check if we hit max iterations
      const maxIterationsReached = iteration > runOptions.maxIterations;

      // Finalize the draft
      if (runOptions.verbose) {
        console.log(`\n📝 Finalizing newsletter...`);
      }
      const finalDraft = await this.writer.finalize(draft);

      const summary = {
        draft: finalDraft,
        iterations: iteration,
        critiques: [critique],
        qualityScore: critique.overallScore,
        isSatisfactory: critique.isSatisfactory,
        maxIterationsReached
      };

      if (runOptions.verbose) {
        console.log(`\n✅ Workflow complete!`);
        console.log(`   Total iterations: ${iteration}`);
        console.log(`   Final score: ${summary.qualityScore}/10`);
        console.log(`   Satisfactory: ${summary.isSatisfactory ? '✅ Yes' : summary.maxIterationsReached ? '⚠️  No (max iterations)' : '❌ No'}`);
      }

      return summary;
    } catch (error) {
      logger.error('Workflow error:', error.message);
      throw error;
    }
  }

  /**
   * Get workflow statistics
   */
  getStats() {
    return {
      maxIterations: this.options.maxIterations,
      qualityThreshold: this.options.qualityThreshold,
      writerOptions: this.writer.options,
      criticOptions: this.critic.options
    };
  }
}

export default IterativeWorkflow;
