# masterDataManagement — experience `groupedCardList`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

Small reference data read as **cards grouped by what they are**: units under "Weight",
"Volume", "Count"; tax codes under their kind; active and inactive apart when nothing else
groups them. Each card carries the record's identity, its one or two facts and **an
on/off switch for whether it is in use** — because most master data upkeep is not
editing, it is deciding what is offered. Editing is a light, occasional view. Where
`compactCrudTable` reads one flat table and edits in a side panel, and `inlineGridEdit`
types across a grid of cells, this page answers "what do we have of each kind, and which
of them are in use?". Target: see the whole set by kind and turn records on or off in one
touch, with editing kept light.

## How to instantiate from the defs (the slots)

- **Groups come from a declared grouping field**: the record's type, kind or category when
  the contract exposes one; otherwise its status (active first, then inactive). One titled
  section per value present, with its count, in the contract's order or alphabetical.
- **One card per record**, all the same anatomy: the identity (name or code) first, then at
  most two descriptive facts the contract exposes, and the usage count when it exists. Cards
  wrap in a grid inside their group.
- **The switch on the card is the activate/deactivate command**: on when active. It appears
  only when the contract declares those commands (or one toggle command); without them the
  card shows the status as a quiet chip and no switch. Turning a record off confirms in
  plain words when the contract or the usage count says others depend on it ("Deactivate
  'Liters'? Records using it keep it; new records won't offer it."); turning on does not.
- **Inactive cards stay in their group, muted**, unless a declared filter hides them; the
  group count shows both ("12 · 3 inactive").
- **The light edit view**: tapping the card body opens a compact dialog with only the
  update command's inputs, prefilled, Save and Cancel. Merge, when declared, is a quiet
  action at the dialog's foot with a picker for the surviving record.
- **"New" per group**: one quiet action at the end of each group opens the same dialog with
  the create command's inputs and the group's value already chosen.
- Session/context inputs never render as fields; ids are never typed — the card IS the
  record. Never invent groups, usage counts or statuses the contract does not declare.

## Attention hierarchy (the spine of this experience)

1. The group titles and counts — what there is, of each kind.
2. The cards' identities and their switches.
3. The light edit dialog, when open.
4. Search, filters and "New" — quiet.

## Loops

- Scan a group → a record should not be offered → switch it off → confirm when it is used
  → the card mutes in place, the group count updates → next card.
- Occasional correction: tap the card → edit in the dialog → Save → the dialog closes and
  the card repaints in its group; a changed grouping value moves the card to its new group,
  which scrolls into view.

## Feedback & feedforward

- The switch reflects the committed state only: while the command runs it shows a running
  state on that card; on failure it returns to the true state and the card says why, normal
  body color, with retry. Never an optimistic flip that lies.
- Dialog validation at the field, in words, at commit time — never a toast.
- Save stays disabled until valid and changed; its label names the outcome ("Save unit").
- Success is local: the card mutes or repaints, the count updates. No page banners.

## Disciplines (transversal — always)

- The page name appears once, in the header; group titles are business values, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: the card body opens the dialog, the
  switch acts — they are visibly separate areas of the card.
- Inactive is muted, never red; alarm color only on a failed command.
- Group order is stable; cards never jump between groups except by an edit.

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
Everything above holds: groups by kind with counts, the switch on the card, inactive muted in
place, the light edit, feedback and disciplines. The card grid becomes one column of cards, because
the switch must stay big enough for a thumb. Where this section and the layout described above
differ, this section wins on mobile.

- **Groups stack in one column**, each titled with its value and count; every group starts open,
  and its title collapses it when the list grows long.
- **Cards are full width**: the identity and facts on the left, the switch on the right, large,
  separate from the tappable body.
- **The light edit becomes a view of its own**, with back: one field per line, Save and Cancel at
  the bottom where the thumb reaches. Back returns to the same group and scroll place.
- **"New" stays at the end of each group**, opening the same view with the group already chosen.
- **The deactivate confirmation** is a short dialog naming the record; nothing else is modal.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the group titles and counts, 2. the cards and their switches,
3. the current view's primary action, 4. the way back.

Forbidden on mobile:
- a multi-column card grid that shrinks the switch;
- swipe as the only way to activate or deactivate;
- a sheet or drawer covering part of the groups to edit;
- any horizontal scroll.

## Forbidden

- One flat table with a side panel beside it — that is the `compactCrudTable` experience,
  not this one.
- Editable cells and per-row commits across a grid — that is `inlineGridEdit`.
- Hiding inactive records by default when no declared filter asks for it; deactivation is
  a state shown in place.
- A switch for records the contract cannot activate or deactivate, or one that flips before
  the command succeeds.
- Groups the data does not express, or cards of mixed anatomy.
- Typed ids for anything the defs marks as selection/session/context.

## Signals (how to check the generated page)

1. **S1 grouped cards:** records render as cards inside titled groups, each title with a count.
2. **S2 switch on the card:** activate/deactivate is a control on each card, separate from the
   area that opens the record.
3. **S3 muted in place:** a deactivated record stays in its group, visually muted.
4. **S4 light edit:** editing opens a compact dialog (on mobile, a view with back) holding only
   the edit inputs — no side panel, no editable cells.
