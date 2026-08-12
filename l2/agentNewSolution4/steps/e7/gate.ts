/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e7/gate.ts" enhancement="_blank"/>

import type { Ns4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type { Ns4E3Review } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import type { Ns4E4Review } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import type { Ns4RulesArtifact } from '/_102020_/l2/agentNewSolution4/steps/e5/contracts.js';
import {
  NS4_USE_CASE_DRAFT_VERSION,
} from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';
import type {
  Ns4E7PlanDraft, Ns4E7SourceHashes, Ns4UseCaseDraft, Ns4WorkflowArtifactV2,
} from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';
import type { Ns4SystemDecision } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';
import { collectNs4ReachableWorkflowStates } from '/_102020_/l2/agentNewSolution4/steps/e7/reachability.js';

export interface Ns4E7LifecycleRepairOption {
  action: 'operateState' | 'shrinkLifecycle';
  owner: 'e2' | 'e4';
  instruction: string;
}

export interface Ns4E7GateIssue {
  code: string;
  path: string;
  message: string;
  severity?: 'warning';
  repairOptions?: [Ns4E7LifecycleRepairOption, Ns4E7LifecycleRepairOption];
}
export interface Ns4E7GateResult { ok: boolean; issues: Ns4E7GateIssue[]; }

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const STEP_REF = /^[a-z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*$/;

export interface Ns4E7Sources {
  journeys: Ns4E2Review;
  access: Ns4E3Review;
  ontology: Ns4E4Review;
  rules: Ns4RulesArtifact;
  sourceHashes?: Ns4E7SourceHashes;
}

export function validateNs4E7Plan(plan: Ns4E7PlanDraft, sources: Ns4E7Sources): Ns4E7GateResult {
  const issues: Ns4E7GateIssue[] = [];
  const add = issueAdder(issues);
  if (plan.moduleName !== sources.journeys.moduleName || plan.moduleName !== sources.access.moduleName
    || plan.moduleName !== sources.ontology.moduleName || plan.moduleName !== sources.rules.moduleName) {
    add('NS4_E7_MODULE', 'moduleName', 'All approved sources and the plan must belong to the same module.');
  }
  if (sources.sourceHashes && JSON.stringify(plan.sourceHashes) !== JSON.stringify(sources.sourceHashes)) {
    add('NS4_E7_SOURCE_DRIFT', 'sourceHashes', 'The E7 plan is stale relative to approved journey, ontology or rule hashes.');
  }
  const validSteps = collectSteps(sources.journeys);
  const covered = new Set<string>();
  const ids = new Set<string>();
  plan.useCases.forEach((useCase, index) => {
    const path = `useCases[${index}]`;
    if (!MEMBER_ID.test(useCase.useCaseId)) add('NS4_E7_USECASE_ID', `${path}.useCaseId`, 'Must be a lower-camel id.');
    if (ids.has(useCase.useCaseId)) add('NS4_E7_USECASE_DUPLICATE', `${path}.useCaseId`, `Duplicate use case ${useCase.useCaseId}.`);
    ids.add(useCase.useCaseId);
    if (!useCase.title) add('NS4_E7_USECASE_TITLE', `${path}.title`, 'A title is required.');
    if (!useCase.compiledFrom.length) add('NS4_E7_COMPILED_FROM', `${path}.compiledFrom`, 'At least one journey step is required.');
    const expectedRequires = new Set<string>();
    const expectedProvides = new Set<string>();
    for (const ref of useCase.compiledFrom) {
      if (!STEP_REF.test(ref) || !validSteps.has(ref)) add('NS4_E7_STEP_REF', `${path}.compiledFrom`, `Unknown journey step ${ref}.`);
      else {
        covered.add(ref);
        const kind = validSteps.get(ref)?.kind;
        validSteps.get(ref)?.requiresContext.forEach(contextId => expectedRequires.add(contextId));
        validSteps.get(ref)?.providesContext.forEach(context => expectedProvides.add(context.contextId));
        if ((kind === 'locate' || kind === 'inspect') !== (useCase.kind === 'query')) {
          add('NS4_E7_KIND', `${path}.kind`, `${ref} requires ${kind === 'locate' || kind === 'inspect' ? 'query' : 'command'}.`);
        }
      }
    }
    if (!sameSet(useCase.contexts.requires, [...expectedRequires])) add('NS4_E7_PLAN_CONTEXT_REQUIRED', `${path}.contexts.requires`, 'Plan contexts must be compiled from source steps.');
    if (!sameSet(useCase.contexts.provides, [...expectedProvides])) add('NS4_E7_PLAN_CONTEXT_PROVIDED', `${path}.contexts.provides`, 'Plan contexts must be compiled from source steps.');
  });
  for (const ref of validSteps.keys()) if (!covered.has(ref)) add('NS4_E7_STEP_UNCOVERED', 'useCases', `Journey step ${ref} has no use case.`);
  return { ok: issues.length === 0, issues };
}

export function validateNs4UseCaseDraft(
  plan: Ns4E7PlanDraft,
  draft: Ns4UseCaseDraft,
  sources: Ns4E7Sources,
): Ns4E7GateResult {
  const issues: Ns4E7GateIssue[] = [];
  const add = issueAdder(issues);
  const target = plan.useCases.find(item => item.useCaseId === draft.useCaseId);
  if (!target) return { ok: false, issues: [{ code: 'NS4_E7_UNKNOWN_USECASE', path: 'useCaseId', message: `Unknown use case ${draft.useCaseId}.` }] };
  if (draft.draftVersion !== NS4_USE_CASE_DRAFT_VERSION) add('NS4_E7_DRAFT_VERSION', 'draftVersion', 'Use case draft uses an obsolete contract.');
  if (draft.moduleName !== plan.moduleName) add('NS4_E7_MODULE', 'moduleName', 'Must match the E7 plan.');
  if (draft.kind !== target.kind) add('NS4_E7_KIND', 'kind', `Must remain ${target.kind}.`);
  if (!sameSet(draft.compiledFrom, target.compiledFrom)) add('NS4_E7_COMPILED_FROM', 'compiledFrom', 'Must exactly preserve the planned journey step refs.');
  if (!draft.title) add('NS4_E7_TITLE', 'title', 'A title is required.');
  if (!draft.description) add('NS4_E7_DESCRIPTION', 'description', 'A channel- and architecture-neutral behavior description is required.');

  const stepMap = collectSteps(sources.journeys);
  const sourceSteps = target.compiledFrom.map(ref => stepMap.get(ref)).filter((value): value is SourceStep => !!value);
  const expectedRequires = [...new Set(sourceSteps.flatMap(step => step.requiresContext))].sort();
  const expectedProvides = [...new Set(sourceSteps.flatMap(step => step.providesContext.map(context => context.contextId)))].sort();
  if (!sameSet(draft.contexts.requires, expectedRequires)) {
    add('NS4_E7_CONTEXT_REQUIRED', 'contexts.requires', `Must reference exactly: ${expectedRequires.join(', ') || '(none)'}.`);
  }
  if (!sameSet(draft.contexts.provides, expectedProvides)) {
    add('NS4_E7_CONTEXT_PROVIDED', 'contexts.provides', `Must reference exactly: ${expectedProvides.join(', ') || '(none)'}.`);
  }

  const entities = new Map(sources.ontology.entities.map(entity => [entity.entityId, entity]));
  if (!draft.entityRefs.length) add('NS4_E7_ENTITY_REFS', 'entityRefs', 'A behavior must reference at least one ontology entity.');
  for (const entityRef of draft.entityRefs) if (!entities.has(entityRef)) {
    add('NS4_E7_ENTITY', 'entityRefs', `Unknown entity ${entityRef}.`);
  }

  const ruleIds = new Set(sources.rules.rules.map(rule => rule.id));
  const usedRules = [draft.useRules, ...draft.transitions.map(transition => transition.useRules)].flat();
  for (const rule of usedRules) if (!ruleIds.has(rule)) add('NS4_E7_RULE', 'useRules', `Unknown rule ${rule}.`);
  const principalEntity = entities.get(draft.entityRefs[0] || '');
  const isInspection = sourceSteps.some(step => step.kind === 'inspect');
  const hasEligibilityRules = !!principalEntity?.lifecyclePredicates.length
    && principalEntity.useRules.some(ruleId => ruleIds.has(ruleId));
  if (draft.kind === 'query' && isInspection && hasEligibilityRules && draft.useRules.length === 0) {
    add('NS4_E7_INSPECTION_ELIGIBILITY_RULES', 'useRules',
      `Inspection of ${principalEntity?.entityId} has lifecycle eligibility rules available but selects none.`, 'warning');
  }
  if (draft.kind === 'query' && draft.transitions.length) add('NS4_E7_QUERY_TRANSITION', 'transitions', 'A query cannot change lifecycle state.');
  for (const transition of draft.transitions) {
    const entity = entities.get(transition.entityRef);
    if (!entity) add('NS4_E7_TRANSITION_ENTITY', 'transitions', `Unknown transition entity ${transition.entityRef}.`);
    else for (const state of [...transition.fromStates, transition.toState]) if (!entity.lifecycleStates.includes(state)) {
      add('NS4_E7_TRANSITION_STATE', 'transitions', `Unknown ${transition.entityRef} lifecycle state ${state}.`);
    }
    if (!draft.entityRefs.includes(transition.entityRef)) {
      add('NS4_E7_TRANSITION_REF', 'entityRefs', `Transition entity ${transition.entityRef} must be referenced by the behavior.`);
    }
    if (!MEMBER_ID.test(transition.transitionId)) add('NS4_E7_TRANSITION_ID', 'transitions', 'Transition id must be lower-camel.');
    if (!transition.fromStates.length || !transition.toState) add('NS4_E7_TRANSITION_BOUNDS', 'transitions', 'Transition needs at least one from state and one target state.');
  }
  return { ok: issues.every(issue => issue.severity === 'warning'), issues };
}

export function validateNs4Workflows(
  workflows: Ns4WorkflowArtifactV2[],
  sources: Ns4E7Sources,
  useCaseIds: Iterable<string>,
  systemDecisions: Ns4SystemDecision[] = [],
): Ns4E7GateResult {
  const issues: Ns4E7GateIssue[] = [];
  const add = issueAdder(issues);
  const entities = new Map(sources.ontology.entities.map(entity => [entity.entityId, entity]));
  const knownUseCaseIds = new Set(useCaseIds);
  const omittedWorkflowEntities = new Set(systemDecisions
    .filter(decision => decision.chosen === 'omitWorkflow' && decision.findingRef.startsWith('workflow.missing:'))
    .map(decision => decision.findingRef.slice('workflow.missing:'.length)));
  const ids = new Set<string>();
  for (const workflow of workflows) {
    if (ids.has(workflow.workflowId)) add('NS4_E7_WORKFLOW_DUPLICATE', 'workflows', `Duplicate workflow ${workflow.workflowId}.`);
    ids.add(workflow.workflowId);
    const entity = entities.get(workflow.entityRef);
    if (!entity) add('NS4_E7_WORKFLOW_ENTITY', workflow.workflowId, `Unknown entity ${workflow.entityRef}.`);
    else {
      const unknownStates = workflow.states.filter(state => !entity.lifecycleStates.includes(state));
      if (unknownStates.length) add('NS4_E7_WORKFLOW_STATES', workflow.workflowId, `Workflow contains states absent from E4: ${unknownStates.join(', ')}.`);
      if (workflow.initialState !== entity.initialState) add('workflow.initialState', workflow.workflowId, 'Workflow initialState must exactly match the E4 lifecycle initialState.');
      const unknownTerminals = workflow.terminalStates.filter(state => !(entity.terminalStates || []).includes(state));
      if (unknownTerminals.length) add('workflow.terminalStates', workflow.workflowId, `Workflow contains terminal states absent from E4: ${unknownTerminals.join(', ')}.`);
    }
    if (!workflow.states.includes(workflow.initialState)) add('NS4_E7_WORKFLOW_INITIAL', workflow.workflowId, 'Workflow initialState must be a declared lifecycle state.');
    const terminalStates = new Set(workflow.terminalStates);
    workflow.terminalStates.forEach(state => {
      if (!workflow.states.includes(state)) add('NS4_E7_WORKFLOW_TERMINAL', workflow.workflowId, `Unknown terminal state ${state}.`);
    });
    workflow.transitions.forEach((transition, index) => {
      const path = `${workflow.workflowId}.transitions[${index}]`;
      const hasUseCase = !!transition.useCaseId;
      const isSystem = transition.trigger === 'system';
      if (hasUseCase === isSystem) add('workflow.transition.operation', path, 'Transition requires exactly one of useCaseId or trigger="system".');
      if (hasUseCase && !knownUseCaseIds.has(transition.useCaseId || '')) add('workflow.transition.operation', path, `Transition useCaseId ${transition.useCaseId} is not compiled by E7.`);
      if (transition.entityRef !== workflow.entityRef) add('NS4_E7_WORKFLOW_TRANSITION_ENTITY', path, 'Workflow transitions must operate their workflow entity.');
      if (!transition.fromStates.length || !transition.toState) add('NS4_E7_WORKFLOW_TRANSITION_BOUNDS', path, 'Transition needs at least one from state and one target state.');
      transition.fromStates.forEach(state => {
        if (!workflow.states.includes(state)) add('NS4_E7_WORKFLOW_TRANSITION_STATE', path, `Unknown source lifecycle state ${state}.`);
      });
      if (!workflow.states.includes(transition.toState)) add('NS4_E7_WORKFLOW_TRANSITION_STATE', path, `Unknown target lifecycle state ${transition.toState}.`);
    });
    const reachableStates = collectNs4ReachableWorkflowStates(workflow.initialState, workflow.transitions);
    workflow.states.filter(state => state !== workflow.initialState).forEach(state => {
      if (!reachableStates.has(state)) {
        addLifecycleIssue(issues, 'workflow.state.unreachable', workflow.workflowId,
          `Lifecycle state ${state} has no incoming transition.`, workflow.entityRef, state);
      }
    });
    workflow.states.filter(state => !terminalStates.has(state)).forEach(state => {
      if (!workflow.transitions.some(transition => transition.fromStates.includes(state))) {
        add('workflow.state.deadEnd', workflow.workflowId, `Non-terminal lifecycle state ${state} has no outgoing transition.`, 'warning');
      }
    });
  }
  for (const entity of entities.values()) {
    const workflow = workflows.find(item => item.entityRef === entity.entityId);
    const terminalStates = new Set(entity.terminalStates || []);
    const hasIntermediateState = entity.lifecycleStates.some(state => state !== entity.initialState && !terminalStates.has(state));
    if (hasIntermediateState && !workflow && !omittedWorkflowEntities.has(entity.entityId)) {
      addLifecycleIssue(issues, 'workflow.missing', entity.entityId,
        `Entity ${entity.entityId} has an intermediate lifecycle state but no compiled workflow.`, entity.entityId);
      continue;
    }
    if (!workflow) continue;
    const reachableStates = collectNs4ReachableWorkflowStates(workflow.initialState, workflow.transitions);
    for (const predicate of entity.lifecyclePredicates) {
      for (const state of predicate.stateIds) {
        // A state intentionally omitted from the compiled partial workflow is already covered by
        // the workflow index's shrinkLifecycle system decision; E4 remains unchanged.
        if (!workflow.states.includes(state)) continue;
        if (entity.lifecycleStates.length && !reachableStates.has(state)) {
          addLifecycleIssue(issues, 'workflow.predicate.dead', entity.entityId,
            `Lifecycle predicate ${predicate.predicateId} references state ${state}, which no workflow transition reaches.`, entity.entityId, state);
        }
      }
    }
  }
  return { ok: issues.every(issue => issue.severity === 'warning'), issues };
}

interface SourceStep {
  kind: 'locate' | 'inspect' | 'act' | 'decide' | 'handoff';
  requiresContext: string[];
  providesContext: Array<{ contextId: string }>;
}

function collectSteps(journeys: Ns4E2Review): Map<string, SourceStep> {
  const result = new Map<string, SourceStep>();
  for (const journey of journeys.journeys) for (const step of journey.business.steps) result.set(`${journey.journeyId}.${step.stepId}`, {
    kind: step.kind, requiresContext: step.requiresContext, providesContext: step.providesContext,
  });
  return result;
}

function addLifecycleIssue(
  issues: Ns4E7GateIssue[],
  code: string,
  path: string,
  message: string,
  entityRef: string,
  state?: string,
): void {
  const target = state ? ` lifecycle state ${state}` : ' lifecycle contract';
  issues.push({
    code,
    path,
    message,
    repairOptions: [
      {
        action: 'operateState', owner: 'e2',
        instruction: `Reopen the E2 checkpoint and add or amend a journey step that operates the${target} for ${entityRef}; E7 will compile its use case and transition on the next round.`,
      },
      {
        action: 'shrinkLifecycle', owner: 'e4',
        instruction: `Reopen the E4 checkpoint and remove or redefine the${target} for ${entityRef} when it is not a required business outcome.`,
      },
    ],
  });
}

function issueAdder(issues: Ns4E7GateIssue[]) {
  return (code: string, path: string, message: string, severity?: 'warning') => issues.push({ code, path, message, ...(severity ? { severity } : {}) });
}

function sameSet(left: string[], right: string[]): boolean {
  return left.length === right.length && [...new Set(left)].sort().join('|') === [...new Set(right)].sort().join('|');
}
