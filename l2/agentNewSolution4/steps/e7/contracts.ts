/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e7/contracts.ts" enhancement="_blank"/>

import { sha256Ns4 } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type {
  Ns4E2Review, Ns4JourneyArtifact, Ns4JourneyArtifactV3, Ns4JourneyIndex, Ns4JourneyStepKind,
} from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { NS4_REALIZED_JOURNEY_SCHEMA_VERSION } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type {
  Ns4AccessMatrixArtifact, Ns4AccessMatrixArtifactV3,
} from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import { NS4_REALIZED_ACCESS_MATRIX_SCHEMA_VERSION } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import type { Ns4OntologyField } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';

export const NS4_USE_CASE_DRAFT_VERSION = '2026-08-10-ns4-usecase-draft-simple-v2' as const;
export const NS4_USE_CASE_SCHEMA_VERSION = '2026-08-10-ns4-usecase-v2' as const;
export const NS4_USE_CASE_INDEX_SCHEMA_VERSION = '2026-08-10-ns4-usecase-index-v2' as const;
export const NS4_WORKFLOW_SCHEMA_VERSION = '2026-08-10-ns4-workflow-v1' as const;
export const NS4_WORKFLOW_INDEX_SCHEMA_VERSION = '2026-08-10-ns4-workflow-index-v1' as const;

export type Ns4UseCaseKind = 'query' | 'command';
export type Ns4UseCaseFieldType = Ns4OntologyField['type'];

export interface Ns4E7SourceHashes {
  journeys: Array<{ journeyId: string; businessHash: string }>;
  ontologyHash: string;
  rulesHash: string;
}

export interface Ns4E7PlanUseCase {
  useCaseId: string;
  title: string;
  kind: Ns4UseCaseKind;
  compiledFrom: string[];
  contexts: { requires: string[]; provides: string[] };
}

export interface Ns4E7PlanDraft {
  planId: 'e7-realization-plan';
  moduleName: string;
  userLanguage: string;
  useCases: Ns4E7PlanUseCase[];
  sourceHashes: Ns4E7SourceHashes;
}

export interface Ns4UseCaseFieldRef {
  entityId: string;
  fieldId: string;
}

export interface Ns4UseCaseInput {
  inputId: string;
  type?: Ns4UseCaseFieldType;
  required: boolean;
  fieldRef?: Ns4UseCaseFieldRef;
  description: string;
}

export interface Ns4UseCaseOutput {
  outputId: string;
  type?: Ns4UseCaseFieldType;
  required: boolean;
  contextId?: string;
  fieldRef?: Ns4UseCaseFieldRef;
  description: string;
}

export interface Ns4UseCaseEntityAccess {
  entityId: string;
  fieldRefs: string[];
}

export interface Ns4UseCaseTransition {
  transitionId: string;
  entityRef: string;
  fromStates: string[];
  toState: string;
  useRules: string[];
}

export interface Ns4UseCaseError {
  errorId: string;
  description: string;
  when: string;
  useRules: string[];
}

export interface Ns4UseCaseDraft extends Ns4E7PlanUseCase {
  draftVersion: typeof NS4_USE_CASE_DRAFT_VERSION;
  planId: 'e7-usecase';
  moduleName: string;
  description: string;
  contexts: {
    requires: string[];
    provides: string[];
  };
  inputs: Ns4UseCaseInput[];
  outputs: Ns4UseCaseOutput[];
  reads: Ns4UseCaseEntityAccess[];
  writes: Ns4UseCaseEntityAccess[];
  useRules: string[];
  transitions: Ns4UseCaseTransition[];
  errors: Ns4UseCaseError[];
}

export interface Ns4UseCaseArtifact extends Omit<Ns4UseCaseDraft, 'planId' | 'draftVersion'> {
  schemaVersion: typeof NS4_USE_CASE_SCHEMA_VERSION;
  userLanguage: string;
  sourceHashes: Ns4E7SourceHashes;
  useCaseHash: string;
  generatedAt: string;
}

export interface Ns4UseCaseIndexArtifact {
  schemaVersion: typeof NS4_USE_CASE_INDEX_SCHEMA_VERSION;
  moduleName: string;
  userLanguage: string;
  sourceHashes: Ns4E7SourceHashes;
  useCases: Array<{
    useCaseId: string;
    title: string;
    kind: Ns4UseCaseKind;
    compiledFrom: string[];
    useCaseHash: string;
    artifactPath: string;
  }>;
  realizationHash: string;
  generatedAt: string;
}

export interface Ns4WorkflowTransition extends Ns4UseCaseTransition {
  useCaseId: string;
}

export interface Ns4WorkflowArtifact {
  schemaVersion: typeof NS4_WORKFLOW_SCHEMA_VERSION;
  moduleName: string;
  userLanguage: string;
  workflowId: string;
  entityRef: string;
  states: string[];
  transitions: Ns4WorkflowTransition[];
  sourceHashes: Ns4E7SourceHashes;
  workflowHash: string;
  generatedAt: string;
}

export interface Ns4WorkflowIndexArtifact {
  schemaVersion: typeof NS4_WORKFLOW_INDEX_SCHEMA_VERSION;
  moduleName: string;
  userLanguage: string;
  workflows: Array<{
    workflowId: string;
    entityRef: string;
    workflowHash: string;
    artifactPath: string;
  }>;
  sourceHashes: Ns4E7SourceHashes;
  realizationHash: string;
  generatedAt: string;
}

export function buildNs4E7Plan(
  moduleName: string,
  userLanguage: string,
  journeys: Ns4E2Review,
  sourceHashes: Ns4E7SourceHashes,
): Ns4E7PlanDraft {
  const grouped = new Map<string, { kinds: Set<Ns4JourneyStepKind>; refs: string[]; intents: string[];
    requires: Set<string>; provides: Set<string> }>();
  for (const journey of journeys.journeys) {
    for (const step of journey.business.steps) {
      const current = grouped.get(step.stepId) || { kinds: new Set<Ns4JourneyStepKind>(), refs: [], intents: [],
        requires: new Set<string>(), provides: new Set<string>() };
      current.kinds.add(step.kind);
      current.refs.push(`${journey.journeyId}.${step.stepId}`);
      current.intents.push(step.intent);
      step.requiresContext.forEach(contextId => current.requires.add(contextId));
      step.providesContext.forEach(context => current.provides.add(context.contextId));
      grouped.set(step.stepId, current);
    }
  }
  const useCases = [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([useCaseId, group]) => ({
    useCaseId,
    title: group.intents[0] || useCaseId,
    kind: [...group.kinds].every(kind => kind === 'locate' || kind === 'inspect') ? 'query' as const : 'command' as const,
    compiledFrom: [...new Set(group.refs)].sort(),
    contexts: { requires: [...group.requires].sort(), provides: [...group.provides].sort() },
  }));
  return { planId: 'e7-realization-plan', moduleName, userLanguage, useCases, sourceHashes };
}

export function normalizeNs4UseCaseDraft(
  value: unknown,
  plan: Ns4E7PlanDraft,
  useCaseId: string,
): Ns4UseCaseDraft {
  const root = record(value);
  const target = plan.useCases.find(item => item.useCaseId === useCaseId);
  if (!target) throw new Error(`Unknown E7 use case ${useCaseId}.`);
  return {
    draftVersion: NS4_USE_CASE_DRAFT_VERSION, planId: 'e7-usecase', moduleName: plan.moduleName, useCaseId,
    title: text(root.title) || target.title, kind: target.kind,
    compiledFrom: [...target.compiledFrom], description: text(root.description),
    contexts: { requires: [...target.contexts.requires], provides: [...target.contexts.provides] },
    inputs: array(root.inputs).map(normalizeInput), outputs: array(root.outputs).map(normalizeOutput),
    reads: array(root.reads).map(normalizeEntityAccess), writes: array(root.writes).map(normalizeEntityAccess),
    useRules: strings(root.useRules), transitions: array(root.transitions).map(normalizeTransition),
    errors: array(root.errors).map(normalizeError),
  };
}

export async function buildNs4UseCaseArtifacts(
  plan: Ns4E7PlanDraft,
  drafts: Ns4UseCaseDraft[],
  generatedAt: string,
): Promise<{ artifacts: Ns4UseCaseArtifact[]; index: Ns4UseCaseIndexArtifact }> {
  const artifacts = await Promise.all(drafts.map(async draft => {
    const { planId: _planId, draftVersion: _draftVersion, ...contract } = draft;
    const useCaseHash = await sha256Ns4({ ...contract, sourceHashes: plan.sourceHashes });
    return {
      schemaVersion: NS4_USE_CASE_SCHEMA_VERSION, ...contract, userLanguage: plan.userLanguage,
      sourceHashes: plan.sourceHashes, useCaseHash, generatedAt,
    } satisfies Ns4UseCaseArtifact;
  }));
  const realizationHash = await sha256Ns4(artifacts.map(item => ({ useCaseId: item.useCaseId, useCaseHash: item.useCaseHash })));
  return {
    artifacts,
    index: {
      schemaVersion: NS4_USE_CASE_INDEX_SCHEMA_VERSION, moduleName: plan.moduleName,
      userLanguage: plan.userLanguage, sourceHashes: plan.sourceHashes,
      useCases: artifacts.map(item => ({ useCaseId: item.useCaseId, title: item.title, kind: item.kind,
        compiledFrom: item.compiledFrom, useCaseHash: item.useCaseHash,
        artifactPath: `l4/${plan.moduleName}/usecases/${item.useCaseId}.defs.ts` })),
      realizationHash, generatedAt,
    },
  };
}

export async function buildNs4WorkflowArtifacts(
  plan: Ns4E7PlanDraft,
  useCases: Ns4UseCaseArtifact[],
  ontologyStates: Map<string, string[]>,
  generatedAt: string,
): Promise<{ artifacts: Ns4WorkflowArtifact[]; index: Ns4WorkflowIndexArtifact }> {
  const byEntity = new Map<string, Ns4WorkflowTransition[]>();
  for (const useCase of useCases) {
    for (const transition of useCase.transitions) {
      const values = byEntity.get(transition.entityRef) || [];
      values.push({ ...transition, useCaseId: useCase.useCaseId });
      byEntity.set(transition.entityRef, values);
    }
  }
  const artifacts = await Promise.all([...byEntity.entries()].sort(([left], [right]) => left.localeCompare(right))
    .map(async ([entityRef, transitions]) => {
      const workflowId = `${entityRef.slice(0, 1).toLowerCase()}${entityRef.slice(1)}Lifecycle`;
      const states = ontologyStates.get(entityRef) || [];
      const workflowHash = await sha256Ns4({ entityRef, states, transitions, sourceHashes: plan.sourceHashes });
      return { schemaVersion: NS4_WORKFLOW_SCHEMA_VERSION, moduleName: plan.moduleName,
        userLanguage: plan.userLanguage, workflowId, entityRef, states, transitions,
        sourceHashes: plan.sourceHashes, workflowHash, generatedAt } satisfies Ns4WorkflowArtifact;
    }));
  const realizationHash = await sha256Ns4(artifacts.map(item => ({ workflowId: item.workflowId, workflowHash: item.workflowHash })));
  return {
    artifacts,
    index: {
      schemaVersion: NS4_WORKFLOW_INDEX_SCHEMA_VERSION, moduleName: plan.moduleName,
      userLanguage: plan.userLanguage,
      workflows: artifacts.map(item => ({ workflowId: item.workflowId, entityRef: item.entityRef,
        workflowHash: item.workflowHash, artifactPath: `l4/${plan.moduleName}/workflows/${item.workflowId}.defs.ts` })),
      sourceHashes: plan.sourceHashes, realizationHash, generatedAt,
    },
  };
}

export async function buildNs4RealizedJourneyArtifact(
  source: Ns4JourneyArtifact,
  useCases: Ns4UseCaseArtifact[],
): Promise<Ns4JourneyArtifactV3> {
  if (!('useRules' in source.business)) throw new Error(`E7 does not migrate legacy journey ${source.journeyId}.`);
  const business = source.business;
  const journeyUseCases = useCases.filter(useCase => useCase.compiledFrom.some(ref => ref.startsWith(`${source.journeyId}.`)));
  const contexts = new Map<string, { value: Ns4JourneyArtifactV3['resolution']['contexts'][string]; sources: Set<string>; consumers: Set<string> }>();
  const addContext = (context: Ns4JourneyArtifactV3['resolution']['contexts'][string], sourceRef: string, consumers: string[]) => {
    const current = contexts.get(context.contextId) || { value: context, sources: new Set<string>(), consumers: new Set<string>() };
    current.sources.add(sourceRef); consumers.forEach(ref => current.consumers.add(ref)); contexts.set(context.contextId, current);
  };
  for (const context of business.entry.carries) {
    const consumers = business.steps.filter(step => step.requiresContext.includes(context.contextId))
      .map(step => `${source.journeyId}.${step.stepId}`);
    addContext({ ...context, sourceRefs: [], consumerStepRefs: [] }, `${source.journeyId}.entry`, consumers);
  }
  for (const step of business.steps) for (const context of step.providesContext) {
    const consumers = business.steps.filter(candidate => candidate.requiresContext.includes(context.contextId))
      .map(candidate => `${source.journeyId}.${candidate.stepId}`);
    addContext({ ...context, sourceRefs: [], consumerStepRefs: [] }, `${source.journeyId}.${step.stepId}`, consumers);
  }
  const resolvedContexts = Object.fromEntries([...contexts.entries()].map(([contextId, entry]) => [contextId, {
    ...entry.value, sourceRefs: [...entry.sources].sort(), consumerStepRefs: [...entry.consumers].sort(),
  }]));
  const steps = business.steps.map(step => ({ stepId: step.stepId,
    useCaseRefs: journeyUseCases.filter(useCase => useCase.compiledFrom.includes(`${source.journeyId}.${step.stepId}`))
      .map(useCase => useCase.useCaseId).sort() }));
  const transitionRefs = journeyUseCases.flatMap(useCase => useCase.transitions.map(transition => transition.transitionId));
  const realizationHash = await sha256Ns4({ contexts: resolvedContexts, steps, transitionRefs, businessHash: source.businessHash });
  return {
    schemaVersion: NS4_REALIZED_JOURNEY_SCHEMA_VERSION, journeyId: source.journeyId,
    revision: source.revision, business, businessHash: source.businessHash,
    resolution: { status: 'compiled', contexts: resolvedContexts },
    realization: { status: 'compiled', compiledFromBusinessHash: source.businessHash,
      steps, transitionRefs: [...new Set(transitionRefs)].sort(), realizationHash },
  };
}

export async function buildNs4RealizedJourneyIndex(
  source: Ns4JourneyIndex,
  journeys: Ns4JourneyArtifactV3[],
): Promise<Ns4JourneyIndex> {
  const byId = new Map(journeys.map(journey => [journey.journeyId, journey]));
  const entries = source.journeys.map(entry => ({ ...entry,
    useCaseRefs: [...new Set((byId.get(entry.journeyId)?.realization.steps || []).flatMap(step => step.useCaseRefs))].sort() }));
  const realizationHash = await sha256Ns4(journeys.map(journey => ({ journeyId: journey.journeyId,
    realizationHash: journey.realization.realizationHash })));
  return { ...source, schemaVersion: '2026-08-10-ns4-journey-index-v3', journeys: entries, realizationHash };
}

export async function buildNs4RealizedAccessArtifact(
  source: Ns4AccessMatrixArtifact,
  useCases: Ns4UseCaseArtifact[],
): Promise<Ns4AccessMatrixArtifactV3> {
  if (source.grants.some(grant => !('useRules' in grant))) throw new Error('E7 does not migrate a legacy access matrix.');
  const grants = source.grants as Ns4AccessMatrixArtifactV3['grants'];
  const useCaseAuthorityRefs = useCases.flatMap(useCase => source.authorities.flatMap(authority => {
    const journeyStepRefs = useCase.compiledFrom.filter(ref => authority.journeyStepRefs.includes(ref));
    return journeyStepRefs.length ? [{ useCaseId: useCase.useCaseId,
      authorityRef: authority.authorityRef, journeyStepRefs }] : [];
  })).sort((left, right) => `${left.useCaseId}|${left.authorityRef}`.localeCompare(`${right.useCaseId}|${right.authorityRef}`));
  const realizationHash = await sha256Ns4({ accessHash: source.accessHash, useCaseAuthorityRefs });
  return {
    schemaVersion: NS4_REALIZED_ACCESS_MATRIX_SCHEMA_VERSION, moduleName: source.moduleName,
    userLanguage: source.userLanguage, title: source.title, profiles: source.profiles,
    authorities: source.authorities, grants, accessHash: source.accessHash,
    approvedBy: source.approvedBy, approvedAt: source.approvedAt,
    realization: { status: 'useCasesCompiled', compiledFromAccessHash: source.accessHash,
      useCaseAuthorityRefs, operationAuthorityRefs: [], realizationHash },
  };
}

function normalizeFieldRef(value: unknown): Ns4UseCaseFieldRef | undefined {
  const item = record(value); const entityId = text(item.entityId); const fieldId = text(item.fieldId);
  return entityId && fieldId ? { entityId, fieldId } : undefined;
}
function fieldType(value: unknown): Ns4UseCaseFieldType {
  const candidate = text(value);
  return ['uuid', 'string', 'text', 'number', 'integer', 'boolean', 'money', 'date', 'datetime', 'json'].includes(candidate)
    ? candidate as Ns4UseCaseFieldType : 'string';
}
function normalizeInput(value: unknown): Ns4UseCaseInput {
  const item = record(value); const ref = normalizeFieldRef(item.fieldRef);
  return { inputId: text(item.inputId), required: item.required === true,
    ...(!ref ? { type: fieldType(item.type) } : {}),
    ...(ref ? { fieldRef: ref } : {}),
    description: text(item.description) };
}
function normalizeOutput(value: unknown): Ns4UseCaseOutput {
  const item = record(value); const ref = normalizeFieldRef(item.fieldRef);
  return { outputId: text(item.outputId), required: item.required === true,
    ...(!ref ? { type: fieldType(item.type) } : {}),
    ...(text(item.contextId) ? { contextId: text(item.contextId) } : {}), ...(ref ? { fieldRef: ref } : {}),
    description: text(item.description) };
}
function normalizeEntityAccess(value: unknown): Ns4UseCaseEntityAccess {
  const item = record(value); return { entityId: text(item.entityId), fieldRefs: strings(item.fieldRefs) };
}
function normalizeTransition(value: unknown): Ns4UseCaseTransition {
  const transition = record(value); return {
    transitionId: text(transition.transitionId), entityRef: text(transition.entityRef),
    fromStates: strings(transition.fromStates), toState: text(transition.toState), useRules: strings(transition.useRules),
  };
}
function normalizeError(value: unknown): Ns4UseCaseError {
  const item = record(value); return { errorId: text(item.errorId), description: text(item.description),
    when: text(item.when), useRules: strings(item.useRules) };
}
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function strings(value: unknown): string[] { return array(value).map(text).filter(Boolean); }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
