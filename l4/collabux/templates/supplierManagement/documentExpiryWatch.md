# supplierManagement — experience `documentExpiryWatch`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A supplier is only as compliant as its next certificate to expire. This page is a **watch
list of supplier documents, ranked by their expiry date**: what has already expired at the
top, then what expires soon, then the rest — each line naming the supplier, the document
and the date, with renewal acted on right there. Where `directoryCompliance` examines one
supplier at a time at a desk, and `onboardingPipeline` moves suppliers through habilitation
stages, this page is organized by the calendar and answers "which documents lapse, and
when?". The supplier is context; the document and its date are the subject. Target: no
document expires unnoticed, and each renewal is registered from the line that warned.

## How to instantiate from the defs (the slots)

- **The watch list comes from the documents the contract declares**: a documents query, or
  the document fields on each supplier (type, number, expiry date). One line per document:
  the expiry date first and loudest, then the time left in words ("expired 4 days ago", "in
  12 days"), the document type, and the supplier's name.
- **Time bands come from the date alone**: "Expired", "Expires within N days", "Later". N is
  the contract's warning window when declared; otherwise the bands are "Expired", "This
  month", "Later" — calendar facts, never an invented threshold. Each band shows its count.
- **The headline is one sentence**: "3 documents expired, 5 expire this month". Text.
- **Renewal opens in place under the line**: the inputs of the renewal or document-update
  command the contract declares — new expiry date, number, file when it accepts one —
  prefilled with the document type. On success the line moves to its new band.
- **The supplier's standing** shows as a quiet chip on the line when the contract exposes
  it; block, when declared, stays a quiet secondary action on the line for an expired
  document, confirmed naming the supplier — never automatic.
- **Without document dates**, the page cannot rank by time: it says once, quietly, that the
  contract carries no expiry dates, and lists the documents the contract flags as missing or
  pending, grouped by supplier, with the same in-place update.
- Declared filters (document type, supplier, standing) form one quiet bar above the list.
- Session/context inputs never render as fields; ids are never typed — the line IS the
  document. Never invent document types, warning windows or renewal rules.

## Attention hierarchy (the spine of this experience)

1. The headline — how many expired, how many soon.
2. The "Expired" band, oldest expiry first.
3. The next band, soonest first.
4. "Later", filters and the supplier chips — quiet.

## Loops

- Read the top expired line → contact the supplier (outside the page) → open renewal →
  enter the new date → save → the line leaves the band and lands in "Later", the headline
  updates → next line.
- A supplier with several expiring documents: filter by that supplier, renew each from its
  line, clear the filter.
- When nothing is expired or due soon, the page says so calmly — one sentence ("No document
  expires this month") — with the "Later" band still below.

## Feedback & feedforward

- The new expiry date must be later than the current one and than today when the contract
  validates it; validation at the field, in words, never a toast.
- The renewal button stays disabled until the inputs are valid; its label names the outcome
  ("Renew certificate").
- A failed renewal keeps the line open with the typed values, the reason above the button,
  normal body color, with retry.
- Success is the line's move: it leaves its band with a brief inline note of the new date.

## Disciplines (transversal — always)

- The page name appears once, in the header; band titles are time phrases, and **no
  heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: the supplier name links to the supplier
  when a route is declared; the renewal button acts.
- Alarm color only on expired dates; "soon" uses a warning tone; "Later" is neutral.
- Bands never reorder; an empty band shows its title with "0".

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
Everything above holds: documents ranked by expiry, time bands with counts, the headline, renewal
from the line, the degraded state and the disciplines. On a phone the bands become one column read
from the top, so the order of urgency is the order of scrolling. Where this section and the layout
described above differ, this section wins on mobile.

- **The headline and the "Expired" band own the first screen**; the other bands follow, each
  titled with its count.
- **Each line is a compact block**: the time left in words first and loudest, the date small
  beside it; then the document type and the supplier's name.
- **Renewal opens in place under the line**, one field per line, a date picker for the expiry,
  the renew button full width at the block's foot where the thumb reaches.
- **Filters collapse into one quiet summary line** that opens a filter view of its own, with back.
- **After a renewal** the block leaves its band where the eye can follow; the scroll place holds.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the headline, 2. the expired lines, 3. the renewal of the open
line, 4. the later bands.

Forbidden on mobile:
- a table of documents, or any horizontal scroll;
- renewal in a separate view that loses the line's place;
- swipe as the only way to renew;
- the bands as tabs that hide the expired count.

## Forbidden

- A supplier directory with a deep fiscal panel as the page's spine — that is the
  `directoryCompliance` experience, not this one.
- Stage columns of suppliers moved through habilitation — that is `onboardingPipeline`;
  here the calendar orders the page.
- Ordering by supplier name, or putting healthy documents first.
- Blocking a supplier automatically because a document expired.
- Invented warning windows, document types or risk scores.
- Typed ids for anything the defs marks as selection/session/context.

## Signals (how to check the generated page)

1. **S1 documents, not suppliers:** each line of the main list is a document, with its type and
   the supplier as context.
2. **S2 urgency bands:** lines are grouped in titled bands, each with a count, the most urgent
   band first — never an alphabetical directory of suppliers.
3. **S3 renewal in place:** the renewal form opens under its line, not in a side panel or
   another page.
4. **S4 headline:** one sentence above the list states how many documents need attention.
