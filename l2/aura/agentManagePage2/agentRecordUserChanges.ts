/// <mls fileReference="_102020_/l2/aura/agentManagePage2/agentRecordUserChanges.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Child of agentManagePage2, running AFTER the patch succeeded: records the user's intent in the
// page's `.defs.ts` as the `userChanges` export.
//
// `userChanges` is the CURRENT SET of visual deviations, not a history. Asking to centre the buttons
// and then to align them left must leave ONE entry. Most of that is decided in code
// (userChangesCore.supersedeDeterministic: same scope + same intent axis ⇒ replace); the model is
// asked only to (1) classify the incoming change onto a scope/intent axis and (2) drop older entries
// the new one semantically contradicts across axes. Its answer is validated: a kept entry must be
// byte-identical, `user`/`date` are stamped by this agent, and nothing can be invented.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { pageRef } from '/_102020_/l2/aura/helpers/dsMatch/derivePaths.js';
import { mkCompleted, mkFail, saveFile } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import { getContentByMlsPath } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';
import type { EditOperation2 } from '/_102020_/l2/aura/agentManagePage2/patchCore.js';
import {
  parseUserChanges, upsertUserChanges, nextChangeId, supersedeDeterministic, validateConsolidated,
  summarizeUserChanges, CHANGE_INTENTS, type UserChange,
} from '/_102020_/l2/aura/agentManagePage2/userChangesCore.js';

interface RecordArgs {
  module: string;
  page: string;
  layout: number | string;
  ds: number | string;
  device: string;
  request: string;
  operations: EditOperation2[];
  imageUrl?: string;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentRecordUserChanges',
    agentProject: 102020,
    agentFolder: 'aura/agentManagePage2',
    agentDescription: 'Record the applied visual change in the page defs as the consolidated userChanges set',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

function parseArgs(prompt: string | undefined): RecordArgs {
  if (!prompt) throw new Error('[agentRecordUserChanges] empty step prompt');
  const args = JSON.parse(prompt) as RecordArgs;
  if (!args.module || !args.page || args.layout == null || args.ds == null) throw new Error(`[agentRecordUserChanges] invalid args: ${prompt}`);
  if (!args.device) args.device = 'desktop';
  if (!Array.isArray(args.operations)) args.operations = [];
  return args;
}

function defsRefOf(args: RecordArgs): string {
  return pageRef(mls.actualProject || 0, args.module, args.layout, args.ds, args.page, '.defs.ts', args.device);
}

/**
 * The entries this request introduces, already stamped. One per operation, because two operations of
 * the same request can sit on different axes (align the buttons AND hide a column) and must be able
 * to be superseded independently later.
 */
export function buildIncoming(args: RecordArgs, existing: UserChange[], user: string, date: string): UserChange[] {
    const out: UserChange[] = [];
    for (const operation of args.operations) {
        out.push({
            id: nextChangeId([...existing, ...out]),
            change: operation.description,
            scope: operation.scope || 'page',
            intent: defaultIntentFor(operation),
            user,
            date,
        });
    }
    return out;
}

/** Axis guess from the operation kind — the model may refine it, within CHANGE_INTENTS. */
function defaultIntentFor(operation: EditOperation2): string {
    if (operation.kind === 'visibility') return 'visibility';
    if (operation.kind === 'text') return 'text.label';
    if (operation.kind === 'style') return 'style.emphasis';
    return 'layout.align';
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {

  try {
    const a = parseArgs(args ?? step.prompt);
    const defsRef = defsRefOf(a);
    const defsSrc = await getContentByMlsPath(defsRef);
    if (!defsSrc) throw new Error(`defs not found: ${defsRef}`);

    const existing = parseUserChanges(defsSrc);
    const user = context.message.senderId || '';
    const date = new Date().toISOString();
    const incoming = buildIncoming(a, existing, user, date);

    // Deterministic pass first: the axes the code can already resolve.
    let baseline = existing;
    for (const entry of incoming) baseline = supersedeDeterministic(baseline, entry);

    console.info(`[agentRecordUserChanges] ▶ ${a.page}: ${existing.length} existing + ${incoming.length} new → ${baseline.length} after the deterministic supersede`);

    const human = JSON.stringify({
      request: a.request,
      operations: a.operations,
      currentUserChanges: existing,
      incoming,
      deterministicResult: baseline,
      allowedIntents: CHANGE_INTENTS,
    });

    const continueParallel: mls.msg.AgentIntentPromptReady = {
      type: 'prompt_ready',
      args: args ?? step.prompt ?? '',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      hookSequential,
      parentStepId: parentStep.stepId,
      systemPrompt: recordPrompt,
      humanPrompt: human,
    };
    return [continueParallel];
  } catch (error) {
    const msg = `[agentRecordUserChanges] ${error instanceof Error ? error.message : String(error)}`;
    console.error('✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {

  try {
    const a = parseArgs(step.prompt);
    const defsRef = defsRefOf(a);
    const defsSrc = await getContentByMlsPath(defsRef);
    if (!defsSrc) throw new Error(`defs not found: ${defsRef}`);

    const existing = parseUserChanges(defsSrc);
    const payload = step.interaction?.payload?.[0] as any;
    // Same derivation as beforePromptStep, stamped here — this hook is the one that writes.
    const incoming = buildIncoming(a, existing, context.message.senderId || '', new Date().toISOString());

    // The model's list is only accepted when it survives the net; otherwise the deterministic result
    // is written instead — the record must never be lost because the consolidation was sloppy.
    let consolidated: UserChange[];
    const guard = validateConsolidated(existing, payload?.result?.userChanges, incoming);
    if (guard.ok) {
      consolidated = guard.value;
    } else {
      console.warn(`[agentRecordUserChanges] consolidation refused (${guard.reason}) — falling back to the deterministic supersede`);
      consolidated = incoming.reduce((list, entry) => supersedeDeterministic(list, entry), existing);
    }

    const out = upsertUserChanges(defsSrc, consolidated);
    if (!context.isTest) {
      await saveFile(defsRef, out);
      console.info(`[agentRecordUserChanges] ✓ ${a.page}: ${consolidated.length} userChange(s) recorded in ${defsRef}`);
    }
    return [mkCompleted(context, parentStep, step, hookSequential, `CHANGES:${summarizeUserChanges(consolidated)}`)];
  } catch (error) {
    const msg = `[agentRecordUserChanges] ${error instanceof Error ? error.message : String(error)}`;
    console.error('✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

const recordPrompt = `
<!-- modelType: classifier -->

You maintain the \`userChanges\` list of a page: the CURRENT SET of visual deviations the user wants,
relative to what the generator would produce. It is NOT a history — an entry that a newer request
contradicts must disappear, not accumulate.

The human message is { request, operations, currentUserChanges, incoming, deterministicResult, allowedIntents }.

- \`incoming\` are the entries for the change that was JUST applied. You may refine each one's
  \`change\` wording (short, in the user's voice), its \`scope\` and its \`intent\` (one of
  \`allowedIntents\`). You may NOT change its \`id\`. Authorship (\`user\`/\`date\`) is stamped by the
  system: echo the values you were given, they are ignored either way.
- \`deterministicResult\` already dropped every previous entry that sits on the SAME (scope, intent)
  axis as an incoming one. Start from it.
- Your only remaining job: drop previous entries that the new one contradicts ACROSS axes — e.g. a new
  \`layout.order\` that makes an older \`visibility\` entry meaningless, or an older entry about an
  element the new change removes. When in doubt, KEEP the previous entry.

Rules:
- Every entry you return is either one of \`currentUserChanges\` with its \`change\`/\`scope\`/\`intent\`
  UNCHANGED, or one of \`incoming\`. Never invent an entry, never merge two into one.
- Every \`incoming\` entry MUST be present in your answer.
- Order does not matter.

Return ONLY:
{"type":"flexible","result":{"userChanges":[{"id":"…","change":"…","scope":"…","intent":"…","user":"…","date":"…"}]}}

Return valid JSON only. No preamble, no markdown fences.

## Output format
[[OutputSection]]
`;

//#region OutputSection
export type Output = { type: 'flexible'; result: { userChanges: Array<{ id: string; change: string; scope: string; intent: string; user: string; date: string }> } };
//#endregion
