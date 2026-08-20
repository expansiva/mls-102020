/// <mls fileReference="_102020_/l2/aura/agentManageHeader/skills/logoContract.ts" enhancement="_blank"/>

// The brand-mark contract, as prose for the generate-logo agent's prompt. The machine-readable
// counterpart is `validateLogoSvg` (../helpers/generateLogoCore.ts), which delegates the final word
// to the runtime's own `isSafeLogoSvg` (_102033_/l2/shared/layout/auraHeaderCore.ts). Keep them in sync.

export const skill = `
# Brand mark contract (mandatory)

You draw ONE small mark that identifies an app in its header band. The markup is INLINED in the page
(that is what lets it follow the design system), so it must be plain geometry and nothing else.

## One idea, drawn big
The single thing that separates a professional mark from an amateur one at this size is RESTRAINT.
Pick ONE idea and let it own the box:
- a container (circle / rounded square / cup silhouette) with ONE letter or ONE motif inside, or
- a free-standing letterform, or
- a free-standing motif.
**Never a container plus two letters** — inside a 32-unit box with a 2.5 stroke there is no room for
two glyphs, and it renders as a smudge. Two initials are fine ONLY without a container.

## Where it renders
- 28px tall, on a header band one line high, next to the brand name. Legibility at that size beats
  detail: 2 to 6 shapes, generous strokes, no hairlines.
- It is painted by the app's text color through \`currentColor\` — light theme AND dark theme with the
  same markup. That is why literal colors are refused: a baked color disappears on one of the two.
- Next to it there is already the brand NAME in text. Do not repeat the full name in the mark unless
  the requested style is a wordmark.

## MUST
1. A single \`<svg>\` root element, with a \`viewBox\` (a 32x32 or 48x48 box is a good default).
2. No \`width\` or \`height\` on the \`<svg>\` root — the band sizes it.
3. Paint only with \`fill="currentColor"\`, \`stroke="currentColor"\` or \`fill="none"\`.
4. **State the paint on EVERY shape.** Never rely on inheriting \`fill\` from the root: put
   \`fill="none"\` on each outlined shape and \`fill="currentColor"\` on each solid one. A shape with no
   \`fill\` of its own is the single most common way these marks come out as a black blob.
5. Plain shapes only: \`path\`, \`circle\`, \`rect\`, \`ellipse\`, \`line\`, \`polygon\`, \`polyline\`, \`g\`.
6. Keep it under 4KB of markup — a monogram is normally under 1KB.
7. Round the ends and joins of open strokes (\`stroke-linecap="round"\`, \`stroke-linejoin="round"\`).
8. **ONE stroke width for the whole mark**, between 2 and 3.5 in a 32-unit viewBox (scaled
   proportionally in a larger one). Two different widths read as a mistake, not as hierarchy.
9. **At most 4 shapes.** Each one must span at least 6 units (a 32-unit box) — a smaller element is a
   speck at render size. Prefer 2 or 3 confident shapes.
10. **Fill the box:** the drawing must span at least 60% of the viewBox on one axis, and stay inside
   ~90% of it. A motif in a corner reads as an accident.
11. Keep at least 2 units of gap between distinct shapes, or they merge into one silhouette at 28px.

## NEVER
1. No \`<script>\`, \`<style>\`, \`<image>\`, \`<use>\`, \`<foreignObject>\`, \`<animate>\`, \`<iframe>\`.
2. No \`href\`, \`xlink:\`, \`url(...)\` or any external reference — nothing is fetched.
3. No event handler attribute (\`onclick\`, \`onload\`, …), no \`javascript:\`.
4. No literal color: no \`#hex\`, no \`rgb()\`, no \`hsl()\`, no named color.
5. No gradient, filter, mask or clip-path — they either need color stops or break at 28px.
6. No opacity trickery to fake a second color: the mark is monochrome by design.
7. No shape that fills the whole viewBox (a full-bleed rect/circle): at 28px that is just a colored
   square with the rest of the drawing lost inside it. A container shape must be an OUTLINE
   (\`fill="none"\` + stroke) with the motif visible inside it.
8. No detail that survives only when large: sub-2-unit gaps, text under 8 units tall, a shape under 6
   units across (steam wisps, sparkles, dots), or a motif drawn inside another filled shape.
9. No second idea "to enrich it": a cup AND a bean AND steam AND a frame is four ideas competing in
   11px of usable interior.

## Style
- \`monogram\`: the initial(s) drawn as geometry, optionally inside a container shape (circle, rounded
  square, cup, leaf). Two letters maximum.
- \`mark\`: an abstract mark — 2 to 4 geometric shapes that evoke the activity, no letters.
- \`wordmark\`: the name drawn as paths, no wider than 12 characters, height 1/4 of the width at most.

## Example (format reference — a "C" monogram in a rounded square)
{"type":"flexible","result":{
"svg":"<svg viewBox=\\"0 0 32 32\\"><rect x=\\"1.75\\" y=\\"1.75\\" width=\\"28.5\\" height=\\"28.5\\" rx=\\"8\\" fill=\\"none\\" stroke=\\"currentColor\\" stroke-width=\\"2.5\\"/><path d=\\"M22 11.5a7.5 7.5 0 1 0 0 9\\" fill=\\"none\\" stroke=\\"currentColor\\" stroke-width=\\"3\\" stroke-linecap=\\"round\\"/></svg>",
"notes":"Monograma C em quadrado arredondado: legível a 28px, traço 2.5–3."
}}
`;
