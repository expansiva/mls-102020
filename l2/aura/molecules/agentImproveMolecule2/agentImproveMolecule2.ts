/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/agentImproveMolecule2.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Root of the Improve Molecule 2 pipeline (spec: flow.json / spec.md in this folder).
// Entry: @@agentImproveMolecule2 <what to change, on which molecule>. PROSE ONLY —
// mls.common.safeParseArgs is never called on it, because it throws on anything that is not an
// object literal.
//
// The root's own message call IS i0-classify: pull the molecule out of the prose, detect the
// language, propose the runKey and localize the step titles. Everything the molecule implies — its
// group, its artifacts, whether it is a shell — is resolved deterministically by i1-locate.
//
// ⚠️ THE TREE IS PLANTED IN TWO PHASES, and that is the one structural difference from
// agentNewMolecule2, whose eight steps always run and are planted at once.
//
// Here the route is not known until i2-triage answers, and the branches cannot all be planted:
// i3-edit waits on i2-done on route B and on i4-done on route C, and an anchor list containing
// both would be an AND — the branch that was never planted would hang the one that was
// (flow.json.routes.note).
//
// So: phase 1 plants i1, i2 and a ROUTER step handled by this same agent; when i2-done lands the
// router reads the route and plants that branch. The successor knowledge stays in ONE table here
// and is never scattered across the steps' after-hooks — the pattern agentsBestPractices §6 names
// as the reason reordering agentChangeBackend meant editing ~20 files.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { isBareMention, stripAgentMention } from '/_102020_/l2/aura/molecules/shared/mentionEntry.js';
import { isRecord, parseMaybeJson } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { nmRunKey } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';
import { nmParseStepArgs, nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import {
  IM_AGENT_FOLDER,
  IM_AGENT_NAME,
  ImPlanId,
  ImRoute,
  imDoneAnchor,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';
import { getImRootPlan, normalizeImRootPlan } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imRootPlan.js';
import { checkImClassification } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i1-locate/gate.js';

const AGENT_NAME = IM_AGENT_NAME;

/** The router is handled by the root itself, so it has no agent of its own. */
const ROUTER_PLAN_ID = 'i2r-route';

/**
 * Step agents that EXIST. A route naming anything absent fails readably instead of planting a
 * step whose agent cannot be resolved — which surfaces at runtime as a dead tree node.
 */
const STEP_AGENTS: Partial<Record<ImPlanId, string>> = {
  'i1-locate': 'agentIm2Locate',
  'i2-triage': 'agentIm2Triage',
  'i2a-definition': 'agentIm2Definition',
  'i3-edit': 'agentIm2Edit',
  'i4-inherit': 'agentIm2Inherit',
  'i5-playground': 'agentIm2Playground',
  'i6-index': 'agentIm2Index',
  'i7-summary': 'agentIm2Summary',
};

/**
 * flow.json.routes, as data. Phase 1 is common to every route and is not listed here.
 *
 * ⚠️ ROUTE A IS AN EDIT, NOT A REBUILD (2026-08-14). It was specced as a handoff to
 * agentNewMolecule2 and blocked for that reason since 2026-08-06: NM2 refuses to overwrite an
 * existing molecule, and route A acts on one by definition. Editing in place dissolves the problem
 * and reuses steps that already exist — i3 writes `.defs.ts` and `.ts`, i5 regenerates the
 * playground because the surface moved, i6 follows. Only the checkpoint was missing.
 *
 * It is also the only route that reaches the ACTIVE branch of i5 and i6: they decide by measuring
 * the surface, every surface movement is route A, and a sweep of the 154 base molecules on
 * 2026-08-14 found no route B change that moves it. Until this route ran, half the pipeline had
 * never executed.
 */
const ROUTE_STEPS: Record<ImRoute, ImPlanId[]> = {
  A: ['i2a-definition', 'i3-edit', 'i5-playground', 'i6-index', 'i7-summary'],
  B: ['i3-edit', 'i5-playground', 'i6-index', 'i7-summary'],
  C: ['i4-inherit', 'i3-edit', 'i5-playground', 'i6-index', 'i7-summary'],
  D: [],
};

/**
 * Steps declared by a route and not implemented yet.
 *
 * They are SKIPPED, not planted, and the run says so at the end. The alternative — planting them —
 * puts a node in the tree whose agent does not resolve, which reads to the user as a crash rather
 * than as "this part is not built".
 *
 * Empty since 2026-08-14, when route A was built. The mechanism stays: it is what keeps a
 * half-declared route from reading as a crash, and the next route added will want it.
 */
const NOT_BUILT: Partial<Record<ImPlanId, string>> = {};

interface IDataPrompt {
  prompt?: string;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: IM_AGENT_FOLDER,
    agentDescription: 'Changes an existing molecule from a prose request: triages it into a minor edit, an inherited-shell fix with a checkpoint, or a rebuild, and keeps the contract, the playground and the group index in step',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
    scope: ['l2_preview'],
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  let prompt: string;
  if (context.isTest) {
    const testData = JSON.parse(userPrompt || '{}') as IDataPrompt;
    prompt = (testData.prompt || '').trim();
  } else {
    const text = stripAgentMention(userPrompt, agent.agentName);
    prompt = isBareMention(text) ? '' : text;
  }
  if (prompt.length < 5) {
    throw new Error(
      `[${AGENT_NAME}] say what to change and on which molecule, e.g. '@@${AGENT_NAME} ml-data-table: the pagination looks disabled, the buttons are too faded'`,
    );
  }

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: rootPlanSystemPrompt },
        { type: 'human', content: JSON.stringify({ prompt }) },
      ],
      taskTitle: 'Improve molecule',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { flowName: AGENT_NAME, prompt },
    },
  };
  return [addMessageAI];
}

/** PHASE 1 — the classification landed. Plant i1, i2 and the router. */
async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  try {
    const plan = normalizeImRootPlan(step.interaction?.payload?.[0]);
    if (!plan.validInput) {
      return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', plan.reason || 'Invalid input')];
    }

    // Fail here rather than one step later: the classification gate is shared with i1-locate, so
    // prose that names no molecule is refused before anything searches 31 groups for it.
    const gate = checkImClassification(plan);
    if (!gate.ok) {
      return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', gate.errors.join('\n'))];
    }

    const runKey = nmRunKey(plan.runKey || plan.target, 'improve');
    const titles = readTitles(step.interaction?.payload?.[0]);

    return [
      addStep(context, step, {
        planId: 'i1-locate',
        agentName: STEP_AGENTS['i1-locate']!,
        title: titles['i1-locate'] || 'i1-locate',
        dependsOn: [],
        runKey,
        first: true,
      }),
      addStep(context, step, {
        planId: 'i2-triage',
        agentName: STEP_AGENTS['i2-triage']!,
        title: titles['i2-triage'] || 'i2-triage',
        dependsOn: [imDoneAnchor('i1-locate')],
        runKey,
      }),
      // The router. Handled by this agent's beforePromptStep, which plants the branch.
      addStep(context, step, {
        planId: ROUTER_PLAN_ID,
        agentName: AGENT_NAME,
        title: titles[ROUTER_PLAN_ID] || 'route',
        dependsOn: [imDoneAnchor('i2-triage')],
        runKey,
      }),
    ];
  } catch (error) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}

/**
 * PHASE 2 — the router. Deterministic, no LLM: it reads i2's result and plants that branch.
 *
 * It is a hook on the ROOT and not a step agent of its own because it holds no logic of its own —
 * it is the routing table, and the table belongs where the tree is planted.
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
  if (parsedArgs.planId !== ROUTER_PLAN_ID) {
    throw new Error(`[${AGENT_NAME}] unexpected step '${parsedArgs.planId || '(none)'}' — the root only handles ${ROUTER_PLAN_ID}`);
  }

  const runKey = parsedArgs.runKey || getImRootPlan(context).runKey;
  const decision = readTriageResult(context);
  if (!decision.route) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', 'the triage result could not be read — no route to plant')];
  }

  const route = decision.route;
  const planned = ROUTE_STEPS[route] || [];

  // Route D wrote nothing and has nothing to plant: the rationale IS the answer.
  if (!planned.length) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', decision.rationale || `route ${route}: nothing to do`, 'input_output')];
  }

  // A route whose FIRST step is missing cannot start at all. No route is in that state since route A
  // was built (2026-08-14), and the branch stays because it is the one that keeps a half-declared
  // route from reading as a crash.
  //
  // The message carries WHY this route was chosen, and it must. Without it the user is told "the
  // route is not built" and has no way to tell a correct classification from a mis-routing — which is
  // the first thing they need to know, because one of the two is a missing feature and the other is a
  // defect in the triage prompt.
  const firstMissing = NOT_BUILT[planned[0]];
  if (firstMissing) {
    const because = [
      decision.rationale ? `Why route ${route}: ${decision.rationale}` : '',
      decision.definitionElements.length
        ? `What it says changes in the public definition: ${decision.definitionElements.join('; ')}`
        : '',
      'If that reading is wrong — nothing in the public definition (slots, properties, events) actually changes — say so and the request is a route B edit.',
    ].filter(Boolean).join('\n');
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `${firstMissing}\n\n${because}`)];
  }

  const runnable = planned.filter(planId => !NOT_BUILT[planId] && STEP_AGENTS[planId]);
  const skipped = planned.filter(planId => NOT_BUILT[planId]);

  const intents: mls.msg.AgentIntent[] = [];
  let previous: ImPlanId | null = null;
  for (const planId of runnable) {
    intents.push(addStep(context, step, {
      planId,
      agentName: STEP_AGENTS[planId]!,
      title: planId,
      dependsOn: previous ? [imDoneAnchor(previous)] : [],
      runKey,
      first: !previous,
    }));
    previous = planId;
  }

  // No silent truncation: a step this route declares and cannot run is named to the user.
  const note = skipped.length
    ? `route ${route} — ${runnable.join(' → ')}\n${skipped.map(planId => NOT_BUILT[planId]).join('\n')}`
    : `route ${route} — ${runnable.join(' → ')}`;
  intents.push(nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', note, 'input_output'));
  return intents;
}

// ---- helpers ----

function addStep(
  context: mls.msg.ExecutionContext,
  parent: mls.msg.AIAgentStep,
  args: { planId: string; agentName: string; title: string; dependsOn: string[]; runKey: string; first?: boolean },
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parent.stepId,
    step: {
      type: 'agent',
      stepId: 0,
      interaction: null,
      stepTitle: args.title,
      // 'waiting_human_input' runs immediately; 'waiting_dependency' waits on the anchors.
      status: args.first ? 'waiting_human_input' : 'waiting_dependency',
      nextSteps: [],
      agentName: args.agentName,
      prompt: JSON.stringify({ planId: args.planId, runKey: args.runKey }),
      rags: [],
      planning: {
        planId: args.planId,
        dependsOn: args.dependsOn,
        executionMode: 'sequential',
        executionHost: 'client',
      },
    } as mls.msg.AIAgentStep,
  } as mls.msg.AgentIntentAddStep;
}

/** i2-triage's answer, read from the anchor result it planted. */
function readTriageResult(context: mls.msg.ExecutionContext): { route: ImRoute | null; rationale: string; definitionElements: string[] } {
  const anchor = imDoneAnchor('i2-triage');
  const found = getAllSteps(context.task?.iaCompressed?.nextSteps).find(
    item => item.type === 'result' && item.planning?.planId === anchor,
  ) as mls.msg.AIResultStep | undefined;

  const parsed = parseMaybeJson(found?.result);
  if (!isRecord(parsed)) return { route: null, rationale: '', definitionElements: [] };
  const route = String(parsed.route || '').trim().toUpperCase();
  return {
    route: (['A', 'B', 'C', 'D'].includes(route) ? route : null) as ImRoute | null,
    rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '',
    // On route A these ARE the argument: they name the slots, properties or events that changed.
    definitionElements: Array.isArray(parsed.definitionElements)
      ? parsed.definitionElements.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

function readTitles(payload: unknown): Record<string, string> {
  const parsed = parseMaybeJson(payload);
  const record = isRecord(parsed) ? parsed : {};
  const result = isRecord(parseMaybeJson(record.result)) ? (parseMaybeJson(record.result) as Record<string, unknown>) : record;
  const titles = parseMaybeJson(result.titles);
  if (!isRecord(titles)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(titles)) {
    if (typeof value === 'string' && value.trim()) out[key] = value.trim();
  }
  return out;
}

const rootPlanSystemPrompt = `
<!-- modelType: classifier -->

You are the entry point of a flow that CHANGES a molecule (a web component) that already exists.

This is a cheap classification. You do not decide what to change or how — later steps do, reading the code. You only read the prose.

Tasks:
1. validInput: false ONLY when the prompt is clearly not a request to change an existing UI component (e.g. it asks to CREATE a new component, or asks for a backend routine, a document, or is unintelligible). When it asks to create something new, say so in reason and name @@agentNewMolecule2. Everything else is validated later by deterministic code — do NOT over-reject.
2. target: the molecule the user is talking about, as 'ml-<name>' or '<group>/ml-<name>'. Copy the name as written; do not correct or complete it. If the prose names no molecule, set validInput false and say so.
3. runKey: a short kebab-case slug naming the intent (e.g. 'pagination-colors', 'detail-slot'). It names a work folder. Max 40 characters, ascii letters/digits/dashes.
4. userLanguage: detect from the prompt ('pt' | 'en' | ...); default 'pt' when ambiguous.
5. title: a SHORT task title in the detected language.
6. titles: SHORT step titles in the detected language for each planId:
   i1-locate (find the molecule and read its files), i2-triage (decide how to handle the change), i2r-route (plan the steps), i3-edit (apply the change), i4-inherit (ask where the fix goes), i5-playground (update the demo page), i6-index (update the group page), i7-summary (summary and coherence report).

## Output format
You must return the object strictly as JSON
[[OutputSection]]
`;

//#region OutputSection
export type Output = {
  type: 'flexible';
  result: {
    validInput: boolean;
    reason?: string;
    target: string;
    runKey: string;
    userLanguage: string;
    title: string;
    titles: {
      'i1-locate': string;
      'i2-triage': string;
      'i2r-route': string;
      'i3-edit': string;
      'i4-inherit': string;
      'i5-playground': string;
      'i6-index': string;
      'i7-summary': string;
    };
  };
};
//#endregion OutputSection
