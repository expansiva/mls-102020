/// <mls fileReference="_102020_/l2/agentImplementsDesignSystem2/agentGenDefs2.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Group B executor (Fase E). One per page; waits on its own select step.
// beforePromptStep → prompt (ORIGIN defs page11 + NEW defs with moleculeAssignments).
// afterPromptStep  → write the assembled FINAL defs into page{layout}{ds}/<page>.defs.ts.
//
// The LLM only ASSEMBLES the already-resolved molecules into the loose-JSON definition;
// it must NOT re-pick molecules (consistency is guaranteed by the deterministic resolve).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { buildWorkItem } from '/_102020_/l2/dsMatch/derivePaths.js';
import { parseStepArgs, readRawSource, saveFile, mkCompleted, mkFail } from '/_102020_/l2/agentImplementsDesignSystem2/planning.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentGenDefs2',
    agentProject: 102020,
    agentFolder: 'agentImplementsDesignSystem2',
    agentDescription: 'Assemble the final page defs from origin defs + resolved molecules (Fase E)',
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

  const a = parseStepArgs(args ?? step.prompt);
  const project = mls.actualProject || 0;
  const item = buildWorkItem(project, a.module, a.layout, a.ds, a.page!, a.device);

  const origemSource = await readRawSource(item.defsOrigem);
  const novoSource = await readRawSource(item.defsDestino); // moleculeAssignments + usagePaths

  const humanPrompt = [
    `## Original page defs (page11) — mirror this exact structure\n\`\`\`typescript\n${origemSource}\n\`\`\``,
    `## Resolved molecules (ALREADY chosen — do NOT change them; just place them)\n\`\`\`typescript\n${novoSource}\n\`\`\``,
    `## Output path\n${item.defsDestino}`,
  ].join('\n\n');

  const continueParallel: mls.msg.AgentIntentPromptReady = {
    type: 'prompt_ready',
    args: args ?? step.prompt,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    humanPrompt,
    systemPrompt: system1,
  };

  return [continueParallel];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {

  try {
    const payload = step.interaction?.payload?.[0];
    if (payload?.type !== 'flexible' || !payload.result) throw new Error(`invalid payload: ${JSON.stringify(payload)}`);

    const out = payload.result as Output['result'];
    if (typeof out.srcFile !== 'string' || !out.srcFile) throw new Error('missing srcFile in result');

    const a = parseStepArgs(step.prompt);
    const project = mls.actualProject || 0;
    const item = buildWorkItem(project, a.module, a.layout, a.ds, a.page!, a.device);

    // The LLM returns ONLY the clean merged defs. We append the molecule metadata exports
    // here, deterministically, by reading them from the NEW defs BEFORE we overwrite it
    // (so the terminal can record which molecules the page used). Guarded so we never
    // duplicate if the model already emitted them.
    let finalSrc = out.srcFile;
    if (!finalSrc.includes('export const moleculeAssignments')) {
      const tail = extractAssignmentsTail(await readRawSource(item.defsDestino));
      if (tail) finalSrc = `${finalSrc.replace(/\s*$/, '')}\n\n${tail}\n`;
    }

    if (!context.isTest) await saveFile(item.defsDestino, finalSrc);

    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentGenDefs2] ${error instanceof Error ? error.message : String(error)}`)];
  }
}

/** The molecule metadata exports from the NEW defs (moleculeAssignments + usagePaths). */
function extractAssignmentsTail(novoSource: string): string {
  const idx = novoSource.indexOf('export const moleculeAssignments');
  return idx >= 0 ? novoSource.slice(idx).trim() : '';
}

const system1 = `
<!-- modelType: codereasoning -->

You must return ONLY a valid JSON object. No preamble, no markdown fences.
srcFile MUST be a single JSON string: escape newlines as \\n, tabs as \\t, double quotes
as \\", backslashes as \\\\. Never embed raw multiline code in the JSON value.

## Task
Produce the FINAL page defs for the new design system, given the ORIGINAL page defs
(page11) and the RESOLVED molecule assignments.

## Rules
- Mirror the ORIGINAL defs structure exactly (same exports, sections, organisms, fields).
- For each organism, inject a "molecules" array from moleculeAssignments (match by
  organismName): each entry { "group", "tag", "purpose" }. Organisms with no assigned
  molecules stay unchanged.
- NEVER change/add/remove molecule choices — use EXACTLY the tags given. You only PLACE them.
- Add "moleculesPaths" to the pipeline entry, copied from usagePaths.
- Repoint the first line /// <mls fileReference=...> and any outputPath/defPath from
  page11 to the Output path's folder (page{layout}{ds}); keep the page name the same.
- Keep the loose JSON-ish formatting of the original definition.
- Output ONLY the merged defs (header + definition + pipeline). Do NOT re-emit the
  resolved-molecules input, its header, or its moleculeAssignments/usagePaths exports —
  those are appended later by code.

## Output format
[[OutputSection]]
`;

//#region OutputSection
export type Output = {
  type: 'flexible';
  result: { srcFile: string };
};
//#endregion
