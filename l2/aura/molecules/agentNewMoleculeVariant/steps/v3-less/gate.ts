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

  if (!/--ml-[\w-]+\s*:/.test(content)) {
    issues.push({ code: 'tokens', message: 'sheet must define the --ml-* tokens the molecule consumes (theme skill token table)' });
  }
  if (!/transition/.test(content)) {
    issues.push({ code: 'motion', message: 'sheet must take an explicit motion stance (a transition declaration — the theme skill says which)' });
  }

  return issues;
}
