/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/steps/c2-molecules/agentChMolecules.ts" enhancement="_102027_/l2/enhancementAgent"/>

// c2-molecules — one LLM call per GROUP: the regions c1 assigned to it in, the molecule for each out.
//
// One step per group, planted by the root once c1 has answered. The alternative — one call carrying
// every chosen group — would be cheaper in steps and would stop measuring the design: the funnel exists
// because the whole catalog does not fit a prompt, and a call with three levels in it proves nothing
// about one level per call (flow.json.principles).
//
// ⚠️ THIS STEP NEVER FAILS THE RUN. When the gate refuses twice, it records `ok: false` and completes,
// planting its anchor anyway — otherwise c3 would never run and the run would leave no report. "The
// model insisted on a tag that does not exist" is a RESULT of this probe, not a crash (flow.json).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
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
  ChGroupArtifact,
  ChGroupsArtifact,
  ChRegion,
  chCanonicalGroup,
  chGroupArg,
  chGroupDoneAnchor,
  chGroupFolder,
  chGroupPlanId,
  chMeasurePrompt,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';
import {
  ChGroupCatalog,
  chGroupArtifactFileInfo,
  chGroupsFileInfo,
  chPromptSizeFileInfo,
  chTraceFileInfo,
  readChAgentText,
  readChGroupCatalog,
  readChLevel1,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chCatalog.js';
import { getChRootPlan, getChRunKey } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chRootPlan.js';
import {
  ChMoleculesOutput,
  buildChChoices,
  chTagIssueCodes,
  normalizeChMoleculesOutput,
  runChMoleculesGate,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/steps/c2-molecules/gate.js';

const AGENT_NAME = 'agentChMolecules';
const TOOL_NAME = 'submitMoleculeChoice';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${CH_AGENT_FOLDER}/steps/c2-molecules`,
    agentDescription: 'c2-molecules — chooses the molecule of one group for each region assigned to it',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

interface ChStepContext {
  runKey: string;
  group: string;
  catalog: ChGroupCatalog;
  regions: ChRegion[];
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
  const parsedArgs = nmParseStepArgs(rawArgs);
  const attempt = parsedArgs.retryAttempt || 1;
  const runKey = getChRunKey(context, parsedArgs.runKey);

  const resolved = await resolveStepContext(runKey, chGroupArg(rawArgs));
  if (typeof resolved === 'string') {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', resolved)];
  }

  const plan = getChRootPlan(context);
  const promptMd = await readChAgentText('steps/c2-molecules', 'prompt', '.md', true);
  const schemaRaw = await readChAgentText('schemas', 'c2-molecules.schema', '.json', true);
  const schema = parseMaybeJson(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid c2-molecules schema`);

  // The example is taken FROM THIS GROUP's own list, never written into the prompt by hand: an example
  // tag that does not exist would be teaching the very mistake the gate refuses.
  const exampleTag = resolved.catalog.molecules[0].tag;
  const shortExample = exampleTag.split('--').pop() || exampleTag;

  const systemPrompt = promptMd
    .split('{{catalog}}').join(resolved.catalog.skill)
    .split('{{groupFolder}}').join(chGroupFolder(resolved.group))
    .split('{{tagExample}}').join(exampleTag)
    .split('{{shortExample}}').join(shortExample)
    .split('{{group}}').join(resolved.group)
    .split('{{userLanguage}}').join(plan.userLanguage || 'the language of the request')
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the regions cannot be answered from the list you were given')}`;

  const humanPrompt = [
    `## The regions of ${resolved.group}`,
    resolved.regions.map(region => `- **${region.region}** — ${region.need}`).join('\n'),
    parsedArgs.retryContext ? `\n## What the gate rejected — fix ALL of these\n${parsedArgs.retryContext}` : '',
  ].filter(Boolean).join('\n');

  await writeJsonArtifact(
    chPromptSizeFileInfo(runKey, chGroupPlanId(resolved.group), attempt),
    chMeasurePrompt({ planId: chGroupPlanId(resolved.group), attempt, systemPrompt, catalog: resolved.catalog.skill, humanPrompt }),
  );

  return [{
    type: 'prompt_ready',
    args: rawArgs || JSON.stringify({ planId: chGroupPlanId(resolved.group), runKey, group: resolved.group }),
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
  const parsedArgs = nmParseStepArgs(step.prompt);
  const attempt = parsedArgs.retryAttempt || 1;
  const runKey = getChRunKey(context, parsedArgs.runKey);

  const resolved = await resolveStepContext(runKey, chGroupArg(step.prompt));
  if (typeof resolved === 'string') {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', resolved)];
  }
  const { group, catalog, regions } = resolved;
  const planId = chGroupPlanId(group);

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

  // The per-attempt trace carries the tag-issue breakdown, which is what run.json counts: an invented
  // tag and a dropped prefix are different findings and the acceptance criterion is about the first.
  await writeJsonArtifact(chTraceFileInfo(runKey, planId, attempt), {
    savedAt: new Date().toISOString(),
    planId,
    group,
    attempt,
    ok: gate.ok,
    tagIssues: chTagIssueCodes(gate.errors),
    ...(gate.ok ? {} : { errors: gate.errors, output }),
  });

  if (!gate.ok && attempt < CH_MAX_ATTEMPTS) {
    return [
      nmAgentStepIntent(context, parentStep, {
        agentName: AGENT_NAME,
        stepTitle: `${step.stepTitle || planId} (retry)`,
        planId: `${planId}-retry${attempt}`,
        prompt: { planId, runKey, group, retryAttempt: attempt + 1, retryContext: errorText },
      }),
      nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `gate failed, retrying:\n${errorText}`, 'input_output'),
    ];
  }

  const choices = gate.ok && output ? buildChChoices(output, { group, regions: regionNames }) : [];
  const withoutDefs = new Set(catalog.molecules.filter(molecule => !molecule.defs).map(molecule => molecule.tag));
  const artifact: ChGroupArtifact = {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    runKey,
    group,
    indexDefsReference: catalog.reference,
    choices,
    ok: gate.ok,
    gateHits: attempt - 1,
    chosenWithoutDefs: choices.filter(choice => choice.tag && withoutDefs.has(choice.tag)).map(choice => choice.tag as string),
    errors: gate.ok ? [] : gate.errors,
  };
  await writeJsonArtifact(chGroupArtifactFileInfo(runKey, group), artifact);

  const summary = gate.ok
    ? `${group}: ${choices.map(choice => `${choice.region} → ${choice.tag ? shortTag(choice.tag) : 'none'}`).join(', ')}${attempt > 1 ? ` (attempt ${attempt})` : ''}`
    : `${group}: no accepted answer after ${attempt} attempt(s) — recorded as ok:false`;

  // The anchor is planted on failure too, so c3 always reports. See the header.
  return [
    nmResultStepIntent(context, parentStep, {
      planId: chGroupDoneAnchor(group),
      dependsOn: [],
      stepTitle: summary,
      result: {
        runKey,
        group,
        ok: gate.ok,
        attempt,
        choices: choices.map(choice => ({ region: choice.region, tag: choice.tag })),
        artifactFile: toDisplayPath(chGroupArtifactFileInfo(runKey, group)),
        ...(gate.ok ? {} : { errors: gate.errors }),
      },
    }),
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', gate.ok ? summary : `${summary}\n${errorText}`, 'input_output'),
  ];
}

// ---- helpers ----

/** The step's group, its level 2 and its regions — or one readable line saying what is missing. */
async function resolveStepContext(runKey: string, groupArg: string): Promise<ChStepContext | string> {
  if (!groupArg) return `[${AGENT_NAME}] this step was planted without a group — the root plants one c2 per group and names it in the step args`;

  const { level1, error } = await readChLevel1();
  if (!level1) return error;

  const group = chCanonicalGroup(groupArg, level1.groups.map(item => item.name));
  if (!group) return `[${AGENT_NAME}] the project no longer publishes the group '${groupArg}'`;
  const entry = level1.groups.find(item => item.name === group);

  const { catalog, error: catalogError } = await readChGroupCatalog(entry?.indexDefs || '');
  if (!catalog) return catalogError;

  const groups = await readJsonArtifact<ChGroupsArtifact>(chGroupsFileInfo(runKey), true);
  const regions = (groups?.regions || []).filter(region => region.group === group);
  if (!regions.length) return `[${AGENT_NAME}] c1 assigned no region to ${group} in run ${runKey}`;

  return { runKey, group, catalog, regions };
}

/** For the step title only — the tree is read by a human, and the prefix is the same on every line. */
function shortTag(tag: string): string {
  return tag.split('--').pop() || tag;
}
