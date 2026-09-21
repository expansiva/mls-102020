# needs30 — what each screen reads and writes

Deterministic. No LLM.

## Input

- `l4/<mod>/pool/l2/web/menu.json` (menu20)
- Module l4: journeys (kind, entity, effect, transitionRef), ontology (kind, writer, derived fields, transitions), access grants (`dataScope.mode`, `entityRefs`), workflows processes
- `l2/<mod>/pipeline/pipeline.json` (thread, round, messageFile)

## Output

`l4/<mod>/pool/l1/web/needs.json` (overwritten) and one `pool/l1` message
`subject: "needs of <mod> (web)"`, `artifacts: ["pool/l1/web/needs.json"]`.
Trace `delivered` on the l2 pipeline. The pool is not deleted.

## Invariants

- Grain is entity + operation. No projection fields.
- `reads`: locate/inspect of the page's journeys, act entities of those journeys, process entities, ddm when the page has summary/highlights, crud entity on a form page with no journey. Home (`inicio_*` / first page of the actor, no journey) is reads only (derived/ddm of the actor; inbox reads the human-stage `entityRef` when present).
- `writes`: act steps (`effect` → operation, `transitionRef`); form + `writer: crud` on a page with no journey → create+update.
- `family`: `kind: role` → mdm; `isDdmEntity` → ddm; else tdm.
- `scope`: widest grant of the page's actors on the entity (`own < related < organization`).
- Gate: entity exists in l4, page exists in the menu, transitionRef exists on the entity, enums. No judgment.
