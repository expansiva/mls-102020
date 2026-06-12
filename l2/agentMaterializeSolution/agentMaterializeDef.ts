/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentMaterializeDef.ts" enhancement="_102027_/l2/enhancementAgent.ts"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createStorFile, IReqCreateStorFile } from '/_102027_/l2/libStor.js';
import { convertFileNameToTag } from '/_102027_/l2/utils.js';
import { getMaterializeOrchestrator } from '/_102020_/l2/agentMaterializeSolution/materializeOrchestrator.js';
import { addModuleNav, addModuleRoute } from '/_102020_/l2/agentMaterializeSolution/ast/astModuleFront.js';
import { addNav, addPage } from '/_102020_/l2/agentMaterializeSolution/ast/astIndex.js';
import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { collabImport } from '/_102027_/l2/collabImport.js';

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
    agentName: 'agentMaterializeDef',
    agentProject: 102020,
    agentFolder: 'agentMaterializeSolution',
    agentDescription: 'Unified materializer: reads type from args, resolves skills from module.ts, generates contract/shared/page files',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

// ─── input ────────────────────────────────────────────────────────────────────

type DefType = 'contract' | 'shared' | 'page';

interface AgentInput {
  pathDefs: string;
  moduleName: string;
  type: DefType;
}

function parseInput(raw: string): AgentInput {
  const parsed = JSON.parse(raw.trim()) as Record<string, unknown>;
  const pathDefs = parsed['pathDefs'] as string;
  const moduleName = parsed['moduleName'] as string;
  const type = parsed['type'] as DefType;
  if (!pathDefs) throw new Error('[agentMaterializeDef] missing pathDefs');
  if (!moduleName) throw new Error('[agentMaterializeDef] missing moduleName');
  if (!type) throw new Error('[agentMaterializeDef] missing type');
  return { pathDefs, moduleName, type };
}

function getPageId(pathDefs: string): string {
  return pathDefs.split('/').pop()?.replace(/\.defs\.ts$/, '') ?? '';
}

function getGenomeKey(pathDefs: string, moduleName: string): string {
  const marker = `/l2/${moduleName}/`;
  const idx = pathDefs.indexOf(marker);
  if (idx === -1) return 'web/desktop/page11';
  const after = pathDefs.slice(idx + marker.length); // e.g. web/desktop/page11/orderPage.defs.ts
  const parts = after.split('/');
  parts.pop(); // remove filename
  return parts.join('/');
}

// ─── skill resolution ─────────────────────────────────────────────────────────

interface SkillContext {
  prompt: string;
  outputPath: string;
  genomeKey?: string;
}

async function resolveSkills(input: AgentInput, project: number): Promise<SkillContext> {
  const { pathDefs, moduleName, type } = input;
  const pageId = getPageId(pathDefs);

  const orch = getMaterializeOrchestrator(pathDefs);
  const user = await orch.getVar(pathDefs, 'skill');

  const modRef = `_${project}_/l2/${moduleName}/module.ts`;
  const mod = await collabImport(mls.stor.convertFileReferenceToFile(modRef) as any) as any;
  if (!mod) throw new Error(`[agentMaterializeDef] could not import module.ts: ${modRef}`);

  const info = { path: pathDefs, project, moduleName, id: type };

  // ── contract ──────────────────────────────────────────────────────────────
  if (type === 'contract') {
    const skillPaths: string[] = mod.skills?.contract?.skillPath ?? [];
    if (skillPaths.length === 0)
      throw new Error(`[agentMaterializeDef] skills.contract.skillPath is empty in module.ts for ${moduleName}`);

    const skillTexts = await Promise.all(skillPaths.map((p: string) => orch.getSkill(p)));
    const skillSection = skillTexts
      .filter(Boolean)
      .map((s, i) => skillPaths.length === 1 ? `##Skill\n${s}` : `##Skill ${i + 1}\n${s}`)
      .join('\n\n');

    const outputPath = `_${project}_/l2/${moduleName}/web/contracts/${pageId}.ts`;
    return {
      prompt: `${skillSection}\n\n##User data\n${user}\n\n##User info\n${JSON.stringify({ ...info, item: { id: type, outputPath, defsPath: pathDefs } })}`,
      outputPath,
    };
  }

  // ── shared ────────────────────────────────────────────────────────────────
  if (type === 'shared') {
    const device = 'web';
    const deviceShared = mod.shared?.[device];
    if (!deviceShared)
      throw new Error(`[agentMaterializeDef] shared.${device} not found in module.ts for ${moduleName}`);

    const sharedSkillPath = deviceShared.sharedSkill as string;
    const rawSharedPath = (deviceShared.sharedPath as string ?? `/_${project}_/l2/${moduleName}/web/shared`);
    const sharedPath = rawSharedPath.replace(/^\//, '').replace(/\/$/, '');

    const skill = await orch.getSkill(sharedSkillPath);
    const outputPath = `${sharedPath}/${pageId}.ts`;
    return {
      prompt: `##Skill\n${skill}\n\n##User data\n${user}\n\n##User info\n${JSON.stringify({ ...info, item: { id: type, outputPath, defsPath: pathDefs } })}`,
      outputPath,
    };
  }

  // ── page ──────────────────────────────────────────────────────────────────
  const genomeKey = getGenomeKey(pathDefs, moduleName);
  const genome = mod.moduleGenome?.[genomeKey];
  if (!genome)
    throw new Error(`[agentMaterializeDef] moduleGenome["${genomeKey}"] not found in module.ts for ${moduleName}`);

  const prj = await getConfigProject(mls.actualProject || 0) as any;
  if (!prj?.layouts) throw new Error('[agentMaterializeDef] project config missing layouts');
  if (!prj?.designSystems) throw new Error('[agentMaterializeDef] project config missing designSystems');

  const layout = Object.values(prj.layouts).find((v: any) => v.name === genome.layout) as any;
  if (!layout) throw new Error(`[agentMaterializeDef] layout "${genome.layout}" not found in project config`);

  const designSystem = Object.values(prj.designSystems).find((ds: any) => ds.name === genome.designSystem) as any;
  if (!designSystem) throw new Error(`[agentMaterializeDef] designSystem "${genome.designSystem}" not found in project config`);

  const pathSkill = (layout.skill as string).replace(/^\//, '').replace('.js', '.ts');
  const pathDS = (designSystem.skill as string).replace(/^\//, '').replace('.js', '.ts');

  const [skill, dsSkill] = await Promise.all([orch.getSkill(pathSkill), orch.getSkill(pathDS)]);
  const dsSection = dsSkill ? `\n\n##Design System\n${dsSkill}` : '';

  const genomeKeyNorm = genomeKey.replace(/\/$/, '');
  const outputPath = `_${project}_/l2/${moduleName}/${genomeKeyNorm}/${pageId}.ts`;

  return {
    prompt: `##Skill\n${skill}${dsSection}\n\n##User data\n${user}\n\n##User info\n${JSON.stringify({ ...info, genomeKey, item: { id: type, outputPath, defsPath: pathDefs, genomeKey } })}`,
    outputPath,
    genomeKey,
  };
}

// ─── beforePromptImplicit ─────────────────────────────────────────────────────

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const input = parseInput(userPrompt);
  const project = mls.actualProject || 0;
  const { prompt, type } = { ...(await resolveSkills(input, project)), type: input.type };

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: buildSystemPrompt(type) },
        { type: 'human', content: prompt },
      ],
      taskTitle: `${type}:${getPageId(input.pathDefs)}`,
      threadId: context.message.threadId,
      userMessage: input.pathDefs,
      longTermMemory: { moduleName: input.moduleName, defType: type },
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
  if (!args) throw new Error(`(${agent.agentName})[beforePromptStep] args required`);

  const input = parseInput(args);
  const project = mls.actualProject || 0;
  const { prompt } = await resolveSkills(input, project);

  const promptReady: mls.msg.AgentIntentPromptReady = {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    humanPrompt: prompt,
    systemPrompt: buildSystemPrompt(input.type),
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

  const payload = step.interaction?.payload?.[0];
  if (payload?.type !== 'flexible' || !payload.result)
    throw new Error(`(${agent.agentName})[afterPromptStep] invalid payload`);

  let status: mls.msg.AIStepStatus = 'completed';

  try {
    const output = payload.result as AgentOutput['result'];
    const moduleName = output.moduleName ?? (context.task?.iaCompressed?.longMemory['moduleName'] as string);
    await saveOutput(output, moduleName);
  } catch (err) {
    status = 'failed';
    console.error(`[agentMaterializeDef](afterPromptStep)`, err);
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

// ─── output persistence ───────────────────────────────────────────────────────

async function saveOutput(output: AgentOutput['result'], moduleName: string): Promise<void> {
  const ref = output.outputPath.startsWith('/') ? output.outputPath.slice(1) : output.outputPath;
  const orch = getMaterializeOrchestrator(output.path);
  await orch.createStorFile(ref, output.srcFile);

  if (output.id !== 'page') return;

  const fileInfo = mls.stor.convertFileReferenceToFile(ref);
  if (!(fileInfo as any).project) (fileInfo as any).project = mls.actualProject || 0;
  const project = (fileInfo as any).project as number;
  const tag = convertFileNameToTag(fileInfo);

  await orch.createStorFile(ref.replace(/\.ts$/, '.html'), `<${tag}></${tag}>`);

  const genomeKey = output.genomeKey ?? 'web/desktop/page11';
  const entrypoint = `/_${project}_/l2/${moduleName}/${genomeKey}/${fileInfo.shortName}.js`;

  await withLock(`module:${moduleName}`, async () => {
    const moduleRef = `_${project}_/l2/${moduleName}/module.ts`;
    const sf = mls.stor.files[mls.stor.getKeyToFile(mls.stor.convertFileReferenceToFile(moduleRef))];
    if (!sf) return;
    let src = await sf.getContent() as string;
    src = addModuleNav(src, { id: fileInfo.shortName, label: fileInfo.shortName, href: `/${moduleName}/${fileInfo.shortName}`, description: fileInfo.shortName });
    src = addModuleRoute(src, { path: `/${moduleName}/${fileInfo.shortName}`, aliases: [], entrypoint, tag, title: fileInfo.shortName });
    await writeStorFile(moduleRef, src);
  });

  await withLock(`index:${moduleName}`, async () => {
    const indexRef = `_${project}_/l2/${moduleName}/index.ts`;
    const sf = mls.stor.files[mls.stor.getKeyToFile(mls.stor.convertFileReferenceToFile(indexRef))];
    if (!sf) return;
    let src = await sf.getContent() as string;
    src = addNav(src, { label: fileInfo.shortName, href: `/${moduleName}/${fileInfo.shortName}` });
    src = addPage(src, { path: `/${moduleName}/${fileInfo.shortName}`, title: fileInfo.shortName, tagName: tag, loader: entrypoint });
    await writeStorFile(indexRef, src);
  });
}

// ─── stor helper ──────────────────────────────────────────────────────────────

async function writeStorFile(ref: string, src: string): Promise<void> {
  const info = mls.stor.convertFileReferenceToFile(ref);
  const key = mls.stor.getKeyToFile(info);
  let sf = mls.stor.files[key];
  if (!sf) {
    sf = await createStorFile({ ...info, source: src } as IReqCreateStorFile, true, true, true);
  } else {
    const m = await sf.getOrCreateModel();
    if (m?.model) m.model.setValue(src);
  }
  await mls.stor.localStor.setContent(sf, { contentType: 'string', content: src });
}

// ─── system prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(type: DefType): string {
  const model = type === 'contract' ? 'codeinstruct' : 'codereasoning';
  return `
<!-- modelType: ${model} -->
<!-- modelTypeList: geminiChat (2.5 pro), code (grok), deepseekchat, codeflash (gemini), deepseekreasoner, mini (4.1) ou nano (openai), codeinstruct (4.1), codereasoning(gpt5), code2 (kimi 2.5) -->

You must return ONLY a valid JSON object. No preamble, no explanation, no markdown
fences, no text before or after the JSON. Start your response with { and end with }

## Output format
The srcFile value must be a single-line JSON string.
Escape ALL special characters inside it:
  - newlines     → \\n
  - tabs         → \\t
  - double quotes → \\"
  - backslashes  → \\\\
Never embed raw multiline code blocks inside a JSON string value.

Return strictly this structure:

[[OutputSection]]
`;
}

// ─── output type ──────────────────────────────────────────────────────────────

//#region OutputSection
export type AgentOutput = {
  type: 'flexible';
  result: {
    path: string;        // echo from User info
    id: DefType;         // echo from User info
    moduleName: string;  // echo from User info
    genomeKey?: string;  // echo from User info (page only)
    outputPath: string;  // echo from User info
    srcFile: string;     // generated TypeScript source
  };
};
//#endregion
