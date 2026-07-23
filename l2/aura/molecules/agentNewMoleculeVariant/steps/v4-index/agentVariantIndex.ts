/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v4-index/agentVariantIndex.ts" enhancement="_102027_/l2/enhancementAgent"/>

// v4-index (NO LLM): registers the variant in the group index of the destination
// project. Deterministic scope (see step readme): ONLY the side-effect import
// block is touched on an existing index.ts; a missing index.ts is created from
// the minimal template. The showcase content of an existing index page is NOT
// rewritten — the summary reports that.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  V_AGENT_FOLDER,
  readJsonArtifact,
  readStorText,
  toDisplayPath,
  vContextFileInfo,
  vFileExists,
  vMoleculeFile,
  vTraceFileInfo,
  writeJsonArtifact,
  writeStorTextAtomic,
} from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vFs.js';
import { VariantContext } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.js';
import {
  insertIndexImport,
  renderGroupIndexHtml,
  renderNewGroupIndexTs,
} from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vTemplates.js';
import { vDoneAnchor, vResultStepIntent, vUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vSteps.js';
import { runIndexGate } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v4-index/gate.js';
import { getVariantShortName } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/agentNewMoleculeVariant.js';

const AGENT_NAME = 'agentVariantIndex';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${V_AGENT_FOLDER}/steps/v4-index`,
    agentDescription: 'v4-index — deterministic group index registration',
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

  const shortName = getVariantShortName(context);
  const ctx = await readJsonArtifact<VariantContext>(vContextFileInfo(shortName), true);
  if (!ctx) throw new Error(`[${AGENT_NAME}] context.json missing for ${shortName}`);

  const indexInfo = vMoleculeFile(ctx.variant.group, 'index', '.ts');
  const previousIndex = await readStorText(indexInfo, false);
  let updatedIndex: string;
  let created = false;

  if (previousIndex.trim()) {
    const inserted = insertIndexImport(previousIndex, ctx);
    if (inserted === null) {
      const message = `index.ts of group '${ctx.variant.group}' has no recognizable molecule import block — register '${ctx.variant.shortName}' manually (file: ${toDisplayPath(indexInfo)})`;
      await writeJsonArtifact(vTraceFileInfo(shortName, 'v4-index', 1), { savedAt: new Date().toISOString(), planId: 'v4-index', error: message });
      return [vUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
    }
    updatedIndex = inserted;
  } else {
    updatedIndex = renderNewGroupIndexTs(ctx);
    created = true;
  }

  const issues = runIndexGate(updatedIndex, previousIndex, ctx);
  if (issues.length) {
    const message = issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await writeJsonArtifact(vTraceFileInfo(shortName, 'v4-index', 1), { savedAt: new Date().toISOString(), planId: 'v4-index', error: message });
    return [vUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }

  await writeStorTextAtomic(indexInfo, updatedIndex, true);

  const indexHtmlInfo = vMoleculeFile(ctx.variant.group, 'index', '.html');
  let htmlCreated = false;
  if (!vFileExists(indexHtmlInfo)) {
    await writeStorTextAtomic(indexHtmlInfo, renderGroupIndexHtml(ctx), true);
    htmlCreated = true;
  }

  await writeJsonArtifact(vTraceFileInfo(shortName, 'v4-index', 1), {
    savedAt: new Date().toISOString(),
    planId: 'v4-index',
    indexCreated: created,
    indexHtmlCreated: htmlCreated,
  });

  const summary = created
    ? `group index created: ${toDisplayPath(indexInfo)}`
    : `variant registered in ${toDisplayPath(indexInfo)} (import block only — showcase section not rewritten)`;

  return [
    vResultStepIntent(context, parentStep, {
      planId: vDoneAnchor('v4-index'),
      dependsOn: [],
      stepTitle: summary,
      result: { indexCreated: created, indexHtmlCreated: htmlCreated },
    }),
    vUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', summary, 'input_output'),
  ];
}
