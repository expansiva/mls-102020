/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e8/tiers.ts" enhancement="_blank"/>

/**
 * The deterministic half of E8: every workspace of the module, compiled from the approved E2-E7
 * contracts. No LLM takes part here — the only call E8 still makes composes the hub dashboard over
 * the closed catalogue this file derives (see hubComposition.ts).
 */

import { collectNs4DemotedJourneyIds } from '/_102020_/l2/agentNewSolution/steps/e2/contracts.js';
import type { Ns4JourneyProposal, Ns4JourneyStep } from '/_102020_/l2/agentNewSolution/steps/e2/contracts.js';
import type { Ns4OntologyEntity, Ns4OntologyRelationship } from '/_102020_/l2/agentNewSolution/steps/e4/contracts.js';
import type { Ns4UseCaseArtifactV3 } from '/_102020_/l2/agentNewSolution/steps/e7/contracts.js';
import { deriveNs4Contexts, isNs4CollectionInspect, isNs4PlatformOwnedEntity, ns4ContextIdOf } from '/_102020_/l2/agentNewSolution/helpers/ns4Context.js';
import { buildNs4ParentIndex, ns4FkParentOf } from '/_102020_/l2/agentNewSolution/helpers/ns4ForeignKeys.js';
import type { Ns4DerivedContextGraph } from '/_102020_/l2/agentNewSolution/helpers/ns4Context.js';
import type { Ns4SystemDecision } from '/_102020_/l2/agentNewSolution/helpers/ns4Resolve.js';
import { deriveE8HubScore, type Ns4E8Sources } from '/_102020_/l2/agentNewSolution/steps/e8/contracts.js';
import { applyNs4HubComposition, defaultNs4HubComposition } from '/_102020_/l2/agentNewSolution/steps/e8/hubComposition.js';
import {
  NS4_E8_MODEL_VERSION, isNs4OwnerHandleField,
  type Ns4E8BffCall, type Ns4E8ContentRole, type Ns4E8HubCatalogue, type Ns4E8HubCatalogueItem, type Ns4E8Input,
  type Ns4E8InputSource, type Ns4E8MenuEntry, type Ns4E8Model, type Ns4E8ModelWorkspace,
  type Ns4E8Operation, type Ns4E8Organism, type Ns4E8Section,
} from '/_102020_/l2/agentNewSolution/steps/e8/model.js';
import { ns4E8CompositionProfile } from '/_102020_/l2/agentNewSolution/steps/e8/compositionProfiles.js';

const CATEGORY_RECORD_CATALOGUE = 'entityRecordManagement';
const CATEGORY_APPROVAL = 'approvalWorkflow';
const CATEGORY_PROCESS = 'processWizard';
const CATEGORY_DASHBOARD = 'dashboardCommandCenter';
const CATEGORY_CONTENT = 'contentLanding';

const MEMBER_ID_HINT = /^[a-z][A-Za-z0-9]*$/;

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
  const contentPage = buildContentPage(context);
  if (contentPage) workspaces.push(contentPage);
  // Projections before journeys so a single-entity inspect can host on the view instead of a second page.
  for (const projection of context.standaloneProjections) {
    const built = buildProjectionWorkspace(projection, context);
    const tileOwner = contentPage && shouldTileProjectionOnContent(projection, contentPage, context)
      ? contentPage : null;
    if (tileOwner) {
      if (built) absorbProjectionIntoContent(tileOwner, built.workspace);
      else attachSynthesizedProjectionTile(tileOwner, projection, context, operations);
    } else if (built) {
      operations.push(...built.operations);
      workspaces.push(built.workspace);
    }
  }
  for (const journey of context.compiledJourneys) {
    const built = buildJourneyWorkspace(journey, context);
    operations.push(...built.operations);
    const owner = (contentPage && shouldHostJourneyOnContent(journey, contentPage, context) ? contentPage : null)
      || ownerPlaceForJourney(journey, workspaces);
    if (owner) absorbJourneyIntoOwner(owner, journey, built, context);
    else workspaces.push(built.workspace);
  }
  if (contentPage) linkLeftoverJourneysFromContent(contentPage, workspaces, context);
  // A record chosen on a screen needs a query on that same screen to choose it from.
  wireNs4ParentPickers(workspaces, operations, context, decisions);
  // The hub is built last: its catalogue points at calls of the workspaces that already exist.
  // A hub that only copies the anchor list (action/pending tiles) is not a place of its own.
  // A contentPage of the same entity already is that public place.
  if (context.hubEntity && !workspaces.some(workspace => workspace.tier === 'contentPage' && workspace.entity === context.hubEntity)) {
    const hub = buildHubWorkspace(context, workspaces);
    if (hubHasOwnSurface(hub)) workspaces.push(hub);
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
  if (entity.cardinality === 'singleton') return false;
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
  return buildNs4ParentIndex(relationships);
}

/**
 * Wire every required foreign key the user must CHOOSE to a query of its own workspace.
 *
 * A command input with source `selectedEntity` says "the user picks an existing record". The screen
 * can only render that as a picker over a call it owns (an organism never consumes another
 * workspace's call — bug_e8_5), so a workspace that asks for a parent id without reading the parent
 * leaves the frontend with a text field where someone would type a key: 48 inputs across 15
 * workspaces of buildFlowFsm47 were exactly that.
 *
 * The fix is derivation, not judgement: the module already compiles a list operation for the parent
 * (a catalogue always does), so the workspace gains a LOCAL call over that SHARED operation — the
 * same mechanism the hub tiles use — plus the picker organism and the input->call link the emitted
 * contract carries as `sourceRef`. When no read of the parent exists anywhere, nothing is invented:
 * the model gate registers it and the run continues.
 */
function wireNs4ParentPickers(
  workspaces: Ns4E8ModelWorkspace[], operations: Ns4E8Operation[], context: Ns4E8TierContext, decisions: Ns4SystemDecision[],
): void {
  const byOperationId = new Map(operations.map(operation => [operation.operationId, operation]));
  const readsOf = new Map<string, Ns4E8Operation[]>();
  for (const operation of operations) {
    if (operation.accessPattern.kind !== 'list') continue;
    readsOf.set(operation.entityRef, [...(readsOf.get(operation.entityRef) || []), operation]);
  }

  for (const workspace of workspaces) {
    const alreadyRead = new Set(workspace.bffCalls.filter(call => call.kind === 'query').map(call => call.entityRef));
    for (const call of [...workspace.bffCalls]) {
      if (call.kind !== 'command') continue;
      const operation = byOperationId.get(call.operationId);
      if (!operation) continue;
      for (const input of operation.inputs) {
        if (input.source !== 'selectedEntity' || !input.required) continue;
        // Two shapes of the same fact: a catalogue input names the OWNER of the key
        // (`ChangeOrder.project`) and the graph says where it points, while a use-case input compiled
        // from a journey already names the target (`Client.clientId`). Both must resolve.
        const target = ns4FkParentOf(context.parentsOf, input.fieldRef.entityId, input.fieldRef.fieldId)?.parent
          || input.fieldRef.entityId;
        // Not a key, the record the screen is already about, or an identity the session supplies.
        const targetEntity = context.entities.get(target);
        // An entity the module does not describe, the record the screen is already about, or an
        // identity the session supplies — none of them is picked by the user.
        if (!targetEntity || target === workspace.entity || isNs4PlatformOwnedEntity(targetEntity)) continue;
        const source = pickParentRead(readsOf.get(target) || []);
        if (!source) continue;   // nothing lists the parent: NS4_E8_PICKER_SOURCE registers it
        const bffId = `qry${upperCamel(target)}Picker`;
        if (!alreadyRead.has(target) && !workspace.bffCalls.some(item => item.bffId === bffId)) {
          workspace.bffCalls.push({
            bffId, kind: 'query', operationId: source.operationId,
            outputKind: outputKindOfRead(source), entityRef: target,
          });
          const formSection = workspace.sections.find(section => section.organisms.some(organism => organism.action === call.bffId))
            || workspace.sections[workspace.sections.length - 1];
          formSection?.organisms.push({ role: 'filterControl', dataSource: bffId, usage: 'picker' });
          alreadyRead.add(target);
        }
        const feeder = workspace.bffCalls.find(item => item.kind === 'query' && item.entityRef === target)!;
        call.inputSources = [...(call.inputSources || []).filter(entry => entry.inputId !== input.inputId),
          { inputId: input.inputId, bffId: feeder.bffId }];
      }
    }
    if (workspace.bffCalls.some(call => (call.inputSources || []).length)) {
      workspace.bffCalls.forEach(call => call.inputSources?.sort((left, right) => left.inputId.localeCompare(right.inputId)));
    }
  }
  void decisions;
}

/** The cheapest read of an entity: fewest required inputs, then the first id alphabetically. */
function pickParentRead(candidates: Ns4E8Operation[]): Ns4E8Operation | null {
  return [...candidates].sort((left, right) =>
    left.inputs.filter(input => input.required).length - right.inputs.filter(input => input.required).length
    || left.operationId.localeCompare(right.operationId))[0] || null;
}

/** The shape travels with the call: a list read as an object would offer a single record to pick. */
function outputKindOfRead(operation: Ns4E8Operation): Ns4E8BffCall['outputKind'] {
  return operation.accessPattern.pagination === 'optional' ? 'paginated' : 'list';
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
  const listInputs = catalogueListInputs(entity, context);
  const operations: Ns4E8Operation[] = [
    {
      operationId: `list${entity.entityId}`, title: label(context, `Listar ${entity.title}`, `List ${entity.title}`),
      kind: 'query', entityRef: entity.entityId, entityRefs: [entity.entityId],
      accessPattern: { kind: 'list', pagination: 'optional' }, inputs: listInputs,
      outputRefs: entity.fields.map(field => `${entity.entityId}.${field.fieldId}`),
      useRules: [], transitionRefs: [], story: [label(context, 'Encontrar o registro.', 'Find the record.')],
      // Master data lists hide deactivated records unless the caller asks for them,
      // which is what makes every foreign-key picker active-only for free.
      ...(isMdmEntity(entity)
        ? { mdm: { activeFilterInput: 'includeInactive' as const, situationOutput: 'active' as const } }
        : {}),
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
    ...removalOperations(entity, context),
    getByIdOperation(entity, context),
  ];
  const removalCalls: Ns4E8BffCall[] = removalOperations(entity, context).map(operation => ({
    bffId: `cmd${upperFirst(operation.operationId)}`, kind: 'command' as const,
    operationId: operation.operationId, outputKind: 'object' as const, entityRef: entity.entityId,
  }));
  const bffCalls: Ns4E8BffCall[] = [
    { bffId: `qryList${entity.entityId}`, kind: 'query', operationId: `list${entity.entityId}`, outputKind: 'paginated', entityRef: entity.entityId },
    { bffId: `cmdCreate${entity.entityId}`, kind: 'command', operationId: `create${entity.entityId}`, outputKind: 'object', entityRef: entity.entityId },
    { bffId: `cmdUpdate${entity.entityId}`, kind: 'command', operationId: `update${entity.entityId}`, outputKind: 'object', entityRef: entity.entityId },
    ...removalCalls,
    // Named get{Entity} (bff qryGet{Entity}): locate* is already a list, inspect* is a journey
    // screen. No organism consumes this call — it exists for a future id lookup, not the page.
    { bffId: `qryGet${entity.entityId}`, kind: 'query', operationId: `get${entity.entityId}`, outputKind: 'object', entityRef: entity.entityId },
  ];
  const removalActions = removalCalls.map(call => ({ role: 'contextualAction' as const, action: call.bffId }));
  const listFilters = listInputs.length
    ? [{ role: 'filterControl' as const, attachTo: bffCalls[0].bffId }]
    : [];
  const sections: Ns4E8Section[] = [
    { sectionId: 'recordList', intent: label(context, `Localizar ${entity.title}.`, `Find ${entity.title}.`),
      organisms: [{ role: 'primarySurface', dataSource: bffCalls[0].bffId }, ...listFilters, ...removalActions] },
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

function isMdmEntity(entity: Ns4OntologyEntity): boolean {
  return entity.storage.target === 'mdm';
}

function upperFirst(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

/**
 * How a catalogue retires a record. Master data is referenced by other records, so
 * removing the row would break those references: an mdm entity is deactivated and
 * can be reactivated, and never gains a delete. Every other storage target keeps
 * the delete it always had.
 */
function removalOperations(entity: Ns4OntologyEntity, context: Ns4E8TierContext): Ns4E8Operation[] {
  const idField = identityFieldOf(entity);
  const base = {
    kind: 'command' as const, entityRef: entity.entityId, entityRefs: [entity.entityId],
    inputs: catalogueInputs(entity, context, 'identityOnly'),
    outputRefs: [`${entity.entityId}.${idField}`], useRules: [], transitionRefs: [],
  };
  if (!isMdmEntity(entity)) {
    return [{
      ...base,
      operationId: `delete${entity.entityId}`, title: label(context, `Excluir ${entity.title}`, `Delete ${entity.title}`),
      accessPattern: { kind: 'delete' },
      story: [label(context, 'Remover o registro escolhido.', 'Remove the chosen record.')],
    }];
  }
  return [
    {
      ...base,
      operationId: `inactivate${entity.entityId}`, title: label(context, `Desativar ${entity.title}`, `Deactivate ${entity.title}`),
      // A closed accessPattern vocabulary on the consumer side: the pair keeps the
      // kind that already means "mutate one identified record" and the meaning
      // travels in the mdm block.
      accessPattern: { kind: 'update' }, mdm: { lifecycle: 'inactivate' },
      story: [label(context,
        'Desativar o registro (preserva o histórico e as referências).',
        'Deactivate the record (history and references are preserved).')],
    },
    {
      ...base,
      operationId: `reactivate${entity.entityId}`, title: label(context, `Reativar ${entity.title}`, `Reactivate ${entity.title}`),
      accessPattern: { kind: 'update' }, mdm: { lifecycle: 'reactivate' },
      story: [label(context, 'Reativar um registro desativado.', 'Reactivate a deactivated record.')],
    },
  ];
}

/**
 * Row lookup by identity. A catalogue always emits it, even when no page calls it — the
 * future LLM harness reads the table by id. A lookup still resolves an inactive mdm record.
 */
function getByIdOperation(entity: Ns4OntologyEntity, context: Ns4E8TierContext): Ns4E8Operation {
  return {
    operationId: `get${entity.entityId}`, title: label(context, `Obter ${entity.title}`, `Get ${entity.title}`),
    kind: 'query', entityRef: entity.entityId, entityRefs: [entity.entityId],
    accessPattern: { kind: 'getById' }, inputs: catalogueInputs(entity, context, 'identityOnly'),
    outputRefs: entity.fields.map(field => `${entity.entityId}.${field.fieldId}`),
    useRules: [], transitionRefs: [],
    story: [label(context, 'Ler o registro pelo identificador.', 'Read the record by id.')],
    ...(isMdmEntity(entity) ? { mdm: { situationOutput: 'active' as const } } : {}),
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
 * timestamp are set by the server, the record owner bound by an E3 `own` scope is the session, and
 * everything else is typed by the user. A state transition is never here — it belongs to the
 * journey that operates it.
 */
function catalogueInputs(
  entity: Ns4OntologyEntity, context: Ns4E8TierContext, mode: 'create' | 'update' | 'identityOnly',
): Ns4E8Input[] {
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
    // delete, inactivate and reactivate act on one identified record and nothing else.
    if (mode === 'identityOnly') continue;
    if (statusFields.has(field.fieldId) || TIMESTAMP_FIELD.test(field.fieldId)) {
      inputs.push({ ...base, source: 'systemDefault', required: field.required });
      continue;
    }
    // The owner of the record is the authenticated actor (E3 dataScope `own`), never a form field.
    // A person FK the user actually chooses (assign to someone else) is not an owner handle.
    if (isRecordOwnerSessionField(entity, field, context)) {
      inputs.push({ ...base, source: 'actorSession', required: field.required });
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

/** A catalogue list is searchable when the ontology has a display string (`title` or `name`). */
const SEARCHABLE_FIELD = /^(title|name)$/;

function searchableFieldOf(entity: Ns4OntologyEntity) {
  return entity.fields.find(field => SEARCHABLE_FIELD.test(field.fieldId) && (field.type === 'string' || field.type === 'text'));
}

/**
 * Dates, timestamps (`<verb>At`) and closed enums are the fields a listing can order by.
 * Identity is never a sort key — it is not a product ordering.
 */
function sortableFieldIds(entity: Ns4OntologyEntity): string[] {
  const idField = identityFieldOf(entity);
  return entity.fields
    .filter(field => field.fieldId !== idField && (
      field.type === 'date' || field.type === 'datetime' || TIMESTAMP_FIELD.test(field.fieldId) || (field.enum?.length ?? 0) > 0
    ))
    .map(field => field.fieldId);
}

/**
 * Optional list controls, synthesized like getById: they do not travel through E6 (additional
 * modules/plugins) and they are not journey steps. `search` fieldRef is the display field so the
 * existing field-ref gate and the frontend parser (which drop inputs with an empty fieldRef) both
 * keep it. `sortBy`/`sortOrder` borrow the first sortable field for the same reason — `Ns4E8Input.fieldRef`
 * is required, `l4OperationInputs` drops an empty fieldRef, and `NS4_E8_INPUT_FIELD` demands a resolvable
 * ontology field. The closed domain lives on `enumValues` (`sortBy` = field ids, `sortOrder` = asc|desc),
 * not on that borrowed field; CF must prefer the input's enumValues over the fieldRef enum.
 */
function catalogueListInputs(entity: Ns4OntologyEntity, context: Ns4E8TierContext): Ns4E8Input[] {
  const inputs: Ns4E8Input[] = [];
  const searchField = searchableFieldOf(entity);
  if (searchField) {
    inputs.push({
      inputId: 'search',
      fieldRef: { entityId: entity.entityId, fieldId: searchField.fieldId },
      source: 'userInput', required: false,
      description: label(context, `Buscar por ${searchField.title}.`, `Search by ${searchField.title}.`),
    });
  }
  const sortFields = sortableFieldIds(entity);
  const firstSort = sortFields[0] ? entity.fields.find(field => field.fieldId === sortFields[0]) : undefined;
  if (firstSort) {
    const fieldRef = { entityId: entity.entityId, fieldId: firstSort.fieldId };
    inputs.push({
      inputId: 'sortBy', fieldRef, source: 'userInput', required: false, enumValues: sortFields,
      description: label(context, 'Campo de ordenação da listagem.', 'Field to sort the listing by.'),
    });
    inputs.push({
      inputId: 'sortOrder', fieldRef, source: 'userInput', required: false, enumValues: ['asc', 'desc'],
      description: label(context, 'Direção da ordenação.', 'Sort direction.'),
    });
  }
  return inputs;
}

// ---------------------------------------------------------------------------------------------
// A workspace is a PLACE. Journeys that are not places host on the owner catalogue/view.
// ---------------------------------------------------------------------------------------------

/**
 * Own page only when at least one of: (a) actor is not already on the entity's catalogue/view,
 * (b) entry is eventDriven/contextRequired, (c) the journey spans more than one entity.
 * Same actor + same entity + coldStart/contextOrLookup is hosted on the owner.
 */
function ownerPlaceForJourney(
  journey: Ns4JourneyProposal, workspaces: Ns4E8ModelWorkspace[],
): Ns4E8ModelWorkspace | null {
  const mode = journey.business.entry.mode;
  if (mode === 'eventDriven' || mode === 'contextRequired') return null;
  const entityIds = unique(journey.business.steps.map(step => step.entity));
  if (entityIds.length !== 1) return null;
  const owner = workspaces.find(workspace =>
    (workspace.tier === 'recordCatalogue' || workspace.tier === 'projection' || workspace.tier === 'contentPage')
    && workspace.entity === entityIds[0]);
  if (!owner) return null;
  if (!owner.actors.includes(journey.business.actorRef)) return null;
  return owner;
}

function absorbJourneyIntoOwner(
  owner: Ns4E8ModelWorkspace, journey: Ns4JourneyProposal,
  built: { workspace: Ns4E8ModelWorkspace }, context: Ns4E8TierContext,
): void {
  owner.hostedStepRefs = uniqueAppend(owner.hostedStepRefs, built.workspace.hostedStepRefs);
  owner.featureRefs = uniqueAppend(owner.featureRefs, built.workspace.featureRefs);
  owner.profileRefs = unique([...owner.profileRefs, ...built.workspace.profileRefs]);
  const existingByOperation = new Map(owner.bffCalls.map(call => [call.operationId, call.bffId]));
  for (const call of built.workspace.bffCalls) {
    if (existingByOperation.has(call.operationId)) continue;
    owner.bffCalls.push(call);
    existingByOperation.set(call.operationId, call.bffId);
  }
  // Shared calls already live on the owner; exclusive E7 use cases of this journey must too.
  const prefix = `${journey.journeyId}.`;
  for (const useCase of context.sources.useCases) {
    if (!useCase.compiledFrom.some(ref => ref.startsWith(prefix))) continue;
    if (existingByOperation.has(useCase.useCaseId)) continue;
    const call = built.workspace.bffCalls.find(item => item.operationId === useCase.useCaseId);
    if (!call) continue;
    owner.bffCalls.push(call);
    existingByOperation.set(call.operationId, call.bffId);
  }
  const rewrite = (bffId: string | undefined): string | undefined => {
    if (!bffId) return bffId;
    const call = built.workspace.bffCalls.find(item => item.bffId === bffId);
    return (call && existingByOperation.get(call.operationId)) || bffId;
  };
  for (const section of built.workspace.sections) {
    const step = journey.business.steps.find(item => item.stepId === section.sectionId);
    // Locate of the owner's entity reuses the catalogue list — no second picker surface.
    if (step?.kind === 'locate' && step.entity === owner.entity) continue;
    if (owner.sections.some(item => item.sectionId === section.sectionId)) continue;
    owner.sections.push({
      ...section,
      organisms: section.organisms.map(organism => ({
        ...organism,
        ...(organism.dataSource ? { dataSource: rewrite(organism.dataSource) } : {}),
        ...(organism.action ? { action: rewrite(organism.action) } : {}),
      })),
    });
  }
}

function hubHasOwnSurface(hub: Ns4E8ModelWorkspace): boolean {
  return (hub.hubCatalogue?.items || []).some(item => item.kind === 'relatedList' || item.kind === 'projectionTile');
}

function uniqueAppend(existing: string[], extra: string[]): string[] {
  const seen = new Set(existing);
  const out = [...existing];
  for (const item of extra) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Content page — public unauthenticated read of a singleton, not a phrase the LLM happened to use.
// ---------------------------------------------------------------------------------------------

/**
 * A content page is a PLACE for published presentation. The door is structural (E3+E4+E2), not E1
 * prose: an external profile with a `public` grant (no login of their own to see the page) plus a
 * locate/inspect of a singleton (a read that is not a collection). Phrase matching may agree, but
 * never opens the door by itself — a management module that says "landing page" stays a catalogue.
 */
function contentPageRequested(sources: Ns4E8Sources): boolean {
  const singletons = new Set(
    sources.ontology.entities
      .filter(entity => entity.cardinality === 'singleton' && entity.kind !== 'projection' && entity.kind !== 'valueObject')
      .map(entity => entity.entityId),
  );
  if (!singletons.size) return false;
  const profileById = new Map(sources.access.profiles.map(profile => [profile.profileId, profile]));
  const publicExternalActors = new Set<string>();
  for (const grant of sources.access.grants) {
    if (grant.dataScope?.mode !== 'public') continue;
    const profile = profileById.get(grant.profileRef);
    if (profile?.kind !== 'external') continue;
    for (const actor of profile.actorRefs || []) publicExternalActors.add(actor);
  }
  if (!publicExternalActors.size) return false;
  return sources.journeys.journeys.some(journey =>
    publicExternalActors.has(journey.business.actorRef)
    && journey.business.steps.some(step =>
      (step.kind === 'inspect' || step.kind === 'locate') && singletons.has(step.entity)));
}

function contentSubjectEntity(context: Ns4E8TierContext): string {
  const singles = context.sources.ontology.entities
    .filter(entity => entity.cardinality === 'singleton' && entity.kind !== 'projection' && entity.kind !== 'valueObject')
    .sort(byEntityId);
  if (singles[0]) return singles[0].entityId;
  return context.hubEntity;
}

function buildContentPage(context: Ns4E8TierContext): Ns4E8ModelWorkspace | null {
  if (!contentPageRequested(context.sources)) return null;
  const entityId = contentSubjectEntity(context);
  if (!entityId) return null;
  const profile = ns4E8CompositionProfile(CATEGORY_CONTENT);
  const entity = context.entities.get(entityId);
  const hostable = context.compiledJourneys.filter(journey =>
    shouldHostJourneyOnContent(journey, { entity: entityId } as Ns4E8ModelWorkspace, context));
  const hostedProfiles = unique(hostable.flatMap(journey =>
    journey.business.steps.flatMap(step => context.profilesByStepRef.get(`${journey.journeyId}.${step.stepId}`) || [])));
  const fallbackProfiles = unique([
    ...hostedProfiles,
    ...context.sources.access.profiles.map(item => item.profileId),
  ]);
  const actors = unique(fallbackProfiles.flatMap(ref => context.actorsByProfile.get(ref) || []));
  return {
    workspaceId: `${lowerCamel(entityId)}Landing`,
    tier: 'contentPage',
    title: context.sources.module?.title || entity?.title || entityId,
    purpose: context.sources.module?.purpose || entity?.description || '',
    kind: 'landing',
    entity: entityId,
    actors,
    profileRefs: fallbackProfiles,
    featureRefs: unique(hostable.flatMap(journey => journey.business.steps.flatMap(step => step.featureRefs))),
    hostedStepRefs: [],
    categoryRef: CATEGORY_CONTENT,
    bffCalls: [],
    sections: profile.contentOrganisms ? contentSectionsFromModule(context) : [],
  };
}

function contentSectionsFromModule(context: Ns4E8TierContext): Ns4E8Section[] {
  const module = context.sources.module;
  if (!module) return [];
  const sections: Ns4E8Section[] = [];
  const push = (sectionId: string, intent: string, role: Ns4E8ContentRole) => {
    if (!intent || sections.some(item => item.intent === intent && item.organisms[0]?.role === role)) return;
    sections.push({
      sectionId,
      intent,
      organisms: [contentOrganism(role)],
    });
  };
  push('hero', module.title, 'hero');
  push('purpose', module.purpose || module.mainGoal || '', 'richText');
  (module.expectedOutcomes || []).forEach((outcome, index) => {
    const text = outcome.description || outcome.title;
    const id = outcome.outcomeId && MEMBER_ID_HINT.test(outcome.outcomeId)
      ? outcome.outcomeId : `outcome${index + 1}`;
    push(id, text, 'richText');
  });
  const imageSource = [
    module.purpose, module.mainGoal, module.boundaries,
    ...(module.inScope || []),
    ...(module.expectedOutcomes || []).map(outcome => outcome.description),
  ].find(text => text && /imagens?|images?/i.test(text));
  if (imageSource) push('images', imageSource, 'imageSet');
  return sections;
}

function contentOrganism(role: Ns4E8ContentRole): Ns4E8Organism {
  return { role, type: 'content' };
}

function shouldHostJourneyOnContent(
  journey: Ns4JourneyProposal, contentPage: Pick<Ns4E8ModelWorkspace, 'entity'>, context: Ns4E8TierContext,
): boolean {
  if (!ns4E8CompositionProfile(CATEGORY_CONTENT).hostedCommands) return false;
  const mode = journey.business.entry.mode;
  if (mode === 'eventDriven' || mode === 'contextRequired') return false;
  const steps = journey.business.steps;
  const decisive = [...steps].reverse().find(step => step.kind === 'act' || step.kind === 'decide');
  if (!decisive) return false;
  const entity = context.entities.get(decisive.entity);
  if (entity?.kind === 'projection') return false;
  if (steps.some(step => step.entity === contentPage.entity)) return true;
  return (context.parentsOf.get(decisive.entity) || []).some(parent => parent.parent === contentPage.entity);
}

function shouldTileProjectionOnContent(
  projection: Ns4OntologyEntity, contentPage: Ns4E8ModelWorkspace, context: Ns4E8TierContext,
): boolean {
  if (!ns4E8CompositionProfile(CATEGORY_CONTENT).tiles) return false;
  const hostableIds = new Set(context.compiledJourneys
    .filter(journey => shouldHostJourneyOnContent(journey, contentPage, context))
    .map(journey => journey.journeyId));
  if (!projection.sourceRefs.journeyIds.some(id => hostableIds.has(id))) return false;
  const leftover = context.compiledJourneys.some(journey => {
    if (shouldHostJourneyOnContent(journey, contentPage, context)) return false;
    const decisive = [...journey.business.steps].reverse().find(step => step.kind === 'act' || step.kind === 'decide');
    return decisive?.entity === projection.entityId;
  });
  return !leftover;
}

function absorbProjectionIntoContent(owner: Ns4E8ModelWorkspace, projection: Ns4E8ModelWorkspace): void {
  owner.hostedStepRefs = uniqueAppend(owner.hostedStepRefs, projection.hostedStepRefs);
  owner.featureRefs = uniqueAppend(owner.featureRefs, projection.featureRefs);
  owner.profileRefs = unique([...owner.profileRefs, ...projection.profileRefs]);
  owner.actors = unique([...owner.actors, ...projection.actors]);
  const existing = new Set(owner.bffCalls.map(call => call.operationId));
  for (const call of projection.bffCalls) {
    if (existing.has(call.operationId)) continue;
    owner.bffCalls.push(call);
    existing.add(call.operationId);
  }
  if (owner.sections.some(section => section.sectionId === 'counter')) return;
  const query = owner.bffCalls.find(call => call.kind === 'query' && call.entityRef === projection.entity)
    || projection.bffCalls.find(call => call.kind === 'query');
  if (!query) return;
  owner.sections.push({
    sectionId: 'counter',
    intent: projection.purpose || projection.title,
    organisms: [{ role: 'primarySurface', dataSource: query.bffId, usage: 'summary' }],
  });
}

function attachSynthesizedProjectionTile(
  owner: Ns4E8ModelWorkspace, projection: Ns4OntologyEntity, context: Ns4E8TierContext, operations: Ns4E8Operation[],
): void {
  if (owner.sections.some(section => section.sectionId === 'counter')) return;
  const operationId = `view${projection.entityId}`;
  if (!operations.some(operation => operation.operationId === operationId)) {
    const idField = identityFieldOf(projection);
    const parentId = (context.parentsOf.get(projection.entityId) || [])
      .find(parent => parent.parent === owner.entity)?.fieldId;
    const key = (idField && projection.fields.some(field => field.fieldId === idField) ? idField : '')
      || (parentId && projection.fields.some(field => field.fieldId === parentId) ? parentId : '')
      || projection.fields.find(field => /Id$/.test(field.fieldId))?.fieldId
      || '';
    operations.push({
      operationId,
      title: projection.title,
      kind: 'query',
      entityRef: projection.entityId,
      entityRefs: unique([projection.entityId, owner.entity]),
      accessPattern: { kind: 'list', pagination: 'optional' },
      inputs: key ? [{
        inputId: key,
        fieldRef: { entityId: projection.entityId, fieldId: key },
        source: 'selectedEntity',
        required: false,
        description: projection.description,
      }] : [],
      outputRefs: projection.fields.map(field => `${projection.entityId}.${field.fieldId}`),
      useRules: [],
      transitionRefs: [],
      story: [projection.description || projection.title],
    });
  }
  const bffId = `qry${projection.entityId}View`;
  if (!owner.bffCalls.some(call => call.bffId === bffId)) {
    owner.bffCalls.push({
      bffId, kind: 'query', operationId, outputKind: 'paginated', entityRef: projection.entityId,
    });
  }
  owner.sections.push({
    sectionId: 'counter',
    intent: projection.description || projection.title,
    organisms: [{ role: 'primarySurface', dataSource: bffId, usage: 'summary' }],
  });
}

function linkLeftoverJourneysFromContent(
  contentPage: Ns4E8ModelWorkspace, workspaces: Ns4E8ModelWorkspace[], context: Ns4E8TierContext,
): void {
  const leftovers = workspaces.filter(workspace =>
    workspace.tier === 'journey'
    && workspace.workspaceId !== contentPage.workspaceId
    && (workspace.entity === contentPage.entity
      || workspace.bffCalls.some(call => call.entityRef === contentPage.entity)
      || (context.compiledJourneys.find(journey => journey.journeyId === workspace.journeyRef)
        ?.business.steps.some(step => step.entity === contentPage.entity))));
  if (!leftovers.length) return;
  const navigation = contentPage.navigation ? [...contentPage.navigation] : [];
  leftovers.forEach((workspace, index) => {
    if (navigation.some(item => item.targetWorkspaceId === workspace.workspaceId)) return;
    navigation.push({
      targetWorkspaceId: workspace.workspaceId,
      label: workspace.title,
      prominence: 'contextual',
      order: navigation.length + index,
    });
  });
  contentPage.navigation = navigation;
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

  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    const stepRef = `${journey.journeyId}.${step.stepId}`;
    const useCase = context.useCaseByStepRef.get(stepRef);
    if (!useCase) continue;
    const collection = isNs4CollectionInspect(steps, index);
    const query = step.kind === 'locate' || step.kind === 'inspect';
    const bffId = `${query ? 'qry' : 'cmd'}${upperCamel(step.stepId)}`;
    bffCalls.push({
      bffId, kind: query ? 'query' : 'command', operationId: useCase.useCaseId,
      outputKind: step.kind === 'locate' || collection ? 'paginated' : 'object', entityRef: step.entity,
    });
    operations.push(buildJourneyOperation(journey, step, useCase, context, providedEarlier, index));
    sections.push({
      sectionId: step.stepId,
      intent: step.description || step.title,
      organisms: [journeyOrganism(step, bffId, collection)],
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

function journeyOrganism(step: Ns4JourneyStep, bffId: string, collection = false): Ns4E8Section['organisms'][number] {
  if (collection) return { role: 'primarySurface', dataSource: bffId, usage: 'summary' };
  if (step.kind === 'locate') return { role: 'primarySurface', dataSource: bffId, usage: 'picker' };
  if (step.kind === 'inspect') return { role: 'detailPanel', dataSource: bffId };
  if (step.kind === 'handoff') return { role: 'contextualAction', action: bffId };
  return { role: 'primarySurface', action: bffId };
}

function buildJourneyOperation(
  journey: Ns4JourneyProposal, step: Ns4JourneyStep, useCase: Ns4UseCaseArtifactV3,
  context: Ns4E8TierContext, providedEarlier: Set<string>, stepIndex = 0,
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
      inputId: fieldId,
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
    accessPattern: journeyAccessPattern(step, journey.business.steps, stepIndex),
    inputs: uniqueBy(assignInputIds(inputs), input => input.inputId),
    outputRefs: (entity?.fields || []).map(field => `${step.entity}.${field.fieldId}`),
    useRules: useCase.useRules, transitionRefs: useCase.transitionRefs,
    story: [step.title, step.description].filter(Boolean),
    useCaseId: useCase.useCaseId,
  };
}

function journeyAccessPattern(
  step: Ns4JourneyStep, steps: Ns4JourneyStep[], index: number,
): Ns4E8Operation['accessPattern'] {
  if (step.kind === 'locate' || isNs4CollectionInspect(steps, index)) return { kind: 'list', pagination: 'optional' };
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
      source: (isRecordOwnerSessionField(entity, field, context) ? 'actorSession' : 'userInput') as Ns4E8InputSource,
      required: field.required, description: field.description,
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
  const hub: Ns4E8ModelWorkspace = {
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
  // The derived hub is already a whole page: the score order is the composition until an LLM
  // proposes another one, so a module whose anchor makes no composition call still wires its tiles
  // and still reaches its journeys.
  return applyNs4HubComposition(hub, defaultNs4HubComposition(hub));
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
    const view = workspaces.find(workspace => workspace.tier === 'projection' && workspace.entity === projection.entityId);
    const call = view?.bffCalls.find(item => item.kind === 'query');
    if (!view || !call) continue;
    items.push({ itemId: `tile${projection.entityId}`, kind: 'projectionTile', label: projection.title,
      entityRef: projection.entityId, targetRef: view.workspaceId,
      sourceOperationId: call.operationId, sourceBffId: call.bffId, sourceOutputKind: call.outputKind, score: 3 });
  }
  for (const [entityId, parents] of context.parentsOf) {
    if (!parents.some(parent => parent.parent === context.hubEntity && parent.required)) continue;
    const satellite = workspaces.find(workspace => workspace.tier === 'recordCatalogue' && workspace.entity === entityId);
    if (!satellite) continue;
    const list = satellite.bffCalls.find(item => item.kind === 'query');
    items.push({ itemId: `related${entityId}`, kind: 'relatedList', label: context.entities.get(entityId)?.title || entityId,
      entityRef: entityId, targetRef: satellite.workspaceId,
      ...(list ? { sourceOperationId: list.operationId, sourceBffId: list.bffId, sourceOutputKind: list.outputKind } : {}), score: 2 });
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
  return tier === 'contentPage' ? 0 : tier === 'hub' ? 1 : tier === 'projection' ? 2 : tier === 'recordCatalogue' ? 3 : 4;
}
type Ns4WorkspaceTierValue = Ns4E8ModelWorkspace['tier'];

// ---------------------------------------------------------------------------------------------

function identityFieldOf(entity: Ns4OntologyEntity | undefined): string {
  return entity?.storage.idField || entity?.fields.find(field => /Id$/.test(field.fieldId))?.fieldId || '';
}

/**
 * The entity is owned by the authenticated actor when every grant whose authority operates it is
 * `dataScope.mode: 'own'`. Mixed own+organization keeps a person FK choosable (staff assigning).
 */
function entityOwnedByActorSession(entityId: string, context: Ns4E8TierContext): boolean {
  const modes = new Set<string>();
  for (const authority of context.sources.access.authorities) {
    const operates = authority.journeyStepRefs.some(ref => context.derived.byStepRef.get(ref)?.entity === entityId);
    if (!operates) continue;
    for (const grant of context.sources.access.grants) {
      if (grant.authorityRef === authority.authorityRef && grant.dataScope?.mode) modes.add(grant.dataScope.mode);
    }
  }
  return modes.size === 1 && modes.has('own');
}

function isRecordOwnerSessionField(
  entity: Ns4OntologyEntity, field: { fieldId: string }, context: Ns4E8TierContext,
): boolean {
  return entityOwnedByActorSession(entity.entityId, context) && isNs4OwnerHandleField(field.fieldId);
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
/**
 * Prefer the ontology fieldId as inputId so catalogue and journey name the same field the same way
 * (`taskId`, not `taskTaskId`). Qualify with the entity only when two entities in THIS operation
 * share a fieldId — otherwise uniqueBy would drop one.
 */
function assignInputIds(inputs: Ns4E8Input[]): Ns4E8Input[] {
  const countByFieldId = new Map<string, number>();
  for (const input of inputs) {
    const fieldId = input.fieldRef.fieldId;
    countByFieldId.set(fieldId, (countByFieldId.get(fieldId) || 0) + 1);
  }
  return inputs.map(input => {
    const fieldId = input.fieldRef.fieldId;
    const collide = (countByFieldId.get(fieldId) || 0) > 1;
    return {
      ...input,
      inputId: collide ? lowerCamel(`${input.fieldRef.entityId}${upperCamel(fieldId)}`) : fieldId,
    };
  });
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
