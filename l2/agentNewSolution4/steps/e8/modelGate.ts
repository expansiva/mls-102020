/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e8/modelGate.ts" enhancement="_blank"/>

/**
 * The E8 model gate is structural: broken references fail (they would compile a broken module),
 * and everything that is evidence about the product is a registrar resolved through ns4Resolve.
 */

import { resolveNs4Findings } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';
import type { Ns4ResolutionResult } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';
import type { Ns4E8Sources } from '/_102020_/l2/agentNewSolution4/steps/e8/contracts.js';
import type { Ns4E8Model } from '/_102020_/l2/agentNewSolution4/steps/e8/model.js';

export interface Ns4E8ModelIssue { code: string; path: string; message: string; severity?: 'warning'; }
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
      section.organisms.forEach(organism => {
        if (organism.dataSource && !queries.has(organism.dataSource)) {
          add('NS4_E8_ORGANISM_SOURCE', sectionPath, `Organism reads ${organism.dataSource}, which is not a query of this workspace.`);
        }
        if (organism.action && !commands.has(organism.action)) {
          add('NS4_E8_ORGANISM_ACTION', sectionPath, `Organism runs ${organism.action}, which is not a command of this workspace.`);
        }
      });
    });

    // A record chosen on the page needs a query to choose it from. This is evidence about the
    // journeys, not a broken contract, so it is recorded and the run continues.
    const pickerEntities = new Set(workspace.bffCalls.filter(call => call.kind === 'query').map(call => call.entityRef));
    workspace.bffCalls.filter(call => call.kind === 'command').forEach(call => {
      (operations.get(call.operationId)?.inputs || []).forEach(input => {
        if (input.source !== 'selectedEntity' || !input.required) return;
        if (pickerEntities.has(input.fieldRef.entityId) || input.fieldRef.entityId === workspace.entity) return;
        add('NS4_E8_PICKER_SOURCE', `${path}.bffCalls.${call.bffId}.${input.inputId}`,
          `A tela ${workspace.title} escolhe ${input.fieldRef.entityId} sem uma consulta que o liste; nesta versão o registro vem de fora da tela. Revisar?`, 'warning');
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

export function resolveNs4E8ModelFindings(model: Ns4E8Model, issues: Ns4E8ModelIssue[]): Ns4ResolutionResult<Ns4E8Model> {
  return resolveNs4Findings(model, issues.map(issue => issue.severity === 'warning' ? {
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

function decisionId(prefix: string, ...parts: string[]): string {
  return prefix + parts.map(part => part.replace(/[^A-Za-z0-9]+(.)?/g, (_match, next: string | undefined) => next ? next.toUpperCase() : ''))
    .map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}
