# customerManagement — experience `directoryProfile` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A directory with a strong finder: search and the customer list dominate one side, and the
selected customer's profile fills the other — identity, commercial data, contacts and
history stacked as calm vertical blocks, read top to bottom. The list is the front door;
the profile is the room. Where `relationshipHub` makes one customer's world the whole
page, here **finding is as important as reading**: the directory never yields its side of
the stage. Target: from a half-remembered name to the right customer's phone number in
seconds.

## How to instantiate from the defs (the slots)

- **The finder comes from the collection query and its declared search input**: search on
  top, then the list — name loudest, one secondary fact per row (status, city, whatever
  the contract exposes) to disambiguate namesakes. Paginated as the contract paginates.
- **The profile is a stack of labeled blocks from the selected customer's fields**, in
  this order when present: identity (name, status), commercial data (documents, terms),
  contact details, then related collections — contacts as a compact sublist, history/
  activity as a reverse-chronological list, each entry showing what and when. Only
  collections the contract actually relates; never invent a "timeline" from nothing.
- **Edit is an explicit switch** on the profile: the update command's inputs, prefilled,
  Save/Cancel; the finder stays usable meanwhile.
- **Creation happens in the profile area**: a single "New" action above the list opens
  the create command's inputs; on success the new customer joins the list and becomes
  the selection.
- **Deactivation is a quiet action** at the profile's foot, labeled by outcome, one plain
  confirmation naming the customer.
- Session/context inputs never render as fields; ids are never typed — the selection IS
  the id. Never invent scores, values or segments the contract does not declare.

## Attention hierarchy (the spine of this experience)

1. The profile of the selected customer — the answer.
2. Search and the list — the question, always available.
3. Related sublists (contacts, history) — depth inside the profile, below the facts.
4. Lifecycle actions — present, subdued, last.

## Loops

- Type a fragment → the list narrows → select → read the profile → act (call, correct,
  deactivate) → search the next name. Selection never clears the search.
- Correcting data: switch to edit → Save → the profile returns to read mode with the
  saved values, the list row updated in place. No redirect, no lost scroll.

## Feedback & feedforward

- Required fields visibly required before any mistake; validation at the field, in words,
  at commit time — never a toast.
- Command failure renders inside the profile, above its button, normal body color, with
  retry; the finder stays untouched.
- Save stays disabled until valid and changed; its label names the outcome ("Save
  customer").
- Success is local: inline confirmation on the profile, updated row in the list. No
  page-level banners, no redirects.

## Disciplines (transversal — always)

- The page name appears once, in the header; the profile's title is the customer's name,
  and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: rows select, buttons commit; a phone or
  email rendered as a link is a link and nothing else.
- Link color only on real links; history entries and captions stay muted.

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
Everything above holds: the strong finder, the profile as calm stacked blocks, the loops, feedback
and disciplines. Only the shape changes, because the directory and the profile can no longer sit
side by side. Where this section and the layout described above differ, this section wins on
mobile.

- **Side by side becomes a sequence on the same page**: directory → profile. The profile is a
  view of its own with back, inside this page — never another page. "The directory never yields
  its side" becomes "the finder is one tap away, with the search exactly as typed".
- **The directory is the home view, and search dominates it**: a large search field at the top,
  then one customer per row — name loudest, one secondary fact under it to tell namesakes apart.
  More rows load at the end. No table, no horizontal scroll.
- **The profile stacks its blocks in one column**, in the same order: identity, commercial data,
  contact details, then contacts and history as compact lists. Blocks stack and scroll; no tabs.
- **Contact facts are tappable**: a phone opens the call, an email opens the mail app — each a
  real link and nothing else, large enough to tap.
- **Edit is still an explicit switch** into the update form, one field per line, Save and Cancel
  at the bottom where the thumb reaches. Creating a customer is its own view, opened from the
  directory; after it commits, the new profile opens.
- **Back** returns to the directory with the search, scroll and the row updated. Deactivation
  stays at the foot of the profile, quiet and confirmed.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the search (or, in the profile, identity and contact facts), 2. the
list (or the rest of the profile), 3. the way back.

Forbidden on mobile:
- a drawer or sheet over part of the list to show the profile;
- clearing the search or the scroll after visiting a profile;
- tabs that split the profile, or multi-column forms;
- phone or email shown as plain text when the contract provides them.

## Forbidden

- A highlight band of the customer's value/status crowning the page with related lists as
  its center — that is the `relationshipHub` experience, not this one.
- Navigating to another page for the profile; list and profile share this stage.
- Collapsing the finder to a mere breadcrumb or hiding it while reading a profile.
- Tabs that fragment the profile into hidden panes; blocks stack and scroll.
- Typed ids for anything the defs marks as selection/session/context.
- Invented relationship metrics, sentiment labels or activity placeholders — an empty
  history says once, quietly, what will appear there.
