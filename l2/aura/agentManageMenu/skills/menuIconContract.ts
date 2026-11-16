/// <mls fileReference="_102020_/l2/aura/agentManageMenu/skills/menuIconContract.ts" enhancement="_blank"/>

// The technical frame for a generated apps-menu icon, kept short on purpose (see logoContract.ts: a
// long rulebook made the model retreat to the safest drawing). What stays is what the platform cannot
// bend, plus the house style that makes a drawn icon sit next to the Lucide ones of the same menu.
//
// Machine-readable counterpart: 102036 isSafeMenuIconSvg (_102036_/l2/inlineSvg.ts).

export const skill = `
# Menu icon — technical frame

You draw icons for the entries of an app menu. Each icon is INLINED into the page and drawn at 18px,
next to the entry name in text, among Lucide icons.

## Hard rules (the platform refuses the markup otherwise)
1. A single \`<svg>\` root with \`viewBox="0 0 24 24"\`, and NO \`width\`/\`height\` on that root.
2. Paint with \`currentColor\` only (\`stroke="currentColor"\`, \`fill="none"\` or \`fill="currentColor"\`):
   no hex, no rgb/hsl, no named colors. The icon follows the theme in light and dark.
3. No \`<script>\`, \`<style>\`, \`<image>\`, \`<use>\`, \`<foreignObject>\`, \`<iframe>\`, \`<animate>\`, no event
   handler attribute, nothing external (\`href\`, \`src\`, \`xlink:\`, \`url(...)\`).
4. Under 4KB of markup each.

## House style (so it matches the Lucide icons around it)
- Outline drawing: on the root, \`fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round"\`.
- Keep about 2 units of margin inside the 24x24 box; a few simple strokes read best at 18px.
- One clear idea per icon. Make the drawings genuinely different from each other.

## Output
Return the drawings in the result field and nothing else — no explanation around it.
`;
