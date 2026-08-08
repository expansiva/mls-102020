/// <mls fileReference="_102020_/l2/agentNewSolution4/helpers/ns4Core.ts" enhancement="_blank"/>

export const NS4_FLOW_ID = 'agentNewSolution4' as const;
export const NS4_FLOW_VERSION = '2026-08-08-ns4-flow-v17' as const;
export const NS4_E4_MAX_PARALLEL = 20 as const;
export const NS4_E5_MAX_PARALLEL = 20 as const;
export const NS4_MODULE_SCHEMA_VERSION = '2026-08-06-ns4-module-v4' as const;
export const NS4_PIPELINE_SCHEMA_VERSION = '2026-08-06-ns4-pipeline-v5' as const;

export const NS4_PLAN_IDS = [
  'e1-clarification',
  'e1-compile',
  'e2-journeys',
  'e3-access-matrix',
  'e4-ontology',
  'e5-rules',
  'e6-behaviors',
  'e7-realization',
  'e8-workspaces',
  'e9-navigation-compiler',
  'e10-validation',
] as const;

export type Ns4PlanId = typeof NS4_PLAN_IDS[number];

export const NS4_HUMAN_CHECKPOINT_ICON = '👤' as const;
export const NS4_AUTOMATED_JUDGE_ICON = '🔎' as const;

const NS4_HUMAN_CHECKPOINT_PLAN_IDS: ReadonlySet<Ns4PlanId> = new Set([
  'e1-clarification',
  'e2-journeys',
  'e3-access-matrix',
  'e4-ontology',
  'e5-rules',
  'e6-behaviors',
]);

export type Ns4ApprovedBy = 'human' | 'auto';
export type Ns4E1Status = 'running' | 'approved' | 'failed';
export type Ns4E2Status = 'running' | 'waitingHuman' | 'approved' | 'failed';
export type Ns4E3Status = 'running' | 'waitingHuman' | 'approved' | 'failed';
export type Ns4E4Status = 'running' | 'waitingHuman' | 'approved' | 'failed';
export type Ns4E5Status = 'running' | 'waitingHuman' | 'approved' | 'failed';
export type Ns4CompletedStepId = 'e1' | 'e2-journeys' | 'e3-access-matrix' | 'e4-ontology' | 'e5-rules';
export type Ns4NextStep = 'e2-journeys' | 'e3-access-matrix' | 'e4-ontology' | 'e5-rules' | 'e6-behaviors';

export interface Ns4ClarificationQuestion {
  type: 'open';
  question: string;
  answer: string;
}

export interface Ns4Clarification {
  planId: 'e1-clarification';
  userLanguage: string;
  title: string;
  legends: string[];
  questions: Record<string, Ns4ClarificationQuestion>;
}

export interface Ns4Presentation {
  userLanguage: string;
  stepTitles: Record<Ns4PlanId, string>;
}

export interface Ns4RootPlan {
  validPrompt: boolean;
  invalidReason?: string;
  userPrompt: string;
  presentation: Ns4Presentation;
  clarification: Ns4Clarification;
}

export interface Ns4ModuleArtifact {
  schemaVersion: typeof NS4_MODULE_SCHEMA_VERSION;
  presentation: Ns4Presentation;
  module: {
    moduleName: string;
    title: string;
    purpose: string;
    languages: string[];
  };
  designContext: {
    initialPrompt: string;
    clarification: {
      mainActors: string;
      mainGoal: string;
      boundaries: string;
    };
  };
  reviewPolicy: {
    mode: 'guided' | 'smart' | 'automatic';
  };
  solutionStrategy: {
    mode: 'newSolution' | 'modernizePreserveDatabase' | 'modernizeEvolveDatabase' | 'replaceAndMigrateData';
    rationale: string;
    databaseChangePolicy: 'new' | 'forbidden' | 'additiveControlled' | 'replacement';
    modernization?: {
      sourceSystemName: string;
      sourceTechnology?: string;
      databaseEngine?: string;
      databaseVersion?: string;
      schemaAvailability: 'uploadAtE4' | 'metadataAtE4' | 'notAvailableYet';
      notes?: string;
    };
  };
  businessScope: {
    mainGoal: string;
    actors: Array<{
      actorId: string;
      title: string;
      kind: 'internal' | 'external' | 'system';
      expectedOutcome: string;
    }>;
    expectedOutcomes: Array<{ outcomeId: string; title: string; description: string }>;
    inScope: string[];
    outOfScope: string[];
  };
  localization: {
    productLanguages: string[];
    defaultLanguage: string;
    defaultLocale?: string;
    currency?: string;
    timeZone?: string;
    primaryMarket?: string;
  };
  declaredConstraints: {
    mandatoryIntegrations: Array<{
      dependencyId: string;
      title: string;
      kind: 'externalSystem' | 'platform' | 'unknown';
      reason: string;
    }>;
    regulatoryNotes?: string;
    criticalNotes?: string;
  };
  specStatus: {
    flowId: typeof NS4_FLOW_ID;
    flowVersion: typeof NS4_FLOW_VERSION;
    state: 'inProgress';
    artifactCompleteness: 'partial';
    completedSteps: Array<{
      stepId: Ns4CompletedStepId;
      status: 'approved';
      approvedBy: Ns4ApprovedBy;
      approvedAt: string;
    }>;
    nextStep: Ns4NextStep;
    updatedAt: string;
  };
}

export interface Ns4PipelineState {
  schemaVersion: typeof NS4_PIPELINE_SCHEMA_VERSION;
  flowId: typeof NS4_FLOW_ID;
  flowVersion: typeof NS4_FLOW_VERSION;
  moduleName: string;
  sourcePrompt: string;
  presentation: Ns4Presentation;
  status: 'inProgress' | 'complete' | 'failed';
  steps: {
    e1: {
      status: Ns4E1Status;
      artifactPath?: string;
      approvedBy?: Ns4ApprovedBy;
      approvedAt?: string;
      error?: string;
      failedAt?: string;
      updatedAt: string;
    };
    e2?: {
      status: Ns4E2Status;
      reviewRound: number;
      draftPath?: string;
      artifactPaths?: string[];
      approvedBy?: Ns4ApprovedBy;
      approvedAt?: string;
      error?: string;
      failedAt?: string;
      updatedAt: string;
    };
    e3?: {
      status: Ns4E3Status;
      reviewRound: number;
      draftPath?: string;
      artifactPath?: string;
      approvedBy?: Ns4ApprovedBy;
      approvedAt?: string;
      error?: string;
      failedAt?: string;
      updatedAt: string;
    };
    e4?: {
      status: Ns4E4Status;
      reviewRound: number;
      solutionMode: 'new';
      draftPath?: string;
      artifactPaths?: string[];
      approvedBy?: Ns4ApprovedBy;
      approvedAt?: string;
      error?: string;
      failedAt?: string;
      updatedAt: string;
    };
    e5?: {
      status: Ns4E5Status;
      reviewRound: number;
      draftPath?: string;
      artifactPaths?: string[];
      approvedBy?: Ns4ApprovedBy;
      approvedAt?: string;
      error?: string;
      failedAt?: string;
      updatedAt: string;
    };
  };
  nextStep: Ns4NextStep;
  createdAt: string;
  updatedAt: string;
}

export type Ns4ExistingAction = 'new' | 'resume-e1' | 'resume-e2' | 'resume-e3' | 'resume-e4' | 'resume-e5' | 'resume-next' | 'collision';

export function parseNs4Invocation(value: string): { fast: boolean; prompt: string } {
  const raw = String(value || '');
  const fast = /(^|\s)\/fast(?=\s|$)/i.test(raw);
  const prompt = raw.replace(/(^|\s)\/fast(?=\s|$)/gi, '$1').replace(/\s+/g, ' ').trim();
  return { fast, prompt };
}

export function createNs4E2Step(
  moduleName = '',
  reviewRound = 1,
  adjustment = '',
  dependsOn: string[] = [],
  stepTitle = NS4_DEFAULT_TITLES['e2-journeys'],
): mls.msg.AIAgentStep {
  const suffix = adjustment ? ` adjustment ${reviewRound}` : '';
  return createNs4AgentStep(
    `e2-journeys-round-${reviewRound}`,
    adjustment ? plainNs4StepTitle(`${stepTitle}${suffix}`) : formatNs4VisibleStepTitle('e2-journeys', stepTitle),
    dependsOn,
    dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    { planId: 'e2-journeys', ...(moduleName ? { moduleName } : {}), reviewRound, ...(adjustment ? { adjustment } : {}) },
  );
}

export function createNs4E1Step(
  reviewRound = 1,
  adjustment = '',
  previousReview: unknown = undefined,
  dependsOn: string[] = [],
  stepTitle = NS4_DEFAULT_TITLES['e1-clarification'],
): mls.msg.AIAgentStep {
  const planningPlanId = reviewRound === 1 && !adjustment
    ? 'e1-clarification'
    : `e1-clarification-round-${reviewRound}`;
  return createNs4AgentStep(
    planningPlanId,
    reviewRound > 1 || adjustment
      ? plainNs4StepTitle(`${stepTitle}${reviewRound > 1 ? ` · ${reviewRound}` : ''}`)
      : formatNs4VisibleStepTitle('e1-clarification', stepTitle),
    dependsOn,
    dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    {
      planId: 'e1-clarification',
      reviewRound,
      ...(adjustment ? { adjustment } : {}),
      ...(previousReview ? { previousReview } : {}),
    },
  );
}

export function createNs4E2GateRepairStep(
  moduleName: string,
  reviewRound: number,
  gateRepairAttempt: number,
  coverageRepairAttempt: number,
  gateFeedback: string,
  stepTitle = NS4_DEFAULT_TITLES['e2-journeys'],
  coverageIssueIds: string[] = [],
): mls.msg.AIAgentStep {
  return createNs4AgentStep(
    `e2-journeys-round-${reviewRound}-coverage-${coverageRepairAttempt}-gate-repair-${gateRepairAttempt}`,
    `${plainNs4StepTitle(stepTitle)} · G${gateRepairAttempt}`,
    [],
    'waiting_human_input',
    {
      planId: 'e2-journeys', moduleName, reviewRound,
      gateRepairAttempt, coverageRepairAttempt, gateFeedback,
      ...(coverageIssueIds.length ? { coverageIssueIds } : {}),
    },
  );
}

export function createNs4E2CoverageRepairStep(
  moduleName: string,
  reviewRound: number,
  coverageRepairAttempt: number,
  coverageFeedback: string,
  stepTitle = NS4_DEFAULT_TITLES['e2-journeys'],
  coverageIssueIds: string[] = [],
): mls.msg.AIAgentStep {
  return createNs4AgentStep(
    `e2-journeys-round-${reviewRound}-coverage-repair-${coverageRepairAttempt}`,
    `${plainNs4StepTitle(stepTitle)} · C${coverageRepairAttempt}`,
    [],
    'waiting_human_input',
    {
      planId: 'e2-journeys', stage: 'coverageRepair', moduleName, reviewRound,
      coverageRepairAttempt, coverageFeedback, coverageIssueIds,
    },
  );
}

export function createNs4E2CoverageJudgeStep(
  moduleName: string,
  reviewRound: number,
  coverageRepairAttempt: number,
  judgeAttempt: number,
  stepTitle = NS4_DEFAULT_TITLES['e2-journeys'],
  coverageIssueIds: string[] = [],
): mls.msg.AIAgentStep {
  const cleanTitle = stepTitle.trim().replace(/^[👤🔎]\s*/u, '');
  return createNs4AgentStep(
    `e2-journeys-round-${reviewRound}-coverage-${coverageRepairAttempt}-judge-${judgeAttempt}`,
    `${NS4_AUTOMATED_JUDGE_ICON} ${cleanTitle}`,
    [],
    'waiting_human_input',
    {
      planId: 'e2-journeys', stage: 'coverageJudge', moduleName, reviewRound,
      coverageRepairAttempt, judgeAttempt, coverageIssueIds,
    },
  );
}

export function createNs4E3Step(
  moduleName = '',
  reviewRound = 1,
  adjustment = '',
  dependsOn: string[] = [],
  stepTitle = NS4_DEFAULT_TITLES['e3-access-matrix'],
): mls.msg.AIAgentStep {
  const suffix = adjustment ? ` · ${reviewRound}` : '';
  return createNs4AgentStep(
    `e3-access-matrix-round-${reviewRound}`,
    adjustment ? plainNs4StepTitle(`${stepTitle}${suffix}`) : formatNs4VisibleStepTitle('e3-access-matrix', stepTitle),
    dependsOn,
    dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    { planId: 'e3-access-matrix', ...(moduleName ? { moduleName } : {}), reviewRound, ...(adjustment ? { adjustment } : {}) },
  );
}

export function createNs4E4Step(
  moduleName = '',
  reviewRound = 1,
  adjustment = '',
  dependsOn: string[] = [],
  stepTitle = NS4_DEFAULT_TITLES['e4-ontology'],
): mls.msg.AIAgentStep {
  const suffix = adjustment ? ` · ${reviewRound}` : '';
  return createNs4AgentStep(
    `e4-ontology-round-${reviewRound}`,
    adjustment ? plainNs4StepTitle(`${stepTitle}${suffix}`) : formatNs4VisibleStepTitle('e4-ontology', stepTitle),
    dependsOn,
    dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    { planId: 'e4-ontology', ...(moduleName ? { moduleName } : {}), reviewRound, solutionMode: 'new', ...(adjustment ? { adjustment } : {}) },
  );
}

export function createNs4E4RepairStep(
  moduleName: string,
  reviewRound: number,
  repairAttempt: number,
  gateFeedback: string,
  stepTitle = NS4_DEFAULT_TITLES['e4-ontology'],
): mls.msg.AIAgentStep {
  return createNs4AgentStep(
    `e4-ontology-round-${reviewRound}-repair-${repairAttempt}`,
    `${plainNs4StepTitle(stepTitle)} · R${repairAttempt}`,
    [],
    'waiting_human_input',
    { planId: 'e4-ontology', stage: 'plan', moduleName, reviewRound, solutionMode: 'new', repairAttempt, gateFeedback },
  );
}

export function createNs4E4FinalizeStep(
  moduleName: string,
  reviewRound: number,
  dependsOn: string[],
  entityRepairRound = 0,
  planRepairAttempt = 0,
): mls.msg.AIAgentStep {
  return createNs4AgentStep(
    `e4-ontology-round-${reviewRound}-finalize-${entityRepairRound}-${planRepairAttempt}`,
    `Finalize ontology · ${reviewRound}`,
    dependsOn,
    dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    {
      planId: 'e4-ontology', stage: 'finalize', moduleName, reviewRound, solutionMode: 'new',
      entityRepairRound, planRepairAttempt,
    },
  );
}

export function createNs4E5Step(
  moduleName = '',
  reviewRound = 1,
  adjustment = '',
  dependsOn: string[] = [],
  stepTitle = NS4_DEFAULT_TITLES['e5-rules'],
  gateFeedback = '',
  repairAttempt = 0,
): mls.msg.AIAgentStep {
  const suffix = adjustment ? ` · ${reviewRound}` : repairAttempt ? ` · R${repairAttempt}` : '';
  return createNs4AgentStep(
    `e5-rules-round-${reviewRound}${repairAttempt ? `-repair-${repairAttempt}` : ''}`,
    adjustment || repairAttempt
      ? plainNs4StepTitle(`${stepTitle}${suffix}`)
      : formatNs4VisibleStepTitle('e5-rules', stepTitle),
    dependsOn,
    dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    {
      planId: 'e5-rules', ...(moduleName ? { moduleName } : {}), reviewRound,
      stage: 'plan',
      ...(adjustment ? { adjustment } : {}), ...(gateFeedback ? { gateFeedback } : {}),
      ...(repairAttempt ? { repairAttempt } : {}),
    },
  );
}

export function createNs4E5FinalizeStep(
  moduleName: string,
  reviewRound: number,
  dependsOn: string[],
  ruleRepairRound = 0,
  planRepairAttempt = 0,
): mls.msg.AIAgentStep {
  return createNs4AgentStep(
    `e5-rules-round-${reviewRound}-finalize-${ruleRepairRound}-${planRepairAttempt}`,
    `Finalize business rules · ${reviewRound}`,
    dependsOn,
    dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    { planId: 'e5-rules', stage: 'finalize', moduleName, reviewRound, ruleRepairRound, planRepairAttempt },
  );
}

export function createNs4E5JudgeStep(
  moduleName: string,
  reviewRound: number,
  repairAttempt: number,
  judgeAttempt: number,
  stepTitle = NS4_DEFAULT_TITLES['e5-rules'],
): mls.msg.AIAgentStep {
  const cleanTitle = stepTitle.trim().replace(/^[👤🔎]\s*/u, '');
  return createNs4AgentStep(
    `e5-rules-round-${reviewRound}${repairAttempt ? `-repair-${repairAttempt}` : ''}-judge-${judgeAttempt}`,
    `${NS4_AUTOMATED_JUDGE_ICON} ${cleanTitle}`,
    [],
    'waiting_human_input',
    { planId: 'e5-rules', stage: 'judge', moduleName, reviewRound, repairAttempt, judgeAttempt },
  );
}

export const NS4_DEFAULT_TITLES: Record<Ns4PlanId, string> = {
  'e1-clarification': 'Clarify the module contract',
  'e1-compile': 'Compile the initial module contract',
  'e2-journeys': 'Define and approve business journeys',
  'e3-access-matrix': 'Review the access matrix',
  'e4-ontology': 'Define the business ontology',
  'e5-rules': 'Organize business rules',
  'e6-behaviors': 'Define workflows and operations',
  'e7-realization': 'Connect journeys to system behavior',
  'e8-workspaces': 'Design access-aware workspaces',
  'e9-navigation-compiler': 'Compile navigation and page context',
  'e10-validation': 'Validate the complete L4 specification',
};

export function formatNs4VisibleStepTitle(planId: Ns4PlanId, title: string): string {
  const cleanTitle = plainNs4StepTitle(title);
  return NS4_HUMAN_CHECKPOINT_PLAN_IDS.has(planId)
    ? `${NS4_HUMAN_CHECKPOINT_ICON} ${cleanTitle}`
    : cleanTitle;
}

export function plainNs4StepTitle(title: string): string {
  return title.trim().replace(/^[👤🔎]\s*/u, '');
}

/** Dynamic fan-out children do not retain planning.planId; hook args are their stable dispatcher key. */
export function resolveNs4DynamicWorker(value: unknown): 'e4' | 'e5' | '' {
  if (typeof value !== 'string') return '';
  const selector = value.trim();
  if (/^entity:[A-Z][A-Za-z0-9]*$/.test(selector)) return 'e4';
  if (/^rule:[a-z][A-Za-z0-9]*$/.test(selector)) return 'e5';
  return '';
}

export interface Ns4DynamicWorkerRequest {
  worker: 'e4' | 'e5' | '';
  args: string;
}

/**
 * collab-messages supplies the selector as hook args before a parallel prompt, but may omit those
 * args in the after-prompt callback while retaining the selector in step.prompt. Both callbacks must
 * resolve through the same ordered fallback or a valid entity/rule payload reaches the root planner.
 */
export function resolveNs4DynamicWorkerRequest(args: unknown, stepPrompt: unknown): Ns4DynamicWorkerRequest {
  for (const candidate of [args, stepPrompt]) {
    const worker = resolveNs4DynamicWorker(candidate);
    if (worker && typeof candidate === 'string') return { worker, args: candidate };
  }
  return { worker: '', args: '' };
}

export function normalizeNs4RootPlan(payload: unknown, sourcePrompt: string): Ns4RootPlan {
  const parsed = parseMaybeJson(payload);
  const result = asRecord(parsed).type === 'flexible' ? parseMaybeJson(asRecord(parsed).result) : parsed;
  const record = asRecord(result);
  const userPrompt = readString(record.userPrompt) || sourcePrompt.trim();
  const userLanguage = normalizeNs4Languages(record.userLanguage, inferNs4PromptLanguage(userPrompt))[0];
  const rawTitles = asRecord(record.titles);
  const missingTitles: Ns4PlanId[] = [];
  const stepTitles = {} as Record<Ns4PlanId, string>;
  for (const planId of NS4_PLAN_IDS) {
    const title = readString(rawTitles[planId]);
    if (!title || title.length >= 140) missingTitles.push(planId);
    stepTitles[planId] = title && title.length < 140 ? title : NS4_DEFAULT_TITLES[planId];
  }
  const validEnvelope = record.validPrompt === true
    && !!readString(record.userPrompt)
    && !!readString(record.userLanguage)
    && missingTitles.length === 0;
  const invalidReason = readString(record.invalidReason)
    || (!validEnvelope ? `Root planner returned an incomplete contract${missingTitles.length ? `; missing titles: ${missingTitles.join(', ')}` : ''}.` : '');
  return {
    validPrompt: validEnvelope && userPrompt.length >= 2,
    ...(invalidReason ? { invalidReason } : {}),
    userPrompt,
    presentation: { userLanguage, stepTitles },
    clarification: normalizeNs4Clarification({
      ...asRecord(record.clarification),
      userLanguage,
      planId: 'e1-clarification',
    }),
  };
}

export function buildNs4PlannedSteps(plan: Ns4RootPlan): mls.msg.AIAgentStep[] {
  const title = (planId: Ns4PlanId) => plan.presentation.stepTitles[planId] || NS4_DEFAULT_TITLES[planId];
  return [
    createNs4E1Step(1, '', undefined, [], title('e1-clarification')),
    createNs4AgentStep('e1-compile', title('e1-compile'), ['e1-clarification-answer'], 'waiting_dependency', { planId: 'e1-compile' }),
    createNs4E2Step('', 1, '', ['e1-result'], title('e2-journeys')),
    createNs4E3Step('', 1, '', ['e2-result'], title('e3-access-matrix')),
    createNs4E4Step('', 1, '', ['e3-result'], title('e4-ontology')),
    createNs4E5Step('', 1, '', ['e4-result'], title('e5-rules')),
    createNs4RoadmapStep('e6-behaviors', title('e6-behaviors'), ['e5-result']),
    createNs4RoadmapStep('e7-realization', title('e7-realization'), ['e6-result']),
    createNs4RoadmapStep('e8-workspaces', title('e8-workspaces'), ['e7-result']),
    createNs4RoadmapStep('e9-navigation-compiler', title('e9-navigation-compiler'), ['e8-result']),
    createNs4RoadmapStep('e10-validation', title('e10-validation'), ['e9-result']),
  ];
}

function createNs4RoadmapStep(planId: Ns4PlanId, stepTitle: string, dependsOn: string[]): mls.msg.AIAgentStep {
  const step = createNs4AgentStep(planId, formatNs4VisibleStepTitle(planId, stepTitle), dependsOn, 'waiting_dependency', { planId });
  step.planning = { ...step.planning!, executionMode: 'manual_later' };
  return step;
}

function createNs4AgentStep(
  planningPlanId: string,
  stepTitle: string,
  dependsOn: string[],
  status: mls.msg.AIStepStatus,
  prompt: Record<string, unknown>,
): mls.msg.AIAgentStep {
  const step: mls.msg.AIAgentStep = {
    type: 'agent', stepId: 0, interaction: null, stepTitle, status, nextSteps: [],
    agentName: 'agentNewSolution4', prompt: JSON.stringify(prompt), rags: [],
    planning: { planId: planningPlanId, dependsOn, executionMode: 'sequential', executionHost: 'client' },
  };
  if (planningPlanId === 'e1-clarification'
    || planningPlanId.startsWith('e1-clarification-round-')
    || planningPlanId.startsWith('e2-journeys-round-')
    || planningPlanId.startsWith('e3-access-matrix-round-')
    || planningPlanId.startsWith('e4-ontology-round-')
    || planningPlanId.startsWith('e5-rules-round-')) {
    step.onFailure = 'wait_after_prompt';
  }
  return step;
}

export function isNs4ModuleToken(value: string): boolean {
  return /^[a-z][A-Za-z0-9]*$/.test(String(value || '').trim());
}

export function normalizeNs4ModuleName(value: unknown, fallback = 'newModule'): string {
  const raw = readString(value) || fallback;
  const ascii = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = ascii.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length === 0) return 'newModule';
  const first = words[0].toLowerCase();
  const rest = words.slice(1).map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join('');
  const candidate = `${first}${rest}`.replace(/^[^a-z]+/, '').slice(0, 60);
  return candidate || 'newModule';
}

export function normalizeNs4Clarification(value: unknown): Ns4Clarification {
  const record = asRecord(value);
  const questionsRecord = asRecord(record.questions);
  const questionIds = ['moduleName', 'productLanguages', 'mainActors', 'mainGoal', 'boundaries'];
  const questions: Record<string, Ns4ClarificationQuestion> = {};
  for (const id of questionIds) {
    const question = asRecord(questionsRecord[id]);
    questions[id] = {
      type: 'open',
      question: readString(question.question) || id,
      answer: readString(question.answer) || '',
    };
  }
  return {
    planId: 'e1-clarification',
    userLanguage: normalizeNs4Languages(record.userLanguage, 'en')[0],
    title: readString(record.title) || 'Clarification 1',
    legends: Array.isArray(record.legends) ? record.legends.map(readString).filter((item): item is string => !!item) : [],
    questions,
  };
}

export function buildNs4ModuleArtifact(
  sourcePrompt: string,
  clarificationInput: unknown,
  approvedBy: Ns4ApprovedBy,
  now = new Date().toISOString(),
  presentation: Ns4Presentation = defaultNs4Presentation(sourcePrompt),
): Ns4ModuleArtifact {
  const clarification = normalizeNs4Clarification(clarificationInput);
  const moduleName = normalizeNs4ModuleName(clarification.questions.moduleName.answer, sourcePrompt);
  const mainGoal = clarification.questions.mainGoal.answer.trim() || `Define the ${humanizeNs4ModuleName(moduleName)} business module.`;
  const productLanguages = normalizeNs4Languages(clarification.questions.productLanguages.answer, clarification.userLanguage);
  return {
    schemaVersion: NS4_MODULE_SCHEMA_VERSION,
    presentation,
    module: {
      moduleName,
      title: humanizeNs4ModuleName(moduleName),
      purpose: mainGoal,
      languages: productLanguages,
    },
    designContext: {
      initialPrompt: sourcePrompt.trim() || moduleName,
      clarification: {
        mainActors: clarification.questions.mainActors.answer.trim(),
        mainGoal,
        boundaries: clarification.questions.boundaries.answer.trim(),
      },
    },
    reviewPolicy: { mode: 'smart' },
    solutionStrategy: {
      mode: 'newSolution',
      rationale: 'Legacy clarification did not declare a modernization strategy.',
      databaseChangePolicy: 'new',
    },
    businessScope: {
      mainGoal,
      actors: clarification.questions.mainActors.answer.trim()
        ? [{
          actorId: 'primaryActor',
          title: clarification.questions.mainActors.answer.trim(),
          kind: 'internal',
          expectedOutcome: mainGoal,
        }]
        : [],
      expectedOutcomes: [{ outcomeId: 'primaryOutcome', title: mainGoal, description: mainGoal }],
      inScope: [],
      outOfScope: clarification.questions.boundaries.answer.trim()
        ? [clarification.questions.boundaries.answer.trim()]
        : [],
    },
    localization: { productLanguages, defaultLanguage: productLanguages[0] },
    declaredConstraints: { mandatoryIntegrations: [] },
    specStatus: {
      flowId: NS4_FLOW_ID,
      flowVersion: NS4_FLOW_VERSION,
      state: 'inProgress',
      artifactCompleteness: 'partial',
      completedSteps: [{ stepId: 'e1', status: 'approved', approvedBy, approvedAt: now }],
      nextStep: 'e2-journeys',
      updatedAt: now,
    },
  };
}

export function normalizeNs4Languages(value: unknown, fallback = 'en'): string[] {
  const rawValues = Array.isArray(value) ? value : [value];
  const candidates = rawValues.flatMap(item => typeof item === 'string' ? item.split(/[,;\n]+/) : []);
  const languages: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const language = normalizeNs4LanguageTag(candidate);
    const key = language.toLowerCase();
    if (!language || seen.has(key)) continue;
    seen.add(key);
    languages.push(language);
  }
  if (languages.length) return languages;
  const normalizedFallback = normalizeNs4LanguageTag(fallback);
  return [normalizedFallback || 'en'];
}

export function createNs4Pipeline(
  moduleNameInput: string,
  sourcePrompt: string,
  now = new Date().toISOString(),
  presentation: Ns4Presentation = defaultNs4Presentation(sourcePrompt),
): Ns4PipelineState {
  const moduleName = normalizeNs4ModuleName(moduleNameInput);
  return {
    schemaVersion: NS4_PIPELINE_SCHEMA_VERSION,
    flowId: NS4_FLOW_ID,
    flowVersion: NS4_FLOW_VERSION,
    moduleName,
    sourcePrompt: sourcePrompt.trim() || moduleName,
    presentation,
    status: 'inProgress',
    steps: { e1: { status: 'running', updatedAt: now } },
    nextStep: 'e2-journeys',
    createdAt: now,
    updatedAt: now,
  };
}

export function markNs4E1Approved(
  state: Ns4PipelineState,
  approvedBy: Ns4ApprovedBy,
  artifactPath: string,
  now = new Date().toISOString(),
): Ns4PipelineState {
  return {
    ...state,
    status: 'inProgress',
    steps: {
      ...state.steps,
      e1: { status: 'approved', artifactPath, approvedBy, approvedAt: now, updatedAt: now },
    },
    nextStep: 'e2-journeys',
    updatedAt: now,
  };
}

export function markNs4E2Running(
  state: Ns4PipelineState,
  reviewRound: number,
  now = new Date().toISOString(),
): Ns4PipelineState {
  if (state.steps.e2?.status === 'approved') return state;
  return {
    ...state,
    status: 'inProgress',
    steps: {
      ...state.steps,
      e2: { status: 'running', reviewRound: Math.max(1, reviewRound), updatedAt: now },
    },
    nextStep: 'e2-journeys',
    updatedAt: now,
  };
}

export function markNs4E1Failed(
  state: Ns4PipelineState,
  failure: unknown,
  now = new Date().toISOString(),
): Ns4PipelineState {
  return {
    ...state,
    status: 'failed',
    steps: {
      ...state.steps,
      e1: { status: 'failed', error: normalizeNs4Failure(failure), failedAt: now, updatedAt: now },
    },
    updatedAt: now,
  };
}

export function markNs4E2Failed(
  state: Ns4PipelineState,
  failure: unknown,
  now = new Date().toISOString(),
): Ns4PipelineState {
  if (state.steps.e2?.status === 'approved') return state;
  const reviewRound = state.steps.e2?.reviewRound || 1;
  return {
    ...state,
    status: 'failed',
    steps: {
      ...state.steps,
      e2: {
        status: 'failed', reviewRound, error: normalizeNs4Failure(failure), failedAt: now, updatedAt: now,
      },
    },
    updatedAt: now,
  };
}

export function markNs4E2WaitingHuman(
  state: Ns4PipelineState,
  reviewRound: number,
  draftPath: string,
  now = new Date().toISOString(),
): Ns4PipelineState {
  if (state.steps.e2?.status === 'approved') return state;
  return {
    ...state,
    steps: {
      ...state.steps,
      e2: { status: 'waitingHuman', reviewRound: Math.max(1, reviewRound), draftPath, updatedAt: now },
    },
    nextStep: 'e2-journeys',
    updatedAt: now,
  };
}

export function markNs4E2Approved(
  state: Ns4PipelineState,
  approvedBy: Ns4ApprovedBy,
  artifactPaths: string[],
  now = new Date().toISOString(),
): Ns4PipelineState {
  const reviewRound = state.steps.e2?.reviewRound || 1;
  return {
    ...state,
    steps: {
      ...state.steps,
      e2: {
        ...state.steps.e2,
        status: 'approved',
        reviewRound,
        artifactPaths: [...artifactPaths],
        approvedBy,
        approvedAt: now,
        updatedAt: now,
      },
    },
    nextStep: 'e3-access-matrix',
    updatedAt: now,
  };
}

export function markNs4ModuleE2Approved(
  artifact: Ns4ModuleArtifact,
  approvedBy: Ns4ApprovedBy,
  now = new Date().toISOString(),
): Ns4ModuleArtifact {
  const completedSteps = artifact.specStatus.completedSteps.filter(step => step.stepId !== 'e2-journeys');
  completedSteps.push({ stepId: 'e2-journeys', status: 'approved', approvedBy, approvedAt: now });
  return {
    ...artifact,
    specStatus: {
      ...artifact.specStatus,
      completedSteps,
      nextStep: 'e3-access-matrix',
      updatedAt: now,
    },
  };
}

export function markNs4E3Running(
  state: Ns4PipelineState,
  reviewRound: number,
  now = new Date().toISOString(),
): Ns4PipelineState {
  if (state.steps.e3?.status === 'approved') return state;
  return {
    ...state,
    status: 'inProgress',
    steps: {
      ...state.steps,
      e3: { status: 'running', reviewRound: Math.max(1, reviewRound), updatedAt: now },
    },
    nextStep: 'e3-access-matrix',
    updatedAt: now,
  };
}

export function markNs4E3WaitingHuman(
  state: Ns4PipelineState,
  reviewRound: number,
  draftPath: string,
  now = new Date().toISOString(),
): Ns4PipelineState {
  if (state.steps.e3?.status === 'approved') return state;
  return {
    ...state,
    status: 'inProgress',
    steps: {
      ...state.steps,
      e3: { status: 'waitingHuman', reviewRound: Math.max(1, reviewRound), draftPath, updatedAt: now },
    },
    nextStep: 'e3-access-matrix',
    updatedAt: now,
  };
}

export function markNs4E3Failed(
  state: Ns4PipelineState,
  failure: unknown,
  now = new Date().toISOString(),
): Ns4PipelineState {
  if (state.steps.e3?.status === 'approved') return state;
  const reviewRound = state.steps.e3?.reviewRound || 1;
  return {
    ...state,
    status: 'failed',
    steps: {
      ...state.steps,
      e3: { status: 'failed', reviewRound, error: normalizeNs4Failure(failure), failedAt: now, updatedAt: now },
    },
    nextStep: 'e3-access-matrix',
    updatedAt: now,
  };
}

export function markNs4E3Approved(
  state: Ns4PipelineState,
  approvedBy: Ns4ApprovedBy,
  artifactPath: string,
  now = new Date().toISOString(),
): Ns4PipelineState {
  const reviewRound = state.steps.e3?.reviewRound || 1;
  return {
    ...state,
    status: 'inProgress',
    steps: {
      ...state.steps,
      e3: {
        ...state.steps.e3,
        status: 'approved', reviewRound, artifactPath, approvedBy, approvedAt: now, updatedAt: now,
      },
    },
    nextStep: 'e4-ontology',
    updatedAt: now,
  };
}

export function markNs4ModuleE3Approved(
  artifact: Ns4ModuleArtifact,
  approvedBy: Ns4ApprovedBy,
  now = new Date().toISOString(),
): Ns4ModuleArtifact {
  const completedSteps = artifact.specStatus.completedSteps.filter(step => step.stepId !== 'e3-access-matrix');
  completedSteps.push({ stepId: 'e3-access-matrix', status: 'approved', approvedBy, approvedAt: now });
  return {
    ...artifact,
    specStatus: { ...artifact.specStatus, completedSteps, nextStep: 'e4-ontology', updatedAt: now },
  };
}

export function markNs4E4Running(
  state: Ns4PipelineState,
  reviewRound: number,
  now = new Date().toISOString(),
): Ns4PipelineState {
  if (state.steps.e4?.status === 'approved') return state;
  return {
    ...state,
    status: 'inProgress',
    steps: {
      ...state.steps,
      e4: { status: 'running', reviewRound: Math.max(1, reviewRound), solutionMode: 'new', updatedAt: now },
    },
    nextStep: 'e4-ontology',
    updatedAt: now,
  };
}

export function markNs4E4WaitingHuman(
  state: Ns4PipelineState,
  reviewRound: number,
  draftPath: string,
  now = new Date().toISOString(),
): Ns4PipelineState {
  if (state.steps.e4?.status === 'approved') return state;
  return {
    ...state,
    status: 'inProgress',
    steps: {
      ...state.steps,
      e4: { status: 'waitingHuman', reviewRound: Math.max(1, reviewRound), solutionMode: 'new', draftPath, updatedAt: now },
    },
    nextStep: 'e4-ontology',
    updatedAt: now,
  };
}

export function markNs4E4Failed(
  state: Ns4PipelineState,
  failure: unknown,
  now = new Date().toISOString(),
): Ns4PipelineState {
  if (state.steps.e4?.status === 'approved') return state;
  const reviewRound = state.steps.e4?.reviewRound || 1;
  return {
    ...state,
    status: 'failed',
    steps: {
      ...state.steps,
      e4: {
        status: 'failed', reviewRound, solutionMode: 'new', error: normalizeNs4Failure(failure), failedAt: now, updatedAt: now,
      },
    },
    nextStep: 'e4-ontology',
    updatedAt: now,
  };
}

export function markNs4E4Approved(
  state: Ns4PipelineState,
  approvedBy: Ns4ApprovedBy,
  artifactPaths: string[],
  now = new Date().toISOString(),
): Ns4PipelineState {
  const reviewRound = state.steps.e4?.reviewRound || 1;
  return {
    ...state,
    status: 'inProgress',
    steps: {
      ...state.steps,
      e4: {
        ...state.steps.e4,
        status: 'approved', reviewRound, solutionMode: 'new', artifactPaths: [...artifactPaths], approvedBy, approvedAt: now, updatedAt: now,
      },
    },
    nextStep: 'e5-rules',
    updatedAt: now,
  };
}

export function markNs4ModuleE4Approved(
  artifact: Ns4ModuleArtifact,
  approvedBy: Ns4ApprovedBy,
  now = new Date().toISOString(),
): Ns4ModuleArtifact {
  const completedSteps = artifact.specStatus.completedSteps.filter(step => step.stepId !== 'e4-ontology');
  completedSteps.push({ stepId: 'e4-ontology', status: 'approved', approvedBy, approvedAt: now });
  return {
    ...artifact,
    specStatus: { ...artifact.specStatus, completedSteps, nextStep: 'e5-rules', updatedAt: now },
  };
}

export function markNs4E5Running(
  state: Ns4PipelineState,
  reviewRound: number,
  now = new Date().toISOString(),
): Ns4PipelineState {
  if (state.steps.e5?.status === 'approved') return state;
  return {
    ...state,
    status: 'inProgress',
    steps: { ...state.steps, e5: { status: 'running', reviewRound: Math.max(1, reviewRound), updatedAt: now } },
    nextStep: 'e5-rules',
    updatedAt: now,
  };
}

export function markNs4E5WaitingHuman(
  state: Ns4PipelineState,
  reviewRound: number,
  draftPath: string,
  now = new Date().toISOString(),
): Ns4PipelineState {
  if (state.steps.e5?.status === 'approved') return state;
  return {
    ...state,
    status: 'inProgress',
    steps: { ...state.steps, e5: { status: 'waitingHuman', reviewRound: Math.max(1, reviewRound), draftPath, updatedAt: now } },
    nextStep: 'e5-rules',
    updatedAt: now,
  };
}

export function markNs4E5Failed(
  state: Ns4PipelineState,
  failure: unknown,
  now = new Date().toISOString(),
): Ns4PipelineState {
  if (state.steps.e5?.status === 'approved') return state;
  const reviewRound = state.steps.e5?.reviewRound || 1;
  return {
    ...state,
    status: 'failed',
    steps: {
      ...state.steps,
      e5: { status: 'failed', reviewRound, error: normalizeNs4Failure(failure), failedAt: now, updatedAt: now },
    },
    nextStep: 'e5-rules',
    updatedAt: now,
  };
}

export function markNs4E5Approved(
  state: Ns4PipelineState,
  approvedBy: Ns4ApprovedBy,
  artifactPaths: string[],
  now = new Date().toISOString(),
): Ns4PipelineState {
  const reviewRound = state.steps.e5?.reviewRound || 1;
  return {
    ...state,
    status: 'inProgress',
    steps: {
      ...state.steps,
      e5: {
        ...state.steps.e5,
        status: 'approved', reviewRound, artifactPaths: [...artifactPaths], approvedBy, approvedAt: now, updatedAt: now,
      },
    },
    nextStep: 'e6-behaviors',
    updatedAt: now,
  };
}

export function markNs4ModuleE5Approved(
  artifact: Ns4ModuleArtifact,
  approvedBy: Ns4ApprovedBy,
  now = new Date().toISOString(),
): Ns4ModuleArtifact {
  const completedSteps = artifact.specStatus.completedSteps.filter(step => step.stepId !== 'e5-rules');
  completedSteps.push({ stepId: 'e5-rules', status: 'approved', approvedBy, approvedAt: now });
  return {
    ...artifact,
    specStatus: { ...artifact.specStatus, completedSteps, nextStep: 'e6-behaviors', updatedAt: now },
  };
}

export function resolveNs4ExistingAction(
  moduleExists: boolean,
  pipeline: unknown,
  moduleArtifactExists: boolean,
): Ns4ExistingAction {
  if (!moduleExists) return 'new';
  if (!isNs4Pipeline(pipeline)) return 'collision';
  if (pipeline.steps.e5?.status === 'approved' && moduleArtifactExists) return 'resume-next';
  if (pipeline.steps.e4?.status === 'approved' && moduleArtifactExists) return 'resume-e5';
  if (pipeline.steps.e3?.status === 'approved' && moduleArtifactExists) return 'resume-e4';
  if (pipeline.steps.e2?.status === 'approved' && moduleArtifactExists) return 'resume-e3';
  if (pipeline.steps.e1.status === 'approved' && moduleArtifactExists) return 'resume-e2';
  return 'resume-e1';
}

export function isNs4Pipeline(value: unknown): value is Ns4PipelineState {
  const record = asRecord(value);
  const steps = asRecord(record.steps);
  const e1 = asRecord(steps.e1);
  return record.flowId === NS4_FLOW_ID
    && record.flowVersion === NS4_FLOW_VERSION
    && typeof record.moduleName === 'string'
    && (e1.status === 'running' || e1.status === 'approved' || e1.status === 'failed');
}

export function humanizeNs4ModuleName(moduleName: string): string {
  const spaced = String(moduleName || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
  return spaced ? spaced.slice(0, 1).toUpperCase() + spaced.slice(1) : 'New module';
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(clean); } catch { return value; }
}

function inferNs4PromptLanguage(prompt: string): string {
  const text = prompt.toLowerCase();
  if (/\b(pt-br|portugu[eê]s|linguagem\s*:\s*pt)\b/.test(text)) return 'pt-BR';
  if (/\b(es|español|castellano)\b/.test(text)) return 'es';
  return 'en';
}

function defaultNs4Presentation(prompt: string): Ns4Presentation {
  return {
    userLanguage: inferNs4PromptLanguage(prompt),
    stepTitles: { ...NS4_DEFAULT_TITLES },
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeNs4Failure(value: unknown): string {
  const message = value instanceof Error ? value.message : String(value || 'Unknown agent failure');
  return message.trim().slice(0, 4000) || 'Unknown agent failure';
}

function normalizeNs4LanguageTag(value: unknown): string {
  if (typeof value !== 'string') return '';
  const raw = value.trim().replace(/_/g, '-');
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(raw)) return '';
  return raw.split('-').map((part, index) => {
    if (index === 0) return part.toLowerCase();
    if (/^[A-Za-z]{2}$/.test(part)) return part.toUpperCase();
    if (/^[A-Za-z]{4}$/.test(part)) return `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`;
    return part;
  }).join('-');
}
