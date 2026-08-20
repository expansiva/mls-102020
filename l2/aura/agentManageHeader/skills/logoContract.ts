/// <mls fileReference="_102020_/l2/aura/agentManageHeader/skills/logoContract.ts" enhancement="_blank"/>

// The brand-mark contract, as prose for the generate-logo agent's prompt. The machine-readable
// counterpart is `validateLogoSvg` (../helpers/generateLogoCore.ts), which delegates the final word
// to the runtime's own `isSafeLogoSvg` (_102033_/l2/shared/layout/auraHeaderCore.ts). Keep them in sync.

export const skill = `
# Brand mark contract (mandatory)

You draw ONE small mark that identifies an app in its header band. The markup is INLINED in the page
(that is what lets it follow the design system), so it must be plain geometry and nothing else.

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
4. Plain shapes only: \`path\`, \`circle\`, \`rect\`, \`ellipse\`, \`line\`, \`polygon\`, \`polyline\`, \`g\`.
5. Keep it under 4KB of markup — a monogram is normally under 1KB.
6. Make it readable as a silhouette: shapes that touch or overlap read as one blob at 28px.

## NEVER
1. No \`<script>\`, \`<style>\`, \`<image>\`, \`<use>\`, \`<foreignObject>\`, \`<animate>\`, \`<iframe>\`.
2. No \`href\`, \`xlink:\`, \`url(...)\` or any external reference — nothing is fetched.
3. No event handler attribute (\`onclick\`, \`onload\`, …), no \`javascript:\`.
4. No literal color: no \`#hex\`, no \`rgb()\`, no \`hsl()\`, no named color.
5. No gradient, filter, mask or clip-path — they either need color stops or break at 28px.
6. No opacity trickery to fake a second color: the mark is monochrome by design.

## Style
- \`monogram\`: the initial(s) drawn as geometry, optionally inside a container shape (circle, rounded
  square, cup, leaf). Two letters maximum.
- \`mark\`: an abstract mark — 2 to 4 geometric shapes that evoke the activity, no letters.
- \`wordmark\`: the name drawn as paths, no wider than 12 characters, height 1/4 of the width at most.

## Example (format reference — a "C" monogram in a rounded square)
{"type":"flexible","result":{
"svg":"<svg viewBox=\\"0 0 32 32\\" fill=\\"none\\"><rect x=\\"1.5\\" y=\\"1.5\\" width=\\"29\\" height=\\"29\\" rx=\\"8\\" stroke=\\"currentColor\\" stroke-width=\\"2.5\\"/><path d=\\"M22 11.5a7.5 7.5 0 1 0 0 9\\" stroke=\\"currentColor\\" stroke-width=\\"3\\" stroke-linecap=\\"round\\"/></svg>",
"notes":"Monograma C em quadrado arredondado: legível a 28px, traço 2.5–3."
}}
`;
