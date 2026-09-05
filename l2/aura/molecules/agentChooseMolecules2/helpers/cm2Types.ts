/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Types.ts" enhancement="_blank"/>

// Types, constants and the PURE helpers of agentChooseMolecules2. No I/O beyond the tiny stor read for
// this agent's own prompt/schema files (readCm2AgentText) — everything else here is pure.
//
// Unlike agentChooseMolecules (the probe), there is NO l4 artifact anywhere in this agent: c1's answer
// and every c2's answer travel ONLY through the task tree's step `result` field (cm2ReadStepResult),
// the same mechanism the probe already uses to read c1 from its fan-out — never a file on disk. The
// only file this agent ever writes is the target `.defs.ts` itself (steps/c3-patch).

import { NmFileInfo, isRecord, parseMaybeJson, readStorText } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';

export const CM2_AGENT_NAME = 'agentChooseMolecules2';
export const CM2_AGENT_FOLDER = 'aura/molecules/agentChooseMolecules2';
export const CM2_AGENT_PROJECT = 102020;

/** One retry with the gate errors in the prompt, same budget as the probe. */
export const CM2_MAX_ATTEMPTS = 2;

export const CM2_PLAN_C1 = 'c1-groups';
export const CM2_PLAN_FANOUT = 'c1r-fanout';
export const CM2_PLAN_C3 = 'c3-patch';

/** 'c1-groups' -> 'c1-done'. The c2 steps use cm2GroupDoneAnchor instead — see agentChooseMolecules
 * for why splitting on '-' would collide every group onto the same 'c2-done'. */
export function cm2DoneAnchor(planId: string): string {
  return `${planId.split('-')[0]}-done`;
}

export function cm2GroupFolder(groupName: string): string {
  return (groupName || '').trim().toLowerCase();
}

export function cm2GroupPlanId(groupName: string): string {
  return `c2-${cm2GroupFolder(groupName)}`;
}

export function cm2GroupDoneAnchor(groupName: string): string {
  return `${cm2GroupPlanId(groupName)}-done`;
}

// ---- this agent's own files (prompt.md, schemas), in its 102020 folder ----

export function cm2AgentFile(folder: string, shortName: string, extension: string): NmFileInfo {
  const sub = folder ? `${CM2_AGENT_FOLDER}/${folder}` : CM2_AGENT_FOLDER;
  return { project: CM2_AGENT_PROJECT, level: 2, folder: sub, shortName, extension };
}

export async function readCm2AgentText(folder: string, shortName: string, extension: string, required = false): Promise<string> {
  return readStorText(cm2AgentFile(folder, shortName, extension), required);
}

// ---- step args, threaded step-to-step in the prompt JSON — never in longTermMemory or a file ----

export interface Cm2StepArgs {
  planId?: string;
  catalogProject?: number;
  target?: string;
  group?: string;
  retryAttempt?: number;
  retryContext?: string;
}

export function cm2ParseStepArgs(value: unknown): Cm2StepArgs {
  const parsed = parseMaybeJson(value);
  if (!isRecord(parsed)) return {};
  return {
    planId: typeof parsed.planId === 'string' ? parsed.planId : undefined,
    catalogProject: typeof parsed.catalogProject === 'number' ? parsed.catalogProject : undefined,
    target: typeof parsed.target === 'string' ? parsed.target : undefined,
    group: typeof parsed.group === 'string' ? parsed.group : undefined,
    retryAttempt: typeof parsed.retryAttempt === 'number' ? parsed.retryAttempt : undefined,
    retryContext: typeof parsed.retryContext === 'string' ? parsed.retryContext : undefined,
  };
}

// ---- reading a prior step's result from the TASK TREE (never a file) ----

export interface Cm2GroupsResult {
  catalogProject: number;
  target: string;
  regions: Array<{ region: string; need: string; group: string | null; reason: string }>;
  groups: string[];
}

export interface Cm2GroupResult {
  group: string;
  ok: boolean;
  choices: Array<{ region: string; tag: string | null }>;
  /** The group's usage.ts reference (level 3), as published by its index.defs.ts — carried forward so
   * c3-patch never has to re-read the group catalog just to find it. '' when the group publishes none. */
  usageContract: string;
}

/**
 * TWO REFERENCE FORMS EXIST AND THEY ARE NOT INTERCHANGEABLE.
 *
 * - IMPORT form: '/_102020_/l2/aura/molecules/skills/groupEnterMoney/usage' — leading slash, NO
 *   extension. What `await import()` takes, and what the catalog itself publishes in `usageContract`.
 * - PIPELINE form: '_102020_/l2/aura/molecules/skills/groupEnterMoney/usage.ts' — NO leading slash,
 *   WITH extension. What `pipeline[].skills` / `pipeline[].dependsFiles` take.
 *
 * ⚠️ MEASURED (l2/{module}/trace/frontend-materialize-context, 2026-09-03): writing the import form
 * into a pipeline array silently drops the entry. Of 6 skills requested, only the 2 already in pipeline
 * form were read; of 8 dependsFiles, only 2. agentCfeMaterializeGen's readSections/readContextSections
 * skip an entry whose content comes back empty (`if (!content) continue`), so a usage contract that
 * never reached the model looks EXACTLY like one that was never listed. Both defects were present at
 * once in every failing entry (slash AND missing extension), so the trace alone cannot say which one
 * did it — but the platform's own generator settles the target form: across every .defs.ts it wrote in
 * a real client project, not one pipeline reference carries a leading slash.
 *
 * cm2PipelineRef converts, and every reference this agent puts in a pipeline array goes through it.
 */
const CM2_FULL_EXTENSIONS = ['.ts', '.md', '.json', '.less', '.html'];

export function cm2PipelineRef(reference: string): string {
  const trimmed = (reference || '').trim();
  if (!trimmed) return '';
  const withoutSlash = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  // '.defs' is a HALF extension in this platform ('index.defs' is shortName 'index' + '.defs.ts'), so
  // it must still get the '.ts' — hence a full-extension allowlist rather than a bare /\.\w+$/ test.
  return CM2_FULL_EXTENSIONS.some(extension => withoutSlash.endsWith(extension)) ? withoutSlash : `${withoutSlash}.ts`;
}

/** '_102040_/l2/molecules/groupselectone/ml-select-one.ts' (PIPELINE form — see cm2PipelineRef) from
 * catalogProject + a published tag; always derivable, since the catalog's own molecules[].tag proves
 * the file exists. */
export function cm2ComponentReference(catalogProject: number, tag: string): string {
  const separator = tag.indexOf('--');
  const groupFolder = separator < 0 ? tag : tag.slice(0, separator);
  const shortName = separator < 0 ? tag : tag.slice(separator + 2);
  return cm2PipelineRef(`_${catalogProject}_/l2/molecules/${groupFolder}/${shortName}`);
}

/** The result JSON of the step whose planning.planId === anchor, or null when it hasn't landed yet. */
export function cm2ReadStepResult<T>(context: mls.msg.ExecutionContext, anchor: string): T | null {
  const found = getAllSteps(context.task?.iaCompressed?.nextSteps).find(
    item => item.type === 'result' && item.planning?.planId === anchor,
  ) as mls.msg.AIResultStep | undefined;
  const parsed = parseMaybeJson(found?.result);
  return isRecord(parsed) ? (parsed as T) : null;
}

export function cm2ReadC1Result(context: mls.msg.ExecutionContext): Cm2GroupsResult | null {
  return cm2ReadStepResult<Cm2GroupsResult>(context, cm2DoneAnchor(CM2_PLAN_C1));
}

export function cm2ReadGroupResult(context: mls.msg.ExecutionContext, group: string): Cm2GroupResult | null {
  return cm2ReadStepResult<Cm2GroupResult>(context, cm2GroupDoneAnchor(group));
}
