/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/materialize/agentCfeMaterializePhase.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Two prompt modes handled by ONE agent (discriminated by the `mode` field in the prompt JSON):
// - default (phase): hosts the materialization fan-out under itself plus a 'verify' step
//   unlocked by the fan-out planId. The phase step only completes after fanout + verify + any
//   repair steps (deferred completion), preserving the phase barrier for downstream dependencies.
// - 'verify' (no LLM): re-checks every item artifact on disk (content + compile + typecheck test)
//   and launches one bounded repair round as a parallel fan-out (repair1/repair2) carrying only
//   compact {planId, defPath, attempt} refs (specAuraForge §11). Rounds exhausted and still
//   broken -> completed with a CLI-materialization pending trace.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { createAddStepIntent, createAgentStepPayload, createUpdateStatusIntent, saveMaterializeVerifySummary, saveMaterializeVerifyTrace, type MaterializeVerifyPassed } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';
import {
  parseDefs,
  testPathForOutputPath,
  validateGeneratedPageQuality,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';
import {
  compileMlsPathAndGetErrors,
  getCompiledDtsByMlsPath,
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
// Bounded repair rounds after the initial fan-out (verify attempt 1). Studio uses 3 (fan-out + 3 repairs
// = 4 tries) — INTENTIONALLY one more than the CLI (nodejsMaterializeL2, fan-out + 2 = 3): the Studio
// verify now resolves cross-file types reliably (verifyItem pre-loads dependency .d.ts), so it surfaces
// real errors the earlier per-file check missed, and cross-file fixes (handler signatures, output shapes)
// sometimes need one extra round to converge. The CLI feeds full tsc output into the prompt and converges
// faster, so its budget stays at 2.
const MATERIALIZE_REPAIR_ROUNDS = 3;

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
      createAddStepIntent(context, step, fanout, parallelArgs, args.maxParallel ?? 10),
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
// compile. Broken items get one repair round: a parallel fan-out of agentCfeMaterializeGen slots
// whose args carry only {planId, defPath, attempt} — the gen agent recomputes the compiler
// errors from disk (attempt >= 2) so no error text is persisted in step prompts.
async function runVerify(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args: MaterializeVerifyArgs): Promise<mls.msg.AgentIntent[]> {
  const checkedItems: BrokenItem[] = [];
  for (const item of args.items) {
    const checked = await verifyItem(item);
    checkedItems.push(checked);
  }
  const broken = checkedItems.filter(checked => checked.errors.length > 0);
  const passed: MaterializeVerifyPassed[] = checkedItems.filter(checked => checked.errors.length === 0).map(checked => ({ planId: checked.item.planId, typecheck: checked.typecheck }));
  const moduleName = deriveVerifyModule(args.items);
  // ALWAYS write the stable verdict file (overwrites each round) so "was this phase resolved?" has one
  // place to look — passed items + any still-broken — instead of inferring it from the presence of
  // cryptic per-round trace files (102051 run19: no file meant "clean" AND "not run", indistinguishable).
  const summaryRef = await saveMaterializeVerifySummary(moduleName, args.planId, args.attempt, passed, broken.map(toBrokenTrace));

  if (broken.length === 0) {
    const trace = checkedItems.map(checked => {
      const warnings = checked.warnings.length ? `; UX warnings: ${checked.warnings.join(' | ')}` : '';
      return `${checked.item.planId}: ${checked.typecheck}${warnings}`;
    }).join('; ');
    const summaryNote = summaryRef ? ` verdict: ${summaryRef}` : '';
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `all ${args.items.length} materialization item(s) verified; typechecks: ${trace}.${summaryNote}`)];
  }

  // Full detail (all errors + warnings per item) goes to the file system; the msg-task step trace
  // keeps only a short summary that points at that file (DynamoDB 400KB task cap).
  const traceRef = await saveMaterializeVerifyTrace(args.planId, args.attempt, broken.map(toBrokenTrace));
  const summary = summarizeBroken(broken, traceRef);
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
  // Each repair round is a parallel fan-out (repair1, repair2) whose args are ONLY the compact
  // refs {planId, defPath, attempt}. The compiler errors are recomputed from disk by
  // agentCfeMaterializeGen (attempt >= 2) and travel in the LLM input, which the interaction
  // cleaner strips — never in a step prompt, which the cleaner keeps (DynamoDB 400KB cap;
  // skills/collab_messages.md). Fan-out slots are also deleted when finished, unlike the old
  // one-step-per-broken-item shape that stayed on the task record forever.
  const repairPlanId = `${args.planId}-repair${nextAttempt - 1}`;
  const repairFanout = createFanoutStep(repairPlanId, `Repair ${roundLabel}: {{completed}}/{{total}}, falhas {{failed}}`, broken.length);
  const repairArgs = broken.map(entry => JSON.stringify({ planId: entry.item.planId, defPath: entry.item.defPath, attempt: nextAttempt }));
  const nextVerifyPlanId = `${args.planId}-v${nextAttempt}`;
  const nextVerify = createAddStepIntent(context, anchor, createAgentStepPayload(
    nextVerifyPlanId,
    AGENT_NAME,
    'Verify materialization (after repair)',
    { mode: 'verify', planId: nextVerifyPlanId, items: broken.map(entry => entry.item), attempt: nextAttempt },
    [repairPlanId],
    'sequential',
    'waiting_dependency',
  ));
  // Intent ORDER matters (parent auto-completion sweep): open steps first, completed status last.
  return [
    createAddStepIntent(context, anchor, repairFanout, repairArgs, 10),
    nextVerify,
    createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `${broken.length} broken item(s), repair round ${roundLabel} started:\n${summary}`),
  ];
}

// The msg-task step trace must stay a SUMMARY (kept by the interaction cleaner, subject to the
// DynamoDB 400KB task cap): one line per broken item with its error/warning counts and a single
// clipped representative error, plus a pointer to the file-system trace that holds the full detail.
const MAX_SUMMARY_ITEMS = 40;
const SUMMARY_ERROR_LEN = 200;

function summarizeBroken(broken: BrokenItem[], traceRef: string | null): string {
  const clip = (value: string): string => value.length > SUMMARY_ERROR_LEN ? `${value.slice(0, SUMMARY_ERROR_LEN)}…` : value;
  const shown = broken.slice(0, MAX_SUMMARY_ITEMS);
  const lines = shown.map(entry => {
    const counts = `${entry.errors.length} error(s)${entry.warnings.length ? `, ${entry.warnings.length} warning(s)` : ''}`;
    const first = entry.errors[0] ? ` — ${clip(entry.errors[0])}` : '';
    return `${entry.item.planId} (typecheck=${entry.typecheck}): ${counts}${first}`;
  });
  if (broken.length > shown.length) lines.push(`…(+${broken.length - shown.length} more item(s))`);
  lines.push(traceRef ? `full detail: ${traceRef}` : 'full detail: (verify trace could not be written)');
  return lines.join('\n');
}

function toBrokenTrace(entry: BrokenItem) {
  return {
    planId: entry.item.planId,
    defPath: entry.item.defPath,
    outputPath: entry.outputPath,
    typecheck: entry.typecheck,
    errors: entry.errors,
    warnings: entry.warnings,
  };
}

async function verifyItem(item: GenStepArgs): Promise<BrokenItem> {
  const defsContent = await getContentByMlsPath(item.defPath);
  const pipelineItem = defsContent ? parseDefs(defsContent).item : null;
  if (!pipelineItem) return { item, outputPath: null, errors: [`pipeline not found in defs: ${item.defPath}`], warnings: [], typecheck: 'not-applicable' };

  const outputPath = pipelineItem.outputPath;
  const content = await getContentByMlsPath(outputPath);
  if (!content || !content.trim()) return { item, outputPath, errors: [`generated file missing or empty: ${outputPath}`], warnings: [], typecheck: 'not-applicable' };

  // A page is verified only AFTER its shared/contract phases finished (contracts -> shared -> pages), so
  // the deps on disk are final. Force-compile their .d.ts FIRST so the Studio per-file compile resolves
  // cross-file types the same way `tsc -p` does. Without this an unloaded import resolves to `any` and the
  // check silently misses TS2554/TS2352/TS2339 (102051 run19: shiftWorkspace passed here yet failed tsc,
  // and — because the verify item set only shrinks — was never re-checked). Best-effort: never block.
  const sharedDefsPath = pipelineItem.type === 'l2_page' ? sharedDefsPathForPageOutput(outputPath) : null;
  const sharedDefs = sharedDefsPath ? await getContentByMlsPath(sharedDefsPath) : null;
  if (pipelineItem.type === 'l2_page') await preloadPageTypecheckDeps(sharedDefsPath, sharedDefs);

  const errors = [...await compileMlsPathAndGetErrors(outputPath)];
  const warnings: string[] = [];
  const testPath = testPathForOutputPath(outputPath);
  const testContent = await getContentByMlsPath(testPath);
  const typecheckErrors = testContent && testContent.trim() ? await compileMlsPathAndGetErrors(testPath) : [];
  errors.push(...typecheckErrors);
  if (pipelineItem.type === 'l2_page' && defsContent) {
    if (!sharedDefs) {
      warnings.push(`shared defs missing for UX validation: ${sharedDefsPath || outputPath}`);
    } else {
      // These rules diagnose the page/layout contract. This materialization phase can only rewrite
      // .ts, never its .defs.ts; treating a defs-only issue as a repairable error loops until the
      // budget is exhausted. Keep the result auditable in the trace and let the create-page stage
      // own a future layout regeneration.
      warnings.push(...validateGeneratedPageQuality(parseDefs(defsContent).data, parseDefs(sharedDefs).data, content));
    }
  }
  return { item, outputPath, errors, warnings, typecheck: testContent && testContent.trim() ? (typecheckErrors.length ? 'failed' : 'passed') : 'not-applicable' };
}


function sharedDefsPathForPageOutput(outputPath: string): string | null {
  const match = outputPath.match(/^(.*\/web)\/(?:desktop|mobile)\/page\d+\/([^/]+)\.ts$/);
  return match ? `${match[1]}/shared/${match[2]}.defs.ts` : null;
}

// Module name from the verify items' `_<project>_/l2/<module>/...` defPath (one run = one module).
function deriveVerifyModule(items: GenStepArgs[]): string {
  for (const item of items) {
    const parts = String(item.defPath || '').split('/');
    const l2Index = parts.indexOf('l2');
    const moduleName = l2Index >= 0 ? parts[l2Index + 1] : '';
    if (moduleName && moduleName !== 'trace') return moduleName;
  }
  return '';
}

// Compile the page's dependency .d.ts (its shared base class runtime .ts + the contract .ts it imports)
// so they are loaded/typed BEFORE the page compiles — otherwise the Studio per-file compile resolves the
// imports loosely and cross-file type errors vanish. Best-effort: a dep that fails to compile just leaves
// its import unresolved (same as the old behaviour), never throws.
async function preloadPageTypecheckDeps(sharedDefsPath: string | null, sharedDefs: string | null): Promise<void> {
  const deps: string[] = [];
  if (sharedDefsPath) deps.push(sharedDefsPath.replace(/\.defs\.ts$/, '.ts'));
  if (sharedDefs) {
    try {
      const data = parseDefs(sharedDefs).data as Record<string, unknown>;
      const ref = data && typeof data.contractRef === 'object' && data.contractRef ? data.contractRef as Record<string, unknown> : null;
      if (ref && typeof ref.tsPath === 'string' && ref.tsPath) deps.push(ref.tsPath);
    } catch { /* malformed shared defs: skip the contract dep */ }
  }
  for (const dep of deps) {
    try { await getCompiledDtsByMlsPath(dep); } catch { /* best-effort */ }
  }
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
      input: [{ type: 'system', content: '<!-- modelType: code -->' }],
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
