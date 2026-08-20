/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/steps/c3-report/agentChReport.ts" enhancement="_102027_/l2/enhancementAgent"/>

// c3-report (NO LLM): reads what the run recorded, writes run.json and renders the summary.
//
// Deterministic on purpose, and the aggregation lives in the pure report.ts beside it. Two reasons, both
// in flow.json: a model writing this summary would be a fourth call polluting the token measurement the
// run exists to take, and a summary is exactly where an unmeasured metric gets invented.
//
// It runs even when nothing was chosen. Battery case #10 — a page asking for an upload and a chart —
// has no group and therefore no c2 step, and its report (two regions, no group, the reasons) IS the
// result being measured.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readJsonArtifact, toDisplayPath, writeJsonArtifact } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { nmParseStepArgs, nmResultStepIntent, nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import {
  CH_AGENT_FOLDER,
  CH_CHARS_PER_TOKEN,
  CH_MAX_ATTEMPTS,
  CH_PLAN_C1,
  CH_PLAN_C3,
  ChGroupArtifact,
  ChCatalogVia,
  ChGroupsArtifact,
  ChPromptSize,
  chDoneAnchor,
  chGroupPlanId,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';
import {
  chGroupArtifactFileInfo,
  chGroupsFileInfo,
  chInputFileInfo,
  chPromptSizeFileInfo,
  chRunFileInfo,
  chTraceFileInfo,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chCatalog.js';
import { getChRunKey } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chRootPlan.js';
import { ChRunFacts, ChTagIssues, buildChRunReport, renderChRunSummary } from '/_102020_/l2/aura/molecules/agentChooseMolecules/steps/c3-report/report.js';

const AGENT_NAME = 'agentChReport';
const PLAN_ID = CH_PLAN_C3;

interface ChInputArtifact {
  runKey: string;
  definition: string;
  userLanguage: string;
  level1Reference: string;
  level1Via?: ChCatalogVia;
  publishedGroups: Array<{ name: string }>;
}

interface ChTraceArtifact {
  ok?: boolean;
  tagIssues?: Partial<ChTagIssues>;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${CH_AGENT_FOLDER}/steps/c3-report`,
    agentDescription: 'c3-report — consolidates the run into run.json and renders the readable summary',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const runKey = getChRunKey(context, nmParseStepArgs(step.prompt).runKey);

  const input = await readJsonArtifact<ChInputArtifact>(chInputFileInfo(runKey), true);
  const groupsArtifact = await readJsonArtifact<ChGroupsArtifact>(chGroupsFileInfo(runKey), true);
  if (!input || !groupsArtifact) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] run ${runKey} has no input.json / c1-groups.json to report on`)];
  }

  const groups: ChGroupArtifact[] = [];
  for (const group of groupsArtifact.groups) {
    const artifact = await readJsonArtifact<ChGroupArtifact>(chGroupArtifactFileInfo(runKey, group), false);
    // A group whose step died before writing is recorded as unanswered rather than dropped: silent
    // truncation would read as "this group was never chosen", which is the opposite of what happened.
    groups.push(artifact || {
      schemaVersion: 1,
      savedAt: '',
      runKey,
      group,
      indexDefsReference: '',
      catalogVia: 'published',
      choices: [],
      ok: false,
      gateHits: 0,
      chosenWithoutDefs: [],
      errors: ['o passo deste grupo não deixou artefato'],
    });
  }

  const planIds = [CH_PLAN_C1, ...groupsArtifact.groups.map(group => chGroupPlanId(group))];
  const sizes = await readSizes(runKey, planIds);
  const { tagIssues, attemptsRefused } = await readTraceTotals(runKey, planIds);

  const facts: ChRunFacts = {
    savedAt: new Date().toISOString(),
    runKey,
    definition: input.definition,
    userLanguage: input.userLanguage,
    level1Reference: input.level1Reference || groupsArtifact.level1Reference,
    level1Via: input.level1Via || 'published',
    publishedGroups: (input.publishedGroups || []).map(group => group.name),
    regions: groupsArtifact.regions,
    groups,
    sizes,
    tagIssues,
    attemptsRefused,
  };

  const report = buildChRunReport(facts, CH_CHARS_PER_TOKEN);
  await writeJsonArtifact(chRunFileInfo(runKey), report);
  const summary = renderChRunSummary(report);

  return [
    nmResultStepIntent(context, parentStep, {
      planId: chDoneAnchor(PLAN_ID),
      dependsOn: [],
      stepTitle: `run ${runKey}: ${report.totals.regions} região(ões), ${report.totals.groupsChosen} grupo(s)`,
      result: {
        runKey,
        runFile: toDisplayPath(chRunFileInfo(runKey)),
        regions: report.totals.regions,
        regionsWithoutGroup: report.totals.regionsWithoutGroup,
        regionsWithoutMolecule: report.totals.regionsWithoutMolecule,
        attemptsRefused: report.gates.attemptsRefused,
        tagIssues: report.gates.tagIssues,
        totalTokensEst: report.sizes.totalTokensEstTotal,
      },
    }),
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', summary, 'input_output'),
  ];
}

// ---- helpers ----

/**
 * Every attempt's size artifact. Enumerated from the plan ids and the attempt budget rather than by
 * listing the folder: the set of files a run can have written is known, and reading a name that was
 * never written costs one miss.
 */
async function readSizes(runKey: string, planIds: string[]): Promise<ChPromptSize[]> {
  const out: ChPromptSize[] = [];
  for (const planId of planIds) {
    for (let attempt = 1; attempt <= CH_MAX_ATTEMPTS; attempt += 1) {
      const size = await readJsonArtifact<ChPromptSize>(chPromptSizeFileInfo(runKey, planId, attempt), false);
      if (size) out.push(size);
    }
  }
  return out;
}

/** The gate history of the run: how many attempts were refused, and how the tags were wrong. */
async function readTraceTotals(runKey: string, planIds: string[]): Promise<{ tagIssues: ChTagIssues; attemptsRefused: number }> {
  const tagIssues: ChTagIssues = { invented: 0, short: 0, case: 0 };
  let attemptsRefused = 0;
  for (const planId of planIds) {
    for (let attempt = 1; attempt <= CH_MAX_ATTEMPTS; attempt += 1) {
      const trace = await readJsonArtifact<ChTraceArtifact>(chTraceFileInfo(runKey, planId, attempt), false);
      if (!trace) continue;
      if (trace.ok === false) attemptsRefused += 1;
      tagIssues.invented += trace.tagIssues?.invented || 0;
      tagIssues.short += trace.tagIssues?.short || 0;
      tagIssues.case += trace.tagIssues?.case || 0;
    }
  }
  return { tagIssues, attemptsRefused };
}
