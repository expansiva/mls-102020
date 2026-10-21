# contentLanding — experience `editorialLongRead` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract; this skill is the flavor. Defs wins on DATA, this skill wins on BEHAVIOR.

## Concept

Same category as `campaignPage`, different pace: an **editorial long-read**. The hero is
quieter (title as an article headline, not a poster), richText blocks carry the
argument, images punctuate the prose, and the CTA arrives after the reader has been
convinced — still on this page, still leading to the hosted form. It remains a reading
surface, never a management grid.

## How to instantiate from the defs (content organisms)

Closed vocabulary only: `hero`/`banner`, `richText`, `imageSet`, `ctaLink`, `showcase`,
plus the hosted form and a counter as a mid-article proof (not a dashboard).

- Hero is a headline + dek, left-aligned, no overlay, no full-bleed poster.
- richText blocks stack with generous vertical rhythm; one column, readable measure.
- imageSet without a data-bound URL is a placeholder box — **never invent a URL**.
- A field `*ImageUrl` renders a real `img`. Empty branch when missing.
- CTA is a text-forward link/button after the last prose block, then the hosted form.
- Counter sits in the flow as a pull-quote of a number, not a KPI strip of many tiles.

## Attention hierarchy

1. Headline (hero).
2. Argument (richText, in order).
3. Evidence (imageSet / showcase).
4. Proof number (counter), then CTA → form.

## House rules the design model most often violates

- Tokens by role, never a hardcoded palette.
- Every visible string is `this.msg[...]`.
- No Shadow DOM, no `static styles = css\`...\``.
- Form inside `<Scene>` when a scenario exists.
- No contract-internal vocabulary as visible text.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the editorial pace, the quiet headline, the argument in order, the closed
content vocabulary, the house rules and the CTA after the argument. A long-read is already one
column; on a phone what matters is a measure that stays comfortable and an argument that is never
interrupted by the offer. Where this section and the layout described above differ, this section
wins on mobile.

- **The headline and dek stay left-aligned**, scaled down, still an article headline and never a
  poster; nothing full-bleed above them.
- **The prose is one column** with the page gutters, body text at its normal reading size and
  generous line height; blocks keep their vertical rhythm.
- **Images run full width** of the column, where they punctuate the prose; placeholders keep
  their aspect ratio.
- **The counter stays a pull-quote** of one number, full width, in the flow.
- **The CTA still comes after the last prose block**, as a full-width control, with the hosted
  form right below it: one column of full-width fields, the submit at the bottom of the form,
  inside `<Scene>` when a scenario exists. The showcase stacks as one column of cards.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the headline, 2. the argument, 3. the evidence, 4. the proof
number, then the CTA and the form.

Forbidden on mobile:
- a sticky, floating or early CTA interrupting the argument;
- multi-column text or multi-column forms;
- body text shrunk below its reading size;
- a carousel, or anything that scrolls sideways.

## Forbidden

- Poster-style full-bleed hero (that is `campaignPage` / page11).
- Management grids, filter bars, page-size inputs.
- Invented image URLs. Hardcoded colors. Visible literals.
- Form outside `<Scene>` when a scenario exists. Steps / wizards.
