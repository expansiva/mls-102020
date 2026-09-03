/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/steps/s4-report/agentSyReport.ts" enhancement="_102027_/l2/enhancementAgent"/>

// s4-report (NO LLM): reads input.json + every s1/s2 artifact of this run, writes report.json and
// renders the readable summary. The four obligations are in report.ts; this file is only the I/O shell.
//
// Runs even when nothing was written (groupArtifacts empty is still a valid, honest report) — the
// aggregation in report.ts is defensive by construction, not by a special case here.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { nmDestProject, readJsonArtifact, writeJsonArtifact } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { nmParseStepArgs, nmResultStepIntent, nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import { SY_AGENT_PROJECT, SY_PLAN_S4, SyGroupArtifact, SyIndexTsArtifact, SyProjectArtifact, SyRunInput, syDoneAnchor, syGroupFolder } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syTypes.js';
import { buildSyRunReport, renderSyRunSummary } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/steps/s4-report/report.js';
import { syGroupArtifactFileInfo, syIndexTsArtifactFileInfo, syInputFileInfo, syProjectArtifactFileInfo, syReportFileInfo } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syFs.js';

const AGENT_NAME = 'agentSyReport';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: SY_AGENT_PROJECT,
    agentFolder: 'aura/molecules/agentSyncMoleculeCatalog/steps/s4-report',
    agentDescription: 's4-report — consolidates the run into report.json and renders the readable summary. No LLM.',
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
  const args = nmParseStepArgs(step.prompt);
  if (!args.runKey) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] step args missing runKey`)];
  }
  const runKey = args.runKey;

  const input = await readJsonArtifact<SyRunInput>(syInputFileInfo(runKey), true);
  if (!input) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] run ${runKey} has no input.json to report on`)];
  }

  const projectArtifact = await readJsonArtifact<SyProjectArtifact>(syProjectArtifactFileInfo(runKey), false);
  const groupArtifacts: SyGroupArtifact[] = [];
  for (const canonical of input.matchedGroups) {
    const artifact = await readJsonArtifact<SyGroupArtifact>(syGroupArtifactFileInfo(runKey, syGroupFolder(canonical)), false);
    if (artifact) groupArtifacts.push(artifact);
  }
  const indexTsArtifacts: SyIndexTsArtifact[] = [];
  for (const canonical of [...input.indexTsMigrationGroups, ...input.indexTsCreationGroups, ...(input.indexTsRegenerationGroups || []).map(g => g.canonical)]) {
    const artifact = await readJsonArtifact<SyIndexTsArtifact>(syIndexTsArtifactFileInfo(runKey, syGroupFolder(canonical)), false);
    if (artifact) indexTsArtifacts.push(artifact);
  }

  const savedAt = new Date().toISOString();
  const report = buildSyRunReport({ savedAt, runKey, project: nmDestProject(), input, projectArtifact, groupArtifacts, indexTsArtifacts });
  await writeJsonArtifact(syReportFileInfo(runKey), report);
  const summary = renderSyRunSummary(report);

  return [
    nmResultStepIntent(context, parentStep, {
      planId: syDoneAnchor(SY_PLAN_S4),
      dependsOn: [],
      stepTitle: `run ${runKey}: ${report.written.groupCount} grupo(s), ${report.written.moleculeCount} molécula(s)`,
      // `runKey` is NOT repeated here: the report already carries it, and spreading it last silently
      // overwrote the explicit one (TS2783). Same value either way — the report is the payload, and
      // `reportFile` is the only thing this adds to it.
      result: { reportFile: `l4/agentSyncMoleculeCatalog/${runKey}/report.json`, ...report },
    }),
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', summary, 'input_output'),
  ];
}
