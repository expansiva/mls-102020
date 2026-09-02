/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/steps/c1-groups/agentCm2Groups.ts" enhancement="_102027_/l2/enhancementAgent"/>

// c1-groups — the first LLM call: the deterministic regions of the target page in, the group of each
// out. Unlike agentChooseMolecules's c1, the regions are never invented from prose — they were already
// extracted by code (helpers/cm2Regions) from the page's own dataBindings/inputs, so this call only
// answers "which group", never "what is a region here".
//
// It sees LEVEL 1 and nothing else (the group list), same one-level-per-prompt discipline as the probe.
//
// No l4 artifact anywhere: the answer travels only in this step's own `result`, read back by the root's
// fan-out (helpers/cm2Types.cm2ReadC1Result) — see agentChooseMolecules2.ts.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { isRecord, readStorText } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { buildVToolInstruction, createVToolSchema, extractVToolOutput, nmResultStepIntent, nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import { chFileRefFromImport } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';
import { ChLevel1, readChLevel1 } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chCatalog.js';
import { ChGroupsOutput, buildChRegions, chDistinctGroups, normalizeChGroupsOutput, runChGroupsGate } from '/_102020_/l2/aura/molecules/agentChooseMolecules/steps/c1-groups/gate.js';
import { cm2ContractFileFromTarget } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Entry.js';
import { parseContractTypesFromCompiledTs, parseContractTypesFromDefsSource, parsePageDefsSource } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2DefsPatch.js';
import { Cm2Region, extractRegions } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Regions.js';
import { CM2_AGENT_FOLDER, CM2_MAX_ATTEMPTS, CM2_PLAN_C1, Cm2GroupsResult, cm2DoneAnchor, cm2ParseStepArgs, readCm2AgentText } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Types.js';

const AGENT_NAME = 'agentCm2Groups';
const TOOL_NAME = 'submitGroupChoice';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${CM2_AGENT_FOLDER}/steps/c1-groups`,
    agentDescription: 'c1-groups — chooses which published group serves each deterministic region of the target page',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

interface LoadedContext {
  level1: ChLevel1;
  regions: Cm2Region[];
}

async function loadContext(catalogProject: number, target: string): Promise<LoadedContext | string> {
  const targetFile = chFileRefFromImport(target);
  if (!targetFile) return `[${AGENT_NAME}] '${target}' is not a recognizable project reference`;

  const { level1, error: catalogError } = await readChLevel1(catalogProject);
  if (!level1) return `[${AGENT_NAME}] ${catalogError}`;

  const pageSource = await readStorText(targetFile, false);
  if (!pageSource) return `[${AGENT_NAME}] target file not found: ${target}`;
  const parsedPage = parsePageDefsSource(pageSource);
  if (!parsedPage) return `[${AGENT_NAME}] '${target}' does not match the expected { definition, pipeline } shape`;

  const contractTypes = await loadContractTypes(targetFile);
  const regions = extractRegions(parsedPage.definitionJson, contractTypes);
  return { level1, regions };
}

/** Best-effort: the .defs.ts is the source of truth when present; the compiled .ts is the fallback
 * when it is not (confirmed necessary — a real client checkout may only have the materialized .ts). A
 * command whose type this cannot resolve is not a failure: extractRegions falls back to 'unknown'. */
async function loadContractTypes(targetFile: ReturnType<typeof chFileRefFromImport>) {
  if (!targetFile) return {};
  const contractDefsFile = cm2ContractFileFromTarget(targetFile);
  if (contractDefsFile) {
    const defsSource = await readStorText(contractDefsFile, false);
    const parsed = defsSource ? parseContractTypesFromDefsSource(defsSource) : null;
    if (parsed) return parsed;
    const tsSource = await readStorText({ ...contractDefsFile, extension: '.ts' }, false);
    if (tsSource) return parseContractTypesFromCompiledTs(tsSource);
  }
  return {};
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const rawArgs = args ?? step.prompt;
  const parsed = cm2ParseStepArgs(rawArgs);
  const catalogProject = parsed.catalogProject;
  const target = parsed.target;
  if (!catalogProject || !target) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] missing catalogProject/target in step args`)];
  }

  const loaded = await loadContext(catalogProject, target);
  if (typeof loaded === 'string') {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', loaded)];
  }
  const { level1, regions } = loaded;

  // Nothing to decide: the honest, cheap path — complete now with an empty answer, no LLM call.
  if (!regions.length) {
    return [
      nmResultStepIntent(context, parentStep, {
        planId: cm2DoneAnchor(CM2_PLAN_C1),
        dependsOn: [],
        stepTitle: 'no region found in the target — nothing to choose',
        result: { catalogProject, target, regions: [], groups: [] } satisfies Cm2GroupsResult,
      }),
      nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'no region found in the target', 'input_output'),
    ];
  }

  const promptMd = await readCm2AgentText('steps/c1-groups', 'prompt', '.md', true);
  const schemaRaw = await readCm2AgentText('schemas', 'c1-groups.schema', '.json', true);
  const schema = JSON.parse(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid c1-groups schema`);

  const groupNames = level1.groups.map(group => group.name);
  const systemPrompt = promptMd
    .split('{{catalog}}').join(level1.skill)
    .split('{{groupNames}}').join(groupNames.join(', '))
    .split('{{regions}}').join(regions.map(region => `- id: ${region.id}\n  need: ${region.need}`).join('\n'))
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the regions cannot be answered from the group list you were given')}`;

  const humanPrompt = [
    '## Decide the group of each region listed in the system prompt.',
    parsed.retryContext ? `\n## What the gate rejected — fix ALL of these\n${parsed.retryContext}` : '',
  ].filter(Boolean).join('\n');

  return [{
    type: 'prompt_ready',
    args: rawArgs || JSON.stringify({ planId: CM2_PLAN_C1, catalogProject, target }),
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt,
    humanPrompt,
    tools: [createVToolSchema(TOOL_NAME, 'Submit one entry per region, with the group that serves it', schema as Record<string, unknown>)],
    toolChoice: { type: 'function', function: { name: TOOL_NAME } },
  } as mls.msg.AgentIntentPromptReady];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const parsed = cm2ParseStepArgs(step.prompt);
  const attempt = parsed.retryAttempt || 1;
  const catalogProject = parsed.catalogProject;
  const target = parsed.target;
  if (!catalogProject || !target) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] missing catalogProject/target in step args`)];
  }

  const loaded = await loadContext(catalogProject, target);
  if (typeof loaded === 'string') {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', loaded)];
  }
  const { level1, regions } = loaded;
  const groupNames = level1.groups.map(group => group.name);

  let output: ChGroupsOutput | null = null;
  let extractError = '';
  try {
    const raw = extractVToolOutput(step.interaction?.payload?.[0], TOOL_NAME, ['regions']);
    if (raw.status === 'failed') extractError = `model reported failure: ${raw.trace.join('; ') || 'no reason'}`;
    else output = normalizeChGroupsOutput(raw.result);
  } catch (thrown) {
    extractError = thrown instanceof Error ? thrown.message : String(thrown);
  }

  const gate = output
    ? runChGroupsGate({ output, knownGroups: groupNames })
    : { ok: false, errors: [`extract: ${extractError}`] };
  const errorText = gate.errors.join('\n');

  if (gate.ok && output) {
    const answeredRegions = buildChRegions(output, groupNames);
    const groups = chDistinctGroups(answeredRegions);
    const groupless = answeredRegions.filter(region => !region.group).length;
    const summary = groups.length
      ? `${answeredRegions.length} region(s) → ${groups.join(', ')}${groupless ? ` · ${groupless} without a group` : ''}`
      : `${answeredRegions.length} region(s) — no published group covers any of them`;

    return [
      nmResultStepIntent(context, parentStep, {
        planId: cm2DoneAnchor(CM2_PLAN_C1),
        dependsOn: [],
        stepTitle: summary,
        result: { catalogProject, target, regions: answeredRegions, groups } satisfies Cm2GroupsResult,
      }),
      nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', summary, 'input_output'),
    ];
  }

  if (attempt >= CM2_MAX_ATTEMPTS) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `${CM2_PLAN_C1} failed after ${attempt} attempts:\n${errorText}`)];
  }

  return [
    {
      type: 'add-step',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task.PK,
      parentStepId: parentStep.stepId,
      step: {
        type: 'agent',
        stepId: 0,
        interaction: null,
        stepTitle: `${step.stepTitle || CM2_PLAN_C1} (retry)`,
        status: 'waiting_human_input',
        nextSteps: [],
        agentName: AGENT_NAME,
        prompt: JSON.stringify({ planId: CM2_PLAN_C1, catalogProject, target, retryAttempt: attempt + 1, retryContext: errorText }),
        rags: [],
        planning: { planId: `${CM2_PLAN_C1}-retry${attempt}`, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
      } as mls.msg.AIAgentStep,
    } as mls.msg.AgentIntentAddStep,
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `gate failed, retrying:\n${errorText}`, 'input_output'),
  ];
}
