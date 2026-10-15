/// <mls fileReference="_102020_/l2/aura/plugins/helpers/dsUsedTokens.ts" enhancement="_blank"/>

// Which design-system tokens the page on screen actually uses — for the L5 → UI editor to mark them.
//
// Read from the CSSOM, not from sources: pages paint through Tailwind arbitrary values
// (`text-[var(--text-muted,…)]`), molecules through their compiled LESS (`var(--ml-*)`), anything
// through inline styles — the browser already has all of it as rules. A rule counts when its selector
// matches an element of the page region; nested rules (Tailwind v4 variants: `&:hover`, `@media`) count
// with their parent. Indirection is followed through the token CSS itself: `--ml-primary:
// var(--primary)` (reconciliation) or `calc(var(--font-base-unit) * 3)` mark the referenced token too.
//
// The pure helpers (var refs, selector cleanup, closure) are exported for Node tests.

const VAR_REF = /var\(\s*--([a-zA-Z0-9_-]+)/g;

/** Every `--name` read through `var(--name…)` in a css text. */
export function varRefs(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(VAR_REF)) out.push(m[1]);
  return out;
}

// State/pseudo-element parts a static `matches` can never satisfy — dropped so `.btn:hover` counts
// for `.btn`. Structural pseudo-classes (`:first-child`, `:not(…)`) stay: they are matchable.
// An escaped colon (`.md\:hover\:bg-x`) is part of a Tailwind class name, never a pseudo.
const DYNAMIC_PSEUDO = /(?<!\\)::?(hover|focus-visible|focus-within|focus|active|visited|target|placeholder-shown|placeholder|before|after|marker|selection|first-line|first-letter|backdrop|file-selector-button|-webkit-[a-z-]+|-moz-[a-z-]+)(\([^)]*\))?/g;

/**
 * Split a selector list on its top-level commas only: Tailwind arbitrary values escape theirs
 * (`.bg-\[var\(--page-bg\,transparent\)\]`) and `:is(a, b)` nests them.
 */
export function splitSelectorList(selector: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (ch === '\\') { i++; continue; }
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) { parts.push(selector.slice(start, i)); start = i + 1; }
  }
  parts.push(selector.slice(start));
  return parts;
}

/** Selector usable with `matches`/`querySelector`, or '' when nothing is left. */
export function cleanSelector(selector: string): string {
  return splitSelectorList(selector)
    .map(s => s.replace(DYNAMIC_PSEUDO, '').trim())
    .filter(s => s && !s.endsWith('>') && !s.endsWith('+') && !s.endsWith('~'))
    .join(', ');
}

/** `--a: value;` declarations of a css text (last one wins — the dark block only re-points names). */
export function tokenGraph(css: string): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const m of css.matchAll(/--([a-zA-Z0-9_-]+)\s*:\s*([^;}]*)/g)) {
    const refs = graph.get(m[1]) ?? new Set<string>();
    for (const r of varRefs(m[2])) refs.add(r);
    graph.set(m[1], refs);
  }
  return graph;
}

/** `used` plus everything reachable through the token graph. */
export function expandRefs(used: Iterable<string>, graph: Map<string, Set<string>>): Set<string> {
  const out = new Set<string>();
  const stack = [...used];
  while (stack.length) {
    const name = stack.pop()!;
    if (out.has(name)) continue;
    out.add(name);
    for (const next of graph.get(name) ?? []) stack.push(next);
  }
  return out;
}

// ─── DOM side ─────────────────────────────────────────────────────────

/**
 * Selector a nested rule really applies to. CSS nesting: `&` is the parent; a nested selector without
 * `&` is a descendant of it. A parent list is wrapped in `:is(…)` so `&` stays one compound.
 */
export function effectiveSelector(selector: string, parent: string | null): string {
  const sel = selector.trim();
  if (!parent) return sel;
  const p = `:is(${parent})`;
  return sel.includes('&') ? sel.replace(/&/g, p) : `${p} ${sel}`;
}

/** `matches`, swallowing what this engine cannot parse (not evidence either way). */
export function safeMatches(el: Element, selector: string): boolean {
  const sel = cleanSelector(selector);
  if (!sel) return false;
  try { return el.matches(sel); } catch { return false; }
}

function matchesInside(root: Element, selector: string): boolean {
  const sel = cleanSelector(selector);
  if (!sel) return false;
  try {
    return root.matches(sel) || root.querySelector(sel) !== null;
  } catch {
    return false;
  }
}

function walkRule(rule: CSSRule, parent: string | null, visit: (selector: string, style: CSSStyleDeclaration) => void): void {
  const styleRule = rule as CSSStyleRule;
  let selector = parent;
  if (typeof styleRule.selectorText === 'string') selector = effectiveSelector(styleRule.selectorText, parent);
  // Style rules, and CSSNestedDeclarations (a `style` with no selector: the declarations of a parent
  // rule's nested `@media`) — those apply to the parent's selector. Top-level `@font-face` /
  // keyframes carry a style but no selector at all: skipped.
  if (selector && styleRule.style) visit(selector, styleRule.style);
  const children = (rule as CSSGroupingRule).cssRules;
  if (children) for (const child of Array.from(children)) walkRule(child, selector, visit);
}

/** Every (effective selector, declarations) of the document's readable stylesheets. */
export function forEachStyleDecl(doc: Document, visit: (selector: string, style: CSSStyleDeclaration) => void): void {
  const sheets = [...Array.from(doc.styleSheets), ...((doc as any).adoptedStyleSheets ?? [])] as CSSStyleSheet[];
  for (const sheet of sheets) {
    let rules: CSSRuleList;
    try { rules = sheet.cssRules; } catch { continue; }   // cross-origin sheet (fonts) — not ours
    for (const rule of Array.from(rules)) walkRule(rule, null, visit);
  }
}

/**
 * Names of the custom properties the elements under `root` read, transitively resolved through the
 * token stylesheet `tokensCss`. The caller intersects with the DS token names. Never the `:root`
 * token block itself — no page element is `:root`.
 */
export function collectUsedTokens(root: Element, doc: Document, tokensCss: string): Set<string> {
  const direct = new Set<string>();
  forEachStyleDecl(doc, (selector, style) => {
    const css = style.cssText;
    if (!css.includes('var(') || !matchesInside(root, selector)) return;
    for (const r of varRefs(css)) direct.add(r);
  });
  for (const el of [root, ...Array.from(root.querySelectorAll('[style]'))]) {
    const inline = el.getAttribute('style');
    if (inline?.includes('var(')) for (const r of varRefs(inline)) direct.add(r);
  }
  return expandRefs(direct, tokenGraph(tokensCss));
}

/**
 * The page of the running app: the content HOST, not the whole region — the region also holds the
 * nav3 tab bar and the studio panels opened as tabs.
 */
export function pageRegion(doc: Document): Element | null {
  return doc.querySelector('[data-region-host="content"]') ?? doc.querySelector('main[data-region="content"]');
}
