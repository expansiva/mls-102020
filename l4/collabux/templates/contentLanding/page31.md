# contentLanding — experience `offerPoster` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract; this skill is the flavor. Defs wins on DATA, this skill wins on BEHAVIOR.

## Concept

Same category as `campaignPage`, different emphasis: a **poster**. One screen, one
claim, one number, one action. The hero owns most of the viewport; prose is short;
the CTA is impossible to miss and leads to the hosted form on this page. Still a
reading/offer surface, never a management grid.

## How to instantiate from the defs (content organisms)

Closed vocabulary only: `hero`/`banner`, `richText`, `imageSet`, `ctaLink`, `showcase`,
plus the hosted form and a counter as the single proof on the poster.

- Hero is large type, one supporting line, maximum contrast via tokens (no hex).
- At most one short richText block under the hero — a single claim, not an article.
- imageSet without a data-bound URL is a placeholder box — **never invent a URL**.
- A field `*ImageUrl` renders a real `img`. Empty branch when missing.
- Counter is the one number on the poster, next to the CTA.
- CTA + hosted form share the lower band; the form does not scroll a second page away.

## Attention hierarchy

1. Hero claim.
2. The one number (counter).
3. CTA → hosted form.
4. Anything else (showcase, extra prose) below the fold.

## House rules the design model most often violates

- Tokens by role, never a hardcoded palette.
- Every visible string is `this.msg[...]`.
- No Shadow DOM, no `static styles = css\`...\``.
- Form inside `<Scene>` when a scenario exists.
- No contract-internal vocabulary as visible text.

## Forbidden

- Long editorial columns (that is `editorialLongRead` / page21).
- Management grids, filter bars, page-size inputs.
- Invented image URLs. Hardcoded colors. Visible literals.
- Form outside `<Scene>` when a scenario exists. Steps / wizards.
- More than one competing CTA on the first screen.
