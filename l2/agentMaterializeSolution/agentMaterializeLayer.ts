/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentMaterializeLayer.ts" enhancement="_102027_/l2/enhancementAgent.ts"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getMaterializeOrchestrator, getEsbuild } from '/_102020_/l2/agentMaterializeSolution/materializeOrchestrator.js';
import { collabImport } from '/_102027_/l2/collabImport.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentMaterializeLayer',
    agentProject: 102020,
    agentFolder: 'agentMaterializeSolution',
    agentDescription: 'Generate L1 .ts from .defs.ts using skills from module.ts skills[layerKey]',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

// ─── input ────────────────────────────────────────────────────────────────────

interface AgentInput {
  pathDefs: string;
  moduleName: string;
  layer: string; // e.g. 'layer_1_external', 'layer_3_usecases'
}

function parseInput(raw: string): AgentInput {
  const parsed = JSON.parse(raw.trim()) as Record<string, unknown>;
  const pathDefs = parsed['pathDefs'] as string;
  const moduleName = parsed['moduleName'] as string;
  const layer = parsed['layer'] as string;
  if (!pathDefs) throw new Error('[agentMaterializeLayer] missing pathDefs');
  if (!moduleName) throw new Error('[agentMaterializeLayer] missing moduleName');
  if (!layer) throw new Error('[agentMaterializeLayer] missing layer');
  return { pathDefs, moduleName, layer };
}

// layer_1_external → layer1 | layer_3_usecases → layer3
function layerToSkillKey(layer: string): string {
  const match = layer.match(/layer_(\d+)/);
  if (!match) throw new Error(`[agentMaterializeLayer] cannot extract layer number from "${layer}"`);
  return `layer${match[1]}`;
}

function getOutputPath(pathDefs: string): string {
  return pathDefs.replace(/\.defs\.ts$/, '.ts');
}

function getFileId(pathDefs: string): string {
  return pathDefs.split('/').pop()?.replace(/\.defs\.ts$/, '') ?? '';
}

// ─── defs reader ──────────────────────────────────────────────────────────────

async function readDefsContent(pathDefs: string): Promise<string> {
  const ref = pathDefs.startsWith('/') ? pathDefs.slice(1) : pathDefs;
  const info = mls.stor.convertFileReferenceToFile(ref);
  const key = mls.stor.getKeyToFile(info);
  const sf = mls.stor.files[key];
  if (!sf) throw new Error(`[agentMaterializeLayer] defs not found: ${pathDefs}`);
  const content = await sf.getContent();
  return typeof content === 'string' ? content : JSON.stringify(content, null, 2);
}

// ─── skill resolution ─────────────────────────────────────────────────────────

interface SkillContext {
  prompt: string;
  outputPath: string;
}

async function getModule(project: number, moduleName: string): Promise<any> {
  const modRef = `_${project}_/l2/${moduleName}/module.ts`;
  try {
    const mod = await collabImport(mls.stor.convertFileReferenceToFile(modRef) as any) as any;
    return mod;
  } catch (e) {
    return await getModuleByBuild(modRef);
  }
}

async function getModuleByBuild(path: string) {

  console.info('Needed esbuild processTemplate:' + path);

  const f = mls.stor.convertFileReferenceToFile(path);
  if (!f) return null;

  const key = mls.stor.getKeyToFile(f);
  const sf = mls.stor.files[key];
  if (!sf) return null;

  const src = await sf.getContent() as string;

  const esbuild = await getEsbuild();
  const result = await esbuild.transform(src, {
    loader: 'ts',
    format: 'esm',
    target: 'esnext',
  });

  const blob = new Blob([result.code], { type: 'text/javascript' });
  const blobUrl = URL.createObjectURL(blob);

  try {
    const mod = await import(blobUrl);

    return mod;
  } finally {

  }
}

async function resolveSkills(input: AgentInput, project: number): Promise<SkillContext> {
  const { pathDefs, moduleName, layer } = input;
  const skillKey = layerToSkillKey(layer);
  const outputPath = getOutputPath(pathDefs);

  const modRef = `_${project}_/l2/${moduleName}/module.ts`;
  const mod = await getModule(project, moduleName) as any;
  if (!mod) throw new Error(`[agentMaterializeLayer] could not import module.ts: ${modRef}`);

  const skillPaths: string[] = mod.skills?.[skillKey]?.skillPath ?? [];
  if (skillPaths.length === 0)
    throw new Error(`[agentMaterializeLayer] skills.${skillKey}.skillPath is empty in module.ts for ${moduleName}`);

  const orch = getMaterializeOrchestrator(pathDefs);

  // Layer skill
  const skillTexts = await Promise.all(skillPaths.map((p: string) => orch.getSkill(p)));
  const skillSection = skillTexts
    .filter(Boolean)
    .map((s, i) => skillPaths.length === 1 ? `##Skill\n${s}` : `##Skill ${i + 1}\n${s}`)
    .join('\n\n');

  // Architecture skill (optional — loaded same way as layer skills via getSkill)
  const architecturePaths: string[] = mod.skills?.architecture?.skillPath ?? [];
  const architectureTexts = architecturePaths.length > 0
    ? await Promise.all(architecturePaths.map((p: string) => orch.getSkill(p)))
    : [];
  const architectureSection = architectureTexts.filter(Boolean).join('\n\n');

  // Definition content (optional — each skillPath entry is a mls.editor.models key)
  const definitionKeys: string[] = mod.skills?.definition?.skillPath ?? [];
  const definitionTexts = definitionKeys
    .map((key: string) => {
      try {
        return (mls as any).editor?.models?.[key]?.ts?.model?.getValue() as string | undefined;
      } catch { return undefined; }
    })
    .filter(Boolean) as string[];
  const definitionSection = definitionTexts.join('\n\n');

  const defsContent = await readDefsContent(pathDefs);
  const fileId = getFileId(pathDefs);

  const info = {
    pathDefs,
    project,
    moduleName,
    layer,
    skillKey,
    fileId,
    item: { id: fileId, outputPath, defsPath: pathDefs },
  };

  let prompt = skillSection;
  if (architectureSection) prompt += `\n\n##Architecture\n${architectureSection}`;
  if (definitionSection) prompt += `\n\n##Definition\n${definitionSection}`;
  prompt += `\n\n##User data\n${defsContent}\n\n##User info\n${JSON.stringify(info)}`;

  return { prompt, outputPath };
}

// ─── beforePromptImplicit ─────────────────────────────────────────────────────

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const input = parseInput(userPrompt);
  const project = mls.actualProject || 0;
  const { prompt } = await resolveSkills(input, project);
  const fileId = getFileId(input.pathDefs);

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: systemPrompt },
        { type: 'human', content: prompt },
      ],
      taskTitle: `${input.layer}:${fileId}`,
      threadId: context.message.threadId,
      userMessage: input.pathDefs,
      longTermMemory: { moduleName: input.moduleName, layer: input.layer },
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

  const payload = step.interaction?.payload?.[0];
  if (payload?.type !== 'flexible' || !payload.result)
    throw new Error(`(${agent.agentName})[afterPromptStep] invalid payload`);

  let status: mls.msg.AIStepStatus = 'completed';

  try {
    const output = payload.result as AgentOutput['result'];
    const orch = getMaterializeOrchestrator(output.outputPath);
    const ref = output.outputPath.startsWith('/') ? output.outputPath.slice(1) : output.outputPath;
    await orch.createStorFile(ref, output.srcFile);
  } catch (err) {
    status = 'failed';
    console.error(`[agentMaterializeLayer](afterPromptStep)`, err);
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
<!-- modelType: code2 -->
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

// ─── output type ──────────────────────────────────────────────────────────────

//#region OutputSection
export type AgentOutput = {
  type: 'flexible';
  result: {
    pathDefs: string;  // echo from User info
    outputPath: string; // echo from User info
    srcFile: string;   // generated TypeScript source
  };
};
//#endregion
