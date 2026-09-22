/// <mls fileReference="_102020_/l2/agentDefsL2/steps/input20/agentD2Input.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  D2_INPUT_AGENT_NAME,
  markD2StepApproved,
  markD2StepFailed,
  parseD2StepInvocation,
} from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { D2InputValidationError, type D2InputProblem } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { buildD2InputSnapshot } from '/_102020_/l2/agentDefsL2/steps/input20/gate.js';
import {
  assertD2InputSourcesStable,
  readD2Input,
  readD2InputBundle,
  writeAcceptedD2Input,
  writeRefusedD2Input,
} from '/_102020_/l2/agentDefsL2/steps/input20/io.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: D2_INPUT_AGENT_NAME,
    agentProject: 102020,
    agentFolder: 'agentDefsL2/steps/input20',
    agentDescription: 'Validate and freeze the agentDefsL2 input snapshot without an LLM call',
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
    const previous = await readD2Input(identity);
    const bundle = await readD2InputBundle(identity);
    const snapshot = await buildD2InputSnapshot(identity, bundle.artifacts, previous);
    await assertD2InputSourcesStable(bundle);
    const persisted = await writeAcceptedD2Input(identity, snapshot);
    await markD2StepApproved(identity, 'input20', [displayInputPath(identity)], snapshot.snapshotHash);
    const result = JSON.stringify({
      ...identity,
      completedStep: 'input20',
      nextStep: 'contracts30',
      snapshotHash: snapshot.snapshotHash,
      writePages: snapshot.selection.writePageIds.length,
      removedPages: snapshot.selection.remove.length,
      reused: persisted.reused,
    });
    return [
      addD2Step(context, parentStep.stepId, d2Result('Inputs ready', result, 'input20-done')),
      updateD2Status(context, parentStep, step, hookSequential, 'completed', `input20 accepted ${snapshot.selection.pages.length} page(s), snapshot ${snapshot.snapshotHash}`),
    ];
  } catch (error) {
    const problems = problemsOf(error);
    await writeRefusedD2Input(identity, problems);
    await markD2StepFailed(identity, 'input20', problems.map(problem => `${problem.code}: ${problem.message}`).join('; '));
    return [updateD2Status(context, parentStep, step, hookSequential, 'failed', problems.map(problem => `${problem.code}: ${problem.message}`).join('; '))];
  }
}

function problemsOf(error: unknown): D2InputProblem[] {
  if (error instanceof D2InputValidationError) return error.problems;
  const message = error instanceof Error ? error.message : String(error);
  return [{ severity: 'error', code: message.split(':')[0] || 'INPUT_READ_FAILURE', file: 'input20', message }];
}

function displayInputPath(identity: { module: string }): string {
  return `l2/${identity.module}/pipeline/agentDefsL2/input.json`;
}
