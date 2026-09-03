/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n1-bootstrap/gate.ts" enhancement="_blank"/>

// Admission gate for the New Molecule 2 pipeline (pure — unit-testable).
// flow.json: NO retry here; failures are readable and immediate. Two entry points:
// - checkNmGroupChoice: used by the ROOT right after the cheap classification;
// - runNmBootstrapGate: used by n1-bootstrap once the context has been assembled.

import { MoleculeContext } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';

export interface NmGateIssue {
  code: string;
  message: string;
}

export interface NmKnownGroup {
  name: string;
  skillReference?: string;
  skillUsageReference?: string;
}

// The group must exist in skills/index.ts AND have a creation skill. Today only
// `groupnavigatemain` lacks one (31 of 32 groups have it) — decision Q5: fail readably instead of
// generating a molecule with no group contract to follow.
export function checkNmGroupChoice(group: string, known: NmKnownGroup[]): NmGateIssue[] {
  const issues: NmGateIssue[] = [];
  const wanted = (group || '').trim();
  if (!wanted) {
    issues.push({ code: 'group_unknown', message: 'no group was chosen for this molecule' });
    return issues;
  }
  const entry = known.find(item => item.name.toLowerCase() === wanted.toLowerCase());
  if (!entry) {
    issues.push({
      code: 'group_unknown',
      message: `group '${wanted}' is not in skills/index.ts — known groups: ${known.map(item => item.name).join(', ')}`,
    });
    return issues;
  }
  if (!entry.skillReference) {
    issues.push({
      code: 'group_no_skill',
      message: `group '${entry.name}' has no creation skill (skillReference) — a molecule cannot be created without its group contract`,
    });
  }
  return issues;
}

export interface NmBootstrapInputs {
  group: string;
  known: NmKnownGroup[];
  groupSkillLoaded: boolean;      // the creation skill imported and returned a non-empty `skill`
  groupSkillError?: string;
  baseFound: boolean;             // _102033_/l2/moleculeBase.ts readable
  themePresent: boolean;          // l2/skills/theme.ts exists in the destination
  themeErrors: string[];          // vThemeContract errors ([] when valid OR absent)
  destProject: number;
  context: MoleculeContext | null;
}

export function runNmBootstrapGate(inputs: NmBootstrapInputs): NmGateIssue[] {
  const issues: NmGateIssue[] = [...checkNmGroupChoice(inputs.group, inputs.known)];

  if (!issues.length && !inputs.groupSkillLoaded) {
    issues.push({
      code: 'group_skill_empty',
      message: `the creation skill of '${inputs.group}' could not be loaded${inputs.groupSkillError ? `: ${inputs.groupSkillError}` : ''}`,
    });
  }

  // The molecule base class comes from mls-102033. Without it the render has no contract to
  // extend, and the old flow injects the same file — generating blindly is not an option.
  if (!inputs.baseFound) {
    issues.push({
      code: 'base_unreadable',
      message: 'molecule base class not readable at _102033_/l2/moleculeBase.ts — mls-102033 must be a declared dependency of this project',
    });
  }

  // A theme is OPTIONAL (no theme => neutral molecule, exactly like the old flow). A theme that
  // EXISTS but does not satisfy contract v1 is fatal: generating against a broken contract
  // produces artifacts nobody can trust.
  if (inputs.themePresent) {
    for (const themeError of inputs.themeErrors) {
      issues.push({ code: 'theme_invalid', message: `l2/skills/theme.ts is present but invalid — ${themeError}` });
    }
  }

  if (!inputs.destProject) {
    issues.push({ code: 'dest_project', message: 'destination project could not be resolved (mls.actualProject)' });
  }

  const ctx = inputs.context;
  if (ctx) {
    if (!/^[a-z0-9]+$/.test(ctx.destination.groupFolder)) {
      // The tag is derived by kebab-casing the folder, so a camelCase folder would produce a tag
      // that matches no molecule in the library (see shared/moleculeTemplates tests).
      issues.push({ code: 'group_folder', message: `invalid group folder '${ctx.destination.groupFolder}' — it must be the group name in lowercase` });
    }
    if (ctx.theme.present && !ctx.theme.info) {
      issues.push({ code: 'theme_invalid', message: 'theme detected but its themeInfo could not be read' });
    }
    if (ctx.theme.present && ctx.theme.info && !ctx.theme.info.suffix) {
      issues.push({
        code: 'theme_suffix',
        message: 'the theme declares no suffix — a themed molecule needs one to be named apart from the neutral molecule',
      });
    }
  } else if (!issues.length) {
    issues.push({ code: 'context', message: 'context could not be assembled' });
  }

  return issues;
}
