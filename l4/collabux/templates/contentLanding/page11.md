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

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the reading surface, the closed content vocabulary, the attention
hierarchy, the house rules and the single CTA leading to the hosted form. Only the scale changes:
the offer must still be understood at the top, in a column a thumb scrolls. Where this section and
the layout described above differ, this section wins on mobile.

- **The hero scales down but keeps its role**: title and one supporting line, full width, still
  the largest type on the page and still owning the top. A hero image becomes full width with
  its aspect ratio kept; text is never shrunk to sit over it.
- **The counter sits right under the hero** as one quiet proof line, not a tile.
- **Prose is one column** with the page gutters, body text at its normal reading size and
  comfortable line height; images and placeholders run full width between the blocks, keeping
  their aspect ratio.
- **The single CTA is a full-width control** after the opening prose, and the hosted form
  follows it on the same page: one column of full-width fields, the submit at the bottom of the
  form, still inside `<Scene>` when a scenario exists.
- **The showcase stacks** as one column of cards, below the offer and the form.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the hero, 2. the counter, 3. the prose and images, 4. the CTA and
the hosted form, 5. the showcase.

Forbidden on mobile:
- a carousel, or a showcase or image strip that scrolls sideways;
- multi-column forms or multi-column prose;
- body text shrunk below its reading size to fit more;
- a second, sticky CTA duplicating the one in the flow.

## Forbidden

- Management grids, filter bars, page-size inputs, or a dense table as the first screen.
- Invented image URLs, stock photos, or `https://picsum` / `placehold.co` / similar.
- Hardcoded colors or a second type ramp besides the design-system tokens.
- Visible literals (any language) instead of `this.msg`.
- Shadow DOM, `static styles`, or a form outside `<Scene>` when a scenario exists.
- Steps / wizards / "act 1, act 2" — this page has no sequence.
