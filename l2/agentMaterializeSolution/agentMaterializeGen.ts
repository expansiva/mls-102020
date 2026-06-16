/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentMaterializeGen.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { collabImport } from '/_102027_/l2/collabImport.js';
import { convertFileNameToTag } from '/_102027_/l2/utils.js';
import {
  getContentByMlsPath,
  parseDefinitionFromContent,
  parseMlsPath,
  saveGeneratedTs,
  saveGeneratedHtml,
  extractToolCallArgs,
  loadModuleByBuild,
} from '/_102020_/l2/agentMaterializeSolution/agentMaterializeArtifacts.js';
import type { GenStepArgs } from '/_102020_/l2/agentMaterializeSolution/agentMaterializePlan.js';

declare const mls: any;

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentMaterializeGen',
    agentProject: 102020,
    agentFolder: 'agentMaterializeSolution',
    agentDescription: 'Generate a .ts file from a .defs.ts pipeline item using the resolved skill',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

const TOOL_NAME = 'submitGeneratedTs';

interface ToolOutput {
  code: string;
}

const toolSchema = {
  type: 'function',
  function: {
    name: TOOL_NAME,
    description: 'Submit the complete generated TypeScript file content.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['code'],
      properties: {
        code: {
          type: 'string',
          description: 'Complete TypeScript file content. Must start with the /// <mls fileReference="..."> header comment.',
        },
      },
    },
  },
} as const;

// ─── beforePromptStep ─────────────────────────────────────────────────────────

async function beforePromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  _step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error('[agentMaterializeGen] missing args');

  const { defPath, pipelineItem, skillPaths }: GenStepArgs = JSON.parse(args);

  // Read .defs.ts and extract definition
  const defsContent = await getContentByMlsPath(defPath);
  if (!defsContent) throw new Error(`[agentMaterializeGen] .defs.ts not found: ${defPath}`);
  const definition = parseDefinitionFromContent(defsContent);

  // Load skill content — .ts/.md paths go to system prompt; project refs (_digits_) go to context
  const skillSections: string[] = [];
  const defContextSections: string[] = [];
  for (const sp of skillPaths) {
    const clean = sp.startsWith('/') ? sp.slice(1) : sp;
    if (/^_\d+_$/.test(clean)) {
      const content = await loadProjectDefinition(clean);
      if (content) defContextSections.push(`### Project Definition (${clean})\n\`\`\`typescript\n${content}\n\`\`\``);
    } else {
      const content = await loadSkillContent(sp);
      if (content) skillSections.push(`<!-- skill: ${sp} -->\n${content}`);
    }
  }

  // Load dependsFiles as context
  const depSections: string[] = [];
  for (const dep of pipelineItem.dependsFiles) {
    const content = await getContentByMlsPath(dep);
    if (content) depSections.push(`### ${dep}\n\`\`\`typescript\n${content}\n\`\`\``);
  }

  const contextSections = [...defContextSections, ...depSections];

  const intent: mls.msg.AgentIntentPromptReady = {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: buildSystemPrompt(skillSections, pipelineItem.outputPath),
    humanPrompt: buildHumanPrompt(definition, contextSections, pipelineItem.outputPath),
    tools: [toolSchema as unknown as mls.msg.LLMTool],
    toolChoice: { type: 'function', function: { name: TOOL_NAME } },
  };

  return [intent];
}

// ─── afterPromptStep ──────────────────────────────────────────────────────────

async function afterPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const { pipelineItem, fileType }: GenStepArgs = JSON.parse(step.prompt || '{}');

  const raw = step.interaction?.payload?.[0] as any;
  const out = extractToolCallArgs<ToolOutput>(raw, TOOL_NAME);

  if (!out?.code) {
    return [mkStatus(context, parentStep, step, hookSequential, 'failed', 'missing generated code')];
  }

  const parsed = parseMlsPath(pipelineItem.outputPath);
  if (!parsed) {
    return [mkStatus(context, parentStep, step, hookSequential, 'failed', `invalid outputPath: ${pipelineItem.outputPath}`)];
  }

  // Ensure fileReference header is present
  const header = `/// <mls fileReference="${pipelineItem.outputPath}" enhancement="_blank"/>`;
  const code = out.code.trimStart().startsWith('///')
    ? out.code
    : `${header}\n\n${out.code}`;

  const ok = await saveGeneratedTs(parsed.project, parsed.level, parsed.folder, parsed.shortName, code);

  // Pages also need a companion .html file with the web component tag
  if (ok && fileType === 'page') {
    const tag = convertFileNameToTag({ shortName: parsed.shortName, project: parsed.project, folder: parsed.folder });
    await saveGeneratedHtml(parsed.project, parsed.level, parsed.folder, parsed.shortName, `<${tag}></${tag}>`);
  }

  return [mkStatus(
    context, parentStep, step, hookSequential,
    ok ? 'completed' : 'failed',
    ok ? undefined : 'saveGeneratedTs failed',
    ok ? 'input_output' : undefined,
  )];
}

// ─── Skill loader ─────────────────────────────────────────────────────────────

/** Fetches the TypeScript content of a project definition reference (e.g. '_102034_'). */
async function loadProjectDefinition(projectRef: string): Promise<string> {
  const models = (mls as any).editor?.models;
  if (!models?.[projectRef]) return '';
  if (!models[projectRef].ts) return '';
  return models[projectRef].ts.model?.getValue?.() ?? '';
}

async function loadSkillContent(skillPath: string): Promise<string> {
  const clean = skillPath.startsWith('/') ? skillPath.slice(1) : skillPath;

  if (clean.endsWith('.md')) {
    return await getContentByMlsPath(clean) ?? '';
  }

  // .ts skill: try collabImport → read .skill export
  const f = mls.stor.convertFileReferenceToFile(clean);
  if (!f) return '';

  let mod: any;
  try {
    mod = await collabImport(f);
  } catch {
    mod = await loadModuleByBuild(clean);
  }

  if (typeof mod?.skill === 'string') return mod.skill;

  // Last resort: raw file content
  return await getContentByMlsPath(clean) ?? '';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    status,
    traceMsg,
    cleaner,
  };
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(skillSections: string[], outputPath: string): string {
  const skills = skillSections.length
    ? skillSections.join('\n\n---\n\n')
    : '<!-- no skill loaded -->';

  return `<!-- modelType: codeinstruct -->

You generate a TypeScript file based on a definition and context files.

Target file: ${outputPath}

The file must start with:
/// <mls fileReference="${outputPath}" enhancement="_blank"/>

Follow the instructions in the skill(s) below exactly.
Use the context files (dependsFiles) as reference for types, imports and logic.

---

${skills}`;
}

function buildHumanPrompt(
  definition: string,
  depSections: string[],
  outputPath: string,
): string {
  const lines: string[] = ['## Definition', '', definition];

  if (depSections.length) {
    lines.push('', '## Context Files', '');
    lines.push(...depSections);
  }

  lines.push('', `Generate the file \`${outputPath}\` and call ${TOOL_NAME} with the complete code.`);
  return lines.join('\n');
}
