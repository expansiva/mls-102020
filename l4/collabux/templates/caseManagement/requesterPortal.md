# caseManagement — experience `requesterPortal`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

**The other side of the counter.** The person here is the one who ASKED — a customer, an
employee, a supplier — not the agent who works the case. Their questions are simple: what
did I ask for, where does it stand, and is anyone waiting on me? The page lists *my*
requests in plain words, puts the ones that need my reply on top, and lets me add
information or a comment without learning any internal workflow. Where `caseWorkbench` and
`conversationFirst` are both agent views — one a bench for many cases, one a case's full
story for handover — this page is the requester's window: no queue to work, no status
actions to fire, internal detail kept out. Target: a requester who knows, in one glance,
whether they need to do something, and does it in one reply.

## How to instantiate from the defs (the slots)

- **"My requests" is the case query scoped by the session** — the requester comes from
  the session or context, never from a field. Each request is a row: subject, the status
  as the contract phrases it in plain words, and when it last changed ("updated 2 days
  ago"). Internal fields (assignee group, priority, internal codes) are shown only when the
  contract exposes them as requester-facing; when unsure, leave them out.
- **"Waiting on you" comes first**: requests whose status the contract declares as awaiting
  the requester (pending info, awaiting reply) render in their own short section at the
  top, each with one line of what is expected when the contract carries it. Without such
  a status, there is no such section — never guess it from text.
- **Opening a request shows its requester view**: the subject and status in words, what
  was asked (the original description), and the public conversation — comments the
  contract exposes to the requester, oldest first. Internal notes and system events
  without a requester meaning stay out.
- **Add info / comment is the requester's one command**: a composer attached to the
  conversation, labeled with the outcome ("Send reply"), disabled until typed;
  attachments only when the contract declares them. When the request is awaiting the
  requester, the composer opens ready, with the expectation line above it.
- **Other requester commands**, when the contract declares them (open a new request,
  withdraw, confirm resolution), render as plain buttons in their natural place: "new
  request" once above the list; confirm or withdraw at the foot of the request view.
- Ids are never typed; the requester never chooses whose requests to see.

## Attention hierarchy (the spine of this experience)

1. Requests waiting on me — what I need to do.
2. My open requests and where each stands, in plain words.
3. Inside a request: status, the expectation, and the composer.
4. Closed requests and captions, demoted.

## Loops

- Arrive → see "waiting on you" → open it → read what is expected → reply → the request
  moves out of the waiting section into "open", with its status updated in place.
- Check on progress: scan open requests by their last change → open one to read the latest
  reply → back to the same place in the list.
- Nothing waiting and nothing open says once, calmly, that all requests are settled, with
  the new-request action when declared.

## Feedback & feedforward

- Status is always words the requester understands, with when it last changed — never an
  internal code, never a color alone.
- A sent reply joins the conversation immediately; failure stays at the composer, in body
  color, with retry, text never lost.
- Confirming resolution or withdrawing confirms once, in plain words about the consequence.
- No alarm color for the requester's own requests unless the contract flags something they
  must act on before a date.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it**.
- A control is navigation OR action, never both: rows open requests, the composer sends,
  requester commands act.
- Link color only on real links; dates and captions are muted.
- Agent-side vocabulary (queues, internal statuses, SLA, assignment) is never shown to the
  requester unless the contract exposes it as requester-facing.

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
Everything above holds: my requests only, waiting-on-you first, plain-word status, the reply as the
one command, feedback and disciplines. The list and an open request become two views of the same
page, because a phone shows one at a time. Where this section and the layout described above differ,
this section wins on mobile.

- **The list is the home view**: "waiting on you" first, then open, then closed folded behind one
  quiet control. Each row: subject wrapping, status in words and last change under it.
- **A request opens as a view of its own** with back, inside this page: status and expectation on
  top, the original description, then the conversation in one column.
- **The composer sits at the bottom** of the request view, at the conversation's end; the newest
  reply stays visible above it when the keyboard opens.
- **New request**, when declared, is one full-width button at the top of the list view.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. requests waiting on me, 2. my open requests, 3. inside a request,
the expectation and the composer.

Forbidden on mobile:
- agent controls (assign, status changes) anywhere;
- the conversation hiding the expectation line;
- a drawer over the list to show a request;
- any horizontal scroll.

## Forbidden

- A case queue beside a full agent workspace with status actions — that is `caseWorkbench`.
- An agent's complete transcript with internal events and a reference shelf of actions —
  that is `conversationFirst`.
- Assign, prioritize, resolve or other agent transitions on this page.
- A requester picker or any field to choose whose requests are shown; typed ids.
- Internal notes, internal codes or agent vocabulary shown to the requester; inventing
  expectations or statuses the contract does not declare.
- Page-level toasts carrying validation; redirects after replying.

## Signals (how to check the generated page)

1. **S1 mine only:** the list has no requester or assignee filter field; the scope comes
   from the session.
2. **S2 waiting first:** the page's first section is the requests awaiting the requester
   (or, when none are, the open requests), above everything else.
3. **S3 no agent actions:** no assign, priority or agent status-change controls appear
   anywhere (a requester's own confirm or withdraw is not one).
4. **S4 reply is the action:** the open request carries a reply composer as its main
   control, labeled with the outcome.

## Molecule rules

```json
{
  "axes": {
    "recordsView": "list",
    "feedback": "inline"
  },
  "groups": {
    "prefer": ["groupViewData", "groupEnterText"],
    "forbid": []
  }
}
```
