# reportExplorer — experience `savedViewTabs`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The questions this person asks are few and recurring, so they are kept as **tabs: each tab is a
ready preset of the report's parameters, switched in one click, and the result on screen always
belongs to the active tab**. Nobody composes anything to start; the page opens on the first tab
with its result already there, and comparing "Overdue", "This month" and "My region" is a matter
of moving across the tab row. Where `parameterPanel` makes the analyst compose and RUN each
question and `catalogOfReports` offers a shelf of different reports to choose from, this page
answers **"show me my usual cuts of this report, fast"** — one report, several standing questions.
Target: a recurring consumer of one report who checks the same few views every day or week.

## How to instantiate from the defs (the slots)

- **Tabs come from presets of the report query's inputs**: each preset is a named combination of
  values for the contract's declared inputs — periods, statuses, references — built from the
  contract's own enumerations, defaults and declared views. Preset names are business words that
  describe the question ("Overdue", "This month", "Awaiting approval"). Never a preset that uses a
  value the contract does not declare; three to six tabs; the first is the contract's default.
- **When the contract declares saved views** (a query of views and commands to save or delete
  them), the person's own views join the row after the presets, and the row ends with one quiet
  "Save as view" action that names the current parameters. Without such commands, the tab row is
  fixed: no save, no rename, no hidden local storage pretending to persist.
- **Under the tabs, one muted line states the active tab's parameters in words** ("Due before
  today · all regions · open only"), with one "adjust" control that opens the parameters inline
  for this tab. An adjusted tab shows a small "modified" mark until it is saved (when saving is
  declared) or reset by one click.
- **The result renders what the query returns**: a real table with the contract's columns,
  numbers right-aligned and tabular, aggregates as one summary line above it. Rows drill down
  to their record. Export, when declared, acts on the active tab's result ("Export this view").
- **Session/context inputs never render as parameters**; ids are never typed.

## Attention hierarchy (the spine of this experience)

1. The tab row — which question is active, and the others one click away.
2. The result of the active tab.
3. The parameter line under the tabs — what exactly this tab asks.
4. Adjust, save and export, quiet at the edges.

## Loops

- Open the page → the first tab's result is already there → click the next tab → its result
  replaces the previous one → drill into a row → back returns to the same tab and scroll.
- Adjust a tab → the result refreshes → "modified" appears → save it as a view (when declared) or
  reset → the tab row reflects it.
- Each tab remembers its own scroll position and sort within the visit; switching never mixes
  the results of two tabs.

## Feedback & feedforward

- On switch, the tab activates immediately and the old result dims while the new one loads; a
  result never appears under the wrong tab, not even for a moment.
- A tab whose query fails reports inside the result region with retry; the tab row stays usable.
- A tab with no rows says so in words that echo its parameters ("Nothing is overdue.") — an
  answer, not an error.
- Delete of a saved view (only when declared) is the one danger action, behind a confirmation
  that names the view.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label of a
  button or link near it**; the active tab's name is not repeated as a heading over the result.
- A control is navigation OR action, never both: tabs switch, adjust opens, save saves, rows
  drill down.
- Link color only on real links; the parameter line and captions are muted.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields, nor as preset tabs.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names, input
  names) is never rendered as visible text — tab names and the parameter line speak business.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: tabs as presets, one-tap switch, the result bound to the active tab, the
parameter line, feedback and disciplines. Only the tab row and the table change shape, because
six tabs and a wide table cannot share 390px. Where this section and the layout described above
differ, this section wins on mobile.

- **The tab row is the one horizontal scroll allowed**: a single row of tabs that scrolls sideways
  when they do not fit, the active tab always scrolled into view. Nothing else scrolls sideways.
- **The parameter line** sits under the tabs, wrapping, with "adjust" at its end; adjusting opens
  the parameters as a view of its own, one per line, with apply at the bottom, and back returns to
  the same tab.
- **The result becomes a list of rows**: the leading column as identity, the other values as
  label and value pairs under it, numbers right-aligned; the summary line stays above the rows.
- **Save as view and export** sit at the foot of the result, where the thumb reaches.
- **Back from a drill-down** returns to the same tab and scroll.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the active tab and its result, 2. the other tabs, 3. the parameter
line, 4. save and export.

Forbidden on mobile:
- any horizontal scroll other than the tab row, including the result;
- replacing the tabs with a dropdown that hides which views exist;
- a result shown without the active tab visible above it;
- swipe as the only way to change tabs.

## Forbidden

- A parameter panel with an explicit RUN gate as the way in — that is the `parameterPanel`
  experience, not this one.
- A gallery of different reports as cards — that is the `catalogOfReports` experience, not this
  one; here there is one report and its standing questions.
- Tabs for different reports, or a result that can belong to a tab other than the active one.
- Saving or renaming views without contract commands; invented presets using undeclared values.
- Two tabs' results on screen at once; nested tabs; more than one row of tabs.
- Blocking success dialogs, page-level toasts carrying validation, redirects after save.

## Signals (how to check the generated page)

1. **S1 Tabs are presets:** a row of tabs over one result region, each tab a named parameter
   combination of the same report.
2. **S2 Result on open:** the first tab's result renders on load without any RUN or compose step.
3. **S3 Active-tab binding:** switching a tab replaces the result; a muted line under the tabs
   states the active tab's parameters in words.
4. **S4 One report:** every tab queries the same report; no tab opens a different report.

## Molecule rules

```json
{
  "axes": {
    "sectionNav": "tabs",
    "recordsView": "table",
    "feedback": "inline"
  },
  "groups": {
    "prefer": ["groupNavigateSection", "groupViewTable"],
    "forbid": []
  }
}
```
