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

## Forbidden

- Poster-style full-bleed hero (that is `campaignPage` / page11).
- Management grids, filter bars, page-size inputs.
- Invented image URLs. Hardcoded colors. Visible literals.
- Form outside `<Scene>` when a scenario exists. Steps / wizards.
