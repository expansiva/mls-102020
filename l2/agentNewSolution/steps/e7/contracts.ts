/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e7/contracts.ts" enhancement="_blank"/>

import { isNs4CurrentJourneyBusiness, sha256Ns4 } from '/_102020_/l2/agentNewSolution/steps/e2/contracts.js';
import type {
  Ns4E2Review, Ns4JourneyArtifact, Ns4JourneyArtifactV5Realized, Ns4JourneyIndex, Ns4JourneyStepKind,
} from '/_102020_/l2/agentNewSolution/steps/e2/contracts.js';
import { NS4_JOURNEY_INDEX_SCHEMA_VERSION, NS4_REALIZED_JOURNEY_SCHEMA_VERSION } from '/_102020_/l2/agentNewSolution/steps/e2/contracts.js';
import type {
  Ns4AccessMatrixArtifact, Ns4AccessMatrixArtifactV3,
} from '/_102020_/l2/agentNewSolution/steps/e3/contracts.js';
import { NS4_REALIZED_ACCESS_MATRIX_SCHEMA_VERSION } from '/_102020_/l2/agentNewSolution/steps/e3/contracts.js';
import type { Ns4OntologyField } from '/_102020_/l2/agentNewSolution/steps/e4/contracts.js';
import { resolveNs4Findings, type Ns4SystemDecision } from '/_102020_/l2/agentNewSolution/helpers/ns4Resolve.js';
import type { Ns4DerivedContextGraph } from '/_102020_/l2/agentNewSolution/helpers/ns4Context.js';
import { shrinkNs4WorkflowToReachable } from '/_102020_/l2/agentNewSolution/steps/e7/reachability.js';

export const NS4_USE_CASE_DRAFT_VERSION = '2026-08-10-ns4-usecase-draft-minimal-v3' as const;
export const NS4_USE_CASE_SCHEMA_VERSION = '2026-08-10-ns4-usecase-v3' as const;
export const NS4_USE_CASE_INDEX_SCHEMA_VERSION = '2026-08-10-ns4-usecase-index-v3' as const;
export const NS4_WORKFLOW_SCHEMA_VERSION = '2026-08-11-ns4-workflow-v4' as const;
export const NS4_WORKFLOW_INDEX_SCHEMA_VERSION = '2026-08-12-ns4-workflow-index-v5' as const;

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
  entityRefs: string[];
  useRules: string[];
  transitions: Ns4UseCaseTransition[];
}

export interface Ns4UseCaseArtifactV3 extends Omit<Ns4UseCaseDraft, 'planId' | 'draftVersion' | 'transitions'> {
  schemaVersion: typeof NS4_USE_CASE_SCHEMA_VERSION;
  transitionRefs: string[];
  useCaseHash: string;
}

export interface Ns4UseCaseIndexArtifactV3 {
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
  useCaseId?: string;
  trigger?: 'system';
}

/** Lifecycle facts are owned by E4 and copied mechanically into E7 workflows. */
export interface Ns4WorkflowLifecycleDefinition {
  states: string[];
  initialState?: string;
  terminalStates?: string[];
  lifecyclePredicates?: Array<{ predicateId: string; stateIds: string[] }>;
}

export interface Ns4WorkflowArtifactV2 {
  schemaVersion: typeof NS4_WORKFLOW_SCHEMA_VERSION;
  moduleName: string;
  workflowId: string;
  entityRef: string;
  initialState: string;
  terminalStates: string[];
  states: string[];
  transitions: Ns4WorkflowTransition[];
  workflowHash: string;
}

export interface Ns4WorkflowIndexArtifactV2 {
  schemaVersion: '2026-08-11-ns4-workflow-index-v4';
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

export interface Ns4WorkflowIndexArtifactV3 extends Omit<Ns4WorkflowIndexArtifactV2, 'schemaVersion'> {
  schemaVersion: typeof NS4_WORKFLOW_INDEX_SCHEMA_VERSION;
  systemDecisions: Ns4SystemDecision[];
}

// Versioned legacy contracts keep already-generated L4 modules type-safe. New E7 runs emit only
// the explicitly versioned V3/V2 types above; old drafts are never resumed or migrated.
export interface Ns4UseCaseArtifact extends Ns4E7PlanUseCase {
  schemaVersion: '2026-08-10-ns4-usecase-v2';
  moduleName: string;
  description: string;
  inputs: Ns4UseCaseInput[];
  outputs: Ns4UseCaseOutput[];
  reads: Ns4UseCaseEntityAccess[];
  writes: Ns4UseCaseEntityAccess[];
  useRules: string[];
  transitions: Ns4UseCaseTransition[];
  errors: Ns4UseCaseError[];
  userLanguage: string;
  sourceHashes: Ns4E7SourceHashes;
  useCaseHash: string;
  generatedAt: string;
}

export interface Ns4UseCaseIndexArtifact {
  schemaVersion: '2026-08-10-ns4-usecase-index-v2';
  moduleName: string;
  userLanguage: string;
  sourceHashes: Ns4E7SourceHashes;
  useCases: Array<{ useCaseId: string; title: string; kind: Ns4UseCaseKind; compiledFrom: string[];
    useCaseHash: string; artifactPath: string }>;
  realizationHash: string;
  generatedAt: string;
}

export interface Ns4WorkflowArtifact {
  schemaVersion: '2026-08-10-ns4-workflow-v1';
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
  schemaVersion: '2026-08-10-ns4-workflow-index-v1';
  moduleName: string;
  userLanguage: string;
  workflows: Array<{ workflowId: string; entityRef: string; workflowHash: string; artifactPath: string }>;
  sourceHashes: Ns4E7SourceHashes;
  realizationHash: string;
  generatedAt: string;
}

/** Contexts come from the derivation, never from the journey text: E7 copies no declared name. */
export function buildNs4E7Plan(
  moduleName: string,
  userLanguage: string,
  journeys: Ns4E2Review,
  sourceHashes: Ns4E7SourceHashes,
  contexts: Ns4DerivedContextGraph,
): Ns4E7PlanDraft {
  const grouped = new Map<string, { kinds: Set<Ns4JourneyStepKind>; refs: string[]; titles: string[];
    requires: Set<string>; provides: Set<string> }>();
  for (const journey of journeys.journeys) {
    for (const step of journey.business.steps) {
      const current = grouped.get(step.stepId) || { kinds: new Set<Ns4JourneyStepKind>(), refs: [], titles: [],
        requires: new Set<string>(), provides: new Set<string>() };
      const stepRef = `${journey.journeyId}.${step.stepId}`;
      current.kinds.add(step.kind);
      current.refs.push(stepRef);
      current.titles.push(step.title);
      contexts.byStepRef.get(stepRef)?.requires.forEach(context => current.requires.add(context.contextId));
      contexts.byStepRef.get(stepRef)?.provides.forEach(context => current.provides.add(context.contextId));
      grouped.set(step.stepId, current);
    }
  }
  const useCases = [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([useCaseId, group]) => ({
    useCaseId,
    title: group.titles[0] || useCaseId,
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
    entityRefs: uniqueStrings(root.entityRefs), useRules: uniqueStrings(root.useRules),
    transitions: array(root.transitions).map(normalizeTransition),
  };
}

export async function buildNs4UseCaseArtifacts(
  plan: Ns4E7PlanDraft,
  drafts: Ns4UseCaseDraft[],
  generatedAt: string,
): Promise<{ artifacts: Ns4UseCaseArtifactV3[]; index: Ns4UseCaseIndexArtifactV3 }> {
  const artifacts = await Promise.all(drafts.map(async draft => {
    const { planId: _planId, draftVersion: _draftVersion, transitions, ...contract } = draft;
    const transitionRefs = [...new Set(transitions.map(transition => transition.transitionId))].sort();
    const useCaseHash = await sha256Ns4({ ...contract, transitionRefs });
    return {
      schemaVersion: NS4_USE_CASE_SCHEMA_VERSION, ...contract, transitionRefs, useCaseHash,
    } satisfies Ns4UseCaseArtifactV3;
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
  drafts: Ns4UseCaseDraft[],
  ontologyLifecycles: Map<string, Ns4WorkflowLifecycleDefinition>,
  generatedAt: string,
): Promise<{ artifacts: Ns4WorkflowArtifactV2[]; index: Ns4WorkflowIndexArtifactV3 }> {
  const byEntity = new Map<string, Ns4WorkflowTransition[]>();
  for (const useCase of drafts) {
    for (const transition of useCase.transitions) {
      const values = byEntity.get(transition.entityRef) || [];
      values.push({ ...transition, useCaseId: useCase.useCaseId });
      byEntity.set(transition.entityRef, values);
    }
  }
  const relevantEntities = [...ontologyLifecycles.entries()].filter(([entityRef, lifecycle]) => {
    const terminal = new Set(lifecycle.terminalStates || []);
    return byEntity.has(entityRef) || lifecycle.states.some(state => state !== lifecycle.initialState && !terminal.has(state));
  }).sort(([left], [right]) => left.localeCompare(right));
  const decisions: Ns4SystemDecision[] = [];
  const artifacts = (await Promise.all(relevantEntities.map(async ([entityRef, lifecycle]) => {
      const transitions = byEntity.get(entityRef) || [];
      const workflowId = `${entityRef.slice(0, 1).toLowerCase()}${entityRef.slice(1)}Lifecycle`;
      const initialState = lifecycle.initialState || '';
      const portuguese = plan.userLanguage.toLowerCase().startsWith('pt');
      const base = {
        states: [...lifecycle.states],
        terminalStates: [...(lifecycle.terminalStates || [])],
        transitions,
      };
      const shrink = shrinkNs4WorkflowToReachable(initialState, base.states, base.transitions);
      const resolution = resolveNs4Findings(base, shrink.removedStates
        .map(state => ({
          classification: 'C' as const,
          decisionId: `shrink${entityRef}${state.slice(0, 1).toUpperCase()}${state.slice(1)}`,
          findingRef: `workflow.state.unreachable:${entityRef}.${state}`,
          stage: 'e7',
          question: portuguese
            ? `Como o estado inalcançável ${entityRef}.${state} deve ser tratado?`
            : `How should the unreachable ${entityRef}.${state} lifecycle state be handled?`,
          deterministicChoice: 'shrinkLifecycle',
          alternatives: ['operateState'],
          changeHint: portuguese
            ? `Adicione uma jornada/operação explícita no E2 que alcance ${entityRef}.${state} antes de restaurá-lo no workflow compilado; a ontologia E4 permanece inalterada.`
            : `Add an explicit E2 journey/operation that reaches ${entityRef}.${state} before restoring it to the compiled workflow; the E4 ontology remains unchanged.`,
          apply: (artifact: typeof base) => {
            const next = shrinkNs4WorkflowToReachable(initialState, artifact.states.filter(item => item !== state), artifact.transitions
              .filter(transition => transition.toState !== state)
              .map(transition => ({ ...transition, fromStates: transition.fromStates.filter(item => item !== state) }))
              .filter(transition => transition.fromStates.length));
            return { states: next.states, transitions: next.transitions,
              terminalStates: artifact.terminalStates.filter(item => next.states.includes(item)) };
          },
        })));
      decisions.push(...resolution.systemDecisions);
      const { states, terminalStates, transitions: resolvedTransitions } = resolution.artifact;
      const dormantPredicates = (lifecycle.lifecyclePredicates || []).filter(predicate => predicate.stateIds.length
        && predicate.stateIds.every(state => !states.includes(state)));
      const predicateResolution = resolveNs4Findings(states, dormantPredicates.map(predicate => ({
        classification: 'C' as const,
        decisionId: `dormant${entityRef}${predicate.predicateId.slice(0, 1).toUpperCase()}${predicate.predicateId.slice(1)}`,
        findingRef: `workflow.predicate.dead:${entityRef}.${predicate.predicateId}`,
        stage: 'e7',
        question: portuguese
          ? `O critério ${predicate.predicateId} não tem efeito nesta versão — nenhum estado que o satisfaz é alcançado.`
          : `The ${predicate.predicateId} criterion has no effect in this version — none of its states is reachable.`,
        deterministicChoice: 'leavePredicateDormant', alternatives: ['operateState'],
        changeHint: portuguese
          ? `Adicione no E2 uma jornada que alcance um dos estados ${predicate.stateIds.join(', ')}; a regra E5 e a ontologia E4 permanecem inalteradas.`
          : `Add an E2 journey that reaches one of ${predicate.stateIds.join(', ')}; the E5 rule and E4 ontology remain unchanged.`,
        apply: (artifact: string[]) => artifact,
      })));
      decisions.push(...predicateResolution.systemDecisions);
      if (!resolvedTransitions.length) {
        const omission = resolveNs4Findings(true, [{
          classification: 'C' as const, decisionId: `omit${entityRef}Workflow`,
          findingRef: `workflow.missing:${entityRef}`, stage: 'e7',
          question: portuguese
            ? `${entityRef} está sem fluxo de estados operado nesta versão.`
            : `${entityRef} has no operated state flow in this version.`,
          deterministicChoice: 'omitWorkflow', alternatives: ['operateState'],
          changeHint: portuguese
            ? `Adicione no E2 uma jornada que opere uma transição de ${entityRef}; a ontologia E4 permanece inalterada.`
            : `Add an E2 journey that operates a ${entityRef} transition; the E4 ontology remains unchanged.`,
          apply: () => false,
        }]);
        decisions.push(...omission.systemDecisions);
        return null;
      }
      const workflowHash = await sha256Ns4({ entityRef, initialState, terminalStates, states, transitions: resolvedTransitions });
      return { schemaVersion: NS4_WORKFLOW_SCHEMA_VERSION, moduleName: plan.moduleName,
        workflowId, entityRef, initialState, terminalStates, states, transitions: resolvedTransitions, workflowHash } satisfies Ns4WorkflowArtifactV2;
    }))).filter((artifact): artifact is Ns4WorkflowArtifactV2 => !!artifact);
  const realizationHash = await sha256Ns4(artifacts.map(item => ({ workflowId: item.workflowId, workflowHash: item.workflowHash })));
  return {
    artifacts,
    index: {
      schemaVersion: NS4_WORKFLOW_INDEX_SCHEMA_VERSION, moduleName: plan.moduleName,
      userLanguage: plan.userLanguage,
      workflows: artifacts.map(item => ({ workflowId: item.workflowId, entityRef: item.entityRef,
        workflowHash: item.workflowHash, artifactPath: `l4/${plan.moduleName}/workflows/${item.workflowId}.defs.ts` })),
      sourceHashes: plan.sourceHashes, realizationHash, generatedAt, systemDecisions: decisions,
    },
  };
}

export async function buildNs4RealizedJourneyArtifact(
  source: Ns4JourneyArtifact,
  useCases: Ns4UseCaseArtifactV3[],
  derived: Ns4DerivedContextGraph,
): Promise<Ns4JourneyArtifactV5Realized> {
  if (!isNs4CurrentJourneyBusiness(source.business)) throw new Error(`E7 does not migrate legacy journey ${source.journeyId}.`);
  const business = source.business;
  const journeyUseCases = useCases.filter(useCase => useCase.compiledFrom.some(ref => ref.startsWith(`${source.journeyId}.`)));
  const contexts = new Map<string, { value: Ns4JourneyArtifactV5Realized['resolution']['contexts'][string]; sources: Set<string>; consumers: Set<string> }>();
  const addContext = (context: Ns4JourneyArtifactV5Realized['resolution']['contexts'][string], sourceRef: string, consumers: string[]) => {
    const current = contexts.get(context.contextId) || { value: context, sources: new Set<string>(), consumers: new Set<string>() };
    current.sources.add(sourceRef); consumers.forEach(ref => current.consumers.add(ref)); contexts.set(context.contextId, current);
  };
  const journeySteps = business.steps.map(step => derived.byStepRef.get(`${source.journeyId}.${step.stepId}`))
    .filter((step): step is NonNullable<typeof step> => !!step);
  const consumersOf = (contextId: string) => journeySteps
    .filter(step => step.requires.some(context => context.contextId === contextId)).map(step => step.stepRef);
  for (const context of derived.entryByJourneyId.get(source.journeyId) || []) {
    addContext({ ...context, sourceRefs: [], consumerStepRefs: [] }, `${source.journeyId}.entry`, consumersOf(context.contextId));
  }
  for (const step of journeySteps) for (const context of step.provides) {
    addContext({ ...context, sourceRefs: [], consumerStepRefs: [] }, step.stepRef, consumersOf(context.contextId));
  }
  const resolvedContexts = Object.fromEntries([...contexts.entries()].map(([contextId, entry]) => [contextId, {
    ...entry.value, sourceRefs: [...entry.sources].sort(), consumerStepRefs: [...entry.consumers].sort(),
  }]));
  const steps = business.steps.map(step => ({ stepId: step.stepId,
    useCaseRefs: journeyUseCases.filter(useCase => useCase.compiledFrom.includes(`${source.journeyId}.${step.stepId}`))
      .map(useCase => useCase.useCaseId).sort() }));
  const transitionRefs = journeyUseCases.flatMap(useCase => useCase.transitionRefs);
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
  journeys: Ns4JourneyArtifactV5Realized[],
): Promise<Ns4JourneyIndex> {
  const byId = new Map(journeys.map(journey => [journey.journeyId, journey]));
  const entries = source.journeys.map(entry => ({ ...entry,
    useCaseRefs: [...new Set((byId.get(entry.journeyId)?.realization.steps || []).flatMap(step => step.useCaseRefs))].sort() }));
  const realizationHash = await sha256Ns4(journeys.map(journey => ({ journeyId: journey.journeyId,
    realizationHash: journey.realization.realizationHash })));
  return { ...source, schemaVersion: NS4_JOURNEY_INDEX_SCHEMA_VERSION, journeys: entries, realizationHash };
}

export async function buildNs4RealizedAccessArtifact(
  source: Ns4AccessMatrixArtifact,
  useCases: Ns4UseCaseArtifactV3[],
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

function normalizeTransition(value: unknown): Ns4UseCaseTransition {
  const transition = record(value); return {
    transitionId: text(transition.transitionId), entityRef: text(transition.entityRef),
    fromStates: strings(transition.fromStates), toState: text(transition.toState), useRules: strings(transition.useRules),
  };
}
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function strings(value: unknown): string[] { return array(value).map(text).filter(Boolean); }
function uniqueStrings(value: unknown): string[] { return [...new Set(strings(value))].sort(); }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
