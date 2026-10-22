# readOnlyDetailPortal — experience `questionAnswerSheet`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The record is answered, not displayed: **a short sheet of plain questions the stakeholder would
ask, each followed by its answer in one sentence with the value inside it** — "How much do I owe?
R$ 1,240.00, due on 10 April." The person never has to know which field means what; the page
speaks their question back to them and answers it. Where `summaryFirstStatement` leads with one
giant value and `printableDocument` renders the formal sheet, this page answers **"what do I
want to know about this, in my own words?"** — several questions, each settled in a line. Zero
write actions. Target: an external or occasional stakeholder unfamiliar with the domain's
vocabulary — a client, a tenant, a patient, a supplier.

## How to instantiate from the defs (the slots)

- **Each question groups fields the contract declares**: amount and due date become "How much do
  I owe, and by when?"; status and its date become "Where does it stand?"; parties become "Who is
  this from?"; line items become "What is it for?". Questions are written in the stakeholder's
  plain language, in the order they would ask: money or status first, parties and details after,
  notes last.
- **A question exists only if the contract has its answer**: never a question answered with
  "not available", never a question whose answer requires a field the contract does not declare.
  Five to eight questions; fewer real answers mean fewer questions.
- **The answer is one sentence**, the decisive value emphasized (weight, tabular figures, unit or
  currency as declared) inside it, followed when needed by a quiet supporting line ("Includes
  R$ 40.00 late fee."). A value the contract flags (overdue, rejected) is in alarm color, only it.
- **List-shaped answers** (line items, events) are a short list under the answer sentence, the
  sentence first summarizing it ("Three items: ..."); a long list shows the first five and one
  "show all" control that expands in place.
- **Reference identifiers** (number, period, issuer) answer the last question ("Which document is
  this?") rather than sitting in a header block.
- **Actions only as declared** (acknowledge, print): one contextual control after the questions,
  labeled with its outcome. No command in the contract means no buttons.

## Attention hierarchy (the spine of this experience)

1. The first question and its answer — the thing they came for.
2. The following questions, in the stakeholder's order.
3. List-shaped answers, expanded only on request.
4. The reference question and declared actions.

## Loops

- Open → read the first answer → scan the questions for the one on their mind → read its answer
  → leave. The page succeeds when no question needs a second page.
- Each question can be linked directly (an anchor per question), so a message can point to "Where
  does it stand?" and land on its answer.

## Feedback & feedforward

- Loading: question lines appear first with answer skeletons under them — the person sees what
  will be answered before the values arrive.
- If the record fails, one sentence in normal body color with retry where the first answer would be.
- Grammar follows the values: singular and plural agree, dates read naturally, zero amounts are
  stated ("You owe nothing.") rather than hidden.
- Acknowledge (when declared) is disabled until loaded; success replaces it with a quiet
  confirmation and the moment it happened.

## Disciplines (transversal — always)

- The page name appears once, in the header; questions are the only headings, and **no heading
  anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both; passive text is ink or muted, link color only on
  real links.
- Every number carries its unit or currency as the contract declares it.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names, field
  labels as jargon) is never rendered as visible text — questions and answers speak plainly.
- Never invent advice, consequences or legal statements ("You may be charged interest") the
  contract does not declare.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: plain questions with one-sentence answers, the stakeholder's order, only
answerable questions, zero writes, feedback and disciplines. A sheet of questions already fits a
phone; only reading size and list answers change. Where this section and the layout described
above differ, this section wins on mobile.

- **The first question and its answer fill the top of the first screen**, the decisive value
  large enough to read without zoom and never truncated.
- **Questions stack one after another**, each answer under its question at full reading width;
  never an accordion that hides answers behind the questions.
- **List-shaped answers** become list rows: description on the left, wrapping; value
  right-aligned, tabular; first five, then "show all" expanding in place.
- **A declared action** is one full-width control after the last question, where the thumb reaches.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the first question and answer, 2. the following questions,
3. list answers, 4. the reference question.

Forbidden on mobile:
- an accordion of collapsed questions;
- tables or any horizontal scroll;
- a sticky action bar over the answers;
- answers truncated behind "read more".

## Forbidden

- One giant headline value with a breakdown under it — that is the `summaryFirstStatement`
  experience, not this one.
- A formal document sheet with letterhead, tabulated body and footer — that is the
  `printableDocument` experience, not this one.
- Label and value pairs posing as questions; questions without answers in the contract.
- A FAQ accordion, a search box or a chat-like interface; questions the reader must click to see.
- Any write affordance, editable-looking field, or action beyond the declared commands.
- Tabs, filters, pagination or steps — the sheet is read top to bottom.

## Signals (how to check the generated page)

1. **S1 Questions as headings:** the content is organized under plain-language questions ending
   with "?", not under field labels or section names.
2. **S2 Sentence answers:** each question is followed by a sentence containing its value, visible
   without any interaction.
3. **S3 Only answerable:** no question renders with an empty or "not available" answer.
4. **S4 No writes:** no form fields or edit controls; at most the declared acknowledge/print.
