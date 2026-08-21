/// <mls fileReference="_102020_/l2/aura/agentManageHeader/skills/logoContract.ts" enhancement="_blank"/>

// The technical frame for a generated brand mark — deliberately SHORT.
//
// An earlier version carried a full design rulebook (shape budget, single stroke width, coverage
// floor, "one idea only"). Measured against the same brief, it made the model retreat to the safest
// possible drawing — a circle with an arc — and the rich marks were the ones the rules refused. So the
// aesthetic direction comes from the BRIEF now, and what stays here is only what the platform cannot
// bend: the markup is inlined into the page, so it must be safe, and it must scale into the band.
//
// Machine-readable counterpart: `validateLogoSvg` (../helpers/generateLogoCore.ts), which delegates to
// the runtime's `isSafeLogoSvg` (_102033_/l2/shared/layout/auraHeaderCore.ts).

export const skill = `
# Brand mark — technical frame

You draw ONE mark that identifies an app. It is INLINED into the page (not loaded as a file) and
renders about 28px tall in the app header, next to the brand name in text.

## Hard rules (the platform refuses the markup otherwise)
1. A single \`<svg>\` root with a \`viewBox\`, and NO \`width\`/\`height\` on that root — the header sizes
   it. Any viewBox is fine (32x32, 64x64, 512x512).
2. No \`<script>\`, \`<style>\`, \`<image>\`, \`<use>\`, \`<foreignObject>\`, \`<iframe>\`, \`<animate>\`.
3. No event handler attribute (\`onclick\`, \`onload\`, …) and no \`javascript:\`.
4. Nothing external: no \`href\`, no \`src\`, no \`xlink:\`, no \`url(...)\` pointing outside the markup. A
   \`url(#id)\` for a gradient you define inline is fine.
5. Under 12KB of markup.

## Two things worth knowing about where it lands
- It renders at ~28px, so what survives is shape and contrast — a hairline or a 3px detail will not.
- \`currentColor\` inherits the header text color, so a mark painted with \`fill="currentColor"\` /
  \`stroke="currentColor"\` follows the app design system in light AND dark mode by itself. Fixed colors
  are allowed and often right for a brand — they just stay the same in both themes.

Everything else is yours as a designer: how many shapes, filled or outlined, monogram or object, flat
or gradient. Draw what the brief asks for, and draw it well.

## Output
Return the markup in the result field and nothing else — no explanation around it.
`;
