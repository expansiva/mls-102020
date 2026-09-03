/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v4-index/gate.ts" enhancement="_blank"/>

// Group-index showcase invariants (pure). v4-index is now an LLM step that
// regenerates the whole showcase page (reusing the indexGroupPage skill), so the
// gate checks structural essentials — NOT byte shape. A 2nd failure does NOT
// block the pipeline (flow.json v4-index.onFail): the anchor is emitted ok:false
// and v6-summary reports it, exactly like v5-demo.

import { VariantContext } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.js';
import { groupIndexTag } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vTemplates.js';
import { VGateIssue } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v1-bootstrap/gate.js';

export function runIndexGate(indexTs: string, ctx: VariantContext): VGateIssue[] {
  const issues: VGateIssue[] = [];

  if (!indexTs.trim()) {
    issues.push({ code: 'no_content', message: 'index.ts is empty' });
    return issues;
  }
  if (indexTs.includes('```')) {
    issues.push({ code: 'fenced', message: 'index.ts must be raw TypeScript, without markdown fences' });
  }

  const headerRef = `_${ctx.theme.project}_/l2/molecules/${ctx.variant.group}/index.ts`;
  if (!indexTs.includes(headerRef)) {
    issues.push({ code: 'header', message: `index.ts header must reference ${headerRef}` });
  }

  const indexTag = groupIndexTag(ctx);
  if (!indexTs.includes(`@customElement('${indexTag}')`)) {
    issues.push({ code: 'custom_element', message: `index.ts must declare @customElement('${indexTag}')` });
  }

  // The molecule this run created must be registered and shown in the showcase.
  if (!indexTs.includes(`/l2/molecules/${ctx.variant.group}/${ctx.variant.shortName}'`)) {
    issues.push({ code: 'variant_import', message: `index.ts must import the variant module '${ctx.variant.shortName}'` });
  }
  if (!indexTs.includes(ctx.variant.tag)) {
    issues.push({ code: 'variant_tag', message: `index.ts must reference the variant tag ${ctx.variant.tag}` });
  }

  // The showcase page container must carry the theme background — otherwise the
  // themed molecules render on the skill's neutral surfaces (glass is invisible
  // on white). Same normalization as the demo gate.
  const bgCss = ctx.theme.info.background.css.replace(/\s+/g, ' ').replace(/;$/, '').trim();
  if (bgCss && !indexTs.replace(/\s+/g, ' ').includes(bgCss)) {
    issues.push({ code: 'background', message: `index.ts page container must carry the theme background: '${ctx.theme.info.background.css}'` });
  }

  return issues;
}
