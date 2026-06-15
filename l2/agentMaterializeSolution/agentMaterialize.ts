/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentMaterialize.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  readProjectJson,
  scanModuleDefsFiles,
} from '/_102020_/l2/agentMaterializeSolution/agentMaterializeArtifacts.js';
import type { ScannedDefFile } from '/_102020_/l2/agentMaterializeSolution/agentMaterializePlan.js';

declare const mls: any;

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentMaterialize',
    agentProject: 102020,
    agentFolder: 'agentMaterializeSolution',
    agentDescription: 'Build materialize pipeline for all modules in a project',
    visibility: 'public',
    beforePromptImplicit,
    afterPromptStep,
  };
}

// ─── Output type ──────────────────────────────────────────────────────────────

//#region OutputSection
export type Output =
  | { type: 'flexible'; result: MaterializeBootstrapResult }
  | { type: 'result'; result: string };

export interface MaterializeBootstrapResult {
  status: 'ok' | 'failed';
  notes: string[];
}
//#endregion

// ─── Entry point ──────────────────────────────────────────────────────────────

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  _userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const project = mls.actualProject || 0;
  const projectJson = await readProjectJson();

  if (!projectJson || !Array.isArray(projectJson.modules) || projectJson.modules.length === 0) {
    throw new Error(
      `[agentMaterialize] l5/project.json not found or has no modules in project ${project}`,
    );
  }

  const moduleSummaries = projectJson.modules.map(mod => {
    const scanned = scanModuleDefsFiles(project, mod.moduleName);
    const l1 = scanned.filter(f => f.layer === 'l1');
    const l2 = scanned.filter(f => f.layer === 'l2');
    return {
      moduleName: mod.moduleName,
      l1Files: l1.map(f => `${f.type}/${f.shortName}`),
      l2Files: l2.map(f => `${f.type}/${f.shortName}`),
    };
  });

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: systemPrompt },
        { type: 'human', content: buildHumanPrompt(moduleSummaries) },
      ],
      taskTitle: 'materializePipeline',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        taskName: 'materializePipeline',
        flowName: 'materialize',
      },
    },
  };

  return [addMessageAI];
}

// ─── After LLM responds ────────────────────────────────────────────────────────

async function afterPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  try {
    const payload = step.interaction?.payload?.[0] as Output | undefined;
    if (!payload) throw new Error('[agentMaterialize] missing payload');

    if (payload.type === 'result') {
      return [createUpdateStatus(context, parentStep, step, hookSequential, 'failed', payload.result)];
    }

    if (payload.type !== 'flexible' || !payload.result) {
      throw new Error(`[agentMaterialize] unexpected payload: ${JSON.stringify(payload)}`);
    }

    if (payload.result.status === 'failed') {
      const notes = payload.result.notes?.join('; ') || 'bootstrap reported failed';
      return [createUpdateStatus(context, parentStep, step, hookSequential, 'failed', notes)];
    }

    const project = mls.actualProject || 0;
    const projectJson = await readProjectJson();
    if (!projectJson) throw new Error('[agentMaterialize] project.json unavailable in afterPromptStep');

    const addStepIntents: mls.msg.AgentIntentAddStep[] = [];

    for (const mod of projectJson.modules) {
      const { moduleName } = mod;
      const scanned = scanModuleDefsFiles(project, moduleName);

      // L1 non-external files need LLM dependency resolution before assembly
      const l1NonExternal = scanned.filter(
        f => f.layer === 'l1' && f.type !== 'layer_1_external',
      );

      const resolvePlanIds: string[] = [];
      for (const file of l1NonExternal) {
        const planId = `mat-resolve-${toSafeId(moduleName)}-${toSafeId(file.shortName)}`;
        resolvePlanIds.push(planId);
        addStepIntents.push(buildResolveStep(context, step, planId, moduleName, file));
      }

      // One assemble step per module — waits for all its resolve deps
      const assemblePlanId = `mat-assemble-${toSafeId(moduleName)}`;
      addStepIntents.push(buildAssembleStep(context, step, assemblePlanId, moduleName, resolvePlanIds));
    }

    return addStepIntents;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return [createUpdateStatus(context, parentStep, step, hookSequential, 'failed', msg)];
  }
}

// ─── Step builders ─────────────────────────────────────────────────────────────

function buildResolveStep(
  context: mls.msg.ExecutionContext,
  rootStep: mls.msg.AIAgentStep,
  planId: string,
  moduleName: string,
  file: ScannedDefFile,
): mls.msg.AgentIntentAddStep {
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
      stepTitle: `Resolve deps: ${moduleName}/${file.shortName}`,
      status: 'waiting_dependency',
      nextSteps: [],
      agentName: 'agentMaterializeResolveDeps',
      prompt: JSON.stringify({ planId, moduleName, shortName: file.shortName, type: file.type }),
      rags: [],
      planning: {
        planId,
        dependsOn: [],
        executionMode: 'parallel_static',
        executionHost: 'client',
      },
    } as any,
  };
}

function buildAssembleStep(
  context: mls.msg.ExecutionContext,
  rootStep: mls.msg.AIAgentStep,
  planId: string,
  moduleName: string,
  dependsOn: string[],
): mls.msg.AgentIntentAddStep {
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
      stepTitle: `Assemble pipeline: ${moduleName}`,
      status: 'waiting_dependency',
      nextSteps: [],
      agentName: 'agentMaterializeAssemble',
      prompt: JSON.stringify({ planId, moduleName }),
      rags: [],
      planning: {
        planId,
        dependsOn,
        executionMode: 'sequential',
        executionHost: 'client',
      },
    } as any,
  };
}

// ─── Prompt builders ───────────────────────────────────────────────────────────

function buildHumanPrompt(
  summaries: Array<{ moduleName: string; l1Files: string[]; l2Files: string[] }>,
): string {
  const lines: string[] = ['# Materialize Bootstrap Scan', ''];
  for (const s of summaries) {
    lines.push(`## Module: ${s.moduleName}`);
    lines.push(`L1 (${s.l1Files.length} files): ${s.l1Files.join(', ') || '(none)'}`);
    lines.push(`L2 (${s.l2Files.length} files): ${s.l2Files.join(', ') || '(none)'}`);
    lines.push('');
  }
  lines.push('Confirm the scan and return your response as described.');
  return lines.join('\n');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSafeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function createUpdateStatus(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
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
    status,
    traceMsg,
  };
}

// ─── System prompt ─────────────────────────────────────────────────────────────

const systemPrompt = `
<!-- modelType: codepro -->

You initialize the collab.codes "materializePipeline" task.

You receive a scan of all .defs.ts files found in a project and confirm the scan is valid before pipeline generation begins.

If the scan is invalid or the project has no usable modules, return only:
{
  "type": "result",
  "result": "A short error message explaining what is wrong"
}

If the scan is valid, return only:
{
  "type": "flexible",
  "result": {
    "status": "ok",
    "notes": ["optional observations about the scan, e.g. empty modules or anomalies"]
  }
}

Rules:
- Return valid JSON only — no markdown, no prose outside the JSON.
- status must be "ok" if at least one module has .defs.ts files to process.
- status must be "failed" only if all modules are completely empty or something is critically wrong.
- notes is an array of short strings; use it for warnings or observations, not errors.
- Do not invent module names, file names, or paths. Evaluate only what was provided.

## Output format
Return only valid JSON in the following structure:
[[OutputSection]]
`;
