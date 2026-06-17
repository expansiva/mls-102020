/// <mls fileReference="_102020_/l2/agentImplementsDesignSystem/agentGenDefs.ts" enhancement="_102027_/l2/enhancementAgent.ts"/>

// Fase E — agentGenDefs: assemble the FINAL page defs (phase 2).
//
// Entry: { module, layout, ds }. SELF-FANS over the pages (executionMode parallel),
// same pattern as agentSelectMoleculeGroups. Per page:
//
//   beforePromptStep → prompt: ORIGIN defs (page11) + NEW defs (with moleculeAssignments)
//   LLM             → the full final defs.ts source (assembles molecules into the defs)
//   afterPromptStep → overwrite page{layout}{ds}/<page>.defs.ts with the final source
//
// IMPORTANT: the molecules are ALREADY chosen (deterministically, in phase 1). The LLM
// here only ASSEMBLES them into the loose-JSON `definition` (which we don't parse) —
// it must NOT re-pick molecules. That preserves cross-page consistency.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createStorFile, IReqCreateStorFile } from '/_102027_/l2/libStor.js';
import { listWorkItems, DEFAULT_DEVICE } from '/_102020_/l2/dsMatch/derivePaths.js';

interface EntryArgs { module: string; layout: number | string; ds: number | string; device?: string; }
interface PageArgs { defsOrigem: string; defsDestino: string; }

export function createAgent(): IAgentAsync {
  return {
    agentName: "agentGenDefs",
    agentProject: 102020,
    agentFolder: "agentImplementsDesignSystem",
    agentDescription: "Assemble the final page defs from origin defs + resolved molecules (Fase E)",
    visibility: "public",
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {

  const { module, layout, ds, device } = JSON.parse(userPrompt) as EntryArgs;
  if (!module || layout == null || ds == null) throw new Error(`(${agent.agentName}) entry needs { module, layout, ds }`);

  const project = mls.actualProject || 0;
  const dev = device || DEFAULT_DEVICE;
  const items = listWorkItems(project, module, layout, ds, dev);
  if (items.length === 0) throw new Error(`(${agent.agentName}) no pages found in ${module}/web/${dev}/page11`);

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: "add-message-ai",
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [{ type: 'system', content: system1 }],
      taskTitle: agent.agentDescription,
      threadId: context.message.threadId,
      userMessage: `Assemble defs for DS ${ds} (layout ${layout}) of ${module}`,
      longTermMemory: { module, layout: String(layout), ds: String(ds), device: dev },
    },
    executionMode: {
      type: 'parallel',
      args: items.map(i => JSON.stringify({ defsOrigem: i.defsOrigem, defsDestino: i.defsDestino } as PageArgs)),
    },
  };

  return [addMessageAI];
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {

  if (!args) throw new Error(`(${agent.agentName})[beforePromptStep] args invalid`);
  const { defsOrigem, defsDestino } = JSON.parse(args) as PageArgs;

  const prompt = await buildPrompt(defsOrigem, defsDestino);

  const continueParallel: mls.msg.AgentIntentPromptReady = {
    type: "prompt_ready",
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    humanPrompt: prompt,
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

  if (!agent || !context || !step) throw new Error(`(${agent.agentName}) [afterPromptStep] invalid params`);

  const payload = step.interaction?.payload?.[0];
  if (payload?.type !== 'flexible' || !payload.result) {
    throw new Error(`(${agent.agentName}) [afterPromptStep] invalid payload: ${JSON.stringify(payload)}`);
  }

  const out = payload.result as Output['result'];
  if (!out.path || typeof out.srcFile !== 'string') throw new Error(`(${agent.agentName}) invalid result: ${JSON.stringify(out)}`);

  // Overwrite the destination defs with the final assembled source.
  if (!context.isTest) await saveFile(out.path, out.srcFile);

  const updateStatus: mls.msg.AgentIntentUpdateStatus = {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    status: 'completed',
  };

  return [updateStatus];
}

async function buildPrompt(defsOrigem: string, defsDestino: string): Promise<string> {
  const origemSource = await readRawSource(defsOrigem);
  const novoSource = await readRawSource(defsDestino); // the phase-1 file: moleculeAssignments + usagePaths

  return [
    `## Original page defs (page11) — mirror this exact structure\n\`\`\`typescript\n${origemSource}\n\`\`\``,
    `## Resolved molecules (ALREADY chosen — do NOT change them; just place them)\n\`\`\`typescript\n${novoSource}\n\`\`\``,
    `## Output path\n${defsDestino}`,
  ].join('\n\n');
}

async function readRawSource(ref: string): Promise<string> {
  const norm = ref.startsWith('/') ? ref.slice(1) : ref;
  const info = mls.stor.convertFileReferenceToFile(norm);
  const key = mls.stor.getKeyToFile(info);
  const sf = mls.stor.files[key];
  if (!sf) throw new Error(`[agentGenDefs] file not found: ${ref}`);
  const content = await sf.getContent();
  return typeof content === 'string' ? content : '';
}

async function saveFile(ref: string, src: string): Promise<void> {
  const info = mls.stor.convertFileReferenceToFile(ref);
  const key = mls.stor.getKeyToFile(info);
  let sf = mls.stor.files[key];
  if (!sf) {
    const param: IReqCreateStorFile = { ...info, source: src };
    sf = await createStorFile(param, true, true, true);
  } else {
    const m = await sf.getOrCreateModel();
    if (m && m.model) m.model.setValue(src);
  }
  await mls.stor.localStor.setContent(sf, { contentType: 'string', content: src });
}

const system1 = `
<!-- modelType: codereasoning -->

You must return ONLY a valid JSON object. No preamble, no explanation, no markdown
fences, no text before or after the JSON. Start your response with { and end with }

## Output srcFile escaping
srcFile MUST be a single JSON string. Escape ALL special characters inside it:
newlines → \\n, tabs → \\t, double quotes → \\", backslashes → \\\\. Never embed raw
multiline code inside the JSON string value.

## Task
Produce the FINAL page defs for the new design system, given the ORIGINAL page defs
(page11) and the RESOLVED molecule assignments.

## Rules
- Mirror the ORIGINAL defs structure exactly (same exports, same sections/organisms,
  same fields). Do NOT drop or rename anything.
- For each organism, inject a "molecules" array taken from moleculeAssignments
  (match by organismName). Each entry: { "group": ..., "tag": ..., "purpose": ... }.
  Organisms with no assigned molecules stay unchanged (no "molecules" key).
- You MUST NOT change, add or remove molecule choices. Use EXACTLY the tags given in
  moleculeAssignments. You only PLACE them — you never decide them.
- Add "moleculesPaths" to the pipeline entry, copied from the usagePaths value.
- Repoint to the destination: the first line /// <mls fileReference=...> and any
  outputPath/defPath in the pipeline must point to the Output path's folder
  (page{layout}{ds}) instead of page11. Keep the file (page) name the same.
- Keep the loose JSON-ish formatting of the original definition; do not "fix" it.

## Output format

[[OutputSection]]

`;

//#region OutputSection
export type Output = {
  type: "flexible";
  result: {
    path: string;     // echo the Output path
    srcFile: string;  // the full final defs.ts source, as a single escaped string
  };
};
//#endregion
