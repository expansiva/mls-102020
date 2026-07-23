# v4-index

Regenerates the group SHOWCASE index page (index.ts + index.html), LLM step.

Reuses the shared `indexGroupPage` skill (the same content `agentUpdateIndexGroupPage`
produces: hero + showcase cards + reference table covering every molecule of the
group). It does NOT invoke that agent — its `afterPromptStep` chains "next groups"
off the task's original message, which inside our task would fan out over all
groups and never emits our `v4-done` anchor. So the SKILL is reused and generation
is driven as a normal pipeline step.

It is THEMED: the prompt also injects `themeInfo.background` + the theme's Visual
Signature (from theme.ts) and instructs the same mandatory deviation as v5-demo —
the skill's neutral `bg-white`/`slate` chrome is replaced by the theme background
on the page container and theme-coherent surfaces/text, so the themed molecules
render in their intended context (glass is invisible on white).

Input: context.json + `indexGroupPage` skill + `themeInfo.background` + theme Visual
Signature + group description/usage skill + the destination group's molecule list.
Output: `index.ts` (LLM, via the `submitGroupIndex` tool) + `index.html`
(deterministic tag line) + v4-done anchor.

- Gate (structural): non-empty, fence-free, correct header, `@customElement`,
  imports the variant + references its tag, and the page container carries the
  theme background (themeInfo.background.css). Retry ≤ 1 with gate errors in context.
- Best-effort compile of index.ts; on a compile error, schedule `agentNewMoleculeFix`
  on the index fileReference (it takes a plain fileReference — no group fan-out).
- Resilience: index failure NEVER blocks the molecule delivery — a 2nd gate failure
  emits `v4-done` ok:false so v5/v6 proceed and v6-summary reports it.
