# contentLanding — experience `campaignPage` (page11)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how a campaign / presentation page looks and reads. Where the two seem to conflict, the
> defs wins on DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

This is a **reading surface**, not a management grid. A visitor should understand the
offer in one screen: a strong hero, readable prose blocks, images as evidence, a
counter as a quiet proof point, and a single CTA that lands on the hosted form. Density
is article-like — generous spacing, a clear type hierarchy — never a compact CRUD table.

## How to instantiate from the defs (content organisms)

The workspace arrives with organisms of type `content` using this closed vocabulary
(do not invent new roles):

- **hero / banner**: one prominent title + subtitle from the organism/intention msg
  keys. No data binding. This owns the top of the page.
- **richText**: a paragraph / prose block from its msg key. Comfortable measure, not a
  caption under a table.
- **imageSet / hero image with NO data field**: an empty placeholder box (aspect-ratio
  container, neutral surface token). **Never invent an image URL.**
- **ctaLink**: one navigation control that leads to the hosted command form on this
  page (or the shared navigation action when the contract provides it). Never fabricate
  a route.
- **showcase**: a card grid fed by its query state — the only collection surface this
  experience allows on the first screen.
- Hosted **form** (command organism) and **counter / summary** (usage `summary` or a
  numeric highlight): the form is the conversion; the counter is a proof point near
  the hero or CTA, not a KPI dashboard.

DATA-BOUND IMAGES: a field whose name ends in `imageUrl` / `photoUrl` / `logoUrl` /
`avatarUrl` / `pictureUrl` / `thumbnailUrl` MUST render as a real `img` bound to that
field. That is not inventing a URL — the BFF already has the value. Keep an empty
branch when the value is missing.

## Attention hierarchy

1. Hero (title, one supporting line).
2. Counter / proof, if the contract has one.
3. Prose, then images as evidence.
4. CTA → hosted form (the form is a destination, not a second page).
5. Showcase / hosted tiles, demoted below the offer.

## House rules the design model most often violates

- **Tokens by role, never a hardcoded palette.** Color, type and space come from the
  design-system tokens in context. No hex, no `rgb()`, no `style="color:…"`.
- **Every visible string is `this.msg[...]`.** Never a Portuguese/English literal in the
  template. If a heading is missing a key, declare it in the i18n block of the skeleton.
- **No Shadow DOM.** `StateLitElement` does not use it. Do not emit `static styles =
  css\`...\``. Layout is Tailwind utilities + tokens.
- **A form lives inside `<Scene>` when the page has a scenario.** Do not render a naked
  form beside the hero.
- Contract-internal vocabulary (displayHint, intent id, state key, bff name) is never
  visible text.

## Loops

- Read the offer → act on the CTA → fill the hosted form on the same page → stay.
- There is no "list → select → edit" loop on this page. If a hosted tile or form is
  present, it is the conversion of the landing, not a catalogue.

## Feedback & feedforward

- Loading: skeleton the hero band and the form region; never a spinner over the whole
  page.
- A failed command reports next to the submit control, in words, dismissible.
- Empty image placeholders stay; they do not collapse the layout.

## Forbidden

- Management grids, filter bars, page-size inputs, or a dense table as the first screen.
- Invented image URLs, stock photos, or `https://picsum` / `placehold.co` / similar.
- Hardcoded colors or a second type ramp besides the design-system tokens.
- Visible literals (any language) instead of `this.msg`.
- Shadow DOM, `static styles`, or a form outside `<Scene>` when a scenario exists.
- Steps / wizards / "act 1, act 2" — this page has no sequence.
