/// <mls fileReference="_102020_/l2/aura/molecules/shared/moleculeInspect.ts" enhancement="_blank"/>

// SHARED pure inspectors over molecule sources (.less and .ts), used by the stylesheet gates of BOTH
// agentNewMoleculeVariant/v3-less and agentNewMolecule2/n5-less.
//
// These are not conveniences — each carries a subtlety that must not diverge between two copies:
// - hasUniversalSelector: the selector regex has to re-enter a block nested directly inside another
//   (`.a { .b > * { } }`), and must not trip on `calc(a * b)` or `[class*="x"]`;
// - setsPositionOrOverflow: nested `::before`/`::after` overlays MAY position themselves;
// - extractAbsoluteMlClasses: quoted strings and flat arrays only — a whole html`...` template spans
//   many elements and would wrongly merge one element's `absolute` with another's ml-* class.

// ---- .less ----

// Every `.ml-*` class the sheet styles (deduped, sorted).
export function extractMlClassesFromLess(less: string): string[] {
  const found = new Set<string>();
  for (const match of less.matchAll(/\.(ml-[a-z][a-z0-9-]*)/g)) found.add(match[1]);
  return Array.from(found).sort();
}

// True when a `*` appears in SELECTOR position (`* {`, `.a > * {`, `*, *::before {`).
// Comments and attribute selectors ([class*="x"]) are scrubbed first, and only the text that
// precedes a `{` is inspected — so `calc(a * b)` in a declaration never trips it.
export function hasUniversalSelector(less: string): boolean {
  const scrubbed = scrubComments(less).replace(/\[[^\]]*\]/g, '');
  // No explicit prefix: `[^{};]*` cannot cross a delimiter, so matches chain even when a block opens
  // directly inside another (`.a { .b > * { ... } }`).
  const selectors = /([^{};]*)\{/g;
  let match: RegExpExecArray | null;
  while ((match = selectors.exec(scrubbed)) !== null) {
    if (match[1].includes('*')) return true;
  }
  return false;
}

// True if the `.cls { ... }` block sets `position`/`overflow` at its own level (nested
// ::before/::after overlays are scrubbed — they may position themselves).
export function setsPositionOrOverflow(less: string, cls: string): boolean {
  const selector = new RegExp(`\\.${escapeRegExp(cls)}(?![\\w-])`, 'g');
  let match: RegExpExecArray | null;
  while ((match = selector.exec(less)) !== null) {
    const braceIdx = less.indexOf('{', match.index + match[0].length);
    if (braceIdx < 0) continue;
    // `.cls` must be a SELECTOR (only selector chars before its `{`), not a value.
    if (/[;}]/.test(less.slice(match.index + match[0].length, braceIdx))) continue;
    const body = balancedBlockBody(less, braceIdx);
    const scrubbed = body.replace(/&?:{1,2}(?:before|after)\b[^{]*\{[^{}]*\}/gi, '');
    if (/(?:^|[;{])\s*(?:position|overflow|overflow-x|overflow-y)\s*:/i.test(scrubbed)) return true;
  }
  return false;
}

// Body between the brace at `open` and its matching close.
export function balancedBlockBody(source: string, open: number): string {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(open + 1, i);
  }
  return source.slice(open + 1);
}

// Colour literals in a position where a theme can never override them. There are exactly TWO
// legitimate homes for a literal, and both are excluded here:
// - the FALLBACK of a token read: `color: var(--ml-on-surface, #1c1b1f)` — the library's pattern in
//   146 of 147 base sheets;
// - the VALUE of a token definition: `--ml-surface: rgba(255,255,255,.08);` — what a themed sheet is
//   for. (A test caught this one: without the exclusion, every themed sheet failed on its own tokens.)
// Anything else is a hardcoded colour (measured: 10 of 147 base sheets, almost all the same
// hardcoded red focus ring — a defect, not a pattern).
export function bareColorLiterals(less: string): string[] {
  let text = scrubComments(less)
    // custom-property DEFINITIONS: `--name: <anything up to ; or }>`
    .replace(/--[\w-]+\s*:[^;}]*/g, 'DEF');
  let previous: string;
  do {
    previous = text;
    text = text.replace(/var\(\s*--[\w-]+\s*(?:,[^()]*(?:\([^()]*\)[^()]*)*)?\)/g, 'VAR');
  } while (text !== previous);
  const found = new Set<string>();
  for (const match of text.matchAll(/(^|[\s:,(])(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))/g)) {
    found.add(match[2].trim());
  }
  return [...found];
}

// ---- .ts ----

// Every ml-* class the render source mentions (deduped, sorted) — the inventory a stylesheet may
// style. The lookbehind matters: without it, `ml-<name>` inside the file's own path
// (`.../ml-kpi-card.ts`) and inside its own tag (`group--ml-kpi-card`) counted as classes, which made
// the render gate's discipline check VACUOUS — a molecule emitting no semantic class still had two
// "matches".
export function extractMlClassesFromTs(renderTs: string): string[] {
  const found = new Set<string>();
  for (const match of renderTs.match(/(?<![\w/-])ml-[a-z0-9]+(?:-[a-z0-9]+)*/g) || []) found.add(match);

  // A render may build a class FAMILY by interpolation (`\`ml-alert-type-${kind}\``). The regex
  // above stops at the `$`, so the family contributes its PREFIX WITHOUT the trailing dash —
  // `ml-alert-type` — which then looks like a literal class the render never emits. Measured on the
  // 2026-09-03 Studio run (ml-modal-alert, 3 interpolation sites): the inventory reported
  // `ml-modal-alert-type` and `ml-modal-alert` (neither exists) and omitted
  // `ml-modal-alert-type-error` and `ml-modal-alert-entering` (both do). Since this list is BOTH
  // shown to the model as `{{mlInventory}}` and enforced by the n5-less gate, the run was told to
  // style a dead class, forbidden from styling the real ones, and ended up keying appearance on
  // `[aria-label="error notification"]` — a selector anchored on translatable prose.
  //
  // So drop a prefix-only artifact, unless the same name ALSO occurs as a real literal.
  for (const prefix of extractMlClassPrefixes(renderTs)) {
    const bare = prefix.slice(0, -1);
    if (!occursAsLiteralClass(renderTs, bare)) found.delete(bare);
  }
  return [...found].sort();
}

// The interpolated class FAMILIES the render builds. The trailing dash is KEPT: it is what tells a
// family (`ml-alert-type-`) apart from a literal class (`ml-alert-type`). The concrete suffixes are
// only known at runtime, so callers match by prefix instead of resolving them — deliberately: the
// suffix comes from a field's type union or a method's return type, and resolving that would mean
// type-checking the render.
export function extractMlClassPrefixes(renderTs: string): string[] {
  const found = new Set<string>();
  for (const m of renderTs.matchAll(/(?<![\w/-])(ml-[a-z0-9]+(?:-[a-z0-9]+)*-)\$\{/g)) found.add(m[1]);
  return [...found].sort();
}

/** True when `name` appears as a class on its own — not as the prefix of a longer name, and not
 *  immediately followed by an interpolation (`ml-foo-${…}`, which makes it a family prefix). */
function occursAsLiteralClass(renderTs: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\w/-])${escaped}(?![a-z0-9-])`).test(renderTs);
}

// ml-* classes the render positions with `absolute`/`fixed`. A stylesheet must NOT set
// position/overflow on these: it drops the element into normal flow (full width) and clips its
// decorations — the discrete-slider bug (T10/T12).
//
// Heuristic over the render source: a "class-list context" (a single quoted string, or a flat
// `[ ... ]` array as in the get*Classes() builders) containing an `absolute`/`fixed` token
// contributes ALL its ml-* classes.
export function extractAbsoluteMlClasses(renderTs: string): string[] {
  const found = new Set<string>();
  const collect = (text: string): void => {
    if (!/\b(absolute|fixed)\b/.test(text)) return;
    for (const match of text.matchAll(/(?<![\w-])ml-[a-z][a-z0-9-]*/g)) found.add(match[0]);
  };
  // (1) single-line quoted strings ('...' / "...") — one per element class list (inline class="..."
  //     attributes, cn(...) args). NOT backtick templates: a whole html`...` template spans many
  //     elements and would wrongly merge a positioned element's `absolute` with another element's
  //     ml-* class.
  for (const match of renderTs.matchAll(/(['"])(.*?)\1/g)) collect(match[2]);
  // (2) flat array literals [ ... ] — the get*Classes() builders keep the positioning class and the
  //     ml-* classes as SEPARATE elements.
  for (const match of renderTs.matchAll(/\[([^[\]]*)\]/g)) collect(match[1]);
  return Array.from(found).sort();
}

// True when the render declares a portal (its panel is rendered into document.body, outside the tag).
export function declaresPortal(renderTs: string): boolean {
  return /portalWidgetName\s*[:=]/.test(renderTs);
}

// ---- internals ----

function scrubComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
