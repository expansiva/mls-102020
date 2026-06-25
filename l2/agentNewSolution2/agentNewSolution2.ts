/// <mls fileReference="_102020_/l2/agentNewSolution2/agentNewSolution2.ts" enhancement="_102027_/l2/enhancementAgent"/>

// ROOT of the agentNewSolution2 flow (Stage 1 — the behavior contract). Mirrors
// agentNewSolution2/flow.json: it interprets the user's request, then builds the planned tree of
// four containers (requirements -> domain -> behavior -> handoff). Stage 1 delivers ONLY the durable
// business model (ontology + rules + workflows + operations) and stops before screens (Stage 2) and
// backend persistence (Stage 3), which start as separate tasks consuming the frozen l4 artifacts.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getExistingModuleFolders, saveTraceMemorySeed } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import {
  normalizeInitialPlan,
  PLAN_IDS,
  type InitialNewSolution2Plan,
  type NewSolution2PlanId,
} from '/_102020_/l2/agentNewSolution2/ns2Plan.js';

export { PLAN_IDS };
export type { InitialNewSolution2Plan, NewSolution2PlanId };

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentNewSolution2',
    agentProject: 102020,
    agentFolder: 'agentNewSolution2',
    agentDescription: 'Stage 1 — design the durable business model (ontology, rules, workflows, operations)',
    visibility: 'public',
    beforePromptImplicit,
    afterPromptStep,
  };
}

type ExecutionMode = 'sequential' | 'parallel_static' | 'parallel_dynamic' | 'manual_later';

interface StepPlanning {
  planId: NewSolution2PlanId;
  dependsOn: NewSolution2PlanId[];
  executionMode: ExecutionMode;
  executionHost: 'client' | 'server' | 'either';
  dynamicSource?: { sourcePlanId: NewSolution2PlanId; selectorField: string; argsField: string };
}

type PlannedAgentStep = mls.msg.AIAgentStep & { planning: StepPlanning };
type PlannedClarificationStep = mls.msg.AIClarificationStep & { planning: StepPlanning };
type PlannedStep = PlannedAgentStep | PlannedClarificationStep;

async function beforePromptImplicit(agent: IAgentMeta, context: mls.msg.ExecutionContext, userPrompt: string): Promise<mls.msg.AgentIntent[]> {
  const normalized = (userPrompt || '').trim();
  if (normalized.length < 5) throw new Error('invalid prompt');
  const folders = Array.from(getExistingModuleFolders());

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: systemPrompt.replace('{{folders}}', folders.join(', ')).replace('{{planIds}}', PLAN_IDS.join(', ')) },
        { type: 'human', content: normalized },
      ],
      taskTitle: 'newSolution2',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { taskName: 'newSolution2', flowName: 'newSolution2', ...saveTraceMemorySeed() },
    },
  };
  return [addMessageAI];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  if (!agent || !context || !step) throw new Error(`[afterPromptStep] invalid params`);
  // The root step has no resolvable parent; surface any failure as a failed self-update so the task
  // does not stall silently.
  try {
    const payload = step.interaction?.payload?.[0] as Output | undefined;
    if (!payload) throw new Error('[afterPromptStep] missing payload');

    if (payload.type === 'result') {
      const reason = typeof payload.result === 'string' && payload.result.trim() ? payload.result.trim() : 'agentNewSolution2 returned an error result';
      return [failSelf(context, parentStep, step, hookSequential, reason)];
    }
    if (payload.type !== 'flexible' || !payload.result) throw new Error(`[afterPromptStep] invalid payload: ${JSON.stringify(payload)}`);

    const initialPlan = normalizeInitialPlan(payload.result, getExistingModuleFolders());
    payload.result.moduleName = initialPlan.moduleName; // tentative only; confirmed by the blueprint

    return buildPlannedTree(initialPlan).map(plannedStep => ({
      type: 'add-step',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      parentStepId: step.stepId,
      step: plannedStep,
    } as mls.msg.AgentIntentAddStep));
  } catch (error) {
    return [failSelf(context, parentStep, step, hookSequential, `[agentNewSolution2] ${error instanceof Error ? error.message : String(error)}`)];
  }
}

function failSelf(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, traceMsg: string): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep?.stepId ?? step.stepId,
    stepId: step.stepId,
    status: 'failed',
    traceMsg,
  };
}

function buildPlannedTree(initialPlan: InitialNewSolution2Plan): PlannedAgentStep[] {
  const title = (planId: NewSolution2PlanId) => getTitle(initialPlan, planId);

  const requirementsChildren: PlannedStep[] = [
    clarification('req-clarification-answer', title('req-clarification-answer'), ['org-requirements']),
    agentStep('req-discover-scope', 'agentNs2DiscoverScope', title('req-discover-scope'), ['req-clarification-answer'], 'sequential'),
    agentStep('req-recommend-implementations', 'agentNs2Recommend', title('req-recommend-implementations'), ['req-discover-scope'], 'sequential'),
    clarification('req-implementation-decisions', title('req-implementation-decisions'), ['req-recommend-implementations']),
  ];

  const domainChildren: PlannedStep[] = [
    agentStep('plan-solution-blueprint', 'agentNs2Blueprint', title('plan-solution-blueprint'), ['req-implementation-decisions'], 'sequential'),
    agentStep('plan-blueprint-review', 'agentNs2BlueprintReview', title('plan-blueprint-review'), ['plan-solution-blueprint'], 'sequential'),
    agentStep('plan-finalize-solution-plan', 'agentNs2Finalize', title('plan-finalize-solution-plan'), ['plan-blueprint-review'], 'sequential'),
    // Per-entity ontology enrichment fan-out, spawned by agentNs2Finalize once the plan is frozen.
    agentStep('plan-entity-definition', 'agentNs2EntityDefinition', title('plan-entity-definition'), ['plan-finalize-solution-plan'], 'parallel_dynamic', {
      sourcePlanId: 'plan-finalize-solution-plan', selectorField: 'entityId', argsField: 'entityId',
    }),
    agentStep('plan-mdm', 'agentNs2Mdm', title('plan-mdm'), ['plan-finalize-solution-plan'], 'parallel_static'),
    agentStep('plan-horizontals', 'agentNs2Horizontals', title('plan-horizontals'), ['plan-finalize-solution-plan'], 'parallel_static'),
    agentStep('plan-plugins', 'agentNs2Plugins', title('plan-plugins'), ['plan-finalize-solution-plan'], 'parallel_static'),
  ];

  const behaviorChildren: PlannedStep[] = [
    agentStep('plan-behavior-classification', 'agentClassifyBehavior', title('plan-behavior-classification'), ['plan-finalize-solution-plan', 'plan-entity-definition'], 'sequential'),
    agentStep('plan-workflow-index', 'agentNs2WorkflowIndex', title('plan-workflow-index'), ['plan-behavior-classification'], 'sequential'),
    agentStep('plan-workflow-definition', 'agentNs2WorkflowDefinition', title('plan-workflow-definition'), ['plan-workflow-index'], 'parallel_dynamic', {
      sourcePlanId: 'plan-workflow-index', selectorField: 'workflowId', argsField: 'workflowId',
    }),
    agentStep('plan-operation-index', 'agentPlanOperationIndex', title('plan-operation-index'), ['plan-behavior-classification'], 'sequential'),
    agentStep('plan-operation-definition', 'agentPlanOperationDefinition', title('plan-operation-definition'), ['plan-operation-index'], 'parallel_dynamic', {
      sourcePlanId: 'plan-operation-index', selectorField: 'operationId', argsField: 'operationId',
    }),
  ];

  const handoffChildren: PlannedStep[] = [
    agentStep('behavior-validate', 'agentValidateBehaviorModel', title('behavior-validate'), ['org-handoff'], 'sequential'),
    // Auto-finish (no blocking clarification): writes the run record + derived journeys, cleans
    // traces/inputs/outputs, completes the task. The summary is viewable later via openStepView.
    agentStep('final-resume', 'agentNewSolution2Final', title('final-resume'), ['behavior-validate'], 'sequential'),
  ];

  return [
    agentStep('org-requirements', 'agentNewSolution2Requirements', title('org-requirements'), [], 'sequential', undefined, requirementsChildren, 'waiting_human_input'),
    agentStep('org-domain', 'agentNewSolution2Domain', title('org-domain'), ['org-requirements'], 'sequential', undefined, domainChildren),
    agentStep('org-behavior', 'agentNewSolution2Behavior', title('org-behavior'), ['org-domain'], 'sequential', undefined, behaviorChildren),
    agentStep('org-handoff', 'agentNewSolution2Handoff', title('org-handoff'), ['plan-workflow-definition', 'plan-operation-definition'], 'sequential', undefined, handoffChildren),
  ];
}

function agentStep(
  planId: NewSolution2PlanId,
  agentName: string,
  stepTitle: string,
  dependsOn: NewSolution2PlanId[],
  executionMode: ExecutionMode,
  dynamicSource?: StepPlanning['dynamicSource'],
  nextSteps: PlannedStep[] = [],
  status: mls.msg.AIStepStatus = 'waiting_dependency',
): PlannedAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle,
    status,
    nextSteps,
    agentName,
    prompt: JSON.stringify({ planId }),
    rags: [],
    planning: { planId, dependsOn, executionMode, executionHost: 'client', dynamicSource },
  };
}

function clarification(planId: NewSolution2PlanId, stepTitle: string, dependsOn: NewSolution2PlanId[]): PlannedClarificationStep {
  return {
    type: 'clarification',
    stepId: 0,
    interaction: null,
    stepTitle,
    status: 'waiting_dependency',
    nextSteps: [],
    json: JSON.stringify({ planId }),
    planning: { planId, dependsOn, executionMode: 'sequential', executionHost: 'client' },
  };
}

const FORCED_TITLE_PLAN_IDS = new Set<NewSolution2PlanId>(['org-handoff', 'final-resume']);

function getTitle(initialPlan: InitialNewSolution2Plan, planId: NewSolution2PlanId): string {
  if (!FORCED_TITLE_PLAN_IDS.has(planId)) {
    const title = initialPlan.titles?.[planId];
    if (typeof title === 'string' && title.trim().length > 0 && title.trim().length < 140) return title.trim();
  }
  const lang = (initialPlan.userLanguage || '').toLowerCase().trim();
  return (lang.startsWith('pt') ? titlesPt : titlesEn)[planId];
}

const titlesEn: Record<NewSolution2PlanId, string> = {
  'org-requirements': 'Requirements',
  'req-clarification-answer': 'Answer initial clarification',
  'req-discover-scope': 'Discover scope',
  'req-recommend-implementations': 'Recommend implementations',
  'req-implementation-decisions': 'Confirm implementation decisions',
  'org-domain': 'Domain (ontology and rules)',
  'plan-solution-blueprint': 'Create blueprint',
  'plan-blueprint-review': 'Review blueprint',
  'plan-finalize-solution-plan': 'Finalize domain plan',
  'plan-entity-definition': 'Detail ontology entities',
  'plan-mdm': 'Plan MDM references',
  'plan-horizontals': 'Plan horizontal references',
  'plan-plugins': 'Plan plugin references',
  'org-behavior': 'Behavior (workflows and operations)',
  'plan-behavior-classification': 'Classify behavior',
  'plan-workflow-index': 'Index workflows',
  'plan-workflow-definition': 'Define workflows',
  'plan-operation-index': 'Index operations',
  'plan-operation-definition': 'Define operations',
  'org-handoff': 'Freeze behavior model',
  'behavior-validate': 'Validate behavior model',
  'final-resume': 'Stage 1 summary',
};

const titlesPt: Record<NewSolution2PlanId, string> = {
  'org-requirements': 'Requisitos',
  'req-clarification-answer': 'Responder clarificacao inicial',
  'req-discover-scope': 'Descobrir escopo',
  'req-recommend-implementations': 'Recomendar implementacoes',
  'req-implementation-decisions': 'Confirmar decisoes de implementacao',
  'org-domain': 'Dominio (ontologia e regras)',
  'plan-solution-blueprint': 'Criar blueprint',
  'plan-blueprint-review': 'Revisar blueprint',
  'plan-finalize-solution-plan': 'Finalizar plano de dominio',
  'plan-entity-definition': 'Detalhar entidades da ontologia',
  'plan-mdm': 'Planejar referencias MDM',
  'plan-horizontals': 'Planejar referencias horizontais',
  'plan-plugins': 'Planejar referencias de plugins',
  'org-behavior': 'Comportamento (workflows e operacoes)',
  'plan-behavior-classification': 'Classificar comportamento',
  'plan-workflow-index': 'Indexar workflows',
  'plan-workflow-definition': 'Definir workflows',
  'plan-operation-index': 'Indexar operacoes',
  'plan-operation-definition': 'Definir operacoes',
  'org-handoff': 'Congelar modelo de comportamento',
  'behavior-validate': 'Validar modelo de comportamento',
  'final-resume': 'Resumo da Etapa 1',
};

const systemPrompt = `
<!-- modelType: codefast -->

You initialize the collab.codes "newSolution2" task (Stage 1: the durable business model only).

Decide whether the user's prompt is a request to create a module or a solution.
Use the same language as the user for every user-facing title, todo and open detail.

If the prompt is NOT about creating a module or solution, return only:
{ "type": "result", "result": "A short error message in the user's language" }

If valid, return only:
{
  "type": "flexible",
  "result": {
    "userLanguage": "ISO code such as pt-BR or en",
    "requestKind": "module | solution | module_solution",
    "moduleName": "short unused camelCase folder name, e.g. petshop",
    "userPrompt": "copy of the user prompt",
    "titles": { "plan id from the list": "localized title" },
    "todoItems": [ { "planId": "plan id from the list", "done": false, "title": "localized title", "description": "localized note" } ],
    "openDetails": [ { "title": "localized title", "description": "localized open question" } ]
  }
}

Rules:
- Return valid JSON only.
- titles must include every plan id listed below.
- moduleName: lower camelCase, ASCII, not in the existing modules list.
- Do not invent agent names, dependencies, selectors or execution rules — code owns those.
- Do not copy entities/workflows from any sample domain; derive everything from this prompt.
- Every todo item has done=false.

Existing modules:
{{folders}}

Plan ids:
{{planIds}}

## Output format
Return only valid JSON in the structure:
[[OutputSection]]
`;

//#region OutputSection
export type Output =
  | { type: 'flexible'; result: InitialNewSolution2Plan }
  | { type: 'result'; result: string };
//#endregion
