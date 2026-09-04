/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n7-index/gate.ts" enhancement="_blank"/>

// n7-index gate (pure — unit-testable). The step regenerates the group's showcase page reusing the
// indexGroupPage skill, so the gate checks STRUCTURAL essentials, not byte shape.
//
// A second failure does NOT block the pipeline (flow.json): the anchor is emitted with ok:false and
// n8-summary reports it. The showcase is a convenience; a molecule that compiles, has a stylesheet
// and has a demo is delivered work.

import { MoleculePlan } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';
import { MoleculeContext } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';
import { NmGateIssue } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n1-bootstrap/gate.js';
import { contractItemsMissing, contractItemsUsed, usageContractItems } from '/_102020_/l2/aura/molecules/shared/usageContract.js';

export interface NmIndexGateOptions {
  indexTag: string;        // 'molecules--<group>--index-<project>'
  groupMolecules: string[]; // every molecule shortName of the group, including the new one
  /** The group's usage skill text (or the loader's degraded placeholder). Empty/degraded skips the check. */
  groupUsageSkill?: string;
}

export function runNm2IndexGate(
  indexTs: string,
  plan: MoleculePlan,
  ctx: MoleculeContext,
  options: NmIndexGateOptions,
): NmGateIssue[] {
  const issues: NmGateIssue[] = [];
  const content = indexTs || '';

  if (!content.trim()) return [{ code: 'empty', message: 'index.ts came out empty' }];
  if (content.includes('```')) {
    issues.push({ code: 'fence', message: 'index.ts must be raw TypeScript, without markdown fences' });
  }

  const headerRef = `_${ctx.destination.project}_/l2/molecules/${plan.group}/index.ts`;
  if (!content.includes(headerRef)) {
    issues.push({ code: 'header', message: `the index.ts header must reference ${headerRef}` });
  }

  if (!content.includes(`@customElement('${options.indexTag}')`)) {
    issues.push({ code: 'custom_element', message: `index.ts must declare @customElement('${options.indexTag}')` });
  }

  // The molecule this run created must be registered AND shown.
  if (!content.includes(`/l2/molecules/${plan.group}/${plan.shortName}`)) {
    issues.push({ code: 'molecule_import', message: `index.ts must import the module '${plan.shortName}'` });
  }
  if (!content.includes(plan.tag)) {
    issues.push({ code: 'molecule_tag', message: `index.ts must reference the tag ${plan.tag}` });
  }

  // The showcase is the group's page: a molecule missing from it is invisible to whoever browses the
  // library. The new molecule is checked above with its own codes, so it is not repeated here.
  const missing = options.groupMolecules.filter(shortName => shortName !== plan.shortName && !content.includes(shortName));
  if (missing.length) {
    issues.push({
      code: 'molecule_missing',
      message: `these molecules of the group are absent from the showcase: ${missing.join(', ')} — the page must list every molecule in the group`,
    });
  }

  // Themed project: the page container must carry the theme background, otherwise the themed
  // molecules render on the skill's neutral surfaces (a translucent style is invisible on white).
  if (ctx.theme.present && ctx.theme.info) {
    const backgroundCss = ctx.theme.info.background.css.replace(/\s+/g, ' ').replace(/;$/, '').trim();
    if (backgroundCss && !content.replace(/\s+/g, ' ').includes(backgroundCss)) {
      issues.push({
        code: 'background',
        message: `the showcase container must carry the theme background: '${ctx.theme.info.background.css}'`,
      });
    }
  }

  // The showcase must demonstrate the molecule's OWN contract (usage skill Properties/Events), not just
  // the mold's envelope (name/value/isEditing/@change). See shared/usageContract.ts for why.
  const contract = usageContractItems(options.groupUsageSkill || '');
  if (contract.size && !contractItemsUsed(content, plan.group, contract).length) {
    const sample = contractItemsMissing(options.groupUsageSkill || '', content, plan.group).slice(0, 5).join(', ');
    issues.push({
      code: 'contract_not_demonstrated',
      message: `the showcase never uses any property or event from the group's usage contract beyond the mold's envelope (name/value/isEditing/@change) — e.g. ${sample}; read the group usage skill's Properties and Events tables and add them to at least one card`,
    });
  }

  return issues;
}
