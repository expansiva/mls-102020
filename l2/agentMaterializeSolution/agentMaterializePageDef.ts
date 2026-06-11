/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentMaterializePageDef.ts" enhancement="_102027_/l2/enhancementAgent.ts"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createStorFile, IReqCreateStorFile } from '/_102027_/l2/libStor.js';
import { convertFileNameToTag } from '/_102027_/l2/utils.js';
import { addModuleNav, addModuleRoute } from '/_102020_/l2/agentMaterializeSolution/ast/astModuleFront.js';
import { addNav, addPage } from '/_102020_/l2/agentMaterializeSolution/ast/astIndex.js';
import { addRoute, addImport } from '/_102020_/l2/agentMaterializeSolution/ast/astRouter.js';

// ─── mutex ────────────────────────────────────────────────────────────────────

const _lockQueue: Map<string, Promise<void>> = new Map();

async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = _lockQueue.get(key) ?? Promise.resolve();
  let resolve!: () => void;
  _lockQueue.set(key, new Promise<void>(r => { resolve = r; }));
  await prev;
  try { return await fn(); }
  finally { resolve(); }
}

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentMaterializePageDef',
    agentProject: 102020,
    agentFolder: 'agentMaterializeSolution',
    agentDescription: 'Split a page plan into three mat1 defs (each with its own pipeline) and populate module singletons',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

// ─── input ────────────────────────────────────────────────────────────────────

interface AgentInput {
  path: string;
  moduleName: string;
}

function parseInput(raw: string): AgentInput {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const path = parsed['path'];
    const moduleName = parsed['moduleName'];
    if (typeof path !== 'string' || !path) throw new Error('[agentMaterializePageDef] missing "path"');
    if (typeof moduleName !== 'string' || !moduleName) throw new Error('[agentMaterializePageDef] missing "moduleName"');
    return { path, moduleName };
  }
  const lines = trimmed.split(/[\n\r]+/).map(s => s.trim()).filter(Boolean);
  if (!lines[0]) throw new Error('[agentMaterializePageDef] path is required');
  if (!lines[1]) throw new Error('[agentMaterializePageDef] moduleName is required');
  return { path: lines[0], moduleName: lines[1] };
}

function extractPageId(path: string): string {
  const last = path.replace(/^\/+/, '').split('/').pop() || '';
  return last.replace(/\.defs\.ts$|\.ts$/, '');
}

function extractProject(path: string): number {
  const m = path.match(/_(\d+)_/);
  return m ? parseInt(m[1], 10) : (mls.actualProject || 0);
}

// ─── stor helpers ─────────────────────────────────────────────────────────────

async function readStorFile(ref: string): Promise<string | null> {
  try {
    const info = mls.stor.convertFileReferenceToFile(ref);
    if (!info) return null;
    const sf = mls.stor.files[mls.stor.getKeyToFile(info)];
    if (!sf) return null;
    const content = await sf.getContent();
    return typeof content === 'string' ? content : null;
  } catch {
    return null;
  }
}

async function writeStorFile(ref: string, src: string): Promise<void> {
  const info = mls.stor.convertFileReferenceToFile(ref);
  if (!info) throw new Error(`[agentMaterializePageDef] cannot resolve: ${ref}`);
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

// ─── defs template builders ───────────────────────────────────────────────────

function buildContractDefsFile(fileRef: string, commandsJson: string, pipeline: object[]): string {
  const bt = '`';
  const bt3 = '\\\`\\\`\\\`';
  return (
    `/// <mls fileReference="${fileRef}"  enhancement="_blank"/>\n` +
    `export const skill = ${bt}\n` +
    `## Pages spec\n` +
    `${bt3}JSON\n` +
    `${commandsJson}\n` +
    `${bt3}\n` +
    `${bt};\n` +
    `\nexport const materializeIndex = ${JSON.stringify(pipeline, null, 2)};\n`
  );
}

function buildSharedDefsFile(fileRef: string, commandsJson: string, contractsRef: string, pipeline: object[]): string {
  const bt = '`';
  const bt3 = '\\\`\\\`\\\`';
  return (
    `/// <mls fileReference="${fileRef}"  enhancement="_blank"/>\n` +
    `export const skill = ${bt}\n` +
    `## Pages spec\n` +
    `${bt3}JSON\n` +
    `${commandsJson}\n` +
    `${bt3}\n` +
    `\n` +
    `## Contracts\n` +
    `${bt3}JSON\n` +
    `    [[(${contractsRef})]]\n` +
    `${bt3}\n` +
    `${bt};\n` +
    `\nexport const materializeIndex = ${JSON.stringify(pipeline, null, 2)};\n`
  );
}

function buildPageDefsFile(fileRef: string, pageSpecJson: string, sharedRef: string, pipeline: object[]): string {
  const bt = '`';
  const bt3 = '\\\`\\\`\\\`';
  return (
    `/// <mls fileReference="${fileRef}"  enhancement="_blank"/>\n` +
    `export const skill = ${bt}\n` +
    `## Pages spec\n` +
    `${bt3}JSON\n` +
    `${pageSpecJson}\n` +
    `${bt3}\n` +
    `\n` +
    `## Base Class\n` +
    `${bt3}JSON\n` +
    `    [[(${sharedRef})]]\n` +
    `${bt3}\n` +
    `${bt};\n` +
    `\nexport const materializeIndex = ${JSON.stringify(pipeline, null, 2)};\n`
  );
}

// ─── pipeline builders ────────────────────────────────────────────────────────

function buildContractPipeline(project: number, moduleName: string, pageId: string): object[] {
  return [{
    id: 'contract',
    agent: 'agentL2MaterializeContract',
    defsPath: `_${project}_/l1/${moduleName}/layer_2_controllers/${pageId}.defs.ts`,
    skillPath: '_102020_/l2/agentMaterializeSolution/skills/genContract.ts',
    moduleName,
    outputPath: `_${project}_/l2/${moduleName}/web/contracts/${pageId}.ts`,
    dependsOn: [],
    specUpdatedAt: new Date().toISOString(),
  }];
}

function buildSharedPipeline(project: number, moduleName: string, pageId: string): object[] {
  return [{
    id: 'shared',
    agent: 'agentL2MaterializeSharedPage',
    defsPath: `_${project}_/l2/${moduleName}/web/shared/${pageId}.defs.ts`,
    moduleName,
    outputPath: `_${project}_/l2/${moduleName}/web/shared/${pageId}.ts`,
    dependsOn: [],
    specUpdatedAt: new Date().toISOString(),
  }];
}

function buildPagePipeline(project: number, moduleName: string, pageId: string): object[] {
  return [{
    id: 'page',
    agent: 'agentL2MaterializePageLit',
    defsPath: `_${project}_/l2/${moduleName}/web/desktop/page11/${pageId}.defs.ts`,
    moduleName,
    outputPath: `_${project}_/l2/${moduleName}/web/desktop/page11/${pageId}.ts`,
    dependsOn: [],
    specUpdatedAt: new Date().toISOString(),
  }];
}

// ─── prompt builder ───────────────────────────────────────────────────────────

async function buildHumanPrompt(path: string, moduleName: string): Promise<string> {
  const pageId = extractPageId(path);
  const planSrc = await readStorFile(path);
  if (!planSrc) throw new Error(`[agentMaterializePageDef] plan file not found: ${path}`);
  return [
    `## path\n${path}`,
    `## moduleName\n${moduleName}`,
    `## pageId\n${pageId}`,
    `## Plan source\n\`\`\`ts\n${planSrc}\n\`\`\``,
  ].join('\n\n');
}

// ─── beforePromptImplicit ─────────────────────────────────────────────────────

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const { path, moduleName } = parseInput(userPrompt);
  const humanPrompt = await buildHumanPrompt(path, moduleName);

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: systemPrompt },
        { type: 'human', content: humanPrompt },
      ],
      taskTitle: `def:${extractPageId(path)}`,
      threadId: context.message.threadId,
      userMessage: path,
      longTermMemory: { moduleName },
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

  const { path, moduleName } = parseInput(args);
  const humanPrompt = await buildHumanPrompt(path, moduleName);

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
    if (!payload || payload.type !== 'flexible' || !payload.result)
      throw new Error('missing or invalid flexible payload');

    const result = payload.result as AgentOutput['result'];
    const { path, moduleName, pageId, commandsJson, pageSpecJson } = result;
    if (!path || !moduleName || !pageId) throw new Error('AI response missing path, moduleName or pageId');

    const project = extractProject(path);

    // ─── file refs ───────────────────────────────────────────────────────────
    const contractDefsRef = `_${project}_/l1/${moduleName}/layer_2_controllers/${pageId}.defs.ts`;
    const sharedDefsRef   = `_${project}_/l2/${moduleName}/web/shared/${pageId}.defs.ts`;
    const pageDefsRef     = `_${project}_/l2/${moduleName}/web/desktop/page11/${pageId}.defs.ts`;
    const contractsRef    = `_${project}_/l2/${moduleName}/web/contracts/${pageId}.ts`;
    const sharedRef       = `_${project}_/l2/${moduleName}/web/shared/${pageId}.ts`;

    // ─── create 3 mat1 defs, each with its own pipeline ──────────────────────
    await writeStorFile(
      contractDefsRef,
      buildContractDefsFile(contractDefsRef, commandsJson, buildContractPipeline(project, moduleName, pageId)),
    );
    await writeStorFile(
      sharedDefsRef,
      buildSharedDefsFile(sharedDefsRef, commandsJson, contractsRef, buildSharedPipeline(project, moduleName, pageId)),
    );
    await writeStorFile(
      pageDefsRef,
      buildPageDefsFile(pageDefsRef, pageSpecJson, sharedRef, buildPagePipeline(project, moduleName, pageId)),
    );

    // ─── compute page tag from the future .ts output path ────────────────────
    const pageOutputRef = `_${project}_/l2/${moduleName}/web/desktop/page11/${pageId}.ts`;
    const fileInfo = mls.stor.convertFileReferenceToFile(pageOutputRef);
    if (!fileInfo.project) (fileInfo as any).project = project;
    const pageTag  = convertFileNameToTag(fileInfo);
    const entrypoint = `/_${project}_/l2/${moduleName}/web/desktop/page11/${pageId}.js`;

    // ─── update module.ts ────────────────────────────────────────────────────
    const moduleRef = `_${project}_/l2/${moduleName}/module.ts`;
    await withLock(`module:${moduleName}`, async () => {
      let src = await readStorFile(moduleRef) ?? '';
      src = addModuleNav(src, {
        id: pageId,
        label: pageId,
        href: `/${moduleName}/${pageId}`,
        description: pageId,
      });
      src = addModuleRoute(src, {
        path: `/${moduleName}/${pageId}`,
        aliases: [],
        entrypoint,
        tag: pageTag,
        title: pageId,
      });
      await writeStorFile(moduleRef, src);
    });

    // ─── update index.ts ─────────────────────────────────────────────────────
    const indexRef = `_${project}_/l2/${moduleName}/index.ts`;
    await withLock(`index:${moduleName}`, async () => {
      let src = await readStorFile(indexRef) ?? '';
      src = addNav(src, { label: pageId, href: `/${moduleName}/${pageId}` });
      src = addPage(src, {
        path: `/${moduleName}/${pageId}`,
        title: pageId,
        tagName: pageTag,
        loader: entrypoint,
      });
      await writeStorFile(indexRef, src);
    });

    // ─── update router.ts ────────────────────────────────────────────────────
    const routerRef = `_${project}_/l1/${moduleName}/layer_2_controllers/router.ts`;
    const commands = (JSON.parse(commandsJson) as { commands: Array<{ commandName: string }> }).commands ?? [];
    if (commands.length > 0) {
      await withLock(`router:${moduleName}`, async () => {
        let src = await readStorFile(routerRef) ?? '';
        const importPath = `/_${project}_/l1/${moduleName}/layer_2_controllers/${pageId}.js`;
        const handlerNames: string[] = [];
        for (const cmd of commands) {
          const handlerName = `${pageId}${cmd.commandName.charAt(0).toUpperCase()}${cmd.commandName.slice(1)}Handler`;
          handlerNames.push(handlerName);
          src = addRoute(src, `${moduleName}.${pageId}.${cmd.commandName}`, handlerName);
        }
        src = addImport(src, { kind: 'value', names: handlerNames, from: importPath });
        await writeStorFile(routerRef, src);
      });
    }

  } catch (err) {
    status = 'failed';
    console.error(`[agentMaterializePageDef](afterPromptStep)`, err);
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

// ─── output type ──────────────────────────────────────────────────────────────

//#region OutputSection
export type AgentOutput = {
  type: 'flexible';
  result: {
    path: string;
    moduleName: string;
    pageId: string;
    commandsJson: string;
    pageSpecJson: string;
  };
};
//#endregion

// ─── system prompt ────────────────────────────────────────────────────────────

const systemPrompt = `
<!-- modelType: codeinstruct -->
<!-- modelTypeList: geminiChat (2.5 pro), code (grok), deepseekchat, codeflash (gemini), deepseekreasoner, mini (4.1) ou nano (openai), codeinstruct (4.1), codereasoning(gpt5), code2 (kimi 2.5) -->

You are agentMaterializePageDef.
You receive a page plan source file and must extract two JSON payloads from it.

## Your only job

Read the plan source in ## Plan source. Locate the exported const that holds the page plan object.
Inside it, find:
- \`data.pageDefinition\` — the page structure object
- \`data.bffCommands\` — the BFF commands array

Then produce exactly two output fields as described below.

---

## Output field 1 — commandsJson

A JSON object with two keys:

\`\`\`
{
  "commands":       <the full data.bffCommands array, copied verbatim>,
  "navigationRefs": <the data.pageDefinition.navigationRefs array, copied verbatim>
}
\`\`\`

Rules:
- Copy \`data.bffCommands\` **exactly as it appears** in the source — do not rename, reorder, or omit any field.
- Copy \`data.pageDefinition.navigationRefs\` **exactly as it appears** — do not summarize or transform.
- If \`bffCommands\` is absent, use \`[]\`.
- If \`navigationRefs\` is absent, use \`[]\`.

---

## Output field 2 — pageSpecJson

A JSON object built from \`data.pageDefinition\`, keeping only:

| Field | Copy rule |
|---|---|
| \`pageId\` | verbatim |
| \`pageName\` | verbatim |
| \`actor\` | verbatim |
| \`purpose\` | verbatim |
| \`sections\` | **verbatim — do not alter any organism, userAction, readsFields, or writesFields** |
| \`navigationRefs\` | **verbatim** |

**Omit** all other fields: \`capabilities\`, \`flowRefs\`, \`pluginRefs\`, \`mdmRefs\`, \`pageInputs\`.

---

## Critical: verbatim copy

Both payloads must preserve every value from the source JSON character-for-character.
Do NOT rephrase strings, reorder array items, change field names, or drop nested fields.
If the source uses Portuguese strings, keep them in Portuguese.

---

## Output — return ONLY valid JSON, no markdown fences, no prose

{
  "type": "flexible",
  "result": {
    "path":          "<echo ## path exactly>",
    "moduleName":    "<echo ## moduleName exactly>",
    "pageId":        "<echo ## pageId exactly>",
    "commandsJson":  "<compact JSON string: {commands:[...], navigationRefs:[...]}>",
    "pageSpecJson":  "<compact JSON string: {pageId, pageName, actor, purpose, sections, navigationRefs}>"
  }
}

Both commandsJson and pageSpecJson must be valid compact JSON strings (no pretty-printing, no trailing commas).
Escape any double-quotes inside them with \\" and any backslashes with \\\\.
`;
