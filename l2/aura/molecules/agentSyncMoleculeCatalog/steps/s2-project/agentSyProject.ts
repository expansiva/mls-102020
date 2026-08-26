/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/steps/s2-project/agentSyProject.ts" enhancement="_102027_/l2/enhancementAgent"/>

// s2-project (NO LLM): writes l2/molecules/skill.ts (level 1), derived from the index.defs.ts EVERY
// group of this run just wrote. See readme.md for the derivation and CHANGELOG.md for why.
//
// ⚠️ ORDER: this step is planted dependsOn every s1 group anchor — it never runs before all of them are
// done (analysis §12.2: grupo -> projeto, nunca em paralelo). It reads what s1 already wrote to l4
// (helpers/syTypes.SyGroupArtifact), never the group's own index.defs.ts text — one source of truth per
// value, and no second parser to keep in sync with syRenderDefs.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { compileStorTs, nmDestProject, readJsonArtifact, readStorText, writeJsonArtifact, writeStorTextAtomic, toDisplayPath } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { nmParseStepArgs, nmResultStepIntent, nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import { SY_AGENT_PROJECT, SY_PLAN_S2, SyGroupArtifact, SyProjectArtifact, SyRunInput, syDoneAnchor } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syTypes.js';
import { syExtractMoleculeShortTags } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syExtract.js';
import { syRenderProjectSkill, SyRenderSkillGroup } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syRenderSkill.js';
import { nmGroupDefsFile, syGroupArtifactFileInfo, syInputFileInfo, syProjectArtifactFileInfo, syProjectSkillFile, syPublishToCache } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syFs.js';

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

  // EVERY group of the project, not just this run's targets — skill.ts is rewritten WHOLE, and a group
  // missing from level 1 is unreachable by the consumer even when its level 2 is perfect. Building this
  // list from `matchedGroups` alone made 'atualizar grupo X' silently delete every OTHER group from
  // level 1 (measured on a real Studio run, 2026-08-26).
  //
  // Two sources, in this order:
  //   1. this run's l4 artifact — freshest, and the only one a just-regenerated group has;
  //   2. the group's own index.defs.ts — for the groups this run did not touch. That is the catalog's
  //      own rule ("level 1 is derived from level 2") applied to the groups left alone.
  // A group with neither has never been synced: it is skipped and named, never silently dropped.
  const groups: SyRenderSkillGroup[] = [];
  const fromArtifact: string[] = [];
  const fromIndexDefs: string[] = [];
  const neverSynced: string[] = [];
  let moleculeCount = 0;
  const catalogGroups = input.catalogGroups && input.catalogGroups.length
    ? input.catalogGroups
    : input.matchedGroups.map(canonical => ({ folder: canonical.trim().toLowerCase(), canonical, purpose: '', usageContract: '' }));

  for (const group of catalogGroups) {
    const folder = group.folder;
    const artifact = await readJsonArtifact<SyGroupArtifact>(syGroupArtifactFileInfo(runKey, folder), false);
    if (artifact) {
      moleculeCount += artifact.moleculeShortTags.length;
      groups.push({ canonical: artifact.canonical, folder: artifact.folder, purpose: artifact.purpose, moleculeShortTags: artifact.moleculeShortTags });
      fromArtifact.push(artifact.canonical);
      continue;
    }
    const shortTags = syExtractMoleculeShortTags(await readStorText(nmGroupDefsFile(folder), false));
    if (!shortTags.length) {
      neverSynced.push(group.canonical || folder);
      continue;
    }
    moleculeCount += shortTags.length;
    groups.push({ canonical: group.canonical || folder, folder, purpose: group.purpose, moleculeShortTags: shortTags });
    fromIndexDefs.push(group.canonical || folder);
  }

  if (!groups.length) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] nenhum grupo do projeto tem catálogo para compor o skill.ts (nunca sincronizados: ${neverSynced.join(', ') || '-'})`)];
  }

  const project = nmDestProject();
  const generatedAt = new Date().toISOString();
  const skillText = syRenderProjectSkill({ project, groups, generatedAt });
  // `true` = also set the editor model. Without it this write is silently lost whenever the Studio has
  // skill.ts open — measured 2026-08-26 (see s1-group for the full note).
  await writeStorTextAtomic(syProjectSkillFile(), skillText, true);
  // Compiling is what publishes the module into the cache the preview/consumer loads from — writing to
  // the stor alone leaves it unfetchable (measured 2026-08-26; see s1-group for the full note). It is
  // also this step's only compile gate.
  const skillCompile = await compileStorTs(syProjectSkillFile(), skillText);
  // skill.ts is imported BY NAME by the catalog consumer, so it needs to be fetchable, not just valid.
  const skillCache = await syPublishToCache(syProjectSkillFile());

  const artifact: SyProjectArtifact = {
    schemaVersion: 1,
    savedAt: generatedAt,
    runKey,
    groupCount: groups.length,
    moleculeCount,
    skillFile: toDisplayPath(syProjectSkillFile()),
  };
  await writeJsonArtifact(syProjectArtifactFileInfo(runKey), artifact);

  const note = `${skillCompile.errors.length ? `⚠️ skill.ts NÃO COMPILA: ${skillCompile.errors.slice(0, 3).join(' | ')} — ` : ''}`
    + `${skillCache.error ? `⚠️ skill.ts fora do cache (${skillCache.error}) — ` : ''}`
    + `skill.ts: ${groups.length} grupo(s), ${moleculeCount} molécula(s)`
    + ` (${fromArtifact.length} deste run, ${fromIndexDefs.length} do index.defs.ts existente)`
    + `${neverSynced.length ? ` — ${neverSynced.length} ainda sem catálogo, fora do skill.ts: ${neverSynced.join(', ')}` : ''}`;
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
