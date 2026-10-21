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

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: one screen, one claim, one number, one action, the closed content
vocabulary and the house rules. On a phone the first screen is short, so the poster must be
composed to fit it: claim, number and CTA all visible before any scroll. Where this section and
the layout described above differ, this section wins on mobile.

- **The first screen holds the whole poster**: the hero claim, its supporting line, the one
  number and the CTA. The hero type scales down as much as needed for that, still the largest
  and highest-contrast thing on the page.
- **A hero image yields to the claim**: full width, but sized so it never pushes the claim or the
  CTA below the first screen.
- **The short richText moves below the CTA** when it would push the CTA off the first screen.
- **The CTA is one full-width control** at the bottom of the first screen, where the thumb
  reaches it, with the number next to it. The hosted form starts right below: one column of
  full-width fields, the submit at the bottom of the form, inside `<Scene>` when a scenario
  exists.
- **Anything else** (showcase, extra prose) comes after the form, stacked in one column.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the hero claim, 2. the one number, 3. the CTA and the hosted
form, 4. everything else.

Forbidden on mobile:
- a CTA below the first screen;
- a second CTA competing on the first screen, sticky ones included;
- a hero image pushing the claim or the CTA out of the first screen;
- a carousel, or anything that scrolls sideways.

## Forbidden

- Long editorial columns (that is `editorialLongRead` / page21).
- Management grids, filter bars, page-size inputs.
- Invented image URLs. Hardcoded colors. Visible literals.
- Form outside `<Scene>` when a scenario exists. Steps / wizards.
- More than one competing CTA on the first screen.
