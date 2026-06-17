/// <mls fileReference="_102020_/l2/agentImplementsDesignSystem/agentSelectMoleculeGroups.ts" enhancement="_102027_/l2/enhancementAgent.ts"/>

// Fase B + C — Agent1: per-page molecule selection.
//
// Entry: { module, layout, ds }. It SELF-FANS over the pages of the origin folder
// (page11) using executionMode parallel — same pattern as agentAddLanguage (a
// separate parent cannot spawn a different child agent; executionMode multiplies
// THIS agent). One parallel run per page:
//
//   beforePromptStep(<page .ts>) → prompt: rendered .ts + raw definition + groups
//   LLM                          → groups per organism                     [Fase B]
//   afterPromptStep:
//      resolveMolecules + assign  (deterministic — keeps pages consistent)  [Fase C]
//      WRITE page{layout}{ds}/<page>.defs.ts   ← survives the parallel batch
//
// The written file is consumed later by agentGenDefs (Fase E), which weaves the
// resolved molecules into the final defs. Variant choice stays here (deterministic);
// the LLM there only assembles.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createStorFile, IReqCreateStorFile } from '/_102027_/l2/libStor.js';
import { buildGroupList } from '/_102020_/l2/dsMatch/groupCatalog.js';
import { loadPageSource, loadPageDefinitionText, buildAgent1HumanPrompt, validateAgent1Output } from '/_102020_/l2/dsMatch/agent1.js';
import { readDsRules } from '/_102020_/l2/dsMatch/readDsRules.js';
import { buildMoleculeCatalog } from '/_102020_/l2/dsMatch/buildMoleculeCatalog.js';
import { resolveMolecules, assignMoleculesToPage, collectUsedGroups, collectUsagePaths } from '/_102020_/l2/dsMatch/resolveMolecules.js';
import { listWorkItems, buildWorkItem, DEFAULT_DEVICE } from '/_102020_/l2/dsMatch/derivePaths.js';

interface EntryArgs { module: string; layout: number | string; ds: number | string; device?: string; }

export function createAgent(): IAgentAsync {
  return {
    agentName: "agentSelectMoleculeGroups",
    agentProject: 102020,
    agentFolder: "agentImplementsDesignSystem",
    agentDescription: "Select molecule groups per organism and write the new page defs (Fase B+C)",
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
      userMessage: `Apply DS ${ds} (layout ${layout}) to ${module}`,
      // Task-level memory survives parallel batching; afterPromptStep reads it.
      longTermMemory: { module, layout: String(layout), ds: String(ds), device: dev },
    },
    executionMode: {
      type: 'parallel',
      args: items.map(i => i.tsOrigem), // one run per page; arg = origin .ts ref
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
  const tsOrigem = args; // origin .ts file reference

  const prompt = await buildPrompt(tsOrigem);

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
  const raw = payload.result as Output['result'];

  // Recover the run parameters from task-level memory + the echoed origin path.
  const lm = (context.task?.iaCompressed?.longMemory || {}) as Record<string, string>;
  const module = lm['module'];
  const layout = lm['layout'];
  const ds = lm['ds'];
  const device = lm['device'] || DEFAULT_DEVICE;
  if (!module || layout == null || ds == null) throw new Error(`(${agent.agentName}) missing run params in longMemory`);

  const project = mls.actualProject || 0;
  const page = pageShortName(raw.path);
  const item = buildWorkItem(project, module, layout, ds, page, device);

  // Deterministic resolution (Fase C): groups → molecules for THIS DS.
  const dsRules = await readDsRules(project, ds);
  const catalog = await buildMoleculeCatalog();
  const groups = await buildGroupList();
  const validGroups = new Set(groups.map(g => g.group));

  const validated = validateAgent1Output(raw, validGroups, raw.path);
  const resolved = resolveMolecules(dsRules, catalog, collectUsedGroups([validated]));
  const assignment = assignMoleculesToPage(validated, resolved);
  const usagePaths = collectUsagePaths(assignment, resolved);

  // Persist the new defs into the destination folder (survives the parallel batch).
  if (!context.isTest) {
    await saveFile(item.defsDestino, buildNovoDefs(item.defsDestino, assignment.organisms, usagePaths));
  }

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

async function buildPrompt(tsOrigem: string): Promise<string> {
  const pageSource = await loadPageSource(tsOrigem);
  const definitionText = await loadPageDefinitionText(tsOrigem);
  const groups = await buildGroupList();
  return buildAgent1HumanPrompt(tsOrigem, pageSource, definitionText, groups);
}

function pageShortName(ref: string): string {
  const norm = ref.startsWith('/') ? ref.slice(1) : ref;
  const f = mls.stor.convertFileReferenceToFile(norm);
  return f?.shortName || '';
}

/** The intermediate "novo defs": resolved molecule assignments for agentGenDefs to weave. */
function buildNovoDefs(defsRef: string, organisms: unknown, usagePaths: string[]): string {
  const cleanRef = defsRef.startsWith('/') ? defsRef.slice(1) : defsRef;
  const header = `/// <mls fileReference="${cleanRef}" enhancement="_blank"/>`;
  return [
    header,
    '',
    '// Generated by agentSelectMoleculeGroups (Fase B+C). Molecule choices are resolved',
    '// deterministically for this design system. Consumed by agentGenDefs (Fase E),',
    '// which weaves them into the final page defs.',
    '',
    `export const moleculeAssignments = ${JSON.stringify(organisms, null, 2)} as const;`,
    '',
    `export const usagePaths = ${JSON.stringify(usagePaths, null, 2)} as const;`,
    '',
  ].join('\n');
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
<!-- modelType: codeinstruct -->

You must return ONLY a valid JSON object. No preamble, no explanation, no markdown
fences, no text before or after the JSON. Start your response with { and end with }

## Task
You are given the page's RENDERED source (a Lit component with HTML + Tailwind that
the creative-mode generator produced) and the page definition (sections, organisms,
fields). For each organism, decide which molecule GROUPS are needed to replace the
hand-built UI elements that belong to it. Base the decision on the ACTUAL elements in
the rendered HTML (inputs, selects, tables, buttons, etc.), mapped to the organism
they sit in. Use the organismName values from the page definition.
Map a group only when its purpose DIRECTLY and OBVIOUSLY matches a real UI element.

## Rules
- Before adding a group, ask: "Does this organism clearly need this kind of UI?" If
  it requires any rationalization or indirect reasoning, the answer is NO — omit it.
- An organism may need several groups, one group, or none. A shorter accurate answer
  beats a longer wrong one.
- Choose group names EXACTLY as listed under "Molecule groups" (camelCase). Never
  invent a group. If no listed group fits a need, omit it.
- Do NOT pick a group as a generic fallback. Omission is correct when nothing fits.
- Decide GROUPS only — do NOT pick a specific variant/molecule (that is done later,
  deterministically, from the design system).
- Echo back the page path exactly as given under "## Page".

## Output format

[[OutputSection]]

`;

//#region OutputSection
export type Output = {
  type: "flexible";
  result: {
    path: string; // echo the page path from "## Page"
    perOrganism: Array<{
      organismName: string;
      groups: string[]; // camelCase, exactly as listed in the prompt
    }>;
  };
};
//#endregion
