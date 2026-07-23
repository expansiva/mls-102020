/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v2-shell/gate.ts" enhancement="_blank"/>

// Shell invariants (pure). flow.json v2-shell: NO retry — a failure here is a
// template bug, not a model roll.

import { VariantContext } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.js';
import { VGateIssue } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v1-bootstrap/gate.js';

// Comments legitimately mention render()/portal (the standard shell header) —
// invariants are checked on CODE only.
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function runShellGate(shellTs: string, shellDefs: string, ctx: VariantContext): VGateIssue[] {
  const issues: VGateIssue[] = [];
  const code = stripComments(shellTs);

  if (!code.includes(`@customElement('${ctx.variant.tag}')`)) {
    issues.push({ code: 'shell_tag', message: `shell .ts must declare @customElement('${ctx.variant.tag}')` });
  }
  if (!new RegExp(`class\\s+${ctx.variant.className}\\s+extends\\s+${ctx.origin.className}\\b`).test(code)) {
    issues.push({ code: 'shell_extends', message: `shell .ts must declare class ${ctx.variant.className} extends ${ctx.origin.className}` });
  }
  if (/\brender\s*\(\s*\)/.test(code)) {
    issues.push({ code: 'shell_render', message: 'shell .ts must NOT override render() (Strategy D)' });
  }
  const hasPortalLine = code.includes('portalWidgetName');
  if (ctx.origin.portal && !code.includes(`portalWidgetName = '${ctx.variant.tag}'`)) {
    issues.push({ code: 'shell_portal', message: `portal molecule: shell must set portalWidgetName = '${ctx.variant.tag}'` });
  }
  if (!ctx.origin.portal && hasPortalLine) {
    issues.push({ code: 'shell_portal_extra', message: 'non-portal molecule must not declare portalWidgetName' });
  }
  if (code.includes('portalClassName')) {
    issues.push({ code: 'shell_portal_class', message: 'portalClassName is dead — never declare it' });
  }

  // defs is the origin contract replicated verbatim; only identity fields change.
  if (!shellDefs.includes(`export const group = '${ctx.origin.groupCanonical}'`)) {
    issues.push({ code: 'defs_group', message: `defs must export group = '${ctx.origin.groupCanonical}'` });
  }
  const expectedHeaderRef = `_${ctx.theme.project}_/l2/molecules/${ctx.variant.group}/${ctx.variant.shortName}.defs.ts`;
  if (!shellDefs.includes(expectedHeaderRef)) {
    issues.push({ code: 'defs_header', message: `defs header must reference the variant file (${expectedHeaderRef})` });
  }
  if (!new RegExp(`^\\s*-\\s*TagName:\\s*${escapeRegExp(ctx.variant.tag)}\\s*$`, 'm').test(shellDefs)) {
    issues.push({ code: 'defs_tag', message: `defs skill must declare TagName: ${ctx.variant.tag}` });
  }

  return issues;
}
