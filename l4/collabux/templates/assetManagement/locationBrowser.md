# assetManagement — experience `locationBrowser`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

Assets **found by where they are**: the person walks the places — site, building, floor,
room, as the contract nests them — and each place shows what sits in it, with its count.
The question is "what is in this room?" or "where did the projector go?", asked by someone
standing somewhere. Where `assetRegistry` treats every asset as a searchable entry with a
dossier, and `maintenanceBoard` ranks assets by how urgently they need work, this page uses
the location hierarchy itself as the navigation; the place is the context of every action,
including moving an asset to another place. Target: reach any place in a few choices and
see, and correct, what is really there.

## How to instantiate from the defs (the slots)

- **Places come from the asset's location data**: a location hierarchy query when the
  contract declares one; otherwise the location field's values, split into levels only when
  the contract's data is already nested (parent location, path). A flat location field is
  one level of places. Each place shows its name and the count of assets in it (with its
  children included, stated as such).
- **The path bar** above the content shows where the person stands ("Plant 2 › Building B ›
  Room 104"); each step is a link back to that level.
- **The current place shows two things**: its child places as a short list of entries with
  counts, then its own assets as rows — identity first, then type and lifecycle state as
  declared. Child places come before assets, always.
- **An asset opens in place, under its row**: the contract's fields in labeled blocks, read
  mode, with its allowed transitions as outcome-named buttons and Edit as an explicit switch.
- **Moving an asset** uses the assign/transfer command the contract declares: "Move" opens a
  place picker that browses the same hierarchy, starting at the current place. On success
  the row leaves this place and the counts update along the path.
- **"Add asset here"** sits at the end of the place's assets: the create command's form with
  the location already chosen.
- **Search** (when declared) finds an asset anywhere and lands on its place, with the row
  open — the hierarchy is never bypassed.
- **No location in the contract**: the page cannot browse places; it says so once and shows
  the assets as one list. Never invent places or a hierarchy.
- Session/context inputs never render as fields; ids are never typed — places and assets
  are chosen. Never invent counts, floor plans or coordinates.

## Attention hierarchy (the spine of this experience)

1. The path bar — where I am.
2. The child places with their counts — where I can go.
3. The assets in this place.
4. The open asset and its actions — only when asked for.

## Loops

- Enter at the top level → choose a place → choose a child place → read what is there →
  back up one step via the path bar → choose a sibling place.
- Audit a room: open the room → an asset is not there physically → Move → pick its real
  place → the row leaves, the counts follow → next asset in the room.
- An asset found elsewhere: "Add asset here", or search it and Move it to the current place.

## Feedback & feedforward

- The place picker shows the destination path before commit ("Move to Plant 2 › Room 108");
  the commit label names the outcome ("Move projector").
- A failed move or transition reports under the asset, above its button, normal body color,
  with retry; the place and its counts stay true.
- An empty place says once, quietly, that nothing is registered there, with "Add asset
  here" still available.
- Success is local: the row leaves or repaints, the counts along the path update.

## Disciplines (transversal — always)

- The page name appears once, in the header; the current place's name titles the content,
  and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: places and path steps navigate, asset rows
  open, buttons commit.
- The browse position survives every action; nothing returns the person to the top.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: places as navigation, counts, child places before assets, moving through
the place picker, "Add asset here". The path bar no longer fits in full, so it shrinks to the
parent place and the current one. Where this section and the layout described above differ, this
section wins on mobile.

- **The path shrinks to "‹ Building B" above the current place's name**; tapping it goes up one
  level; tapping the name shows the full path as a short list to jump to any level.
- **Each place is a view of its own**: child places as full-width rows with counts, then the
  assets as rows. Back returns to the parent at the same scroll place.
- **An asset opens as a view of its own**, with back to its place: labeled blocks in one column,
  transitions as full-width buttons, Move at the bottom where the thumb reaches.
- **The place picker** browses level by level, one view per level, the destination path shown at
  the bottom next to the commit.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the current place's name and its child places, 2. its assets,
3. the way up.

Forbidden on mobile:
- an expandable tree with nested indents several levels deep;
- a path bar that scrolls sideways, or any horizontal scroll;
- moving an asset by drag only;
- losing the current place after opening an asset.

## Forbidden

- A flat searchable list with a dossier pane as the page's spine — that is the
  `assetRegistry` experience, not this one.
- Lanes of assets ranked by urgency — that is `maintenanceBoard`.
- Search results that show assets without their place.
- Floor plans, maps or coordinates the contract does not declare.
- Moving an asset by typing a location name or id.
- Typed ids for anything the defs marks as selection/session/context.

## Signals (how to check the generated page)

1. **S1 places first:** the first screen lists places (with counts), not assets.
2. **S2 path:** a visible path of the current place lets the person go back up the levels.
3. **S3 place-scoped actions:** creating an asset from a place arrives with that place already
   chosen.
4. **S4 move by picking:** changing an asset's place uses a picker of places, never a text
   field.

## Molecule rules

```json
{
  "axes": {
    "sectionNav": "breadcrumb",
    "recordsView": "list",
    "expand": "collapsible",
    "feedback": "inline"
  },
  "groups": {
    "prefer": ["groupNavigateSection", "groupViewData", "groupExpandContent"],
    "forbid": []
  }
}
```
