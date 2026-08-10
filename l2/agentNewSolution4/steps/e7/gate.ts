/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e7/gate.ts" enhancement="_blank"/>

import type { Ns4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type { Ns4E3Review } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import type { Ns4E4Review } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import type { Ns4RulesArtifact } from '/_102020_/l2/agentNewSolution4/steps/e5/contracts.js';
import {
  NS4_USE_CASE_DRAFT_VERSION,
} from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';
import type {
  Ns4E7PlanDraft, Ns4E7SourceHashes, Ns4UseCaseDraft, Ns4UseCaseFieldRef, Ns4WorkflowArtifact,
} from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';

export interface Ns4E7GateIssue { code: string; path: string; message: string; }
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

  for (const input of draft.inputs) validateValue(input, 'inputs', sources, add);
  for (const output of draft.outputs) {
    validateValue(output, 'outputs', sources, add);
    if (output.contextId && !expectedProvides.includes(output.contextId)) {
      add('NS4_E7_OUTPUT_CONTEXT', `outputs.${output.outputId}.contextId`, `Unknown provided context ${output.contextId}.`);
    }
  }
  for (const contextId of expectedProvides) if (!draft.outputs.some(output => output.contextId === contextId)) {
    add('NS4_E7_OUTPUT_CONTEXT_MISSING', 'outputs', `Provided context ${contextId} needs at least one canonical output.`);
  }

  const entities = new Map(sources.ontology.entities.map(entity => [entity.entityId, entity]));
  for (const [collectionName, accesses] of [['reads', draft.reads], ['writes', draft.writes]] as const) {
    accesses.forEach((access, index) => {
      const entity = entities.get(access.entityId);
      if (!entity) add('NS4_E7_ENTITY', `${collectionName}[${index}].entityId`, `Unknown entity ${access.entityId}.`);
      else for (const field of access.fieldRefs) if (!entity.fields.some(item => item.fieldId === field)) {
        add('NS4_E7_FIELD', `${collectionName}[${index}].fieldRefs`, `Unknown field ${access.entityId}.${field}.`);
      }
      if (!access.fieldRefs.length) add('NS4_E7_ACCESS_FIELDS', `${collectionName}[${index}].fieldRefs`, 'At least one exact ontology field is required.');
    });
  }
  if (draft.kind === 'query' && draft.writes.length) add('NS4_E7_QUERY_WRITES', 'writes', 'A query cannot change business data.');

  const ruleIds = new Set(sources.rules.rules.map(rule => rule.id));
  const usedRules = [draft.useRules, ...draft.errors.map(error => error.useRules), ...draft.transitions.map(transition => transition.useRules)].flat();
  for (const rule of usedRules) if (!ruleIds.has(rule)) add('NS4_E7_RULE', 'useRules', `Unknown rule ${rule}.`);
  draft.errors.forEach((error, index) => {
    if (!MEMBER_ID.test(error.errorId)) add('NS4_E7_ERROR_ID', `errors[${index}].errorId`, 'Error id must be lower-camel.');
    if (!error.description || !error.when) add('NS4_E7_ERROR', `errors[${index}]`, 'Business error needs description and condition.');
  });
  for (const transition of draft.transitions) {
    const entity = entities.get(transition.entityRef);
    if (!entity) add('NS4_E7_TRANSITION_ENTITY', 'transitions', `Unknown transition entity ${transition.entityRef}.`);
    else for (const state of [...transition.fromStates, transition.toState]) if (!entity.lifecycleStates.includes(state)) {
      add('NS4_E7_TRANSITION_STATE', 'transitions', `Unknown ${transition.entityRef} lifecycle state ${state}.`);
    }
    if (!MEMBER_ID.test(transition.transitionId)) add('NS4_E7_TRANSITION_ID', 'transitions', 'Transition id must be lower-camel.');
    if (!transition.fromStates.length || !transition.toState) add('NS4_E7_TRANSITION_BOUNDS', 'transitions', 'Transition needs at least one from state and one target state.');
  }
  return { ok: issues.length === 0, issues };
}

export function validateNs4Workflows(workflows: Ns4WorkflowArtifact[], sources: Ns4E7Sources): Ns4E7GateResult {
  const issues: Ns4E7GateIssue[] = [];
  const add = issueAdder(issues);
  const entities = new Map(sources.ontology.entities.map(entity => [entity.entityId, entity]));
  const ids = new Set<string>();
  for (const workflow of workflows) {
    if (ids.has(workflow.workflowId)) add('NS4_E7_WORKFLOW_DUPLICATE', 'workflows', `Duplicate workflow ${workflow.workflowId}.`);
    ids.add(workflow.workflowId);
    const entity = entities.get(workflow.entityRef);
    if (!entity) add('NS4_E7_WORKFLOW_ENTITY', workflow.workflowId, `Unknown entity ${workflow.entityRef}.`);
    else if (!sameSet(workflow.states, entity.lifecycleStates)) add('NS4_E7_WORKFLOW_STATES', workflow.workflowId, 'Workflow states must exactly match E4 lifecycle states.');
    if (!workflow.transitions.length) add('NS4_E7_WORKFLOW_EMPTY', workflow.workflowId, 'A workflow requires at least one transition.');
  }
  return { ok: issues.length === 0, issues };
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

function validateValue(
  value: { inputId?: string; outputId?: string; type?: string; fieldRef?: Ns4UseCaseFieldRef; description: string },
  collection: 'inputs' | 'outputs',
  sources: Ns4E7Sources,
  add: ReturnType<typeof issueAdder>,
): void {
  const id = value.inputId || value.outputId || '';
  if (!MEMBER_ID.test(id)) add('NS4_E7_VALUE_ID', `${collection}.${id || '?'}`, 'Value id must be lower-camel.');
  if (!value.description) add('NS4_E7_VALUE_DESCRIPTION', `${collection}.${id}`, 'A short business description is required.');
  if (!value.fieldRef) {
    if (!value.type) add('NS4_E7_VALUE_TYPE', `${collection}.${id}.type`, 'A non-ontology value needs an explicit type.');
    return;
  }
  const field = findField(value.fieldRef, sources);
  if (!field) add('NS4_E7_FIELD', `${collection}.${id}.fieldRef`, `Unknown field ${value.fieldRef.entityId}.${value.fieldRef.fieldId}.`);
}

function findField(ref: Ns4UseCaseFieldRef, sources: Ns4E7Sources) {
  return sources.ontology.entities.find(entity => entity.entityId === ref.entityId)?.fields
    .find(field => field.fieldId === ref.fieldId);
}

function issueAdder(issues: Ns4E7GateIssue[]) {
  return (code: string, path: string, message: string) => issues.push({ code, path, message });
}

function sameSet(left: string[], right: string[]): boolean {
  return left.length === right.length && [...new Set(left)].sort().join('|') === [...new Set(right)].sort().join('|');
}
