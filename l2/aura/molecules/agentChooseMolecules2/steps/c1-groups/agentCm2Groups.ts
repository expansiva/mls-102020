/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/steps/c1-groups/agentCm2Groups.ts" enhancement="_102027_/l2/enhancementAgent"/>

// c1-groups — the first LLM call: the target page's own definition in, the regions and the group of
// each out.
//
// ⚠️ v2 (2026-09-08): THE REGIONS ARE NAMED HERE, not extracted by code. v1 walked the target's
// `definition.dataBindings[]` with helpers/cm2Regions.extractRegions and only asked this call "which
// group"; the page defs carries PROSE now (flow.json.decisions.definitionFormat), so this step reads
// that prose and does both halves — exactly what agentChooseMolecules (the probe) does, whose measured
// region-granularity rules steps/c1-groups/prompt.md now carries verbatim. The prose is thin on
// purpose, and the prompt's anti-invention half is what keeps four labelled lines from turning into a
// guessed field list.
//
// It sees LEVEL 1 and nothing else of the catalog (the group list), same one-level-per-prompt
// discipline as the probe.
//
// The definition text goes in the HUMAN prompt (like the probe's), so there is no {{pageContext}}
// section for this step: here the prose IS the page context. c2, which never sees the definition, gets
// it as a section instead (helpers/cm2PageContext).
//
// No l4 artifact anywhere: the answer travels only in this step's own `result`, read back by the root's
// fan-out (helpers/cm2Types.cm2ReadC1Result) — see agentChooseMolecules2.ts.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { isRecord, readStorText } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { buildVToolInstruction, createVToolSchema, extractVToolOutput, nmResultStepIntent, nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import { chFileRefFromImport } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';
import { ChLevel1, readChLevel1 } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chCatalog.js';
import { ChGroupsOutput, buildChRegions, chDistinctGroups, normalizeChGroupsOutput, runChGroupsGate } from '/_102020_/l2/aura/molecules/agentChooseMolecules/steps/c1-groups/gate.js';
import { cm2DefinitionKind, parsePageDefsSource } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2DefsPatch.js';
import { readCm2ProjectLanguages } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2ProjectContext.js';
import { CM2_AGENT_FOLDER, CM2_MAX_ATTEMPTS, CM2_PLAN_C1, Cm2GroupsResult, cm2DoneAnchor, cm2ParseStepArgs, readCm2AgentText } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Types.js';

const AGENT_NAME = 'agentCm2Groups';
const TOOL_NAME = 'submitGroupChoice';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${CM2_AGENT_FOLDER}/steps/c1-groups`,
    agentDescription: 'c1-groups — names the regions of the target page from its definition and chooses which published group serves each',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

interface LoadedContext {
  level1: ChLevel1;
  /** The target's definition prose — the description this call reasons over. */
  definitionText: string;
  /** The target project's declared language, for the region names and reasons. Never inferred. */
  userLanguage: string;
}

async function loadContext(catalogProject: number, target: string): Promise<LoadedContext | string> {
  const targetFile = chFileRefFromImport(target);
  if (!targetFile) return `[${AGENT_NAME}] '${target}' is not a recognizable project reference`;

  const { level1, error: catalogError } = await readChLevel1(catalogProject);
  if (!level1) return `[${AGENT_NAME}] ${catalogError}`;

  const pageSource = await readStorText(targetFile, false);
  if (!pageSource) return `[${AGENT_NAME}] target file not found: ${target}`;
  const parsedPage = parsePageDefsSource(pageSource);
  if (!parsedPage) {
    // The v1 JSON-object definition is a different problem from an unrecognizable file, and whoever
    // pointed this agent at it needs to be told which one it is.
    const kind = cm2DefinitionKind(pageSource);
    return kind === 'object'
      ? `[${AGENT_NAME}] '${target}' still carries the v1 OBJECT definition. This agent reads the prose definition ('export const definition = \`page: ...\`') and equips the pipeline; annotating dataBindings was retired with that format (flow.json.decisions.definitionFormat)`
      : `[${AGENT_NAME}] '${target}' does not match the expected { definition (prose), pipeline } shape`;
  }
  if (!parsedPage.definitionText.trim()) {
    return `[${AGENT_NAME}] '${target}' declares an empty definition — there is nothing to choose molecules for`;
  }

  // A DECLARED fact, like every other input of this agent: the project's own l5/project.json. With
  // none declared, the prompt says 'the language of the definition' rather than assuming one.
  const languages = await readCm2ProjectLanguages(targetFile.project);
  return { level1, definitionText: parsedPage.definitionText, userLanguage: languages[0] || 'the language of the definition' };
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
  const { level1, definitionText, userLanguage } = loaded;

  const promptMd = await readCm2AgentText('steps/c1-groups', 'prompt', '.md', true);
  const schemaRaw = await readCm2AgentText('schemas', 'c1-groups.schema', '.json', true);
  const schema = JSON.parse(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid c1-groups schema`);

  const groupNames = level1.groups.map(group => group.name);
  const systemPrompt = promptMd
    .split('{{catalog}}').join(level1.skill)
    .split('{{groupNames}}').join(groupNames.join(', '))
    .split('{{userLanguage}}').join(userLanguage)
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the text is not a definition of a page at all')}`;

  const humanPrompt = [
    '## The definition',
    definitionText,
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
    tools: [createVToolSchema(TOOL_NAME, 'Submit one entry per region of the page, with the group that serves it', schema as Record<string, unknown>)],
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
  const groupNames = loaded.level1.groups.map(group => group.name);

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
