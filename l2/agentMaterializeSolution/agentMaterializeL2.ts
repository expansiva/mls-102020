/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentMaterializeL2.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  readProjectJson,
  scanL2DefsWithPipeline,
  getFileModified,
  toMlsPath,
} from '/_102020_/l2/agentMaterializeSolution/agentMaterializeArtifacts.js';
import type {
  GenStepArgs,
  L2FileType,
  PipelineItem,
} from '/_102020_/l2/agentMaterializeSolution/agentMaterializePlan.js';

declare const mls: any;

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentMaterializeL2',
    agentProject: 102020,
    agentFolder: 'agentMaterializeSolution',
    agentDescription: 'Generate L2 .ts files from .defs.ts pipeline definitions',
    visibility: 'public',
    beforePromptImplicit,
    afterPromptStep,
  };
}

interface Candidate {
  folder: string;
  shortName: string;
  pipeline: PipelineItem[];
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  _userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const project = mls.actualProject || 0;
  const projectJson = await readProjectJson();
  if (!projectJson?.modules?.length) {
    throw new Error('[agentMaterializeL2] l5/project.json not found or empty');
  }

  const summaries = [];
  for (const mod of projectJson.modules) {
    const candidates = await findCandidates(project, mod.moduleName);
    const byType = groupByType(candidates, mod.moduleName);
    summaries.push({
      moduleName: mod.moduleName,
      contracts: byType.contract.length,
      shared: byType.shared.length,
      pages: byType.page.length,
    });
  }

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: systemPrompt },
        { type: 'human', content: buildHumanPrompt(summaries) },
      ],
      taskTitle: 'materialize-l2',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { taskName: 'materialize-l2', flowName: 'materialize-l2' },
    },
  };

  return [addMessageAI];
}

// ─── After LLM confirms — create all generation steps ────────────────────────

async function afterPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  _parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  try {
    const payload = step.interaction?.payload?.[0] as any;
    if (!payload) throw new Error('[agentMaterializeL2] missing payload');

    if (payload.type === 'result') {
      return [mkFail(context, _parentStep, step, hookSequential, String(payload.result))];
    }
    if (payload.type !== 'flexible') {
      return [mkFail(context, _parentStep, step, hookSequential, 'scan failed')];
    }
    if (payload.result?.status === 'nothing') {
      return [mkComplete(context, _parentStep, step, hookSequential, 'nothing to generate')];
    }
    if (payload.result?.status === 'failed') {
      return [mkFail(context, _parentStep, step, hookSequential, payload.result?.notes?.join('; ') || 'scan failed')];
    }

    const project = mls.actualProject || 0;
    const projectJson = await readProjectJson();
    if (!projectJson) throw new Error('[agentMaterializeL2] project.json unavailable');

    const intents: mls.msg.AgentIntentAddStep[] = [];

    for (const mod of projectJson.modules) {
      const { moduleName } = mod;
      const candidates = await findCandidates(project, moduleName);
      const byType = groupByType(candidates, moduleName);

      // Pre-compute planId arrays — used as group barriers
      const contractPlanIds = byType.contract.map(c => makePlanId(moduleName, c.shortName, 'contract'));
      const sharedPlanIds   = byType.shared.map(c => makePlanId(moduleName, c.shortName, 'shared'));

      // Group 1: contracts — start immediately
      for (const c of byType.contract) {
        const planId = makePlanId(moduleName, c.shortName, 'contract');
        const defPath = toMlsPath(project, 2, c.folder, c.shortName, '.defs.ts');
        const args: GenStepArgs = { planId, defPath };
        intents.push(mkStep(context, step, planId, `Gen contract: ${moduleName}/${c.shortName}`, c.pipeline[0].agent, args, []));
      }

      // Group 2: shared — wait for ALL contracts to complete
      for (const c of byType.shared) {
        const planId = makePlanId(moduleName, c.shortName, 'shared');
        const defPath = toMlsPath(project, 2, c.folder, c.shortName, '.defs.ts');
        const args: GenStepArgs = { planId, defPath };
        intents.push(mkStep(context, step, planId, `Gen shared: ${moduleName}/${c.shortName}`, c.pipeline[0].agent, args, contractPlanIds));
      }

      // Group 3: pages — wait for ALL shared (fallback to ALL contracts if no shared)
      const pageDep = sharedPlanIds.length > 0 ? sharedPlanIds : contractPlanIds;
      for (const c of byType.page) {
        const planId = makePlanId(moduleName, c.shortName, 'page');
        const defPath = toMlsPath(project, 2, c.folder, c.shortName, '.defs.ts');
        const args: GenStepArgs = { planId, defPath };
        intents.push(mkStep(context, step, planId, `Gen page: ${moduleName}/${c.shortName}`, c.pipeline[0].agent, args, pageDep));
      }
    }

    if (!intents.length) return [mkComplete(context, _parentStep, step, hookSequential, 'nothing to generate')];
    return intents;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return [mkFail(context, _parentStep, step, hookSequential, msg)];
  }
}

// ─── Candidate detection ──────────────────────────────────────────────────────

async function findCandidates(project: number, moduleName: string): Promise<Candidate[]> {
  const all = await scanL2DefsWithPipeline(project, moduleName);
  return all.filter(({ folder, shortName }) => {
    const defMod = getFileModified(project, 2, folder, shortName, '.defs.ts');
    const tsMod  = getFileModified(project, 2, folder, shortName, '.ts');
    if (tsMod === null) return true;
    if (defMod === null) return false;
    return defMod > tsMod;
  });
}

function groupByType(
  candidates: Candidate[],
  moduleName: string,
): Record<L2FileType, Candidate[]> {
  const result: Record<L2FileType, Candidate[]> = { contract: [], shared: [], page: [] };
  for (const c of candidates) {
    const ft = detectFileType(c.folder, moduleName);
    if (ft) result[ft].push(c);
  }
  return result;
}

// ─── File type detection ──────────────────────────────────────────────────────

function detectFileType(folder: string, moduleName: string): L2FileType | null {
  const rel = folder.slice(moduleName.length + 1); // strip "cafeFlow/"
  if (rel.startsWith('web/contracts')) return 'contract';
  if (rel.startsWith('web/shared'))    return 'shared';
  if (rel.startsWith('web/desktop'))   return 'page';
  return null;
}

// ─── ID helpers ───────────────────────────────────────────────────────────────

function makePlanId(moduleName: string, shortName: string, ft: L2FileType): string {
  return `gen-l2-${safe(moduleName)}-${safe(shortName)}-${ft}`;
}

function safe(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

// ─── Builders ─────────────────────────────────────────────────────────────────

function mkStep(
  context: mls.msg.ExecutionContext,
  rootStep: mls.msg.AIAgentStep,
  planId: string,
  title: string,
  agentName: string,
  args: GenStepArgs,
  dependsOn: string[],
): mls.msg.AgentIntentAddStep {
  const status: mls.msg.AIStepStatus = dependsOn.length > 0 ? 'waiting_dependency' : 'waiting_human_input';
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: rootStep.stepId,
    step: {
      type: 'agent',
      stepId: 0,
      interaction: null,
      stepTitle: title,
      status,
      nextSteps: [],
      agentName,
      prompt: JSON.stringify(args),
      rags: [],
      planning: { planId, dependsOn, executionMode: 'parallel_static', executionHost: 'client' },
    } as any,
  };
}

function mkFail(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  traceMsg: string,
): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep?.stepId ?? step.stepId,
    stepId: step.stepId,
    status: 'failed',
    traceMsg,
  };
}

function mkComplete(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  traceMsg?: string,
): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep?.stepId ?? step.stepId,
    stepId: step.stepId,
    status: 'completed',
    traceMsg,
  };
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const systemPrompt = `<!-- modelType: codepro -->

You confirm the L2 generation scan.

If files were found, return:
{"type":"flexible","result":{"status":"ok","notes":[]}}

If nothing to generate, return:
{"type":"flexible","result":{"status":"nothing"}}

Return valid JSON only.`;

function buildHumanPrompt(
  summaries: Array<{ moduleName: string; contracts: number; shared: number; pages: number }>,
): string {
  const lines = ['# L2 Generation Scan', ''];
  for (const s of summaries) {
    lines.push(`## Module: ${s.moduleName}`);
    lines.push(`  contracts: ${s.contracts}, shared: ${s.shared}, pages: ${s.pages}`);
  }
  const total = summaries.reduce((n, s) => n + s.contracts + s.shared + s.pages, 0);
  lines.push('', `Total: ${total} file(s) to generate.`);
  lines.push('Confirm and return your response.');
  return lines.join('\n');
}
