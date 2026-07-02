/// <mls fileReference="_102020_/l2/agents/designSystem/agentGenerateDs.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Generate a Design System draft with the LLM (task 12). Invoked by the selectDesignSystem
// plugin (Add view) with { projectId, brief?, palette?, nameHint?, language?, requestId }:
// - brief only  → the LLM invents palette + tokens (mode 2);
// - palette too → the LLM derives roles/typography FROM the given brand colors (mode 3).
//
// beforePromptImplicit → validates the request and sends ONE generation prompt.
// afterPromptStep      → sanitizes the LLM's DsTokens (generateDsCore) and writes the one-shot
//   draft to config.dsDraft (NOT designSystems — nothing is committed). The plugin awaits the
//   task, reads dsDraft by requestId, loads it into the Add form and deletes the draft; the
//   user reviews and saves through the normal path (_persist + buildGlobalCss).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getConfigProject, updateConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { mkCompleted, mkFail } from '/_102020_/l2/agentImplementGenome/planning.js';
import {
  buildGenerateDsHumanPrompt, sanitizeGeneratedDs,
  CANONICAL_ROLES, REQUIRED_ROLES, SCALES, WEIGHTS, TRACKINGS, RADII, BORDERS, DENSITIES,
  ELEVATIONS, FALLBACKS, GOOGLE_FONTS,
  type GenerateDsRequest,
} from '/_102020_/l2/dsMatch/generateDsCore.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentGenerateDs',
    agentProject: 102020,
    agentFolder: 'agents/designSystem',
    agentDescription: 'Generate a design-system tokens draft (DsTokens) from a brief and/or brand palette',
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
    const roleCount = Object.keys(sanitized.value.tokens.color ?? {}).length;
    console.info(`[agentGenerateDs] ✓ draft "${sanitized.value.name || '(sem nome)'}": ${roleCount} role(s), palette=[${(sanitized.value.tokens.palette ?? []).join(',')}]`);
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

## Task
You are a senior brand/product designer. Create the visual tokens of a design system (light AND
dark themes) from the brief and/or the brand palette in the human message.

## Rules
- Color roles: use ONLY these names: ${CANONICAL_ROLES.join(', ')}.
  ALWAYS include at least: ${REQUIRED_ROLES.join(', ')}. Every role needs "light" and "dark" as #RRGGBB.
- The dark theme is a real design, not a naive inversion: readable text (contrast ≥ 4.5:1 with
  background/surface in BOTH themes), calmer saturations on dark backgrounds.
- "palette" = 4 to 6 brand source colors. If the human message gives a brand palette, copy it
  VERBATIM into "palette" and derive every role from those colors.
- Typography: 2 font roles minimum ("display" and "body"), source "google" with real Google Fonts
  families (suggestions: ${GOOGLE_FONTS.join(', ')}) and weights like [400, 600, 700].
  fallback ∈ ${FALLBACKS.join(' | ')}.
- Closed vocabularies — pick exactly one value each:
  scale ∈ ${SCALES.join(' | ')} · weightHeading ∈ ${WEIGHTS.join(' | ')} · tracking ∈ ${TRACKINGS.join(' | ')}
  radius ∈ ${RADII.join(' | ')} · borderWidth ∈ ${BORDERS.join(' | ')} · density ∈ ${DENSITIES.join(' | ')} · elevation ∈ ${ELEVATIONS.join(' | ')}
- "name": short, lowercase, evocative (e.g. "sunset"); keep the given name if the human message has one.
- "description": one sentence on the intended feel/use, in the requested language.
- Make the choices COHERENT with the brief (e.g. law firm → serif display, muted colors, low radius;
  kids app → vibrant, rounded, spacious).

## Example (format reference — do NOT copy the values)
{"type":"flexible","result":{"name":"earthy","description":"Warm, organic feel for an artisan marketplace.","tokens":{"palette":["#C85A2A","#F2C57C","#F6F1EB","#3B2F2F"],"color":{"primary":{"light":"#C85A2A","dark":"#E0723F"},"accent":{"light":"#F2C57C","dark":"#F2C57C"},"background":{"light":"#F6F1EB","dark":"#1B1714"},"surface":{"light":"#FFFFFF","dark":"#262019"},"text":{"light":"#3B2F2F","dark":"#F6F1EB"},"muted":{"light":"#8A7F75","dark":"#A89A8C"},"border":{"light":"#E4DACE","dark":"#3A322B"},"success":{"light":"#2E7D32","dark":"#4CAF50"},"danger":{"light":"#C0392B","dark":"#E57368"}},"typography":{"fonts":[{"name":"display","source":"google","family":"Fraunces","weights":[400,600,700],"fallback":"serif"},{"name":"body","source":"google","family":"Inter","weights":[400,500],"fallback":"sans-serif"}],"scale":"comfortable","weightHeading":"600","tracking":"tight"},"shape":{"radius":"lg","borderWidth":"1"},"density":"cozy","elevation":"soft"}}}

## Output format
[[OutputSection]]
`;

//#region OutputSection
export type Output = {
  type: 'flexible';
  result: {
    name: string;
    description: string;
    tokens: {
      palette: string[];
      color: Record<string, { light: string; dark: string }>;
      typography: {
        fonts: Array<{ name: string; source: 'system' | 'google' | 'custom'; family: string; weights?: number[]; fallback?: string; url?: string }>;
        scale: string;
        weightHeading: string;
        tracking: string;
      };
      shape: { radius: string; borderWidth: string };
      density: string;
      elevation: string;
    };
  };
};
//#endregion
