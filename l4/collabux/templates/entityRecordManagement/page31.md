# entityRecordManagement — experience `recordPageTabs` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (commands, fields, transitions — never contradict it); this skill is the
> flavor: how the page moves, focuses and feels. Where the two seem to conflict, the defs
> wins on DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The record page for a RICH record — many fields, several subjects, edited by people who
come back to it for months. A **pinned identity header** keeps the record's name, status
and decisive facts always in view; below it, **one tab per subject** holds a section-sized
form with its own save. The user works one subject at a time without losing sight of which
record they are inside. Where `focusedRecordForm` is one continuous column with one save,
this is a stable building with labeled rooms — each room tidied and saved on its own.

## How to instantiate from the defs (the slots)

- **The identity header comes from the record's identity and status fields**: name,
  status chip, and at most a few decisive saved facts (the contract's key values). The
  header is read-only and pinned; it never scrolls away and never repeats tab content
  beyond identity.
- **Each subject group of the command's inputs becomes one tab**: subject name as the tab
  label, in business words. Tab order follows the declared order; the first tab is the
  one that identifies the record.
- **Each tab is a self-contained section form** with its own save that commits ONLY that
  tab's fields; its label names the subject ("Save billing details").
- **Status transitions live in the header** as contextual buttons, present only when the
  current status allows them, confirming consequences in plain words. Transitions belong
  to the record, not to any tab.
- **Create mode**: the first tab opens editable; tabs whose fields require the record to
  exist stay visibly disabled with a short reason, and wake once the first save creates
  the record. Never fake-enable a tab that cannot commit.
- **Selection inputs are pickers; session/context inputs never render as fields** — a
  quiet caption at most; ids are never typed.

## Attention hierarchy (the spine of this experience)

1. Identity header — which record, what state, always.
2. The active tab's section form.
3. That section's save button.
4. The tab rail — a map of subjects, current one marked.

## Loops

- Open → the header answers "am I in the right record?" → pick the subject tab → edit →
  save the section → the header's facts refresh if they came from that section.
- Switching away from a dirty tab asks one plain confirm naming the subject ("Discard
  changes to Billing details?") — never silent loss, never auto-save on switch.
- A transition from the header updates the status chip in place; tabs stay put.

## Feedback & feedforward

- Validation is field-level, at the field, at commit time — never a toast.
- Each section's save stays disabled until that section is dirty and valid; required
  fields are visibly required before any mistake is made.
- Section failure renders inside the failing tab, above its save, in normal body color,
  with retry; other tabs and the header stay untouched.
- Success is local to the section — a brief inline confirmation; no page banners.
- A dirty tab is quietly marked on the tab rail so pending work is visible from anywhere.

## Disciplines (transversal — always)

- The page name appears once. Tab labels never repeat the page title, a tab never repeats
  its own save label as a heading, and **no heading anywhere repeats the label of a
  button or link near it**.
- A control is navigation OR action, never both: tabs switch subjects (navigation within
  the page), saves commit, transitions transition — no control does two of these.
- Link color only on real links; tab labels, captions and the header's facts are never
  blue.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- One continuous column with a single global save for the whole record — that is the
  `focusedRecordForm` experience, not this one.
- A save that silently commits fields from other tabs, or a global save floating over
  the tab shell.
- Tabs as links to other pages, or a tab count padded with subjects the contract does
  not declare.
- Transition buttons inside tabs, or transitions available when the contract's current
  status forbids them.
- Typed ids for anything the defs marks as selection/session/context.
- Blocking success dialogs, page-level toasts carrying validation, redirects after save.
