/// <mls fileReference="_102020_/l2/agentImplementGenome/planning.ts" enhancement="_blank" />

// Shared planning helpers for the barrier-group orchestration (see
// skills/desingsystem/agentsgrouping.md and the agentNewSolution model).
//
// The orchestrator enumerates pages and creates one step per page per group, wiring
// dependencies (dependsOn) so a group only starts when its barrier completes:
//   select:<page>  (group A, waiting_human_input, dependsOn [])
//   gen:<page>     (group B, waiting_dependency, dependsOn [select:<page>])
//   register       (terminal, waiting_dependency, dependsOn [gen:* for every page])

import { createStorFile } from '/_102027_/l2/libStor.js';

type ExecutionMode = 'sequential' | 'parallel_static' | 'parallel_dynamic' | 'manual_later';

/** Per-page (or whole-derivation) args carried in each step's `prompt`. */
export interface StepArgs {
    module: string;
    layout: number | string;
    ds: number | string;
    device: string;
    page?: string;
    pages?: string[];   // used by the whole-DS steps (e.g. reconcile-tokens) that span all run pages
    forceReconcile?: boolean;  // reconcile-tokens: bypass the version cache and re-run the LLM
}

/** 'select:cardapioEstoque' / 'gen:cardapioEstoque' / 'register'. */
export function makePlanId(group: string, page?: string): string {
    return page ? `${group}:${page}` : group;
}

/** Build an add-step intent for a planned agent step (child of the orchestrator step). */
export function mkAgentStep(
    context: mls.msg.ExecutionContext,
    rootStep: mls.msg.AIAgentStep,
    planId: string,
    title: string,
    agentName: string,
    args: StepArgs,
    dependsOn: string[],
    status: mls.msg.AIStepStatus = 'waiting_dependency',
    executionMode: ExecutionMode = 'parallel_static',
): mls.msg.AgentIntentAddStep {
    return {
        type: 'add-step',
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        parentStepId: rootStep.stepId,
        step: {
            type: 'agent',
            stepId: 0,
            interaction: null,
            stepTitle: title,
            status,
            nextSteps: [],
            agentName,
            prompt: JSON.stringify(args),
            rags: [],
            planning: {
                planId,
                dependsOn,
                executionMode,
                executionHost: 'client',
            },
        } as any,
    };
}

/** Mark the current step completed (used by no-LLM steps and after-processing). */
export function mkCompleted(
    context: mls.msg.ExecutionContext,
    parentStep: mls.msg.AIAgentStep,
    step: mls.msg.AIAgentStep,
    hookSequential: number,
): mls.msg.AgentIntentUpdateStatus {
    return {
        type: 'update-status',
        hookSequential,
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        parentStepId: parentStep?.stepId ?? step.stepId,
        stepId: step.stepId,
        status: 'completed',
    };
}

/** Mark the current step failed, surfacing the reason in traceMsg. */
export function mkFail(
    context: mls.msg.ExecutionContext,
    parentStep: mls.msg.AIAgentStep,
    step: mls.msg.AIAgentStep,
    hookSequential: number,
    traceMsg: string,
): mls.msg.AgentIntentUpdateStatus {
    return {
        type: 'update-status',
        hookSequential,
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        parentStepId: parentStep?.stepId ?? step.stepId,
        stepId: step.stepId,
        status: 'failed',
        traceMsg,
    };
}

/** Parse a step's `prompt` (the StepArgs JSON). */
export function parseStepArgs(prompt: string | undefined): StepArgs {
    if (!prompt) throw new Error('[planning] empty step prompt');
    const a = JSON.parse(prompt) as StepArgs;
    if (!a.module || a.layout == null || a.ds == null) throw new Error(`[planning] invalid step args: ${prompt}`);
    if (!a.device) a.device = 'desktop';
    return a;
}

/** Read raw file content by file reference (''. when missing). */
export async function readRawSource(ref: string): Promise<string> {
    const norm = ref.startsWith('/') ? ref.slice(1) : ref;
    const info = mls.stor.convertFileReferenceToFile(norm);
    const key = mls.stor.getKeyToFile(info);
    const sf = mls.stor.files[key];
    if (!sf) return '';
    const content = await sf.getContent();
    return typeof content === 'string' ? content : '';
}

/** Create or overwrite a file by file reference. */
export async function saveFile(ref: string, src: string): Promise<void> {
    const info = mls.stor.convertFileReferenceToFile(ref);
    const key = mls.stor.getKeyToFile(info);
    let sf = mls.stor.files[key];
    if (!sf) {
        sf = await createStorFile({ ...info, source: src } as any, true, true, true);
    } else {
        const m = await sf.getOrCreateModel();
        if (m && m.model) m.model.setValue(src);
    }
    await mls.stor.localStor.setContent(sf, { contentType: 'string', content: src });
}
