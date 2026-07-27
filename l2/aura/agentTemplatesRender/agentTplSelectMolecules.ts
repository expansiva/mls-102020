/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/agentTplSelectMolecules.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Cascade step 2/2 of the molecule mode (useMolecules): pick the best molecule of each chosen group — or
// NONE. LLM, once per new template. Reads the library ONLY for the groups agentTplGroups selected, and
// only their condensed defs (TagName + layoutConfig + Objective), which is what decides the fit.
//
// Reads  trace/templatesRender/<genome>/<templateId>.groups.md
// Writes trace/templatesRender/<genome>/<templateId>.molecules.md  (the plan agentTplWriteTemplate embeds)

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { mkFail, mkCompleted } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import {
  parseTplArgs, groupsTraceRef, moleculesPlanRef, listMoleculeDefsRefs, summarizeMoleculeDefs,
  parseMoleculePlan, readFile, saveTextArtifact, buildFileSystemPrompt, buildLabelledHuman,
  extractFileContent, MOLECULES_PROJECT, TPL_FILE_TOOL, TPL_FILE_TOOL_NAME, type TplArgs,
} from '/_102020_/l2/aura/agentTemplatesRender/tplCore.js';
import { skill as selectMoleculesSkill } from '/_102020_/l2/aura/agentTemplatesRender/skills/selectMoleculesForTemplate.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentTplSelectMolecules',
    agentProject: 102020,
    agentFolder: 'aura/agentTemplatesRender',
    agentDescription: 'Pick the best molecule of each chosen group (or none) and write the template molecule plan',
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
    const a = parseTplArgs(args ?? step.prompt);
    if (!a.templateId) throw new Error('missing templateId');
    const project = mls.actualProject || 0;
    const outPath = moleculesPlanRef(project, a.module, a.genome, a.templateId);

    const groupsMd = await readFile(groupsTraceRef(project, a.module, a.genome, a.templateId));
    if (!groupsMd) throw new Error(`groups trace not found: ${groupsTraceRef(project, a.module, a.genome, a.templateId)}`);
    const { groups } = parseMoleculePlan(groupsMd);

    // No group fits this template: nothing to select. Emit an explicit empty plan (the write-template
    // step then keeps the v1 guide — see hasMoleculesSection downstream) and finish without an LLM call.
    if (!groups.length) {
      console.info(`[agentTplSelectMolecules] ${a.templateId}: no intent group selected → no molecules`);
      if (!context.isTest) await saveTextArtifact(outPath, emptyPlanMd(a));
      return [mkCompleted(context, parentStep, step, hookSequential, 'no intent group selected — template stays hand-drawn')];
    }

    // Library read, restricted to the chosen groups and to the fields that decide the fit.
    const catalogBlocks: string[] = [];
    let moleculeCount = 0;
    for (const group of groups) {
      const refs = listMoleculeDefsRefs(group);
      if (!refs.length) {
        console.warn(`[agentTplSelectMolecules] group ${group}: no molecule found in _${MOLECULES_PROJECT}_`);
        continue;
      }
      const items: string[] = [];
      for (const ref of refs) {
        const src = await readFile(ref);
        if (!src) continue;
        items.push(summarizeMoleculeDefs(ref, src));
        moleculeCount++;
      }
      if (items.length) catalogBlocks.push(`### ${group}\n${items.join('\n')}`);
    }
    if (!moleculeCount) {
      throw new Error(`no molecule could be read from _${MOLECULES_PROJECT}_ for group(s) ${groups.join(', ')} — `
        + `is the molecule library present in this stor?`);
    }
    console.info(`[agentTplSelectMolecules] ▶ ${a.templateId}: ${moleculeCount} molecule(s) across ${groups.length} group(s)`);

    const humanPrompt = buildLabelledHuman([
      { title: `Template`, body: `Style: **${a.styleModel}**. Template id: **${a.templateId}**.` },
      { title: `Elements and their groups (from the groups step)`, body: groupsMd },
      { title: `Molecules available in the chosen groups`, body: catalogBlocks.join('\n\n') },
    ], outPath);

    const continueParallel: mls.msg.AgentIntentPromptReady = {
      type: 'prompt_ready',
      args: args ?? step.prompt ?? '',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      hookSequential,
      parentStepId: parentStep.stepId,
      systemPrompt: buildFileSystemPrompt(selectMoleculesSkill, 'code', outPath),
      humanPrompt,
      tools: [TPL_FILE_TOOL as unknown as mls.msg.LLMTool],
      toolChoice: { type: 'function', function: { name: TPL_FILE_TOOL_NAME } },
    };
    return [continueParallel];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentTplSelectMolecules] ${error instanceof Error ? error.message : String(error)}`)];
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
    const outPath = moleculesPlanRef(project, a.module, a.genome, a.templateId!);

    const content = extractFileContent(step.interaction?.payload?.[0]);
    if (!content) return [mkFail(context, parentStep, step, hookSequential, 'select-molecules returned no content')];

    const { tags } = parseMoleculePlan(content);
    console.info(`[agentTplSelectMolecules] ${a.templateId}: ${tags.length} molecule(s) chosen:`, tags);

    if (!context.isTest) {
      const ok = await saveTextArtifact(outPath, content);
      if (!ok) return [mkFail(context, parentStep, step, hookSequential, `save failed: ${outPath}`)];
      console.info(`[agentTplSelectMolecules] ✓ ${a.templateId}: plan written`);
    }
    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentTplSelectMolecules] ${error instanceof Error ? error.message : String(error)}`)];
  }
}

/** Plan with no molecule at all — keeps the artifact contract while saying "nothing fits". */
function emptyPlanMd(a: TplArgs): string {
  return [
    `# Molecules — ${a.templateId} (${a.styleModel})`,
    '',
    'No intent group of the molecule library fits this template: every element is hand-drawn.',
    '',
    '## Groups',
    '',
    '## TagNames',
    '',
  ].join('\n');
}
