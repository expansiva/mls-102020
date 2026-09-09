/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/steps/c1-groups/agentCm2Groups.ts" enhancement="_102027_/l2/enhancementAgent"/>

// c1-groups — the first LLM call: the deterministic regions of the target page in, the group of each
// out. The regions are never invented: helpers/cm2Regions extracted them from the workspace's own
// dataBindings, so this call only answers "which group", never "what is a region here".
//
// ⚠️ v3 (2026-09-08): TWO SOURCES, EACH ANSWERING A DIFFERENT QUESTION.
//   the SHARED defs (web/shared/{page}.defs.ts, READ-ONLY) — WHAT interactions exist: dataBindings,
//     the declared column/field labels, which command is destructive. See helpers/cm2Shared.ts's
//     header for why (v2 read only the page's prose and found 1 region on a page with 15).
//   the TARGET's own prose definition — WHAT THE PAGE IS FOR: uxExperience, purpose, actor
//     (helpers/cm2PageContext), as the {{pageContext}} section.
// The target is still the only file the run ever writes, and it is written by c3-patch alone.
//
// It sees LEVEL 1 and nothing else of the catalog (the group list), same one-level-per-prompt
// discipline as the probe.
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
import { cm2SharedFileFromTarget, parseSharedDefinition, readCm2ContractTypes } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Shared.js';
import { Cm2Region, extractRegions } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Regions.js';
import { extractPageContext, formatPageContext } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2PageContext.js';
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
  /** The target's own declared intent, from its prose definition. '' when it declares none. */
  pageContext: string;
}

async function loadContext(catalogProject: number, target: string): Promise<LoadedContext | string> {
  const targetFile = chFileRefFromImport(target);
  if (!targetFile) return `[${AGENT_NAME}] '${target}' is not a recognizable project reference`;

  const { level1, error: catalogError } = await readChLevel1(catalogProject);
  if (!level1) return `[${AGENT_NAME}] ${catalogError}`;

  // ---- the TARGET: read for its intent, and to prove it is a page this run can equip ----
  const pageSource = await readStorText(targetFile, false);
  if (!pageSource) return `[${AGENT_NAME}] target file not found: ${target}`;
  const parsedPage = parsePageDefsSource(pageSource);
  if (!parsedPage) {
    const kind = cm2DefinitionKind(pageSource);
    return kind === 'object'
      ? `[${AGENT_NAME}] '${target}' still carries the v1 OBJECT definition. This agent reads the prose definition ('export const definition = \`page: ...\`') and equips the pipeline (flow.json.decisions.definitionFormat)`
      : `[${AGENT_NAME}] '${target}' does not match the expected { definition (prose), pipeline } shape`;
  }
  const pageContext = formatPageContext(extractPageContext(parsedPage.definitionText));

  // ---- the SHARED: read for the structure, never written ----
  const sharedFile = cm2SharedFileFromTarget(targetFile);
  if (!sharedFile) {
    return `[${AGENT_NAME}] cannot locate the workspace shared defs from '${target}' — the reference has no 'web' segment to anchor 'web/shared' on, so it is not a page of a workspace`;
  }
  const sharedSource = await readStorText(sharedFile, false);
  if (!sharedSource) {
    return `[${AGENT_NAME}] the workspace shared defs was not found at '_${sharedFile.project}_/l${sharedFile.level}/${sharedFile.folder}/${sharedFile.shortName}${sharedFile.extension}'. It is where this workspace declares its dataBindings, and the page's own prose definition declares no interaction at all — there is nothing to choose from without it`;
  }
  const shared = parseSharedDefinition(sharedSource);
  if (!shared) {
    return `[${AGENT_NAME}] the workspace shared defs at '${sharedFile.folder}/${sharedFile.shortName}' could not be read as a { definition: object } — refusing to guess its structure`;
  }

  const contractTypes = await readCm2ContractTypes(shared);
  return { level1, regions: extractRegions(shared, contractTypes), pageContext };
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
  const { level1, regions, pageContext } = loaded;

  // Nothing to decide: the honest, cheap path — complete now with an empty answer, no LLM call.
  if (!regions.length) {
    return [
      nmResultStepIntent(context, parentStep, {
        planId: cm2DoneAnchor(CM2_PLAN_C1),
        dependsOn: [],
        stepTitle: 'the workspace declares no dataBinding — nothing to choose',
        result: { catalogProject, target, regions: [], groups: [] } satisfies Cm2GroupsResult,
      }),
      nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'the workspace declares no dataBinding — nothing to choose', 'input_output'),
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
    .split('{{pageContext}}').join(pageContext)
    .split('{{regions}}').join(regions.map(region => `- id: ${region.id}\n  need: ${region.need}`).join('\n'))
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the regions cannot be answered from the group list you were given')}`;

  const humanPrompt = [
    `## Decide the group of each of the ${regions.length} regions listed in the system prompt.`,
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

/**
 * The regions are DETERMINISTIC and they are the c1→c2 join key, so the answer is checked against the
 * list that was actually sent: a renamed region cannot be joined to anything and a dropped one loses
 * its molecule in silence — the run would report success with the interaction simply missing.
 *
 * ⚠️ The shared gate cannot do this. runChGroupsGate is imported from the probe, where the regions are
 * INVENTED by the model and there is no list to check against — it only refuses an empty answer, a
 * nameless region, a duplicate and an unpublished group. The c2 gate DOES check its region set
 * (region_unknown / region_unanswered), and this closes the same hole one level up.
 */
function checkRegionSet(answered: string[], expected: string[]): string[] {
  const errors: string[] = [];
  const wanted = new Map(expected.map(id => [id.toLowerCase(), id]));
  const seen = new Set<string>();

  for (const name of answered) {
    const match = wanted.get(name.trim().toLowerCase());
    if (!match) {
      errors.push(`region '${name}' was not one of the regions given to you. The regions are extracted from this workspace's data contract and the list is closed — echo each id back exactly as given, and never add, rename or translate one.`);
      continue;
    }
    seen.add(match);
  }
  for (const id of expected) {
    if (!seen.has(id)) {
      errors.push(`region '${id}' was given to you and got no answer — every region is answered, with a group or with 'none'; omitting one is not a way to say 'none'.`);
    }
  }
  return errors;
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
  const setErrors = output ? checkRegionSet(output.regions.map(region => region.region), regions.map(region => region.id)) : [];
  const ok = gate.ok && !setErrors.length;
  const errorText = [...gate.errors, ...setErrors].join('\n');

  if (ok && output) {
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
