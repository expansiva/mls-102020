/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared-page/agentD2SharedPage.ts" enhancement="_blank"/>
import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readJson, readSourceText } from '/_102035_/l2/solution/fs.js';
import { D2_SHARED_PAGE_AGENT_NAME, markD2StepApproved, markD2StepFailed, moduleTokenOk } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { readD2Input, readD2InputBundle, assertD2InputSourcesStable } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';
import type { D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import type { D2PageContract } from '/_102020_/l2/agentDefsL2/steps/contracts30/contracts.js';
import { d2SharedPreconditionStateKeysByAction, suggestedD2SharedJudgment } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { parseD2SharedJudgment } from '/_102020_/l2/agentDefsL2/steps/shared40/gate.js';
import { approveD2SharedUnit, finalizeD2SharedBarrier, getD2SharedContext } from '/_102020_/l2/agentDefsL2/steps/shared40/run.js';

interface Args { project: number; module: string; pageId: string; attempt: number; feedback?: string; previous?: unknown; }
export function createAgent(): IAgentAsync { return { agentName: D2_SHARED_PAGE_AGENT_NAME, agentProject: 102020, agentFolder: 'agentDefsL2/steps/shared-page', agentDescription: 'Generate and gate shared behavior for one page with one bounded repair', visibility: 'private', beforePromptStep, afterPromptStep }; }

export async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  try {
    const rawArgs = args || step.prompt || '';
    const parsed = parseArgs(rawArgs);
    const identity = { project: parsed.project, module: parsed.module };
    const snapshot = await readD2Input(identity); if (!snapshot) throw new Error('D2_SHARED_INPUT_MISSING');
    const bundle = await readD2InputBundle(identity); await assertD2InputSourcesStable(bundle);
    const { page, contract } = getD2SharedContext(identity, snapshot, bundle.artifacts, parsed.pageId);
    const [prompt, schema] = await Promise.all([
      readSourceText({ project: 102020, level: 2, folder: 'agentDefsL2/steps/shared40', shortName: 'prompt', extension: '.md' }),
      readJson<Record<string, unknown>>({ project: 102020, level: 2, folder: 'agentDefsL2/schemas', shortName: 'sharedJudgmentV1', extension: '.json' }),
    ]);
    if (!schema) throw new Error('D2_SHARED_SCHEMA_MISSING');
    const humanPrompt = buildD2SharedHumanPrompt(page, page.journeyRefs.map(id => bundle.artifacts.journeys[id]).filter(Boolean), contract, parsed.feedback ? { feedback: parsed.feedback, previous: parsed.previous } : null);
    const tool: mls.msg.LLMTool = { type: 'function', function: { name: 'submitD2Shared', description: 'Submit one page shared behavior judgment.', parameters: schema } };
    return [{ type: 'prompt_ready', args: rawArgs, messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', hookSequential, parentStepId: parentStep.stepId, systemPrompt: prompt, humanPrompt, tools: [tool], toolChoice: { type: 'function', function: { name: tool.function.name } } }];
  } catch (error) { return [updateD2Status(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))]; }
}

export async function afterPromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  const parsed = parseArgs(step.prompt || ''); const identity = { project: parsed.project, module: parsed.module };
  try {
    const raw = unwrapD2SharedToolPayload(step.interaction?.payload?.[0]);
    const judgment = parseD2SharedJudgment(raw);
    const snapshot = await readD2Input(identity); if (!snapshot) throw new Error('D2_SHARED_INPUT_MISSING');
    const bundle = await readD2InputBundle(identity); await assertD2InputSourcesStable(bundle);
    const verifySources = () => assertD2InputSourcesStable(bundle);
    await approveD2SharedUnit(identity, snapshot, bundle.artifacts, parsed.pageId, judgment, parsed.attempt, verifySources);
    const manifest = await finalizeD2SharedBarrier(identity, snapshot, verifySources);
    const intents: mls.msg.AgentIntent[] = [];
    if (manifest) {
      await markD2StepApproved(identity, 'shared40', manifest.units.map(unit => unit.artifactPath), snapshot.snapshotHash);
      intents.push(addD2Step(context, parentStep.stepId, d2Result('Shared ready', JSON.stringify({ ...identity, completedStep: 'shared40', nextStep: 'pages50', pages: manifest.units.length }), 'shared40-done')));
    }
    intents.push(updateD2Status(context, parentStep, step, hookSequential, 'completed', `shared40 ${parsed.pageId} approved (${manifest ? 'barrier complete' : 'waiting siblings'}).`));
    return intents;
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    if (parsed.attempt < 2) {
      const repair: Args = { ...parsed, attempt: 2, feedback: diagnostic, previous: unwrapD2SharedToolPayload(step.interaction?.payload?.[0]) };
      return [addD2Step(context, parentStep.stepId, { type: 'agent', stepId: 0, interaction: null, stepTitle: `Repair shared ${parsed.pageId}`, status: 'waiting_human_input', nextSteps: [], agentName: D2_SHARED_PAGE_AGENT_NAME, prompt: JSON.stringify(repair), rags: [], planning: { planId: `shared40-repair-${parsed.pageId}-a2`, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' } } as mls.msg.AIAgentStep), updateD2Status(context, parentStep, step, hookSequential, 'completed', `shared40 ${parsed.pageId} scheduled its only repair: ${diagnostic}`)];
    }
    await markD2StepFailed(identity, 'shared40', `D2_SHARED_REPAIR_LIMIT ${parsed.pageId}: ${diagnostic}`);
    return [updateD2Status(context, parentStep, step, hookSequential, 'failed', `D2_SHARED_REPAIR_LIMIT ${parsed.pageId}: ${diagnostic}`)];
  }
}

export function buildD2SharedHumanPrompt(
  page: D2SelectedPage,
  journeys: unknown[],
  contract: D2PageContract,
  repair: { feedback: string; previous: unknown } | null,
): string {
  return JSON.stringify({
    page: { pageId: page.pageId, pageName: page.label, ancestors: page.ancestors, journeys },
    contract,
    mechanicalStartingCut: suggestedD2SharedJudgment(page, contract),
    preconditionStateKeysByAction: d2SharedPreconditionStateKeysByAction(page, contract),
    preconditionRule: 'For each scenary, preconditions may only copy exact stateKey strings from preconditionStateKeysByAction[actionId], or be empty. Never use labels, scenary values, or actionIds.',
    repair,
  }, null, 2);
}

function parseArgs(value: unknown): Args { let raw: unknown; try { raw = JSON.parse(String(value)); } catch { throw new Error('D2_SHARED_ARGS_INVALID'); } const item = record(raw); const parsed: Args = { project: Number(item.project), module: text(item.module), pageId: text(item.pageId), attempt: Number(item.attempt), feedback: text(item.feedback), previous: item.previous }; if (!Number.isSafeInteger(parsed.project) || parsed.project !== Number(mls.actualProject || 0) || !moduleTokenOk(parsed.module) || !/^[a-z][A-Za-z0-9_-]*$/.test(parsed.pageId) || ![1, 2].includes(parsed.attempt)) throw new Error('D2_SHARED_ARGS_INVALID'); return parsed; }
export function unwrapD2SharedToolPayload(value: unknown): unknown {
  const root = record(value);
  if (root.type === 'flexible') {
    const result = record(root.result);
    if (text(result.toolName) !== 'submitD2Shared') throw new Error('D2_SHARED_TOOL_MISMATCH');
    if (!Object.prototype.hasOwnProperty.call(result, 'arguments')) throw new Error('D2_SHARED_SCHEMA_TRUNCATED');
    return parseCandidate(result.arguments);
  }
  return parseCandidate(root.arguments ?? root.payload ?? root);
}
function parseCandidate(candidate: unknown): unknown { if (typeof candidate !== 'string') return candidate; try { return JSON.parse(candidate); } catch { throw new Error('D2_SHARED_SCHEMA_TRUNCATED'); } }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
