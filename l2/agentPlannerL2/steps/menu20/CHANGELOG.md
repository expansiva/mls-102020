# menu20

## 2026-09-21 (p2_24)

- In `/candidate` the human prompt includes the canonical menu under
  "the module's current screens — keep their ids, labels and wording;
  change only what the l4 diff changes". Read via `p2CanonicalMenuFile`
  (literal module name). Not `previousMenu`, not a tree diff.

## 2026-09-21 (p2_21)

- No longer calls `markP2Complete`. The last flow step is `effort40`.

## 2026-09-20 (p2_20)

- Gate `P2_MENU_ENTITY_NO_FORM` and `meta.entities` are gone. A gate on an
  expectation derived from grant prose is the origin of the whack-a-mole
  (the attendant who only consults was accused of missing a form). Who
  maintains and who only consults is in the grant description; the person
  (analise3) reads the menu. There is no entity gate.
- Candidate `recordsKept` (pure): per `writer: crud` entity, the grants that
  reach it (`actorRef`, `disclosure.mode`, `dataScope.mode`, grant
  `description` as-is). Prompt label: records kept by this module and who is
  granted on them; the grant description says whether that actor maintains
  or only consults. No new rule sentence.

## 2026-09-20 (p2_19)

- `action` says what generation will do to a screen that already exists in l2.
  The comparison source is the manifesto materialization will write
  (`l2/<mod>/web/<device>/menu.built.json`, or the name that spec decides).
  That file does not exist yet: `readReadyL2Manifest` returns null, every node
  is `new`, `meta.removed` is `[]`. Enum stays `new|change|keep|remove`.
- No diff against the previous `menu.json`. `diffMenuTrees`, the legacy-layout
  migration and `pipeline.previousMenu` are gone.

## 2026-09-20 (p2_17)

- `P2_MENU_ENTITY_NO_FORM` no longer matches entity id/title against organism
  prose. It uses `meta.entities`: mapped, visible to the actor (direct or via
  hub), and that page has `form` or `actions`. The warning names which of the
  three is missing.

## 2026-09-20 (p2_16)

- Candidates `recordsMaintained` (pure): per actor, `writer: crud` entities in that actor's grant.
- `meta.entities` maps those entities to pages. Gate warning when a granted crud
  record has no `form`/`actions` citing it (the model may nest it; analise3 decides).
- Prompt: a record an actor maintains (crud, granted) has a place where that actor
  creates and edits it; if it belongs inside another page, say which.

## 2026-09-20 (p2_15)

- Writes `l4/<mod>/pool/l2/web/menu.json`. Schema `2026-09-20-p2-menu-v2.2`.
- `action` (`new|change|keep|remove`) stamped after the gate from a structural
  diff against the previous menu of the same device. Tool schema still has no `action`.
- Missing nodes go to `meta.removed` with `action: remove`. First generation is
  all `new`. Legacy `pool/l2/menu.json` is previous once, then deleted.

## 2026-09-19 (p2_12)

- Menu v2.1: organism kinds `inbox` and `alerts`; `meta.processes` maps process → pages.
- Candidates `beyondJourneys` (pure): human/alert stages, mechanical effects, derived/`ddm` per actor.
- Gate warnings for missing `alerts`/`inbox`/`timeline`/citation; unknown process/page is an error.
- Schema `2026-09-19-p2-menu-v2.1`. Prompt: what the system does on its own, the person must see it happened.

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
