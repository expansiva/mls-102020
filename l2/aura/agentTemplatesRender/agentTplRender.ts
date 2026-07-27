/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/agentTplRender.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Render the page .ts from the (fixed) .defs, guided by the template. Tailwind (layout) + DS tokens
// (colors); with useMolecules, the elements the template prescribes come from the 102040 molecule library
// (defs + group usage skills loaded here). Self-contained context (template + shared + contracts + DS);
// definition read from the defs file. Reuses the materialization primitives (system/human prompt,
// GEN_TOOL, header/normalize, save + compile). Compile-check after save; ONE repair round (Option B).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { mkAgentStep, mkCompleted, mkFail, makePlanId } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import {
  buildSystemPrompt, buildHumanPrompt, buildContextSection, buildCompileRepairHint,
  applyHeader, normalizeGeneratedCode, parseDefs, GEN_TOOL, GEN_TOOL_NAME, DEFAULT_MODEL_TYPE,
  type PipelineItem,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';
import {
  getContentByMlsPath, saveGeneratedTsByMlsPath, compileMlsPathAndGetErrors, extractToolCallArgs,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';
import {
  parseTplArgs, workspaceRef, templateRef, sharedRef, designSystemRef, defsDestRef, tsDestRef,
  listContractRefs, readFile, hasMoleculesSection, extractTemplateMolecules, moleculeRefsFromTag,
  readUsageSkill, type TplArgs,
} from '/_102020_/l2/aura/agentTemplatesRender/tplCore.js';
import { skill as renderSkill } from '/_102020_/l2/aura/agentTemplatesRender/skills/renderFromTemplate.js';
import { renderAddendum } from '/_102020_/l2/aura/agentTemplatesRender/skills/moleculesAddenda.js';

interface ToolOutput { code: string; }

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentTplRender',
    agentProject: 102020,
    agentFolder: 'aura/agentTemplatesRender',
    agentDescription: 'Render a page .ts (Tailwind + DS tokens) following the template page structure; one repair round',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

/** Molecule context: the defs of the molecules the template prescribes + the usage skill of their groups. */
async function buildMoleculeSections(templateMd: string, defsContent: string): Promise<string[]> {
  const { groups, tags } = extractTemplateMolecules(templateMd);
  // The defs may narrow the template's set (a page need not use every prescribed molecule) — never widen it.
  const used = tags.filter(t => defsContent.includes(t));
  const chosen = used.length ? used : tags;
  if (used.length && used.length !== tags.length) {
    console.info(`[agentTplRender] molecules narrowed by the defs: ${used.length}/${tags.length}`);
  }

  const sections: string[] = [];
  for (const tag of chosen) {
    const refs = moleculeRefsFromTag(tag);
    if (!refs) { console.warn(`[agentTplRender] malformed molecule tag in template: ${tag}`); continue; }
    const src = await readFile(refs.defs);
    if (src) sections.push(buildContextSection(`${refs.defs} (MOLECULE — exact TagName, objective, constraints)`, src));
    else console.warn(`[agentTplRender] molecule defs not found: ${refs.defs}`);
  }
  const usedGroups = groups.filter(g => chosen.some(t => t.startsWith(`${g.toLowerCase()}--`)));
  for (const group of usedGroups) {
    const usage = await readUsageSkill(group);
    if (usage) sections.push(`### ${usage.ref} (MOLECULE USAGE — ${group}: props, events, slot tags, tokens)\n${usage.body}`);
    else console.warn(`[agentTplRender] usage skill not found for group ${group}`);
  }
  console.info(`[agentTplRender] molecule context: ${chosen.length} molecule(s), ${usedGroups.length} usage skill(s)`);
  return sections;
}

/** Build the context sections for the render prompt (template as plain md; the rest as ts/summary). */
async function buildRenderContext(a: TplArgs, project: number): Promise<{ definition: unknown; sections: string[]; withMolecules: boolean }> {
  const defsRef = defsDestRef(a, project);
  const defsContent = await readFile(defsRef);
  if (!defsContent) throw new Error(`defs not found: ${defsRef}`);
  const definition = parseDefs(defsContent).data;

  const sections: string[] = [];
  const template = await readFile(templateRef(project, a.styleModel, a.templateId!));
  if (template) sections.push(`### ${templateRef(project, a.styleModel, a.templateId!)} (UX TEMPLATE — page structure & rules to follow)\n${template}`);
  const workspace = await readFile(workspaceRef(project, a.module, a.page!));
  if (workspace) sections.push(buildContextSection(workspaceRef(project, a.module, a.page!), workspace));
  const shared = await readFile(sharedRef(project, a.module, a.page!));
  if (shared) sections.push(buildContextSection(sharedRef(project, a.module, a.page!), shared));
  for (const ref of listContractRefs(project, a.module, a.page!, a.device)) {
    const c = await readFile(ref);
    if (c) sections.push(buildContextSection(ref, c));
  }
  const ds = await readFile(designSystemRef(project));
  if (ds) sections.push(buildContextSection(designSystemRef(project), ds));

  const withMolecules = a.useMolecules === true && hasMoleculesSection(template);
  if (withMolecules) sections.push(...await buildMoleculeSections(template, defsContent));
  return { definition, sections, withMolecules };
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
    const a = parseTplArgs(args ?? step.prompt);
    if (!a.page || !a.templateId) throw new Error('missing page or templateId');
    const project = mls.actualProject || 0;
    const outPath = tsDestRef(a, project);
    const attempt = a.attempt ?? 1;

    const { definition, sections, withMolecules } = await buildRenderContext(a, project);

    let repairHint: string | undefined;
    if (attempt >= 2) {
      const errors = await compileMlsPathAndGetErrors(outPath);
      if (errors.length) repairHint = buildCompileRepairHint(outPath, errors.slice(0, 8));
    }
    console.info(`[agentTplRender] ▶ ${a.page} (attempt ${attempt}) → ${outPath}`);

    const skillSection = withMolecules
      ? `<!-- skill: renderFromTemplate + molecules -->\n${renderSkill}\n${renderAddendum}`
      : `<!-- skill: renderFromTemplate -->\n${renderSkill}`;
    const continueParallel: mls.msg.AgentIntentPromptReady = {
      type: 'prompt_ready',
      args: args ?? step.prompt ?? '',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      hookSequential,
      parentStepId: parentStep.stepId,
      systemPrompt: buildSystemPrompt([skillSection], outPath, DEFAULT_MODEL_TYPE),
      humanPrompt: buildHumanPrompt(definition, sections, outPath, repairHint),
      tools: [GEN_TOOL as unknown as mls.msg.LLMTool],
      toolChoice: { type: 'function', function: { name: GEN_TOOL_NAME } },
    };
    return [continueParallel];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentTplRender] ${error instanceof Error ? error.message : String(error)}`)];
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
    const a = parseTplArgs(step.prompt);
    const project = mls.actualProject || 0;
    const outPath = tsDestRef(a, project);
    const attempt = a.attempt ?? 1;

    const defsContent = await readFile(defsDestRef(a, project));
    const definition = defsContent ? parseDefs(defsContent).data : null;
    const pseudoItem: PipelineItem = { id: a.page!, type: 'l2_page', outputPath: outPath };

    const output = extractToolCallArgs<ToolOutput>(step.interaction?.payload?.[0], GEN_TOOL_NAME);
    if (!output?.code) return [mkFail(context, parentStep, step, hookSequential, 'render returned no code')];

    const code = applyHeader(outPath, normalizeGeneratedCode(pseudoItem, definition, output.code));
    if (!context.isTest) {
      const saved = await saveGeneratedTsByMlsPath(outPath, code);
      if (!saved) return [mkFail(context, parentStep, step, hookSequential, `save failed: ${outPath}`)];
    }

    const errors = context.isTest ? [] : await compileMlsPathAndGetErrors(outPath);
    if (errors.length) {
      if (attempt < 2) {
        console.info(`[agentTplRender] ${a.page}: ${errors.length} compile error(s) → repair round`);
        const repairArgs: TplArgs = { ...a, attempt: 2 };
        // Repair is a CHILD of THIS render step (`step`), added during its own hook — parenting to an
        // ancestor (parentStep) fails once it completed. No self-complete: the framework closes this
        // step when the repair child finishes.
        return [
          mkAgentStep(context, step, makePlanId('render-repair', a.page), `Render (repair): ${a.page}`,
            'agentTplRender', repairArgs as any, [], 'waiting_human_input', 'sequential'),
        ];
      }
      return [mkFail(context, parentStep, step, hookSequential, `render compile error(s) after repair:\n${errors.slice(0, 8).join('\n')}`)];
    }

    console.info(`[agentTplRender] ✓ ${a.page}: .ts rendered (attempt ${attempt})`);
    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentTplRender] ${error instanceof Error ? error.message : String(error)}`)];
  }
}
