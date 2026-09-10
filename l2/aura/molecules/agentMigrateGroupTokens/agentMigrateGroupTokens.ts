/// <mls fileReference="_102020_/l2/aura/molecules/agentMigrateGroupTokens/agentMigrateGroupTokens.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Root of agentMigrateGroupTokens (spec: todo/moleculetokens/todo-casca-migracao-por-grupo.md).
// Entry: '@@agentMigrateGroupTokens <grupo canonico> [a partir de <shortName>]'
//
// A DISPATCH SHELL, not a decision-maker. It does not choose a token role, does not coordinate role
// choice between sibling molecules, does not verify coverage, does not re-run anything. It only
// replaces N manual '@@agentImproveMolecule2' dispatches with one command — see the control's
// "Por que existe" for the numbers that justify that, and "O que a casca NÃO faz" for the exact
// boundary.
//
// ⚠️ THIS ROOT SPENDS NO LLM CALL, EVER. Which group, which molecules, and which of them are even
// eligible are all deterministic — mention parsing (helpers/mgtEntry) and a stor scan
// (helpers/mgtFs, same primitive agentSyncMoleculeCatalog uses), never a classifier. Bootstrap uses
// `AgentIntentAddMessageAI.skipRootLLM`, same mechanism agentSyncMoleculeCatalog and
// agentChangeFrontend already ship with.
//
// ⚠️ ONE MOLECULE ALIVE AT A TIME — REENTRANT, NOT BATCHED. The first draft of this control planted
// all N molecules' i1/i2/i2r triples in one batch, like agentSyncMoleculeCatalog plants its N
// groups. That does NOT work here: every IM2 step emits its "done" anchor from its OWN hardcoded
// constant (`imDoneAnchor('i1-locate')` is always literally 'i1-done', in EVERY call, regardless of
// which molecule or runKey is running) — never from the planId that was actually planted. Two
// molecules "in the air" at once would share 'i1-done'/'i2-done', and the second molecule's
// i2-triage could unlock off the FIRST molecule's i1-locate, before its own i1-locate ever ran.
// `agentSyncMoleculeCatalog/helpers/syTypes.ts` already documents this exact failure shape for its
// own s1/s2 relationship (`syDoneAnchor`'s doc comment) — the fix there was a per-group anchor
// function, and that fix does NOT exist here, because nothing here derives the anchor from what was
// planted. Touching that is out of scope (Armadilha #4 below).
//
// So: only ONE molecule's triple is ever planted at a time. This agent plants a step of its OWN —
// `ADVANCE_PLAN_ID`, handled by this same file's `beforePromptStep`, exactly like IM2's own root
// handles its `i2r-route` router — that depends on the CURRENT molecule's `i7-done`. When it fires,
// there is nothing else in the tree waiting on 'i1-done'/'i2-done'/'i7-done' at that moment (the
// previous molecule's branch already resolved), so planting the NEXT molecule's triple with the same
// anchors is unambiguous. This is the same reentrant shape IM2's own root already uses for i2r-route
// (agentImproveMolecule2.ts): plant the step, let it wait, plant the next thing when it runs.
//
// ⚠️ A ROUTE THAT NEVER REACHES i7-summary (route D, "out of scope") never emits 'i7-done', so the
// chain stalls on that molecule — same accepted risk as any other failure (Armadilha #5): the human
// sees the stall in the Studio tree and resumes with '<grupo> a partir de <shortName>'. Not handled
// specially, on purpose — see "Tarefa 2.0" in the control for why detecting failure was abandoned.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { isBareMention, stripAgentMention } from '/_102020_/l2/aura/molecules/shared/mentionEntry.js';
import { readJsonArtifact, writeJsonArtifact } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { nmParseStepArgs, nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import { skills as skillList } from '/_102020_/l2/aura/molecules/skills/index';
import { IM_AGENT_NAME, imDoneAnchor } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';
import { mgtParseEntry } from '/_102020_/l2/aura/molecules/agentMigrateGroupTokens/helpers/mgtEntry.js';
import { mgtDefsMissingReason, mgtListMolecules, mgtProgressFileInfo } from '/_102020_/l2/aura/molecules/agentMigrateGroupTokens/helpers/mgtFs.js';
import {
  ADVANCE_PLAN_ID,
  MGT_AGENT_NAME,
  MgtProgress,
  MgtSkipped,
} from '/_102020_/l2/aura/molecules/agentMigrateGroupTokens/helpers/mgtTypes.js';

const AGENT_NAME = MGT_AGENT_NAME;

// The prompt every molecule's i2-triage/i3-edit sees, verbatim, in every branch. FIXED and never
// molecule-specific: it travels through `context.task.iaCompressed.longMemory.prompt`
// (`getImInput`), shared by the WHOLE task — naming one molecule here would hand every OTHER
// molecule the wrong name.
const MIGRATION_PROMPT =
  "the appearance of this molecule must move to the design-system tokens approved by the team, in place of the old `--ml-*` vocabulary. Swap each token's NAME for the right design-system role, choosing the role by the PLACE it is used (background, text, border). Keep the fallback value the sheet already uses — the migration must not change anything visually. Tokens the design system does not cover (border width and style, focus ring thickness, disabled opacity, status borders) stay `--ml-*`.";

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: 'aura/molecules/agentMigrateGroupTokens',
    agentDescription:
      "Migrates every molecule of one group from --ml-* to design-system tokens, one @@agentImproveMolecule2 pass per molecule, chained in series. '@@agentMigrateGroupTokens <group> [a partir de <shortName>]'.",
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const text = stripAgentMention(userPrompt, agent.agentName);
  const raw = isBareMention(text) ? '' : text;
  const entry = mgtParseEntry(raw);
  const runKey = mgtRunKeyFromNow();

  // ⚠️ NOTHING HERE THROWS — same reason as agentSyncMoleculeCatalog's own bootstrap: the platform's
  // executeBeforePromptStream has no try/catch around beforePromptImplicit, so a throw becomes an
  // uncaught promise rejection and the user sees an empty screen. Every problem becomes `refusal`,
  // the task is created anyway, and the advance step alone reports it.
  const resolved = entry.error ? null : await resolveGroupAndQueue(entry);
  const refusal = entry.error || resolved?.refusal || '';
  const groupFolder = resolved?.groupFolder || '';
  const groupCanonical = resolved?.groupCanonical || '';
  const queue = resolved?.queue || [];
  const skipped = resolved?.skipped || [];

  const progress: MgtProgress = {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    runKey,
    groupFolder,
    groupCanonical,
    refusal,
    queue,
    current: 0,
    skipped,
    done: [],
  };
  await writeJsonArtifact(mgtProgressFileInfo(runKey), progress);

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: AGENT_NAME,
      inputAI: [
        {
          type: 'system',
          content: `${AGENT_NAME} deterministic bootstrap. The root LLM is skipped by AgentIntentAddMessageAI.skipRootLLM — scope was decided by helpers/mgtEntry.ts (mention parsing) and helpers/mgtFs.ts (a stor scan), both pure/deterministic.`,
        },
        { type: 'human', content: raw || AGENT_NAME },
      ],
      taskTitle: refusal ? 'Migrate group tokens: nada a fazer' : `Migrate group tokens: ${groupCanonical} (${queue.length} molécula(s))`,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { flowName: AGENT_NAME, runKey, prompt: MIGRATION_PROMPT },
    },
  };

  const intents: mls.msg.AgentIntent[] = [addMessageAI];

  if (refusal || !queue.length) {
    // Nothing to plant: the advance step alone, immediately runnable, reports the refusal.
    intents.push(bootstrapAddStep(context, { planId: ADVANCE_PLAN_ID, agentName: AGENT_NAME, title: 'mgt-advance · relatório', dependsOn: [], runKey }));
    return intents;
  }

  intents.push(
    ...plantMoleculeBootstrap(context, groupFolder, queue[0], moleculeRunKey(queue[0])),
    bootstrapAddStep(context, {
      planId: ADVANCE_PLAN_ID,
      agentName: AGENT_NAME,
      title: `mgt-advance (1/${queue.length})`,
      dependsOn: [imDoneAnchor('i7-summary')],
      runKey,
    }),
  );
  return intents;
}

/**
 * PHASE 2 — the reentrant advance step. Deterministic, no LLM: it reads progress.json, records the
 * molecule that just finished, and either plants the next one (+ another instance of itself) or,
 * when the queue is exhausted, reports and stops.
 */
async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const parsedArgs = nmParseStepArgs(args ?? step.prompt);
  if (parsedArgs.planId !== ADVANCE_PLAN_ID) {
    throw new Error(`[${AGENT_NAME}] unexpected step '${parsedArgs.planId || '(none)'}' — the root only handles ${ADVANCE_PLAN_ID}`);
  }
  const runKey = parsedArgs.runKey || '';
  if (!runKey) throw new Error(`[${AGENT_NAME}] runKey missing on the advance step`);

  const progress = await readJsonArtifact<MgtProgress>(mgtProgressFileInfo(runKey), true);
  if (!progress) throw new Error(`[${AGENT_NAME}] progress.json missing for ${runKey}`);

  // Refusal, or every molecule failed pre-validation: nothing was ever planted, report as-is.
  if (progress.refusal || !progress.queue.length) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', mgtReportSummary(progress), 'input_output')];
  }

  const justFinished = progress.queue[progress.current];
  const done = [...progress.done, justFinished];
  const nextIndex = progress.current + 1;

  if (nextIndex >= progress.queue.length) {
    const finished: MgtProgress = { ...progress, done, current: nextIndex };
    await writeJsonArtifact(mgtProgressFileInfo(runKey), finished);
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', mgtReportSummary(finished), 'input_output')];
  }

  const nextShortName = progress.queue[nextIndex];
  const updated: MgtProgress = { ...progress, done, current: nextIndex };
  await writeJsonArtifact(mgtProgressFileInfo(runKey), updated);

  return [
    ...plantMolecule(context, step, progress.groupFolder, nextShortName, moleculeRunKey(nextShortName)),
    addStep(context, step, {
      planId: ADVANCE_PLAN_ID,
      agentName: AGENT_NAME,
      title: `mgt-advance (${nextIndex + 1}/${progress.queue.length})`,
      dependsOn: [imDoneAnchor('i7-summary')],
      runKey,
    }),
    nmUpdateStatusIntent(
      context,
      parentStep,
      step,
      hookSequential,
      'completed',
      `${justFinished} done — starting ${nextShortName} (${nextIndex + 1}/${progress.queue.length})`,
      'input_output',
    ),
  ];
}

// ---- resolution (group -> canonical + queue), impure but deterministic ----

async function resolveGroupAndQueue(
  entry: { group: string; startFrom: string | null },
): Promise<{ refusal: string; groupFolder: string; groupCanonical: string; queue: string[]; skipped: MgtSkipped[] }> {
  const matched = skillList.find(item => item.name.toLowerCase() === entry.group.trim().toLowerCase());
  if (!matched) {
    return { refusal: `'${entry.group}' is not a group in skills/index.ts`, groupFolder: '', groupCanonical: '', queue: [], skipped: [] };
  }
  const groupFolder = matched.name.toLowerCase();
  const groupCanonical = matched.name;

  const all = mgtListMolecules(groupFolder);
  if (!all.length) {
    return { refusal: `group '${groupCanonical}' has no molecules on disk`, groupFolder, groupCanonical, queue: [], skipped: [] };
  }

  let candidates = all;
  if (entry.startFrom) {
    const at = all.indexOf(entry.startFrom);
    if (at === -1) {
      return {
        refusal: `'${entry.startFrom}' is not a molecule of '${groupCanonical}' — known: ${all.join(', ')}`,
        groupFolder,
        groupCanonical,
        queue: [],
        skipped: [],
      };
    }
    candidates = all.slice(at);
  }

  const queue: string[] = [];
  const skipped: MgtSkipped[] = [];
  for (const shortName of candidates) {
    const reason = await mgtDefsMissingReason(groupFolder, shortName);
    if (reason) skipped.push({ shortName, reason });
    else queue.push(shortName);
  }

  const refusal = queue.length ? '' : `every molecule of '${groupCanonical}' failed pre-validation — nothing to migrate (${skipped.map(s => s.shortName).join(', ')})`;
  return { refusal, groupFolder, groupCanonical, queue, skipped };
}

// ---- planting the three steps IM2's own root plants, per molecule ----

function plantMoleculeBootstrap(context: mls.msg.ExecutionContext, groupFolder: string, shortName: string, runKey: string): mls.msg.AgentIntentAddStep[] {
  return [
    bootstrapAddStep(context, { planId: 'i1-locate', agentName: 'agentIm2Locate', title: `i1-locate · ${shortName}`, dependsOn: [], runKey, target: `${groupFolder}/${shortName}` }),
    bootstrapAddStep(context, { planId: 'i2-triage', agentName: 'agentIm2Triage', title: `i2-triage · ${shortName}`, dependsOn: [imDoneAnchor('i1-locate')], runKey }),
    bootstrapAddStep(context, { planId: 'i2r-route', agentName: IM_AGENT_NAME, title: `i2r-route · ${shortName}`, dependsOn: [imDoneAnchor('i2-triage')], runKey }),
  ];
}

function plantMolecule(
  context: mls.msg.ExecutionContext,
  parent: mls.msg.AIAgentStep,
  groupFolder: string,
  shortName: string,
  runKey: string,
): mls.msg.AgentIntentAddStep[] {
  return [
    addStep(context, parent, { planId: 'i1-locate', agentName: 'agentIm2Locate', title: `i1-locate · ${shortName}`, dependsOn: [], runKey, target: `${groupFolder}/${shortName}` }),
    addStep(context, parent, { planId: 'i2-triage', agentName: 'agentIm2Triage', title: `i2-triage · ${shortName}`, dependsOn: [imDoneAnchor('i1-locate')], runKey }),
    addStep(context, parent, { planId: 'i2r-route', agentName: IM_AGENT_NAME, title: `i2r-route · ${shortName}`, dependsOn: [imDoneAnchor('i2-triage')], runKey }),
  ];
}

function moleculeRunKey(shortName: string): string {
  return `tokens-${shortName}`;
}

// ---- helpers ----

interface AddStepArgs {
  planId: string;
  agentName: string;
  title: string;
  dependsOn: string[];
  runKey: string;
  target?: string;
}

function stepPayload(args: AddStepArgs): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: args.title,
    // 'waiting_human_input' runs immediately (empty dependsOn); 'waiting_dependency' waits on the anchors.
    status: args.dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    nextSteps: [],
    agentName: args.agentName,
    prompt: JSON.stringify({ planId: args.planId, runKey: args.runKey, ...(args.target ? { target: args.target } : {}) }),
    rags: [],
    planning: { planId: args.planId, dependsOn: args.dependsOn, executionMode: 'sequential', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
}

/**
 * Planted with `parentStepId: 1`, same as agentSyncMoleculeCatalog's own bootstrap: there is no
 * real parent step object yet inside `beforePromptImplicit` — the `add-message-ai` intent in the
 * same batch is what creates it, and the platform's convention for "the step this message became"
 * is id 1.
 */
function bootstrapAddStep(context: mls.msg.ExecutionContext, args: AddStepArgs): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: '',
    parentStepId: 1,
    step: stepPayload(args),
  } as mls.msg.AgentIntentAddStep;
}

/**
 * The reentrant form, used from `beforePromptStep` where a real parent step exists.
 *
 * ⚠️ Copied from `agentImproveMolecule2.ts`'s own `addStep`, with `target` added to the prompt —
 * the ONE thing Tarefa 1 made `i1-locate` accept. The original is not touched (Armadilha #4).
 */
function addStep(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, args: AddStepArgs): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parent.stepId,
    step: stepPayload(args),
  } as mls.msg.AgentIntentAddStep;
}

function mgtRunKeyFromNow(): string {
  const iso = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '');
  return `migrate-${iso.toLowerCase()}`;
}

function mgtReportSummary(progress: MgtProgress): string {
  if (progress.refusal) return progress.refusal;
  const lines = [
    `${progress.groupCanonical}: ${progress.done.length}/${progress.queue.length} molécula(s) migrada(s)`,
    progress.done.length ? `rodaram: ${progress.done.join(', ')}` : '',
    progress.skipped.length ? `não migráveis (pré-validação): ${progress.skipped.map(s => `${s.shortName} (${s.reason})`).join('; ')}` : '',
  ];
  return lines.filter(Boolean).join('\n');
}
