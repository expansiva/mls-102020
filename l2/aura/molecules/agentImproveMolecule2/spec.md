# agentImproveMolecule2 — spec

Human-readable rationale for `flow.json`. The flow is the contract; this file is the *why*.

**This file, `flow.json` and the per-step `CHANGELOG.md` ARE the design record.** The decisions were
closed on 2026-08-06, before any code, and everything that changed since is recorded here — there is
no other document to find. When a decision changes, change the flow first, then this file, then the
code.

Written per `skills/agentsBestPractices.md` — spec first (§1), one folder per step (§2),
deterministic first (§3), prompts as data (§5), declared orchestration (§6), gates (§7).

## 1. What it does

Changes a molecule that already exists. It reads the four artifacts the molecule is made of —
`.defs.ts`, `.ts`, `.less`, `.html` — plus the group index, decides what kind of change was asked
for, and applies it in the smallest way that keeps those artifacts agreeing with each other.

It does **not** create molecules. That is `agentNewMolecule2`, and the failure message says so.

## 2. Why the difference from agentNewMolecule2 is not cosmetic

Both agents produce the same five artifacts. The temptation is to reuse the NM2 steps and pass a
flag saying "this one is an update". That is wrong, and the reason is written in the NM2 code:

```
nmFs.ts:75 — "Collision check for the n2-plan gate: a new molecule must not overwrite an existing one."
```

**NM2's gate refuses when the file exists. This agent requires it to exist.** The precondition is
inverted, not extended. A shared step serving both would have to branch on a mode field inside
itself — the "multi-role agent switched by a mode field" that `agentsBestPractices` lists under
*What to avoid*.

So the split is by layer, not by step:

| layer | who owns it |
|---|---|
| generating artifact CONTENT (`nmTemplates.ts`), paths and stor mechanics (`nmFs.ts`), types, axes | **agentNewMolecule2/helpers** — imported here, never reimplemented |
| output schemas | **agentNewMolecule2/schemas** — same contract |
| step orchestration and gates | **this agent** — because the gates are inverted |

One generator, two orchestrations. Nothing to drift.

## 3. Five routes, and triage is a first-class step

A change request is not one thing. The flow triages into five, and only the matching branch is
planted:

- **(A) the DEFINITION changes** — slots, properties, events, responsibilities. A **checkpoint**
  (`i2a-definition`) confirms the delta with the human, and then the contract and the code are
  edited **in place**.

  > This was a handoff to the NM2 pipeline until 2026-08-14, and the route was blocked on how NM2's
  > collision gate could ever be satisfied by a rebuild. The premise was false: a definition change
  > is not a rebuild. Editing in place keeps the playground and the contract that already work, and
  > NM2 never enters — so the collision gate never arises.

- **(B) a MINOR change** — style, a code fix, text. Edit, save, and only then ask whether the
  playground and the index have to follow.
- **(C) an INHERITED shell whose fix needs the parent** — its own clarification; the user decides
  where the change lands.
- **(D) out of scope** — readable failure, no retry, nothing written.
- **(E) a DERIVED artifact is broken** — the playground or the group index is regenerated and the
  molecule is not touched, so `i3-edit` is never planted. Added 2026-08-18.

  > The line that holds E in place: the playground and the index are **derived** — given the
  > molecule's surface there is a correct form, which is why `i5` and `i6` can produce them. The
  > `.defs.ts`, the `.ts` and the `.less` are **authored**, and regenerating them would discard
  > decisions nobody can recover. And a page that WORKS is never regenerated: code measures the
  > page's invariants before spending a call, so "regenerate it" cannot destroy a healthy demo.

## 4. Inheritance: the shells, and the price of overriding

The library has **84 shells** (42 in `mls-102054`, 42 in `mls-102055`), each extending a molecule
from `mls-102040` by *strategy D*:

```ts
@customElement('groupenternumber--ml-range-slider-brutal')
export class RangeSliderBrutal extends RangeSliderMolecule {}
```

Measured on 2026-08-06: **70 have an empty body**, 14 override a single property, and **none
overrides `render()`**.

That last number is the point. A shell with its own `render()` **stops inheriting the parent** —
today a fix in `ml-range-slider` reaches both themed variants for free; after an override, that
variant is frozen on the markup it copied. So route (C) does not ask "may I touch the parent?"; it
presents the trade:

| option | what it costs |
|---|---|
| **`.less` only** | nothing. **Try first** — it is what 70 of the 84 need |
| **local override** | solves anything, but that shell stops inheriting. Prefer the *smallest* member: a property or a narrow method before `render()` |
| **change the parent** | **information only.** The base lives in another project and this agent never crosses that line |

## 5. Only the current project

Every write lands in `mls.actualProject`. When the fix belongs to a base molecule in another
project, the agent says so and stops — it does not open, queue or simulate a change there.

This also closes the inverse case: from the base project the agent **cannot see who inherits from
it**. The dependency is one-way — the shell imports the parent; the parent cannot enumerate its
shells — and there is no access to other projects. So "warn that 42 base molecules have dependent
shells" is not a feature that was deprioritized; it is **not implementable today**. It is recorded
in `flow.json.outOfScope` so nobody tries.

## 6. What is deterministic

LLM calls are for judgment. Everything below is code:

- locating the molecule and reading its artifacts;
- detecting that it is a shell, and listing the members it could override;
- deciding **whether the playground is affected** — derived from the diff of the defs and the class
  members, not from an opinion;
- deciding **whether the index must follow** — it is not a decision at all, see §7;
- the tag, the paths, the file headers, the index entry.

## 7. Playground changed ⇒ index updated. Not a judgment call

On 2026-08-05 the `<Detail>` slot was fixed in the playground of `ml-lazy-record-detail-table` and
the **group index page was left behind**, still showing an empty detail area. It was found by
accident, days later.

So the flow states it as an invariant and the `i6-index` gate enforces it:
`playgroundChanged == true` implies `indexUpdated == true`. There is no branch where the agent
decides the index "probably doesn't need it".

## 8. The two coherence gates, and why they only report

The four artifacts of a molecule can disagree, and nothing in the system notices. In one week that
produced 13 defects, every one of them found by accident:

- **Gate 1 — defs × `slotTags` × group contract.** The `.defs.ts` of `ml-lazy-record-detail-table`
  described the *previous* design, omitted a slot the code was reading, and asserted "does not
  introduce slots beyond the contract" while doing exactly that. Three errors in one file.
- **Gate 2 — declared × used.** Nine molecules declare a slot they never read. Writing `<Label>`
  into `ml-address-field` does nothing, silently.

**They report; they never block.** An improve run is when these are cheapest to fix, so the report
is an opportunity, not a barrier — and blocking on pre-existing debt would freeze the agent on
molecules nobody asked to repair.

> Deliberately out of v1: a defect the agent *itself* introduces in the same run is reported like
> any other. If that shows up in practice the answer is **one bounded repair attempt** (§7 of the
> best practices), not a block.

## 9. Shared, not duplicated

`helpers/` here holds only what is specific to *changing* a molecule: resolving the target, reading
what exists, detecting the shell, and computing the coherence report. Anything that writes artifact
content is imported from `agentNewMolecule2/helpers`.

If a fix here needs a change in the NM2 helpers, stop and review — that is a boundary, and the NM2
suite must stay green.

## 10. Out of scope for v1

- Creating molecules (`agentNewMolecule2`).
- Editing the parent of a shell (§5).
- Warning that a base molecule has dependent shells — not implementable (§5).
- Repairing a defect the agent introduced in the same run (§8).
- Removing `agentsManageMolecules/agentImproveMolecule{,Defs,Materialize}.ts`. They stay until this
  agent is accepted; removal will be done by hand.

## 11. Acceptance

The five tests in `flow.json.acceptance`. The two that matter most:

- **route C on a real shell** — the clarification offers three options, "change the parent" ends the
  run with an instruction and **zero writes**, and the gate proves the parent file was untouched;
- **route B with a new property** — the playground is regenerated **and** the group index follows,
  in the same run.
