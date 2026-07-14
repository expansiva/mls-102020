/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/materialize/agentCfeMaterializePhase.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Two prompt modes handled by ONE agent (discriminated by the `mode` field in the prompt JSON):
// - default (phase): hosts the materialization fan-out under itself plus a 'verify' step
//   unlocked by the fan-out planId. The phase step only completes after fanout + verify + any
//   repair steps (deferred completion), preserving the phase barrier for downstream dependencies.
// - 'verify' (no LLM): re-checks every item artifact on disk (content + compile + typecheck test)
//   and runs ONE bounded repair round with the compiler error in context (specAuraForge §11).
//   Second round still broken -> completed with a CLI-materialization pending trace.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { createAddStepIntent, createAgentStepPayload, createUpdateStatusIntent } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';
import {
  buildCompileRepairHint,
  buildMissingCodeRepairHint,
  evaluateGeneratedPageQuality,
  parseDefs,
  testPathForOutputPath,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';
import {
  compileMlsPathAndGetErrors,
  getContentByMlsPath,
  type GenStepArgs,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';

interface MaterializePhaseArgs {
  planId: string;
  fanoutPlanId: string;
  title: string;
  fanoutTitle: string;
  items: GenStepArgs[];
  maxParallel?: number;
}

interface MaterializeVerifyArgs {
  planId: string;
  items: GenStepArgs[];
  attempt: number;
}

interface BrokenItem {
  item: GenStepArgs;
  outputPath: string | null;
  errors: string[];
  warnings: string[];
  typecheck: 'not-applicable' | 'passed' | 'failed';
}

const AGENT_NAME = 'agentCfeMaterializePhase';
// Bounded repair rounds after the initial fan-out (verify attempt 1). Set to 2 so the Studio's
// effective budget (fan-out + 2 repairs = 3 tries) matches the CLI (nodejsMaterializeL2), which
// converges on typical compile errors by feeding the tsc output back into the prompt.
const MATERIALIZE_REPAIR_ROUNDS = 2;

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/materialize',
    agentDescription: 'Launch one sequential materialization phase after its dependency barrier is complete',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const parsed = parsePromptRecord(step.prompt);
    // Verify mode runs compile checks with no LLM and returns its intents directly.
    if (readString(parsed.mode) === 'verify') {
      return await runVerify(context, parentStep, step, hookSequential, parseVerifyArgs(parsed));
    }

    const args = parsePhaseArgs(parsed);
    if (args.items.length === 0) {
      return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'no materialization items in phase')];
    }

    const fanout = createFanoutStep(args.fanoutPlanId, args.fanoutTitle, args.items.length);
    const parallelArgs = args.items.map(item => JSON.stringify(item));
    // Verify step (no LLM): unlocked when the fan-out host completes; checks the artifacts on
    // disk because fan-out children never return 'failed' (they complete with a
    // 'MATERIALIZE-FAILED: ' trace — see agentCfeMaterializeGen and skills/collab_messages.md).
    // Hosted under this phase step so the phase barrier covers fanout + verify + repairs.
    const verifyPlanId = `${args.planId}-verify`;
    const verify = createAgentStepPayload(
      verifyPlanId,
      AGENT_NAME,
      `Verify ${args.title}`,
      { mode: 'verify', planId: verifyPlanId, items: args.items, attempt: 1 },
      [args.fanoutPlanId],
      'sequential',
      'waiting_dependency',
    );
    const trace = `queued ${args.items.length} materialization item(s)`;
    return [
      createAddStepIntent(context, step, fanout, parallelArgs, args.maxParallel ?? 5),
      createAddStepIntent(context, step, verify),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

// Verify mode (no LLM): each item is BROKEN when its outputPath content is missing/empty, the
// output compile reports errors, or the companion typecheck test file (when present) fails to
// compile. Broken items get ONE repair round: normal agentCfeMaterializeGen steps (outside the
// fan-out) with attempt=2 and the compiler error as repairHint, which flows into
// buildHumanPrompt through the existing parseGenStepArgs plumbing.
async function runVerify(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args: MaterializeVerifyArgs): Promise<mls.msg.AgentIntent[]> {
  const checkedItems: BrokenItem[] = [];
  for (const item of args.items) {
    const checked = await verifyItem(item);
    checkedItems.push(checked);
  }
  const broken = checkedItems.filter(checked => checked.errors.length > 0);

  if (broken.length === 0) {
    const trace = checkedItems.map(checked => {
      const warnings = checked.warnings.length ? `; UX warnings: ${checked.warnings.join(' | ')}` : '';
      return `${checked.item.planId}: ${checked.typecheck}${warnings}`;
    }).join('; ');
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `all ${args.items.length} materialization item(s) verified; typechecks: ${trace}`)];
  }

  const summary = broken.map(entry => `${entry.item.planId}: ${entry.errors[0]}`).join('\n');
  if (args.attempt > MATERIALIZE_REPAIR_ROUNDS) {
    // The generated artifacts can be repaired by the CLI after this task. Do not fail the whole
    // changeFrontend tree merely because Studio's bounded materialization repair was exhausted.
    return [createUpdateStatusIntent(
      context,
      parentStep,
      step,
      hookSequential,
      'completed',
      `MATERIALIZE-CLI-PENDING: repair budget exhausted (${MATERIALIZE_REPAIR_ROUNDS}/${MATERIALIZE_REPAIR_ROUNDS}). Complete materialization with the CLI:\n${summary}`,
    )];
  }

  // Anchor new steps on a non-terminal agent step (the phase step stays in_progress while its
  // children are open thanks to deferred completion; fall back if it was auto-completed).
  const nextAttempt = args.attempt + 1;
  const roundLabel = `${nextAttempt - 1}/${MATERIALIZE_REPAIR_ROUNDS}`;
  const anchor = findMutableParentStep(context, parentStep);
  const repairs = broken.map(entry => createAddStepIntent(context, anchor, createAgentStepPayload(
    `${entry.item.planId}-repair-${nextAttempt}`,
    'agentCfeMaterializeGen',
    `Repair ${entry.item.planId} (${roundLabel})`,
    { planId: entry.item.planId, defPath: entry.item.defPath, attempt: nextAttempt, repairHint: buildRepairHint(entry) },
    [],
    'sequential',
    'waiting_human_input',
  )));
  const nextVerifyPlanId = `${args.planId}-v${nextAttempt}`;
  const nextVerify = createAddStepIntent(context, anchor, createAgentStepPayload(
    nextVerifyPlanId,
    AGENT_NAME,
    'Verify materialization (after repair)',
    { mode: 'verify', planId: nextVerifyPlanId, items: broken.map(entry => entry.item), attempt: nextAttempt },
    broken.map(entry => `${entry.item.planId}-repair-${nextAttempt}`),
    'sequential',
    'waiting_dependency',
  ));
  // Intent ORDER matters (parent auto-completion sweep): open steps first, completed status last.
  return [
    ...repairs,
    nextVerify,
    createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `${broken.length} broken item(s), repair round ${roundLabel} started:\n${summary}`),
  ];
}

async function verifyItem(item: GenStepArgs): Promise<BrokenItem> {
  const defsContent = await getContentByMlsPath(item.defPath);
  const pipelineItem = defsContent ? parseDefs(defsContent).item : null;
  if (!pipelineItem) return { item, outputPath: null, errors: [`pipeline not found in defs: ${item.defPath}`], warnings: [], typecheck: 'not-applicable' };

  const outputPath = pipelineItem.outputPath;
  const content = await getContentByMlsPath(outputPath);
  if (!content || !content.trim()) return { item, outputPath, errors: [`generated file missing or empty: ${outputPath}`], warnings: [], typecheck: 'not-applicable' };

  const errors = [...await compileMlsPathAndGetErrors(outputPath)];
  const warnings: string[] = [];
  const testPath = testPathForOutputPath(outputPath);
  const testContent = await getContentByMlsPath(testPath);
  const typecheckErrors = testContent && testContent.trim() ? await compileMlsPathAndGetErrors(testPath) : [];
  errors.push(...typecheckErrors);
  if (pipelineItem.type === 'l2_page' && defsContent) {
    const sharedDefsPath = sharedDefsPathForPageOutput(outputPath);
    const sharedDefs = sharedDefsPath ? await getContentByMlsPath(sharedDefsPath) : null;
    if (!sharedDefs) {
      warnings.push(`shared defs missing for UX validation: ${sharedDefsPath || outputPath}`);
    } else {
      // These rules diagnose the page/layout contract. This materialization phase can only rewrite
      // .ts, never its .defs.ts; treating a defs-only issue as a repairable error loops until the
      // budget is exhausted. Keep the result auditable in the trace and let the create-page stage
      // own a future layout regeneration.
      const quality = evaluateGeneratedPageQuality(parseDefs(defsContent).data, parseDefs(sharedDefs).data, content);
      const failures = quality.checks.filter(check => !check.passed);
      errors.push(...failures.filter(check => check.scope === 'render').map(check => `UX render: ${check.message}`));
      warnings.push(...failures.filter(check => check.scope === 'layout').map(check => `UX layout: ${check.message}`));
      warnings.push(`UX quality ${quality.passed ? 'PASS' : 'FAIL'} page=${quality.pageId} template=${quality.templateId || 'unknown'} checks=${quality.checks.length} failures=${failures.length}`);
    }
  }
  return { item, outputPath, errors, warnings, typecheck: testContent && testContent.trim() ? (typecheckErrors.length ? 'failed' : 'passed') : 'not-applicable' };
}


function buildRepairHint(entry: BrokenItem): string {
  const lines = entry.errors.slice(0, 8);
  if (!entry.outputPath) return lines.join('\n');
  if (lines[0]?.startsWith('generated file missing')) return buildMissingCodeRepairHint(entry.outputPath, lines[0]);
  return buildCompileRepairHint(entry.outputPath, lines);
}

function sharedDefsPathForPageOutput(outputPath: string): string | null {
  const match = outputPath.match(/^(.*\/web)\/(?:desktop|mobile)\/page\d+\/([^/]+)\.ts$/);
  return match ? `${match[1]}/shared/${match[2]}.defs.ts` : null;
}

// Local copy of the ns3 findMutableParentStep pattern (skills/collab_messages.md): if the
// original parent was auto-completed by setStepCompletedIfChildrenCompleted, anchor new steps
// on the nearest non-terminal agent step (owner parent, then root).
function findMutableParentStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep): mls.msg.AIAgentStep {
  const steps = getAllSteps(context.task?.iaCompressed?.nextSteps);
  const current = steps.find(item => item.stepId === parentStep.stepId) || null;
  if (isMutableAgentStep(current)) return current;

  const owner = steps.find(item =>
    item.nextSteps?.some(child => child.stepId === parentStep.stepId) ||
    item.interaction?.payload?.some(child => child.stepId === parentStep.stepId)) || null;
  if (isMutableAgentStep(owner)) return owner;

  const root = context.task?.iaCompressed?.nextSteps?.[0] || null;
  if (isMutableAgentStep(root)) return root;

  return parentStep;
}

function isMutableAgentStep(step: mls.msg.AIPayload | null): step is mls.msg.AIAgentStep {
  return step?.type === 'agent' && step.status !== 'completed' && step.status !== 'failed';
}

function parsePromptRecord(prompt: string | undefined): Record<string, unknown> {
  if (!prompt) throw new Error('missing phase prompt');
  const parsed = JSON.parse(prompt);
  if (!isRecord(parsed)) throw new Error('phase prompt must be an object');
  return parsed;
}

function parsePhaseArgs(parsed: Record<string, unknown>): MaterializePhaseArgs {
  const planId = readString(parsed.planId);
  const fanoutPlanId = readString(parsed.fanoutPlanId) || `${planId}-fanout`;
  const title = readString(parsed.title);
  const fanoutTitle = readString(parsed.fanoutTitle) || title;
  const items = Array.isArray(parsed.items) ? parsed.items.map(readGenStepArgs) : [];
  if (!planId) throw new Error('phase prompt missing planId');
  if (!title) throw new Error('phase prompt missing title');
  return {
    planId,
    fanoutPlanId,
    title,
    fanoutTitle,
    items,
    maxParallel: typeof parsed.maxParallel === 'number' ? parsed.maxParallel : undefined,
  };
}

function parseVerifyArgs(parsed: Record<string, unknown>): MaterializeVerifyArgs {
  const planId = readString(parsed.planId);
  if (!planId) throw new Error('verify prompt missing planId');
  const items = Array.isArray(parsed.items) ? parsed.items.map(readGenStepArgs) : [];
  const attempt = typeof parsed.attempt === 'number' && Number.isInteger(parsed.attempt) ? parsed.attempt : 1;
  return { planId, items, attempt };
}

function readGenStepArgs(value: unknown): GenStepArgs {
  if (!isRecord(value)) throw new Error('phase item must be an object');
  const planId = readString(value.planId);
  const defPath = readString(value.defPath);
  if (!planId || !defPath) throw new Error('phase item missing planId or defPath');
  return { planId, defPath };
}

function createFanoutStep(planId: string, title: string, total: number): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: {
      input: [{ type: 'system', content: '<!-- modelType: codehigh -->' }],
      cost: 0,
      trace: [`queued ${total} materialization item(s)`],
      payload: null,
    },
    stepTitle: title,
    status: 'in_progress',
    nextSteps: [],
    agentName: 'agentCfeMaterializeGen',
    prompt: JSON.stringify({ planId }),
    rags: [],
    planning: { planId, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
  } as any;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
