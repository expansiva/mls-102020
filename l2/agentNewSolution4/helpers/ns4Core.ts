/// <mls fileReference="_102020_/l2/agentNewSolution4/helpers/ns4Core.ts" enhancement="_blank"/>

export const NS4_FLOW_ID = 'agentNewSolution4' as const;
export const NS4_FLOW_VERSION = '2026-08-04-ns4-flow-v1' as const;
export const NS4_MODULE_SCHEMA_VERSION = '2026-08-04-ns4-module-v1' as const;
export const NS4_PIPELINE_SCHEMA_VERSION = '2026-08-04-ns4-pipeline-v1' as const;

export type Ns4ApprovedBy = 'human' | 'auto';
export type Ns4E1Status = 'running' | 'approved' | 'failed';
export type Ns4E2Status = 'running' | 'waitingHuman' | 'approved' | 'failed';
export type Ns4CompletedStepId = 'e1' | 'e2-journeys';
export type Ns4NextStep = 'e2-journeys' | 'e3-ontology';

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

export interface Ns4ModuleArtifact {
  schemaVersion: typeof NS4_MODULE_SCHEMA_VERSION;
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
  status: 'inProgress' | 'complete' | 'failed';
  steps: {
    e1: {
      status: Ns4E1Status;
      artifactPath?: string;
      approvedBy?: Ns4ApprovedBy;
      approvedAt?: string;
      updatedAt: string;
    };
    e2?: {
      status: Ns4E2Status;
      reviewRound: number;
      draftPath?: string;
      artifactPaths?: string[];
      approvedBy?: Ns4ApprovedBy;
      approvedAt?: string;
      updatedAt: string;
    };
  };
  nextStep: Ns4NextStep;
  createdAt: string;
  updatedAt: string;
}

export type Ns4ExistingAction = 'new' | 'resume-e1' | 'resume-next' | 'collision';

export function parseNs4Invocation(value: string): { fast: boolean; prompt: string } {
  const raw = String(value || '');
  const fast = /(^|\s)\/fast(?=\s|$)/i.test(raw);
  const prompt = raw.replace(/(^|\s)\/fast(?=\s|$)/gi, '$1').replace(/\s+/g, ' ').trim();
  return { fast, prompt };
}

export function createNs4ClarificationSubmitGuard(): () => boolean {
  let submitted = false;
  return () => {
    if (submitted) return false;
    submitted = true;
    return true;
  };
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
): Ns4ModuleArtifact {
  const clarification = normalizeNs4Clarification(clarificationInput);
  const moduleName = normalizeNs4ModuleName(clarification.questions.moduleName.answer, sourcePrompt);
  const mainGoal = clarification.questions.mainGoal.answer.trim() || `Define the ${humanizeNs4ModuleName(moduleName)} business module.`;
  const productLanguages = normalizeNs4Languages(clarification.questions.productLanguages.answer, clarification.userLanguage);
  return {
    schemaVersion: NS4_MODULE_SCHEMA_VERSION,
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
): Ns4PipelineState {
  const moduleName = normalizeNs4ModuleName(moduleNameInput);
  return {
    schemaVersion: NS4_PIPELINE_SCHEMA_VERSION,
    flowId: NS4_FLOW_ID,
    flowVersion: NS4_FLOW_VERSION,
    moduleName,
    sourcePrompt: sourcePrompt.trim() || moduleName,
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
  return {
    ...state,
    steps: {
      ...state.steps,
      e2: { status: 'running', reviewRound: Math.max(1, reviewRound), updatedAt: now },
    },
    nextStep: 'e2-journeys',
    updatedAt: now,
  };
}

export function markNs4E2WaitingHuman(
  state: Ns4PipelineState,
  reviewRound: number,
  draftPath: string,
  now = new Date().toISOString(),
): Ns4PipelineState {
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
    nextStep: 'e3-ontology',
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
      nextStep: 'e3-ontology',
      updatedAt: now,
    },
  };
}

export function resolveNs4ExistingAction(
  moduleExists: boolean,
  pipeline: unknown,
  moduleArtifactExists: boolean,
): Ns4ExistingAction {
  if (!moduleExists) return 'new';
  if (!isNs4Pipeline(pipeline)) return 'collision';
  if (pipeline.steps.e1.status === 'approved' && moduleArtifactExists) return 'resume-next';
  return 'resume-e1';
}

export function isNs4Pipeline(value: unknown): value is Ns4PipelineState {
  const record = asRecord(value);
  const steps = asRecord(record.steps);
  const e1 = asRecord(steps.e1);
  return record.flowId === NS4_FLOW_ID
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

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
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
