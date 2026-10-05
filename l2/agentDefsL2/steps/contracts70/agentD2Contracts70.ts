/// <mls fileReference="_102020_/l2/agentDefsL2/steps/contracts70/agentD2Contracts70.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readD2Input } from '/_102020_/l2/helpers/defsInput/io.js';
import { D2_CONTRACTS70_AGENT_NAME, markD2StepApproved, parseD2StepInvocation, readD2Pipeline } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { executeD2Contracts70, productionContractsPort, type D2Contracts70Port } from '/_102020_/l2/agentDefsL2/steps/contracts70/run.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: D2_CONTRACTS70_AGENT_NAME, agentProject: 102020, agentFolder: 'agentDefsL2/steps/contracts70',
    agentDescription: 'Render one BFF contract per page from the approved shared', visibility: 'private', beforePromptStep,
  };
}

export async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, argsOrPort?: string | D2Contracts70Port): Promise<mls.msg.AgentIntent[]> {
  try {
    const port = typeof argsOrPort === 'object' ? argsOrPort : await productionContractsPort(parsedIdentity(argsOrPort || step.prompt || ''));
    const result = await executeD2Contracts70(port, typeof argsOrPort === 'object' ? undefined : parsedIdentity(step.prompt || ''));
    if (typeof argsOrPort !== 'object') {
      const identity = parsedIdentity(step.prompt || '');
      const snapshot = await readD2Input(identity);
      if (!snapshot) throw new Error('D2_CONTRACTS_INPUT_MISSING');
      const pipeline = await readD2Pipeline(identity);
      if (pipeline) await markD2StepApproved(identity, 'contracts70', [...result.wrote, ...result.reused].map(pageId => `l2/${identity.module}/web/contracts/${pageId}.defs.ts`), snapshot.snapshotHash);
    }
    return [
      addD2Step(context, parentStep.stepId, d2Result('Contracts ready', JSON.stringify({ completedStep: 'contracts70', nextStep: 'finalize80', wrote: result.wrote, reused: result.reused, refused: [...result.skipped, ...result.refused.map(row => row.pageId)] }), 'contracts70-done')),
      // d2_76: a refused page does not stop the others; finalize80 fails the pipeline once, listing it.
      updateD2Status(context, parentStep, step, hookSequential, 'completed', `contracts70 wrote ${result.wrote.length}, reused ${result.reused.length} and skipped ${result.skipped.length} refused upstream.${result.refused.length ? ` D2_CONTRACTS_PAGES_REFUSED: ${result.refused.map(row => `${row.pageId}: ${row.diagnostic}`).join(' || ')}` : ''}`),
    ];
  } catch (error) {
    return [updateD2Status(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}

function parsedIdentity(raw: string): { project: number; module: string } {
  const parsed = parseD2StepInvocation(raw, Number(mls.actualProject || 0));
  if (parsed.kind === 'refusal') throw new Error(parsed.diagnostic);
  return parsed;
}
