# menu20

## 2026-09-19 (p2_11)

- Menu v2: one tree (`hub` / `page` / `group`), organisms on pages, `authorities` by actor, `meta.journeys`.
- Replaces v1 place|action. Schema `2026-09-19-p2-menu-v2`. Candidates: grant anchors + `(entity, actor)` from workspaces20.
- Journey with no page is a pipeline warning, not a gate error.

## 2026-09-19 (p2_10)

- On approve, `markP2Complete` sets `pipeline.status = complete` (last step of flow.json).

## 2026-09-18 (p2_09)

- New step: one reasoning call writes `l4/<mod>/pool/l2/menu.json`.
- Candidates from `workspaces20/contracts.ts` are prompt data, not the cut.
- Gate plus bounded repair. `workflows` stays `[]`.
