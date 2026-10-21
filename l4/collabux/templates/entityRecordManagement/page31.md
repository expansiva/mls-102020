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

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the pinned identity, one subject per tab, the per-section saves, the
transitions in the header, create mode and the disciplines. On a phone the header and the tabs
must take little height, so the active subject still owns the screen. Where this section and the
layout described above differ, this section wins on mobile.

- **The identity header becomes compact but stays pinned**: at the top of the page it shows the
  name, the status chip, the few decisive facts and the allowed transitions; once the user scrolls,
  it shrinks to one line of name and status that never scrolls away. Tapping that line brings the
  full header, with its transitions, back into view. Transitions never move into a tab or a bar.
- **The tabs stay a row of tabs, pinned under the header** — the one horizontal scroll this page
  allows. When the subjects do not fit, the row scrolls sideways, the current tab is always brought
  into view and marked, a dirty tab keeps its quiet mark, and tabs disabled in create mode stay in
  the row, muted, showing their reason when tapped.
- **The active tab's section form** fills the rest: one field per line, label above the field,
  pickers for selections, the matching keyboard for numbers and dates.
- **The section's save sits in a bar fixed at the bottom**, naming the subject ("Save billing
  details"), committing only that tab's fields, disabled until the section is dirty and valid. It
  changes with the tab; it is never a save for the whole record.
- **Leaving a subject with unsaved changes asks once**: switching tab or going back asks one plain
  confirm naming the subject — never silent loss, never auto-save.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the pinned identity line, 2. the active section's form, 3. its save,
4. the row of tabs.

Forbidden on mobile:
- any horizontal scroll other than the row of tabs;
- all subjects stacked in one long column with one save — that is `focusedRecordForm`;
- a header that scrolls away, or a header so tall it leaves no room for the section;
- a save bar that commits more than the active tab, or that holds transitions;
- switching subject silently with unsaved changes.

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
