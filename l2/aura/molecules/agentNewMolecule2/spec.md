# agentNewMolecule2 — spec

> Written BEFORE the code (`skills/agentsBestPractices.md`). `flow.json` is the contract; this file
> is the rationale — why each decision is what it is, so a future maintainer does not undo it by
> accident.
>
> **This file, `flow.json` and the per-step `CHANGELOG.md` are the design record.** There is no other
> document to look for: the decisions keep their original letter codes (D1–D6, Q1–Q7b) as provenance
> tags, and each is stated in full where it governs code. The artifact contract — what each of the
> five files must contain — was measured from the OLD chain and lives where it is enforced:
> `helpers/nmTemplates.ts` for the deterministic half, the gate of each step for the judged half.

## 1. What it does

Creates a NEW molecule from a prose description, producing five artifacts:

```
l2/molecules/<group>/<shortName>.defs.ts   the machine-readable spec of the molecule
l2/molecules/<group>/<shortName>.ts        the component
l2/molecules/<group>/<shortName>.less      the stylesheet
l2/molecules/<group>/<shortName>.html      the playground page
l2/molecules/<group>/index.ts + index.html the group showcase
```

In a project that has `l2/skills/theme.ts` the molecule is **born pure in the theme**: the theme
payload feeds the `.less`, the name carries the theme suffix, and the demo page uses the theme
background. In a project without a theme the output is the neutral one — **identical in kind to what
the old flow produces today**. That equivalence is acceptance 3.11, and the ruler is
`analise-fluxo-new-molecule-atual.md` §5.

## 2. Why a new agent instead of changing the existing one

The current flow is eight agents (`agentNewMolecule` → `Planner` → `Defs` → `Materialize` →
`[Fix]` → `MaterializeLess` → `Playground` → `IndexGroupPage`). None of them has a `flow.json`, a
deterministic gate or a single test. Injecting the theme into that chain means touching eight
prompts with no safety net, and the theme work taught us the opposite lesson twice: every defect we
actually fixed was fixed by a **gate**, not by better prose. The old chain therefore stays untouched
until acceptance decides its fate (item 3.13); `agentNewMolecule2` is built beside it.

## 3. Pipeline and why it is shaped this way

```
root  @@agentNewMolecule2 <prose>      classify the group (cheap)
 └─ n1-bootstrap   no LLM              context.json: theme? base? group skill? collision?
 └─ n2-plan        reasoning           requirements + proposed name  →  ★ HUMAN CHECKPOINT
 └─ n3-defs        reasoning           .defs.ts
 └─ n4-render      code                .ts  (+ compile, retry ≤ 1)
 └─ n5-less        design              .less
 └─ n6-demo        code                .html
 └─ n7-index       code                index.ts + index.html   (failure does NOT block)
 └─ n8-summary     general             terminal summary
```

**Why the classification is in the root and the requirements are a separate step.** The requirements
call needs the chosen group's *creation skill*, the molecule base class and the theme payload
injected — none of which can be resolved before the group is known. The root does the cheap
classification against the short group descriptions from `skills/index.ts`; `n1-bootstrap` resolves
everything the group implies; only then does `n2-plan` reason. This is the same split the old chain
uses, and it keeps the expensive call fully informed.

**Why bootstrap is deterministic and runs before the plan.** The theme decides the molecule's NAME
(§4), so it must be known before the plan proposes a `fileReference`. Detection, contract validation
and reading the base class are pure lookups — spending an LLM call on them would be waste, and worse,
would make them unreliable.

**Why the checkpoint is where it is.** The old flow already asked for confirmation before writing the
`.defs.ts`, through `agentNewMoleculePlannerClarification`. That is the right place: the `.defs.ts`
is the spec every later step reads, so an error there propagates into four files. One checkpoint, and
only one — the theme agent shipped with two and the second one was pure friction (decision A1 there).

**Why `n7-index` never blocks.** The showcase page is a convenience. A molecule that compiles, has a
stylesheet and has a demo is delivered work; a failed index should be reported, not thrown away.
It also does not invoke another agent (decision D5): `agentUpdateIndexGroupPage` fans out, and the
Variant's `v4-index` already proved that reusing the *skill* in-step is the calmer path.

## 4. The theme changes the molecule's name

When the destination has a valid theme, `n2-plan` proposes the `fileReference` **already carrying the
theme suffix** — `ml-kpi-card-glass.ts`, tag `<group>--ml-kpi-card-glass`. Decision Q2.

This is not cosmetic. In the theme agent the user could not fix a suffix after the fact ("não tenho
como alterar na criação, somente após ter o arquivo final eu consigo editar"), and a molecule's tag
is derived from its filename — renaming it later means touching four files plus the index. Showing
the final name and tag **in the checkpoint, editable**, is the cheap moment to get it right.

## 5. Identity: the fileReference is the only source of truth

Decision Q1. `_<dest>_/l2/molecules/<groupLowercase>/<shortName>.ts`, `shortName` always prefixed
`ml-`. The tag is **derived** (`convertFileToTag`), never authored. The group displayed in the
checkpoint is derived from the folder and read-only; the gate checks the folder is a known group.

Consequence: the mls header of every artifact belongs to the **orchestrator**, not the model. Today
the flow writes the `.ts` wherever the model's first line says, so a hallucinated header silently
writes to the wrong path (`analise` §3.2). Here the destination is computed and the header prepended
by code — the same fix the Variant needed (lesson M2).

## 6. What is deterministic

Everything that does not need judgment:

- the `.defs.ts` skeleton — header, `Do not change` comment, `export const group`,
  `export const layoutConfig = {}`, and the escaped `skill` literal. The LLM writes only the
  five-section markdown.
- the **escaping** inside that literal: backtick → `` \` `` and `${` → `\${`. Without it the file
  does not compile — and today nothing verifies it happened.
- the `.less` header, with `enhancement="_102020_/l2/enhancementStyleAura"`.
- the tag, the paths, and the group's canonical name.
- the playground state: the literal `playgroundDinamicState` placeholder is replaced from
  `examples[].state`.

`layoutConfig` is emitted **empty** on purpose (decisions Q7/Q7b). The old template does not emit it
at all; a separate Design System process fills it, creating the variable when it is missing and
updating it when it exists. Emitting `{}` makes the update path the normal one and gives the Improve
agent something explicit to preserve (Q7c, Fase 4).

## 7. Gates, and the one that is new

One gate per step, one file, one `.test.ts`. Most of them encode the artifact contract of
`analise` §3. Two deserve a note:

**The compile gate (`n4-render`).** Errors are read from `modelTs.compilerResults.errors`, and the
retry also receives the `prodDTS` of the molecule's imports — exactly what the old `Fix` agent did,
because that is what gives the model the actual type signatures. The difference is bookkeeping:
`retryAttempt` travels in the step's own prompt (like `v3-less`), not as a string in
`longTermMemory` where the old `fixCount` silently vanishes if the task is recreated. Bound is one
retry, and a second failure **fails the step** — generating a stylesheet and a demo for a molecule
that does not compile is worse than stopping.

**The `ml-*` discipline gate (`n4-render`) — this one is new.** The render must emit semantic `ml-*`
classes and **no appearance**: no inline style carrying color/background/border/shadow, no colour
literal in the markup. Nothing checks this today, and it is precisely the property that makes a
molecule derivable by `agentNewMoleculeVariant` later. A molecule born with a hardcoded colour is a
molecule that can never be themed, and we only find out one Studio run later.

## 8. Shared, not duplicated

- **`shared/widgetDefsClarification.ts`** (new, decision D2) reproduces the interface of the current
  `agentNewMoleculePlannerClarification` — same fields, same click-to-edit, same collapsible
  requirement lists, same `clarification-finish` contract, same pt/en i18n. Users of the old flow see
  no change, plus one read-only line naming the detected theme (Q3). Note the old file is named like
  an agent but is a Lit component; the new one lives in `shared/` where it belongs.
- **`skills/lessAuthoring`** (new, decision D3) holds the `.less` rules extracted from
  `agentNewMoleculeVariant/steps/v3-less/prompt.md`, and both agents consume it. Those ~12 rules were
  each paid for by a failed Studio run (T1, T3, T10–T13, T16, T17, T20, T22, per-class property
  scope, thin primitives, border budget) — duplicating them means the next fix lands in one copy.
  Migrating `v3-less` happens in the **same batch** (Q6): a shared skill with one consumer is a
  future divergence.
- **`shared/mentionEntry`** parses the prose mention. `mls.common.safeParseArgs` is never called on
  prose — it throws (lesson A2). Prose is the only accepted entry form (decision D6).

## 9. Disk is the truth

`context.json` and `plan.json` in l4 under `agentNewMolecule2/<shortName>/`, plus one
`trace-<step>-<attempt>.json` per LLM call (decision D1). Steps read what the previous step wrote
instead of re-deriving it — the old chain passes state through `longTermMemory` and loses it, and it
anchors every mutation on a hardcoded `parentStepId: 1`, which couples it to the tree's shape. Here
mutations anchor on the nearest mutable parent and downstream steps depend only on `nN-done`.

## 10. Out of scope for v2

No routing from Improve, no batch creation, no "theme different from the project's", no changes to
the eight old agents, and no generated `.test.ts` for the molecule (the old flow does not produce one
either — that is its own discussion).

## 11. Acceptance

1. **mls-102040, no theme** — create a molecule from prose and check it line by line against
   `analise-fluxo-new-molecule-atual.md` §5. Nothing theme-related may appear anywhere. (3.11)
2. **mls-102053, with theme** — the plan proposes the suffixed name, the checkpoint names the theme,
   the `.less` follows the theme payload, the demo carries the theme background. (3.12)
3. **the cycle** — run `agentNewMoleculeVariant` on the molecule from (2); it must be derivable.
   That is what the `ml-*` gate protects.
4. **cancel at the checkpoint** — nothing is written.
