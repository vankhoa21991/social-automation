# Writing Agents - Improved Skills Documentation

## Overview

This document describes the improvements made to the writing and critic agent prompt templates following TDD principles for skill development (as defined in `writing-skills`).

## What Changed

### Before vs After Comparison

#### Writer Agent Improvements

**Before:**
- Basic requirements list
- Generic instructions
- No examples of good vs bad writing
- Limited guidance on voice and tone

**After:**
- Specific voice and tone guidelines with examples
- Good vs bad writing examples (anti-patterns)
- Clear content structure requirements
- Revision checklist
- Step-by-step revision process

#### Critic Agent Improvements

**Before:**
- Basic criteria descriptions
- No score-level rubrics
- Generic evaluation questions
- Limited guidance on scoring

**After:**
- Detailed rubrics for each criterion (9-10, 7-8, 5-6, 3-4, 1-2)
- Specific evaluation questions for each criterion
- Common issues with point deductions
- Weight-aware prioritization guidance

## Quality Criteria Rubrics

### 1. Accuracy (20% weight)
**What it measures:** Are claims supported by sources?

| Score Level | Description |
|-------------|-------------|
| 9-10 | All claims directly supported, no speculation |
| 7-8 | Most claims supported, minor gaps |
| 5-6 | Some claims unsupported, occasional speculation |
| 3-4 | Many claims lack support, significant speculation |
| 1-2 | Claims contradicted by sources or fabricated |

**Common Issues:**
- Claim not in sources: -2 points
- Misrepresentation: -3 points
- Speculation as fact: -2 points

### 2. Clarity (20% weight)
**What it measures:** Is the writing clear and understandable?

| Score Level | Description |
|-------------|-------------|
| 9-10 | Crystal clear, no ambiguity, excellent flow |
| 7-8 | Generally clear, minor ambiguities |
| 5-6 | Some confusing sections, requires re-reading |
| 3-4 | Frequently unclear, difficult to follow |
| 1-2 | Very confusing, meaning obscured |

**Common Issues:**
- Unexplained jargon: -1 point
- Long convoluted sentences: -1 point
- Abrupt transitions: -1 point

### 3. Value (25% weight)
**What it measures:** Does it provide actionable insights?

| Score Level | Description |
|-------------|-------------|
| 9-10 | Deep insights with clear actionable implications |
| 7-8 | Good insights with some actionable takeaways |
| 5-6 | Surface-level observations, limited actionability |
| 3-4 | Mostly summary, minimal insight |
| 1-2 | No real insight, just restates content |

**Common Issues:**
- Only summarizes: -3 points
- Generic advice: -2 points
- Not actionable: -2 points

### 4. Completeness (15% weight)
**What it measures:** Are key points from articles covered?

| Score Level | Description |
|-------------|-------------|
| 9-10 | All important points covered, excellent synthesis |
| 7-8 | Most key points covered, minor omissions |
| 5-6 | Some important points missing |
| 3-4 | Significant gaps in coverage |
| 1-2 | Major points entirely missed |

**Common Issues:**
- Ignores major themes: -2 points
- Only covers some articles: -2 points
- Missing context: -1 point

### 5. Voice (10% weight)
**What it measures:** Is the tone objective and analytical?

| Score Level | Description |
|-------------|-------------|
| 9-10 | Perfectly objective, analytical throughout |
| 7-8 | Generally objective, minor tone slips |
| 5-6 | Some promotional/prescriptive language |
| 3-4 | Frequent biased/promotional language |
| 1-2 | Overly promotional/sensational |

**Common Issues:**
- Promotional language: -3 points
- Prescriptive language: -2 points
- Sensationalism: -2 points

### 6. Citations (10% weight)
**What it measures:** Are sources properly credited?

| Score Level | Description |
|-------------|-------------|
| 9-10 | All sources properly credited, accurate |
| 7-8 | Most sources credited, minor issues |
| 5-6 | Some sources missing/improper |
| 3-4 | Poor citation practices |
| 1-2 | Minimal or no proper citations |

**Common Issues:**
- Missing citations: -2 points
- Incorrect attribution: -1 point
- Broken URLs: -1 point

## Voice and Tone Guidelines

### Good Writing Examples
✅ "Les modeles de langage atteignent de nouveaux sommets en raisonnement"
✅ "Cette evolution suggere une tendance vers..."
✅ "Les chercheurs observent que..."

### Anti-Patterns to Avoid
❌ "INCROYABLE ! L'IA va tout changer !" (sensational)
❌ "Vous devez absolument..." (prescriptive)
❌ "AI Keytake peut vous aider..." (promotional)
❌ "Cette revolution va disrupter..." (buzzwords)

## Testing Methodology

### TDD Approach for Skills

Following the `writing-skills` TDD methodology:

#### RED Phase - Write Failing Test
1. Create pressure scenarios WITHOUT improved prompts
2. Document baseline behavior (what agents produce)
3. Identify specific weaknesses in outputs
4. Note rationalizations agents use

Example pressure scenario:
```
Input: 5 trending AI articles
Expected: Objective analysis with specific insights
Actual (baseline): Generic summary, promotional language
Rationalizations: "Thought it would be more engaging"
```

#### GREEN Phase - Write Minimal Skill
1. Write prompts addressing specific baseline failures
2. Add examples showing good vs bad
3. Include rubrics for objective evaluation
4. Run same scenarios WITH improved prompts
5. Verify agents now comply

#### REFACTOR Phase - Close Loopholes
1. Identify new rationalizations from testing
2. Add explicit counters for each
3. Re-test until bulletproof

### Testing Checklist

**Writer Agent Tests:**
- [ ] Generates objective analysis (no promotional language)
- [ ] Extracts specific insights from articles
- [ ] Provides actionable recommendations
- [ ] Uses proper citations
- [ ] Avoids anti-patterns (sensationalism, prescriptions)
- [ ] Writes in clear French without apostrophes
- [ ] Follows content structure (title, summary, insights, recommendations, citations)

**Critic Agent Tests:**
- [ ] Accurately scores each criterion
- [ ] Provides specific, actionable feedback
- [ ] Identifies top 3 improvements prioritized by weight
- [ ] Uses rubrics consistently
- [ ] Flags common issues correctly
- [ ] Calculates overall score correctly
- [ ] Determines satisfactoriness accurately (8.0 threshold)

**Integration Tests:**
- [ ] Iterative workflow reaches quality threshold
- [ ] Writer addresses critic feedback effectively
- [ ] Final newsletter meets all quality criteria
- [ ] No runaway iterations (max 3 enforced)

## Usage

### Using Improved Prompts

```javascript
import { WRITER_PROMPTS, CRITIC_PROMPTS } from './prompt-templates-improved.js';

// The API is the same as before
const writerPrompt = WRITER_PROMPTS.generateInitial(articles);
const criticPrompt = CRITIC_PROMPTS.review(draft, articles);
```

### Migration Path

1. **Phase 1:** Keep existing prompts, test with improved version
2. **Phase 2:** Compare outputs side-by-side
3. **Phase 3:** Migrate to improved prompts after validation
4. **Phase 4:** Monitor quality metrics

## Quality Metrics

### Track These Metrics

- **Average iterations to threshold:** Should decrease with better prompts
- **Critic score consistency:** Should be more consistent with rubrics
- **Common issues frequency:** Should decrease with better writer guidance
- **Satisfactory rate:** Should increase

### Baseline vs Target

| Metric | Baseline | Target |
|--------|----------|--------|
| Iterations to threshold | 2-3 | 1-2 |
| Consistency score | 6.5-8.5 | 7.5-8.5 |
| Satisfactory rate | 60% | 85% |
| Promotional language | 15% | <2% |

## Future Improvements

### Potential Enhancements
- [ ] Add style guide enforcement
- [ ] Create A/B testing for subject lines
- [ ] Implement multi-language support
- [ ] Add sentiment analysis
- [ ] Create newsletter templates
- [ ] Add analytics integration

### Optional Features
- [ ] Webhook notifications on completion
- [ ] Draft preview in browser
- [ ] Manual critique editing
- [ ] Custom quality weights
- [ ] Brand voice customization

## References

- `writing-skills` skill: TDD for documentation
- Original implementation: `WRITING-AGENTS-IMPLEMENTATION.md`
- Newsletter design: `NEWSLETTER-DESIGN-SUMMARY.md`

---

**Created:** 2026-03-13
**Status:** Ready for testing
**Next Steps:** Run baseline tests, deploy improved prompts after validation
