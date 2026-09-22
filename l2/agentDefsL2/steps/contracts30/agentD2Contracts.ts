/// <mls fileReference="_102020_/l2/agentDefsL2/steps/contracts30/agentD2Contracts.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  D2_CONTRACTS_AGENT_NAME,
  markD2StepApproved,
  markD2StepFailed,
  parseD2StepInvocation,
} from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { readD2Input, readD2InputBundle, assertD2InputSourcesStable } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';
import { generateD2Contracts } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: D2_CONTRACTS_AGENT_NAME,
    agentProject: 102020,
    agentFolder: 'agentDefsL2/steps/contracts30',
    agentDescription: 'Derive, gate and persist typed page contracts without an LLM call',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const parsed = parseD2StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
  if (parsed.kind === 'refusal') return [updateD2Status(context, parentStep, step, hookSequential, 'failed', parsed.diagnostic)];
  const identity = { project: parsed.project, module: parsed.module };
  try {
    const snapshot = await readD2Input(identity);
    if (!snapshot) throw new Error('D2_CONTRACT_INPUT_MISSING: input20 must be approved first');
    const bundle = await readD2InputBundle(identity);
    await assertD2InputSourcesStable(bundle);
    const generated = await generateD2Contracts(identity, snapshot, bundle.artifacts, () => assertD2InputSourcesStable(bundle));
    const artifactPaths = generated.manifest.units.map(unit => unit.artifactPath);
    await markD2StepApproved(identity, 'contracts30', artifactPaths, snapshot.snapshotHash);
    const result = JSON.stringify({
      ...identity,
      completedStep: 'contracts30',
      nextStep: 'shared40',
      snapshotHash: snapshot.snapshotHash,
      contracts: generated.manifest.units.length,
      written: generated.written,
      reused: generated.reused,
    });
    return [
      addD2Step(context, parentStep.stepId, d2Result('Contracts ready', result, 'contracts30-done')),
      updateD2Status(context, parentStep, step, hookSequential, 'completed', `contracts30 approved ${artifactPaths.length} page contract(s), ${generated.reused} reused.`),
    ];
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    await markD2StepFailed(identity, 'contracts30', diagnostic);
    return [updateD2Status(context, parentStep, step, hookSequential, 'failed', diagnostic)];
  }
}
