# entityRecordManagement — experience `completenessChecklist`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (commands, fields, transitions — never contradict it); this skill is the
> flavor: how the page moves, focuses and feels. Where the two seem to conflict, the defs
> wins on DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The record **as a checklist of what it still needs**: each subject is a checklist item
marked complete or incomplete, required or optional, with a progress line on top and the
record's next lifecycle action at the foot — disabled, with its reason, until every required
item is complete. The person works the gaps, not the form: open the incomplete item, fill
it, save it, watch the progress move. Built for records that are assembled over time before
they can advance — a property before listing, a campaign before launch, a contract before
signature. Where `focusedRecordForm` edits the whole record in one column and
`recordPageTabs` organizes subjects as rooms to visit, this answers "what is missing before
this record can move to its next state?". Target: the gap is always named, and the
lifecycle action is never a surprise refusal.

## How to instantiate from the defs (the slots)

- **An identity header**: the record's name and status chip, read-only.
- **One checklist item per subject group of the command's inputs**, in declared order. An
  item is **required** when its group holds a field the contract declares required, otherwise
  **optional**. Each item shows its subject title, required or optional in words, and its
  state: complete (a one-line recap of real values) or incomplete (what is missing, by field
  label: "Missing: area, address").
- **The progress line counts required items only** ("4 of 6 required complete"), with
  optional items counted apart in muted text ("1 of 3 optional"). No percentages the contract
  does not give.
- **Opening an item** shows its fields in a panel beside the checklist (pickers for
  selections, ids never typed) with its own Save named for the subject. When the contract
  declares per-subject commands, each item uses its own; otherwise Save sends the update
  command with only that item's values changed. Session/context inputs never render as
  fields.
- **The lifecycle action comes from the contract's transition commands** allowed from the
  current status: one button at the foot of the checklist, named for its outcome ("Publish
  listing"). While any required item is incomplete, it is disabled and its reason lists them.
  When the contract itself rejects the transition, its message is shown as given. When the
  contract declares no transition, the foot keeps the same slot as a plain readiness line
  ("Ready" or "Not ready: Address, Photos") — never an invented button.
- **Create mode**: the identity item opens first; the others read incomplete and open once the
  first save creates the record.

## Attention hierarchy (the spine of this experience)

1. The progress line — how far from ready.
2. The incomplete required items, each naming what is missing.
3. The open item's panel and its Save.
4. The lifecycle action with its reason.

## Loops

- Glance at progress → open an incomplete required item → fill → save → the item turns
  complete, the count moves → the next gap.
- Last required item complete → the lifecycle action wakes → confirm in plain words naming
  the consequence → the status chip updates in place; the checklist stays.
- Optional items can be completed any time; they never block the action.

## Feedback & feedforward

- The action's disabled reason is written beside it, naming the incomplete required items.
- Validation is at the field, in words, at the item's Save — never a toast.
- A failed item save reports inside its panel, with retry; values kept, checklist untouched.
- A failed transition reports beside its button, in normal body color, with retry.
- Switching items with unsaved changes asks one plain confirm naming the item.

## Disciplines (transversal — always)

- The page name appears once, in the header; item titles never repeat it, and **no heading
  anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: items open, Save saves, the lifecycle button
  transitions.
- Link color only on real links; recaps, "Missing" lines and counts are muted.
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
Everything above holds: the checklist with required and optional items, the progress count, each
item saved on its own, the lifecycle action gated with its reason, feedback and disciplines. The
checklist and the item panel can no longer sit side by side, so an item opens as its own view.
Where this section and the layout described above differ, this section wins on mobile.

- **The checklist is the home view**: progress line at the top, items full width, incomplete
  required items marked, recaps and "Missing" lines wrapped, never cut.
- **Tapping an item opens it as a view of its own**, with back, inside this page: fields one per
  line, labels above, matching keyboards for numbers and dates.
- **The item's Save sits in a bar at the bottom** of its view; after saving, the view returns
  to the checklist at the same place, the item now complete.
- **The lifecycle action stays in the flow under the last item**, full label, with its
  disabled reason written above it.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the progress line, 2. the incomplete required items, 3. the
lifecycle action with its reason.

Forbidden on mobile:
- the lifecycle action in a fixed bar that hides its reason;
- item fields expanded inside the checklist, pushing other items off screen;
- all items as one long form with one save;
- horizontal scroll of any kind.

## Forbidden

- One continuous column with one save for the whole record — that is `focusedRecordForm`.
- Subjects as tabs with the record's lifecycle in a pinned header — that is `recordPageTabs`;
  here the lifecycle action sits at the end of the checklist and is gated by it.
- A lifecycle action that enables while a required item is incomplete, or is disabled silently.
- Optional items blocking the action, or invented requirements the contract does not declare.
- Percent scores, health badges or weights the contract does not provide.
- Typed ids; blocking success dialogs, toasts carrying validation, redirects after save.

## Signals (how to check the generated page)

1. **S1 Items with state:** every subject is listed as an item marked complete or incomplete and
   required or optional.
2. **S2 Named gaps:** an incomplete item names its missing fields in words.
3. **S3 Required progress:** a line counts required items complete out of the total and changes
   after an item is saved.
4. **S4 Gated foot:** under the checklist, the lifecycle action (or, with none declared, the
   readiness line) states not ready while a required item is incomplete, naming those items.

## Molecule rules

```json
{
  "axes": {
    "progress": "segmented",
    "validation": "inline-below",
    "feedback": "inline"
  },
  "groups": { "prefer": ["groupShowProgress", "groupTriggerAction"], "forbid": [] }
}
```
