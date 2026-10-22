# settingsConsole — experience `setupChecklist`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

Configuration **as an implementation checklist**: each configuration area is an item with a
plain statement of what it sets up and whether it is done, a progress line tells how much of
the module is configured, and each item opens its own settings to be completed and saved.
Built for the administrator bringing a module live — a first-time setup, a new branch, a
re-implementation — who needs to know what is left before the module is usable, more than
where a particular setting lives. Where `sectionedForm` offers a stable map of places and
`searchableSettings` starts from a typed question, this answers "what still has to be
configured before this works?". Target: nothing required is forgotten, and every item says
in one line why it matters.

## How to instantiate from the defs (the slots)

- **One item per configuration area of the contract** (one query/command pair, one natural
  group), in declared order. Each item carries a business title ("Invoice numbering") and one
  muted line on what it sets up — the contract's description when provided, otherwise the
  labels of the settings it holds ("Sets: prefix, next number"), never an invented benefit.
- **An item is done when its required settings have values** the contract returns as saved;
  an area with no required setting is optional and marked so. When the contract declares a
  test/verify command for an area, done also requires a passing test, and the item says
  "Tested" or "Not tested" in words.
- **The progress line counts required items** ("5 of 8 required done"), optional apart.
- **Opening an item shows its settings in a panel beside the checklist**: fields in declared
  order, label above, short description below; booleans as switches with their state in
  words, enumerations as selects, references as pickers — ids never typed. The item's Save
  names it ("Save invoice numbering"); a declared test runs from a control next to Save, its
  result written in the panel. A declared reset sits secondary and confirms.
- **Session/context inputs never render as fields** — which organization, which user — at
  most a quiet caption in the header.
- **A done item shows a recap** of its key saved values in one line, with "Review" to reopen.

## Attention hierarchy (the spine of this experience)

1. The progress line — how much is left.
2. The not-done required items, each saying what it sets up.
3. The open item's settings and its Save.
4. Optional items, quieter, after the required ones in reading weight (never reordered).

## Loops

- Glance at progress → open the first not-done item → fill → save (→ test, when declared) →
  the item turns done, the count moves → the next item.
- Revisit a done item through "Review": editing it returns it to not done only if a required
  value becomes empty or a declared test fails.
- All required done → the progress line says so plainly ("The module is configured"); the
  checklist stays as the console's front page.

## Feedback & feedforward

- Rules the contract declares are stated at the field before the mistake.
- A failed save or test reports inside the item's panel, above its controls, with retry.
- While saving, the panel locks and its button shows a running state; the checklist stays usable.
- Leaving an item with unsaved changes asks one plain confirm naming the item.
- Success is local: the item's state changes in place. No banners, no redirect.

## Disciplines (transversal — always)

- The page title appears once, in the header; item titles never repeat it, and **no heading
  anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: items open, Save saves, test tests.
- Link color only on real links; recaps, descriptions and counts are muted.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is never
  rendered as visible text, heading or label — if a region has no business name, it has no
  heading.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: items with done or not done, required progress, each item opening its own
settings and saved on its own, declared tests, feedback and disciplines. The checklist and the
panel can no longer sit side by side, so an item opens as a view of its own. Where this section and
the layout described above differ, this section wins on mobile.

- **The checklist is the home view**: progress line on top, items full width with their state,
  one-line purpose and recap wrapped, never cut.
- **Tapping an item opens its settings as a view of its own**, with back to the checklist at the
  same place: one setting per line, switches at the right edge with their state in words.
- **Save sits at the bottom of the item's view**, where the thumb reaches; a declared test sits
  beside it, its result written right above them.
- **After Save the view stays on the item**, showing its new state; back returns to the
  checklist with the count updated.
- **Touch**: every target is at least 44px high, switches included; nothing depends on hover.

Mobile attention hierarchy: 1. the progress line, 2. the not-done required items, 3. the open
item's Save.

Forbidden on mobile:
- the checklist as a drawer over the settings, or both stacked on one long screen;
- one save for several items;
- items reordered by state;
- horizontal scroll of any kind.

## Forbidden

- A fixed section map with no done state or progress — that is `sectionedForm`; here every
  item states whether it is done.
- A search box as the way in — that is `searchableSettings`.
- Steps or "next" forcing an order between items; items are done in any order.
- Inventing requirements, tests or "recommended" items the contract does not declare; marking
  done anything the contract has not returned as saved.
- A global save; typed ids; editable session/context values.
- Blocking success dialogs, page-level toasts carrying validation, redirects after save.

## Signals (how to check the generated page)

1. **S1 Checklist front page:** every configuration area appears as an item with a done or not
   done state in words.
2. **S2 Purpose line:** each item states in one line what it sets up (a description or the
   labels of its settings).
3. **S3 Progress:** a line counts required items done out of the total and updates after a save.
4. **S4 Opens its settings:** opening an item shows only that area's settings with a Save named
   for the item.

## Molecule rules

```json
{
  "axes": {
    "validation": "inline-below",
    "feedback": "inline",
    "boolean": "toggle",
    "selectOne": "dropdown"
  },
  "groups": {
    "prefer": ["groupShowProgress", "groupViewData"],
    "forbid": ["groupNavigateSteps"]
  }
}
```
