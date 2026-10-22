# approvalWorkflow — experience `batchSignOff`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

**Sign off a set, not a request.** Many similar requests (a week of timesheets, a run of
expense lines, a supplier's invoices) are approved together: the reviewer sees what the set
adds up to, sets aside the few that need individual attention, and signs the rest in one
deliberate act that states its count and total. Where `readAndDecide` reads one record to a
verdict, and `decisionQueue` decides card after card in a shrinking inbox, this page decides
once for many — its unit of decision is the selection, and its spine is the summary of what
is being signed. Target: thirty routine lines approved in one act the reviewer can restate
("14 timesheets, 112 h"), with every exception seen and handled apart.

## How to instantiate from the defs (the slots)

- **The set comes from the contract**: the main object when it IS the batch (a run, a
  period, a statement) with its lines, or the pending-items query when the contract lists
  requests. Lines are compact rows: identity, requester, the decisive value right-aligned
  and tabular with its unit. Rows of the same kind share one anatomy.
- **Exceptions are pulled out above the set**: lines carrying a fact the contract flags
  (over limit, missing receipt, policy breach) render in their own short section first,
  NOT selected by default, each with its individual outcomes (approve, reject with reason)
  inline. Without contract flags there is no exceptions section — the page never invents
  a threshold to create one.
- **Selection is the working tool**: a checkbox per line, plus one "select all
  unflagged" at the head of the set, labeled with its scope ("Select all 26"). Flagged
  lines are never included by select-all.
- **The summary bar binds to the selection**: count selected and, when the contract
  declares a numeric measure, its total with unit ("14 selected · 112 h · R$ 3,480"). With
  no measure, the count alone. The summary is text, live, beside the batch verdict.
- **The batch verdict comes from the contract**: a command that accepts several items, or
  the batch object's own approve. When only a single-item command exists, the page applies
  it to each selected line in turn and reports each line's result — never a silent loop.
  Reject stays per line (it needs its own reason) unless the contract declares a batch
  reject with one shared reason.
- Session/context inputs never render as fields; ids are never typed — selection is the
  target.

## Attention hierarchy (the spine of this experience)

1. The summary bar — what the current selection adds up to, and the verdict beside it.
2. The exceptions — few, flagged, decided individually.
3. The set — uniform lines, scanned for anything that looks off.
4. Filters and captions, demoted.

## Loops

- Look at exceptions → decide or leave each → select all unflagged → scan the set,
  unticking what looks wrong → read the summary → sign → the signed lines leave, the
  summary resets, the remaining lines (unticked, exceptions) stay in view.
- Unticking a line updates the count and total immediately; the summary is always the
  truth about what the button will do.
- An empty set says once, calmly, that nothing is waiting for sign-off.

## Feedback & feedforward

- The verdict button restates the selection: "Approve 14 timesheets"; disabled with zero
  selected. Its one confirmation restates count and total, then commits — one beat.
- While the batch runs, the set locks and the summary shows progress ("9 of 14"); lines
  that fail stay, marked in place with the reason in body color and a retry for those
  only — the successful ones are never rolled back silently or re-sent.
- Success: signed lines leave, one calm line states what was signed (count, total, when).
  No page banner, no redirect.
- Alarm color only on the flagged facts in exception lines — never on the set, the summary
  or the frame.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it** (the summary is not titled like the verdict).
- A control is navigation OR action, never both: checkboxes select, the identity link opens
  a line's full record, the verdict decides.
- Link color only on real links; totals and captions use body or muted tones.
- Totals carry their unit or currency; never sum values of different units into one total.

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
Everything above holds: exceptions pulled out, selection as the tool, the live summary, one
verdict for many, feedback and disciplines. The summary and the verdict can no longer sit beside
the set, so they travel at the bottom of the screen, where the thumb signs. Where this section and
the layout described above differ, this section wins on mobile.

- **Exceptions first**, as full-width rows with their individual outcomes stacked inside each row.
- **The set as one column of rows**: checkbox at the leading edge (the whole row toggles it),
  identity wrapping, the decisive value right-aligned with unit. No table, no horizontal scroll.
- **Select all unflagged** sits at the head of the set, labeled with its scope.
- **The summary and verdict are a bar fixed at the bottom**: count and total on one line, the
  verdict as a full-width button under it, labeled with the selection.
- **The confirmation** restates count and total, with the confirm at the bottom.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the summary and verdict bar, 2. the exceptions, 3. the set.

Forbidden on mobile:
- the summary hidden while the set scrolls;
- selection by long press or swipe only;
- flagged lines included by select-all;
- any horizontal scroll.

## Forbidden

- One record read top to bottom with the decision at the end — that is `readAndDecide`.
- Approve/reject on every card as the main way to decide, each card leaving on its own —
  that is `decisionQueue`.
- A batch verdict without a visible, live count (and total, when a measure exists).
- Exceptions mixed into the set or preselected; invented thresholds or flags.
- Silent all-or-nothing failure; re-sending lines that already succeeded.
- Typed ids; page-level toasts carrying validation; inventing measures or totals.

## Signals (how to check the generated page)

1. **S1 multi-select:** lines carry selection controls, with one scoped select-all.
2. **S2 live summary:** a summary text shows the selected count (and total when a measure
   exists) and changes when a line is ticked or unticked.
3. **S3 one verdict for many:** one verdict button acts on the whole selection and its label
   names the count.
4. **S4 the rest stays:** after the verdict, the signed lines leave the set while unticked
   lines remain in view, unselected.
