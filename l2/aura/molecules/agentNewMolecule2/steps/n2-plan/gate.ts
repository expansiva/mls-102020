/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n2-plan/gate.ts" enhancement="_blank"/>

// n2-plan gate (pure — unit-testable). Two halves, on purpose:
//
// - normalizeNm2Plan COERCES what code can decide better than the model: the destination project,
//   the group folder, the `ml-` prefix, the theme suffix and the whole fileReference (rebuilt from
//   parts) plus the derived tag. The model proposes a BASE NAME and the requirements; it never
//   assembles a path. This kills the "model forgot the suffix / wrote the wrong project" class of
//   failure instead of asking a gate to catch it.
// - runNm2PlanGate validates what code must NOT invent: a description, at least one functional
//   requirement, a KNOWN group folder, and no collision with existing artifacts.
//
// The gate runs TWICE: on the model's proposal, and again on the data the human confirmed at the
// checkpoint (the widget lets them edit the reference, so the group can change).

import { MoleculeContext, themeSuffix } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';
import { MoleculePlan } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';
import { NmGateIssue, NmKnownGroup } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n1-bootstrap/gate.js';
import { parseMlsFileReference, tagFromFileReference } from '/_102020_/l2/aura/molecules/shared/moleculeTemplates.js';
import { nmNormalizeLayoutConfig, runNmLayoutConfigGate } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmLayoutAxes.js';

export const NM_NAME_PREFIX = 'ml-';

// What the model returns inside the clarification json (plus whatever the human edited).
export interface NmPlanCandidate {
  shortName?: unknown;
  fileReference?: unknown;
  description?: unknown;
  prompt?: unknown;
  functionalRequirements?: unknown;
  visualRequirements?: unknown;
  layoutConfig?: unknown;
}

export interface NmNormalizedPlan {
  plan: MoleculePlan;
  coercions: string[];   // what code decided instead of the model — recorded in the trace
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => asString(item)).filter(Boolean);
}

// 'ml-KPI Card' / 'kpiCard' / 'ml-kpi-card' all become 'ml-kpi-card'.
export function normalizeMoleculeName(raw: string): string {
  const kebab = raw
    .trim()
    .replace(/\.ts$/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const withoutPrefix = kebab.replace(/^(ml-)+/, '');
  return withoutPrefix ? `${NM_NAME_PREFIX}${withoutPrefix}` : '';
}

export function normalizeNm2Plan(candidate: NmPlanCandidate, ctx: MoleculeContext): NmNormalizedPlan {
  const coercions: string[] = [];
  const suffix = themeSuffix(ctx);

  // A fileReference, when present (the human edited one), wins over shortName for the NAME —
  // but the project and the group folder still come from it, validated by the gate.
  const fromReference = parseMlsFileReference(asString(candidate.fileReference));
  const rawName = fromReference ? fromReference.shortName : asString(candidate.shortName);

  let shortName = normalizeMoleculeName(rawName);
  if (shortName && shortName !== rawName) coercions.push(`name '${rawName}' -> '${shortName}'`);

  if (suffix && shortName && !shortName.endsWith(suffix)) {
    shortName = `${shortName}${suffix}`;
    coercions.push(`theme suffix appended -> '${shortName}'`);
  }

  // The molecule is ALWAYS created in the current project — a reference pointing elsewhere is
  // coerced, never honored (the old flow wrote wherever the model's header said).
  if (fromReference && fromReference.project !== ctx.destination.project) {
    coercions.push(`project ${fromReference.project} -> ${ctx.destination.project} (destination)`);
  }
  // The group folder, in contrast, IS honored: moving the molecule to another group is a legitimate
  // human edit at the checkpoint. The gate then requires it to be a known group.
  const folderFromReference = fromReference ? fromReference.folder.split('/').pop() || '' : '';
  const groupFolder = folderFromReference || ctx.destination.groupFolder;

  const fileReference = `_${ctx.destination.project}_/l2/molecules/${groupFolder}/${shortName}.ts`;

  const layout = nmNormalizeLayoutConfig(candidate.layoutConfig);
  for (const item of layout.dropped) coercions.push(`layoutConfig ${item}`);

  const plan: MoleculePlan = {
    schemaVersion: 1,
    confirmedAt: '',
    fileReference,
    shortName,
    tag: tagFromFileReference(fileReference),
    group: groupFolder,
    groupCanonical: ctx.destination.groupCanonical,
    description: asString(candidate.description),
    prompt: asString(candidate.prompt) || ctx.userPrompt,
    functionalRequirements: asStringList(candidate.functionalRequirements),
    visualRequirements: asStringList(candidate.visualRequirements),
    layoutConfig: layout.config,
  };
  return { plan, coercions };
}

export interface NmPlanGateOptions {
  known: NmKnownGroup[];
  collisions: string[];   // display paths of artifacts that already exist for this name
}

export function runNm2PlanGate(plan: MoleculePlan, ctx: MoleculeContext, options: NmPlanGateOptions): NmGateIssue[] {
  const issues: NmGateIssue[] = [];
  const suffix = themeSuffix(ctx);

  if (!plan.shortName) {
    issues.push({ code: 'name_missing', message: 'no molecule name was proposed' });
  } else if (!plan.shortName.startsWith(NM_NAME_PREFIX)) {
    issues.push({ code: 'name_prefix', message: `molecule name '${plan.shortName}' must start with '${NM_NAME_PREFIX}'` });
  }

  if (suffix && plan.shortName && !plan.shortName.endsWith(suffix)) {
    issues.push({
      code: 'theme_suffix',
      message: `this project has a theme, so the name must end with '${suffix}' — got '${plan.shortName}'`,
    });
  }

  const parsed = parseMlsFileReference(plan.fileReference);
  if (!parsed) {
    issues.push({ code: 'reference_shape', message: `invalid fileReference '${plan.fileReference}' — expected _<project>_/l2/molecules/<group>/<name>.ts` });
  } else {
    if (parsed.extension !== '.ts') {
      issues.push({ code: 'reference_shape', message: `the fileReference must point at the .ts — got '${parsed.extension}'` });
    }
    if (!/^molecules\/[a-z0-9]+$/.test(parsed.folder)) {
      issues.push({
        code: 'reference_shape',
        message: `the folder must be 'molecules/<group in lowercase>' — got '${parsed.folder}'`,
      });
    }
    if (parsed.project !== ctx.destination.project) {
      issues.push({ code: 'reference_project', message: `the molecule must be created in the current project (mls-${ctx.destination.project}) — got mls-${parsed.project}` });
    }
  }

  // The group is derived from the folder (decision Q1), so an edited path must still land on a
  // group that exists — otherwise the molecule has no contract to follow.
  if (!options.known.some(item => item.name.toLowerCase() === plan.group.toLowerCase())) {
    issues.push({ code: 'group_unknown', message: `'${plan.group}' is not a known molecule group` });
  }

  const expectedTag = tagFromFileReference(plan.fileReference);
  if (!expectedTag) {
    issues.push({ code: 'tag_missing', message: 'the tag could not be derived from the fileReference' });
  } else if (plan.tag !== expectedTag) {
    issues.push({ code: 'tag_mismatch', message: `the tag must be derived from the path: expected '${expectedTag}', got '${plan.tag}'` });
  }

  if (!plan.description) {
    issues.push({ code: 'description', message: 'the molecule needs a description — it is what the .defs.ts Objective is written from' });
  }

  if (!plan.functionalRequirements.length) {
    issues.push({ code: 'requirements', message: 'at least one functional requirement is required — the .defs.ts Responsibilities come from them' });
  }

  // A requirement phrased as a question means the model did not decide; the .defs.ts would carry
  // the question into the contract.
  for (const requirement of [...plan.functionalRequirements, ...plan.visualRequirements]) {
    if (requirement.endsWith('?')) {
      issues.push({ code: 'requirement_question', message: `requirements must be declarative, not questions: '${requirement}'` });
    }
  }

  for (const collision of options.collisions) {
    issues.push({
      code: 'collision',
      message: `${collision} already exists — New Molecule never overwrites; use Improve Molecule, or choose another name`,
    });
  }

  // The layout axes the molecule candidates for (decision D7). The group is taken from the CONFIRMED
  // plan, so moving the molecule to another group at the checkpoint re-validates its axes against the
  // new group.
  issues.push(...runNmLayoutConfigGate(plan.layoutConfig || {}, canonicalGroupName(plan, options.known)));

  return issues;
}

// The vocabulary is keyed by the canonical group name; an edited fileReference only carries the
// lowercase folder, so the canonical spelling is recovered from the known groups.
function canonicalGroupName(plan: MoleculePlan, known: NmKnownGroup[]): string {
  const match = known.find(item => item.name.toLowerCase() === plan.group.toLowerCase());
  return match ? match.name : plan.groupCanonical;
}
