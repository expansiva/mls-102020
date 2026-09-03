/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chRootPlan.ts" enhancement="_blank"/>

// The c0-classify result, as the steps read it back, plus its gate.
//
// c0-classify has no step agent of its own: the ROOT does the cheap classification and its answer
// travels in the root step's own payload (flow.json). Living in helpers/ rather than in the root file
// keeps step -> root -> gate from being a module cycle, and makes a step testable without the root —
// the same decision as agentImproveMolecule2/helpers/imRootPlan.ts.
//
// ⚠️ WHAT THE CLASSIFIER MUST NOT DO: name a group, a molecule or a tag. The probe measures whether the
// CATALOG carries the decision, so a decision leaking in from a cheap call before any level was read
// would corrupt the measurement. The prompt says so; there is nothing here to enforce it, because the
// output has no field that could carry it.

import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { isRecord, parseMaybeJson } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import {
  CH_AGENT_NAME,
  ChGateResult,
  chGateFail,
  chGateOk,
  chIssue,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';

export interface ChRootPlan {
  runKey: string;
  /** The language the USER wrote in — every reason and every summary comes back in it. */
  userLanguage: string;
  title: string;
  titles: Record<string, string>;
  /** false = the prose is not a page/system definition; `reason` says why, in userLanguage. */
  validInput: boolean;
  reason: string;
}

const EMPTY: ChRootPlan = { runKey: '', userLanguage: '', title: '', titles: {}, validInput: false, reason: '' };

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** PURE — the parser of the classifier's output. Everything is defaulted; the gate is what rejects. */
export function normalizeChRootPlan(payload: unknown): ChRootPlan {
  const parsed = parseMaybeJson(payload);
  const record = isRecord(parsed) ? parsed : {};
  const resultRaw = parseMaybeJson(record.result);
  const result = isRecord(resultRaw) ? resultRaw : record;

  const titlesRaw = parseMaybeJson(result.titles);
  const titles: Record<string, string> = {};
  if (isRecord(titlesRaw)) {
    for (const [key, value] of Object.entries(titlesRaw)) {
      const text = str(value);
      if (text) titles[key] = text;
    }
  }

  return {
    runKey: str(result.runKey),
    userLanguage: str(result.userLanguage) || 'pt',
    title: str(result.title),
    titles,
    // Absent means "not classified yet", which is not valid. Only an explicit true passes.
    validInput: result.validInput === true,
    reason: str(result.reason),
  };
}

/** The runKey names an l4 folder, so it is checked before anything writes there. */
export function checkChRootPlan(plan: ChRootPlan): ChGateResult {
  if (!plan.validInput) {
    return chGateFail(chIssue('input_invalid', plan.reason || 'the prose was not accepted as a definition of a page or system'));
  }
  const errors: string[] = [];
  if (!plan.runKey) errors.push(chIssue('runkey_missing', 'no runKey was proposed, and it is the name of the run folder'));
  else if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(plan.runKey)) {
    errors.push(chIssue('runkey_invalid', `runKey '${plan.runKey}' is not a slug — lowercase ascii letters, digits and dashes, up to 40 characters`));
  }
  return errors.length ? chGateFail(...errors) : chGateOk();
}

export function getChRootPlan(context: mls.msg.ExecutionContext): ChRootPlan {
  if (!context.task) throw new Error('[getChRootPlan] task invalid');
  const root = getAllSteps(context.task.iaCompressed?.nextSteps).find(
    item => item.type === 'agent' && (item as mls.msg.AIAgentStep).agentName === CH_AGENT_NAME,
  ) as mls.msg.AIAgentStep | undefined;
  return root ? normalizeChRootPlan(root.interaction?.payload?.[0]) : EMPTY;
}

/**
 * The catalog project named at the entry, or null when the mention carried only prose.
 *
 * It travels in task memory next to the definition, because it is part of what was ASKED — a later step
 * re-reading the mention would have to parse it again, and the c0 classifier must never see it (it would
 * start naming projects, and the probe measures the catalog, not the classifier's memory).
 */
export function getChCatalogArg(context: mls.msg.ExecutionContext): number | null {
  const memory = context.task?.iaCompressed?.longMemory || {};
  // Task memory is Record<string, string>, so the project id travels as text and is read back as a number.
  const raw = memory.catalogProject;
  const project = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(project) && project > 0 ? project : null;
}

/** The definition of the page, verbatim as the user wrote it — published to task memory by the root. */
export function getChDefinition(context: mls.msg.ExecutionContext): string {
  const memory = context.task?.iaCompressed?.longMemory || {};
  const definition = typeof memory.definition === 'string' ? memory.definition : '';
  if (!definition) throw new Error('[getChDefinition] missing definition in task memory');
  return definition;
}

/**
 * Steps locate their l4 artifacts by runKey: their own args first (planted by the root), then task
 * memory, then the root plan — same precedence as the rest of the family, so a step re-run outside the
 * original batch still finds its run.
 */
export function getChRunKey(context: mls.msg.ExecutionContext, stepArgsRunKey?: string): string {
  if (stepArgsRunKey) return stepArgsRunKey;
  const memory = context.task?.iaCompressed?.longMemory || {};
  const fromMemory = typeof memory.runKey === 'string' ? memory.runKey : '';
  if (fromMemory) return fromMemory;
  const plan = getChRootPlan(context);
  if (plan.runKey) return plan.runKey;
  throw new Error('[getChRunKey] runKey not available — the root did not plant it');
}
