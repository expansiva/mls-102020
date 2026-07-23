/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v2-shell/agentVariantShell.ts" enhancement="_102027_/l2/enhancementAgent"/>

// v2-shell (NO LLM): renders and writes the deterministic files. See flow.json.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  V_AGENT_FOLDER,
  readJsonArtifact,
  readStorText,
  vContextFileInfo,
  vMoleculeFile,
  vTraceFileInfo,
  writeJsonArtifact,
  writeStorTextAtomic,
} from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vFs.js';
import { VariantContext } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.js';
import { renderShellDefs, renderShellTs } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vTemplates.js';
import { vDoneAnchor, vResultStepIntent, vUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vSteps.js';
import { runShellGate } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v2-shell/gate.js';
import { getVariantShortName } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/agentNewMoleculeVariant.js';

const AGENT_NAME = 'agentVariantShell';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${V_AGENT_FOLDER}/steps/v2-shell`,
    agentDescription: 'v2-shell — deterministic shell .ts + .defs.ts from templates',
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

  // The .defs.ts is a contract other routines consume; the variant inherits the
  // origin's behavior, so its contract is the origin's — replicated verbatim,
  // only the identity fields swapped (see renderShellDefs).
  const originDefs = await readStorText({
    project: ctx.origin.project,
    level: 2,
    folder: `molecules/${ctx.origin.group}`,
    shortName: ctx.origin.shortName,
    extension: '.defs.ts',
  }, false);
  if (!originDefs.trim()) {
    const message = `origin .defs.ts not found for ${ctx.origin.ref} — cannot replicate the component contract`;
    await writeJsonArtifact(vTraceFileInfo(shortName, 'v2-shell', 1), { savedAt: new Date().toISOString(), planId: 'v2-shell', error: message });
    return [vUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }

  const shellTs = renderShellTs(ctx);
  const shellDefs = renderShellDefs(ctx, originDefs);
  const issues = runShellGate(shellTs, shellDefs, ctx);

  if (issues.length) {
    const message = issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await writeJsonArtifact(vTraceFileInfo(shortName, 'v2-shell', 1), { savedAt: new Date().toISOString(), planId: 'v2-shell', error: message });
    return [vUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }

  await writeStorTextAtomic(vMoleculeFile(ctx.variant.group, ctx.variant.shortName, '.ts'), shellTs, true);
  await writeStorTextAtomic(vMoleculeFile(ctx.variant.group, ctx.variant.shortName, '.defs.ts'), shellDefs, true);
  await writeJsonArtifact(vTraceFileInfo(shortName, 'v2-shell', 1), {
    savedAt: new Date().toISOString(),
    planId: 'v2-shell',
    files: [ctx.variant.files.ts, ctx.variant.files.defs],
  });

  return [
    vResultStepIntent(context, parentStep, {
      planId: vDoneAnchor('v2-shell'),
      dependsOn: [],
      stepTitle: `${ctx.variant.files.ts} + .defs`,
      result: { files: [ctx.variant.files.ts, ctx.variant.files.defs] },
    }),
    vUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `shell written: ${ctx.variant.files.ts}`, 'input_output'),
  ];
}
