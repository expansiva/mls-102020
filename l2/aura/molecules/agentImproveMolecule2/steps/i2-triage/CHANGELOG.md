# CHANGELOG — i2-triage

## 2026-08-06 — first version

- The routing call, with the A-vs-B discriminator stated as one question: does a consumer have to
  change what they write, or observe something different through slots, attributes or events.
  Earlier drafts described the four routes and let the model weigh them; that reads as an invitation
  to judge SIZE, and every user request that matters ("just add a little detail area") is phrased to
  sound small.
- **The model does not receive the molecule's source.** Only the `.defs.ts` plus a derived surface
  summary. `ml-data-table` is 300+ lines and its surface is 20; the rest cannot answer the routing
  question, and paying for it on every run buys nothing.
- `surface.ts` lives in the step, not in `helpers/` — it is step-specific and `helpers/` must not
  know about a specific step (agentsBestPractices §2).
- **`definitionElements` was added to the schema** so the gate can enforce flow.json's "route A
  requires at least one named definition element". Without a field for it the check was
  unimplementable. It doubles as the pre-fill for the rebuild clarification.
- **Rejected gate check: "route B may not touch `defs`".** It looked sharp — editing the contract
  IS a definition change — but a typo fix in the Objective paragraph is route B and touches the
  same file. The gate cannot separate editorial from contractual, so it does not try. Left to the
  prompt.
- **`html` ⇒ `groupIndex` is a normalization, not a failure**, and it runs after the gate so the
  model's actual answer is what gets judged and traced.
- `route_invalid` returns alone, same reasoning as `molecule_not_found` in i1: with a bad route
  every other message is about a decision that was never made.
- Added `<!-- x-tool-strict: true -->`, which NM2's prompts do not carry. `skills/modelTypes.md`
  recommends it for every tool-calling step whose output crosses a gate, and this output crosses
  one. Server-side validation catches the enum violations before they cost a retry.
