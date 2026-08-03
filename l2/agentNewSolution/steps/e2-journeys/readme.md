<!-- mls fileReference="_102020_/l2/agentNewSolution/steps/e2-journeys/readme.md" enhancement="_blank" -->

# E2 - Journeys

This step turns the approved E1 draft into the business view of the module: user journeys per actor
and a prioritized feature catalog. It is the second human checkpoint and the last step of Phase 1.

Inputs:
- `l4/{module}/pipeline/e1-draft.json` (only). No task payload is required, so the step also works on
  a resumed task.
- Optional adjustment request from `checkpoint-journeys`.

Outputs:
- `l4/{module}/pipeline/e2-journeys.json`
- `l4/{module}/pipeline/e2-journeys.md` (audit summary/delta; JSON is the source of truth)
- `l4/{module}/pipeline/pipeline.json`
- Trace files under `l4/{module}/trace/`

Model:
- `prompt.md` runs with `modelType: reasoning` (rich journeys need reasoning).

Gate (`gate.ts`):
- Valid `e2-journeys` schema.
- Every feature is referenced by at least one journey step; every step featureRef exists.
- Every actor has at least one journey; the journey actor must be a declared actor.
- Every E1 actor is present, unless a `decisions` entry of kind `actorRemoved` records the removal.
- Ids normalized and unique (actors, journeys, steps, features, decisions).
- Priorities complete (`now | soon | later | never`).

Rules:
- Do not create ontology, pages, tables, workflows or operations.
- `businessRules` and `notes` are per-journey human inputs; adjustments must preserve them.
- The widget never writes artifacts; adjustments always rerun this step through the gate.
- The markdown artifact records what changed; it must not duplicate the full JSON catalog.

Widget (`widgetNsJourneys.ts`):
- Custom element: `<widget-ns-journeys-102020>`.
- Input: either the full `NsE2JourneysArtifact` as `value`, or `{ moduleName, project? }` to load
  `l4/{module}/pipeline/e2-journeys.json` from `mls.actualProject` or an explicit project such as
  `102051`.
- Renders actor lanes, searchable journey list, selected journey detail, editable
  `businessRules[]`/`notes`, editable feature priority chips, version/history, and the prompt bar.
- Emits `ns-journeys-change` for local edits and `ns-journeys-review` with payload type
  `checkpoint-journeys-answer` for approve/adjust.
- The review payload includes `edits`, immutable `changes`, and a `proposedArtifact`, but persistence
  remains the responsibility of the checkpoint/adjustment flow.
- `agentNsJourneys.openStepView` mounts this widget through the existing task feedback "open/abrir"
  action. It rebuilds state from persisted `e2-journeys.json`, matching the `agentNewSolution2Final`
  pattern.

## Where the actor comes from — `prerequisite` (2026-08-02, improveJourneys T3, schema v2)

`trigger` was a free-text string nobody could verify, and the 102045 run left it null in all 11
journeys. v2 replaces it with the business fact the whole downstream chain was missing:

```
prerequisite?: { kind: "journey" | "external" | "schedule", journeyId?, carries?: string[], description? }
```

- **No prerequisite = an ENTRY journey**: the actor starts cold on their own landing. A valid, common
  shape — never a defect at this gate.
- **`kind: "journey"`** must name an existing journey (not itself) and declare non-empty `carries`: the
  records that arrive ALREADY CHOSEN, named in this document's own vocabulary (the e3 gate is where
  those names meet EntityIds). The chain must terminate (`prerequisite_cycle`).
- **`kind: "external" | "schedule"`** covers what starts outside the system or at a moment in time; it
  must not reference a journey.
- A prerequisite pointing at ANOTHER actor's journey is a **handoff**. That is a fact, not a defect, so
  it is exposed by `describeNsE2Prerequisites` (widget badge + the "Journey Entry Points" section of the
  checkpoint markdown) instead of a gate warning the human would dismiss on every run. It is also the
  input the e6 navigation edges need to tell a handoff from navigation.
- Whether a journey SHOULD have declared one is semantic, not structural — that is the e2 judge's
  question (T4), never this gate's.

Why it matters downstream: a page may claim an id "arrives with the page" only if some journey that
uses that page declares the id arriving. Before v2 there was no creditor for that claim anywhere in the
pipeline, which is how 20 required `pageInput` ids shipped in one run with no provider.

`trigger` stays declared in the schema and is still read (a v1 artifact loses nothing), but nothing
produces it. The frozen baseline captures under `fixture/baseline/` are historical v1 artifacts and are
NOT migrated — they are the ruler, and a ruler that gets edited stops being one.

## The journey judge (2026-08-02, improveJourneys T4)

After the e2 gate goes green and BEFORE the human sees anything, one call reviews the journeys against a
closed rubric (`promptJudge.md`, schema `schemas/e2-judge.schema.json`). It is the judge that opens the
checkpoint afterwards. The point of the position: the artifact is small, the regeneration is a single
step, and nothing downstream has been paid for yet — at e6 the same defect can only be reported.

| code | what it looks for | severity |
|---|---|---|
| `journey.step.locateMissing` | acts on an existing record the narrative never reaches | error |
| `journey.prerequisite.missing` / `.invalid` | continues another journey without declaring what arrives (v2+ only) | error |
| `journey.actor.stepMismatch` | a step the journey's own actor cannot perform | error |
| `entity.noReadSurface` | a record commanded but never shown, anywhere in the module | warning |
| `journey.outcome.unobservable` | a decision whose effect the actor can never perceive | warning |

**The policy is in `judge.ts`, not in the prompt** — that is what keeps this inside the flow.json
principle rather than being a free-form critic:

- severity comes from the CODE, never from the model: a judge cannot escalate its own finding;
- an invented code, a journey that does not exist, a finding naming no journey, a duplicate, or a
  prerequisite finding on a document older than the field — all discarded, each with a reason in the
  trace, because an unactionable finding burns the one regeneration the run has;
- at most 2 reviews and 1 regeneration per module. The second review can only annotate, and a judge that
  keeps disagreeing does not block: the checkpoint opens carrying the findings and the human decides;
- over a version the human just asked for (an adjustment), the judge annotates and never regenerates;
- `/fast` skips the judge entirely — that mode auto-approves the checkpoint server-side;
- a judge that cannot run (no payload, unreadable output) is skipped with a trace, never a failure. It
  is an additive quality layer: it may delay the checkpoint by one rerun, never cost the user a module.

Findings reach the human as a "Journey Review" section appended to `e2-journeys.md`, and the full report
(including what was discarded) is saved as `pipeline/e2-judge.json`.

**What the golden replay proved, and what it did not** (`e2JudgeLive.test.ts`, gated): across live runs
the judge never reported a self-contained journey — that stability is asserted, because a judge that
invents problems is worse than no judge. Detection of specific defects is REPORTED, not asserted: while
writing the rubric, three of the four cases the plan named turned out to belong to another layer (a
journey that creates the record it later approves has nothing to locate; "no listing operation exists"
is an e5/e6 fact invisible in the e2 text). The header of that test records the analysis case by case.
