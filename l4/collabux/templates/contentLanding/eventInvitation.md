# contentLanding — experience `eventInvitation`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

An **invitation to something that happens at a time and a place**: the event's name, then the
when and the where as facts the eye finds in one second, then what happens there (the agenda),
and registration — the hosted form — as the single action. The question this page answers is
**"when and where is it, what will happen, and how do I get in?"**. Where `campaignPage` sells an
offer, `editorialLongRead` builds an argument, and `offerPoster` shouts one claim and one number,
this experience is organized around a date: the facts band is its spine and everything else hangs
from it. Target: public pages for meetings, workshops, launches, assemblies and open days.

## How to instantiate from the defs (content organisms)

Closed vocabulary only: `hero`/`banner`, `richText`, `imageSet`, `ctaLink`, `showcase`, plus the
hosted form and a counter. Do not invent new roles.

- **Hero**: the event's name and one supporting line from its msg keys.
- **The facts band sits directly under the hero**: date, time, place (and format, online or in
  person) as short labeled facts, each from a contract field or msg key. Only the facts the
  contract carries render; a missing one leaves no empty label. **Never invent a date, a time or
  an address.**
- **The CTA lives in the facts band**: one control labeled by the outcome ("Register"), leading to
  the hosted form further down this page.
- **The agenda** comes from a `showcase` whose query returns sessions (time, title, speaker as the
  contract names them) — rendered as a time-ordered list, time first. Without such a query, the
  `richText` blocks that describe the program render in order as "what happens". Never a grid of
  cards for sessions that have times.
- **The counter**, when present, is one line near the CTA (registered people, or seats left when
  the contract declares it) — never a KPI strip.
- **imageSet** without a data-bound URL is a placeholder box — **never invent a URL**; a venue or
  speaker field ending in `imageUrl` / `photoUrl` renders a real `img`, empty branch when missing.
- **The hosted form closes the page**, under the agenda. When the contract declares a state that
  closes registration, the form gives way to one plain sentence saying so; otherwise it is always
  open.

## Attention hierarchy (the spine of this experience)

1. The facts band — when, where — with the CTA beside it.
2. The event's name (hero).
3. The agenda, in time order.
4. The hosted registration form; any further prose or images after it.

## Loops

- See the name → read the date and place → decide → act on the CTA → land on the form on the same
  page → register → see the confirmation in place.
- Or: read the agenda first → reach the form directly below it → register. Both paths end in the
  same single form; there is no second action.

## Feedback & feedforward

- The CTA names the outcome and scrolls to the form; the form's first field takes focus.
- Loading skeletons the hero and the facts band first — the facts are the first thing worth
  waiting for; never a spinner over the whole page.
- A failed submit reports next to the submit control, in words, dismissible, keeping what was
  typed.
- Success replaces the form with a confirmation that repeats the facts (date, time, place) in
  words, so the visitor leaves knowing where to be.

## Disciplines (transversal — always)

- Tokens by role, never a hardcoded palette: no hex, no `rgb()`, no `style="color:…"`.
- Every visible string is `this.msg[...]`; no literal in any language.
- No Shadow DOM, no `static styles = css\`...\``; a form lives inside `<Scene>` when the page has
  a scenario.
- The event's name appears once, in the hero, and **no heading anywhere repeats the label of a
  button or link near it** (the form's heading is not "Register" when the CTA says so).
- A control is navigation OR action, never both: the CTA navigates to the form; only the submit
  acts.
- Dates and times are formatted for the page's locale, never raw values.
- Pagination and sorting parameters never render as fields; contract-internal vocabulary
  (displayHint values, intent ids, state keys, bff names) is never visible text.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the facts band as the spine, facts only from the contract, the agenda in
time order, registration as the single action, the closed vocabulary and the house rules. On a
phone the facts and the CTA must share the first screen. Where this section and the layout
described above differ, this section wins on mobile.

- **The first screen holds the name, the facts and the CTA**: the hero scales down, the facts
  stack as short lines (date, time, place), the CTA full width under them.
- **A hero image yields to the facts**: full width, sized so it never pushes the facts or the CTA
  out of the first screen.
- **The agenda is one column of rows**: the time on its own line or at the left, title and speaker
  wrapping below, never truncated.
- **The hosted form** follows the agenda: one column of full-width fields, the submit at the bottom
  of the form, inside `<Scene>` when a scenario exists.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the facts and the CTA, 2. the event's name, 3. the agenda, 4. the
form.

Forbidden on mobile:
- facts or CTA below the first screen;
- an agenda as a table or a timeline that scrolls sideways, or anything that scrolls sideways;
- a sticky CTA duplicating the one in the facts band;
- multi-column forms.

## Forbidden

- A poster of one claim and one number — that is `offerPoster`; here the date and place lead.
- A long argument before the facts — that is `editorialLongRead`.
- A full-bleed sales hero with the facts buried below it — that is `campaignPage`.
- Invented dates, times, addresses, speakers, seat counts or deadlines.
- A second action beside registration; management grids, filters, page-size inputs.
- Invented image URLs, hardcoded colors, visible literals, forms outside `<Scene>`, steps.

## Signals (how to check the generated page)

1. **S1 Facts band:** right under the hero there is a compact group of labeled event facts, with
   the CTA in or beside it.
2. **S2 Single action:** the page has exactly one CTA and one hosted form, the CTA leading to it.
3. **S3 Facts first:** the facts band comes before any prose, agenda, image or showcase in the
   page order.
4. **S4 Form last:** the hosted form sits after the agenda on the same page, never on another page.
