/// <mls fileReference="_102020_/l2/aura/agentManageHeader/agentGenerateHeader.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Generate the project's OWN client header with the LLM. Invoked with
// { projectId, brief?, brand?, actions?, language?, commit?, requestId }.
//
// The model never writes the file: it returns the band's markup and CSS, and generateHeaderCore
// wraps them in the deterministic skeleton (imports, class, tag, customElements.define) after the
// contract validation. Everything the shell depends on — band height, light DOM, mobile toggle, SPA
// navigation — belongs to AuraHeaderBase (_102033_), not to the generated file.
//
// beforePromptImplicit → validates the entry, enriches it with the project navigation + the DS role
//   tokens, and sends ONE generation prompt.
// afterPromptStep      → validates/assembles the source and then either
//   * commit: writes `_<proj>_/l2/layout/appHeader.ts` and points the `defaultAura` header profile
//     of `l5/config.json` at it (renderer entrypoint/source/tag), which is what the shell boots, or
//   * draft: parks everything in `config.headerDraft` (one-shot, by requestId) for a reviewer.
//
// With `logo: 'generate'` the commit also queues agentGenerateLogo as a CHILD step of the current
// one, so a single call produces header + mark. That agent writes into the same profile's `brand`,
// and a later header regeneration carries the mark over (it is not the header's to lose).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getConfigProject, updateConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { mkCompleted, mkFail, saveFile } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import { MANDATORY_COLOR_ROLES } from '/_102029_/l2/designSystemBase.js';
import { skill as headerContract } from '/_102020_/l2/aura/agentManageHeader/skills/headerContract.js';
import {
  buildGenerateHeaderHumanPrompt,
  normalizeHeaderRequest,
  pointHeaderProfileAtProject,
  sanitizeGeneratedHeader,
  type GenerateHeaderRequest,
  type HeaderPaths,
} from '/_102020_/l2/aura/agentManageHeader/helpers/generateHeaderCore.js';

/** DS roles a header actually paints with, kept honest against the mandatory role list. */
const HEADER_ROLES = [
  'nav-bg', 'nav-text', 'nav-active-bg', 'nav-active-text',
  'surface-bg', 'surface-alt-bg', 'border-default', 'border-subtle',
  'text-strong', 'text-default', 'text-muted', 'input-bg',
  'button-primary-bg', 'button-primary-text',
  'button-secondary-bg', 'button-secondary-border', 'button-secondary-text',
  'selected-bg', 'selected-text', 'tooltip-bg', 'tooltip-text',
].filter((role) => (MANDATORY_COLOR_ROLES as readonly string[]).includes(role));

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentGenerateHeader',
    agentProject: 102020,
    agentFolder: 'aura/agentManageHeader',
    agentDescription: "Generate the client project's own header as an AuraHeaderBase subclass",
    visibility: 'private',
    beforePromptImplicit,
    afterPromptStep,
  };
}

// ─── before: validate entry + one generation prompt ──────────────────────────

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {

  let req: GenerateHeaderRequest;
  try {
    req = normalizeHeaderRequest(JSON.parse(userPrompt));
  } catch (error) {
    throw new Error(`(${agent.agentName}) ${error instanceof Error ? error.message : String(error)}`);
  }

  req.navigation = req.navigation ?? await readProjectNavigation(req.projectId);
  req.tokens = req.tokens ?? HEADER_ROLES.map((role) => `--ds-color-${role}`);

  console.info(`[agentGenerateHeader] ▶ project=${req.projectId} brand="${req.brand?.title ?? '—'}" logo=${req.brand?.logoUrl ?? '—'} actions=[${(req.actions ?? []).join(',') || '—'}] routes=${req.navigation?.length ?? 0} commit=${String(req.commit)}`);
  if (!req.navigation?.length) console.warn('[agentGenerateHeader] no navigation entries: the header will have no links (and any route it names is rejected)');

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: system1 },
        { type: 'human', content: buildGenerateHeaderHumanPrompt(req) },
      ],
      taskTitle: req.brand?.title ? `Generate header · ${req.brand.title}` : 'Generate header',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      // longMemory is string-only → the request round-trips JSON-encoded to afterPromptStep.
      longTermMemory: { request: JSON.stringify(req) },
    },
  };
  return [addMessageAI];
}

/** The composed client config (l5/config.json) — the document the runtime actually boots from. */
async function readClientConfig(projectId: number): Promise<{ storFile: any; config: unknown }> {
  const fileInfo = { project: projectId, level: 5, folder: '', shortName: 'config', extension: '.json' };
  const key = mls.stor.getKeyToFile(fileInfo as any);
  const storFile = mls.stor.files[key];
  if (!storFile) throw new Error(`l5/config.json not found for project ${projectId}`);
  const raw = await storFile.getContent();
  return { storFile, config: typeof raw === 'string' && raw.trim() ? JSON.parse(raw) : undefined };
}

/**
 * Real routes of the project, from `l5/config.json > projects[id].modules[].navigation` — the same
 * list the shell hands the aside. This is also the allow-list the validation checks the generated
 * band against: a header must never name a route that does not exist.
 */
async function readProjectNavigation(projectId: number): Promise<Array<{ label: string; href: string }>> {
  try {
    const { config } = await readClientConfig(projectId);
    const projects = (config as { projects?: Record<string, { modules?: unknown }> } | undefined)?.projects ?? {};
    const owner = projects[String(projectId)] ? [projects[String(projectId)]] : Object.values(projects);
    const entries: Array<{ label: string; href: string }> = [];
    for (const project of owner) {
      const modules = Array.isArray(project?.modules) ? project.modules : [];
      for (const module of modules) {
        const navigation = (module as { navigation?: unknown }).navigation;
        if (!Array.isArray(navigation)) continue;
        for (const entry of navigation) {
          const label = typeof (entry as { label?: unknown }).label === 'string' ? (entry as { label: string }).label : '';
          const href = typeof (entry as { href?: unknown }).href === 'string' ? (entry as { href: string }).href : '';
          if (label && href) entries.push({ label, href });
        }
      }
    }
    return entries;
  } catch (error) {
    console.warn('[agentGenerateHeader] could not read the project navigation', error);
    return [];
  }
}

// ─── after: validate + assemble + write ──────────────────────────────────────

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
    const req = JSON.parse(lm['request'] || '{}') as GenerateHeaderRequest;
    if (!req.projectId) throw new Error('missing request in longMemory');

    const sanitized = sanitizeGeneratedHeader(payload.result, req);
    if (!sanitized.ok || !sanitized.value) throw new Error(`LLM output rejected: ${sanitized.error || 'invalid result'}`);

    const { source, paths, parts } = sanitized.value;
    let profileName = req.profileName;
    if (!context.isTest) {
      if (req.commit) {
        await saveFile(paths.fileReference, source);
        profileName = await pointConfigAtHeader(req, paths);
      } else {
        await persistDraft(req, source, parts.notes);
      }
    }

    console.info(`[agentGenerateHeader] ✓ ${req.commit ? 'wrote' : 'drafted'} ${paths.fileReference} (${source.split('\n').length} lines, tag ${paths.tag})`);
    const intents: mls.msg.AgentIntent[] = [];
    // The mark is drawn by agentGenerateLogo, parented to the CURRENT step (an already-completed
    // ancestor cannot be modified). Only after a commit: that agent writes into a header profile,
    // which a draft run has not created yet.
    if (req.logo === 'generate') {
      if (req.commit) intents.push(logoStepIntent(context, step, req, profileName));
      else console.warn('[agentGenerateHeader] logo:"generate" ignored on a draft run — the mark needs a written header profile');
    }
    intents.push(mkCompleted(context, parentStep, step, hookSequential));
    return intents;
  } catch (error) {
    const msg = `[agentGenerateHeader] ${error instanceof Error ? error.message : String(error)}`;
    console.error('✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

/**
 * Points the header profile of `l5/config.json` at the generated header — `defaultAura` by default,
 * the profile the shell boots with, so the project header IS the app's header with nothing in
 * between. The other profiles (e.g. `studio`) stay as they are.
 */
async function pointConfigAtHeader(req: GenerateHeaderRequest, paths: HeaderPaths): Promise<string> {
  const { storFile, config: current } = await readClientConfig(req.projectId);
  const written = pointHeaderProfileAtProject(current, {
    paths,
    brand: req.brand,
    actions: req.actions,
    profileName: req.profileName,
    dropLogo: req.logo === 'none',
  });

  if (storFile.status !== 'renamed' && storFile.status !== 'new') storFile.status = 'changed';
  storFile.updatedAt = new Date().toISOString();
  await mls.stor.localStor.setContent(storFile, {
    contentType: 'string',
    content: `${JSON.stringify(written.config, null, 2)}\n`,
  });
  console.info(`[agentGenerateHeader] header profile "${written.profileName}" now points at ${paths.tag}${written.previousTag ? ` (was ${written.previousTag})` : ''}`);
  return written.profileName;
}

/**
 * Child step that draws the brand mark. Sequential and `pending`, so it runs as soon as this step
 * completes; brief and style default to the header's own, so one call needs no extra input.
 */
function logoStepIntent(
  context: mls.msg.ExecutionContext,
  step: mls.msg.AIAgentStep,
  req: GenerateHeaderRequest,
  profileName?: string,
): mls.msg.AgentIntentAddStep {
  const prompt = {
    projectId: req.projectId,
    brandTitle: req.brand?.title,
    brief: req.logoBrief ?? req.brief,
    style: req.logoStyle ?? 'monogram',
    profileName,
    commit: true,
    requestId: req.requestId ? `${req.requestId}-logo` : undefined,
  };

  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: step.stepId,
    step: {
      type: 'agent',
      stepId: 0,
      interaction: null,
      stepTitle: req.brand?.title ? `Generate logo · ${req.brand.title}` : 'Generate logo',
      status: 'pending',
      nextSteps: [],
      agentName: 'agentGenerateLogo',
      prompt: JSON.stringify(prompt),
      rags: [],
      planning: { planId: 'header-logo', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
    } as mls.msg.AIAgentStep,
  };
}

/** One-shot channel to a reviewer: config.headerDraft (never composed into config.json). */
async function persistDraft(req: GenerateHeaderRequest, source: string, notes?: string): Promise<void> {
  const config: any = await getConfigProject(req.projectId);
  if (!config) throw new Error('project config not found');
  config.headerDraft = {
    requestId: req.requestId ?? '',
    brief: req.brief ?? '',
    brand: req.brand ?? null,
    actions: req.actions ?? [],
    source,
    notes: notes ?? '',
    createdAt: new Date().toISOString(),
  };
  await updateConfigProject(req.projectId, config);
}

// ─── prompt ──────────────────────────────────────────────────────────────────

const system1 = `
<!-- modelType: design -->

You must return ONLY a valid JSON object. No preamble, no markdown fences. Start with { and end with }

You are a senior product designer who writes Lit templates. You are given a project and its brand,
and you return the CONTENT of that project's app header band — nothing else. The band is one line
high and always visible, so every decision is about hierarchy in a single row: identity on the left,
context and actions on the right.

${headerContract}

## Output format
[[OutputSection]]
`;

//#region OutputSection
export type Output = {
  type: 'flexible';
  result: {
    /** Body of renderBand(): a lit template without the enclosing html tag/backticks. */
    bandHtml: string;
    /** Extra CSS, every selector scoped with tag*/
    bandCss?: string;
    /** locale -> key -> text, for the fixed copy the band renders. */
    messages?: Record<string, Record<string, string>>;
    /** One or two sentences on the choices made, in the requested language. */
    notes?: string;
  };
};
//#endregion
