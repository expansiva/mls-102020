# CHANGELOG — i2-triage

## 2026-08-13 — a documented defect was routed to A, and the taxonomy was why

`ml-copy-button`: with nothing in the `Label` slot the click copied the component's own translated word
("Copy") to the clipboard, and the contract said so. The request — "with nothing in `Label` it should
not copy that" — came back **route A**, which is not implemented, so the run died on a fix that was one
line of `getCopyText` plus one sentence of the contract. Rewritten with "nothing in the public
definition changes" spelled out in the request, the same triage answered **B** twice, the second time
even with the `action` event mentioned.

**The prompt was not careless — it was incomplete.** It said "never promote a DEFECT to a definition
change" in two places, and the first test it asks offered exactly two branches: the contract promises
the behaviour and the code fails (defect → B), or the contract is silent (a new responsibility). There
was **no branch for "the contract describes this behaviour and what it describes is wrong"**, so the
model fell out of the defect branch and found, one section down, the words that fit: *keeps its name and
changes documented meaning*.

That third branch is not an edge case. The `.defs.ts` and the `.ts` are written in the SAME
agentNewMolecule2 run, so **every defect NM2 generates is born documented as intended.** With A
unimplemented, that made a whole class of correction — the ones the pair generates itself —
unreachable.

Changes, all of them vocabulary, in the three places the model actually reads:

- **the third branch is now written down** in the first test, with the measured example, and it lands on
  B with `defs` named alongside the code;
- **the A-vs-B discriminator lost a half.** It used to be "the consumer has to change what they write
  **or observe something different**" (see 2026-08-06 below). The second half cannot discriminate:
  fixing any defect changes what you observe, which is what the fix is for. The criterion is now one
  question with one answer — **would a page that uses this molecule today have to be written
  differently?**;
- **"changes documented meaning" is gone** from `schemas/i2-triage.schema.json` (the tool definition the
  model reads) and from this gate's own `route_a_no_elements` retry message. Both now say what the
  criterion is. A corrected contract sentence is explicitly NOT a definition element.

**Route C stopped prescribing its destination.** The prompt used to say, in the "what you must not do"
list, that on route C *"a local override is the answer"*. It reached the rationale as
"deve ser resolvida localmente por meio de uma sobrescrita", the next step inherited it as the decision,
and proposed overriding a member that could not carry the change. C has three legal outcomes and the
next step picks between them **with the human**, after reading the parent's code — which this step never
reads. The `expectedArtifacts` description says the same thing now: on C the list is conditional,
because the "base component" outcome writes nothing.

**No new gate check, and this time it is not a gap.** "Would existing markup have to be rewritten" is
not decidable from this payload; a gate ruling on it would be guessing with authority. Two tests were
added instead, pinning the shape the gate must keep ACCEPTING — route B with `defs` + `ts` and an empty
`definitionElements` — so nobody later "fixes" this by refusing it. Compare the rejected check of
2026-08-06 ("route B may not touch `defs`"), which was refused for the same reason.

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
