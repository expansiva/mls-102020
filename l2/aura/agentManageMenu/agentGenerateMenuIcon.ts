/// <mls fileReference="_102020_/l2/aura/agentManageMenu/agentGenerateMenuIcon.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Draw icons for one apps-menu entry with the LLM. Invoked by the menu editor (pluginMenuEditor) with
// { projectId, moduleId?, pageId?, label?, description?, brief?, requestId }.
//
// Sibling of agentGenerateLogo, same shape: one prompt, a validated result, and a one-shot DRAFT in the
// Studio document (`l5/project.json` → menuIconDraft, by requestId). It never writes the menu: the
// person picks one drawing in the editor, and the editor's Save writes `navigation[i].iconSvg`.
//
// beforePromptImplicit → direct call only (no parent step queues it): opens a task with ONE prompt.
// afterPromptStep      → keeps the drawings that pass 102036 isSafeMenuIconSvg and parks them as the draft.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getConfigProject, updateConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { mkCompleted, mkFail } from '/_102020_/l2/aura/helpers/agentStepStatus.js';
import { skill as menuIconContract } from '/_102020_/l2/aura/agentManageMenu/skills/menuIconContract.js';
import {
  MENU_ICON_CANDIDATES,
  buildGenerateMenuIconHumanPrompt,
  normalizeMenuIconRequest,
  sanitizeGeneratedMenuIcons,
  withMenuIconDraft,
  type GenerateMenuIconRequest,
} from '/_102020_/l2/aura/agentManageMenu/helpers/generateMenuIconCore.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentGenerateMenuIcon',
    agentProject: 102020,
    agentFolder: 'aura/agentManageMenu',
    agentDescription: 'Draw SVG icons for one entry of the apps menu (draft for the menu editor)',
    visibility: 'private',
    beforePromptImplicit,
    afterPromptStep,
  };
}

function requestFromMemory(context: mls.msg.ExecutionContext, step?: mls.msg.AIAgentStep): GenerateMenuIconRequest {
  const raw = step?.prompt ?? (context.task?.iaCompressed?.longMemory as Record<string, string> | undefined)?.['request'];
  if (!raw) throw new Error('no request found in the step prompt nor in longMemory');
  return normalizeMenuIconRequest(JSON.parse(raw));
}

// ─── before: one generation prompt ───────────────────────────────────────────

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {

  let req: GenerateMenuIconRequest;
  try {
    req = normalizeMenuIconRequest(JSON.parse(userPrompt));
  } catch (error) {
    throw new Error(`(${agent.agentName}) ${error instanceof Error ? error.message : String(error)}`);
  }
  console.info(`[agentGenerateMenuIcon] ▶ project=${req.projectId} entry="${req.label ?? '—'}" brief="${req.brief ?? '—'}"`);

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: system1 },
        { type: 'human', content: buildGenerateMenuIconHumanPrompt(req) },
      ],
      taskTitle: req.label ? `Generate menu icon · ${req.label}` : 'Generate menu icon',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      // longMemory is string-only → the request round-trips JSON-encoded to afterPromptStep.
      longTermMemory: { request: JSON.stringify(req) },
    },
  };
  return [addMessageAI];
}

// ─── after: validate + draft ─────────────────────────────────────────────────

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {

  try {
    const payload = step.interaction?.payload?.[0] as any;
    if (payload?.type !== 'flexible' || !payload.result) throw new Error(`invalid payload: ${JSON.stringify(payload)}`);

    const req = requestFromMemory(context, step);
    const sanitized = sanitizeGeneratedMenuIcons(payload.result);
    if (!sanitized.ok) throw new Error(`LLM output rejected: ${sanitized.error}`);

    if (!context.isTest) {
      const projectConfig = await getConfigProject(req.projectId);
      if (!projectConfig) throw new Error('project config not found');
      await updateConfigProject(req.projectId, withMenuIconDraft(projectConfig, req.requestId ?? '', sanitized.icons) as any);
    }

    console.info(`[agentGenerateMenuIcon] ✓ drafted ${sanitized.icons.length} icon(s) for project ${req.projectId}`
      + (sanitized.dropped ? ` (${sanitized.dropped} refused)` : ''));
    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    const msg = `[agentGenerateMenuIcon] ${error instanceof Error ? error.message : String(error)}`;
    console.error('✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

// ─── prompt ──────────────────────────────────────────────────────────────────

const system1 = `
<!-- modelType: design -->

You must return ONLY a valid JSON object. No preamble, no markdown fences. Start with { and end with }

You are an icon designer who draws by hand in SVG. Draw ${MENU_ICON_CANDIDATES} icons for the menu entry the
brief describes and return their markup — nothing else. Each one must read at a glance at 18px.

${menuIconContract}

## Output format
[[OutputSection]]
`;

//#region OutputSection
export type Output = {
  type: 'flexible';
  result: {
    /** Exactly 3 different drawings: each a single <svg> root, viewBox 0 0 24 24, currentColor only. */
    icons: Array<{
      svg: string;
      /** A few words on the idea of this drawing, in the requested language. */
      note?: string;
    }>;
  };
};
//#endregion
