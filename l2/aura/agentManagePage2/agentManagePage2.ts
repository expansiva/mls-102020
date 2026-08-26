/// <mls fileReference="_102020_/l2/aura/agentManagePage2/agentManagePage2.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Orchestrator + SCOPE GATE for pointed VISUAL edits of a generated page (TASK-102020-agent-manage-page-2).
//
// Entry: { module, page, layout, ds, device?, request, planOnly?, operations?, imageUrl? } (JSON).
//
// Unlike the older flow, nothing here edits a structural definition: the `.defs.ts` the current
// pipeline produces has no layout tree, so the artifact that carries the visual decision IS the
// page's `.ts`. This agent decides scope; the children patch the file and record the intent.
//
// TWO PHASES (same contract the Studio already knows):
//   • PLAN  (planOnly:true, no operations) → GATE only. Rejection ⇒ mkFail with the reason; approval
//     ⇒ mkCompleted carrying `PLAN:<operations json>`. Nothing is written.
//   • APPLY (operations pre-approved) → skips the gate (a trivial classifier step vehicles the flow)
//     and creates: agentPatchPage (patches the .ts) → agentRecordUserChanges (records the intent in
//     the defs), the second depending on the first, so a reverted patch leaves no orphan record.
//
// The gate's context is a DIGEST, not the raw files: the l4 workspace (what the project actually
// has), the shared base class surface, and an outline of the page's own render methods. See
// pageContextCore.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { pageRef, DEFAULT_DEVICE } from '/_102020_/l2/aura/helpers/dsMatch/derivePaths.js';
import { mkAgentStep, mkFail, mkCompleted, makePlanId } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import { getContentByMlsPath, getCompiledDtsByMlsPath } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';
import { sharedDtsArtifactRef } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';
import { normalizeOperations2, type EditOperation2 } from '/_102020_/l2/aura/agentManagePage2/patchCore.js';
import { buildPageEditContext, partitionOperationsByScope, scopeVocabulary, type PageEditContext } from '/_102020_/l2/aura/agentManagePage2/pageContextCore.js';
import { parseUserChanges } from '/_102020_/l2/aura/agentManagePage2/userChangesCore.js';

interface EntryArgs {
  module: string;
  page: string;
  layout: number | string;
  ds: number | string;
  device?: string;
  request: string;
  planOnly?: boolean;
  operations?: EditOperation2[];
  /** RESERVED: a reference image. Carried through untouched and ignored in this version. */
  imageUrl?: string;
}

/** Args handed to the child steps. */
export interface PageEditStepArgs {
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
    agentName: 'agentManagePage2',
    agentProject: 102020,
    agentFolder: 'aura/agentManagePage2',
    agentDescription: 'Pointed VISUAL edit of a generated page: gate the scope, patch the .ts, record the intent in the defs',
    visibility: 'public',
    beforePromptImplicit,
    afterPromptStep,
  };
}

// ─── refs ───────────────────────────────────────────────────────────────────

export function sharedTsRef(project: number, module: string, page: string): string {
  return `_${project}_/l2/${module}/web/shared/${page}.ts`;
}

export function l4WorkspaceRef(project: number, module: string, page: string): string {
  return `_${project}_/l4/${module}/workspaces/${page}.defs.ts`;
}

export function designSystemRef(project: number): string {
  return `_${project}_/l2/designSystem.ts`;
}

/**
 * The shared base class surface: the persisted compiled `.d.ts` artifact, else compiled on demand,
 * else the raw `.ts`. Same three-tier resolution the materializer uses — the `.d.ts` is 4x smaller
 * than the source and is the authoritative contract.
 */
export async function readSharedSurfaceSource(project: number, module: string, page: string): Promise<string> {
  const tsRef = sharedTsRef(project, module, page);
  const artifact = sharedDtsArtifactRef(tsRef);
  if (artifact) {
    const persisted = await getContentByMlsPath(artifact);
    if (persisted?.trim()) return persisted;
  }
  const compiled = await getCompiledDtsByMlsPath(tsRef);
  if (compiled?.trim()) return compiled;
  return (await getContentByMlsPath(tsRef)) ?? '';
}

/** Read every source the gate's digest needs. */
export async function loadEditContext(entry: { module: string; page: string; layout: number | string; ds: number | string; device: string }): Promise<{ context: PageEditContext; tsRef: string; defsRef: string } | null> {
  const project = mls.actualProject || 0;
  const defsRef = pageRef(project, entry.module, entry.layout, entry.ds, entry.page, '.defs.ts', entry.device);
  const tsRef = pageRef(project, entry.module, entry.layout, entry.ds, entry.page, '.ts', entry.device);

  const defsSrc = await getContentByMlsPath(defsRef);
  const pageSrc = await getContentByMlsPath(tsRef);
  if (!defsSrc || !pageSrc) return null;

  const l4WorkspaceSrc = await getContentByMlsPath(l4WorkspaceRef(project, entry.module, entry.page));
  const sharedSrc = await readSharedSurfaceSource(project, entry.module, entry.page);

  const context = buildPageEditContext({
    page: entry.page,
    module: entry.module,
    l4WorkspaceSrc,
    defsSrc,
    pageSrc,
    sharedSrc,
    userChanges: parseUserChanges(defsSrc),
  });
  return { context, tsRef, defsRef };
}

// ─── hooks ──────────────────────────────────────────────────────────────────

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {

  const entry = JSON.parse(userPrompt) as EntryArgs;
  const { module, page, layout, ds, request } = entry;
  if (!module || !page || layout == null || ds == null || !request?.trim()) {
    throw new Error(`(${agent.agentName}) entry needs { module, page, layout, ds, request }`);
  }
  const device = entry.device || DEFAULT_DEVICE;
  const planOnly = !!entry.planOnly;
  const preApproved = Array.isArray(entry.operations) ? normalizeOperations2(entry.operations) : [];
  const imageUrl = typeof entry.imageUrl === 'string' ? entry.imageUrl : '';

  const longTermMemory: Record<string, string> = {
    module, page, layout: String(layout), ds: String(ds), device, request,
    planOnly: String(planOnly),
    ...(imageUrl ? { imageUrl } : {}),
    ...(preApproved.length ? { operations: JSON.stringify(preApproved) } : {}),
  };

  // APPLY — the user already confirmed these operations; the gate would only cost tokens.
  if (preApproved.length) {
    console.info(`[agentManagePage2] ▶ apply ${preApproved.length} pre-approved op(s) on ${module}/${page}`);
    return [{
      type: 'add-message-ai',
      request: {
        action: 'addMessageAI',
        agentName: agent.agentName,
        inputAI: [
          { type: 'system', content: applyPrompt },
          { type: 'human', content: JSON.stringify({ request, operations: preApproved.length }) },
        ],
        taskTitle: `Apply visual edit ${page}: ${request.slice(0, 60)}`,
        threadId: context.message.threadId,
        userMessage: context.message.content,
        longTermMemory,
      },
    } as mls.msg.AgentIntentAddMessageAI];
  }

  // PLAN — run the gate over the digest.
  const loaded = await loadEditContext({ module, page, layout, ds, device });
  if (!loaded) throw new Error(`(${agent.agentName}) page not found (needs both .defs.ts and .ts): ${module}/${page}`);
  const { context: editContext } = loaded;
  console.info(`[agentManagePage2] ▶ gate "${request}" on ${module}/${page} (context: ${editContext.contextSource}, scopes: ${scopeVocabulary(editContext).join(', ')})`);

  const human = JSON.stringify({
    request,
    scopeVocabulary: scopeVocabulary(editContext),
    context: editContext,
  });

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: gatePrompt },
        { type: 'human', content: human },
      ],
      taskTitle: `Plan visual edit ${page}: ${request.slice(0, 60)}`,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory,
    },
  };
  return [addMessageAI];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {

  try {
    const lm = (context.task?.iaCompressed?.longMemory || {}) as Record<string, string>;
    const module = lm['module'];
    const page = lm['page'];
    const layout = lm['layout'];
    const ds = lm['ds'];
    const device = lm['device'] || DEFAULT_DEVICE;
    const request = lm['request'] || '';
    const imageUrl = lm['imageUrl'] || '';
    const planOnly = lm['planOnly'] === 'true';
    if (!module || !page || layout == null || ds == null) throw new Error('missing run params in longMemory');

    const base = { module, page, layout, ds, device, request, ...(imageUrl ? { imageUrl } : {}) };

    // APPLY — operations came pre-approved in longMemory; this step's payload carries nothing.
    let preApproved: EditOperation2[] = [];
    try { preApproved = lm['operations'] ? normalizeOperations2(JSON.parse(lm['operations'])) : []; } catch { preApproved = []; }
    if (preApproved.length) {
      console.info(`[agentManagePage2] ✓ applying ${preApproved.length} pre-approved operation(s) on ${module}/${page}`);
      return buildChildSteps(context, step, { ...base, operations: preApproved });
    }

    // PLAN — read the gate's verdict.
    const payload = step.interaction?.payload?.[0] as any;
    if (!payload) throw new Error('missing gate payload');
    if (payload.type === 'result') {
      return [mkFail(context, parentStep, step, hookSequential, String(payload.result || 'edit request rejected by the scope gate'))];
    }
    if (payload.type !== 'flexible' || !payload.result) {
      return [mkFail(context, parentStep, step, hookSequential, 'gate returned an unexpected payload')];
    }

    const operations = normalizeOperations2(payload.result.operations);
    if (!operations.length) {
      return [mkFail(context, parentStep, step, hookSequential, 'no actionable visual operations were produced from the request')];
    }

    // A scope this page does not own (typically a split page whose target lives in another file) is
    // dropped here rather than sent to a patch that could never anchor it.
    const loaded = await loadEditContext({ module, page, layout, ds, device });
    if (!loaded) throw new Error(`page not found: ${module}/${page}`);
    const { valid, unknown } = partitionOperationsByScope(operations, loaded.context);
    if (!valid.length) {
      const scopes = unknown.map(op => op.scope).join(', ');
      return [mkFail(context, parentStep, step, hookSequential,
        `the change targets '${scopes}', which is not part of this page (methods: ${scopeVocabulary(loaded.context).join(', ')})`)];
    }
    if (unknown.length) console.warn(`[agentManagePage2] dropped ${unknown.length} op(s) out of this page's scope: ${unknown.map(op => op.scope).join(', ')}`);

    if (planOnly) {
      console.info(`[agentManagePage2] ✓ plan ready — ${valid.length} operation(s): ${valid.map(op => `${op.kind}@${op.scope}`).join(', ')}`);
      return [mkCompleted(context, parentStep, step, hookSequential, `PLAN:${JSON.stringify(valid)}`)];
    }

    console.info(`[agentManagePage2] ✓ gate approved — ${valid.length} operation(s)`);
    return buildChildSteps(context, step, { ...base, operations: valid });
  } catch (error) {
    const msg = `[${agent.agentName}] ${error instanceof Error ? error.message : String(error)}`;
    console.error('[agentManagePage2] ✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

/** Patch the page, then record the intent. The record waits on the patch — and is skipped if it fails. */
function buildChildSteps(
  context: mls.msg.ExecutionContext,
  step: mls.msg.AIAgentStep,
  args: PageEditStepArgs,
): mls.msg.AgentIntent[] {
  const patchPlan = makePlanId('patch', args.page);
  return [
    mkAgentStep(context, step, patchPlan, `Patch: ${args.page}`,
      'agentPatchPage', args as any, [], 'waiting_human_input', 'sequential'),
    mkAgentStep(context, step, makePlanId('record', args.page), `Record change: ${args.page}`,
      'agentRecordUserChanges', args as any, [patchPlan], 'waiting_dependency', 'sequential'),
  ];
}

// ─── prompts ────────────────────────────────────────────────────────────────

// APPLY phase — the user approved the operations in the confirm panel; there is nothing to decide.
const applyPrompt = `
<!-- modelType: classifier -->

The visual edit operations for this page were ALREADY approved by the user. Do not re-evaluate them.
Return ONLY: {"type":"flexible","result":{"status":"ok"}}
Return valid JSON only. No preamble, no markdown fences.
`;

const gatePrompt = `
<!-- modelType: reasoning -->

You are the SCOPE GATE for pointed VISUAL edits of an already-generated page. The human message is a
JSON object { request, scopeVocabulary, context }.

\`context\` describes what this screen IS and what the project HAS:
- \`purpose\`, \`actors\`, \`entity\`, \`presentation\` — what the page is for and for whom.
- \`sections\` — the intent of each region of the screen, its organisms (role / usage / dataSource /
  action) and the render \`method\` that draws it.
- \`data\` — every routine the page can reach: each with \`kind\` (query/command), its \`inputs\`
  (name, source, required) and its \`output.fields\` (name, type). THIS IS THE CLOSED SET of data the
  screen has. A field that is not there does not exist for this page.
- \`surface\` — the states and handlers the page inherits. Also closed.
- \`outline\` — each render method of the page today, with the i18n keys and members it references.
- \`pageMsgKeys\` / \`languages\` / \`canAddText\` — the text vocabulary and whether NEW text can be
  introduced at all (some older pages carry no catalogue of their own).
- \`userChanges\` — visual deviations the user already asked for. Reversing or replacing one of them
  is a NORMAL in-scope edit: emit the operation directly and NEVER ask the user to confirm.
- \`contextSource\` — 'l4-workspace' means the field/routine lists are authoritative; 'page-defs'
  means output fields are unknown, so judge data questions by what the page already renders.

Decide whether the request is a purely VISUAL change realizable with the EXISTING surface.

REJECT (out of scope) ONLY when the request would require ANY of:
- a field, routine, query or command that is not in \`data\`;
- a new state or action, or a change in how data behaves;
- a backend change or a business-rule change;
- something that is not about THIS page (another screen, new navigation, a new permission);
- new visible text when \`canAddText\` is false.

CRITICAL — presentation is ALWAYS in scope. Alignment, spacing, ordering, grouping, sizing, emphasis,
colour, borders, and hiding or showing an element that is ALREADY on the screen never require new
data, so they are never out of scope. There is no structural definition to check against: the change
is applied as markup in the page file, so "the definition has no attribute for it" is NOT a reason to
reject. Do not invent a hypothetical config field and then reject for its absence.

If out of scope, return ONLY:
{"type":"result","result":"a short, specific reason in the user's language explaining what is not possible and why"}

If in scope, return ONLY the typed operations:
{"type":"flexible","result":{"operations":[{"kind":"layout"|"style"|"text"|"visibility","scope":"<render method>","target":"<element/field/action, '' if n/a>","description":"<precise change>"}]}}

- \`kind\`: \`layout\` = position/order/spacing/grouping/size; \`style\` = colour/emphasis/border/shadow;
  \`text\` = a label change using an EXISTING key or a NEW page key (only when \`canAddText\`);
  \`visibility\` = hide or reveal an element that already exists.
- \`scope\` MUST be one of \`scopeVocabulary\` — the method that draws the affected region (use
  \`page\` only when the change is about the page-level arrangement, i.e. the root \`render\`). Pick it
  from \`sections[].method\` and \`outline\`.
- \`description\` is imperative and specific enough to be implemented without re-reading the request.
- One request may produce several operations; never invent data, states or actions.

Return valid JSON only. No preamble, no markdown fences.

## Output format
[[OutputSection]]
`;

//#region OutputSection
export type Output =
  | { type: 'flexible'; result: { operations: Array<{ kind: 'layout' | 'style' | 'text' | 'visibility'; scope: string; target: string; description: string }> } }
  | { type: 'result'; result: string };
//#endregion
