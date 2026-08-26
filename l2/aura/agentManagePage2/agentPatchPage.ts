/// <mls fileReference="_102020_/l2/aura/agentManagePage2/agentPatchPage.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Child of agentManagePage2: applies the approved visual operations to the page's `.ts` as a PATCH.
//
// The model returns only the render methods it touched (complete, signature included) plus any new
// i18n keys as data; patchCore splices them in deterministically and guards the result. Nothing about
// the file's contract can drift: header, tag, class, imports, the catalogue block and the msg getter
// are compared before and after, `this.<member>` references are checked against the shared base
// class, and `msg['key']` against the catalogue.
//
// The `.ts` is saved and then compiled. On errors: ONE repair round (a second step, attempt 2, with
// the compiler output). Still failing ⇒ the original file is RESTORED and the step fails, so a broken
// page is never left behind.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { pageRef } from '/_102020_/l2/aura/helpers/dsMatch/derivePaths.js';
import { mkAgentStep, mkCompleted, mkFail, makePlanId } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import {
  getContentByMlsPath, saveGeneratedTsByMlsPath, compileMlsPathAndGetErrors, extractToolCallArgs,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';
import {
  applyPagePatch, normalizePatch, hasPageCatalogue,
  PATCH_RULES, PATCH_TOOL, PATCH_TOOL_NAME, type EditOperation2, type PagePatch,
} from '/_102020_/l2/aura/agentManagePage2/patchCore.js';
import { parseSharedSurface, pageLocales, dsTokenNames, outlinePage } from '/_102020_/l2/aura/agentManagePage2/pageContextCore.js';
import { readSharedSurfaceSource, designSystemRef } from '/_102020_/l2/aura/agentManagePage2/agentManagePage2.js';
import { traceStep, traceSent, traceReceived, traceVerdict, traceFail, type TraceMeta } from '/_102020_/l2/aura/agentManagePage2/trace.js';

interface PatchArgs {
  module: string;
  page: string;
  layout: number | string;
  ds: number | string;
  device: string;
  request: string;
  operations: EditOperation2[];
  imageUrl?: string;
  attempt?: number;          // 1 = first pass; 2 = the single repair round
  /** Set on the repair step: the pre-patch source, so a failed repair can still restore it. */
  originalCode?: string;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentPatchPage',
    agentProject: 102020,
    agentFolder: 'aura/agentManagePage2',
    agentDescription: 'Patch the render methods of a generated page .ts with an approved visual change',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

function parseArgs(prompt: string | undefined): PatchArgs {
  if (!prompt) throw new Error('[agentPatchPage] empty step prompt');
  const args = JSON.parse(prompt) as PatchArgs;
  if (!args.module || !args.page || args.layout == null || args.ds == null) throw new Error(`[agentPatchPage] invalid args: ${prompt}`);
  if (!args.device) args.device = 'desktop';
  if (!Array.isArray(args.operations)) args.operations = [];
  return args;
}

function tsRefOf(args: PatchArgs): string {
  return pageRef(mls.actualProject || 0, args.module, args.layout, args.ds, args.page, '.ts', args.device);
}

function describeOperations(operations: EditOperation2[]): string {
  return operations
    .map(op => `- (${op.kind}${op.target ? ` @${op.target}` : ''}) [scope: ${op.scope}] ${op.description}`)
    .join('\n');
}

/** The human prompt: the page as it is, the surface it may use, and exactly what to change. */
function buildHuman(args: PatchArgs, pageSrc: string, sharedSrc: string, compileErrors: string[]): string {
  const scopes = [...new Set(args.operations.map(op => (op.scope === 'page' ? 'render' : op.scope)))];
  const locales = pageLocales(pageSrc);
  const parts: string[] = [
    '## Change requested by the user',
    '',
    args.request,
    '',
    '## Approved operations — apply exactly these, nothing else',
    '',
    describeOperations(args.operations),
    '',
    `Methods you may return: ${scopes.join(', ')} (plus a NEW private render* helper if it genuinely helps).`,
    `Locales of this file: ${locales.length ? locales.join(', ') : '(none — the page has no catalogue of its own)'}.`,
    `New i18n keys: ${hasPageCatalogue(pageSrc) ? 'allowed, via `messages`' : 'NOT possible on this page — reuse an existing key'}.`,
    '',
    '## The page as it is now (target file)',
    '',
    '```ts',
    pageSrc.trim(),
    '```',
    '',
    '## Shared base class — the ONLY states, handlers and message keys available',
    '',
    '```ts',
    sharedSrc.trim(),
    '```',
  ];
  if (compileErrors.length) {
    parts.push(
      '',
      '## Repair — your previous patch did not compile',
      '',
      'Fix exactly these errors while keeping the requested change:',
      '```text',
      compileErrors.slice(0, 12).join('\n'),
      '```',
    );
  }
  return parts.join('\n');
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
    const attempt = a.attempt ?? 1;
    const meta: TraceMeta = { agent: 'agentPatchPage', page: a.page, taskId: context.task?.PK, attempt };
    const tsRef = tsRefOf(a);
    const pageSrc = await getContentByMlsPath(tsRef);
    if (!pageSrc) throw new Error(`page not found: ${tsRef}`);

    const sharedSrc = await readSharedSurfaceSource(mls.actualProject || 0, a.module, a.page);
    if (!sharedSrc) throw new Error(`shared base class not found for ${a.module}/${a.page}`);

    // Attempt 2 is the repair round: feed back what the compiler said about the file on disk.
    const compileErrors = attempt >= 2 ? await compileMlsPathAndGetErrors(tsRef) : [];
    traceStep(meta, attempt >= 2 ? 'repair round' : 'patching', {
      target: tsRef,
      pageBytes: pageSrc.length,
      sharedBytes: sharedSrc.length,
      methods: outlinePage(pageSrc).map(item => item.method),
      operations: a.operations.map(op => `${op.kind}@${op.scope}`),
      compileErrors: compileErrors.length,
    });

    const continueParallel: mls.msg.AgentIntentPromptReady = {
      type: 'prompt_ready',
      args: args ?? step.prompt ?? '',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      hookSequential,
      parentStepId: parentStep.stepId,
      systemPrompt: patchPrompt,
      humanPrompt: buildHuman(a, pageSrc, sharedSrc, compileErrors),
      tools: [PATCH_TOOL as unknown as mls.msg.LLMTool],
      toolChoice: { type: 'function', function: { name: PATCH_TOOL_NAME } },
    };
    traceSent(meta, 'page patch', {
      system: continueParallel.systemPrompt,
      human: continueParallel.humanPrompt,
      tool: PATCH_TOOL_NAME,
      data: { operations: a.operations, request: a.request },
    });
    return [continueParallel];
  } catch (error) {
    const msg = `[agentPatchPage] ${error instanceof Error ? error.message : String(error)}`;
    traceFail({ agent: 'agentPatchPage' }, msg);
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
    const attempt = a.attempt ?? 1;
    const meta: TraceMeta = { agent: 'agentPatchPage', page: a.page, taskId: context.task?.PK, attempt };
    const tsRef = tsRefOf(a);
    const currentSrc = await getContentByMlsPath(tsRef);
    if (!currentSrc) throw new Error(`page not found: ${tsRef}`);
    // On the first pass the file on disk IS the original; on the repair round it is the broken one,
    // so the original travels in the step args.
    const originalCode = a.originalCode ?? currentSrc;

    const rawPayload = step.interaction?.payload?.[0];
    const patch = normalizePatch(extractToolCallArgs<PagePatch>(rawPayload, PATCH_TOOL_NAME));
    traceReceived(meta, 'page patch', rawPayload, patch
      ? {
        methods: patch.methods.map(method => `${method.name} (${method.code.length}B)`),
        newKeys: patch.messages?.map(message => message.key) ?? [],
        notes: patch.notes,
      }
      : { parsed: 'FAILED — empty or malformed' });
    if (!patch) return [failAndRestore(context, parentStep, step, hookSequential, a, originalCode, 'the patch came back empty or malformed', attempt)];

    const project = mls.actualProject || 0;
    const sharedSrc = await readSharedSurfaceSource(project, a.module, a.page);
    const surface = parseSharedSurface(sharedSrc);
    const designSystemSrc = (await getContentByMlsPath(designSystemRef(project))) ?? '';

    // Guards + splice, all in memory. A refused patch never reaches the file.
    const applied = applyPagePatch(currentSrc, patch, {
      operations: a.operations,
      sharedMembers: surface.members,
      sharedMsgKeys: surface.msgKeys,
      dsTokens: dsTokenNames(designSystemSrc),
    });
    if (!applied.ok) {
      traceVerdict(meta, 'guards REFUSED the patch — the file was not touched', false, applied.reason);
      return [failAndRestore(context, parentStep, step, hookSequential, a, originalCode, `patch refused: ${applied.reason}`, attempt)];
    }

    const { code, warnings } = applied.value;
    traceVerdict(meta, 'guards passed, patch spliced in memory', true,
      `${currentSrc.length}B -> ${code.length}B${warnings.length ? ` | warnings: ${warnings.join(' ; ')}` : ''}`);

    if (!context.isTest) {
      const saved = await saveGeneratedTsByMlsPath(tsRef, code);
      traceVerdict(meta, `saved ${tsRef}`, saved);
      if (!saved) return [mkFail(context, parentStep, step, hookSequential, `save failed: ${tsRef}`)];
    }

    const errors = context.isTest ? [] : await compileMlsPathAndGetErrors(tsRef);
    traceVerdict(meta, `compile: ${errors.length} error(s)`, errors.length === 0, errors.slice(0, 8).join(' | '));
    if (errors.length) {
      if (attempt < 2) {
        traceStep(meta, 'queueing ONE repair round (attempt 2) with the compiler output');
        const repairArgs: PatchArgs = { ...a, attempt: 2, originalCode };
        return [
          mkCompleted(context, parentStep, step, hookSequential),
          mkAgentStep(context, parentStep, makePlanId('patch-repair', a.page), `Patch (repair): ${a.page}`,
            'agentPatchPage', repairArgs as any, [], 'waiting_human_input', 'sequential'),
        ];
      }
      // Second failure: put the page back the way it was and report.
      if (!context.isTest) await saveGeneratedTsByMlsPath(tsRef, originalCode);
      traceFail(meta, `repair failed too — ${tsRef} REVERTED to its pre-patch content`);
      return [mkFail(context, parentStep, step, hookSequential,
        `the visual change could not be applied without breaking the page — it was reverted.\n${errors.slice(0, 8).join('\n')}`)];
    }

    const touched = patch.methods.map(m => m.name).join(', ');
    const added = patch.messages?.length ? ` (+${patch.messages.length} i18n key(s))` : '';
    traceVerdict(meta, `DONE — patched ${touched}${added}`, true, patch.notes);
    for (const warning of warnings) console.warn(`[agentPatchPage] ! ${warning}`);

    const notes = patch.notes || `alterado: ${touched}`;
    return [mkCompleted(context, parentStep, step, hookSequential, `NOTES:${notes}`)];
  } catch (error) {
    const msg = `[agentPatchPage] ${error instanceof Error ? error.message : String(error)}`;
    traceFail({ agent: 'agentPatchPage' }, msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

/**
 * Fail this step, restoring the original file first when the repair round is the one failing (the
 * first pass never wrote anything, so there is nothing to restore).
 */
function failAndRestore(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args: PatchArgs,
  originalCode: string,
  reason: string,
  attempt: number,
): mls.msg.AgentIntentUpdateStatus {
  if (attempt >= 2 && !context.isTest) {
    void saveGeneratedTsByMlsPath(tsRefOf(args), originalCode);
  }
  return mkFail(context, parentStep, step, hookSequential, reason);
}

const patchPrompt = `
<!-- modelType: code -->
<!-- x-tool-strict: true -->

You apply a pointed VISUAL change to one already-working Lit page, as a PATCH.

The page extends a shared base class that owns all state, actions and handlers; the file you are
patching only renders. Its visual structure lives in \`render*()\` methods, styled with Tailwind
classes and \`var(--token, #fallback)\` colours.
${PATCH_RULES}

Submit through the ${PATCH_TOOL_NAME} tool. Return nothing else.
`;
