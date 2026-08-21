/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/steps/c1-groups/agentChGroups.ts" enhancement="_102027_/l2/enhancementAgent"/>

// c1-groups — the first LLM call: the definition of the page in, the regions and their groups out.
//
// It also DISCOVERS the catalog: the active project plus its direct dependencies, one of which answers the
// run (helpers/chEntry). Which one, and how it was chosen, is recorded in input.json — from 2026-08-20 the
// probe is meant to run from the client project, where the catalog is a dependency.
//
// It sees LEVEL 1 and nothing else: the ~1.5 KB list of groups that catalog publishes. Not the
// molecules of any group, which is the next call's input, and not the usage contracts, which nothing in
// this probe reads. One level per prompt is the design being measured (flow.json.principles).
//
// The size of the assembled prompt is written to l4 BEFORE the call, split into instructions / catalog /
// input. That measurement is the §11.4 "tokens per step" criterion: there is no token telemetry on this
// platform, so what can be measured is what is sent (helpers/chTypes.chMeasurePrompt).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { appendLongTermMemory } from '/_102027_/l2/aiAgentHelper.js';
import { isRecord, parseMaybeJson, readJsonArtifact, toDisplayPath, writeJsonArtifact } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import {
  buildVToolInstruction,
  createVToolSchema,
  extractVToolOutput,
  nmAgentStepIntent,
  nmParseStepArgs,
  nmResultStepIntent,
  nmUpdateStatusIntent,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import {
  CH_AGENT_FOLDER,
  CH_MAX_ATTEMPTS,
  CH_PLAN_C1,
  ChGroupsArtifact,
  chDoneAnchor,
  chMeasurePrompt,
  chParseUsage,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';
import {
  chGroupsFileInfo,
  chInputFileInfo,
  chPromptSizeFileInfo,
  chTraceFileInfo,
  discoverChCatalog,
  readChAgentText,
  readChLevel1,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chCatalog.js';
import { getChCatalogArg, getChDefinition, getChRootPlan, getChRunKey } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chRootPlan.js';
import {
  ChGroupsOutput,
  buildChRegions,
  chDistinctGroups,
  normalizeChGroupsOutput,
  runChGroupsGate,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/steps/c1-groups/gate.js';

const AGENT_NAME = 'agentChGroups';
const PLAN_ID = CH_PLAN_C1;
const TOOL_NAME = 'submitGroupChoice';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${CH_AGENT_FOLDER}/steps/c1-groups`,
    agentDescription: 'c1-groups — chooses which published group serves each region of the page definition',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
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
  const parsedArgs = nmParseStepArgs(args ?? step.prompt);
  const attempt = parsedArgs.retryAttempt || 1;
  const runKey = getChRunKey(context, parsedArgs.runKey);
  const plan = getChRootPlan(context);
  const definition = getChDefinition(context);

  const discovery = await discoverChCatalog(getChCatalogArg(context));
  if (!discovery.project) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', discovery.error)];
  }
  const { level1, error } = await readChLevel1(discovery.project);
  if (!level1) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', error)];
  }

  const promptMd = await readChAgentText('steps/c1-groups', 'prompt', '.md', true);
  const schemaRaw = await readChAgentText('schemas', 'c1-groups.schema', '.json', true);
  const schema = parseMaybeJson(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid c1-groups schema`);

  const groupNames = level1.groups.map(group => group.name);
  const systemPrompt = promptMd
    .split('{{catalog}}').join(level1.skill)
    .split('{{groupNames}}').join(groupNames.join(', '))
    .split('{{userLanguage}}').join(plan.userLanguage || 'the language of the request')
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the text is not a definition of a page or system at all')}`;

  const humanPrompt = [
    '## The definition',
    definition,
    parsedArgs.retryContext ? `\n## What the gate rejected — fix ALL of these\n${parsedArgs.retryContext}` : '',
  ].filter(Boolean).join('\n');

  // Written once, on the first attempt: the entry as it arrived, for whoever scores the battery.
  if (attempt === 1) {
    await writeJsonArtifact(chInputFileInfo(runKey), {
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      runKey,
      definition,
      userLanguage: plan.userLanguage,
      catalogProject: discovery.project,
      catalogSelectedBy: discovery.selectedBy,
      catalogWarnings: discovery.warnings,
      // The search itself is recorded, not just its answer: the two dependency lists tell us whether the
      // platform's resolver is transitive, which nothing here could check offline.
      discovery: {
        activeProject: discovery.activeProject,
        directDeps: discovery.directDeps,
        resolvedDeps: discovery.resolvedDeps,
        candidates: discovery.candidates,
      },
      level1Reference: level1.reference,
      level1Via: level1.via,
      publishedGroups: level1.groups.map(group => ({ name: group.name, molecules: group.molecules })),
    });
    await appendLongTermMemory(context, { runKey });
  }

  await writeJsonArtifact(
    chPromptSizeFileInfo(runKey, PLAN_ID, attempt),
    chMeasurePrompt({ planId: PLAN_ID, attempt, systemPrompt, catalog: level1.skill, humanPrompt }),
  );

  return [{
    type: 'prompt_ready',
    args: args || step.prompt || JSON.stringify({ planId: PLAN_ID, runKey }),
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
  const parsedArgs = nmParseStepArgs(step.prompt);
  const attempt = parsedArgs.retryAttempt || 1;
  const runKey = getChRunKey(context, parsedArgs.runKey);

  // The catalog project comes from input.json, written by the attempt before this one: re-discovering here
  // could land on a different catalog than the one the model just answered from.
  const input = await readJsonArtifact<{ catalogProject?: number }>(chInputFileInfo(runKey), false);
  const catalogProject = input?.catalogProject;
  if (!catalogProject) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] input.json has no catalogProject for ${runKey}`)];
  }
  const { level1, error: catalogError } = await readChLevel1(catalogProject);
  if (!level1) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', catalogError)];
  }
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

  await writeJsonArtifact(chTraceFileInfo(runKey, PLAN_ID, attempt), {
    savedAt: new Date().toISOString(),
    planId: PLAN_ID,
    attempt,
    ok: gate.ok,
    // What the CALL cost, read from the runtime's own trace line. null when the line is not there —
    // the report says "not measured" rather than zero.
    usage: chParseUsage(step.interaction?.trace),
    // The trace keeps what the MODEL said; the artifact below keeps what will be used.
    ...(gate.ok ? {} : { errors: gate.errors, output }),
  });

  if (gate.ok && output) {
    const regions = buildChRegions(output, groupNames);
    const groups = chDistinctGroups(regions);
    const artifact: ChGroupsArtifact = {
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      runKey,
      catalogProject,
      level1Reference: level1.reference,
      regions,
      groups,
      groupRefs: groups.map(group => ({
        group,
        indexDefs: level1.groups.find(item => item.name === group)?.indexDefs || '',
      })),
    };
    await writeJsonArtifact(chGroupsFileInfo(runKey), artifact);

    const groupless = regions.filter(region => !region.group).length;
    const summary = groups.length
      ? `${regions.length} region(s) · ${groups.join(', ')}${groupless ? ` · ${groupless} without a group` : ''}`
      : `${regions.length} region(s) · no published group covers any of them`;

    return [
      nmResultStepIntent(context, parentStep, {
        planId: chDoneAnchor(PLAN_ID),
        dependsOn: [],
        stepTitle: summary,
        // The ROOT reads this to plant one c2 per group, so everything it needs is here.
        result: {
          runKey,
          groups,
          regionCount: regions.length,
          grouplessCount: groupless,
          groupsFile: toDisplayPath(chGroupsFileInfo(runKey)),
          attempt,
        },
      }),
      nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', summary, 'input_output'),
    ];
  }

  if (attempt >= CH_MAX_ATTEMPTS) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `${PLAN_ID} failed after ${attempt} attempts:\n${errorText}`)];
  }

  // Bounded retry: the OPEN retry step comes first, then complete-with-trace (never 'failed' with a
  // retry in flight — skills/collab_messages.md).
  return [
    nmAgentStepIntent(context, parentStep, {
      agentName: AGENT_NAME,
      stepTitle: `${step.stepTitle || PLAN_ID} (retry)`,
      planId: `${PLAN_ID}-retry${attempt}`,
      prompt: { planId: PLAN_ID, runKey, retryAttempt: attempt + 1, retryContext: errorText },
    }),
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `gate failed, retrying:\n${errorText}`, 'input_output'),
  ];
}
