# Writing Agents - Quick Reference Guide

## Quick Comparison: Original vs Improved

| Aspect | Original | Improved |
|--------|----------|----------|
| **Writer guidance** | Basic requirements | Examples + anti-patterns |
| **Critic rubrics** | Basic descriptions | 5-level score rubrics |
| **Evaluation** | Generic questions | Specific questions per criterion |
| **Common issues** | Not documented | Listed with point deductions |
| **Tone guidance** | "Be objective" | Good vs bad examples |

## Key Files

| File | Purpose |
|------|---------|
| `prompt-templates.js` | Original prompts (currently in use) |
| `prompt-templates-improved.js` | Improved prompts (ready for testing) |
| `WRITING-SKILLS-IMPROVEMENTS.md` | Full documentation |
| `QUICK-REFERENCE.md` | This file |

## Quality Criteria At a Glance

| Criterion | Weight | Key Question |
|-----------|--------|--------------|
| **Accuracy** | 20% | Claims supported by sources? |
| **Clarity** | 20% | Easy to understand? |
| **Value** | 25% | Actionable insights? |
| **Completeness** | 15% | Key points covered? |
| **Voice** | 10% | Objective tone? |
| **Citations** | 10% | Sources credited? |

## Score Ranges

| Score | Meaning | Action |
|-------|---------|--------|
| 9-10 | Excellent | Ready |
| 7-8 | Good | Minor tweaks |
| 5-6 | Fair | Needs revision |
| 3-4 | Poor | Major revision |
| 1-2 | Fail | Start over |

## Thresholds

- **Quality threshold:** 8.0/10 (satisfactory)
- **Max iterations:** 3
- **Target iterations:** 1-2

## Common Issues Quick Reference

| Issue | Impact | Criterion |
|-------|--------|-----------|
| Claim not in sources | -2 | Accuracy |
- Promotional language | -3 | Voice |
- Only summarizes | -3 | Value |
- Unexplained jargon | -1 | Clarity |
- Missing citations | -2 | Citations |
- Prescriptive (you must) | -2 | Voice |

## Testing Checklist

```
□ Generate newsletter with improved prompts
□ Compare quality vs baseline
□ Check critic scoring consistency
□ Verify no promotional language
□ Confirm all claims cited
□ Validate recommendation actionability
□ Measure iterations to threshold
```

## Migration Steps

1. Test improved prompts in parallel
2. Compare 5-10 newsletters side by side
3. Validate quality improvement
4. Update environment if needed
5. Deploy improved prompts
6. Monitor metrics for 2 weeks

## Environment Variables (No Changes)

```bash
WRITING_AGENTS_ENABLED=true
WRITING_AGENTS_MAX_ITERATIONS=3
WRITING_AGENTS_QUALITY_THRESHOLD=8
WRITING_AGENTS_MODEL=claude-3-5-sonnet-20241022
```

## CLI Commands (No Changes)

```bash
# Generate with existing prompts
npm run newsletter:generate:enhanced 2026-03-13

# To use improved prompts: Update import in agents
# Change from: './prompt-templates.js'
# Change to:   './prompt-templates-improved.js'
```

## Contacts

For issues or questions about the improved writing skills:
- Documentation: `WRITING-SKILLS-IMPROVEMENTS.md`
- Implementation: `agents/writer-agent.js`, `agents/critic-agent.js`
- Original design: `../../WRITING-AGENTS-IMPLEMENTATION.md`

---

**Last Updated:** 2026-03-13
**Status:** Improved prompts ready for testing
