# CHANGELOG — i7-summary

## 2026-08-14 — the outcome that writes nothing was reported as an override

Measured in the Studio, `ml-copy-button-glass`, runKey `copied-message-duration`. Route C, the human
chose **`parent`** — the fix belongs to the base component — and the summary said:

> Nenhum arquivo foi alterado.
>
> A correção ficou num **override local** — esta molécula deixa de herdar esse membro da base.

Two sentences that contradict each other, and neither is what happened.

**The cause is one line.** `renderRunFacts` had an `if/else` for a **three-way** choice:

```ts
facts.inheritWhere === 'less' ? '…own stylesheet…' : `…overriding \`${facts.inheritMember}\`…`
```

`parent` fell into the `else`, so the run rendered an override of an empty member. `gather.test.ts`
covered `less` and `override` — the third branch had no test, which is exactly why nobody saw it.

**The second half is worse, and it is not a rendering bug.** The `parent` outcome writes no file *on
purpose*, so **the instruction IS the deliverable**: which file, in which project. `i3-edit` builds that
sentence (`agentIm2Edit.ts:98`) but it stays in the step title and never reaches these facts —
`ImRunFacts` had no `parentReference` at all. The user was told "nothing was changed" and nothing else.

Fixed: three branches, `parentReference` carried into the facts, and the prompt's list of "things worth
stating plainly" now has the third item, marked as the whole answer rather than a footnote. Both new
branches are tested, including the degraded case where the parent could not be named.

**Why this survived since 2026-08-06.** T4 — route C, outcome `parent` — was accepted on 13/08 against
the criterion *"the run terminated and wrote zero files"*. Both were true. **Checking that nothing was
written is not checking that the user was told anything**, and the acceptance list has been corrected.

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
