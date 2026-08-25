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
  collectDesignTokenRoleIssues,
  collectHeadingDisciplineIssues,
  collectMissingImageRenderIssues,
  collectChartEventIssues,
  collectMutationFeedbackIssues,
  collectMutationEnvelopeErrorIssues,
  collectEnumTextInputIssues,
  collectEnumCellLabelIssues,
  collectIdColumnIssues,
  collectPageExperienceIssues,
  collectSelectionControlIssues,
  collectCommandDisabledIssues,
  collectMissingInitialLoadIssues,
  isL4LookupGap,
  collectTechnicalVocabularyIssues,
  collectPageTemplateHygieneIssues,
  collectContractFieldIssues,
  collectPageCustomElementTagIssues,
  contractTsPathOf,
  countPage11Items,
  countSharedItems,
  isSystemicPageFailure,
  isSystemicSharedFailure,
  pageDefinitionForChecks,
  parseDefs,
  testPathForOutputPath,
  validateGeneratedPageQuality,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';
import {
  compileMlsPathAndGetErrors,
  releaseBorrowedModelScope,
  preloadTypecheckDeps,
  sharedDefsPathForPageOutput,
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
/**
 * The verify is the phase boundary where the borrowed Monaco models go back.
 *
 * Every `verifyItem` compiles a file and preloads its dependencies, and each of those creates a model
 * that nothing used to release — hundreds per run of a 34-workspace module, until Monaco hit its 200
 * listener ceiling and buried the real errors. The release is here, once, around EVERY exit of the
 * verify (there are seven: clean, two systemic guards, budget exhausted, split, repair round, catch)
 * instead of inside `verifyItem`, so a file that is an import of the next item is never disposed while
 * that compile is in flight. The dispose itself still waits for `activeCompiles === 0`.
 */
async function runVerify(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args: MaterializeVerifyArgs): Promise<mls.msg.AgentIntent[]> {
  let released = 0;
  let intents: mls.msg.AgentIntent[];
  try {
    intents = await runVerifyItems(context, parentStep, step, hookSequential, args);
  } finally {
    released = releaseBorrowedModelScope();
  }
  // The number goes in the STEP TRACE, not the console: it is a fact about this run and belongs where
  // the run is read (task/verdict), instead of in a browser log nobody keeps.
  return released ? intents.map(intent => appendVerifyTrace(intent, `released ${released} borrowed model(s)`)) : intents;
}

/** Append a note to the update-status this step emits, leaving every other intent untouched. */
function appendVerifyTrace(intent: mls.msg.AgentIntent, note: string): mls.msg.AgentIntent {
  if (intent.type !== 'update-status') return intent;
  const status = intent as mls.msg.AgentIntentUpdateStatus;
  return { ...status, traceMsg: status.traceMsg ? `${status.traceMsg}; ${note}` : note };
}

async function runVerifyItems(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args: MaterializeVerifyArgs): Promise<mls.msg.AgentIntent[]> {
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
  const traceRef = await saveMaterializeVerifyTrace(moduleName, args.planId, args.attempt, broken.map(toBrokenTrace));
  const summary = summarizeBroken(broken, traceRef);

  // Systemic failure: EVERY page11 item broken on the FIRST compile is an environment/config fault, not
  // N code bugs. Repairing would burn the budget rewriting correct files and regress them (see
  // isSystemicPageFailure). Stop here so the real cause is fixed instead of masked.
  if (isSystemicPageFailure(args.attempt, checkedItems)) {
    const total = countPage11Items(checkedItems);
    return [createUpdateStatusIntent(
      context,
      parentStep,
      step,
      hookSequential,
      'failed',
      `MATERIALIZE-SYSTEMIC-FAILURE: all ${total} page11 item(s) failed the first compile. That points at an environment/configuration fault (typically a package or path the compiler cannot resolve — check the repeated error below), not at ${total} independent code bugs. Repair rounds were NOT started: they cannot fix a resolution fault and would rewrite already-correct files until they regress. Fix the root cause and re-run.\n${summary}`,
    )];
  }

  // Same reasoning for the shared phase (run cf2: 34/34 broken with the same first error). Kept as a
  // separate guard because the two phases fail for different reasons — and this one is defence in
  // depth now that the contract is preloaded before the shared compiles.
  if (isSystemicSharedFailure(args.attempt, checkedItems)) {
    const total = countSharedItems(checkedItems);
    return [createUpdateStatusIntent(
      context,
      parentStep,
      step,
      hookSequential,
      'failed',
      `MATERIALIZE-SYSTEMIC-FAILURE: all ${total} shared item(s) failed the first compile. That points at an environment/configuration fault (typically a contract or path the compiler cannot resolve — check the repeated error below), not at ${total} independent code bugs. Repair rounds were NOT started: they cannot fix a resolution fault and would rewrite already-correct files until they regress. Fix the root cause and re-run.\n${summary}`,
    )];
  }

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

  // A page that blew the output cap left a split plan on disk (agentCfeMaterializeGen.writeSplitPlanFromL4).
  // It is not repairable — the same prompt hits the same ceiling — but it IS now materializable as N
  // organisms plus the page, so turn the plan into steps instead of spending repair rounds on it.
  const anchorForSplit = findMutableParentStep(context, parentStep);
  const splitIntents = await planSplitSteps(context, anchorForSplit, args, broken);
  if (splitIntents) {
    return [...splitIntents, createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed',
      `SPLIT: page over the output cap re-queued as organisms.\n${summary}`)];
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
  // itemId rides along: without it a repair slot would fall back to pipeline[0] and rewrite the FIRST
  // organism's file instead of the one that is actually broken.
  const repairArgs = broken.map(entry => JSON.stringify({ planId: entry.item.planId, defPath: entry.item.defPath, itemId: entry.item.itemId, attempt: nextAttempt }));
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

/**
 * Turn a persisted split plan into steps: a fan-out of organism slots, then the page that imports their
 * render functions, then a verify over all of them.
 *
 * Two sequential fan-outs, not one: the page must come after every organism — it imports them. This is
 * the same shape the repair round uses, which is why dynamic step creation is safe here.
 *
 * Returns null when no broken item has a plan, and the caller falls through to the normal repair.
 */
async function planSplitSteps(
  context: mls.msg.ExecutionContext,
  anchor: mls.msg.AIAgentStep,
  args: MaterializeVerifyArgs,
  broken: BrokenItem[],
): Promise<mls.msg.AgentIntent[] | null> {
  const intents: mls.msg.AgentIntent[] = [];
  const verifyItems: GenStepArgs[] = [];

  for (const entry of broken) {
    const organisms = await readSplitOrganisms(entry.item.defPath, entry.outputPath);
    if (!organisms.length) continue;
    const parsed = parseSplitOutput(entry.outputPath!);
    if (!parsed) continue;

    // The page's own itemId gives the base exactly (`<page>[__<genome>]__l2_page`), so the organism ids
    // are derived, never reconstructed from the planId — `safe()` lowercases and strips, and is lossy.
    const pageItemId = entry.item.itemId;
    if (!pageItemId?.endsWith('__l2_page')) continue;
    const basePipeline = pageItemId.slice(0, -'__l2_page'.length);

    const organismArgs = organisms.map(organism => ({
      planId: `${entry.item.planId}-o${organism.n}`,
      defPath: entry.item.defPath,
      itemId: `${basePipeline}__O${organism.n}`,
    } satisfies GenStepArgs));
    const pageArgs: GenStepArgs = { planId: `${entry.item.planId}-page`, defPath: entry.item.defPath, itemId: pageItemId };

    const organismsPlanId = `${entry.item.planId}-split-organisms`;
    const pagePlanId = `${entry.item.planId}-split-page`;
    intents.push(createAddStepIntent(
      context, anchor,
      createFanoutStep(organismsPlanId, `Dividir ${parsed.shortName}: {{completed}}/{{total}}, falhas {{failed}}`, organismArgs.length),
      organismArgs.map(item => JSON.stringify(item)), 10,
    ));
    intents.push(createAddStepIntent(
      context, anchor,
      // depends on the organisms fan-out: the page imports what they export.
      createFanoutStep(pagePlanId, `Compor ${parsed.shortName}: {{completed}}/{{total}}, falhas {{failed}}`, 1, [organismsPlanId]),
      [JSON.stringify(pageArgs)], 1,
    ));
    verifyItems.push(...organismArgs, pageArgs);
  }

  if (!verifyItems.length) return null;

  const verifyPlanId = `${args.planId}-split-verify`;
  intents.push(createAddStepIntent(context, anchor, createAgentStepPayload(
    verifyPlanId,
    AGENT_NAME,
    'Verify materialization (after split)',
    { mode: 'verify', planId: verifyPlanId, items: verifyItems, attempt: 1 },
    verifyItems.filter(item => item.planId.endsWith('-page')).map(item => `${item.planId.replace(/-page$/u, '')}-split-page`),
    'sequential',
    'waiting_dependency',
  )));
  return intents;
}

/** The organisms of a page's split plan, or [] when there is none. */
async function readSplitOrganisms(defPath: string | undefined, outputPath: string | null): Promise<{ n: number }[]> {
  const parsed = outputPath ? parseSplitOutput(outputPath) : null;
  if (!parsed || !defPath) return [];
  const raw = await getContentByMlsPath(`_${parsed.project}_/l2/${parsed.moduleName}/trace/frontend-page-split/${parsed.genome}/${parsed.shortName}.json`);
  if (!raw) return [];
  try {
    const plan = JSON.parse(raw) as { organisms?: { n: number }[] };
    return Array.isArray(plan.organisms) ? plan.organisms.filter(item => Number.isInteger(item?.n)) : [];
  } catch {
    return [];
  }
}

function parseSplitOutput(outputPath: string): { project: number; moduleName: string; genome: string; shortName: string } | null {
  const match = /^_(\d+)_\/l2\/([^/]+)\/web\/desktop\/(page\d+)\/([A-Za-z0-9_]+)\.ts$/u.exec(outputPath);
  return match ? { project: Number(match[1]), moduleName: match[2], genome: match[3], shortName: match[4] } : null;
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
  if (pipelineItem.type === 'l2_page') {
    await preloadTypecheckDeps([sharedDefsPath ? sharedDefsPath.replace(/\.defs\.ts$/, '.ts') : null, contractTsPathOf(sharedDefs)]);
  } else if (pipelineItem.type === 'l2_shared') {
    // The shared imports its own contract; its defs is the one already read above.
    await preloadTypecheckDeps([contractTsPathOf(defsContent)]);
  }

  const errors = [...await compileMlsPathAndGetErrors(outputPath)];
  if (pipelineItem.type === 'l2_shared' && defsContent) {
    errors.push(...collectMutationEnvelopeErrorIssues(parseDefs(defsContent).data, content));
  }
  const warnings: string[] = [];
  if (pipelineItem.type === 'l2_shared' && defsContent) {
    // Defs-level: rewriting the shared .ts cannot add an initialLoad the defs omitted. Warning
    // keeps the gap in the verdict; create-shared is what emits the list.
    warnings.push(...collectMissingInitialLoadIssues(parseDefs(defsContent).data));
  }
  const testPath = testPathForOutputPath(outputPath);
  const testContent = await getContentByMlsPath(testPath);
  const typecheckErrors = testContent && testContent.trim() ? await compileMlsPathAndGetErrors(testPath) : [];
  errors.push(...typecheckErrors);
  if (pipelineItem.type === 'l2_page') {
    // bugpage21: an invented module-level helper rendered by NAME (`: nothing` + `function nothing()`)
    // paints the function's own source code on screen. It COMPILES, so neither the typecheck above nor
    // the defs-level UX rules below can see it. This is a pure .ts defect that rewriting the .ts fixes,
    // so it belongs in `errors` (repairable, fed back to the page generator), not in `warnings`.
    errors.push(...collectPageTemplateHygieneIssues(content), ...collectChartEventIssues(content));
    // Second line under the compiler: a field the contract does not declare. `tsc` catches it where the
    // row is genuinely typed, and only with the module loaded — which is how one reached production and
    // was fixed by hand in the module. Repairable: rewriting the .ts is exactly the fix.
    const contractPath = contractTsPathOf(sharedDefs);
    const contractSource = contractPath ? await getContentByMlsPath(contractPath) : null;
    if (contractSource) {
      errors.push(...collectContractFieldIssues(content, contractSource));
      if (sharedDefs) errors.push(...collectEnumTextInputIssues(parseDefs(sharedDefs).data, content, contractSource));
      errors.push(...collectEnumCellLabelIssues(content, contractSource));
      errors.push(...collectIdColumnIssues(content));
    }
    errors.push(...collectPageCustomElementTagIssues(content, outputPath));
    // A background token used as a text color renders invisible text once the theme applies (the
    // hardcoded var() fallback hides it in one theme only) — mls-102045 shipped exactly that. It is a
    // pure .ts defect a rewrite fixes, and the check is deterministic (role suffix, no judgement), so it
    // is a repairable ERROR rather than a warning.
    errors.push(...collectDesignTokenRoleIssues(content));
  }
  if (pipelineItem.type === 'l2_page' && defsContent) {
    if (!sharedDefs) {
      warnings.push(`shared defs missing for UX validation: ${sharedDefsPath || outputPath}`);
    } else {
      // These rules diagnose the page/layout contract. This materialization phase can only rewrite
      // .ts, never its .defs.ts; treating a defs-only issue as a repairable error loops until the
      // budget is exhausted. Keep the result auditable in the trace and let the create-page stage
      // own a future layout regeneration.
      const parsedPage = parseDefs(defsContent);
      const pageData = pageDefinitionForChecks(parsedPage);
      const sharedData = parseDefs(sharedDefs).data;
      warnings.push(...validateGeneratedPageQuality(pageData, sharedData, content));
      // The reduced page defs carries no layout, so these judge the GENERATED CODE anchored on
      // dataBindings (supervisor decision B.1, 31/jul). Errors, not warnings: each is deterministic and
      // fixed by rewriting the .ts — exactly what the repair round does.
      // A lookup gap is a defect of the l4 workspace (no query to feed the picker), and this phase can
      // only rewrite .ts: routing it to repair burns the budget and ends broken anyway. Warning keeps
      // it visible in the verdict without stopping the run.
      const experienceIssues = collectPageExperienceIssues(pageData, sharedData, content);
      errors.push(...experienceIssues.filter(issue => !isL4LookupGap(issue)));
      warnings.push(...experienceIssues.filter(isL4LookupGap));
      errors.push(...collectMutationFeedbackIssues(pageData, sharedData, content));
      errors.push(...collectSelectionControlIssues(pageData, sharedData, content));
      errors.push(...collectCommandDisabledIssues(pageData, sharedData, content));
      warnings.push(...collectMissingInitialLoadIssues(sharedData, pageData));
      errors.push(...collectTechnicalVocabularyIssues(pageData, content));
      errors.push(...collectHeadingDisciplineIssues(content));
    }
    // bugimage.md: a page binding an image-URL field must render an <img>. Deliberately a WARNING, not
    // an error: unlike the template-hygiene defect above (unambiguously broken output), "should render an
    // image" is a UX judgement where a false positive is plausible (an edit form with a logoUrl text
    // input), and a false blocking error would burn the repair budget. The render skills now mandate the
    // binding, so this reports non-compliance instead of policing it.
    warnings.push(...collectMissingImageRenderIssues(defsContent, content));
  }
  return { item, outputPath, errors, warnings, typecheck: testContent && testContent.trim() ? (typecheckErrors.length ? 'failed' : 'passed') : 'not-applicable' };
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

// Compile a file's dependency .d.ts (a page: its shared base class runtime .ts + the contract it
// imports; a shared: the contract it imports) so they are loaded/typed BEFORE it compiles —
// otherwise the Studio per-file compile resolves the imports loosely. The contract model is
// disposed as soon as the contract phase compiled it, so without this the shared saw its own import
// as unresolvable (TS2792 on all 34 of them in run cf2) and every one was declared broken.
// Best-effort: a dep that fails to compile just leaves its import unresolved, never throws.
//
// The preloaded model is deliberately LEFT ALIVE for the rest of the phase: it exists precisely so
// the files compiled after it can resolve their imports, and disposing it here would recreate the
// very problem this solves. It is bounded (one per contract) and released with the phase, so this is
// not the unbounded listener leak of 29/jul.
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
  // itemId must survive the round-trip: it is WHICH pipeline item of that defs the slot builds, and the
  // split derives the organism ids from it. Dropping it here forced a lossy reconstruction from planId.
  const itemId = readString(value.itemId);
  return itemId ? { planId, defPath, itemId } : { planId, defPath };
}

/**
 * @param dependsOn plan ids this fan-out waits for. Used by the split: the page fan-out must not start
 *        before the organisms one finishes, because the page imports what those files export.
 */
function createFanoutStep(planId: string, title: string, total: number, dependsOn: string[] = []): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    // A provider/transport failure in ONE slot must not kill the task. Without this, the default branch
    // of runLLMStepParallel marks the slot failed WITH newTaskStatus 'failed' and the whole
    // changeFrontend dies mid-fan-out (msgtask_fe1, petShop: an HTTP 402 on the fallback model threw
    // away 14 finished pages and orphaned 8 slots). With 'wait_after_prompt' the slot goes to
    // waiting_after_prompt_with_error, afterPromptStep still runs and completes it with
    // 'MATERIALIZE-FAILED: missing generated code', and the phase verify lists the item as broken and
    // repairs it — the path this fan-out was designed around. Children inherit it via
    // addParallelChildStep. NOT 'skip': that marks the slot failed, which fails the task while the
    // siblings are still active and fails this host once they drain.
    onFailure: 'wait_after_prompt',
    interaction: {
      input: [{ type: 'system', content: '<!-- modelType: code -->' }],
      cost: 0,
      trace: [`queued ${total} materialization item(s)`],
      payload: null,
    },
    stepTitle: title,
    nextSteps: [],
    agentName: 'agentCfeMaterializeGen',
    prompt: JSON.stringify({ planId }),
    rags: [],
    status: dependsOn.length ? 'waiting_dependency' : 'in_progress',
    planning: { planId, dependsOn, executionMode: 'parallel_dynamic', executionHost: 'client' },
  } as any;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
