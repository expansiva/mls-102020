/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentL2MaterializeReview.ts" enhancement="_102027_/l2/enhancementAgent.ts"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createStorFile, IReqCreateStorFile } from '/_102027_/l2/libStor.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentL2MaterializeReview',
    agentProject: 102020,
    agentFolder: 'agentMaterializeSolution',
    agentDescription: 'Review generated contract, shared and page files against their definitions',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

// ─── input ────────────────────────────────────────────────────────────────────

interface AgentInput {
  moduleName: string;
  pathContractDefs: string;
  pathSharedDefs: string;
  pathPageDefs: string;
  pathContract: string;
  pathShared: string;
  pathPage: string;
}

function parseInput(raw: string): AgentInput {
  const parsed = JSON.parse(raw.trim()) as Record<string, unknown>;
  const required: (keyof AgentInput)[] = ['moduleName', 'pathContractDefs', 'pathSharedDefs', 'pathPageDefs', 'pathContract', 'pathShared', 'pathPage'];
  for (const key of required) {
    if (typeof parsed[key] !== 'string' || !parsed[key]) throw new Error(`[agentL2MaterializeReview] missing "${key}"`);
  }
  return parsed as unknown as AgentInput;
}

// ─── stor helpers ─────────────────────────────────────────────────────────────

function toRef(mlsPath: string): string {
  const norm = mlsPath.trim().replace(/^\/+/, '');
  const m = norm.match(/^mls-(\d+)\/(.+)/);
  if (m) return `_${m[1]}_/${m[2]}`;
  return norm;
}

async function readStorFile(mlsPath: string): Promise<string> {
  const info = mls.stor.convertFileReferenceToFile(toRef(mlsPath));
  if (!info) throw new Error(`[agentL2MaterializeReview] cannot resolve: ${mlsPath}`);
  const sf = mls.stor.files[mls.stor.getKeyToFile(info)];
  if (!sf) throw new Error(`[agentL2MaterializeReview] file not found: ${mlsPath}`);
  const content = await sf.getContent();
  if (typeof content !== 'string') throw new Error(`[agentL2MaterializeReview] non-string content: ${mlsPath}`);
  return content;
}

async function writeStorFile(mlsPath: string, src: string): Promise<void> {
  const info = mls.stor.convertFileReferenceToFile(toRef(mlsPath));
  if (!info) throw new Error(`[agentL2MaterializeReview] cannot resolve: ${mlsPath}`);
  const key = mls.stor.getKeyToFile(info);
  let sf = mls.stor.files[key];
  if (!sf) {
    const param: IReqCreateStorFile = { ...info, source: src };
    sf = await createStorFile(param, false, false, false);
  } else {
    const m = await sf.getOrCreateModel();
    if (m && m.model) m.model.setValue(src);
  }
  await mls.stor.localStor.setContent(sf, { contentType: 'string', content: src });
}

// ─── prompt builder ───────────────────────────────────────────────────────────

async function buildHumanPrompt(input: AgentInput): Promise<string> {
  const [
    srcContractDefs,
    srcSharedDefs,
    srcPageDefs,
    srcContract,
    srcShared,
    srcPage,
  ] = await Promise.all([
    readStorFile(input.pathContractDefs),
    readStorFile(input.pathSharedDefs),
    readStorFile(input.pathPageDefs),
    readStorFile(input.pathContract),
    readStorFile(input.pathShared),
    readStorFile(input.pathPage),
  ]);

  return [
    `## moduleName\n${input.moduleName}`,
    `## pathContractDefs\n${input.pathContractDefs}`,
    `## pathSharedDefs\n${input.pathSharedDefs}`,
    `## pathPageDefs\n${input.pathPageDefs}`,
    `## pathContract\n${input.pathContract}`,
    `## pathShared\n${input.pathShared}`,
    `## pathPage\n${input.pathPage}`,
    `## srcContractDefs\n\`\`\`ts\n${srcContractDefs}\n\`\`\``,
    `## srcSharedDefs\n\`\`\`ts\n${srcSharedDefs}\n\`\`\``,
    `## srcPageDefs\n\`\`\`ts\n${srcPageDefs}\n\`\`\``,
    `## srcContract\n\`\`\`ts\n${srcContract}\n\`\`\``,
    `## srcShared\n\`\`\`ts\n${srcShared}\n\`\`\``,
    `## srcPage\n\`\`\`ts\n${srcPage}\n\`\`\``,
  ].join('\n\n');
}

// ─── beforePromptImplicit ─────────────────────────────────────────────────────

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const input = parseInput(userPrompt);
  const humanPrompt = await buildHumanPrompt(input);

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: systemPrompt },
        { type: 'human', content: humanPrompt },
      ],
      taskTitle: `review:${input.moduleName}`,
      threadId: context.message.threadId,
      userMessage: userPrompt,
      longTermMemory: { moduleName: input.moduleName },
    },
  };

  return [addMessageAI];
}

// ─── beforePromptStep ─────────────────────────────────────────────────────────

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  _step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`(${agent.agentName})[beforePromptStep] args is required`);

  console.info('--------agentL2MaterializeReview--------')
  const info = JSON.parse(args) as { path: string, item: any, project?: number };

  info.project = mls.actualProject || 0;
  const moduleName = context.task?.iaCompressed?.longMemory['moduleName'] as string;
  const device = context.task?.iaCompressed?.longMemory['device'] as string || 'web';
  const deviceType = context.task?.iaCompressed?.longMemory['deviceType'] as string || 'desktop';
  const type = context.task?.iaCompressed?.longMemory['type'] as string || 'page11';
  if (info.item.pathPage) info.item.pathPage = info.item.pathPage.replace('[device]', device).replace('[deviceType]', deviceType).replace('[type]', type);
  
  const humanPrompt = await buildHumanPrompt(info.item as any);

  const promptReady: mls.msg.AgentIntentPromptReady = {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    humanPrompt,
    systemPrompt,
  };

  return [promptReady];
}

// ─── afterPromptStep ──────────────────────────────────────────────────────────

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  if (!agent || !context || !step) throw new Error(`(${agent.agentName})[afterPromptStep] invalid params`);

  let status: mls.msg.AIStepStatus = 'completed';

  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload || payload.type !== 'flexible' || !payload.result) throw new Error('missing or invalid flexible payload');

    const result = payload.result as AgentOutput['result'];

    if (result.srcContract !== 'ok') await writeStorFile(result.pathContract, result.srcContract);
    if (result.srcShared !== 'ok') await writeStorFile(result.pathShared, result.srcShared);
    if (result.srcPage !== 'ok') await writeStorFile(result.pathPage, result.srcPage);

  } catch (err) {
    status = 'failed';
    console.error(`[agentL2MaterializeReview](afterPromptStep)`, err);
  }

  const updateStatus: mls.msg.AgentIntentUpdateStatus = {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    cleaner: 'input_output',
    status,
  };

  return [updateStatus];
}

// ─── system prompt ────────────────────────────────────────────────────────────

const systemPrompt = `
<!-- modelType: codeinstruct -->
<!-- modelTypeList: geminiChat (2.5 pro), code (grok), deepseekchat, codeflash (gemini), deepseekreasoner, mini (4.1) ou nano (openai), codeinstruct (4.1), codereasoning(gpt5), code2 (kimi 2.5) -->

You are agentL2MaterializeReview.
You receive three generated TypeScript files (contract, shared, page) and their three definition files.
Review each file with the explicit rules below. Be strict — do not mark a file as "ok" if any rule is violated.

---

## RULE 1 — Contract interfaces must match commands exactly

The ## srcContractDefs contains a JSON block with a \`commands\` array.
Each command has \`commandName\`, \`input\` (array of {name, type}) and \`output\` (array of {name, type}).

For EACH command in \`commands\`, the contract file MUST export two interfaces named:
  \`{ModuleName}{PascalCase(commandName)}Input\`
  \`{ModuleName}{PascalCase(commandName)}Output\`

where {ModuleName} = PascalCase of ## moduleName.

Each interface field must match the corresponding array item exactly:
  - field name = item.name
  - TypeScript type = mapped from item.type:
      "string"  → string
      "number"  → number
      "boolean" → boolean
      "Date"    → Date
      arrays    → e.g. "string[]" → string[]
      otherwise → use the type value as-is

**An interface with 0 fields when the definition array has items IS AN ERROR.**
Example — if output has [{name:"openServiceOrders",type:"number"},{name:"monthlyRevenue",type:"number"}]:
  WRONG: export interface RepairBayGetMetricDashboardOutput {}
  RIGHT: export interface RepairBayGetMetricDashboardOutput { openServiceOrders: number; monthlyRevenue: number; }

---

## RULE 2 — Page custom element tag name must be derived from ## pathPage

Given ## pathPage, derive the expected tag name with this algorithm:
  1. Extract project number from the leading \`_NNNNNN_\` segment → e.g. \`102044\`
  2. Remove the \`_NNNNNN_/l2/\` prefix and \`.ts\` suffix from the path
     e.g. \`_102044_/l2/repairBay/web/desktop/page11/customerList.ts\` → \`repairBay/web/desktop/page11/customerList\`
  3. Split by \`/\` → \`['repairBay','web','desktop','page11','customerList']\`
  4. Convert each segment from camelCase to kebab-case:
     \`repairBay\` → \`repair-bay\`, \`customerList\` → \`customer-list\`, etc.
  5. Join segments with \`--\` → \`repair-bay--web--desktop--page11--customer-list\`
  6. Append \`-{project}\` → \`repair-bay--web--desktop--page11--customer-list-102044\`

The \`static is\` getter and the \`customElements.define\` call in ## srcPage MUST use exactly this tag.
If they differ, the page file has an error.

---

## RULE 3 — Shared uses contract interfaces correctly

- All imports from the contract file must reference interfaces that actually exist in ## srcContract
- Properties accessed on Input/Output instances must match the interface fields exactly
- No empty method bodies when the definition lists actions or loads to implement

---

## RULE 4 — Page uses shared base class correctly

- The page class must extend the shared base class
- Navigation methods called must exist on the shared class
- No references to properties or methods not defined in shared

---

## Decision rule per file
- All rules pass → set the src field to the string \`"ok"\`
- Any rule fails → set the src field to the COMPLETE corrected TypeScript source (full file, not a diff, not a snippet)

## Output format
src values that are not \`"ok"\` must be single-line JSON strings.
Escape ALL special characters:
  - newlines     → \\n
  - tabs         → \\t
  - double quotes → \\"
  - backslashes  → \\\\

Return ONLY valid JSON, no markdown fences, no prose.

[[OutputSection]]

pathXxx fields must echo ## pathContract, ## pathShared and ## pathPage exactly.
`;

//#region OutputSection
export type AgentOutput = {
  type: 'flexible';
  result: {
    pathContract: string; // echo ## pathContract
    srcContract: string;  // 'ok' or full corrected source as compact JSON string
    pathShared: string;   // echo ## pathShared
    srcShared: string;    // 'ok' or full corrected source as compact JSON string
    pathPage: string;     // echo ## pathPage
    srcPage: string;      // 'ok' or full corrected source as compact JSON string
  };
};
//#endregion
