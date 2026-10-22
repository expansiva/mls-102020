# settingsConsole — experience `featureToggleList`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

Configuration **as a list of switches that take effect the moment they are flipped**: each
row is one capability of the module, a plain explanation of what it does, and an on/off
switch whose state is written in words. There is no Save button anywhere — flipping is
committing, the row confirms it in place, and a short Undo stands by. Built for the
administrator who turns behaviors on and off (send reminders, allow partial deliveries,
require approval) and wants to see the whole set of capabilities at a glance. Where
`sectionedForm` edits sections of fields saved together and `searchableSettings` finds a
setting by typing, this answers "what is this module doing right now, and can I turn this
one thing on or off?". Target: the current state of every capability is readable in one
pass, and every change is one tap with immediate, visible effect.

## How to instantiate from the defs (the slots)

- **One row per boolean setting the contract declares**, grouped under the contract's
  natural grouping in business words, in declared order. Each row: the setting's label, its
  explanation from the contract's description (muted, one or two lines), and the switch with
  "On" or "Off" written next to it. Without a description, the row carries the label and the
  state only — never an invented explanation.
- **A flip commits at once** through the command that saves that setting; when the contract
  saves a whole group in one command, the flip sends the group with only that value changed.
- **Non-boolean settings** (a number, a choice, a reference) render as a row showing the
  current value in words with a "Change" control that opens an inline editor in the row
  (pickers for references, ids never typed) with one confirm that commits immediately. A
  non-boolean setting that only matters when a switch is on appears under that switch,
  indented, only when the contract declares that dependency.
- **Session/context inputs never render as fields** — at most a quiet caption in the header.
- **Consequence confirms only when the contract declares one** (a warning, a confirmation
  flag): then the flip asks one plain question naming the consequence before committing.

## Attention hierarchy (the spine of this experience)

1. The switches and their written state — the module's current behavior.
2. Each row's explanation.
3. The row's own result line after a change (confirmed, or failed with retry).
4. Group headings, quiet.

## Loops

- Read the list → flip a switch → the row shows a running state → "Turned on" in the row with
  Undo for a few seconds → keep reading. Nothing navigates, nothing waits for a Save.
- Undo commits the previous value through the same command, and the row says so.
- Change a value → confirm in the row → it commits and the row shows the new value in words.

## Feedback & feedforward

- The switch moves only when the command succeeds; while it runs, only that row is locked.
- A failed flip returns the switch to its saved state and writes the failure in the row, in
  normal body color, with retry — never a switch showing a state the system does not hold.
- Rules the contract declares for a value are stated in its inline editor before the mistake.
- No page-level banners, toasts or redirects; every result lives in its row.

## Disciplines (transversal — always)

- The page title appears once, in the header; group headings never repeat it, and **no heading
  anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: here every switch is an action, nothing
  navigates.
- Link color only on real links (Undo, Change); explanations and states are muted text.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is never
  rendered as visible text, heading or label — setting keys never replace their labels.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: one row per capability, the state in words, immediate commit on flip,
Undo in the row, results in the row, feedback and disciplines. A list of switches is already at
home on a phone; only the row's layout tightens so the switch stays under the thumb. Where this
section and the layout described above differ, this section wins on mobile.

- **Each row is full width**: label and state on the first line, the switch at the right edge,
  the explanation wrapped under them, never cut.
- **Group headings stack** in declared order; the whole list is one scroll, no menus.
- **Undo and failure lines appear inside the row**, under the explanation, with no scroll jump.
- **Inline editors for values** open in the row, full width, the matching keyboard raised, the
  confirm right under the field.
- **Touch**: every target is at least 44px high, the switch and Undo included; nothing depends on
  hover.

Mobile attention hierarchy: 1. the switches with their state, 2. the explanations, 3. the row's
result line.

Forbidden on mobile:
- a Save bar at the bottom of the screen;
- explanations hidden behind an info icon or tooltip;
- rows opening a second screen to change a switch;
- horizontal scroll of any kind.

## Forbidden

- Sections of fields saved together with a Save per section — that is `sectionedForm`; here a
  flip is the commit.
- A dominant search box as the way in — that is `searchableSettings`.
- Any Save button for switches, or a switch that shows a new state before the system confirms.
- Explanations, recommendations or usage counts the contract does not provide.
- Typed ids for reference values; editable session/context values.
- Blocking success dialogs, page-level toasts, redirects after a change.

## Signals (how to check the generated page)

1. **S1 Switches in words:** every boolean setting renders as a switch with its state written
   ("On"/"Off") next to it.
2. **S2 No Save for switches:** there is no Save button for the switches; flipping one runs the
   command at once.
3. **S3 Result in the row:** after a flip, the confirmation (with Undo) or the failure appears in
   that row, not as a toast.
4. **S4 Honest state:** on a failed flip the switch returns to its saved state.

## Molecule rules

```json
{
  "axes": {
    "boolean": "toggle",
    "validation": "inline-below",
    "feedback": "inline"
  },
  "groups": {
    "prefer": ["groupEnterBoolean"],
    "forbid": []
  }
}
```
