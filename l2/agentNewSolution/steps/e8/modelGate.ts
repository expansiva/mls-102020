/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e8/modelGate.ts" enhancement="_blank"/>

/**
 * The E8 model gate is structural: broken references fail (they would compile a broken module),
 * and everything that is evidence about the product is a registrar resolved through ns4Resolve.
 */

import { isNs4CollectionInspect } from '/_102020_/l2/agentNewSolution/helpers/ns4Context.js';
import { buildNs4ParentIndex, ns4FkParentOf } from '/_102020_/l2/agentNewSolution/helpers/ns4ForeignKeys.js';
import { resolveNs4Findings } from '/_102020_/l2/agentNewSolution/helpers/ns4Resolve.js';
import type { Ns4ResolutionFinding, Ns4ResolutionResult } from '/_102020_/l2/agentNewSolution/helpers/ns4Resolve.js';
import { collectNs4DemotedJourneyIds } from '/_102020_/l2/agentNewSolution/steps/e2/contracts.js';
import type { Ns4E8Sources } from '/_102020_/l2/agentNewSolution/steps/e8/contracts.js';
import { isNs4OwnerHandleField, type Ns4E8BffCall, type Ns4E8Model, type Ns4E8ModelWorkspace, type Ns4E8Operation } from '/_102020_/l2/agentNewSolution/steps/e8/model.js';

/**
 * How a broken organism reference can be repaired without an LLM. The gate DETECTS as strictly as
 * before; only the outcome changed — a screen missing one panel is a product, a dead run is not.
 */
export type Ns4E8ModelResolution =
  | { kind: 'wireLocalQuery'; workspaceId: string; sectionId: string; organismIndex: number; reference: string; bffId: string; operationId: string; entityRef: string; outputKind: 'object' | 'list' | 'paginated' }
  | { kind: 'moveActionToNavigation'; workspaceId: string; sectionId: string; organismIndex: number; reference: string; targetWorkspaceId: string; label: string }
  | { kind: 'dropOrganism'; workspaceId: string; sectionId: string; organismIndex: number; reference: string };

export interface Ns4E8ModelIssue { code: string; path: string; message: string; severity?: 'warning'; resolution?: Ns4E8ModelResolution; }
export interface Ns4E8ModelResult { ok: boolean; issues: Ns4E8ModelIssue[]; }

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;

/** Owner handle (`ownerId` / `ownerUserId`) or prose that names the authenticated actor. */
function userInputLooksLikeSession(input: Ns4E8Model['operations'][number]['inputs'][number]): boolean {
  if (input.source !== 'userInput') return false;
  if (isNs4OwnerHandleField(input.fieldRef.fieldId)) return true;
  return /autenticad|authenticated|logged[- ]in|pessoa autenticada|actor session|usu[aá]rio autenticado/i.test(input.description);
}

function isLandingWithoutPriorSelection(
  workspace: Ns4E8ModelWorkspace, _model: Ns4E8Model, sources: Ns4E8Sources,
): boolean {
  // E8 `kind: 'landing'` is also used for hub projections that open WITH a selected
  // record (route/hub context). The empty-home defect is a coldStart journey: no
  // entity is selected before the primary read runs.
  if (!workspace.journeyRef) return false;
  const journey = sources.journeys.journeys.find(item => item.journeyId === workspace.journeyRef);
  return journey?.business.entry.mode === 'coldStart';
}

function identityEntityOfInput(
  input: Ns4E8Model['operations'][number]['inputs'][number], sources: Ns4E8Sources,
): { entityId: string; fieldId: string } | null {
  const entity = sources.ontology.entities.find(item => item.entityId === input.fieldRef.entityId);
  const idField = entity?.storage.idField
    || entity?.fields.find(field => /Id$/.test(field.fieldId))?.fieldId
    || '';
  if (!idField || input.fieldRef.fieldId !== idField) return null;
  return { entityId: input.fieldRef.entityId, fieldId: idField };
}

function primaryReadBffIds(workspace: Ns4E8ModelWorkspace): string[] {
  const fromOrganisms = workspace.sections.flatMap(section => section.organisms)
    .filter(organism => organism.dataSource && (organism.role === 'primarySurface' || organism.role === 'detailPanel'))
    .map(organism => organism.dataSource as string);
  if (fromOrganisms.length) return [...new Set(fromOrganisms)];
  return workspace.bffCalls.filter(call => call.kind === 'query').map(call => call.bffId);
}

export function validateNs4E8Model(model: Ns4E8Model, sources: Ns4E8Sources): Ns4E8ModelResult {
  const issues: Ns4E8ModelIssue[] = [];
  const add = (code: string, path: string, message: string, severity?: 'warning') =>
    issues.push({ code, path, message, ...(severity ? { severity } : {}) });

  if (model.moduleName !== sources.journeys.moduleName || model.moduleName !== sources.ontology.moduleName) {
    add('NS4_E8_MODULE', 'moduleName', 'The model and every approved source must belong to the same module.');
  }
  const operations = new Map(model.operations.map(operation => [operation.operationId, operation]));
  const parentIndex = buildNs4ParentIndex(sources.ontology.relationships);
  const fields = new Set(sources.ontology.entities.flatMap(entity => entity.fields.map(field => `${entity.entityId}.${field.fieldId}`)));
  const entities = new Set(sources.ontology.entities.map(entity => entity.entityId));
  // Master data is referenced by other records: removing the row breaks those
  // references, so the catalogue deactivates instead of deleting.
  const masterDataEntities = new Set(sources.ontology.entities
    .filter(entity => entity.storage.target === 'mdm').map(entity => entity.entityId));
  const profiles = new Set(sources.access.profiles.map(profile => profile.profileId));
  const useCases = new Set(sources.useCases.map(useCase => useCase.useCaseId));
  const workspaceIds = new Set<string>();

  model.operations.forEach((operation, index) => {
    const path = `operations[${index}]`;
    if (!MEMBER_ID.test(operation.operationId)) add('NS4_E8_OPERATION_ID', `${path}.operationId`, 'Operation id must be lower-camel.');
    if (!entities.has(operation.entityRef)) add('NS4_E8_OPERATION_ENTITY', `${path}.entityRef`, `Unknown ontology entity ${operation.entityRef}.`);
    if (operation.useCaseId && !useCases.has(operation.useCaseId)) {
      add('NS4_E8_OPERATION_USECASE', `${path}.useCaseId`, `Unknown compiled use case ${operation.useCaseId}.`);
    }
    operation.inputs.forEach(input => {
      if (!fields.has(`${input.fieldRef.entityId}.${input.fieldRef.fieldId}`)) {
        add('NS4_E8_INPUT_FIELD', `${path}.inputs.${input.inputId}`, `Input ${input.inputId} has no resolvable ontology field (${input.fieldRef.entityId}.${input.fieldRef.fieldId}).`);
      }
      // Registrar, never A: synthesis should have set actorSession. A leftover userInput whose
      // fieldRef/description still says "authenticated actor" is evidence, not a broken compile.
      if (userInputLooksLikeSession(input)) {
        add('NS4_E8_USERINPUT_FROM_SESSION', `${path}.inputs.${input.inputId}`,
          `Input ${input.inputId} is userInput but fieldRef/description say it comes from the authenticated actor; it should be actorSession.`,
          'warning');
      }
    });
    // Backstop, not the rule: the catalogue compiler already emits inactivate and
    // reactivate for master data, so this never fires from that path. It guards
    // against a regression there and against a future path that skips it.
    if (operation.accessPattern.kind === 'delete' && masterDataEntities.has(operation.entityRef)) {
      add('NS4_E8_MDM_DELETE', `${path}.accessPattern.kind`,
        `Operation ${operation.operationId} deletes master data entity ${operation.entityRef}: master data is referenced by other records and must be deactivated instead.`);
    }
    // Catalogue list only (no useCaseId): search/sort are synthesized there, not on journey locate.
    // Registrar, never A — a list without them still compiles; the page just cannot honour the prompt.
    if (operation.accessPattern.kind === 'list' && !operation.useCaseId) {
      const entity = sources.ontology.entities.find(item => item.entityId === operation.entityRef);
      const ids = new Set(operation.inputs.map(input => input.inputId));
      if (entity?.fields.some(field => /^(title|name)$/.test(field.fieldId) && (field.type === 'string' || field.type === 'text'))
        && !ids.has('search')) {
        add('NS4_E8_LIST_WITHOUT_SEARCH', `${path}.inputs`,
          `List ${operation.operationId} has a title/name field but no optional search input.`,
          'warning');
      }
      const idField = entity?.storage.idField || entity?.fields.find(field => /Id$/.test(field.fieldId))?.fieldId || '';
      if (entity?.fields.some(field => field.fieldId !== idField && (
        field.type === 'date' || field.type === 'datetime' || /At$/.test(field.fieldId) || (field.enum?.length ?? 0) > 0
      )) && !ids.has('sortBy')) {
        add('NS4_E8_LIST_WITHOUT_SORT', `${path}.inputs`,
          `List ${operation.operationId} has sortable fields but no optional sortBy input.`,
          'warning');
      }
    }
  });

  for (const journey of sources.journeys.journeys) {
    const steps = journey.business.steps;
    steps.forEach((step, stepIndex) => {
      if (!isNs4CollectionInspect(steps, stepIndex)) return;
      const stepRef = `${journey.journeyId}.${step.stepId}`;
      const useCase = sources.useCases.find(item => item.compiledFrom.includes(stepRef));
      const operation = useCase ? operations.get(useCase.useCaseId) : undefined;
      if (operation && operation.accessPattern.kind === 'getById') {
        add('NS4_E8_COLLECTION_INSPECT_GETBYID', `operations.${operation.operationId}.accessPattern.kind`,
          `Inspect ${stepRef} is a collection summary (a locate of ${step.entity} follows) but compiled as getById; it must be a list with no identity input.`,
          'warning');
      }
    });
  }

  model.workspaces.forEach((workspace, index) => {
    const path = `workspaces[${index}]`;
    if (!MEMBER_ID.test(workspace.workspaceId)) add('NS4_E8_WORKSPACE_ID', `${path}.workspaceId`, 'Workspace id must be lower-camel.');
    if (workspaceIds.has(workspace.workspaceId)) add('NS4_E8_WORKSPACE_DUPLICATE', `${path}.workspaceId`, `Duplicate workspace ${workspace.workspaceId}.`);
    workspaceIds.add(workspace.workspaceId);
    if (!workspace.title || !workspace.purpose) add('NS4_E8_LABEL', path, 'Workspace title and purpose are required in the user language.');
    if (!workspace.categoryRef) add('NS4_E8_CATEGORY', `${path}.categoryRef`, 'Every workspace chooses a page category.');
    workspace.sections.forEach((section, sectionIndex) => {
      section.organisms.forEach((organism, organismIndex) => {
        if (organism.type === 'content' || isContentOrganismRole(organism.role)) {
          if (workspace.tier !== 'contentPage') {
            add('NS4_E8_CONTENT_ORGANISM', `${path}.sections[${sectionIndex}].organisms[${organismIndex}]`,
              `Organism of type content is only allowed on a contentPage workspace.`);
          }
        }
      });
    });
    if (workspace.entity && !entities.has(workspace.entity)) add('NS4_E8_WORKSPACE_ENTITY', `${path}.entity`, `Unknown ontology entity ${workspace.entity}.`);
    workspace.profileRefs.forEach(profile => {
      if (!profiles.has(profile)) add('NS4_E8_PROFILE', `${path}.profileRefs`, `Unknown E3 profile ${profile}.`);
    });

    const bffIds = new Set<string>();
    workspace.bffCalls.forEach(call => {
      if (bffIds.has(call.bffId)) add('NS4_E8_BFF_DUPLICATE', `${path}.bffCalls`, `Duplicate bffCall ${call.bffId}.`);
      bffIds.add(call.bffId);
      const operation = operations.get(call.operationId);
      if (!operation) add('NS4_E8_BFF_OPERATION', `${path}.bffCalls.${call.bffId}`, `bffCall ${call.bffId} references unknown operation ${call.operationId}.`);
      else if (operation.kind !== call.kind) add('NS4_E8_BFF_KIND', `${path}.bffCalls.${call.bffId}`, `bffCall ${call.bffId} is a ${call.kind} over a ${operation.kind} operation.`);
    });
    const queries = new Set(workspace.bffCalls.filter(call => call.kind === 'query').map(call => call.bffId));
    const commands = new Set(workspace.bffCalls.filter(call => call.kind === 'command').map(call => call.bffId));
    workspace.sections.forEach((section, sectionIndex) => {
      const sectionPath = `${path}.sections[${sectionIndex}]`;
      if (!MEMBER_ID.test(section.sectionId)) add('NS4_E8_SECTION_ID', `${sectionPath}.sectionId`, 'Section id must be lower-camel.');
      section.organisms.forEach((organism, organismIndex) => {
        const anchor = { workspaceId: workspace.workspaceId, sectionId: section.sectionId, organismIndex };
        if (organism.dataSource && !queries.has(organism.dataSource)) {
          // The reference may name another workspace's query: operations are shared, so the same
          // operation becomes a local call here instead of a cross-workspace read that cannot exist.
          const foreign = model.workspaces.find(item => item.workspaceId === organism.dataSource
            || item.bffCalls.some(call => call.bffId === organism.dataSource && call.kind === 'query'));
          const call = foreign?.bffCalls.find(item => item.kind === 'query'
            && (item.bffId === organism.dataSource || foreign.workspaceId === organism.dataSource));
          issues.push({
            code: 'NS4_E8_ORGANISM_SOURCE', path: `${sectionPath}.organisms[${organismIndex}]`,
            message: `Organism reads ${organism.dataSource}, which is not a query of this workspace.`,
            resolution: call
              ? { kind: 'wireLocalQuery', ...anchor, reference: organism.dataSource, bffId: call.bffId,
                  operationId: call.operationId, entityRef: call.entityRef, outputKind: call.outputKind }
              : { kind: 'dropOrganism', ...anchor, reference: organism.dataSource },
          });
        }
        if (organism.action && !commands.has(organism.action)) {
          // A journey is a screen, and a button that opens a screen is navigation, never a command.
          const journey = model.workspaces.find(item => item.workspaceId === organism.action && item.tier === 'journey');
          issues.push({
            code: 'NS4_E8_ORGANISM_ACTION', path: `${sectionPath}.organisms[${organismIndex}]`,
            message: `Organism runs ${organism.action}, which is not a command of this workspace.`,
            resolution: journey
              ? { kind: 'moveActionToNavigation', ...anchor, reference: organism.action, targetWorkspaceId: journey.workspaceId, label: journey.title }
              : { kind: 'dropOrganism', ...anchor, reference: organism.action },
          });
        }
      });
    });

    // A record chosen on the page needs a query to choose it from. This is evidence about the
    // journeys, not a broken contract, so it is recorded and the run continues.
    //
    // The entity to look for is the one the key POINTS AT, which only the relationship graph knows:
    // `fieldRef` names the entity that OWNS the field, so reading the target off it compared the
    // catalogue's own entity with itself and the check passed in silence while 48 inputs asked for a
    // record no screen could show.
    const pickerEntities = new Set(workspace.bffCalls.filter(call => call.kind === 'query').map(call => call.entityRef));
    workspace.bffCalls.filter(call => call.kind === 'command').forEach(call => {
      (operations.get(call.operationId)?.inputs || []).forEach(input => {
        if (input.source !== 'selectedEntity' || !input.required) return;
        const parent = ns4FkParentOf(parentIndex, input.fieldRef.entityId, input.fieldRef.fieldId)?.parent
          || input.fieldRef.entityId;
        if (pickerEntities.has(parent) || parent === workspace.entity) return;
        add('NS4_E8_PICKER_SOURCE', `${path}.bffCalls.${call.bffId}.${input.inputId}`,
          `A tela ${workspace.title} escolhe ${parent} sem uma consulta que o liste; nesta versão o registro vem de fora da tela. Revisar?`, 'warning');
      });
    });

    // A command that requires the KEY of entity X needs a way for THIS page to obtain X.
    // PICKER_SOURCE is silent when workspace.entity === X (it assumes the page already holds
    // that record). recordInStoreServiceAttendance is of ServiceExecution and still has no
    // read that returns serviceExecutionId — five commands demand it, the only query is of
    // ServiceAppointment. The CF then invents the field on the appointment row.
    //
    // Warning/registrar, same as LANDING_REQUIRED_INPUT: a blocking A would fail E10 on any
    // module that compiled this shape (sequential create-then-act without a declared feeder).
    // Legitimate paths: a query whose output carries the key, a query of X, or inputSources
    // pointing at a command that produces it (then the screen only operates after that command).
    workspace.bffCalls.filter(call => call.kind === 'command').forEach(call => {
      const operation = operations.get(call.operationId);
      if (!operation) return;
      (operation.inputs || []).forEach(input => {
        if (!input.required) return;
        if (input.source !== 'selectedEntity') return;
        const keyEntity = identityEntityOfInput(input, sources);
        if (!keyEntity) return;
        const keyRef = `${keyEntity.entityId}.${keyEntity.fieldId}`;
        const queryHasKey = workspace.bffCalls.some(item => {
          if (item.kind !== 'query') return false;
          if (item.entityRef === keyEntity.entityId) return true;
          const queryOp = operations.get(item.operationId);
          return Boolean(queryOp && (queryOp.entityRef === keyEntity.entityId || queryOp.outputRefs.includes(keyRef)));
        });
        if (queryHasKey) return;
        const feeder = (call.inputSources || []).find(link => {
          if (link.inputId !== input.inputId) return false;
          const sourceCall = workspace.bffCalls.find(item => item.bffId === link.bffId);
          if (!sourceCall || sourceCall.kind !== 'command') return false;
          const sourceOp = operations.get(sourceCall.operationId);
          return Boolean(sourceOp && (sourceOp.entityRef === keyEntity.entityId || sourceOp.outputRefs.includes(keyRef)));
        });
        if (feeder) {
          add('NS4_E8_COMMAND_KEY_AFTER_COMMAND', `${path}.bffCalls.${call.bffId}.${input.inputId}`,
            `A tela ${workspace.workspaceId} só opera ${call.bffId} depois de ${feeder.bffId}, que produz ${keyRef}.`,
            'warning');
          return;
        }
        add('NS4_E8_COMMAND_KEY_WITHOUT_SOURCE', `${path}.bffCalls.${call.bffId}.${input.inputId}`,
          `Command ${call.bffId} requires ${keyRef} and no read on ${workspace.workspaceId} provides that key (output of a page query, a query of ${keyEntity.entityId}, or inputSources from a command that produces it).`,
          'warning');
      });
    });

    // A landing (site landing, kind=landing, or a coldStart journey) has no selected entity yet.
    // Its primary read cannot be getById/inspect with a required input — that is how
    // consultInstitutionalHome opened empty (VALIDATION_ERROR: id is required).
    if (isLandingWithoutPriorSelection(workspace, model, sources)) {
      const hasListQuery = workspace.bffCalls.some(call =>
        call.kind === 'query' && operations.get(call.operationId)?.accessPattern.kind === 'list');
      if (!hasListQuery) {
        for (const bffId of primaryReadBffIds(workspace)) {
          const call = workspace.bffCalls.find(item => item.bffId === bffId);
          const operation = call ? operations.get(call.operationId) : undefined;
          const required = (operation?.inputs || []).filter(input => input.required);
          if (!operation || !required.length) continue;
          add('NS4_E8_LANDING_REQUIRED_INPUT', `${path}.bffCalls.${bffId}`,
            `Landing ${workspace.workspaceId} primary read ${bffId} (${operation.operationId}) requires ${required.map(input => input.inputId).join(', ')}; a page with no selected entity must read without a required input (list or first record).`,
            'warning');
        }
      }
    }
  });

  const hostedSteps = new Set(model.workspaces.flatMap(workspace => workspace.hostedStepRefs));
  const demotedJourneys = new Set(collectNs4DemotedJourneyIds(sources.journeys, sources.policyDecisionSelections || []));
  model.workspaces.filter(workspace => workspace.tier === 'journey').forEach(workspace => {
    if (!workspace.bffCalls.length) add('NS4_E8_EMPTY_JOURNEY', workspace.workspaceId, `Journey workspace ${workspace.workspaceId} compiles no call.`);
  });
  if (model.workspaces.length) {
    sources.journeys.journeys.forEach(journey => {
      if (demotedJourneys.has(journey.journeyId)) return;
      (journey.business?.steps || []).forEach(step => {
        const ref = `${journey.journeyId}.${step.stepId}`;
        if (!hostedSteps.has(ref)) {
          add('NS4_E8_STEP_UNHOSTED', 'workspaces', `Journey step ${ref} is not hosted by any workspace.`);
        }
      });
    });
    const hostedUseCases = new Set(model.workspaces.flatMap(workspace => workspace.bffCalls.map(call => call.operationId)));
    sources.useCases.forEach(useCase => {
      if (hostedUseCases.has(useCase.useCaseId)) return;
      const originJourneys = uniqueStrings(useCase.compiledFrom.map(ref => ref.split('.')[0]).filter(Boolean));
      if (!originJourneys.length) return;
      if (originJourneys.every(journeyId => demotedJourneys.has(journeyId))) return;
      add('NS4_E8_USECASE_UNHOSTED', 'workspaces',
        `Use case ${useCase.useCaseId} from ${originJourneys.join(', ')} is not hosted by any workspace.`);
    });
    model.workspaces.forEach((workspace, index) => {
      const redundant = redundantWorkspaceReason(workspace, model, operations, sources);
      if (redundant) add('NS4_E8_REDUNDANT_WORKSPACE', `workspaces[${index}]`, redundant);
    });
  }
  model.menu.forEach((entry, index) => {
    if (!workspaceIds.has(entry.workspaceId)) add('NS4_E8_MENU_WORKSPACE', `menu[${index}]`, `Unknown workspace ${entry.workspaceId}.`);
    if (entry.tier === 'journey') add('NS4_E8_MENU_JOURNEY', `menu[${index}]`, 'A journey is never a menu item; it is reached from a hub action, a related list or a notification.');
  });
  const contentPlaces = model.workspaces.filter(workspace => workspace.tier === 'contentPage');
  contentPlaces.forEach(workspace => {
    if (!model.menu.some(entry => entry.workspaceId === workspace.workspaceId)) {
      add('NS4_E8_MENU_WORKSPACE', 'menu', `Content page ${workspace.workspaceId} is a place and must appear in the menu.`);
    }
  });
  model.landings.forEach((landing, index) => {
    if (!profiles.has(landing.profileRef)) add('NS4_E8_LANDING_PROFILE', `landings[${index}]`, `Unknown E3 profile ${landing.profileRef}.`);
    if (!workspaceIds.has(landing.workspaceId)) add('NS4_E8_LANDING_WORKSPACE', `landings[${index}]`, `Unknown workspace ${landing.workspaceId}.`);
  });

  return { ok: issues.every(issue => issue.severity === 'warning'), issues };
}

function redundantWorkspaceReason(
  workspace: Ns4E8ModelWorkspace, model: Ns4E8Model, operations: Map<string, Ns4E8Operation>,
  sources: Ns4E8Sources,
): string | null {
  if (workspace.tier === 'hub') {
    const items = workspace.hubCatalogue?.items || [];
    if (!items.some(item => item.kind === 'relatedList' || item.kind === 'projectionTile')) {
      return `Hub ${workspace.workspaceId} has no relatedList or projectionTile; it duplicates the anchor catalogue.`;
    }
    return null;
  }
  if (workspace.tier !== 'journey') return null;
  const journey = sources.journeys.journeys.find(item => item.journeyId === workspace.journeyRef);
  if (!journey) return null;
  const mode = journey.business.entry.mode;
  if (mode === 'eventDriven' || mode === 'contextRequired') return null;
  const entityIds = [...new Set(journey.business.steps.map(step => step.entity).filter(Boolean))];
  if (entityIds.length !== 1) return null;
  if (!isCommandInspectLocateSummarySurface(workspace, operations)) return null;
  const container = model.workspaces.find(other => other.workspaceId !== workspace.workspaceId
    && (other.tier === 'recordCatalogue' || other.tier === 'projection' || other.tier === 'contentPage')
    && other.entity === entityIds[0]
    && workspace.actors.length > 0
    && workspace.actors.every(actor => other.actors.includes(actor)));
  if (!container) return null;
  return `Workspace ${workspace.workspaceId} is redundant with ${container.workspaceId}; host its steps on the owner place.`;
}

function isCommandInspectLocateSummarySurface(
  workspace: Ns4E8ModelWorkspace, operations: Map<string, Ns4E8Operation>,
): boolean {
  if (!workspace.bffCalls.length) return false;
  return workspace.bffCalls.every(call => isHostableCall(call, operations));
}

function isHostableCall(call: Ns4E8BffCall, operations: Map<string, Ns4E8Operation>): boolean {
  const kind = operations.get(call.operationId)?.accessPattern.kind;
  return kind === 'list' || kind === 'getById' || kind === 'transition' || kind === 'commandInput';
}

/**
 * Decide, record, continue. A reference the code can repair is repaired; a reference that points at
 * nothing loses its panel and says so; only a model that cannot render at all stays terminal.
 */
export function resolveNs4E8ModelFindings(model: Ns4E8Model, issues: Ns4E8ModelIssue[]): Ns4ResolutionResult<Ns4E8Model> {
  return resolveNs4Findings(model, issues.map(issue => issue.resolution ? resolutionFinding(issue, issue.resolution) : issue.severity === 'warning' ? {
    classification: 'B' as const,
    decisionId: decisionId('e8Model', issue.code, issue.path),
    findingRef: `${issue.code}:${issue.path}`,
    stage: 'e8-workspaces',
    question: issue.message,
    defaultChoice: 'keepDerivedModel',
    alternatives: ['reviewWorkspaceModel'],
    changeHint: `Revisar ${issue.path} no modelo de workspaces do E8.`,
  } : {
    classification: 'A' as const,
    findingRef: `${issue.code}:${issue.path}`,
    stage: 'e8-workspaces',
    question: issue.message,
    alternatives: [],
    changeHint: `Corrigir ${issue.path} no modelo de workspaces do E8.`,
  }));
}

function resolutionFinding(issue: Ns4E8ModelIssue, resolution: Ns4E8ModelResolution): Ns4ResolutionFinding<Ns4E8Model> {
  const anchor = `${resolution.workspaceId}:${resolution.sectionId}:${resolution.organismIndex}`;
  if (resolution.kind === 'wireLocalQuery') return {
    classification: 'C', decisionId: decisionId('e8WireLocalQuery', anchor),
    findingRef: `${issue.code}:${anchor}`, stage: 'e8-workspaces',
    question: `O painel de ${resolution.entityRef} passa a ler a consulta na própria tela, em vez de outra tela.`,
    deterministicChoice: 'wireLocalQuery', alternatives: ['reviewDashboardComposition'],
    changeHint: `Revisar o painel de ${resolution.entityRef} em ${resolution.workspaceId}.`,
    apply: artifact => wireLocalQuery(artifact, resolution),
  };
  if (resolution.kind === 'moveActionToNavigation') return {
    classification: 'C', decisionId: decisionId('e8ActionToNavigation', anchor),
    findingRef: `${issue.code}:${anchor}`, stage: 'e8-workspaces',
    question: `A ação ${resolution.label} abre a tela do fluxo, não um comando embutido.`,
    deterministicChoice: 'openJourneyScreen', alternatives: ['embedCommandInPage'],
    changeHint: `A tela ${resolution.label} é alcançada a partir de ${resolution.workspaceId}.`,
    apply: artifact => moveActionToNavigation(artifact, resolution),
  };
  return {
    classification: 'C', decisionId: decisionId('e8DropOrganism', anchor),
    findingRef: `${issue.code}:${anchor}`, stage: 'e8-workspaces',
    question: `O painel ${resolution.reference} não pôde ser montado nesta versão e sai da tela ${resolution.workspaceId}.`,
    deterministicChoice: 'dropUnbuildablePanel', alternatives: ['reviewDashboardComposition'],
    changeHint: `Revisar o que ${resolution.reference} deveria mostrar em ${resolution.workspaceId}.`,
    apply: artifact => dropOrganism(artifact, resolution),
  };
}

function patchWorkspace(
  model: Ns4E8Model, workspaceId: string, patch: (workspace: Ns4E8Model['workspaces'][number]) => Ns4E8Model['workspaces'][number],
): Ns4E8Model {
  return { ...model, workspaces: model.workspaces.map(workspace => workspace.workspaceId === workspaceId ? patch(workspace) : workspace) };
}
function patchOrganisms(
  workspace: Ns4E8Model['workspaces'][number], sectionId: string,
  patch: (organisms: Ns4E8Model['workspaces'][number]['sections'][number]['organisms']) => Ns4E8Model['workspaces'][number]['sections'][number]['organisms'],
): Ns4E8Model['workspaces'][number] {
  return { ...workspace, sections: workspace.sections.map(section => section.sectionId === sectionId ? { ...section, organisms: patch(section.organisms) } : section) };
}

function wireLocalQuery(model: Ns4E8Model, resolution: Extract<Ns4E8ModelResolution, { kind: 'wireLocalQuery' }>): Ns4E8Model {
  return patchWorkspace(model, resolution.workspaceId, workspace => {
    const bffCalls = workspace.bffCalls.some(call => call.bffId === resolution.bffId) ? workspace.bffCalls
      : [...workspace.bffCalls, { bffId: resolution.bffId, kind: 'query' as const, operationId: resolution.operationId,
          outputKind: resolution.outputKind, entityRef: resolution.entityRef }];
    return patchOrganisms({ ...workspace, bffCalls }, resolution.sectionId, organisms => organisms
      .map(organism => organism.dataSource === resolution.reference ? { ...organism, dataSource: resolution.bffId } : organism));
  });
}

function moveActionToNavigation(model: Ns4E8Model, resolution: Extract<Ns4E8ModelResolution, { kind: 'moveActionToNavigation' }>): Ns4E8Model {
  return patchWorkspace(model, resolution.workspaceId, workspace => {
    const navigation = workspace.navigation || [];
    const next = navigation.some(item => item.targetWorkspaceId === resolution.targetWorkspaceId) ? navigation
      : [...navigation, { targetWorkspaceId: resolution.targetWorkspaceId, label: resolution.label, prominence: 'contextual' as const, order: navigation.length }];
    return patchOrganisms({ ...workspace, navigation: next }, resolution.sectionId, organisms => dropFirst(organisms, resolution.reference));
  });
}

function dropOrganism(model: Ns4E8Model, resolution: Extract<Ns4E8ModelResolution, { kind: 'dropOrganism' }>): Ns4E8Model {
  return patchWorkspace(model, resolution.workspaceId, workspace => patchOrganisms(workspace, resolution.sectionId,
    organisms => dropFirst(organisms, resolution.reference)));
}

/**
 * Repairs are applied one after another, so an index captured while validating is stale as soon as
 * the first organism leaves the section: each repair finds its own organism by the reference it read.
 */
function dropFirst(
  organisms: Ns4E8Model['workspaces'][number]['sections'][number]['organisms'], reference: string,
): Ns4E8Model['workspaces'][number]['sections'][number]['organisms'] {
  const index = organisms.findIndex(organism => organism.dataSource === reference || organism.action === reference);
  return index < 0 ? organisms : [...organisms.slice(0, index), ...organisms.slice(index + 1)];
}

const CONTENT_ORGANISM_ROLES = new Set(['hero', 'banner', 'richText', 'imageSet', 'ctaLink', 'showcase']);
function isContentOrganismRole(role: string): boolean {
  return CONTENT_ORGANISM_ROLES.has(role);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function decisionId(prefix: string, ...parts: string[]): string {
  return prefix + parts.map(part => part.replace(/[^A-Za-z0-9]+(.)?/g, (_match, next: string | undefined) => next ? next.toUpperCase() : ''))
    .map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}
