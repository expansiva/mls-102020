/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentMaterializeMock.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  scanL1DefsFiles,
  getContentByMlsPath,
  saveGeneratedTs,
  extractToolCallArgs,
  toMlsPath,
} from '/_102020_/l2/agentMaterializeSolution/agentMaterializeArtifacts.js';

declare const mls: any;

// Stores args between beforePromptImplicit and afterPromptStep (step.prompt is not reliable for implicit flow)
const _implicitArgs = new Map<string, MockStepArgs>();

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentMaterializeMock',
    agentProject: 102020,
    agentFolder: 'agentMaterializeSolution',
    agentDescription: 'Generate layer_2_controllers/mock.ts from all layer_1 .defs.ts files in a module',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

// ─── Args ─────────────────────────────────────────────────────────────────────

export interface MockStepArgs {
  project: number;
  moduleName: string;
}

// ─── Tool schema ──────────────────────────────────────────────────────────────

const TOOL_NAME = 'submitGeneratedTs';

interface ToolOutput {
  code: string;
}

const toolSchema = {
  type: 'function',
  function: {
    name: TOOL_NAME,
    description: 'Submit the complete generated mock.ts file content.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['code'],
      properties: {
        code: {
          type: 'string',
          description: 'Complete TypeScript file content. Must start with the /// <mls fileReference="..."> header.',
        },
      },
    },
  },
} as const;

// ─── beforePromptImplicit ─────────────────────────────────────────────────────
// Bootstrap step: scans files, confirms count, then afterPromptStep creates
// the real gen step (which uses beforePromptStep + tools).

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  _userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const extracted = extractArgsFromPrompt(_userPrompt);
  const project = typeof extracted.project === 'number' ? extracted.project : (mls.actualProject as number) || 0;
  const moduleName = extracted.moduleName ?? '';

  if (!moduleName) {
    throw new Error('[agentMaterializeMock] moduleName not found. Send: @@MaterializeMock {"project":102043,"moduleName":"yourModule"}');
  }

  const defs = scanL1DefsFiles(project, moduleName);

  _implicitArgs.set(context.message.threadId, { project, moduleName });

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: BOOTSTRAP_SYSTEM },
        { type: 'human', content: buildBootstrapPrompt(project, moduleName, defs.length) },
      ],
      taskTitle: 'generate-mock',
      threadId: context.message.threadId,
      userMessage: JSON.stringify({ project, moduleName } satisfies MockStepArgs),
    },
  };

  return [addMessageAI];
}

// ─── beforePromptStep ─────────────────────────────────────────────────────────
// Real gen step: loads all .defs.ts and sends to LLM with forced tool call.

async function beforePromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  _step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error('[agentMaterializeMock] missing args');

  const { project, moduleName }: MockStepArgs = JSON.parse(args);
  const outputPath = toMlsPath(project, 1, `${moduleName}/layer_2_controllers`, 'mock', '.ts');
  const sections = await collectDefsSections(project, moduleName);

  const intent: mls.msg.AgentIntentPromptReady = {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: buildSystemPrompt(outputPath),
    humanPrompt: buildHumanPrompt(sections, outputPath),
    tools: [toolSchema as unknown as mls.msg.LLMTool],
    toolChoice: { type: 'function', function: { name: TOOL_NAME } },
  };

  return [intent];
}

// ─── afterPromptStep ──────────────────────────────────────────────────────────
// Handles two cases:
//   1. Tool call response (from beforePromptStep) → save the generated code
//   2. Flexible/text response (from beforePromptImplicit) → create the gen step

async function afterPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const raw = step.interaction?.payload?.[0] as any;

  // Case 1: tool call → save generated code
  const out = extractToolCallArgs<ToolOutput>(raw, TOOL_NAME);
  if (out?.code) {
    const { project, moduleName } = resolveArgs(step.prompt);
    const outputPath = toMlsPath(project, 1, `${moduleName}/layer_2_controllers`, 'mock', '.ts');

    const header = `/// <mls fileReference="${outputPath}" enhancement="_blank"/>`;
    const code = out.code.trimStart().startsWith('///') ? out.code : `${header}\n\n${out.code}`;

    const ok = await saveGeneratedTs(project, 1, `${moduleName}/layer_2_controllers`, 'mock', code);
    return [mkStatus(context, parentStep, step, hookSequential,
      ok ? 'completed' : 'failed',
      ok ? undefined : 'saveGeneratedTs failed',
      ok ? 'input_output' : undefined,
    )];
  }

  // Case 2: bootstrap response → create the real gen step
  if (raw?.type === 'result') {
    _implicitArgs.delete(context.message.threadId);
    return [mkStatus(context, parentStep, step, hookSequential, 'failed', String(raw.result))];
  }

  const stored = _implicitArgs.get(context.message.threadId);
  _implicitArgs.delete(context.message.threadId);

  const fallback = resolveArgs(step.prompt);
  const project = stored?.project ?? fallback.project;
  const moduleName = stored?.moduleName ?? fallback.moduleName;

  if (!moduleName) {
    return [mkStatus(context, parentStep, step, hookSequential, 'failed', 'could not resolve moduleName')];
  }

  const genArgs = JSON.stringify({ project, moduleName } satisfies MockStepArgs);
  const planId = `mock-gen-${moduleName.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`;

  const addStep: mls.msg.AgentIntentAddStep = {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: step.stepId,
    step: {
      type: 'agent',
      stepId: 0,
      interaction: null,
      stepTitle: `Generate mock: ${moduleName}`,
      status: 'waiting_human_input',
      nextSteps: [],
      agentName: 'agentMaterializeMock',
      prompt: genArgs,
      rags: [],
      planning: { planId, dependsOn: [], executionMode: 'parallel_static', executionHost: 'client' },
    } as any,
  };

  return [addStep];
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function collectDefsSections(project: number, moduleName: string): Promise<string[]> {
  const defs = scanL1DefsFiles(project, moduleName);
  if (!defs.length) throw new Error(`[agentMaterializeMock] no .defs.ts found for project=${project} module=${moduleName}`);

  const sections: string[] = [];
  for (const d of defs) {
    const content = await getContentByMlsPath(d.mlsPath);
    if (!content) continue;
    sections.push(`### ${d.mlsPath}\n\`\`\`typescript\n${content}\n\`\`\``);
  }

  if (!sections.length) throw new Error('[agentMaterializeMock] all .defs.ts were empty or unreadable');
  return sections;
}

function extractArgsFromPrompt(prompt: string): Partial<MockStepArgs> {
  const trimmed = prompt.trim();
  // Extract JSON block from the prompt (handles "@@Cmd {...}" prefix format)
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {}
  }
  // Fallback: plain module name
  if (/^[a-zA-Z][a-zA-Z0-9_]*$/.test(trimmed)) return { moduleName: trimmed };
  return {};
}

function resolveArgs(stepPrompt: string | undefined): MockStepArgs {
  const extracted = extractArgsFromPrompt(stepPrompt || '');
  return {
    project: typeof extracted.project === 'number' ? extracted.project : (mls.actualProject as number) || 0,
    moduleName: typeof extracted.moduleName === 'string' ? extracted.moduleName : '',
  };
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
  return {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep?.stepId ?? step.stepId,
    stepId: step.stepId,
    status,
    traceMsg,
    cleaner,
  };
}

// ─── Bootstrap prompts ────────────────────────────────────────────────────────

const BOOTSTRAP_SYSTEM = `<!-- modelType: codepro -->
You confirm a mock generation scan.
If files were found, return: {"type":"flexible","result":{"status":"ok"}}
If no files, return: {"type":"result","result":"No layer_1 .defs.ts files found"}
Return valid JSON only.`;

function buildBootstrapPrompt(project: number, moduleName: string, defsCount: number): string {
  return [
    `## Mock generation scan`,
    ``,
    `Project: ${project}`,
    `Module: ${moduleName}`,
    `Layer_1 .defs.ts files found: ${defsCount}`,
    ``,
    `Confirm and return your response.`,
  ].join('\n');
}

// ─── Generation prompts ───────────────────────────────────────────────────────

function buildSystemPrompt(outputPath: string): string {
  return `<!-- modelType: codeinstruct -->

You generate a \`mock.ts\` file for a module's \`layer_2_controllers\`.

The mock provides in-memory repositories for ALL entities/tables in the module.
It is used during development when \`USE_MOCK = true\`.

Target file: ${outputPath}

---

## Input

You receive one or more .defs.ts files from the module's layer_1. Two formats are possible:

### Format A — persistence.ts
A single file exporting \`tableDefinitions: TableDefinition[]\` where each entry has:
- \`repositoryName\`: string key for the store (e.g. \`"locadoraVeiculo"\`)
- \`columns[]\`: array of \`{ name: string, postgresType: 'TEXT' | 'INTEGER' | 'BOOLEAN' | ... }\`
- \`primaryKey[]\`: string[] — column names used as identity key in upsert

### Format B — individual entity + table defs
Multiple files:
- \`layer_4_entities/*.defs.ts\`: exports \`entity\` with \`entity.fields[]\` (\`fieldId\`, \`type\`, \`required\`), \`entity.entityId\`, optional \`entity.statusEnum[]\`
- \`layer_1_external/*.defs.ts\`: exports a table definition with \`data.tableDefinition\`:
  - \`tableId\`: base name — combine with moduleName to get repositoryName
  - \`moduleName\`: prefix → repositoryName = \`moduleName\` + PascalCase(\`tableId\`)
  - \`columns[]\`: \`{ name, type, nullable, primaryKey? }\`
  - \`primaryKey[]\`: string[]
- \`layer_3_usecases/*.defs.ts\`: use only for domain context, not for generating repositories

---

## Output structure

\`\`\`typescript
/// <mls fileReference="${outputPath}" enhancement="_blank"/>
export const USE_MOCK = true;

const mockStore = {
  repositoryName: [...sample data...] as any[],
};

export function getMock{RepositoryPascal}Repository() {
  const store = mockStore.{repositoryName};
  return {
    async findMany(): Promise<any[]> {
      return store;
    },
    async findOne({ where }: { where: Record<string, any> }): Promise<any> {
      return store.find((item: any) =>
        Object.entries(where).every(([k, v]) => (item as Record<string, any>)[k] === v)
      );
    },
    async upsert({ record }: { record: any }): Promise<void> {
      const idx = store.findIndex((item: any) => item.{primaryKeyField} === record.{primaryKeyField});
      if (idx >= 0) store[idx] = record;
      else store.push(record);
    },
  };
}
\`\`\`

---

## Naming rules

| Source | repositoryName | Function name |
|---|---|---|
| Format A | use \`repositoryName\` from TableDefinition directly | \`getMock\` + PascalCase(repositoryName) + \`Repository\` |
| Format B | \`moduleName\` + PascalCase(\`tableId\`) | \`getMock\` + PascalCase(repositoryName) + \`Repository\` |

PascalCase: uppercase only the first character of the whole string.
Example: \`locadoraVeiculo\` → \`getMockLocadoraVeiculoRepository\`.

---

## Sample data rules

Generate **2 records** per entity/table with realistic domain values. Use different values between records.

| Type | Example values |
|---|---|
| TEXT / string | Meaningful short strings relevant to the domain |
| INTEGER / number | Different reasonable integers |
| BOOLEAN / boolean | \`true\` for record 1, \`false\` for record 2 |
| uuid | Short ids: \`"id-001"\`, \`"id-002"\` |
| datetime / date | ISO strings: \`"2026-01-15T10:00:00Z"\`, \`"2026-03-20T14:30:00Z"\` |
| text | Short domain-relevant sentence |
| enum | First value for record 1, second value for record 2 (or first if only one) |
| status / record_status | \`"active"\` for both records |

---

## Upsert identity field

Use the **first primary key field** from the schema:
- Format A: \`primaryKey[0]\`
- Format B: first column with \`primaryKey: true\`, OR first value in \`primaryKey[]\`

---

## Output rules

- First line MUST be: \`/// <mls fileReference="${outputPath}" enhancement="_blank"/>\`
- \`export const USE_MOCK = true;\`
- \`const mockStore\` must NOT be exported
- All factory functions must be exported
- No imports — mock is fully self-contained
- No inline comments
- 2-space indentation
- One blank line between factory functions`;
}

function buildHumanPrompt(sections: string[], outputPath: string): string {
  return [
    '## Layer_1 .defs.ts files',
    '',
    ...sections,
    '',
    `Generate the file \`${outputPath}\` and call ${TOOL_NAME} with the complete code.`,
  ].join('\n');
}
