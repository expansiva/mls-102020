/// <mls fileReference="_102020_/l2/aura/agentManagePage/agentRenderEdit.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Render step of agentManagePage: re-generate a page's `.ts` from its (just edited) `.defs.ts`,
// DELTA-aware. Lean — reuses the materialization primitives (does NOT re-implement them, and does
// NOT pull the scan/phase/staleness machinery):
//   buildSystemPrompt/buildHumanPrompt, GEN_TOOL (code comes back via a tool call), applyHeader,
//   normalizeGeneratedCode, buildContextSection, buildCompileRepairHint (cfeMaterializeCore);
//   getContentByMlsPath/saveGeneratedTsByMlsPath/compileMlsPathAndGetErrors/extractToolCallArgs
//   (cfeMaterializeStudio).
//
// Context/skills come from the defs' OWN pipeline (the `l2_page` item), so it is agnostic to genome
// vs mode pages. Delta = the current `.ts` + the page's `pageAdjustments`, with a minimal-change
// instruction. Compile is checked after saving; on errors we do ONE repair round (Option B): a
// second render step (attempt 2) re-prompts with the compiler errors. Still failing → surface them.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { pageRef } from '/_102020_/l2/aura/helpers/dsMatch/derivePaths.js';
import { mkAgentStep, mkCompleted, mkFail, makePlanId } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import { parseExportValue } from '/_102020_/l2/aura/helpers/dsMatch/pageAdjustments.js';
import { buildDeltaSection, type EditOperation } from '/_102020_/l2/aura/agentManagePage/editCore.js';
import {
  buildSystemPrompt, buildHumanPrompt, buildContextSection, buildCompileRepairHint,
  applyHeader, normalizeGeneratedCode, GEN_TOOL, GEN_TOOL_NAME, DEFAULT_MODEL_TYPE, type PipelineItem,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';
import {
  getContentByMlsPath, saveGeneratedTsByMlsPath, compileMlsPathAndGetErrors, extractToolCallArgs,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';

interface RenderArgs {
  module: string;
  page: string;
  layout: number | string;
  ds: number | string;
  device: string;
  // The CURRENT edit (from agentManagePage) — drives the delta's minimal-change instruction. The
  // edited `definition` already carries the change; this tells the render what changed vs the code.
  request?: string;
  operations?: EditOperation[];
  imageUrl?: string;
  attempt?: number;   // 1 = first pass; 2 = single repair round (Option B)
}

interface ToolOutput { code: string; }

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentRenderEdit',
    agentProject: 102020,
    agentFolder: 'aura/agentManagePage',
    agentDescription: 'Re-render a page .ts from its edited defs (delta-aware); one repair round on compile errors',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

function parseArgs(prompt: string | undefined): RenderArgs {
  if (!prompt) throw new Error('[agentRenderEdit] empty step prompt');
  const a = JSON.parse(prompt) as RenderArgs;
  if (!a.module || !a.page || a.layout == null || a.ds == null) throw new Error(`[agentRenderEdit] invalid args: ${prompt}`);
  if (!a.device) a.device = 'desktop';
  return a;
}

function refOf(a: RenderArgs, ext: '.ts' | '.defs.ts'): string {
  const project = mls.actualProject || 0;
  return pageRef(project, a.module, a.layout, a.ds, a.page, ext, a.device);
}

function norm(ref: string): string { return ref.startsWith('/') ? ref.slice(1) : ref; }

/** Select the pipeline item that renders this page's `.ts`. Robust to multi-item pipelines
 *  (parseDefs's `[0]` is wrong for mode defs where item 0 is a defs step). */
function selectPageItem(pipeline: unknown, tsRef: string): PipelineItem | null {
  const arr = Array.isArray(pipeline) ? pipeline as PipelineItem[] : [];
  const byOut = arr.find(it => it?.type === 'l2_page' && norm(it.outputPath) === norm(tsRef));
  if (byOut) return byOut;
  const byType = arr.find(it => it?.type === 'l2_page');
  return byType ?? (arr.length ? arr[arr.length - 1] : null);
}

async function readSections(refs: string[] | undefined, kind: 'skill' | 'context'): Promise<string[]> {
  const out: string[] = [];
  for (const ref of refs ?? []) {
    const content = await getContentByMlsPath(ref);
    if (!content) continue;
    out.push(kind === 'skill' ? `<!-- skill: ${ref} -->\n${content}` : buildContextSection(ref, content));
  }
  return out;
}

async function loadRenderContext(a: RenderArgs): Promise<{ item: PipelineItem; definition: unknown; defsContent: string; tsRef: string } | null> {
  const defsRef = refOf(a, '.defs.ts');
  const defsContent = await getContentByMlsPath(defsRef);
  if (!defsContent) throw new Error(`defs not found: ${defsRef}`);
  const tsRef = refOf(a, '.ts');
  const item = selectPageItem(parseExportValue(defsContent, 'pipeline'), tsRef);
  if (!item) return null;
  return { item, definition: parseExportValue(defsContent, 'definition'), defsContent, tsRef };
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
    const a = parseArgs(args ?? step.prompt);
    const attempt = a.attempt ?? 1;
    const ctx = await loadRenderContext(a);
    if (!ctx) throw new Error(`no l2_page pipeline item for ${a.page}`);
    const { item, definition } = ctx;

    const skillSections = await readSections(item.skills, 'skill');
    const contextSections = await readSections(item.dependsFiles, 'context');

    // Delta: current generated code + the CURRENT edit request (minimal-change instruction). The
    // change is already folded into `definition`; this preserves the rest of the code verbatim.
    const currentCode = await getContentByMlsPath(item.outputPath);
    const delta = buildDeltaSection(currentCode, a.request ? { request: a.request, operations: a.operations, imageUrl: a.imageUrl } : null);
    if (delta) contextSections.push(delta);

    // Option B — one repair round: on attempt 2, feed the current .ts's compiler errors back.
    let repairHint: string | undefined;
    if (attempt >= 2) {
      const errors = await compileMlsPathAndGetErrors(item.outputPath);
      if (errors.length) repairHint = buildCompileRepairHint(item.outputPath, errors.slice(0, 8));
    }
    console.info(`[agentRenderEdit] ▶ ${a.page} render (attempt ${attempt}) → ${item.outputPath}`);

    const continueParallel: mls.msg.AgentIntentPromptReady = {
      type: 'prompt_ready',
      args: args ?? step.prompt ?? '',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      hookSequential,
      parentStepId: parentStep.stepId,
      systemPrompt: buildSystemPrompt(skillSections, item.outputPath, DEFAULT_MODEL_TYPE),
      humanPrompt: buildHumanPrompt(definition, contextSections, item.outputPath, repairHint),
      tools: [GEN_TOOL as unknown as mls.msg.LLMTool],
      toolChoice: { type: 'function', function: { name: GEN_TOOL_NAME } },
    };
    return [continueParallel];
  } catch (error) {
    const msg = `[agentRenderEdit] ${error instanceof Error ? error.message : String(error)}`;
    console.error('✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
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
    const a = parseArgs(step.prompt);
    const attempt = a.attempt ?? 1;
    const ctx = await loadRenderContext(a);
    if (!ctx) return [mkFail(context, parentStep, step, hookSequential, `no l2_page pipeline item for ${a.page}`)];
    const { item, definition } = ctx;

    const output = extractToolCallArgs<ToolOutput>(step.interaction?.payload?.[0], GEN_TOOL_NAME);
    if (!output?.code) return [mkFail(context, parentStep, step, hookSequential, 'render returned no code')];

    const code = applyHeader(item.outputPath, normalizeGeneratedCode(item, definition, output.code));
    if (!context.isTest) {
      const saved = await saveGeneratedTsByMlsPath(item.outputPath, code);
      if (!saved) return [mkFail(context, parentStep, step, hookSequential, `save failed: ${item.outputPath}`)];
    }

    const errors = context.isTest ? [] : await compileMlsPathAndGetErrors(item.outputPath);
    if (errors.length) {
      if (attempt < 2) {
        // Option B: one repair round — complete this pass, queue a second render (attempt 2).
        console.info(`[agentRenderEdit] ${a.page}: ${errors.length} erro(s) de compilação → rodada de reparo`);
        const repairArgs: RenderArgs = { ...a, attempt: 2 };
        return [
          mkCompleted(context, parentStep, step, hookSequential),
          mkAgentStep(context, parentStep, makePlanId('render-repair', a.page), `Render (repair): ${a.page}`,
            'agentRenderEdit', repairArgs as any, [], 'waiting_human_input', 'sequential'),
        ];
      }
      // Still failing after the repair round: the .ts was saved but has errors — surface them.
      return [mkFail(context, parentStep, step, hookSequential, `render com erro(s) de compilação após reparo:\n${errors.slice(0, 8).join('\n')}`)];
    }

    console.info(`[agentRenderEdit] ✓ ${a.page}: .ts regenerado (attempt ${attempt})`);
    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    const msg = `[agentRenderEdit] ${error instanceof Error ? error.message : String(error)}`;
    console.error('✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}
