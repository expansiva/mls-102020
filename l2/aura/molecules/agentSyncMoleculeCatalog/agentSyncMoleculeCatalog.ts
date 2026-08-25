/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/agentSyncMoleculeCatalog.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Root of agentSyncMoleculeCatalog (spec: flow.json / spec.md in this folder).
// Entry: '@@agentSyncMoleculeCatalog [atualizar [grupo(s)] <lista ou all>] [incluindo o arquivo index.ts]'
//
// ⚠️ THE DEFAULT PATH SPENDS NO LLM CALL. Which groups to generate, and whether the index.ts opt-in was
// asked for, are BOTH deterministic — word matching (helpers/syEntry) and a stor scan
// (helpers/syDiscover + helpers/syFs), never a classifier. So this root's own bootstrap uses
// AgentIntentAddMessageAI.skipRootLLM (the same mechanism agentChangeFrontend already ships with) to get
// the step tree the platform needs without spending a call on a decision that was never a
// classification to begin with.
//
// ⚠️ NO TWO-PHASE PLANTING, unlike agentChooseMolecules. That family's fan-out needs a second phase
// because c1's answer (which groups an LLM chose) is not known until c1 runs. Here discovery is a stor
// scan this root can do itself, synchronously, so every step — s1 per group, s2, s4 — is planted in this
// single batch, dependency edges and all.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { isBareMention, stripAgentMention } from '/_102020_/l2/aura/molecules/shared/mentionEntry.js';
import { writeJsonArtifact } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import { syParseEntry } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syEntry.js';
import { syDiscoverGroups, syResolveRequested, syUnknownGroupsMessage } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syDiscover.js';
import {
  SY_AGENT_PROJECT,
  SY_PLAN_S2,
  SY_PLAN_S4,
  SyRunInput,
  syDoneAnchor,
  syGroupDoneAnchor,
  syGroupPlanId,
} from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syTypes.js';
import { syInputFileInfo, syScanProjectGroupFolders, sySkillList } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syFs.js';

const AGENT_NAME = 'agentSyncMoleculeCatalog';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: SY_AGENT_PROJECT,
    agentFolder: 'aura/molecules/agentSyncMoleculeCatalog',
    agentDescription:
      "Generates l2/molecules/skill.ts (level 1) and each group's index.defs.ts + index.html (level 2) from the molecule files already in the project. Deterministic — no LLM in the default path. '@@agentSyncMoleculeCatalog [atualizar grupo(s) <lista ou all>] [incluindo o arquivo index.ts]'.",
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
  const text = stripAgentMention(userPrompt, agent.agentName);
  const raw = isBareMention(text) ? '' : text;

  const entry = syParseEntry(raw);
  if (entry.error) throw new Error(`[${AGENT_NAME}] ${entry.error}`);

  const discovery = syDiscoverGroups(syScanProjectGroupFolders(), sySkillList());
  const resolved = syResolveRequested(discovery, entry);
  if (resolved.unknown.length) {
    throw new Error(`[${AGENT_NAME}] ${syUnknownGroupsMessage(resolved.unknown, discovery)}`);
  }
  if (!resolved.selected.length) {
    const reason = resolved.requestedButIgnored.length
      ? `todos os grupos pedidos estão fora do catálogo: ${resolved.requestedButIgnored.map(group => `${group.folder} (${group.reason})`).join('; ')}`
      : 'nenhum grupo com entrada em skills/index.ts foi encontrado no projeto';
    throw new Error(`[${AGENT_NAME}] nada para gerar — ${reason}`);
  }

  const runKey = syRunKeyFromNow();
  const input: SyRunInput = {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    runKey,
    mentionRaw: raw,
    wantsAll: entry.wantsAll,
    includeIndexTsRequested: entry.includeIndexTs,
    matchedGroups: resolved.selected.map(group => group.canonical),
    // Batch-only (D4): naming every OTHER ignored group in the project is noise on a targeted request —
    // requestedButIgnored already covers what the human asked about.
    ignoredGroups: entry.wantsAll ? discovery.ignored : [],
    requestedButIgnoredGroups: resolved.requestedButIgnored,
    unknownGroups: [],
  };
  await writeJsonArtifact(syInputFileInfo(runKey), input);

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: AGENT_NAME,
      inputAI: [
        {
          type: 'system',
          content: `${AGENT_NAME} deterministic bootstrap. The root LLM is skipped by AgentIntentAddMessageAI.skipRootLLM — scope was decided by helpers/syEntry.ts and helpers/syDiscover.ts, both pure word/data matching.`,
        },
        { type: 'human', content: raw || AGENT_NAME },
      ],
      taskTitle: `Sync molecule catalog: ${resolved.selected.length === 1 ? resolved.selected[0].canonical : `${resolved.selected.length} grupos`}`,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { flowName: AGENT_NAME, runKey },
    },
  };

  const intents: mls.msg.AgentIntent[] = [addMessageAI];
  for (const group of resolved.selected) {
    intents.push(
      bootstrapAddStepIntent(context, {
        planId: syGroupPlanId(group.canonical),
        agentName: 'agentSyGroup',
        title: `s1 · ${group.canonical}`,
        dependsOn: [],
        status: 'waiting_human_input',
        prompt: { planId: syGroupPlanId(group.canonical), runKey, group: group.canonical, purpose: group.purpose, usageContract: group.usageContract },
      }),
    );
  }
  intents.push(
    bootstrapAddStepIntent(context, {
      planId: SY_PLAN_S2,
      agentName: 'agentSyProject',
      title: 's2 · skill.ts',
      dependsOn: resolved.selected.map(group => syGroupDoneAnchor(group.canonical)),
      status: 'waiting_dependency',
      prompt: { planId: SY_PLAN_S2, runKey },
    }),
  );
  intents.push(
    bootstrapAddStepIntent(context, {
      planId: SY_PLAN_S4,
      agentName: 'agentSyReport',
      title: 's4 · relatório',
      dependsOn: [syDoneAnchor(SY_PLAN_S2)],
      status: 'waiting_dependency',
      prompt: { planId: SY_PLAN_S4, runKey },
    }),
  );

  return intents;
}

/** The root's own "LLM" step never called a model (skipRootLLM) — nothing to read from its payload. */
async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  return [
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed without using the model payload (deterministic scope, no classifier).'),
  ];
}

// ---- helpers ----

/**
 * Planted with `parentStepId: 1`, same as agentChangeFrontend's bootstrap: there is no real parent step
 * object yet at this point in beforePromptImplicit — the addMessageAI intent in the same batch is what
 * creates it, and the platform's own convention for "the step this message became" is id 1.
 */
function bootstrapAddStepIntent(
  context: mls.msg.ExecutionContext,
  args: { planId: string; agentName: string; title: string; dependsOn: string[]; status: mls.msg.AIStepStatus; prompt: Record<string, unknown> },
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: '',
    parentStepId: 1,
    step: {
      type: 'agent',
      stepId: 0,
      interaction: null,
      stepTitle: args.title,
      status: args.status,
      nextSteps: [],
      agentName: args.agentName,
      prompt: JSON.stringify(args.prompt),
      rags: [],
      planning: { planId: args.planId, dependsOn: args.dependsOn, executionMode: 'sequential', executionHost: 'client' },
    } as mls.msg.AIAgentStep,
  } as mls.msg.AgentIntentAddStep;
}

/** Timestamp-based, always unique — a slug proposed from prose can collide across similar runs. */
function syRunKeyFromNow(): string {
  const iso = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '');
  return `sync-${iso.toLowerCase()}`;
}
