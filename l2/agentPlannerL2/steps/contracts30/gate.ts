/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/contracts30/gate.ts" enhancement="_blank"/>

import {
  collectP2CallSlots,
  collectP2FieldCatalog,
  emitP2ContractDefs,
  isIdentityPath,
  isP2ContractKind,
  isP2ContractShape,
  type P2CallSlot,
  type P2ContractCall,
  type P2ContractsDraft,
  type P2EntityField,
} from '/_102020_/l2/agentPlannerL2/steps/contracts30/contracts.js';
import type { P2L4Sources, P2WorkspacesDraft } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;
const FIELD_PATH = /^[A-Z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)+$/;

export interface P2ContractGateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface P2ContractGateResult {
  ok: boolean;
  issues: P2ContractGateIssue[];
}

export function validateP2Contracts(
  draft: P2ContractsDraft,
  workspaces: P2WorkspacesDraft,
  sources: P2L4Sources,
): P2ContractGateResult {
  const issues: P2ContractGateIssue[] = [];
  const catalog = collectP2FieldCatalog(sources);
  const catalogByPath = new Map(catalog.map(field => [field.path, field]));
  const slots = collectP2CallSlots(workspaces, sources);
  const workspaceIds = new Set(workspaces.workspaces.map(workspace => workspace.workspaceId));

  if (!draft.workspaces.length) {
    error(issues, 'P2_CONTRACT_NONE', 'At least one workspace contract is required.', 'workspaces');
  }

  const seenWorkspace = new Set<string>();
  draft.workspaces.forEach((workspace, position) => {
    const base = `workspaces[${position}]`;
    if (!MEMBER_ID.test(workspace.workspaceId)) {
      error(issues, 'P2_CONTRACT_WORKSPACE_ID', 'workspaceId must be lowerCamel.', `${base}.workspaceId`);
    } else if (!workspaceIds.has(workspace.workspaceId)) {
      error(issues, 'P2_CONTRACT_WORKSPACE_UNKNOWN', `Unknown workspaceId ${workspace.workspaceId}.`, `${base}.workspaceId`);
    }
    if (workspace.workspaceId && seenWorkspace.has(workspace.workspaceId)) {
      error(issues, 'P2_CONTRACT_WORKSPACE_DUP', `Duplicate workspaceId ${workspace.workspaceId}.`, `${base}.workspaceId`);
    }
    if (workspace.workspaceId) seenWorkspace.add(workspace.workspaceId);

    if (!workspace.calls.length) {
      error(issues, 'P2_CONTRACT_CALL_NONE', 'Each workspace needs at least one call.', `${base}.calls`);
    }

    const callNames = new Set<string>();
    const covered = new Set<string>();
    workspace.calls.forEach((call, callPosition) => {
      const callPath = `${base}.calls[${callPosition}]`;
      validateCall(issues, call, callPath, catalogByPath, callNames);
      covered.add(slotKey(call.stepRef, call.transitionRef));
    });

    const expected = slots.filter(slot => slot.workspaceId === workspace.workspaceId);
    for (const slot of expected) {
      if (!covered.has(slotKey(slot.stepRef, slot.transitionRef))) {
        error(
          issues,
          'P2_CONTRACT_SLOT_MISSING',
          `Missing call for step ${slot.stepRef}${slot.transitionRef ? ` transition ${slot.transitionRef}` : ''} (${slot.shape}).`,
          `${base}.calls`,
        );
      }
    }

    workspace.calls.forEach((call, callPosition) => {
      if (!expected.some(slot => slotMatches(slot, call))) {
        error(
          issues,
          'P2_CONTRACT_SLOT_INVENTED',
          `Call ${call.callName || call.stepRef} does not match a deterministic slot of this workspace.`,
          `${base}.calls[${callPosition}]`,
        );
      }
    });
  });

  for (const workspace of workspaces.workspaces) {
    if (!seenWorkspace.has(workspace.workspaceId)) {
      error(
        issues,
        'P2_CONTRACT_WORKSPACE_MISSING',
        `Workspace ${workspace.workspaceId} has no contract.`,
        'workspaces',
      );
    }
  }

  return { ok: !issues.some(issue => issue.severity === 'error'), issues };
}

export function formatP2ContractGate(issues: P2ContractGateIssue[]): string {
  return issues
    .filter(issue => issue.severity === 'error')
    .map(issue => {
      const where = issue.path ? ` ${issue.path}` : '';
      return `${issue.code}${where}: ${issue.message}`;
    })
    .join('\n');
}

export function emittedContractIsClean(source: string): string[] {
  const issues: string[] = [];
  if (/\bimport\b/.test(source)) issues.push('emitted contract must not import');
  if (/\bany\b/.test(source)) issues.push('emitted contract must not use any');
  if (!source.includes('export interface')) issues.push('emitted contract must export interfaces');
  if (!source.includes(' as const')) issues.push('emitted contract must export route constants');
  if (!source.startsWith('/// <mls fileReference=')) issues.push('emitted contract must start with the mls header');
  return issues;
}

export function emitWorkspaceContract(
  project: number,
  moduleName: string,
  workspaceId: string,
  draft: P2ContractsDraft,
  catalog: ReadonlyMap<string, P2EntityField>,
): string {
  const workspace = draft.workspaces.find(item => item.workspaceId === workspaceId);
  return emitP2ContractDefs({
    project,
    moduleName,
    workspaceId,
    calls: workspace?.calls || [],
    catalog,
  });
}

function validateCall(
  issues: P2ContractGateIssue[],
  call: P2ContractCall,
  base: string,
  catalog: Map<string, P2EntityField>,
  callNames: Set<string>,
): void {
  if (!MEMBER_ID.test(call.callName)) {
    error(issues, 'P2_CONTRACT_CALL_ID', 'callName must be lowerCamel.', `${base}.callName`);
  } else if (callNames.has(call.callName)) {
    error(issues, 'P2_CONTRACT_CALL_DUP', `Duplicate callName ${call.callName}.`, `${base}.callName`);
  }
  if (call.callName) callNames.add(call.callName);

  if (!isP2ContractKind(call.kind)) {
    error(issues, 'P2_CONTRACT_KIND', "kind must be 'query' or 'command'.", `${base}.kind`);
  }
  if (!isP2ContractShape(call.shape)) {
    error(issues, 'P2_CONTRACT_SHAPE', 'shape must be list, get, create, update, transition or ddm.', `${base}.shape`);
  }
  if (call.kind === 'query' && call.callName && !call.callName.startsWith('qry')) {
    error(issues, 'P2_CONTRACT_QRY_PREFIX', 'query callName must start with qry.', `${base}.callName`);
  }
  if (call.kind === 'command' && call.callName && !call.callName.startsWith('cmd')) {
    error(issues, 'P2_CONTRACT_CMD_PREFIX', 'command callName must start with cmd.', `${base}.callName`);
  }
  if (call.kind === 'query' && (call.shape === 'create' || call.shape === 'update' || call.shape === 'transition')) {
    error(issues, 'P2_CONTRACT_KIND_SHAPE', `query cannot have shape ${call.shape}.`, `${base}.shape`);
  }
  if (call.kind === 'command' && (call.shape === 'list' || call.shape === 'get' || call.shape === 'ddm')) {
    error(issues, 'P2_CONTRACT_KIND_SHAPE', `command cannot have shape ${call.shape}.`, `${base}.shape`);
  }
  if (!ENTITY_ID.test(call.entityRef)) {
    error(issues, 'P2_CONTRACT_ENTITY', 'entityRef must be UpperCamel.', `${base}.entityRef`);
  }
  if (!MEMBER_ID.test(call.stepRef)) {
    error(issues, 'P2_CONTRACT_STEP', 'stepRef must be lowerCamel.', `${base}.stepRef`);
  }

  const names = new Set<string>();
  validateFields(issues, call.inputFields, `${base}.inputFields`, catalog, names, call, 'input');
  const outputNames = new Set<string>();
  validateFields(issues, call.outputFields, `${base}.outputFields`, catalog, outputNames, call, 'output');
}

function validateFields(
  issues: P2ContractGateIssue[],
  paths: readonly string[],
  base: string,
  catalog: Map<string, P2EntityField>,
  names: Set<string>,
  call: P2ContractCall,
  direction: 'input' | 'output',
): void {
  paths.forEach((path, position) => {
    const at = `${base}[${position}]`;
    if (!FIELD_PATH.test(path)) {
      error(issues, 'P2_CONTRACT_FIELD_PATH', `Field ${path} is not an ontology path.`, at);
      return;
    }
    const field = catalog.get(path);
    if (!field) {
      error(issues, 'P2_CONTRACT_FIELD_UNKNOWN', `Field ${path} does not resolve in the ontology.`, at);
      return;
    }
    if (field.tsType === 'any') {
      error(issues, 'P2_CONTRACT_FIELD_ANY', `Field ${path} must not type as any.`, at);
    }
    if (direction === 'input' && call.kind === 'command' && field.derived && !isIdentityPath(call.entityRef, path)) {
      error(issues, 'P2_CONTRACT_DERIVED_INPUT', `derived field ${path} cannot be a command input.`, at);
    }
    if (field.name && names.has(field.name)) {
      error(issues, 'P2_CONTRACT_FIELD_COLLISION', `Property ${field.name} collides in this interface.`, at);
    }
    if (field.name) names.add(field.name);
  });
}

function slotKey(stepRef: string, transitionRef: string): string {
  return transitionRef ? `${stepRef}::${transitionRef}` : stepRef;
}

function slotMatches(slot: P2CallSlot, call: P2ContractCall): boolean {
  if (slot.stepRef !== call.stepRef) return false;
  if (slot.transitionRef) return slot.transitionRef === call.transitionRef;
  return true;
}

function error(issues: P2ContractGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, path });
}
