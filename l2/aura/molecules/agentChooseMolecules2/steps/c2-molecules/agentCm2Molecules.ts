/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/steps/c2-molecules/agentCm2Molecules.ts" enhancement="_102027_/l2/enhancementAgent"/>

// c2-molecules — one LLM call per GROUP: the regions c1 assigned to it in, the molecule for each out.
// Same anti-invention gate as agentChooseMolecules, imported unchanged (steps/c2-molecules/gate.ts) —
// see that file's header for why the three tag-issue codes exist and why this step never fails the run.
//
// c1's answer is read from the TASK TREE (helpers/cm2Types.cm2ReadC1Result), never a file — see
// agentChooseMolecules2.ts for the run's overall "zero artifact" rule.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { isRecord } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { buildVToolInstruction, createVToolSchema, extractVToolOutput, nmResultStepIntent, nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import { chCanonicalGroup } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';
import { ChGroupCatalog, readChGroupCatalog, readChLevel1 } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chCatalog.js';
import { ChMoleculesOutput, buildChChoices, normalizeChMoleculesOutput, runChMoleculesGate } from '/_102020_/l2/aura/molecules/agentChooseMolecules/steps/c2-molecules/gate.js';
import {
  CM2_AGENT_FOLDER,
  CM2_MAX_ATTEMPTS,
  Cm2GroupResult,
  cm2GroupDoneAnchor,
  cm2GroupFolder,
  cm2GroupPlanId,
  cm2ParseStepArgs,
  cm2ReadC1Result,
  readCm2AgentText,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Types.js';

const AGENT_NAME = 'agentCm2Molecules';
const TOOL_NAME = 'submitMoleculeChoice';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${CM2_AGENT_FOLDER}/steps/c2-molecules`,
    agentDescription: 'c2-molecules — chooses the molecule of one group for each region assigned to it',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

interface ResolvedGroup {
  group: string;
  catalog: ChGroupCatalog;
  regions: Array<{ region: string; need: string }>;
}

async function resolveGroup(context: mls.msg.ExecutionContext, catalogProject: number, groupArg: string): Promise<ResolvedGroup | string> {
  if (!groupArg) return `[${AGENT_NAME}] this step was planted without a group`;

  const c1 = cm2ReadC1Result(context);
  if (!c1) return `[${AGENT_NAME}] c1-groups' result could not be read from the task tree`;

  const group = chCanonicalGroup(groupArg, c1.groups);
  if (!group) return `[${AGENT_NAME}] c1 did not choose the group '${groupArg}' — it chose ${c1.groups.join(', ') || 'none'}`;

  const regions = c1.regions.filter(region => region.group === group).map(region => ({ region: region.region, need: region.need }));
  if (!regions.length) return `[${AGENT_NAME}] c1 assigned no region to ${group}`;

  const { level1, error: level1Error } = await readChLevel1(catalogProject);
  if (!level1) return `[${AGENT_NAME}] ${level1Error}`;
  const reference = level1.groups.find(item => item.name === group)?.indexDefs || '';
  if (!reference) return `[${AGENT_NAME}] level 1 has no index reference for ${group}`;

  const { catalog, error: catalogError } = await readChGroupCatalog(reference);
  if (!catalog) return `[${AGENT_NAME}] ${catalogError}`;

  return { group, catalog, regions };
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
  const group = parsed.group;
  if (!catalogProject || !group) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] missing catalogProject/group in step args`)];
  }

  const resolved = await resolveGroup(context, catalogProject, group);
  if (typeof resolved === 'string') {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', resolved)];
  }

  const promptMd = await readCm2AgentText('steps/c2-molecules', 'prompt', '.md', true);
  const schemaRaw = await readCm2AgentText('schemas', 'c2-molecules.schema', '.json', true);
  const schema = JSON.parse(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid c2-molecules schema`);

  // The example is taken FROM THIS GROUP's own list, never hand-written — an invented example tag
  // would be teaching the very mistake the gate refuses.
  const exampleTag = resolved.catalog.molecules[0].tag;
  const shortExample = exampleTag.split('--').pop() || exampleTag;

  const systemPrompt = promptMd
    .split('{{catalog}}').join(resolved.catalog.skill)
    .split('{{groupFolder}}').join(cm2GroupFolder(resolved.group))
    .split('{{tagExample}}').join(exampleTag)
    .split('{{shortExample}}').join(shortExample)
    .split('{{group}}').join(resolved.group)
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the regions cannot be answered from the list you were given')}`;

  const humanPrompt = [
    `## The regions of ${resolved.group}`,
    resolved.regions.map(region => `- **${region.region}** — ${region.need}`).join('\n'),
    parsed.retryContext ? `\n## What the gate rejected — fix ALL of these\n${parsed.retryContext}` : '',
  ].filter(Boolean).join('\n');

  return [{
    type: 'prompt_ready',
    args: rawArgs || JSON.stringify({ planId: cm2GroupPlanId(resolved.group), catalogProject, group: resolved.group }),
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt,
    humanPrompt,
    tools: [createVToolSchema(TOOL_NAME, `Submit the molecule of ${resolved.group} for each region`, schema as Record<string, unknown>)],
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
  const groupArg = parsed.group;
  if (!catalogProject || !groupArg) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] missing catalogProject/group in step args`)];
  }

  const resolved = await resolveGroup(context, catalogProject, groupArg);
  if (typeof resolved === 'string') {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', resolved)];
  }
  const { group, catalog, regions } = resolved;
  const planId = cm2GroupPlanId(group);

  let output: ChMoleculesOutput | null = null;
  let extractError = '';
  try {
    const raw = extractVToolOutput(step.interaction?.payload?.[0], TOOL_NAME, ['choices']);
    if (raw.status === 'failed') extractError = `model reported failure: ${raw.trace.join('; ') || 'no reason'}`;
    else output = normalizeChMoleculesOutput(raw.result);
  } catch (thrown) {
    extractError = thrown instanceof Error ? thrown.message : String(thrown);
  }

  const regionNames = regions.map(region => region.region);
  const gate = output
    ? runChMoleculesGate({
        output,
        group,
        regions: regionNames,
        tags: catalog.molecules.map(molecule => molecule.tag),
        scenarios: catalog.scenarios.map(scenario => scenario.scenario),
      })
    : { ok: false, errors: [`extract: ${extractError}`] };
  const errorText = gate.errors.join('\n');

  if (!gate.ok && attempt < CM2_MAX_ATTEMPTS) {
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
          stepTitle: `${step.stepTitle || planId} (retry)`,
          status: 'waiting_human_input',
          nextSteps: [],
          agentName: AGENT_NAME,
          prompt: JSON.stringify({ planId, catalogProject, group, retryAttempt: attempt + 1, retryContext: errorText }),
          rags: [],
          planning: { planId: `${planId}-retry${attempt}`, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
        } as mls.msg.AIAgentStep,
      } as mls.msg.AgentIntentAddStep,
      nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `gate failed, retrying:\n${errorText}`, 'input_output'),
    ];
  }

  // Never fails the run: a gate that refuses twice records ok:false and completes anyway, so c3
  // always has an anchor to depend on and patches with what DID pass (agentChooseMolecules precedent).
  const choices = gate.ok && output ? buildChChoices(output, { group, regions: regionNames }) : [];
  const summary = gate.ok
    ? `${group}: ${choices.map(choice => `${choice.region} → ${choice.tag || 'none'}`).join(', ')}${attempt > 1 ? ` (attempt ${attempt})` : ''}`
    : `${group}: no accepted answer after ${attempt} attempt(s)`;

  return [
    nmResultStepIntent(context, parentStep, {
      planId: cm2GroupDoneAnchor(group),
      dependsOn: [],
      stepTitle: summary,
      result: {
        group,
        ok: gate.ok,
        choices: choices.map(choice => ({ region: choice.region, tag: choice.tag })),
        usageContract: catalog.usageContract || '',
      } satisfies Cm2GroupResult,
    }),
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', gate.ok ? summary : `${summary}\n${errorText}`, 'input_output'),
  ];
}
