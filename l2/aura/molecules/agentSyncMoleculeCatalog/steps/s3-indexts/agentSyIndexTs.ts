/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/steps/s3-indexts/agentSyIndexTs.ts" enhancement="_102027_/l2/enhancementAgent"/>

// s3-indexts (NO LLM, for now — E8a only): migrates ONE group's index.ts from its hand-authored code
// table to a thin call into the shared renderer. Only planted for a group the root already confirmed has
// the G3 trigger (index.ts exists and has not been migrated) — see readme.md and CHANGELOG.md.
//
// ⚠️ E8b (creating index.ts from scratch for a G1 group — no index.ts at all) is NOT built. The root
// never plants this step for a G1 group; those are reported directly from input.json by s4.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readStorText, toDisplayPath, writeJsonArtifact, writeStorTextAtomic } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { nmParseStepArgs, nmResultStepIntent, nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import { SY_AGENT_PROJECT, SY_SHARED_TABLE_IMPORT, SyIndexTsArtifact, syGroupFolder, syIndexTsDoneAnchor } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syTypes.js';
import { syMigrateIndexTs } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syMigrateIndexTs.js';
import { nmGroupIndexFile, syIndexTsArtifactFileInfo } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syFs.js';

const AGENT_NAME = 'agentSyIndexTs';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: SY_AGENT_PROJECT,
    agentFolder: 'aura/molecules/agentSyncMoleculeCatalog/steps/s3-indexts',
    agentDescription: "s3-indexts — migrates one group's index.ts scenario table to import from index.defs (G3). No LLM.",
    visibility: 'private',
    beforePromptStep,
  };
}

interface SyIndexTsStepArgs {
  group: string;
}

function parseGroupArg(prompt: unknown): string {
  const raw = typeof prompt === 'string' ? prompt : '';
  if (!raw.trim().startsWith('{')) return '';
  try {
    const parsed = JSON.parse(raw) as Partial<SyIndexTsStepArgs>;
    return typeof parsed.group === 'string' ? parsed.group.trim() : '';
  } catch {
    return '';
  }
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
  const canonical = parseGroupArg(step.prompt);
  if (!args.runKey || !canonical) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] step args missing runKey/group`)];
  }
  const runKey = args.runKey;
  const folder = syGroupFolder(canonical);
  const indexTsInfo = nmGroupIndexFile(folder, '.ts');

  const source = await readStorText(indexTsInfo, true);
  const result = syMigrateIndexTs(source, SY_SHARED_TABLE_IMPORT);

  const savedAt = new Date().toISOString();
  let artifact: SyIndexTsArtifact;

  if (result.changed) {
    // `true` = also set the editor model. Without it the migration reported 'migrated' and the page on
    // disk stayed unmigrated — measured 2026-08-26 (see s1-group for the full note).
    await writeStorTextAtomic(indexTsInfo, result.migrated, true);
    artifact = { schemaVersion: 1, savedAt, runKey, folder, canonical, status: 'migrated', indexTsFile: toDisplayPath(indexTsInfo) };
  } else {
    artifact = { schemaVersion: 1, savedAt, runKey, folder, canonical, status: 'failed', reason: result.reason || 'unknown', indexTsFile: toDisplayPath(indexTsInfo) };
  }

  await writeJsonArtifact(syIndexTsArtifactFileInfo(runKey, folder), artifact);

  const note = artifact.status === 'migrated' ? `${folder}: index.ts migrado` : `${folder}: index.ts NÃO migrado — ${artifact.reason}`;
  return [
    nmResultStepIntent(context, parentStep, {
      planId: syIndexTsDoneAnchor(canonical),
      dependsOn: [],
      stepTitle: note,
      result: artifact,
    }),
    // A migration that could not apply is not a step failure — todo §3 gate list has no "must succeed"
    // requirement, and the group's catalog (s1/s2) is already written regardless (analysis §3: the
    // derivable must never be refém of the authored). The run reports it; it does not fail the batch.
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', note, 'input_output'),
  ];
}
