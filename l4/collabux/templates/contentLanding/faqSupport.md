# contentLanding — experience `faqSupport`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A landing that **convinces by answering doubts**: a short hero, then the questions a visitor has
before acting, each one opening its answer in place, and the single action — the CTA leading to
the hosted form — waiting right after the last question. The question this page answers is
**"what do I need to know before I sign up, and where do I go if my doubt is not here?"**. Where
`campaignPage` sells the offer in one strong screen, `editorialLongRead` argues it in continuous
prose, and `offerPoster` compresses it to one claim and one number, this experience is read
selectively: the visitor scans the questions, opens only the ones that matter, and acts. Target:
public pages for programs, services, enrollments and campaigns where hesitation, not interest, is
what blocks the conversion.

## How to instantiate from the defs (content organisms)

Closed vocabulary only: `hero`/`banner`, `richText`, `imageSet`, `ctaLink`, `showcase`, plus the
hosted form and a counter. Do not invent new roles.

- **Hero** is compact: title and one supporting line from its msg keys — it frames the topic, it
  does not try to sell it. Nothing full-bleed.
- **The questions come only from the contract**: each `richText` block whose msg carries a
  question and its answer becomes one entry; a `showcase` whose query returns items with a
  question-like and an answer-like field becomes the list of entries, in the query's order.
  **Never write a question or an answer the contract does not carry.** When the content is not
  shaped as questions, the blocks render as short answer sections under their own headings.
- **Groups**: when entries carry a category (a field, or separate blocks with their own headings),
  they are grouped under those headings; otherwise one flat list.
- **The counter**, when present, is one quiet proof line under the hero ("1,240 people already
  joined", from the contract) — never a KPI strip.
- **imageSet** without a data-bound URL is a placeholder box — **never invent a URL**; images sit
  beside or under the hero, never inside the answers. A field ending in `imageUrl` / `photoUrl` /
  `logoUrl` renders a real `img`, with an empty branch when missing.
- **ctaLink + hosted form** close the page: the CTA right after the last entry, labeled by the
  outcome, then the form on the same page.

## Attention hierarchy (the spine of this experience)

1. The list of questions, each readable in one line.
2. The answer of the entry the visitor opened.
3. The CTA after the last question → the hosted form.
4. Hero and proof line, as a frame above it all.

## Loops

- Scan the questions → open one → read the answer in place → open the next or close it → reach
  the end of the list → act on the CTA → fill the hosted form on the same page → stay.
- There is no "list → select → edit" loop, no search over a database, no second page: the
  entries are content, and the only action is the form.

## Feedback & feedforward

- Each entry is a disclosure: the question is the control, with a clear open/closed mark; opening
  one does not close the others unless the list is long, and the opened state is visible.
- Every answer exists in the page from the start (only visually collapsed), so the browser's
  find and screen readers reach it.
- Loading skeletons the hero band and a few question lines; never a spinner over the whole page.
- A failed submit reports next to the submit control, in words, dismissible; success is stated
  in place of the form, in plain words.

## Disciplines (transversal — always)

- Tokens by role, never a hardcoded palette: no hex, no `rgb()`, no `style="color:…"`.
- Every visible string is `this.msg[...]`; no literal in any language.
- No Shadow DOM, no `static styles = css\`...\``; a form lives inside `<Scene>` when the page has
  a scenario.
- The page name appears once, in the hero; questions are the entries' headings, and **no heading
  anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: questions open and close; the CTA navigates to
  the form; only the submit acts.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) never render as fields; a long
  showcase of entries shows them all or reveals more inline.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is never
  visible text.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the compact hero, entries only from the contract, answers opening in
place, the single CTA after the last question, the closed vocabulary and the house rules. On a
phone the questions must stay scannable, so answers open one at a time. Where this section and the
layout described above differ, this section wins on mobile.

- **The hero is two lines at the top**: title and supporting line, the proof line under it;
  images follow full width with their aspect ratio kept, or move below the questions.
- **Each question is a full-width row** with its open/closed mark at the right; long questions
  wrap, never truncate.
- **Opening a question closes the one that was open**, and the opened question stays at the top
  of the screen so its answer is read from its start.
- **Group headings** stay as plain headings in the flow, never tabs or chips.
- **The CTA is one full-width control after the last question**, the hosted form right below it:
  one column of full-width fields, the submit at the bottom of the form, inside `<Scene>` when a
  scenario exists.
- **Touch**: every target is at least 44px high, question rows included; nothing depends on hover.

Mobile attention hierarchy: 1. the questions, 2. the opened answer, 3. the CTA and the hosted
form.

Forbidden on mobile:
- group tabs or chips that scroll sideways, or anything that scrolls sideways;
- truncated questions;
- a sticky or floating CTA over the answers;
- multi-column forms.

## Forbidden

- A poster hero owning the first screen — that is `campaignPage` / `offerPoster`.
- The content as continuous long-form prose — that is `editorialLongRead`.
- Invented questions, answers, contact channels or support links the contract does not carry.
- A CTA inside each answer, or more than one competing CTA on the page.
- A search over records, filter bars, management grids, page-size inputs.
- Invented image URLs, hardcoded colors, visible literals, forms outside `<Scene>`, steps.

## Signals (how to check the generated page)

1. **S1 Disclosure entries:** the main content is a list of question controls, each opening its
   answer in place, without navigating.
2. **S2 Answers present:** every answer is in the rendered markup from the start, collapsed, not
   fetched on open.
3. **S3 One CTA at the end:** exactly one CTA, placed after the last entry, leading to the hosted
   form on the same page.
4. **S4 Compact hero:** the hero is title plus one line, with no full-bleed poster.

## Molecule rules

```json
{
  "axes": {
    "expand": "accordion",
    "accordionMode": "multiple",
    "feedback": "inline"
  },
  "groups": { "prefer": ["groupExpandContent"], "forbid": ["groupSearchContent", "groupViewTable", "groupNavigateSteps"] }
}
```
