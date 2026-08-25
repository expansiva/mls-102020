/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/steps/s2-project/agentSyProject.ts" enhancement="_102027_/l2/enhancementAgent"/>

// s2-project (NO LLM): writes l2/molecules/skill.ts (level 1), derived from the index.defs.ts EVERY
// group of this run just wrote. See readme.md for the derivation and CHANGELOG.md for why.
//
// ⚠️ ORDER: this step is planted dependsOn every s1 group anchor — it never runs before all of them are
// done (analysis §12.2: grupo -> projeto, nunca em paralelo). It reads what s1 already wrote to l4
// (helpers/syTypes.SyGroupArtifact), never the group's own index.defs.ts text — one source of truth per
// value, and no second parser to keep in sync with syRenderDefs.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { nmDestProject, readJsonArtifact, writeJsonArtifact, writeStorTextAtomic, toDisplayPath } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { nmParseStepArgs, nmResultStepIntent, nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import { SY_AGENT_PROJECT, SY_PLAN_S2, SyGroupArtifact, SyProjectArtifact, SyRunInput, syDoneAnchor } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syTypes.js';
import { syRenderProjectSkill, SyRenderSkillGroup } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syRenderSkill.js';
import { syGroupArtifactFileInfo, syInputFileInfo, syProjectArtifactFileInfo, syProjectSkillFile } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syFs.js';

const AGENT_NAME = 'agentSyProject';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: SY_AGENT_PROJECT,
    agentFolder: 'aura/molecules/agentSyncMoleculeCatalog/steps/s2-project',
    agentDescription: "s2-project — writes l2/molecules/skill.ts from every group's freshly written index.defs.ts. No LLM.",
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
  if (!input || !input.matchedGroups.length) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] run ${runKey} has no input.json / no matched groups to build the project skill from`)];
  }

  const groups: SyRenderSkillGroup[] = [];
  const missing: string[] = [];
  let moleculeCount = 0;
  for (const canonical of input.matchedGroups) {
    const folder = canonical.trim().toLowerCase();
    const artifact = await readJsonArtifact<SyGroupArtifact>(syGroupArtifactFileInfo(runKey, folder), false);
    if (!artifact) {
      missing.push(canonical);
      continue;
    }
    moleculeCount += artifact.moleculeShortTags.length;
    groups.push({ canonical: artifact.canonical, folder: artifact.folder, purpose: artifact.purpose, moleculeShortTags: artifact.moleculeShortTags });
  }

  if (!groups.length) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] none of this run's group steps left an artifact to read (missing: ${missing.join(', ')})`)];
  }

  const project = nmDestProject();
  const generatedAt = new Date().toISOString();
  const skillText = syRenderProjectSkill({ project, groups, generatedAt });
  await writeStorTextAtomic(syProjectSkillFile(), skillText);

  const artifact: SyProjectArtifact = {
    schemaVersion: 1,
    savedAt: generatedAt,
    runKey,
    groupCount: groups.length,
    moleculeCount,
    skillFile: toDisplayPath(syProjectSkillFile()),
  };
  await writeJsonArtifact(syProjectArtifactFileInfo(runKey), artifact);

  const note = `skill.ts: ${groups.length} grupo(s), ${moleculeCount} molécula(s)${missing.length ? ` — ${missing.length} grupo(s) sem artefato do s1: ${missing.join(', ')}` : ''}`;
  return [
    nmResultStepIntent(context, parentStep, {
      planId: syDoneAnchor(SY_PLAN_S2),
      dependsOn: [],
      stepTitle: note,
      result: artifact,
    }),
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', note, 'input_output'),
  ];
}
