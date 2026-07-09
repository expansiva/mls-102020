/// <mls fileReference="_102020_/l2/agents/designSystem/agentGenerateDs.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Generate a Design System draft with the LLM (DS-3). Invoked by the selectDesignSystem plugin
// (Add view) with { projectId, palette?, brief?, nameHint?, language?, requestId }. The LLM maps
// the brand palette to the 11 mandatory COLOR FAMILY anchors (light + dark); generateDsCore then
// EXPANDS them into the full mandatory token set and fills global/typography from the canonical
// template (`_102029_`). The result is a complete `{color,typography,global}` in the NEW unified
// shape — no `ds-*` roles, no enums.
//
// beforePromptImplicit → validates the request and sends ONE generation prompt.
// afterPromptStep      → sanitizes (generateDsCore) and writes the one-shot draft to config.dsDraft
//   (NOT designSystems — nothing is committed). The plugin awaits the task, reads dsDraft by
//   requestId, loads it into the Add form and deletes the draft; the user reviews and saves.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getConfigProject, updateConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { mkCompleted, mkFail } from '/_102020_/l2/agentImplementGenome/planning.js';
import { MANDATORY_COLOR_FAMILIES } from '/_102029_/l2/designSystemBase.js';
import { skill as dsTokenStandard } from '/_102020_/l2/agents/designSystem/skills/dsTokenStandard.js';
import {
  buildGenerateDsHumanPrompt, sanitizeGeneratedDs,
  type GenerateDsRequest,
} from '/_102020_/l2/dsMatch/generateDsCore.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentGenerateDs',
    agentProject: 102020,
    agentFolder: 'agents/designSystem',
    agentDescription: 'Generate a design-system tokens draft from a brand palette (mandatory-token standard)',
    visibility: 'private',
    beforePromptImplicit,
    afterPromptStep,
  };
}

// ─── before: validate request + one generation prompt ────────────────────────

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {

  const req = JSON.parse(userPrompt) as GenerateDsRequest;
  if (!req?.projectId) throw new Error(`(${agent.agentName}) entry needs { projectId }`);
  const brief = req.brief?.trim() ?? '';
  const palette = Array.isArray(req.palette) ? req.palette.filter(c => typeof c === 'string' && c.trim()) : [];
  if (!brief && !palette.length) throw new Error(`(${agent.agentName}) entry needs a brief and/or a palette`);
  console.info(`[agentGenerateDs] ▶ project=${req.projectId} brief=${brief ? `"${brief.slice(0, 60)}…"` : '—'} palette=[${palette.join(',') || '—'}]`);

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: system1 },
        { type: 'human', content: buildGenerateDsHumanPrompt({ ...req, brief, palette }) },
      ],
      taskTitle: req.nameHint?.trim() ? `Generate design system · ${req.nameHint.trim()}` : 'Generate design system',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      // longMemory is string-only → the request round-trips JSON-encoded to afterPromptStep.
      longTermMemory: { request: JSON.stringify({ ...req, brief, palette }) },
    },
  };
  return [addMessageAI];
}

// ─── after: sanitize + write the one-shot draft ───────────────────────────────

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

    const lm = (context.task?.iaCompressed?.longMemory || {}) as Record<string, string>;
    const req = JSON.parse(lm['request'] || '{}') as GenerateDsRequest;
    if (!req.projectId) throw new Error('missing request in longMemory');

    const sanitized = sanitizeGeneratedDs(payload.result, req);
    if (!sanitized.ok || !sanitized.value) throw new Error(`LLM output rejected: ${sanitized.error || 'invalid result'}`);

    const draft = {
      ...sanitized.value,
      requestId: req.requestId ?? '',
      brief: req.brief ?? '',
      palette: req.palette ?? [],
      createdAt: new Date().toISOString(),
    };
    if (!context.isTest) await persistDraft(req.projectId, draft);
    const colorCount = Object.keys(sanitized.value.tokens.color ?? {}).length;
    console.info(`[agentGenerateDs] ✓ draft "${sanitized.value.name || '(sem nome)'}": ${colorCount} color token(s) · palette=[${(req.palette ?? []).join(',')}]`);
    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    const msg = `[agentGenerateDs] ${error instanceof Error ? error.message : String(error)}`;
    console.error('✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

/** One-shot channel to the plugin: config.dsDraft (outside designSystems — never rendered). */
async function persistDraft(projectId: number, draft: unknown): Promise<void> {
  const config: any = await getConfigProject(projectId);
  if (!config) throw new Error('project config not found');
  config.dsDraft = draft;
  await updateConfigProject(projectId, config);
}

// ─── prompt ───────────────────────────────────────────────────────────────────

const system1 = `
<!-- modelType: codepro -->

You must return ONLY a valid JSON object. No preamble, no markdown fences. Start with { and end with }

You are a senior brand/product designer. Given a brand palette (and optional brief), pick the
color ANCHORS of a design system following the standard below. Return light AND dark anchors for
each of the ${MANDATORY_COLOR_FAMILIES.length} families — nothing else (the system expands the
shades/states and fills typography/spacing).

${dsTokenStandard}

## Example (format reference — do NOT copy the values)
{"type":"flexible","result":{"name":"earthy","description":"Warm, organic feel for an artisan marketplace.","families":{"text-primary":{"light":"#3b2f2f","dark":"#f6f1eb"},"text-secondary":{"light":"#8a7f75","dark":"#a89a8c"},"bg-primary":{"light":"#f6f1eb","dark":"#1b1714"},"bg-secondary":{"light":"#efe7dc","dark":"#262019"},"grey":{"light":"#e6e6e6","dark":"#575757"},"error":{"light":"#c0392b","dark":"#e57368"},"success":{"light":"#2e7d32","dark":"#4caf50"},"warning":{"light":"#e0a020","dark":"#eead2b"},"info":{"light":"#0a6dc9","dark":"#0b81ef"},"active":{"light":"#c85a2a","dark":"#e0723f"},"link":{"light":"#c85a2a","dark":"#e0723f"}}}}

## Output format
[[OutputSection]]
`;

//#region OutputSection
export type Output = {
  type: 'flexible';
  result: {
    name: string;
    description: string;
    families: Record<string, { light: string; dark: string }>;
  };
};
//#endregion
