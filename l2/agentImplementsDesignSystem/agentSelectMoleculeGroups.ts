/// <mls fileReference="_102020_/l2/agentImplementsDesignSystem/agentSelectMoleculeGroups.ts" enhancement="_102027_/l2/enhancementAgent.ts"/>

// Fase B — Agent1: per-organism molecule-GROUP selection (LLM).
// Runs after creative-mode generation, so the page is materialized: reads the
// rendered .ts (primary — the actual HTML) plus the .defs.ts `definition` text
// (raw, not parsed) for the organism structure, and decides which molecule groups
// each organism needs.
// Variant choice is NOT done here — that is deterministic (matchVariant, Fase A/C).
//
// One page per invocation (input `{ path }`). Fan-out across pages is the
// orchestrator's job (Fase E / integration), consistent with the stateless model.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { buildGroupList } from '/_102020_/l2/dsMatch/groupCatalog.js';
import { loadPageSource, loadPageDefinitionText, buildAgent1HumanPrompt, validateAgent1Output, type Agent1Output } from '/_102020_/l2/dsMatch/agent1.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: "agentSelectMoleculeGroups",
    agentProject: 102020,
    agentFolder: "agentImplementsDesignSystem",
    agentDescription: "Selects which molecule groups each organism of a page needs (Fase B / Agent1)",
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

  const info = JSON.parse(userPrompt) as { path: string };
  const prompt = await buildPrompt(info.path);

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: "add-message-ai",
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: system1 },
        { type: 'human', content: prompt },
      ],
      taskTitle: agent.agentDescription,
      threadId: context.message.threadId,
      userMessage: info.path,
      longTermMemory: { path: info.path, onlyStep: "true" },
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

  const info = JSON.parse(args) as { path: string };
  const prompt = await buildPrompt(info.path);

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

  // Validate the LLM output against the valid group set (drops hallucinated groups).
  const raw = payload.result as Output['result'];
  const groups = await buildGroupList();
  const validGroups = new Set(groups.map(g => g.group));
  const validated: Agent1Output = validateAgent1Output(raw, validGroups, raw.path);

  const dropped = countDropped(raw, validated);
  if (dropped > 0) console.warn(`(${agent.agentName}) dropped ${dropped} unknown group(s) from ${validated.path}`);

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

async function buildPrompt(path: string): Promise<string> {
  // Primary input: the rendered .ts (the actual UI). Secondary: raw defs `definition` text.
  const pageSource = await loadPageSource(path);
  const definitionText = await loadPageDefinitionText(path);
  const groups = await buildGroupList();
  return buildAgent1HumanPrompt(path, pageSource, definitionText, groups);
}

function countDropped(raw: any, validated: Agent1Output): number {
  const rawCount = Array.isArray(raw?.perOrganism)
    ? raw.perOrganism.reduce((n: number, o: any) => n + (Array.isArray(o?.groups) ? o.groups.length : 0), 0)
    : 0;
  const keptCount = validated.perOrganism.reduce((n, o) => n + o.groups.length, 0);
  return Math.max(0, rawCount - keptCount);
}

const system1 = `
<!-- modelType: codereasoning -->
<!-- modelTypeList: geminiChat (2.5 pro), code (grok), deepseekchat, codeflash (gemini), deepseekreasoner, mini (4.1) ou nano (openai), codeinstruct (4.1), codereasoning(gpt5), code2 (kimi 2.5) -->

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

## Output format

[[OutputSection]]

`;

//#region OutputSection
export type Output = {
  type: "flexible";
  result: {
    path: string;
    perOrganism: Array<{
      organismName: string;
      groups: string[]; // camelCase, exactly as listed in the prompt
    }>;
  };
};
//#endregion
