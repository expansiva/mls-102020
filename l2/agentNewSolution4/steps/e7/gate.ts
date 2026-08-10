/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e7/gate.ts" enhancement="_blank"/>

import type { Ns4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type { Ns4E3Review } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import type { Ns4E4Review } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import type { Ns4RulesArtifact } from '/_102020_/l2/agentNewSolution4/steps/e5/contracts.js';
import type { Ns4CompositionArtifact } from '/_102020_/l2/agentNewSolution4/steps/e6/contracts.js';
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
  composition: Ns4CompositionArtifact;
  sourceHashes?: Ns4E7SourceHashes;
}

export function validateNs4E7Plan(plan: Ns4E7PlanDraft, sources: Ns4E7Sources): Ns4E7GateResult {
  const issues: Ns4E7GateIssue[] = [];
  const add = issueAdder(issues);
  if (plan.moduleName !== sources.journeys.moduleName || plan.moduleName !== sources.access.moduleName
    || plan.moduleName !== sources.ontology.moduleName || plan.moduleName !== sources.rules.moduleName
    || plan.moduleName !== sources.composition.moduleName) {
    add('NS4_E7_MODULE', 'moduleName', 'All approved sources and the plan must belong to the same module.');
  }
  if (sources.sourceHashes && JSON.stringify(plan.sourceHashes) !== JSON.stringify(sources.sourceHashes)) {
    add('NS4_E7_SOURCE_DRIFT', 'sourceHashes', 'The E7 plan is stale relative to approved E2-E6 hashes.');
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
    for (const ref of useCase.compiledFrom) {
      if (!STEP_REF.test(ref) || !validSteps.has(ref)) add('NS4_E7_STEP_REF', `${path}.compiledFrom`, `Unknown journey step ${ref}.`);
      else {
        covered.add(ref);
        const kind = validSteps.get(ref)?.kind;
        if ((kind === 'locate' || kind === 'inspect') !== (useCase.kind === 'query')) {
          add('NS4_E7_KIND', `${path}.kind`, `${ref} requires ${kind === 'locate' || kind === 'inspect' ? 'query' : 'command'}.`);
        }
      }
    }
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
  if (draft.moduleName !== plan.moduleName) add('NS4_E7_MODULE', 'moduleName', 'Must match the E7 plan.');
  if (draft.kind !== target.kind) add('NS4_E7_KIND', 'kind', `Must remain ${target.kind}.`);
  if (!sameSet(draft.compiledFrom, target.compiledFrom)) add('NS4_E7_COMPILED_FROM', 'compiledFrom', 'Must exactly preserve the planned journey step refs.');
  if (!draft.title) add('NS4_E7_TITLE', 'title', 'A title is required.');
  if (!draft.description) add('NS4_E7_DESCRIPTION', 'description', 'A channel-neutral behavior description is required.');

  const stepMap = collectSteps(sources.journeys);
  const sourceSteps = target.compiledFrom.map(ref => stepMap.get(ref)).filter((value): value is SourceStep => !!value);
  const expectedActors = new Set(sourceSteps.map(item => item.actorRef));
  for (const actor of expectedActors) if (!draft.actorRefs.includes(actor)) add('NS4_E7_ACTOR', 'actorRefs', `Missing source actor ${actor}.`);
  for (const actor of draft.actorRefs) if (!expectedActors.has(actor)) add('NS4_E7_ACTOR_EXTRA', 'actorRefs', `Actor ${actor} is not attached to the compiled journey steps.`);

  const authorityMap = new Map(sources.access.authorities.map(authority => [authority.authorityRef, authority]));
  const expectedAuthorities = new Set(sources.access.authorities
    .filter(authority => authority.journeyStepRefs.some(ref => target.compiledFrom.includes(ref)))
    .map(authority => authority.authorityRef));
  for (const authority of expectedAuthorities) if (!draft.authorityRefs.includes(authority)) add('NS4_E7_AUTHORITY', 'authorityRefs', `Missing authority ${authority}.`);
  for (const authority of draft.authorityRefs) {
    if (!authorityMap.has(authority)) add('NS4_E7_AUTHORITY_REF', 'authorityRefs', `Unknown authority ${authority}.`);
    else if (!expectedAuthorities.has(authority)) add('NS4_E7_AUTHORITY_EXTRA', 'authorityRefs', `Authority ${authority} is not attached to the compiled journey steps.`);
  }

  const expectedRequires = new Set(sourceSteps.flatMap(item => item.requiresContext));
  const expectedProvides = new Set(sourceSteps.flatMap(item => item.providesContext.map(context => context.contextId)));
  const actualRequires = new Set(draft.contexts.requires.map(context => context.contextId));
  const actualProvides = new Set(draft.contexts.provides.map(context => context.contextId));
  for (const context of expectedRequires) if (!actualRequires.has(context)) add('NS4_E7_CONTEXT_REQUIRED', 'contexts.requires', `Missing required context ${context}.`);
  for (const context of expectedProvides) if (!actualProvides.has(context)) add('NS4_E7_CONTEXT_PROVIDED', 'contexts.provides', `Missing provided context ${context}.`);
  const sourceJourneyIds = new Set(target.compiledFrom.map(ref => ref.split('.')[0]));
  const sourceJourneyStepRefs = new Set(sources.journeys.journeys.filter(item => sourceJourneyIds.has(item.journeyId))
    .flatMap(journey => journey.business.steps.map(step => `${journey.journeyId}.${step.stepId}`)));
  const knownContexts = new Map<string, string>();
  for (const journey of sources.journeys.journeys.filter(item => sourceJourneyIds.has(item.journeyId))) {
    for (const context of [...journey.business.entry.carries, ...journey.business.steps.flatMap(item => item.providesContext)]) {
      if (!knownContexts.has(context.contextId)) knownContexts.set(context.contextId, context.businessObject);
    }
  }
  for (const [kind, contexts] of [['requires', draft.contexts.requires], ['provides', draft.contexts.provides]] as const) {
    for (const context of contexts) {
      const businessObject = knownContexts.get(context.contextId);
      if (!businessObject) add('NS4_E7_CONTEXT_EXTRA', `contexts.${kind}`, `Context ${context.contextId} is not declared by the source journeys.`);
      else if (businessObject !== context.businessObject) add('NS4_E7_CONTEXT_OBJECT', `contexts.${kind}.${context.contextId}`, `Expected business object ${businessObject}, found ${context.businessObject}.`);
      for (const ref of context.sourceRefs) {
        const [journeyId, member] = ref.split('.');
        if (!sourceJourneyIds.has(journeyId) || (member !== 'entry' && !sourceJourneyStepRefs.has(ref))) {
          add('NS4_E7_CONTEXT_SOURCE', `contexts.${kind}.${context.contextId}.sourceRefs`, `Source ${ref} is outside the source journeys.`);
        }
      }
    }
  }
  const allContexts = new Set([...actualRequires, ...actualProvides]);
  for (const input of draft.inputs) {
    if (!MEMBER_ID.test(input.inputId)) add('NS4_E7_INPUT_ID', `inputs.${input.inputId}`, 'Input id must be lower-camel.');
    if (input.source === 'context' && (!input.contextId || !allContexts.has(input.contextId))) add('NS4_E7_INPUT_CONTEXT', `inputs.${input.inputId}`, 'Context input must reference a declared context.');
    if (input.fieldRef) validateFieldRef(input.fieldRef, sources, `inputs.${input.inputId}.fieldRef`, add);
  }
  for (const output of draft.outputs) {
    if (!MEMBER_ID.test(output.outputId)) add('NS4_E7_OUTPUT_ID', `outputs.${output.outputId}`, 'Output id must be lower-camel.');
    if (output.contextId && !allContexts.has(output.contextId)) add('NS4_E7_OUTPUT_CONTEXT', `outputs.${output.outputId}`, 'Output context must be declared.');
    if (output.fieldRef) validateFieldRef(output.fieldRef, sources, `outputs.${output.outputId}.fieldRef`, add);
  }
  for (const context of expectedProvides) if (!draft.outputs.some(output => output.contextId === context)) {
    add('NS4_E7_OUTPUT_CONTEXT_MISSING', 'outputs', `Provided context ${context} needs at least one canonical output field.`);
  }

  const entities = new Map(sources.ontology.entities.map(entity => [entity.entityId, entity]));
  for (const [collectionName, accesses] of [['reads', draft.reads], ['writes', draft.writes]] as const) {
    accesses.forEach((access, index) => {
      const entity = entities.get(access.entityId);
      if (!entity) add('NS4_E7_ENTITY', `${collectionName}[${index}].entityId`, `Unknown entity ${access.entityId}.`);
      else for (const field of access.fieldRefs) if (!entity.fields.some(item => item.fieldId === field)) add('NS4_E7_FIELD', `${collectionName}[${index}].fieldRefs`, `Unknown field ${access.entityId}.${field}.`);
      if (!access.fieldRefs.length) add('NS4_E7_ACCESS_FIELDS', `${collectionName}[${index}].fieldRefs`, 'At least one exact field is required.');
      if (!access.purpose) add('NS4_E7_ACCESS_PURPOSE', `${collectionName}[${index}].purpose`, 'Entity access purpose is required.');
    });
  }
  if (draft.kind === 'query' && draft.writes.length) add('NS4_E7_QUERY_WRITES', 'writes', 'Queries cannot write entities.');
  if (draft.kind === 'query' && !draft.query) add('NS4_E7_QUERY', 'query', 'Query contract is required.');
  if (draft.kind === 'query' && !draft.query?.projection.length) add('NS4_E7_QUERY_PROJECTION', 'query.projection', 'A query needs a canonical output projection.');
  if (draft.kind === 'command' && !draft.command) add('NS4_E7_COMMAND', 'command', 'Command contract is required.');
  if (draft.kind === 'command' && !draft.writes.length
    && !draft.ports.some(port => port.kind === 'communication' || port.kind === 'eventPublisher' || port.kind === 'externalService')) {
    add('NS4_E7_COMMAND_WRITES', 'writes', 'A command must name its durable write or an explicit communication/event/external effect.');
  }
  for (const ref of draft.query?.projection || []) validateFieldRef(ref, sources, 'query.projection', add);
  for (const filter of draft.query?.filters || []) validateFieldRef(filter.fieldRef, sources, 'query.filters.fieldRef', add);
  for (const ref of draft.query?.orderBy || []) validateFieldRef(ref, sources, 'query.orderBy', add);

  const ruleIds = new Set(sources.rules.rules.map(rule => rule.id));
  const usedRules = [draft.useRules, ...draft.errors.map(error => error.useRules), ...(draft.command?.transitions || []).map(transition => transition.useRules)].flat();
  for (const rule of usedRules) if (!ruleIds.has(rule)) add('NS4_E7_RULE', 'useRules', `Unknown rule ${rule}.`);
  const accessedEntities = new Set([...draft.reads, ...draft.writes].map(access => access.entityId));
  const requiredRules = new Set([
    ...sources.journeys.journeys.filter(journey => sourceJourneyIds.has(journey.journeyId)).flatMap(journey => journey.business.useRules),
    ...sources.access.grants.filter(grant => expectedAuthorities.has(grant.authorityRef)).flatMap(grant => grant.useRules),
    ...sources.ontology.entities.filter(entity => accessedEntities.has(entity.entityId)).flatMap(entity => entity.useRules),
  ]);
  for (const rule of requiredRules) if (!draft.useRules.includes(rule)) add('NS4_E7_RULE_MISSING', 'useRules', `Missing applicable source rule ${rule}.`);
  draft.errors.forEach((error, index) => {
    if (!MEMBER_ID.test(error.errorId)) add('NS4_E7_ERROR_ID', `errors[${index}].errorId`, 'Error id must be lower-camel.');
    if (!error.description || !error.when) add('NS4_E7_ERROR', `errors[${index}]`, 'Business error needs description and condition.');
  });

  const grants = new Set(sources.access.grants.map(grant => `${grant.profileRef}|${grant.authorityRef}|${grant.dataScope.mode}`));
  for (const scope of draft.dataScopes) {
    if (!grants.has(`${scope.profileRef}|${scope.authorityRef}|${scope.mode}`)) add('NS4_E7_SCOPE', 'dataScopes', `Scope ${scope.profileRef}/${scope.authorityRef}/${scope.mode} is not an E3 grant.`);
    if (!expectedAuthorities.has(scope.authorityRef)) add('NS4_E7_SCOPE_EXTRA', 'dataScopes', `Scope authority ${scope.authorityRef} is outside this use case.`);
  }
  for (const authority of expectedAuthorities) {
    const expectedGrants = sources.access.grants.filter(grant => grant.authorityRef === authority);
    for (const grant of expectedGrants) if (!draft.dataScopes.some(scope => scope.profileRef === grant.profileRef && scope.authorityRef === authority && scope.mode === grant.dataScope.mode)) {
      add('NS4_E7_SCOPE_MISSING', 'dataScopes', `Missing E3 scope for ${grant.profileRef}/${authority}.`);
    }
  }

  for (const transition of draft.command?.transitions || []) {
    const entity = entities.get(transition.entityRef);
    if (!entity) add('NS4_E7_TRANSITION_ENTITY', 'command.transitions', `Unknown transition entity ${transition.entityRef}.`);
    else {
      for (const state of [...transition.fromStates, transition.toState]) if (!entity.lifecycleStates.includes(state)) add('NS4_E7_TRANSITION_STATE', 'command.transitions', `Unknown ${transition.entityRef} lifecycle state ${state}.`);
    }
    if (!MEMBER_ID.test(transition.transitionId)) add('NS4_E7_TRANSITION_ID', 'command.transitions', 'Transition id must be lower-camel.');
    if (!transition.fromStates.length || !transition.toState) add('NS4_E7_TRANSITION_BOUNDS', 'command.transitions', 'Transition needs at least one from state and one target state.');
  }
  const includedCapabilities = new Set(sources.composition.recommendations.filter(item => item.decision === 'include').map(item => item.id));
  for (const port of draft.ports) {
    if (!MEMBER_ID.test(port.portId) || !port.purpose) add('NS4_E7_PORT', 'ports', 'Port id and purpose are required.');
    if ((port.kind === 'plugin' || port.kind === 'horizontalModule') && (!port.capabilityRef || !includedCapabilities.has(port.capabilityRef))) {
      add('NS4_E7_CAPABILITY', 'ports', `Port ${port.portId} must reference an included E6 capability.`);
    }
    if (port.entityRef && !entities.has(port.entityRef)) add('NS4_E7_PORT_ENTITY', 'ports', `Unknown port entity ${port.entityRef}.`);
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
  actorRef: string;
  requiresContext: string[];
  providesContext: Array<{ contextId: string }>;
}
function collectSteps(journeys: Ns4E2Review): Map<string, SourceStep> {
  const result = new Map<string, SourceStep>();
  for (const journey of journeys.journeys) for (const step of journey.business.steps) result.set(`${journey.journeyId}.${step.stepId}`, {
    kind: step.kind, actorRef: journey.business.actorRef, requiresContext: step.requiresContext,
    providesContext: step.providesContext,
  });
  return result;
}
function validateFieldRef(ref: Ns4UseCaseFieldRef, sources: Ns4E7Sources, path: string, add: ReturnType<typeof issueAdder>): void {
  const entity = sources.ontology.entities.find(item => item.entityId === ref.entityId);
  if (!entity) add('NS4_E7_FIELD_ENTITY', path, `Unknown entity ${ref.entityId}.`);
  else if (!entity.fields.some(field => field.fieldId === ref.fieldId)) add('NS4_E7_FIELD', path, `Unknown field ${ref.entityId}.${ref.fieldId}.`);
}
function issueAdder(issues: Ns4E7GateIssue[]) {
  return (code: string, path: string, message: string) => issues.push({ code, path, message });
}
function sameSet(left: string[], right: string[]): boolean {
  return left.length === right.length && [...new Set(left)].sort().join('|') === [...new Set(right)].sort().join('|');
}
