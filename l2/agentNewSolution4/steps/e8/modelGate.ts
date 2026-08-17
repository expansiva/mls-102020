/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e8/modelGate.ts" enhancement="_blank"/>

/**
 * The E8 model gate is structural: broken references fail (they would compile a broken module),
 * and everything that is evidence about the product is a registrar resolved through ns4Resolve.
 */

import { buildNs4ParentIndex, ns4FkParentOf } from '/_102020_/l2/agentNewSolution4/helpers/ns4ForeignKeys.js';
import { resolveNs4Findings } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';
import type { Ns4ResolutionFinding, Ns4ResolutionResult } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';
import type { Ns4E8Sources } from '/_102020_/l2/agentNewSolution4/steps/e8/contracts.js';
import type { Ns4E8Model } from '/_102020_/l2/agentNewSolution4/steps/e8/model.js';

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
    });
  });

  model.workspaces.forEach((workspace, index) => {
    const path = `workspaces[${index}]`;
    if (!MEMBER_ID.test(workspace.workspaceId)) add('NS4_E8_WORKSPACE_ID', `${path}.workspaceId`, 'Workspace id must be lower-camel.');
    if (workspaceIds.has(workspace.workspaceId)) add('NS4_E8_WORKSPACE_DUPLICATE', `${path}.workspaceId`, `Duplicate workspace ${workspace.workspaceId}.`);
    workspaceIds.add(workspace.workspaceId);
    if (!workspace.title || !workspace.purpose) add('NS4_E8_LABEL', path, 'Workspace title and purpose are required in the user language.');
    if (!workspace.categoryRef) add('NS4_E8_CATEGORY', `${path}.categoryRef`, 'Every workspace chooses a page category.');
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
  });

  const hostedSteps = new Set(model.workspaces.flatMap(workspace => workspace.hostedStepRefs));
  model.workspaces.filter(workspace => workspace.tier === 'journey').forEach(workspace => {
    if (!workspace.bffCalls.length) add('NS4_E8_EMPTY_JOURNEY', workspace.workspaceId, `Journey workspace ${workspace.workspaceId} compiles no call.`);
  });
  sources.journeys.journeys.forEach(journey => journey.business.steps.forEach(step => {
    const ref = `${journey.journeyId}.${step.stepId}`;
    if (!hostedSteps.has(ref) && model.workspaces.some(workspace => workspace.journeyRef === journey.journeyId)) {
      add('NS4_E8_STEP_UNHOSTED', 'workspaces', `Journey step ${ref} is not hosted by its journey workspace.`);
    }
  }));
  model.menu.forEach((entry, index) => {
    if (!workspaceIds.has(entry.workspaceId)) add('NS4_E8_MENU_WORKSPACE', `menu[${index}]`, `Unknown workspace ${entry.workspaceId}.`);
    if (entry.tier === 'journey') add('NS4_E8_MENU_JOURNEY', `menu[${index}]`, 'A journey is never a menu item; it is reached from a hub action, a related list or a notification.');
  });
  model.landings.forEach((landing, index) => {
    if (!profiles.has(landing.profileRef)) add('NS4_E8_LANDING_PROFILE', `landings[${index}]`, `Unknown E3 profile ${landing.profileRef}.`);
    if (!workspaceIds.has(landing.workspaceId)) add('NS4_E8_LANDING_WORKSPACE', `landings[${index}]`, `Unknown workspace ${landing.workspaceId}.`);
  });

  return { ok: issues.every(issue => issue.severity === 'warning'), issues };
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

function decisionId(prefix: string, ...parts: string[]): string {
  return prefix + parts.map(part => part.replace(/[^A-Za-z0-9]+(.)?/g, (_match, next: string | undefined) => next ? next.toUpperCase() : ''))
    .map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}
