/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.ts" enhancement="_blank"/>

// The context artifact contract (l4/agentNewMolecule2/<runKey>/context.json).
// Written ONCE by n1-bootstrap; every later step reads it from disk and never re-derives
// (decision D1). Pure types + small pure helpers.
//
// Deliberate split: context.json holds everything that does NOT depend on the molecule's name;
// the name, the tag and the requirements live in plan.json, because they are decided by n2-plan
// and may be edited by the human at the checkpoint.

import { VThemeInfo } from '/_102020_/l2/aura/molecules/shared/vThemeContract.js';

export interface MoleculeContext {
  schemaVersion: 1;
  createdAt: string;
  runKey: string;
  userPrompt: string;
  userLanguage: string;
  destination: {
    project: number;
    groupFolder: string;      // lowercase, as it appears on disk
    groupCanonical: string;   // skills/index name, e.g. 'groupViewMetric'
  };
  groupSkill: {
    description: string;
    reference: string;        // skillReference (creation skill)
    usageReference: string;   // skillUsageReference (feeds the demo step)
  };
  // The molecule base class, read from mls-102033 (NOT 102040) — the old flow injects the same
  // file into its planner and materializer.
  base: {
    reference: string;        // '_102033_/l2/moleculeBase.ts'
    className: string;        // 'MoleculeAuraElement'
    importPath: string;       // '/_102033_/l2/moleculeBase.js'
  };
  theme: {
    present: boolean;
    reference: string | null; // '_<dest>_/l2/skills/theme.ts'
    info: VThemeInfo | null;
  };
}

// 'glass (-glass)' for the checkpoint's read-only theme line (decision Q3); '' with no theme,
// so the widget shows its own "none" label instead of a fake value.
export function themeLabel(ctx: MoleculeContext): string {
  if (!ctx.theme.present || !ctx.theme.info) return '';
  const info = ctx.theme.info;
  return `${info.displayName || info.name}${info.suffix ? ` (${info.suffix})` : ''}`;
}

// The suffix a themed molecule's shortName must end with; '' when the project has no theme.
export function themeSuffix(ctx: MoleculeContext): string {
  return ctx.theme.present && ctx.theme.info ? ctx.theme.info.suffix || '' : '';
}

export function moleculeContextSummary(ctx: MoleculeContext): string {
  const theme = ctx.theme.present && ctx.theme.info ? ctx.theme.info.displayName || ctx.theme.info.name : 'no theme';
  return `${ctx.destination.groupCanonical} in mls-${ctx.destination.project} (${theme})`;
}

// l4 folder name for a run. Kebab, ascii-safe and bounded — it becomes a file path, and the
// model proposes it. Falls back to the group so a useless proposal still produces a valid path.
export function nmRunKey(raw: string, groupFolder: string): string {
  const cleaned = (raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return cleaned || groupFolder || 'run';
}
