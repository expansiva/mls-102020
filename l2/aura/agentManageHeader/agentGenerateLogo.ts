/// <mls fileReference="_102020_/l2/aura/agentManageHeader/agentGenerateLogo.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Draw the project's brand mark with the LLM. Invoked with
// { projectId, brandTitle?, brief?, style?, profileName?, commit?, requestId }.
//
// Separate from agentGenerateHeader on purpose: one job, one prompt. The mark can be iterated
// ("more geometric", "just the initials") without regenerating the header, because the header reads
// the brand from the CONFIG — it never inlines the identity into its own source.
//
// beforePromptImplicit → direct call: reads the brand title from the header profile when absent and
//   opens a task with ONE generation prompt.
// beforePromptStep     → same prompt, but for the CHILD STEP agentGenerateHeader queues with
//   `logo: 'generate'`: a queued step feeds its own prompt (prompt_ready), it does not open a task.
// afterPromptStep      → validates the SVG (the runtime sanitizer has the last word) and either
//   * commit: writes `brand.logoSvg` into the header profile of l5/config.json, or
//   * draft: parks it in `config.logoDraft` (one-shot, by requestId) for a reviewer.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getConfigProject, updateConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { mkCompleted, mkFail } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import { skill as logoContract } from '/_102020_/l2/aura/agentManageHeader/skills/logoContract.js';
import {
  applyLogoToBrand,
  buildGenerateLogoHumanPrompt,
  normalizeLogoRequest,
  readBrandTitle,
  sanitizeGeneratedLogo,
  type GenerateLogoRequest,
} from '/_102020_/l2/aura/agentManageHeader/helpers/generateLogoCore.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentGenerateLogo',
    agentProject: 102020,
    agentFolder: 'aura/agentManageHeader',
    agentDescription: "Draw the project's brand mark as inline SVG for the header profile",
    visibility: 'private',
    // Two entry points: beforePromptImplicit for a direct call, beforePromptStep for the child step
    // agentGenerateHeader queues (`logo: 'generate'`). The orchestrator calls one or the other.
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

/** The composed client config (l5/config.json) — where the header profile and its brand live. */
async function readClientConfig(projectId: number): Promise<{ storFile: any; config: unknown }> {
  const fileInfo = { project: projectId, level: 5, folder: '', shortName: 'config', extension: '.json' };
  const key = mls.stor.getKeyToFile(fileInfo as any);
  const storFile = mls.stor.files[key];
  if (!storFile) throw new Error(`l5/config.json not found for project ${projectId}`);
  const raw = await storFile.getContent();
  return { storFile, config: typeof raw === 'string' && raw.trim() ? JSON.parse(raw) : undefined };
}

/**
 * The request, whichever door it came through: a queued step carries it in `step.prompt` (or the
 * parallel `args`), a direct call in the task's longMemory.
 */
function resolveRequest(context: mls.msg.ExecutionContext, step?: mls.msg.AIAgentStep, args?: string): GenerateLogoRequest {
  const raw = args ?? step?.prompt
    ?? (context.task?.iaCompressed?.longMemory as Record<string, string> | undefined)?.['request'];
  if (!raw) throw new Error('no request found in the step prompt nor in longMemory');
  return normalizeLogoRequest(JSON.parse(raw));
}

/** Fills the brand title from the header profile when the caller did not pass one. */
async function withBrandTitle(agentName: string, req: GenerateLogoRequest): Promise<GenerateLogoRequest> {
  if (!req.brandTitle) {
    try {
      const { config } = await readClientConfig(req.projectId);
      req.brandTitle = readBrandTitle(config, req.profileName) || undefined;
    } catch (error) {
      console.warn('[agentGenerateLogo] could not read the configured brand title', error);
    }
  }
  if (!req.brandTitle && !req.brief) {
    throw new Error(`(${agentName}) no brandTitle in the request nor in the header profile — pass { brandTitle } or a brief`);
  }
  console.info(`[agentGenerateLogo] ▶ project=${req.projectId} brand="${req.brandTitle ?? '—'}" style=${req.style} commit=${String(req.commit)}`);
  return req;
}

// ─── before (step): feed the prompt of the step the header queued ────────────

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {

  const req = await withBrandTitle(agent.agentName, resolveRequest(context, step, args));
  const promptReady: mls.msg.AgentIntentPromptReady = {
    type: 'prompt_ready',
    args: args ?? step.prompt ?? '',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: system1,
    humanPrompt: buildGenerateLogoHumanPrompt(req),
  };
  return [promptReady];
}

// ─── before (direct): resolve the brand + one generation prompt ──────────────

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {

  let req: GenerateLogoRequest;
  try {
    req = normalizeLogoRequest(JSON.parse(userPrompt));
  } catch (error) {
    throw new Error(`(${agent.agentName}) ${error instanceof Error ? error.message : String(error)}`);
  }
  req = await withBrandTitle(agent.agentName, req);

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: system1 },
        { type: 'human', content: buildGenerateLogoHumanPrompt(req) },
      ],
      taskTitle: req.brandTitle ? `Generate logo · ${req.brandTitle}` : 'Generate logo',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      // longMemory is string-only → the request round-trips JSON-encoded to afterPromptStep.
      longTermMemory: { request: JSON.stringify(req) },
    },
  };
  return [addMessageAI];
}

// ─── after: validate + write ─────────────────────────────────────────────────

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

    const req = resolveRequest(context, step);
    if (!req.projectId) throw new Error('missing request in the step prompt and in longMemory');

    const sanitized = sanitizeGeneratedLogo(payload.result);
    if (!sanitized.ok || !sanitized.value) throw new Error(`LLM output rejected: ${sanitized.error || 'invalid result'}`);

    const { svg, notes } = sanitized.value;
    if (!context.isTest) {
      if (req.commit) await writeLogoToConfig(req, svg);
      else await persistDraft(req, svg, notes);
    }

    console.info(`[agentGenerateLogo] ✓ ${req.commit ? 'wrote' : 'drafted'} mark for project ${req.projectId} (${svg.length} bytes)`);
    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    const msg = `[agentGenerateLogo] ${error instanceof Error ? error.message : String(error)}`;
    console.error('✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

/** Writes `brand.logoSvg` into the header profile the shell boots with. */
async function writeLogoToConfig(req: GenerateLogoRequest, svg: string): Promise<void> {
  const { storFile, config } = await readClientConfig(req.projectId);
  const written = applyLogoToBrand(config, {
    svg,
    profileName: req.profileName,
    brandTitle: req.brandTitle,
  });

  if (storFile.status !== 'renamed' && storFile.status !== 'new') storFile.status = 'changed';
  storFile.updatedAt = new Date().toISOString();
  await mls.stor.localStor.setContent(storFile, {
    contentType: 'string',
    content: `${JSON.stringify(written.config, null, 2)}\n`,
  });
  console.info(`[agentGenerateLogo] brand of header profile "${written.profileName}" ${written.replaced ? 'replaced its mark' : 'got a mark'}`);
}

/** One-shot channel to a reviewer: config.logoDraft (never read by the runtime). */
async function persistDraft(req: GenerateLogoRequest, svg: string, notes?: string): Promise<void> {
  const config: any = await getConfigProject(req.projectId);
  if (!config) throw new Error('project config not found');
  config.logoDraft = {
    requestId: req.requestId ?? '',
    brandTitle: req.brandTitle ?? '',
    style: req.style ?? 'monogram',
    svg,
    notes: notes ?? '',
    createdAt: new Date().toISOString(),
  };
  await updateConfigProject(req.projectId, config);
}

// ─── prompt ──────────────────────────────────────────────────────────────────

const system1 = `
<!-- modelType: design -->

You must return ONLY a valid JSON object. No preamble, no markdown fences. Start with { and end with }

You are a brand designer who draws by hand in SVG. Draw the mark the brief asks for and return its
markup — nothing else. Aim for something a design studio would sign: deliberate geometry, real
negative space, character. It renders small (about 28px tall), so it has to survive that size — but
do not let caution flatten it into a generic circle.

${logoContract}

## Output format
[[OutputSection]]
`;

//#region OutputSection
export type Output = {
  type: 'flexible';
  result: {
    /** The mark: a single <svg> root, viewBox, currentColor only. */
    svg: string;
    /** One or two sentences on the choice made, in the requested language. */
    notes?: string;
  };
};
//#endregion
