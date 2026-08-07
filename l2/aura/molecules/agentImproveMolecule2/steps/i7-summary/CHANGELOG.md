# CHANGELOG — i7-summary

## 2026-08-06 — first version

- **flow.json said `gate: none`; it has one check.** Every coherence finding must survive into the
  summary. It is the single failure mode that would defeat the step's purpose, and it costs one
  count comparison. The spec was corrected rather than the code bent to match it.
- **A twice-failed summary does NOT fail the run.** Every other step fails the task on a second
  rejection, because a step that cannot write its artifact leaves the molecule half-done. Here the
  molecule is already written and correct — failing would report a change that did happen as one
  that did not. The findings go out verbatim instead.
- **Facts, never recall.** The model receives what the artifacts recorded and is told not to add to
  it. An earlier draft asked it to "summarise the run" from the step titles, which is an invitation
  to narrate the parts it cannot see.
- **A no-op is stated, not omitted.** "The playground was not touched because the public surface
  did not change" is information; an absent section reads as "not shown to you". Same rule the
  surface renderer already follows.
- The findings are rendered **numbered** in the prompt. The number is what makes a dropped finding
  visible instead of merely absent.
- The group creation skill is loaded best-effort: an unreadable one costs the contract check, not
  the run. The report degrades to the declared-vs-used gate alone.
