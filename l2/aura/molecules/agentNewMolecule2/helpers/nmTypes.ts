/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.ts" enhancement="_blank"/>

// Shared types + plan ids for agentNewMolecule2. See flow.json for the contract each of these
// serves. Pure — no runtime imports, so gates and tests can use them freely.

// Constants the deterministic templates need. They live HERE, not in nmFs, because nmFs imports
// the 102027 stor runtime — a pure module must never reach it, or its tests cannot load.
export const NM_TS_ENHANCEMENT = '_102020_/l2/enhancementAura';
export const NM_LESS_ENHANCEMENT = '_102020_/l2/enhancementStyleAura';

// The molecule base class lives in mls-102033 (analise-fluxo-new-molecule-atual.md §2) — reading
// it from 102040 would inject the wrong contract.
export const NM_BASE_PROJECT = 102033;
export const NM_BASE_CLASS = 'MoleculeAuraElement';
export const NM_BASE_IMPORT = '/_102033_/l2/moleculeBase.js';

export const NM_PLAN_IDS = [
  'n1-bootstrap',
  'n2-plan',
  'n3-defs',
  'n4-render',
  'n5-less',
  'n6-demo',
  'n7-index',
  'n8-summary',
] as const;

export type NmPlanId = typeof NM_PLAN_IDS[number];

// The five artifacts of the contract (todo/analise-fluxo-new-molecule-atual.md §3).
export type NmArtifactKind = 'defs' | 'ts' | 'less' | 'html' | 'index';

// What the root's cheap classifier returns. `runKey` names the l4 work folder for this run; it
// is NOT the molecule name (n2-plan proposes that, and the user may edit it at the checkpoint).
// `titles` are the localized step titles, so the tree reads in the user's language.
export interface NmRootPlan {
  validInput: boolean;
  invalidReason?: string;
  group: string;
  runKey: string;
  userLanguage: string;
  titles: Record<NmPlanId, string>;
}

// The confirmed plan (l4/agentNewMolecule2/<runKey>/plan.json), written when the human confirms
// the checkpoint. Identity lives HERE, not in context.json, because the name depends on the
// plan and on the user's edit.
export interface MoleculePlan {
  schemaVersion: 1;
  confirmedAt: string;
  fileReference: string;        // '_<dest>_/l2/molecules/<groupFolder>/<shortName>.ts'
  shortName: string;            // 'ml-...' (with the theme suffix when themed)
  tag: string;                  // derived from the fileReference — never authored
  group: string;                // lowercase folder
  groupCanonical: string;       // skills/index name, e.g. 'groupViewMetric'
  description: string;
  prompt: string;
  functionalRequirements: string[];
  visualRequirements: string[];
  // Layout-rule axes this molecule candidates for, confirmed at the checkpoint. Written into the
  // .defs.ts as `export const layoutConfig`. An OMITTED axis is a wildcard, so an empty bag makes the
  // molecule the group's fallback pick — correct only for the 5 groups with no governing axis
  // (decision D7; analysis in todo/analise-layoutconfig-new-molecule-2.md).
  layoutConfig: Record<string, string>;
}

export interface NmGateResult {
  ok: boolean;
  errors: string[];             // '<code>: <message>' — the code is the stable part
}

export function nmGateOk(): NmGateResult {
  return { ok: true, errors: [] };
}

export function nmGateFail(errors: string[]): NmGateResult {
  return { ok: false, errors };
}
