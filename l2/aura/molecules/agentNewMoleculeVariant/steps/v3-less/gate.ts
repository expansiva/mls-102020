/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v3-less/gate.ts" enhancement="_blank"/>

// Gate for the generated .less theme sheet (pure — unit-testable).
// flow.json v3-less: retry 1 with these errors in context.

import { VariantContext } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.js';
import { extractMlClassesFromLess } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vOrigin.js';
import { VGateIssue } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v1-bootstrap/gate.js';

// Pure LAYOUT utilities only — .animate-spin/.w-full stay allowed: the theme
// skills legitimately anchor on them (spinner steps(), collapsed levels).
const TAILWIND_LAYOUT_SELECTORS = /\.(px-\d|py-\d|gap-\d|inline-flex\b)/;

export function runLessGate(less: string, ctx: VariantContext): VGateIssue[] {
  const issues: VGateIssue[] = [];
  const content = less || '';

  if (!content.trim()) {
    return [{ code: 'empty', message: 'lessContent is empty' }];
  }
  if (content.includes('```')) {
    issues.push({ code: 'fence', message: 'lessContent contains markdown fences — return raw LESS only' });
  }

  // M2 safety net: exactly one mls header, referencing the DESTINATION project
  // and this variant (the header is prepended by code — this guards regressions
  // and a model that smuggled a second header into the body).
  const headers = content.match(/^\s*\/\/\/\s*<mls\b[^\n]*/gm) || [];
  const correctRef = `_${ctx.theme.project}_/l2/molecules/${ctx.variant.group}/${ctx.variant.shortName}.less`;
  if (headers.length !== 1 || !headers[0].includes(correctRef)) {
    issues.push({ code: 'header', message: `sheet must carry exactly one mls header referencing ${correctRef} (found ${headers.length})` });
  }

  const open = (content.match(/\{/g) || []).length;
  const close = (content.match(/\}/g) || []).length;
  if (open !== close) {
    issues.push({ code: 'braces', message: `unbalanced braces: ${open} '{' vs ${close} '}'` });
  }

  if (!content.includes(ctx.variant.tag)) {
    issues.push({ code: 'scope', message: `sheet must be scoped under the variant tag '${ctx.variant.tag}'` });
  }
  const portalSelector = `div[data-widget="${ctx.variant.tag}"]`;
  if (ctx.origin.portal && !content.includes(portalSelector)) {
    issues.push({ code: 'portal_scope', message: `portal molecule: sheet must ALSO scope '${portalSelector}'` });
  }
  if (!ctx.origin.portal && content.includes('data-widget')) {
    issues.push({ code: 'portal_extra', message: 'non-portal molecule must not use a data-widget selector' });
  }

  const inventory = new Set(ctx.origin.mlClassInventory);
  const unknown = extractMlClassesFromLess(content).filter(cls => !inventory.has(cls));
  if (unknown.length) {
    issues.push({
      code: 'unknown_classes',
      message: `these .ml-* classes do not exist in the origin molecule (invented?): ${unknown.join(', ')} — style ONLY the provided inventory`,
    });
  }

  if (TAILWIND_LAYOUT_SELECTORS.test(content)) {
    issues.push({ code: 'tailwind_layout', message: 'never redefine Tailwind LAYOUT utilities (px-*, py-*, gap-*, inline-flex) as selectors — layout is global and inherited' });
  }

  // Render-owned positioning: the origin render() places some ml-* elements with
  // absolute/fixed. A theme MAY use position/transform/display for its OWN effects
  // (the brutal golden does), but it must NOT set position/overflow on an element
  // the render already positioned — that drops it into normal flow (full width /
  // clipped decorations: the discrete-slider tooltip bug). Pseudo-element overlays
  // (::before/::after) may position themselves, so they are scrubbed first.
  const repositioned = (ctx.origin.absoluteMlClasses ?? []).filter(cls => setsPositionOrOverflow(content, cls));
  if (repositioned.length) {
    issues.push({
      code: 'position_override',
      message: `these elements are positioned by the inherited render (absolute/fixed) — do NOT set position/overflow on them (it drops them into normal flow → full width / clipped arrows): ${repositioned.join(', ')}. Theme appearance only; ::before/::after overlays may position themselves; use 'box-shadow: inset ...' for specular edges.`,
    });
  }

  // T3: a universal selector in a molecule sheet wipes animation the molecule INHERITS
  // from its base (e.g. the SVG spinner) and leaks outside the tag scope. Themes must take
  // their motion stance on the elements they name.
  if (hasUniversalSelector(content)) {
    issues.push({
      code: 'universal_selector',
      message: 'never use a universal selector (`*`) in a molecule sheet — it wipes inherited animation (the SVG spinner) and leaks outside the component scope; apply the motion stance to the classes you style (a mechanical spinner is `.animate-spin { animation-timing-function: steps(n); }`)',
    });
  }

  if (!/--ml-[\w-]+\s*:/.test(content)) {
    issues.push({ code: 'tokens', message: 'sheet must define the --ml-* tokens the molecule consumes (theme skill token table)' });
  }
  if (!/transition/.test(content)) {
    issues.push({ code: 'motion', message: 'sheet must take an explicit motion stance (a transition declaration — the theme skill says which)' });
  }

  return issues;
}

// True when a `*` appears in SELECTOR position (`* {`, `.a > * {`, `*, *::before {`).
// Comments and attribute selectors ([class*="x"]) are scrubbed first, and only the text
// that precedes a `{` is inspected — so `calc(a * b)` in a declaration never trips it.
function hasUniversalSelector(less: string): boolean {
  const scrubbed = less
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\[[^\]]*\]/g, '');
  const selectors = /(?:^|[{};])([^{};]*)\{/g;
  let match: RegExpExecArray | null;
  while ((match = selectors.exec(scrubbed)) !== null) {
    if (match[1].includes('*')) return true;
  }
  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// True if the `.cls { ... }` block sets `position`/`overflow` at its own level
// (nested ::before/::after overlays are scrubbed — they may position themselves).
function setsPositionOrOverflow(less: string, cls: string): boolean {
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
function balancedBlockBody(source: string, open: number): string {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(open + 1, i);
  }
  return source.slice(open + 1);
}
