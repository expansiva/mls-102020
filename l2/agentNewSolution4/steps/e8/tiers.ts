/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e8/tiers.ts" enhancement="_blank"/>

/**
 * The deterministic half of E8: every workspace of the module, compiled from the approved E2-E7
 * contracts. No LLM takes part here — the only call E8 still makes composes the hub dashboard over
 * the closed catalogue this file derives (see hubComposition.ts).
 */

import { collectNs4DemotedJourneyIds } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type { Ns4JourneyProposal, Ns4JourneyStep } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type { Ns4OntologyEntity, Ns4OntologyRelationship } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import type { Ns4UseCaseArtifactV3 } from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';
import { deriveNs4Contexts, isNs4PlatformOwnedEntity, ns4ContextIdOf } from '/_102020_/l2/agentNewSolution4/helpers/ns4Context.js';
import type { Ns4DerivedContextGraph } from '/_102020_/l2/agentNewSolution4/helpers/ns4Context.js';
import type { Ns4SystemDecision } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';
import { deriveE8HubScore, type Ns4E8Sources } from '/_102020_/l2/agentNewSolution4/steps/e8/contracts.js';
import {
  NS4_E8_MODEL_VERSION,
  type Ns4E8BffCall, type Ns4E8HubCatalogue, type Ns4E8HubCatalogueItem, type Ns4E8Input,
  type Ns4E8InputSource, type Ns4E8MenuEntry, type Ns4E8Model, type Ns4E8ModelWorkspace,
  type Ns4E8Operation, type Ns4E8Section,
} from '/_102020_/l2/agentNewSolution4/steps/e8/model.js';

const CATEGORY_RECORD_CATALOGUE = 'entityRecordManagement';
const CATEGORY_APPROVAL = 'approvalWorkflow';
const CATEGORY_PROCESS = 'processWizard';
const CATEGORY_DASHBOARD = 'dashboardCommandCenter';

/** A timestamp is recognized by its shape, never by a domain word: a date/datetime field named `<verb>At`. */
const TIMESTAMP_FIELD = /At$/;

export function deriveNs4E8Model(sources: Ns4E8Sources, reviewRound = 1): Ns4E8Model {
  const derived = deriveNs4Contexts(sources);
  const decisions: Ns4SystemDecision[] = [];
  const context = buildContext(sources, derived);
  const operations: Ns4E8Operation[] = [];
  const workspaces: Ns4E8ModelWorkspace[] = [];

  for (const entity of context.catalogueEntities) {
    const built = buildRecordCatalogue(entity, context, decisions);
    operations.push(...built.operations);
    workspaces.push(built.workspace);
  }
  for (const journey of context.compiledJourneys) {
    const built = buildJourneyWorkspace(journey, context);
    operations.push(...built.operations);
    workspaces.push(built.workspace);
  }
  if (context.hubEntity) workspaces.push(buildHubWorkspace(context, workspaces));
  for (const projection of context.standaloneProjections) {
    const built = buildProjectionWorkspace(projection, context);
    if (built) { operations.push(...built.operations); workspaces.push(built.workspace); }
  }

  workspaces.sort((left, right) => left.workspaceId.localeCompare(right.workspaceId));
  return {
    planId: 'e8-workspace-model',
    schemaVersion: NS4_E8_MODEL_VERSION,
    moduleName: sources.journeys.moduleName,
    userLanguage: sources.journeys.userLanguage,
    title: 'Workspaces',
    reviewRound,
    hubEntity: context.hubEntity,
    workspaces,
    operations: uniqueBy(operations, operation => operation.operationId),
    menu: buildMenu(workspaces, sources),
    landings: buildLandings(workspaces, sources),
    systemDecisions: uniqueBy(decisions, decision => decision.decisionId),
  };
}

// ---------------------------------------------------------------------------------------------
// Shared derivation context
// ---------------------------------------------------------------------------------------------

interface Ns4E8TierContext {
  sources: Ns4E8Sources;
  derived: Ns4DerivedContextGraph;
  portuguese: boolean;
  entities: Map<string, Ns4OntologyEntity>;
  hubEntity: string;
  catalogueEntities: Ns4OntologyEntity[];
  standaloneProjections: Ns4OntologyEntity[];
  compiledJourneys: Ns4JourneyProposal[];
  useCaseByStepRef: Map<string, Ns4UseCaseArtifactV3>;
  profilesByStepRef: Map<string, string[]>;
  sessionScopedProfiles: Set<string>;
  actorsByProfile: Map<string, string[]>;
  parentsOf: Map<string, Array<{ parent: string; fieldId: string; required: boolean }>>;
  transitionStates: Map<string, string[]>;
}

function buildContext(sources: Ns4E8Sources, derived: Ns4DerivedContextGraph): Ns4E8TierContext {
  const entities = new Map(sources.ontology.entities.map(entity => [entity.entityId, entity]));
  const demoted = new Set(collectNs4DemotedJourneyIds(sources.journeys, sources.policyDecisionSelections || []));
  const useCaseByStepRef = new Map<string, Ns4UseCaseArtifactV3>();
  for (const useCase of sources.useCases) for (const ref of useCase.compiledFrom) useCaseByStepRef.set(ref, useCase);

  const profilesByAuthority = new Map<string, string[]>();
  for (const grant of sources.access.grants) {
    profilesByAuthority.set(grant.authorityRef, unique([...(profilesByAuthority.get(grant.authorityRef) || []), grant.profileRef]));
  }
  const profilesByStepRef = new Map<string, string[]>();
  for (const authority of sources.access.authorities) for (const ref of authority.journeyStepRefs) {
    profilesByStepRef.set(ref, unique([...(profilesByStepRef.get(ref) || []), ...(profilesByAuthority.get(authority.authorityRef) || [])]));
  }
  const sessionScopedProfiles = new Set(sources.access.grants
    .filter(grant => grant.dataScope?.mode === 'own' || grant.dataScope?.mode === 'assigned' || grant.dataScope?.mode === 'related')
    .map(grant => grant.profileRef));

  const transitionStates = new Map<string, string[]>();
  for (const workflow of sources.workflows) for (const transition of workflow.transitions) {
    if (!transition.useCaseId) continue;
    transitionStates.set(transition.useCaseId, unique([...(transitionStates.get(transition.useCaseId) || []), transition.toState]));
  }

  return {
    sources, derived,
    portuguese: sources.journeys.userLanguage.toLowerCase().startsWith('pt'),
    entities,
    hubEntity: selectHubEntity(sources, derived),
    catalogueEntities: sources.ontology.entities.filter(isCatalogueEntity).sort(byEntityId),
    standaloneProjections: sources.ontology.entities.filter(entity => entity.kind === 'projection').sort(byEntityId),
    compiledJourneys: sources.journeys.journeys.filter(journey => !demoted.has(journey.journeyId)),
    useCaseByStepRef,
    profilesByStepRef,
    sessionScopedProfiles,
    actorsByProfile: new Map(sources.access.profiles.map(profile => [profile.profileId, profile.actorRefs || []])),
    parentsOf: buildParents(sources.ontology.relationships),
    transitionStates,
  };
}

/** A record catalogue exists for a persisted business entity — the ontology markers decide, never a name. */
function isCatalogueEntity(entity: Ns4OntologyEntity): boolean {
  if (isNs4PlatformOwnedEntity(entity)) return false;
  if (entity.kind === 'projection' || entity.kind === 'valueObject') return false;
  return entity.storage.target === 'moduleDatabase' || entity.storage.target === 'mdm';
}

function selectHubEntity(sources: Ns4E8Sources, derived: Ns4DerivedContextGraph): string {
  const ranking = deriveE8HubScore(sources, derived);
  const first = ranking[0];
  if (!first || first.score <= 0) return '';
  const secondScore = ranking[1]?.score || 0;
  if (secondScore === 0 || first.score >= secondScore * 2) return first.entityRef;
  const byRelationship = [...ranking].sort((left, right) => right.requiredRelationshipCount - left.requiredRelationshipCount
    || right.score - left.score || left.entityRef.localeCompare(right.entityRef));
  const [best, runnerUp] = byRelationship;
  return best.requiredRelationshipCount > 0 && best.requiredRelationshipCount > (runnerUp?.requiredRelationshipCount || 0)
    ? best.entityRef : '';
}

function buildParents(relationships: Ns4OntologyRelationship[]): Ns4E8TierContext['parentsOf'] {
  const result = new Map<string, Array<{ parent: string; fieldId: string; required: boolean }>>();
  for (const relationship of relationships) {
    if (relationship.type !== 'manyToOne' && relationship.type !== 'oneToOne') continue;
    const owner = relationship.realization?.ownerEntity || relationship.fromEntity;
    if (owner !== relationship.fromEntity) continue;
    const fieldId = relationship.realization?.from.fieldIds[0] || '';
    if (!fieldId) continue;
    const current = result.get(relationship.fromEntity) || [];
    current.push({ parent: relationship.toEntity, fieldId, required: relationship.required });
    result.set(relationship.fromEntity, current);
  }
  return result;
}

// ---------------------------------------------------------------------------------------------
// Tier 1 — record catalogue
// ---------------------------------------------------------------------------------------------

function buildRecordCatalogue(
  entity: Ns4OntologyEntity, context: Ns4E8TierContext, decisions: Ns4SystemDecision[],
): { workspace: Ns4E8ModelWorkspace; operations: Ns4E8Operation[] } {
  const workspaceId = `${lowerCamel(entity.entityId)}Catalogue`;
  const profileRefs = catalogueProfiles(entity, context, workspaceId, decisions);
  // `actors` are E1/E2 actor ids and `profileRefs` are E3 profiles: the backend derives its route
  // scopes from actors, so a profile id there would fabricate a scope collab-auth never issued.
  const actors = unique(profileRefs.flatMap(profileRef => context.actorsByProfile.get(profileRef) || []));
  const idField = identityFieldOf(entity);
  const operations: Ns4E8Operation[] = [
    {
      operationId: `list${entity.entityId}`, title: label(context, `Listar ${entity.title}`, `List ${entity.title}`),
      kind: 'query', entityRef: entity.entityId, entityRefs: [entity.entityId],
      accessPattern: { kind: 'list', pagination: 'optional' }, inputs: [],
      outputRefs: entity.fields.map(field => `${entity.entityId}.${field.fieldId}`),
      useRules: [], transitionRefs: [], story: [label(context, 'Encontrar o registro.', 'Find the record.')],
    },
    {
      operationId: `create${entity.entityId}`, title: label(context, `Criar ${entity.title}`, `Create ${entity.title}`),
      kind: 'command', entityRef: entity.entityId, entityRefs: catalogueEntityRefs(entity, context),
      accessPattern: { kind: 'create' }, inputs: catalogueInputs(entity, context, 'create'),
      outputRefs: [`${entity.entityId}.${idField}`], useRules: entity.useRules, transitionRefs: [],
      story: [label(context, 'Informar os dados do novo registro.', 'Fill in the new record.')],
    },
    {
      operationId: `update${entity.entityId}`, title: label(context, `Atualizar ${entity.title}`, `Update ${entity.title}`),
      kind: 'command', entityRef: entity.entityId, entityRefs: catalogueEntityRefs(entity, context),
      accessPattern: { kind: 'update' }, inputs: catalogueInputs(entity, context, 'update'),
      outputRefs: [`${entity.entityId}.${idField}`], useRules: entity.useRules, transitionRefs: [],
      story: [label(context, 'Corrigir os dados do registro escolhido.', 'Correct the chosen record.')],
    },
    {
      operationId: `delete${entity.entityId}`, title: label(context, `Excluir ${entity.title}`, `Delete ${entity.title}`),
      kind: 'command', entityRef: entity.entityId, entityRefs: [entity.entityId],
      accessPattern: { kind: 'delete' }, inputs: catalogueInputs(entity, context, 'delete'),
      outputRefs: [`${entity.entityId}.${idField}`], useRules: [], transitionRefs: [],
      story: [label(context, 'Remover o registro escolhido.', 'Remove the chosen record.')],
    },
  ];
  const bffCalls: Ns4E8BffCall[] = [
    { bffId: `qryList${entity.entityId}`, kind: 'query', operationId: `list${entity.entityId}`, outputKind: 'paginated', entityRef: entity.entityId },
    { bffId: `cmdCreate${entity.entityId}`, kind: 'command', operationId: `create${entity.entityId}`, outputKind: 'object', entityRef: entity.entityId },
    { bffId: `cmdUpdate${entity.entityId}`, kind: 'command', operationId: `update${entity.entityId}`, outputKind: 'object', entityRef: entity.entityId },
    { bffId: `cmdDelete${entity.entityId}`, kind: 'command', operationId: `delete${entity.entityId}`, outputKind: 'object', entityRef: entity.entityId },
  ];
  const sections: Ns4E8Section[] = [
    { sectionId: 'recordList', intent: label(context, `Localizar ${entity.title}.`, `Find ${entity.title}.`),
      organisms: [{ role: 'primarySurface', dataSource: bffCalls[0].bffId }, { role: 'contextualAction', action: bffCalls[3].bffId }] },
    { sectionId: 'recordForm', intent: label(context, `Criar ou corrigir ${entity.title}.`, `Create or correct ${entity.title}.`),
      organisms: [{ role: 'primarySurface', action: bffCalls[1].bffId }, { role: 'contextualAction', action: bffCalls[2].bffId }] },
  ];
  return {
    operations,
    workspace: {
      workspaceId, tier: 'recordCatalogue', title: entity.title,
      purpose: label(context, `Cadastro de ${entity.title}.`, `${entity.title} record catalogue.`),
      kind: 'operation', entity: entity.entityId, actors, profileRefs, featureRefs: [],
      hostedStepRefs: [], categoryRef: CATEGORY_RECORD_CATALOGUE, bffCalls, sections,
    },
  };
}

/**
 * A catalogue is visible to the profiles that already operate the entity somewhere. An entity no
 * journey touches still needs a maintenance screen, so it falls back to the internal profiles and
 * the module records the choice instead of leaving the data unreachable.
 */
function catalogueProfiles(
  entity: Ns4OntologyEntity, context: Ns4E8TierContext, workspaceId: string, decisions: Ns4SystemDecision[],
): string[] {
  const touching = context.derived.steps.filter(step => step.entity === entity.entityId);
  const profiles = unique(touching.flatMap(step => context.profilesByStepRef.get(step.stepRef) || []));
  if (profiles.length) return profiles;
  const internal = context.sources.access.profiles.filter(profile => profile.kind === 'internal').map(profile => profile.profileId).sort();
  decisions.push({
    decisionId: `catalogueAudience${entity.entityId}`,
    stage: 'e8-workspaces',
    question: context.portuguese
      ? `Nenhuma jornada opera ${entity.title}: quem mantém esse cadastro?`
      : `No journey operates ${entity.title}: who maintains this catalogue?`,
    chosen: 'internalProfiles',
    alternatives: ['internalProfiles', 'restrictToNamedProfile'],
    decidedBy: 'system',
    findingRef: `NS4_E8_CATALOGUE_AUDIENCE:${workspaceId}`,
    changeHint: context.portuguese
      ? `Adicione no E3 uma autoridade sobre ${entity.title} para restringir esse cadastro a um perfil específico.`
      : `Add an E3 authority over ${entity.title} to restrict this catalogue to a named profile.`,
  });
  return internal;
}

function catalogueEntityRefs(entity: Ns4OntologyEntity, context: Ns4E8TierContext): string[] {
  return unique([entity.entityId, ...(context.parentsOf.get(entity.entityId) || []).map(parent => parent.parent)]);
}

/**
 * The inputs of a catalogue command, classified structurally: the identity is chosen in the grid,
 * a foreign key is chosen through a picker over its own catalogue, a lifecycle status and a
 * timestamp are set by the server, and everything else is typed by the user. A state transition is
 * never here — it belongs to the journey that operates it.
 */
function catalogueInputs(entity: Ns4OntologyEntity, context: Ns4E8TierContext, mode: 'create' | 'update' | 'delete'): Ns4E8Input[] {
  const idField = identityFieldOf(entity);
  const parents = new Map((context.parentsOf.get(entity.entityId) || []).map(parent => [parent.fieldId, parent]));
  const statusFields = new Set(entity.lifecycleStates.length
    ? entity.fields.filter(field => sameValues(field.enum || [], entity.statusEnum || [])).map(field => field.fieldId) : []);
  const inputs: Ns4E8Input[] = [];
  for (const field of entity.fields) {
    const fieldRef = { entityId: entity.entityId, fieldId: field.fieldId };
    const base = { inputId: field.fieldId, fieldRef, description: field.description, ...(field.enum?.length ? { enumValues: field.enum } : {}) };
    if (field.fieldId === idField) {
      if (mode !== 'create') inputs.push({ ...base, source: 'selectedEntity', required: true });
      continue;
    }
    if (mode === 'delete') continue;
    if (statusFields.has(field.fieldId) || TIMESTAMP_FIELD.test(field.fieldId)) {
      inputs.push({ ...base, source: 'systemDefault', required: field.required });
      continue;
    }
    const parent = parents.get(field.fieldId);
    if (parent) {
      // A platform-owned parent is the acting identity: it comes from the session, never from a picker.
      const platform = isNs4PlatformOwnedEntity(context.entities.get(parent.parent) || entity);
      inputs.push({ ...base, source: platform ? 'actorSession' : 'selectedEntity', required: parent.required && field.required });
      continue;
    }
    // A required field is required whenever it is written: the catalogue edits a whole record, and
    // partial-patch semantics would let an update violate the contract the ontology declares.
    inputs.push({ ...base, source: 'userInput', required: field.required });
  }
  return inputs;
}

// ---------------------------------------------------------------------------------------------
// Tier 2 — journey workspace
// ---------------------------------------------------------------------------------------------

function buildJourneyWorkspace(
  journey: Ns4JourneyProposal, context: Ns4E8TierContext,
): { workspace: Ns4E8ModelWorkspace; operations: Ns4E8Operation[] } {
  const steps = journey.business.steps;
  const bffCalls: Ns4E8BffCall[] = [];
  const sections: Ns4E8Section[] = [];
  const operations: Ns4E8Operation[] = [];
  const providedEarlier = new Set<string>();

  for (const step of steps) {
    const stepRef = `${journey.journeyId}.${step.stepId}`;
    const useCase = context.useCaseByStepRef.get(stepRef);
    if (!useCase) continue;
    const query = step.kind === 'locate' || step.kind === 'inspect';
    const bffId = `${query ? 'qry' : 'cmd'}${upperCamel(step.stepId)}`;
    bffCalls.push({
      bffId, kind: query ? 'query' : 'command', operationId: useCase.useCaseId,
      outputKind: step.kind === 'locate' ? 'paginated' : 'object', entityRef: step.entity,
    });
    operations.push(buildJourneyOperation(journey, step, useCase, context, providedEarlier));
    sections.push({
      sectionId: step.stepId,
      intent: step.description || step.title,
      organisms: [journeyOrganism(step, bffId)],
    });
    providedEarlier.add(step.entity);
  }

  const decisive = [...steps].reverse().find(step => step.kind === 'decide' || step.kind === 'act');
  const entity = decisive?.entity || steps[0]?.entity || '';
  const workflow = context.sources.workflows.find(item => item.entityRef === entity);
  return {
    operations,
    workspace: {
      workspaceId: journey.journeyId, tier: 'journey', title: journey.business.title, purpose: journey.business.goal,
      kind: workflow ? 'workflow' : 'operation', entity,
      ...(workflow ? { workflowId: workflow.workflowId } : {}),
      actors: [journey.business.actorRef],
      profileRefs: unique(steps.flatMap(step => context.profilesByStepRef.get(`${journey.journeyId}.${step.stepId}`) || [])),
      featureRefs: unique(steps.flatMap(step => step.featureRefs)),
      hostedStepRefs: steps.map(step => `${journey.journeyId}.${step.stepId}`),
      journeyRef: journey.journeyId,
      categoryRef: steps.some(step => step.kind === 'decide') ? CATEGORY_APPROVAL : CATEGORY_PROCESS,
      bffCalls, sections,
    },
  };
}

function journeyOrganism(step: Ns4JourneyStep, bffId: string): Ns4E8Section['organisms'][number] {
  if (step.kind === 'locate') return { role: 'primarySurface', dataSource: bffId, usage: 'picker' };
  if (step.kind === 'inspect') return { role: 'detailPanel', dataSource: bffId };
  if (step.kind === 'handoff') return { role: 'contextualAction', action: bffId };
  return { role: 'primarySurface', action: bffId };
}

function buildJourneyOperation(
  journey: Ns4JourneyProposal, step: Ns4JourneyStep, useCase: Ns4UseCaseArtifactV3,
  context: Ns4E8TierContext, providedEarlier: Set<string>,
): Ns4E8Operation {
  const stepRef = `${journey.journeyId}.${step.stepId}`;
  const entity = context.entities.get(step.entity);
  const query = step.kind === 'locate' || step.kind === 'inspect';
  const inputs: Ns4E8Input[] = [];
  for (const required of context.derived.byStepRef.get(stepRef)?.requires || []) {
    const parent = context.entities.get(required.businessObject);
    const fieldId = required.idFieldRef || identityFieldOf(parent);
    if (!fieldId) continue;
    inputs.push({
      inputId: lowerCamel(`${required.businessObject}${upperCamel(fieldId)}`),
      fieldRef: { entityId: required.businessObject, fieldId },
      source: journeyInputSource(required.businessObject, journey, context, providedEarlier),
      required: true,
      description: parent?.title || required.businessObject,
    });
  }
  if (!query && entity) inputs.push(...journeyFormInputs(entity, step, useCase, context));
  return {
    operationId: useCase.useCaseId, title: useCase.title || step.title, kind: query ? 'query' : 'command',
    entityRef: step.entity, entityRefs: useCase.entityRefs,
    accessPattern: journeyAccessPattern(step),
    inputs: uniqueBy(inputs, input => input.inputId),
    outputRefs: (entity?.fields || []).map(field => `${step.entity}.${field.fieldId}`),
    useRules: useCase.useRules, transitionRefs: useCase.transitionRefs,
    story: [step.title, step.description].filter(Boolean),
    useCaseId: useCase.useCaseId,
  };
}

function journeyAccessPattern(step: Ns4JourneyStep): Ns4E8Operation['accessPattern'] {
  if (step.kind === 'locate') return { kind: 'list', pagination: 'optional' };
  if (step.kind === 'inspect') return { kind: 'getById' };
  if (step.kind === 'decide') return { kind: 'transition' };
  return { kind: 'commandInput' };
}

/**
 * Where the record of a required context comes from, in the order the derivation already fixed:
 * the hub anchor arrives through the URL, a record located earlier in the journey is picked on the
 * page, and a session-scoped profile carries its own record.
 */
function journeyInputSource(
  entityId: string, journey: Ns4JourneyProposal, context: Ns4E8TierContext, providedEarlier: Set<string>,
): Ns4E8InputSource {
  if (entityId === context.hubEntity) return 'routeParam';
  if (providedEarlier.has(entityId)) return 'selectedEntity';
  const profiles = unique(journey.business.steps.flatMap(step => context.profilesByStepRef.get(`${journey.journeyId}.${step.stepId}`) || []));
  const entryContexts = context.derived.entryByJourneyId.get(journey.journeyId) || [];
  const carried = entryContexts.some(item => item.contextId === ns4ContextIdOf(entityId));
  if (carried && profiles.some(profile => context.sessionScopedProfiles.has(profile))) return 'actorSession';
  if (carried) return 'routeParam';
  return 'selectedEntity';
}

/**
 * The editable half of a command step: the fields the actor fills, plus the decision itself when the
 * step decides. The decision carries the reachable target states as its literal union, so the page
 * renders a closed verb selector instead of a free text box.
 */
function journeyFormInputs(
  entity: Ns4OntologyEntity, step: Ns4JourneyStep, useCase: Ns4UseCaseArtifactV3, context: Ns4E8TierContext,
): Ns4E8Input[] {
  const idField = identityFieldOf(entity);
  const parents = new Set((context.parentsOf.get(entity.entityId) || []).map(parent => parent.fieldId));
  const statusFields = entity.fields.filter(field => entity.statusEnum?.length && sameValues(field.enum || [], entity.statusEnum));
  if (step.kind === 'decide') {
    const reachable = context.transitionStates.get(useCase.useCaseId) || [];
    const field = statusFields[0];
    if (!field) return [];
    return [{
      inputId: field.fieldId, fieldRef: { entityId: entity.entityId, fieldId: field.fieldId },
      source: 'userInput', required: true,
      description: label(context, 'Decisão tomada.', 'The decision taken.'),
      enumValues: reachable.length ? reachable : (field.enum || []),
    }];
  }
  const statusFieldIds = new Set(statusFields.map(field => field.fieldId));
  return entity.fields
    .filter(field => field.fieldId !== idField && !parents.has(field.fieldId)
      && !statusFieldIds.has(field.fieldId) && !TIMESTAMP_FIELD.test(field.fieldId))
    .map(field => ({
      inputId: field.fieldId, fieldRef: { entityId: entity.entityId, fieldId: field.fieldId },
      source: 'userInput' as const, required: field.required, description: field.description,
      ...(field.enum?.length ? { enumValues: field.enum } : {}),
    }));
}

// ---------------------------------------------------------------------------------------------
// Tier 3 — hub and standalone projections
// ---------------------------------------------------------------------------------------------

function buildHubWorkspace(context: Ns4E8TierContext, workspaces: Ns4E8ModelWorkspace[]): Ns4E8ModelWorkspace {
  const anchor = context.entities.get(context.hubEntity);
  const catalogue = deriveNs4E8HubCatalogue(context, workspaces);
  const listCall = workspaces.find(workspace => workspace.tier === 'recordCatalogue' && workspace.entity === context.hubEntity)
    ?.bffCalls.find(call => call.kind === 'query');
  const bffCalls: Ns4E8BffCall[] = listCall ? [{ ...listCall }] : [];
  return {
    workspaceId: `${lowerCamel(context.hubEntity)}Hub`, tier: 'hub',
    title: anchor?.title || context.hubEntity,
    purpose: label(context, `Painel de ${anchor?.title || context.hubEntity}.`, `${anchor?.title || context.hubEntity} command centre.`),
    kind: 'landing', entity: context.hubEntity,
    actors: unique(workspaces.flatMap(workspace => workspace.actors)),
    profileRefs: unique(workspaces.flatMap(workspace => workspace.profileRefs)),
    featureRefs: [], hostedStepRefs: [], categoryRef: CATEGORY_DASHBOARD,
    bffCalls,
    sections: [
      { sectionId: 'collection', intent: label(context, 'Carteira e busca.', 'Portfolio and search.'),
        organisms: bffCalls.length ? [{ role: 'primarySurface', dataSource: bffCalls[0].bffId }] : [] },
      { sectionId: 'record', intent: label(context, 'Registro selecionado e o que gira em volta dele.', 'The selected record and what revolves around it.'),
        organisms: [] },
    ],
    hubCatalogue: catalogue,
  };
}

/**
 * The closed catalogue of the hub record page. Code decides WHAT may appear — projections anchored
 * on the hub, the satellites that point at it through a required relationship, the journeys anchored
 * on it and its pending decisions. The composition call may only order, promote and name these.
 */
export function deriveNs4E8HubCatalogue(context: Ns4E8TierContext, workspaces: Ns4E8ModelWorkspace[]): Ns4E8HubCatalogue {
  const items: Ns4E8HubCatalogueItem[] = [];
  const anchoredJourneys = new Set(context.derived.steps.filter(step => step.entity === context.hubEntity).map(step => step.journeyId));

  for (const projection of context.standaloneProjections) {
    if (!projection.sourceRefs.journeyIds.some(id => anchoredJourneys.has(id))) continue;
    items.push({ itemId: `tile${projection.entityId}`, kind: 'projectionTile', label: projection.title,
      entityRef: projection.entityId, targetRef: `${lowerCamel(projection.entityId)}View`, score: 3 });
  }
  for (const [entityId, parents] of context.parentsOf) {
    if (!parents.some(parent => parent.parent === context.hubEntity && parent.required)) continue;
    const satellite = workspaces.find(workspace => workspace.tier === 'recordCatalogue' && workspace.entity === entityId);
    if (!satellite) continue;
    items.push({ itemId: `related${entityId}`, kind: 'relatedList', label: context.entities.get(entityId)?.title || entityId,
      entityRef: entityId, targetRef: satellite.workspaceId, score: 2 });
  }
  for (const workspace of workspaces) {
    if (workspace.tier !== 'journey' || !anchoredJourneys.has(workspace.journeyRef || '')) continue;
    items.push({ itemId: `action${upperCamel(workspace.workspaceId)}`, kind: 'action', label: workspace.title,
      entityRef: workspace.entity, targetRef: workspace.workspaceId, score: 2 });
  }
  for (const workflow of context.sources.workflows) {
    const pending = workflow.states.filter(state => workflow.transitions.some(transition => transition.fromStates.includes(state)));
    if (!pending.length) continue;
    const owner = workspaces.find(workspace => workspace.tier === 'journey' && workspace.entity === workflow.entityRef);
    if (!owner) continue;
    items.push({ itemId: `pending${workflow.entityRef}`, kind: 'pending', label: context.entities.get(workflow.entityRef)?.title || workflow.entityRef,
      entityRef: workflow.entityRef, targetRef: owner.workspaceId, score: 1 });
  }
  return {
    anchorEntity: context.hubEntity,
    items: items.sort((left, right) => right.score - left.score || left.itemId.localeCompare(right.itemId)),
  };
}

function buildProjectionWorkspace(
  projection: Ns4OntologyEntity, context: Ns4E8TierContext,
): { workspace: Ns4E8ModelWorkspace; operations: Ns4E8Operation[] } | null {
  const compiled = new Set(context.compiledJourneys.map(journey => journey.journeyId));
  const step = context.derived.steps.find(item => item.entity === projection.entityId && compiled.has(item.journeyId));
  const useCase = step ? context.useCaseByStepRef.get(step.stepRef) : undefined;
  if (!step || !useCase || useCase.kind !== 'query') return null;
  const bffId = `qry${projection.entityId}View`;
  return {
    operations: [],
    workspace: {
      workspaceId: `${lowerCamel(projection.entityId)}View`, tier: 'projection', title: projection.title,
      purpose: projection.description, kind: 'landing', entity: projection.entityId,
      actors: unique((context.profilesByStepRef.get(step.stepRef) || []).flatMap(profileRef => context.actorsByProfile.get(profileRef) || [])),
      profileRefs: context.profilesByStepRef.get(step.stepRef) || [], featureRefs: [],
      hostedStepRefs: [step.stepRef], categoryRef: CATEGORY_DASHBOARD,
      bffCalls: [{ bffId, kind: 'query', operationId: useCase.useCaseId, outputKind: 'object', entityRef: projection.entityId }],
      sections: [{ sectionId: 'overview', intent: projection.description, organisms: [{ role: 'primarySurface', dataSource: bffId }] }],
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Menu and landings
// ---------------------------------------------------------------------------------------------

/** The menu lists PLACES. A journey is reached from a hub action, a related list or a notification. */
function buildMenu(workspaces: Ns4E8ModelWorkspace[], sources: Ns4E8Sources): Ns4E8MenuEntry[] {
  const featureOf = new Map(sources.journeys.features.map(feature => [feature.featureId, feature]));
  return workspaces
    .filter(workspace => workspace.tier !== 'journey')
    .map(workspace => ({
      workspaceId: workspace.workspaceId, label: workspace.title,
      featureRef: workspace.featureRefs.find(ref => featureOf.has(ref)) || '',
      tier: workspace.tier, profileRefs: workspace.profileRefs,
    }));
}

function buildLandings(workspaces: Ns4E8ModelWorkspace[], sources: Ns4E8Sources): Array<{ profileRef: string; workspaceId: string }> {
  const ordered = [...workspaces].sort((left, right) => tierRank(left.tier) - tierRank(right.tier)
    || left.workspaceId.localeCompare(right.workspaceId));
  return sources.access.profiles.flatMap(profile => {
    const target = ordered.find(workspace => workspace.tier !== 'journey' && workspace.profileRefs.includes(profile.profileId));
    return target ? [{ profileRef: profile.profileId, workspaceId: target.workspaceId }] : [];
  });
}

function tierRank(tier: Ns4WorkspaceTierValue): number {
  return tier === 'hub' ? 0 : tier === 'projection' ? 1 : tier === 'recordCatalogue' ? 2 : 3;
}
type Ns4WorkspaceTierValue = Ns4E8ModelWorkspace['tier'];

// ---------------------------------------------------------------------------------------------

function identityFieldOf(entity: Ns4OntologyEntity | undefined): string {
  return entity?.storage.idField || entity?.fields.find(field => /Id$/.test(field.fieldId))?.fieldId || '';
}
function sameValues(left: string[], right: string[]): boolean {
  return left.length > 0 && left.length === right.length && left.every((value, index) => value === right[index]);
}
function label(context: Ns4E8TierContext, portuguese: string, english: string): string {
  return context.portuguese ? portuguese : english;
}
function byEntityId(left: Ns4OntologyEntity, right: Ns4OntologyEntity): number {
  return left.entityId.localeCompare(right.entityId);
}
function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}
function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
  return [...new Map(values.map(value => [key(value), value])).values()];
}
function lowerCamel(value: string): string {
  return value ? value.slice(0, 1).toLowerCase() + value.slice(1) : '';
}
function upperCamel(value: string): string {
  return value ? value.slice(0, 1).toUpperCase() + value.slice(1) : '';
}
