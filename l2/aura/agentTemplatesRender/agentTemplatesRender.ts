/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/agentTemplatesRender.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Root orchestrator for TEMPLATE-guided page generation (CollabUX v1).
// Entry: { module, styleModel, layout, ds, device?, pages? } (JSON, from the Studio).
//
// beforePromptImplicit → minimal LLM confirmation (validates the request; derives genome=page{layout}{ds}).
// afterPromptStep      → enumerate l4/<module>/workspaces (apply `pages` subset) and create ONE child
//                        `plan` step (agentTplPlan). The planner then fans out the rest of the tree
//                        (write-template / defs → critique → fix → render, and the register barrier).
//
// Convention (à la agentImplementGenome): flow.json is documentation; agents are discovered by the
// createAgent() export. longMemory is string-only (subsets are JSON-encoded).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { mkAgentStep, mkFail, makePlanId } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import { DEFAULT_DEVICE } from '/_102020_/l2/aura/helpers/dsMatch/derivePaths.js';
import { deriveGenome, listWorkspaces, type TplArgs } from '/_102020_/l2/aura/agentTemplatesRender/tplCore.js';

interface EntryArgs {
  module: string;
  styleModel: string;
  layout: number | string;
  ds: number | string;
  device?: string;
  pages?: string[];
  useMolecules?: boolean;   // v2 opt-in (default false = v1 behaviour, no molecules anywhere)
}

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentTemplatesRender',
    agentProject: 102020,
    agentFolder: 'aura/agentTemplatesRender',
    agentDescription: 'Generate pages guided by a reusable UX template (CollabUX): plan → template → defs → critique → fix → render',
    visibility: 'public',
    beforePromptImplicit,
    afterPromptStep,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {

  const { module, styleModel, layout, ds, device, pages, useMolecules } = JSON.parse(userPrompt) as EntryArgs;
  if (!module || !styleModel || layout == null || ds == null) {
    throw new Error(`(${agent.agentName}) entry needs { module, styleModel, layout, ds }`);
  }
  const dev = device || DEFAULT_DEVICE;
  const genome = deriveGenome(layout, ds);
  const targetPages = Array.isArray(pages) ? pages.filter(p => typeof p === 'string' && p) : [];
  const withMolecules = useMolecules === true;
  console.info('[agentTemplatesRender] ▶ request', { module, styleModel, layout, ds, device: dev, genome, useMolecules: withMolecules, pages: targetPages.length ? targetPages : 'ALL' });

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: system1 },
        { type: 'human', content: JSON.stringify({ module, styleModel, layout, ds, device: dev, useMolecules: withMolecules, pages: targetPages }) },
      ],
      taskTitle: `Templates (${styleModel}) → ${genome} on ${module}${withMolecules ? ' + molecules' : ''}`,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        module, styleModel, layout: String(layout), ds: String(ds), device: dev, genome,
        pages: JSON.stringify(targetPages),
        useMolecules: String(withMolecules),
      },
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
    const payload = step.interaction?.payload?.[0] as any;
    if (!payload) throw new Error('missing payload');
    if (payload.type === 'result') {
      return [mkFail(context, parentStep, step, hookSequential, String(payload.result || 'confirmation returned an error'))];
    }
    if (payload.type !== 'flexible' || payload.result?.status !== 'ok') {
      return [mkFail(context, parentStep, step, hookSequential, 'templates request not confirmed')];
    }

    const lm = (context.task?.iaCompressed?.longMemory || {}) as Record<string, string>;
    const module = lm['module'];
    const styleModel = lm['styleModel'];
    const layout = lm['layout'];
    const ds = lm['ds'];
    const device = lm['device'] || DEFAULT_DEVICE;
    const genome = lm['genome'] || deriveGenome(layout, ds);
    const useMolecules = lm['useMolecules'] === 'true';
    if (!module || !styleModel || layout == null || ds == null) throw new Error('missing run params in longMemory');

    const project = mls.actualProject || 0;
    let requested: string[] = [];
    try { requested = JSON.parse(lm['pages'] || '[]'); } catch { requested = []; }
    const toShortName = (p: string) => (p.split('/').pop() ?? '').replace(/\.defs\.ts$/, '').replace(/\.ts$/, '');
    const requestedShort = requested.map(toShortName).filter(Boolean);

    const allPages = listWorkspaces(project, module);
    const pages = requestedShort.length ? allPages.filter(p => requestedShort.includes(p)) : allPages;
    console.info(`[agentTemplatesRender] project=${project} module=${module} style=${styleModel} genome=${genome}`);
    console.info(`[agentTemplatesRender] ${pages.length}/${allPages.length} workspace(s):`, pages, requestedShort.length ? `(requested: ${requestedShort.join(', ')})` : '(all)');
    if (pages.length === 0) {
      throw new Error(requestedShort.length
        ? `none of the requested pages [${requestedShort.join(', ')}] exist in ${module}/workspaces (available: ${allPages.join(', ') || 'none'})`
        : `no workspaces found in l4/${module}/workspaces`);
    }

    const planArgs: TplArgs = { module, styleModel, layout, ds, device, genome, pages, useMolecules };
    const plan = mkAgentStep(context, step, makePlanId('plan'), `Plan templates: ${styleModel}`,
      'agentTplPlan', planArgs as any, [], 'waiting_human_input', 'sequential');

    console.info('[agentTemplatesRender] ✓ created plan step');
    return [plan];
  } catch (error) {
    const msg = `[${agent.agentName}] ${error instanceof Error ? error.message : String(error)}`;
    console.error('[agentTemplatesRender] ✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

const system1 = `
<!-- modelType: classifier -->

You validate a template-guided page-generation request. The human message is a JSON object
{ module, styleModel, layout, ds, device, useMolecules, pages } (pages is an optional subset, empty = all
pages; useMolecules is a boolean flag).
If it is a well-formed request, return ONLY:
{"type":"flexible","result":{"status":"ok"}}

If it is clearly invalid, return ONLY:
{"type":"result","result":"a short reason in the user's language"}

Return valid JSON only. No preamble, no markdown fences.

## Output format
[[OutputSection]]
`;

//#region OutputSection
export type Output =
  | { type: 'flexible'; result: { status: 'ok' } }
  | { type: 'result'; result: string };
//#endregion
