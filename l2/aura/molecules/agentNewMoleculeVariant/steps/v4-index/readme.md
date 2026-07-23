# v4-index

Regenerates the group SHOWCASE index page (index.ts + index.html), LLM step.

Reuses the shared `indexGroupPage` skill (the same content `agentUpdateIndexGroupPage`
produces: hero + showcase cards + reference table covering every molecule of the
group). It does NOT invoke that agent — its `afterPromptStep` chains "next groups"
off the task's original message, which inside our task would fan out over all
groups and never emits our `v4-done` anchor. So the SKILL is reused and generation
is driven as a normal pipeline step.

Input: context.json + `indexGroupPage` skill + group description/usage skill +
the destination group's molecule list. Output: `index.ts` (LLM, via the
`submitGroupIndex` tool) + `index.html` (deterministic tag line) + v4-done anchor.

- Gate (structural): non-empty, fence-free, correct header, `@customElement`,
  imports the variant + references its tag. Retry ≤ 1 with gate errors in context.
- Best-effort compile of index.ts; on a compile error, schedule `agentNewMoleculeFix`
  on the index fileReference (it takes a plain fileReference — no group fan-out).
- Resilience: index failure NEVER blocks the molecule delivery — a 2nd gate failure
  emits `v4-done` ok:false so v5/v6 proceed and v6-summary reports it.
