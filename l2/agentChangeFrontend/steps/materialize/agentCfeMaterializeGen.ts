/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/materialize/agentCfeMaterializeGen.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  applyHeader,
  buildCompileRepairHint,
  collectChartEventIssues,
  collectPageTemplateHygieneIssues,
  buildContextSection,
  buildMaterializeTypecheckTest,
  buildHumanPrompt,
  buildMissingCodeRepairHint,
  buildRuntimeDtsSection,
  buildSharedDtsSection,
  buildSystemPrompt,
  CONTRACTS_102029,
  DEFAULT_MODEL_TYPE,
  expandContextRef,
  GEN_TOOL,
  GEN_TOOL_NAME,
  isMaxTokensFailure,
  isSplitWorthyFailure,
  isSharedRuntimeTsRef,
  parseDefs,
  normalizeGeneratedCode,
  sharedDtsArtifactRef,
  testPathForOutputPath,
  trimDefinitionForPrompt,
  trimSharedI18nForPageContext,
  type PipelineItem,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';
import {
  compileAndGetErrors,
  compileMlsPathAndGetErrors,
  consumeMaterializeStudioMessages,
  extractToolCallArgs,
  getCompiledDtsByMlsPath,
  getContentByMlsPath,
  getFileModifiedByMlsPath,
  parseMlsPath,
  saveArtifactTextByMlsPath,
  saveGeneratedTs,
  saveGeneratedTsByMlsPath,
  type GenStepArgs,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';
// Deterministic l2_shared renderer (pure, import-free). Wired here so the Studio path stops paying the
// LLM — and stops hitting its output cap — for a file that is a mechanical projection of the defs.
import { generateSharedScaffold } from '/_102020_/l2/agentChangeFrontend/helpers/cfeSharedScaffold.js';
import { buildPageSkeleton } from '/_102020_/l2/agentChangeFrontend/helpers/cfePageSkeleton.js';
import { buildSplitPlan, type SplitPlanSection } from '/_102020_/l2/agentChangeFrontend/helpers/cfePageSplitPlan.js';

interface ToolOutput {
  code: string;
}

const AGENT_NAME = 'agentCfeMaterializeGen';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/materialize',
    agentDescription: 'Generate one frontend L2 .ts file from an agentChangeFrontend .defs.ts pipeline item',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  try {
    if (!args) throw new Error('missing args');

    const genArgs = parseGenStepArgs(args);
    const genContext = await buildGenContext(genArgs.defPath, genArgs.itemId);

    // l2_shared is a MECHANICAL projection of defs + contract — no judgement is needed (see
    // steps/materialize/CHANGELOG 28/jul). Try the deterministic scaffold FIRST and skip the model
    // entirely when it succeeds. This is what kills the output-size wall: projectDetailWorkspace needs a
    // ~55k-token file in ONE tool call and the LLM path died with MAX_TOKENS_REACHED at 50000 after
    // 11m39s ($0.30), failing the whole task. The scaffold returns {code:null, reason} on any defs shape
    // it does not model, and then we fall through to the LLM exactly as before.
    if (genContext.pipelineItem.type === 'l2_shared') {
      const deterministic = await materializeSharedDeterministic(context, parentStep, step, hookSequential, genContext.pipelineItem, genContext.definitionData);
      if (deterministic) return deterministic;
    }
    // Repair rounds (attempt >= 2) arrive as fan-out slots carrying only compact refs — the
    // compiler errors are recomputed from disk HERE and injected into the LLM input (cleaned
    // later by the interaction cleaner), never persisted in a step prompt/args (DynamoDB 400KB
    // cap; skills/collab_messages.md "Interaction cleaner").
    const repairHint = (genArgs.attempt ?? 1) >= 2
      ? genArgs.repairHint ?? await computeRepairHint(genContext.pipelineItem)
      : undefined;
    // Deterministic page skeleton (i18n.md §4) — same helper the CLI uses, so both surfaces emit the
    // identical file shape. Only on the first attempt (see createPromptReadyIntent).
    const skeleton = repairHint ? undefined : await pageSkeletonFor(genContext.pipelineItem, genContext.siblings, genContext.definitionData);
    return [createPromptReadyIntent(context, parentStep, hookSequential, args, genContext, repairHint, skeleton)];
  } catch (error) {
    const message = formatError('beforePromptStep', error);
    console.error(`[${agent.agentName}] ${message}`);
    return [mkFailureStatus(context, parentStep, step, hookSequential, isRepairRun(args || step.prompt), message)];
  }
}

/**
 * Deterministic l2_shared materialization (no LLM). Returns the intents that COMPLETE the step when the
 * scaffold produced the file, or null to fall through to the LLM (no contract in reach, scaffold bailed,
 * or the generated file did not compile — the model still gets its chance).
 *
 * Persists exactly what the LLM path persists (same .ts save, same typecheck test, same compile gate,
 * same shared .d.ts artifact), so nothing downstream can tell the two apart.
 */
async function materializeSharedDeterministic(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  pipelineItem: PipelineItem,
  definitionData: unknown,
): Promise<mls.msg.AgentIntent[] | null> {
  try {
    const contractTsPath = isRecord(definitionData) && isRecord(definitionData.contractRef) && typeof definitionData.contractRef.tsPath === 'string'
      ? definitionData.contractRef.tsPath
      : '';
    const contractSource = contractTsPath ? await getContentByMlsPath(contractTsPath) : null;
    if (!contractSource) return null;

    // The .ts being overwritten is passed so existing translations survive: the scaffold emits every
    // declared locale, and regenerating used to reset them all to the default language (i18n.md item 4).
    const previousSource = await getContentByMlsPath(pipelineItem.outputPath);
    const scaffold = generateSharedScaffold(pipelineItem.outputPath, definitionData, contractSource, previousSource ?? undefined);
    if (!scaffold.code) {
      console.info(`[agentCfeMaterializeGen] scaffold bail for ${pipelineItem.outputPath} (${scaffold.reason}) -> LLM`);
      return null;
    }

    const parsed = parseMlsPath(pipelineItem.outputPath);
    if (!parsed) return null;
    consumeMaterializeStudioMessages();
    const saved = await saveGeneratedTs(parsed.project, parsed.level, parsed.folder, parsed.shortName, scaffold.code);
    if (!saved) return null;

    const typecheckTest = buildMaterializeTypecheckTest(pipelineItem, definitionData);
    const typecheckPath = typecheckTest ? testPathForOutputPath(pipelineItem.outputPath) : null;
    if (typecheckPath && typecheckTest && !await saveGeneratedTsByMlsPath(typecheckPath, typecheckTest)) return null;

    // The contract model was disposed as soon as the contract phase compiled it, so the shared —
    // which imports `/_<proj>_/l2/<module>/web/contracts/<pageId>.js` — could not resolve its own
    // import and every scaffold failed the gate with a FALSE TS2792, falling back to the LLM for 34
    // files that were already correct. Load it back first; best-effort, never blocking.
    // The model stays alive on purpose: it is what the shared resolves against for the rest of the
    // phase, and it is bounded (one per contract).
    try { await getCompiledDtsByMlsPath(contractTsPath); } catch { /* best-effort */ }
    const compileErrors = [
      ...await compileAndGetErrors(parsed.project, parsed.level, parsed.folder, parsed.shortName),
      ...(typecheckPath ? await compileMlsPathAndGetErrors(typecheckPath) : []),
    ];
    if (compileErrors.length > 0) {
      // The scaffold is deterministic, so a compile error here is a defs/contract mismatch it could not
      // see. Hand the item to the LLM instead of failing: the file on disk is overwritten by its output.
      console.info(`[agentCfeMaterializeGen] scaffold output did not compile for ${pipelineItem.outputPath} -> LLM (${compileErrors[0]})`);
      return null;
    }

    await persistSharedDtsArtifact(pipelineItem.outputPath);
    const studioDiagnostics = consumeMaterializeStudioMessages();
    const trace = `deterministic scaffold: ${scaffold.code.length}b, no LLM call${typecheckPath ? ' + typecheck test' : ''}`;
    return [mkStatus(context, parentStep, step, hookSequential, 'completed', studioDiagnostics.length ? `${trace}. ${formatStudioDiagnostics(studioDiagnostics)}` : trace, 'input_output')];
  } catch (error) {
    console.error(`[agentCfeMaterializeGen] deterministic shared failed (${formatError('materializeSharedDeterministic', error)}) -> LLM`);
    return null;
  }
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  try {
    consumeMaterializeStudioMessages();
    const genArgs = parseGenStepArgs(step.prompt);
    // attempt >= 2 marks a REPAIR fan-out slot (queued by the phase verify step with compact
    // refs only; the compiler errors were recomputed in beforePromptStep). attempt undefined
    // marks a first-pass fan-out slot.
    const repairRun = (genArgs.attempt ?? 1) >= 2;
    const { defPath } = genArgs;
    const defsContent = defPath ? await getContentByMlsPath(defPath) : null;
    const parsedDefs = defsContent ? parseDefs(defsContent) : null;
    // Resolve by itemId, exactly as beforePromptStep does. A defs can hold N items (a split page), and
    // taking item[0] here would save every slot's output over the FIRST organism's file.
    const pipelineItem = (genArgs.itemId ? parsedDefs?.items.find(candidate => candidate.id === genArgs.itemId) : null) ?? parsedDefs?.item;

    if (!pipelineItem) {
      return [mkFailureStatus(context, parentStep, step, hookSequential, repairRun, `pipeline item not found in defs: ${genArgs.itemId ?? '(first)'} @ ${defPath || '(missing defPath)'}`)];
    }

    const raw = step.interaction?.payload?.[0] as unknown;
    const output = extractToolCallArgs<ToolOutput>(raw, GEN_TOOL_NAME);
    if (!output?.code) {
      const detail = `missing generated code; payload=${describePayload(raw)}`;
      // The output cap is not repairable but it IS plannable: persist the split plan now, so the phase
      // verify can turn it into organism steps instead of burning repair rounds (paginaDividida.md §4.1).
      // Cap or timeout: both mean the page does not fit in one call, and both are fixed by a split.
      if (isSplitWorthyFailure(describePayload(raw))) {
        await writeSplitPlanFromL4(pipelineItem, parsedDefs?.data, detail);
      }
      return [mkFailureStatus(context, parentStep, step, hookSequential, repairRun, detail, true)];
    }

    const parsed = parseMlsPath(pipelineItem.outputPath);
    if (!parsed) {
      return [mkFailureStatus(context, parentStep, step, hookSequential, repairRun, `invalid outputPath: ${pipelineItem.outputPath}`)];
    }

    const code = applyHeader(pipelineItem.outputPath, normalizeGeneratedCode(pipelineItem, parsedDefs?.data, output.code));
    const saved = await saveGeneratedTs(parsed.project, parsed.level, parsed.folder, parsed.shortName, code);
    if (!saved) {
      return [mkFailureStatus(context, parentStep, step, hookSequential, repairRun, withStudioDiagnostics(`saveGeneratedTs failed for ${pipelineItem.outputPath}`))];
    }

    const typecheckTest = buildMaterializeTypecheckTest(pipelineItem, parsedDefs ? parsedDefs.data : null);
    const typecheckPath = typecheckTest ? testPathForOutputPath(pipelineItem.outputPath) : null;
    if (typecheckPath && typecheckTest) {
      const testSaved = await saveGeneratedTsByMlsPath(typecheckPath, typecheckTest);
      if (!testSaved) {
        return [mkFailureStatus(context, parentStep, step, hookSequential, repairRun, withStudioDiagnostics(`saveGeneratedTs failed for ${typecheckPath}`))];
      }
    }

    const compileErrors = [
      ...await compileAndGetErrors(parsed.project, parsed.level, parsed.folder, parsed.shortName),
      ...(typecheckPath ? await compileMlsPathAndGetErrors(typecheckPath) : []),
      // bugpage21: catch the compiles-cleanly template defect in the TIGHTEST loop — right after this
      // worker saved its own .ts — instead of waiting for the phase verify round.
      ...(pipelineItem.type === 'l2_page' || pipelineItem.type === 'l2_page_organism' ? [...collectPageTemplateHygieneIssues(code), ...collectChartEventIssues(code)] : []),
    ];
    const studioDiagnostics = consumeMaterializeStudioMessages();
    if (compileErrors.length > 0) {
      const checkedFiles = typecheckPath ? `${pipelineItem.outputPath} + ${typecheckPath}` : pipelineItem.outputPath;
      const traceMsg = `compile/typecheck failed for ${checkedFiles}:\n${compileErrors.slice(0, 8).join('\n')}`;
      return [mkFailureStatus(context, parentStep, step, hookSequential, repairRun, withStudioDiagnostics(traceMsg, studioDiagnostics), true)];
    }

    // Persist the compiled .d.ts of a freshly materialized shared so downstream page items (and
    // the CLI runtime) read the same authoritative context from disk. Best-effort: never blocks.
    if (pipelineItem.type === 'l2_shared') await persistSharedDtsArtifact(pipelineItem.outputPath);

    return [mkStatus(context, parentStep, step, hookSequential, 'completed', studioDiagnostics.length ? formatStudioDiagnostics(studioDiagnostics) : undefined, 'input_output')];
  } catch (error) {
    const message = formatError('afterPromptStep', error);
    console.error(`[${agent.agentName}] ${message}`);
    return [mkFailureStatus(context, parentStep, step, hookSequential, isRepairRun(step.prompt), message)];
  }
}

function createPromptReadyIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  rawArgs: string,
  genContext: {
    pipelineItem: PipelineItem;
    definitionData: unknown;
    skillSections: string[];
    contextSections: string[];
  },
  repairHint?: string,
  skeleton?: string,
): mls.msg.AgentIntentPromptReady {
  // The args of the slot travel VERBATIM: the server matches the waiting slot by exact string
  // (`q.args === args`), so re-serializing the parsed object silently changed the key order on a
  // repair ({planId, defPath, itemId, attempt} became {planId, defPath, attempt, itemId}) and the
  // fan-out slot was never found — the round stayed forever in waiting_human_input. The queued
  // string is by definition the one the server compares, and the phase never puts a repair hint in
  // it (it carries only {planId, defPath, itemId, attempt}), so nothing has to be stripped here.
  const args = rawArgs;
  return {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: buildSystemPrompt(genContext.skillSections, genContext.pipelineItem.outputPath, DEFAULT_MODEL_TYPE),
    // The skeleton travels only on the FIRST attempt: on a repair the file on disk already is the
    // skeleton filled in, and re-sending the empty one would invite a rewrite from scratch.
    humanPrompt: buildHumanPrompt(trimDefinitionForPrompt(genContext.pipelineItem.type, genContext.definitionData), genContext.contextSections, genContext.pipelineItem.outputPath, repairHint, repairHint ? undefined : skeleton),
    tools: [GEN_TOOL as unknown as mls.msg.LLMTool],
    toolChoice: { type: 'function', function: { name: GEN_TOOL_NAME } },
  };
}

// Rebuild the repair hint from disk for a fan-out repair slot: missing/empty artifact -> missing
// code hint; otherwise compile the generated .ts (+ its typecheck test) and feed the errors back.
/**
 * Deterministic skeleton for a page item, or undefined when it cannot be built — then the model writes the
 * file from scratch exactly as before, so an unmodelled shared never blocks a run.
 *
 * Reads the RAW shared .ts, never the compiled .d.ts the context carries: the locale list lives in the
 * `message_<locale>` consts, which the .d.ts does not have.
 */
async function pageSkeletonFor(pipelineItem: PipelineItem, siblings: PipelineItem[], data: unknown): Promise<string | undefined> {
  if (pipelineItem.type !== 'l2_page' && pipelineItem.type !== 'l2_page_organism') return undefined;
  const sharedRef = (pipelineItem.dependsFiles ?? []).find(ref => isSharedRuntimeTsRef(ref));
  if (!sharedRef) return undefined;
  const sharedSource = await getContentByMlsPath(sharedRef);
  if (!sharedSource) return undefined;

  // The organisms of a split page are the sibling items of the same defs — the page composes them and an
  // organism builds only its own file (paginaDividida.md §3).
  const organisms = siblings
    .filter(item => item.type === 'l2_page_organism' && item.organism)
    .map(item => ({
      n: Number(/_O(\d+)\.ts$/u.exec(item.outputPath)?.[1] ?? 0),
      organism: item.organism!,
      bindings: item.bindings ?? [],
    }))
    .filter(item => item.n > 0)
    .sort((a, b) => a.n - b.n);
  const current = pipelineItem.type === 'l2_page_organism'
    ? organisms.find(item => item.organism === pipelineItem.organism)?.n
    : undefined;
  const pagePath = pipelineItem.type === 'l2_page_organism'
    ? pipelineItem.outputPath.replace(/_O\d+\.ts$/u, '.ts')
    : pipelineItem.outputPath;

  const built = buildPageSkeleton({ outputPath: pagePath, data, sharedTsRef: sharedRef, sharedSource, organisms, current });
  if (!built.code) console.info(`[agentCfeMaterializeGen] skeleton skipped for ${pipelineItem.outputPath}: ${built.reason}`);
  return built.code ?? undefined;
}

/**
 * On an output-cap failure, project the l4 workspace sections into a split plan and persist it.
 *
 * The plan is DERIVED, not decided: the l4 already declares the page's sections and the bffCall each
 * organism binds to (cfePageSplitPlan). Written here, in the slot that failed, because this is where the
 * page defs and the reason are both in hand; the phase verify is what turns it into steps.
 *
 * Best-effort: a page with no usable l4 simply keeps the plain failure, which the trace already explains.
 */
export async function writeSplitPlanFromL4(pipelineItem: PipelineItem, data: unknown, reason: string): Promise<boolean> {
  const parsed = parseMlsPath(pipelineItem.outputPath);
  if (!parsed) return false;
  const moduleName = parsed.folder.split('/')[0];
  const genome = parsed.folder.split('/').pop() || '';

  const wsSource = await getContentByMlsPath(`_${parsed.project}_/l4/${moduleName}/workspaces/${parsed.shortName}.defs.ts`);
  if (!wsSource) return false;
  const workspace = extractFirstExportedObject(wsSource);
  const sections = (isRecord(workspace) && Array.isArray(workspace.sections) ? workspace.sections : [])
    .filter(isRecord)
    .map(section => ({
      sectionId: String(section.sectionId ?? ''),
      organisms: (Array.isArray(section.organisms) ? section.organisms : []).filter(isRecord) as SplitPlanSection['organisms'],
    }))
    .filter(section => section.sectionId);

  const bindings = (isRecord(data) && Array.isArray(data.dataBindings) ? data.dataBindings : [])
    .filter(isRecord).map(binding => String(binding.command ?? '')).filter(Boolean);

  const plan = buildSplitPlan(parsed.shortName, genome, sections, bindings, reason);
  if (!plan) return false;
  return saveArtifactTextByMlsPath(
    `_${parsed.project}_/l2/${moduleName}/trace/frontend-page-split/${genome}/${parsed.shortName}.json`,
    `${JSON.stringify(plan, null, 2)}\n`,
  );
}

/** First `export const X = { … }` of a defs — balanced braces, then JSON (the file is JSON.stringify output). */
function extractFirstExportedObject(source: string): unknown {
  const at = source.search(/export const [A-Za-z0-9_]+ = \{/u);
  if (at < 0) return null;
  const start = source.indexOf('{', at);
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) {
      try { return JSON.parse(source.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
}

async function computeRepairHint(pipelineItem: PipelineItem): Promise<string | undefined> {
  const outputPath = pipelineItem.outputPath;
  const content = await getContentByMlsPath(outputPath);
  if (!content || !content.trim()) {
    return buildMissingCodeRepairHint(outputPath, `generated file missing or empty: ${outputPath}`);
  }
  const errors = [...await compileMlsPathAndGetErrors(outputPath)];
  const testPath = testPathForOutputPath(outputPath);
  const testContent = await getContentByMlsPath(testPath);
  if (testContent && testContent.trim()) errors.push(...await compileMlsPathAndGetErrors(testPath));
  // bugpage21: the phase verify also rejects TEMPLATE-HYGIENE defects (an invented module-level helper
  // rendered by name, which paints the function source on screen). Those are NOT compiler errors, and a
  // repair slot carries only {planId, defPath, attempt} — so recompute them from disk HERE too, or the
  // model would be asked to regenerate without ever seeing the remedy and would burn the round blind.
  // Safe to recompute: collectPageTemplateHygieneIssues is a pure function of the file text.
  if (pipelineItem.type === 'l2_page') errors.push(...collectPageTemplateHygieneIssues(content));
  return errors.length ? buildCompileRepairHint(outputPath, errors.slice(0, 8)) : undefined;
}

async function buildGenContext(defPath: string, itemId?: string): Promise<{
  pipelineItem: PipelineItem;
  siblings: PipelineItem[];
  definitionData: unknown;
  skillSections: string[];
  contextSections: string[];
}> {
  const defsContent = await getContentByMlsPath(defPath);
  if (!defsContent) throw new Error(`[agentCfeMaterializeGen] defs not found: ${defPath}`);

  const parsed = parseDefs(defsContent);
  // A defs can carry N items (a split page: organisms + the page), so the slot says WHICH one it is.
  // Falling back to the first keeps a task queued before itemId existed meaning exactly what it meant.
  const pipelineItem = (itemId ? parsed.items.find(candidate => candidate.id === itemId) : null) ?? parsed.item;
  if (!pipelineItem) throw new Error(`[agentCfeMaterializeGen] pipeline item not found: ${itemId ?? '(first)'} in ${defPath}`);

  const skillSections = await readSections(pipelineItem.skills ?? [], 'skill');
  const contextSections = await readContextSections(pipelineItem);
  return { pipelineItem, siblings: parsed.items, definitionData: parsed.data, skillSections, contextSections };
}

// Context diet (flow.json materializationContextPolicy): for page items the shared base class is
// sent as its compiled .d.ts INSTEAD of the raw source — the compact, authoritative public surface
// (typed msg keys, properties, handlers). Resolution order: fresh persisted artifact
// (trace/frontend-shared-dts) -> compile on demand -> raw .ts fallback. The _102029_ runtime
// library files are likewise sent as compiled .d.ts (their implementation bodies are ~8k tokens
// of noise per shared item). designSystem.ts is summarized to token names inside
// buildContextSection.
const RUNTIME_102029_REFS = new Set<string>(CONTRACTS_102029);

async function readContextSections(pipelineItem: PipelineItem): Promise<string[]> {
  const sections: string[] = [];
  for (const requestedPath of pipelineItem.dependsFiles ?? []) {
    for (const path of expandContextRef(requestedPath)) {
      if (pipelineItem.type === 'l2_page' && isSharedRuntimeTsRef(path)) {
        const dts = await resolveSharedDts(path);
        if (dts) {
          sections.push(buildSharedDtsSection(path, dts));
          continue;
        }
      }
      if (RUNTIME_102029_REFS.has(path)) {
        const dts = await getCompiledDtsByMlsPath(path);
        if (dts) {
          sections.push(buildRuntimeDtsSection(path, dts));
          continue;
        }
      }
      const content = await getContentByMlsPath(path);
      if (!content) continue;
      // Raw-source fallback for the shared: strip every non-default locale. The page needs the key NAMES
      // to reference them, not three translations of each string — 18KB of a 95KB shared on
      // projectDetailWorkspace. Same trim the CLI applies (i18n.md §12.1).
      const trimmed = pipelineItem.type === 'l2_page' && isSharedRuntimeTsRef(path)
        ? trimSharedI18nForPageContext(content)
        : content;
      sections.push(buildContextSection(path, trimmed));
    }
  }
  return sections;
}

async function persistSharedDtsArtifact(sharedTsPath: string): Promise<void> {
  const artifactPath = sharedDtsArtifactRef(sharedTsPath);
  if (!artifactPath) return;
  const dts = await getCompiledDtsByMlsPath(sharedTsPath);
  if (dts) await saveArtifactTextByMlsPath(artifactPath, dts);
}

// Fresh persisted artifact first (readable by both runtimes), then compile on demand. An artifact
// older than the shared .ts is stale (e.g. shared regenerated by the CLI) and is ignored.
async function resolveSharedDts(sharedTsPath: string): Promise<string | null> {
  const artifactPath = sharedDtsArtifactRef(sharedTsPath);
  if (artifactPath) {
    const artifactModified = getFileModifiedByMlsPath(artifactPath);
    const sharedModified = getFileModifiedByMlsPath(sharedTsPath);
    if (artifactModified !== null && (sharedModified === null || artifactModified >= sharedModified)) {
      const artifact = await getContentByMlsPath(artifactPath);
      if (artifact && artifact.trim()) return artifact;
    }
  }
  return getCompiledDtsByMlsPath(sharedTsPath);
}

async function readSections(paths: string[], kind: 'skill'): Promise<string[]> {
  void kind;
  const sections: string[] = [];
  for (const path of paths) {
    const content = await getContentByMlsPath(path);
    if (!content) continue;
    sections.push(`<!-- skill: ${path} -->\n${content}`);
  }
  return sections;
}

function mkStatus(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg?: string,
  cleaner?: 'input' | 'input_output',
): mls.msg.AgentIntentUpdateStatus {
  if (traceMsg) {
    if (status === 'failed') console.error(`[${AGENT_NAME}] ${traceMsg}`);
    else if (status === 'completed' && traceMsg.includes('Studio diagnostics')) console.warn(`[${AGENT_NAME}] ${traceMsg}`);
  }
  return {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    status,
    traceMsg,
    cleaner,
  };
}

// Failure policy (skills/collab_messages.md): a 'failed' PARALLEL child fails the whole task, so
// fan-out slots NEVER return 'failed'. Repair runs (attempt >= 2) must also be able to continue to
// the NEXT repair round, so they don't self-fail either. Every failure path here completes with a
// 'MATERIALIZE-FAILED: ' trace; the phase 'verify' step (agentCfeMaterializePhase, mode 'verify') is
// the completion gate — it runs bounded repair rounds with the compiler error in context
// (specAuraForge §11). Exhaustion is recorded as CLI-materialization pending because the CLI can
// continue from the generated artifacts without discarding the whole changeFrontend task.
function mkFailureStatus(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  repairRun: boolean,
  detail: string,
  manualRerunHint = false,
): mls.msg.AgentIntentUpdateStatus {
  // The output cap is not a code defect and a repair cannot fix it — the same prompt hits the same
  // ceiling. Say so in the trace, with the file to write, so the run is not read as a flaky failure.
  // KNOWN LIMIT: the verify still spends its repair rounds on this item, because it reads the artifact
  // from disk and never sees this reason (paginaDividida.md §4.1).
  const hint = isSplitWorthyFailure(detail) ? ' -> does not fit in one call: SPLIT this page (todo/changeFrontend/paginaDividida.md); a repair cannot help.' : '';
  return mkStatus(context, parentStep, step, hookSequential, 'completed', `MATERIALIZE-FAILED: ${detail}${hint}`, 'input_output');
}

// Lenient attempt read for catch paths (raw may be missing or invalid JSON).
function isRepairRun(raw: string | undefined): boolean {
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    return isRecord(parsed) && typeof parsed.attempt === 'number' && parsed.attempt >= 2;
  } catch {
    return false;
  }
}

function withStudioDiagnostics(message: string, diagnostics = consumeMaterializeStudioMessages()): string {
  if (!diagnostics.length) return message;
  return `${message}\n${formatStudioDiagnostics(diagnostics)}`;
}

function formatStudioDiagnostics(diagnostics: ReturnType<typeof consumeMaterializeStudioMessages>): string {
  return [
    'Studio diagnostics:',
    ...diagnostics.map(item => `- ${item.level}: ${item.message}`),
  ].join('\n');
}

function parseGenStepArgs(raw: string | undefined): GenStepArgs {
  if (!raw) throw new Error('missing args');
  const parsed = JSON.parse(raw);
  if (!isRecord(parsed)) throw new Error('args must be an object');
  const planId = readString(parsed.planId);
  const defPath = readString(parsed.defPath);
  if (!planId || !defPath) throw new Error('args missing planId or defPath');
  const attempt = typeof parsed.attempt === 'number' && Number.isInteger(parsed.attempt) ? parsed.attempt : undefined;
  const repairHint = readString(parsed.repairHint) || undefined;
  // WHICH item of the defs this slot builds. Absent on a task queued before split support: the slot then
  // resolves pipeline[0], which is what one-artifact-per-defs always meant.
  const itemId = readString(parsed.itemId) || undefined;
  return { planId, defPath, attempt, repairHint, itemId };
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function formatError(stage: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `${stage}: ${message}`;
}

function describePayload(raw: unknown): string {
  if (raw === null) return 'null';
  if (raw === undefined) return 'undefined';
  if (typeof raw === 'string') return `string(${raw.slice(0, 160)})`;
  if (typeof raw !== 'object') return typeof raw;
  if (Array.isArray(raw)) return `array(${raw.length})`;
  const keys = Object.keys(raw as Record<string, unknown>).slice(0, 8);
  return `object keys=[${keys.join(',')}]`;
}
