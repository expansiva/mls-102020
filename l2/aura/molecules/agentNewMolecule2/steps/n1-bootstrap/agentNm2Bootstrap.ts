/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n1-bootstrap/agentNm2Bootstrap.ts" enhancement="_102027_/l2/enhancementAgent"/>

// n1-bootstrap (NO LLM): resolves everything the chosen group implies and writes context.json
// once (decision D1). See flow.json.
//
// It runs BEFORE the requirements call because the THEME decides the molecule's NAME (decision Q2):
// n2-plan proposes a fileReference already carrying the theme suffix, so the human sees the final
// name and tag at the checkpoint, while changing them is still free.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { appendLongTermMemory } from '/_102027_/l2/aiAgentHelper.js';
import { skills as skillList } from '/_102020_/l2/aura/molecules/skills/index';
import {
  NM_AGENT_FOLDER,
  nmBaseFile,
  nmContextFileInfo,
  nmDestProject,
  nmThemeExists,
  nmTraceFileInfo,
  readStorText,
  toDisplayPath,
  writeJsonArtifact,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { NM_BASE_CLASS, NM_BASE_IMPORT } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';
import { MoleculeContext, moleculeContextSummary } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';
import { nmDoneAnchor, nmParseStepArgs, nmResultStepIntent, nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import { loadVTheme } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vTheme.js';
import { NmBootstrapInputs, runNmBootstrapGate } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n1-bootstrap/gate.js';
import { getNmInput, getNmRootPlan, getNmRunKey } from '/_102020_/l2/aura/molecules/agentNewMolecule2/agentNewMolecule2.js';

const AGENT_NAME = 'agentNm2Bootstrap';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${NM_AGENT_FOLDER}/steps/n1-bootstrap`,
    agentDescription: 'n1-bootstrap — deterministic context assembly for the New Molecule 2 pipeline',
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

  const parsedArgs = nmParseStepArgs(step.prompt);
  const runKey = getNmRunKey(context, parsedArgs.runKey);
  const input = getNmInput(context);
  const rootPlan = getNmRootPlan(context);
  const destProject = nmDestProject();

  const groupEntry = skillList.find(item => item.name.toLowerCase() === rootPlan.group.toLowerCase());
  const groupCanonical = groupEntry?.name || rootPlan.group;
  const groupFolder = groupCanonical.toLowerCase();

  // The creation skill is only PROBED here (fail fast); each later step imports it from the
  // reference in context.json, so the skill text never bloats the artifact.
  const { loaded: groupSkillLoaded, error: groupSkillError } = await probeSkill(groupEntry?.skillReference);

  const baseSource = await readStorText(nmBaseFile(), false);

  // A theme is OPTIONAL. Absence => neutral molecule, exactly like the old flow; presence with a
  // broken contract => fatal. loadVTheme reports absence as an error (the Variant requires a
  // theme), so existence is checked first to keep the two cases apart.
  const themePresent = nmThemeExists();
  const themeLoad = themePresent ? await loadVTheme(destProject) : { theme: null, errors: [] as string[] };

  const ctx: MoleculeContext = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    runKey,
    userPrompt: input.prompt,
    userLanguage: rootPlan.userLanguage,
    destination: { project: destProject, groupFolder, groupCanonical },
    groupSkill: {
      description: groupEntry?.description || '',
      reference: groupEntry?.skillReference || '',
      usageReference: groupEntry?.skillUsageReference || '',
    },
    base: {
      reference: `_102033_/l2/${nmBaseFile().shortName}.ts`,
      className: NM_BASE_CLASS,
      importPath: NM_BASE_IMPORT,
    },
    theme: {
      present: themePresent,
      reference: themePresent ? `_${destProject}_/l2/skills/theme.ts` : null,
      info: themeLoad.theme?.themeInfo || null,
    },
  };

  const gateInputs: NmBootstrapInputs = {
    group: rootPlan.group,
    known: skillList,
    groupSkillLoaded,
    groupSkillError,
    baseFound: !!baseSource.trim(),
    themePresent,
    themeErrors: themeLoad.errors,
    destProject,
    context: ctx,
  };
  const issues = runNmBootstrapGate(gateInputs);
  if (issues.length) {
    const message = issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }

  await writeJsonArtifact(nmContextFileInfo(runKey), ctx);
  await appendLongTermMemory(context, { runKey });
  await writeJsonArtifact(nmTraceFileInfo(runKey, 'n1-bootstrap', 1), {
    savedAt: ctx.createdAt,
    planId: 'n1-bootstrap',
    summary: moleculeContextSummary(ctx),
    themePresent,
  });

  const summary = moleculeContextSummary(ctx);
  return [
    nmResultStepIntent(context, parentStep, {
      planId: nmDoneAnchor('n1-bootstrap'),
      dependsOn: [],
      stepTitle: summary,
      result: { contextFile: toDisplayPath(nmContextFileInfo(runKey)), runKey, themePresent },
    }),
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', summary, 'input_output'),
  ];
}

// Importable + returns a non-empty `skill`? Errors are reported, never thrown: the gate turns them
// into a readable admission failure.
async function probeSkill(reference?: string): Promise<{ loaded: boolean; error?: string }> {
  if (!reference) return { loaded: false, error: 'no skillReference declared' };
  try {
    const mod = await import(reference) as { skill?: unknown };
    if (typeof mod.skill !== 'string' || !mod.skill.trim()) return { loaded: false, error: `${reference} exports no non-empty 'skill'` };
    return { loaded: true };
  } catch (error) {
    return { loaded: false, error: error instanceof Error ? error.message : String(error) };
  }
}
