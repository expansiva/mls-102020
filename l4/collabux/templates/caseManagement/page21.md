# caseManagement — experience `caseWorkbench` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A service desk for someone who works a queue all day: **the case queue on one side, the
full workspace of the selected case on the other**. The agent's rhythm is pick — resolve —
next, dozens of times a shift, and the page is built so that rhythm never breaks: the
queue never disappears, the workspace swaps instantly, and every tool for the case (its
data, its comment thread, its status actions) is on the same stage. Where
`conversationFirst` makes the case's narrative the center and everything else marginal,
this experience gives data, thread and actions equal standing on one bench.

## How to instantiate from the defs (the slots)

- **The queue comes from the case query**: one row per case — identity (subject/number as
  the contract labels it), requester, status in words, and the fact that orders the queue
  (age, priority) when the contract declares it. The contract's filters render compactly
  above the queue (status, assignee, priority) as pickers and choices, **ids never typed**.
- **Selecting a row fills the workspace** beside the queue; the selected row stays marked.
  The workspace has three regions, all visible on wide screens:
  1. *the case record* — every field the contract provides, labels in business words,
     requester identity readable at a glance;
  2. *the thread* — comments and events in time order, newest clearly reachable, with the
     comment composer directly attached to it;
  3. *the actions* — the contract's status commands (assign, resolve, close) as buttons
     labeled by outcome ("Resolver caso"), showing ONLY transitions allowed from the
     current status.
- **Commenting is a command**: composer disabled-until-typed, the sent comment appears in
  the thread immediately, composer clears and keeps focus — built for the next one.
- **Assignment uses pickers** over what the contract exposes; **session/context inputs
  never render as fields** — the acting agent comes from the session, caption at most
  ("Atendendo como Maria").

## Attention hierarchy (the spine of this experience)

1. The queue — what is waiting, in work order.
2. The selected case's identity and status.
3. The thread and the composer — where the work happens.
4. The status actions — consequential, contextual, few.

## Loops

- Pick from the queue → read → comment or act → the case's status changes in place → the
  queue row updates → pick the next. Queue filters survive every action.
- The triage sweep: filter to new/unassigned → assign in quick succession without losing
  the filter or the scroll position.

## Feedback & feedforward

- Command failure reports inside the region that failed — a failed comment at the
  composer, a failed transition by the action buttons — normal body color, with retry;
  the queue and other regions stay live. A failed comment never loses its text.
- Transitions that end the case (close) confirm once, in plain words about the
  consequence; all action buttons are disabled until any required inputs are set.
- Success is local: status text updates in place, the row reflects it, brief inline
  confirmation — no page banner, no redirect, and the case does NOT vanish from the
  workspace on resolution; it leaves the queue only when the filter says so.
- Queue loading shows skeleton rows; an empty filter result says so in words that echo
  the filters, never invented cases. An empty workspace (nothing selected) says once,
  quietly, what selecting will show.

## Disciplines (transversal — always)

- The page title appears once, in the header; the workspace titles itself with the case's
  subject, and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: queue rows select, action buttons act,
  the composer sends — no control does two of these.
- Link color only on what is clickable; timestamps, captions and passive status text are
  muted; alarm color only on facts the contract flags (breached, urgent).

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
Everything above holds: the pick — resolve — next rhythm, the three peer regions of the case, the
loops, feedback and disciplines. Only the shape changes, because the queue and the workspace can no
longer sit side by side, and the three regions can no longer be seen at once. Where this section
and the layout described above differ, this section wins on mobile.

- **Side by side becomes a sequence on the same page**: queue → case. The case is a view of its
  own with back, inside this page — never another page. The queue survives every action, one tap
  away, with the same filters and scroll.
- **The queue is the home view**: the contract's filters as compact pickers on top, then one case
  per row — subject first, requester and status in words under it, the ordering fact (age,
  priority) right-aligned. No table, no horizontal scroll.
- **The case view keeps the three regions as peers**: on top, always, the case's identity and
  status with ONLY its allowed status actions as buttons labeled by outcome. Below, a small
  segmented switch with two equal options — the case record and the thread — swaps the body; it
  remembers the last choice from case to case, so a sweep keeps its rhythm. Neither region is a
  margin of the other.
- **The thread** shows comments in time order with the newest reachable at once; the composer is
  attached at its bottom, where the thumb reaches, and keeps focus after sending.
- **Next case**: a "Next case" control in the case view opens the next row of the queue under the
  current filters, so pick — resolve — next never needs a trip back. The case does not vanish on
  resolution; it leaves the queue only when the filter says so.
- **Back** returns to the queue at the same place, with the row updated.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the queue (or, in the case view, the case's identity and status),
2. the thread and composer or the record, as switched, 3. the status actions, 4. next case and the
way back.

Forbidden on mobile:
- a drawer or sheet over part of the queue to show the case;
- the thread filling the case view with record and actions pushed out of reach;
- record, thread and composer stacked on one long screen;
- losing the queue's filters or scroll after working a case.

## Forbidden

- The thread swallowing the page while case data and actions retreat to a margin — that
  is the `conversationFirst` experience, not this one; here the bench holds all three
  regions as peers.
- Showing every status action regardless of current status, or transitions the contract
  does not allow.
- Opening a case as a separate page navigation — the queue must survive every action.
- Typed ids for assignees, requesters or any reference; editable session/context values.
- Inventing SLA timers, sentiment, priority scores or suggested replies the contract does
  not declare.
- Blocking success dialogs, page-level toasts carrying validation, steps or wizards to
  work a case.
