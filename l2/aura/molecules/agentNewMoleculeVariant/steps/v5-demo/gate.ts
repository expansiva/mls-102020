/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v5-demo/gate.ts" enhancement="_blank"/>

// Demo-page invariants (pure). flow.json v5-demo: retry 1; a persistent
// failure does NOT block the pipeline (v5-done is emitted with ok:false).

import { VariantContext } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.js';
import { VGateIssue } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v1-bootstrap/gate.js';

export function runDemoGate(html: string, ctx: VariantContext): VGateIssue[] {
  const issues: VGateIssue[] = [];
  const content = html || '';

  if (!content.trim()) return [{ code: 'empty', message: 'html is empty' }];
  if (content.includes('```')) issues.push({ code: 'fence', message: 'html contains markdown fences — return raw HTML only' });
  if (/<script[\s>]/i.test(content)) issues.push({ code: 'script', message: 'demo page must not contain <script> tags' });

  const tagUses = content.split(`<${ctx.variant.tag}`).length - 1;
  if (tagUses < 3) {
    issues.push({ code: 'tag_uses', message: `the variant tag <${ctx.variant.tag}> must be exercised at least 3 times (found ${tagUses})` });
  }

  // The page container must provide the theme's background contract
  // (e.g. glass is invisible on white).
  const bgCss = ctx.theme.info.background.css.replace(/\s+/g, ' ').replace(/;$/, '').trim();
  const normalized = content.replace(/\s+/g, ' ');
  if (bgCss && !normalized.includes(bgCss)) {
    issues.push({ code: 'background', message: `the page container must carry the theme background exactly: '${ctx.theme.info.background.css}'` });
  }

  return issues;
}
