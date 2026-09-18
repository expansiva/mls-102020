/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/shared40/gate.ts" enhancement="_blank"/>

import type { P2ContractsDraft } from '/_102020_/l2/agentPlannerL2/steps/contracts30/contracts.js';
import type { P2WorkspacesDraft } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import {
  P2_SHARED_KEY_READERS,
  P2_SHARED_KEYS,
  assembleP2SharedDefinition,
  callsOf,
  deriveP2SharedBase,
  isP2ActionKind,
  isP2BindingKind,
  isP2ScenaryKind,
  isP2StateKind,
  orderedDefinition,
  type P2SharedDefinition,
  type P2SharedDraft,
  type P2SharedJudgment,
} from '/_102020_/l2/agentPlannerL2/steps/shared40/contracts.js';
import type { P2L4Sources } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const STATE_KEY = /^ui\.[a-z][A-Za-z0-9]*\./;

export interface P2SharedGateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface P2SharedGateResult {
  ok: boolean;
  issues: P2SharedGateIssue[];
}

export function validateP2Shared(
  draft: P2SharedDraft,
  workspaces: P2WorkspacesDraft,
  contracts: P2ContractsDraft,
  sources: P2L4Sources,
  project: number,
): P2SharedGateResult {
  const issues: P2SharedGateIssue[] = [];
  const workspaceIds = new Set(workspaces.workspaces.map(workspace => workspace.workspaceId));

  if (!draft.workspaces.length) {
    error(issues, 'P2_SHARED_NONE', 'At least one workspace shared definition is required.', 'workspaces');
  }

  const seen = new Set<string>();
  draft.workspaces.forEach((workspace, position) => {
    const base = `workspaces[${position}]`;
    if (!MEMBER_ID.test(workspace.workspaceId)) {
      error(issues, 'P2_SHARED_WORKSPACE_ID', 'workspaceId must be lowerCamel.', `${base}.workspaceId`);
    } else if (!workspaceIds.has(workspace.workspaceId)) {
      error(issues, 'P2_SHARED_WORKSPACE_UNKNOWN', `Unknown workspaceId ${workspace.workspaceId}.`, `${base}.workspaceId`);
    }
    if (workspace.workspaceId && seen.has(workspace.workspaceId)) {
      error(issues, 'P2_SHARED_WORKSPACE_DUP', `Duplicate workspaceId ${workspace.workspaceId}.`, `${base}.workspaceId`);
    }
    if (workspace.workspaceId) seen.add(workspace.workspaceId);

    const cut = workspaces.workspaces.find(item => item.workspaceId === workspace.workspaceId);
    const calls = callsOf(contracts, workspace.workspaceId);
    if (!cut) return;
    const derived = deriveP2SharedBase({
      project,
      moduleName: workspaces.moduleName,
      workspace: cut,
      calls,
      sources,
    });
    validateJudgment(issues, workspace, derived.pageId, calls.map(call => call.callName), base);
    const definition = assembleP2SharedDefinition(derived, workspace);
    validateDefinition(issues, definition, calls.map(call => call.callName), `${base}.definition`);
  });

  for (const workspace of workspaces.workspaces) {
    if (!seen.has(workspace.workspaceId)) {
      error(issues, 'P2_SHARED_WORKSPACE_MISSING', `Workspace ${workspace.workspaceId} has no shared definition.`, 'workspaces');
    }
  }

  return { ok: !issues.some(issue => issue.severity === 'error'), issues };
}

export function formatP2SharedGate(issues: P2SharedGateIssue[]): string {
  return issues
    .filter(issue => issue.severity === 'error')
    .map(issue => {
      const where = issue.path ? ` ${issue.path}` : '';
      return `${issue.code}${where}: ${issue.message}`;
    })
    .join('\n');
}

export function emittedSharedIsClean(source: string): string[] {
  const issues: string[] = [];
  if (!source.startsWith('/// <mls fileReference=')) issues.push('emitted shared must start with the mls header');
  if (!source.includes('export const definition =')) issues.push('emitted shared must export definition');
  if (!source.includes(' as const')) issues.push('emitted shared must use as const');
  if (/\bimport\b/.test(source)) issues.push('emitted shared must not import');
  if (/\bexport class\b/.test(source)) issues.push('emitted shared must not export a class');
  const definition = parseEmittedDefinition(source);
  if (!definition) {
    issues.push('emitted shared definition is not parseable JSON');
    return issues;
  }
  const keys = Object.keys(definition);
  for (const key of P2_SHARED_KEYS) {
    if (!keys.includes(key)) issues.push(`missing key ${key} (reader: ${P2_SHARED_KEY_READERS[key]})`);
  }
  for (const key of keys) {
    if (!(P2_SHARED_KEYS as readonly string[]).includes(key)) {
      issues.push(`unknown key ${key} has no page11/page21 reader`);
    }
  }
  return issues;
}

export function parseEmittedDefinition(source: string): Record<string, unknown> | null {
  const marker = 'export const definition =';
  const startAssign = source.indexOf(marker);
  if (startAssign < 0) return null;
  const start = source.indexOf('{', startAssign);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        try { return JSON.parse(source.slice(start, index + 1)) as Record<string, unknown>; }
        catch { return null; }
      }
    }
  }
  return null;
}

function validateJudgment(
  issues: P2SharedGateIssue[],
  judgment: P2SharedJudgment,
  pageId: string,
  callNames: readonly string[],
  base: string,
): void {
  if (!judgment.pageName) {
    error(issues, 'P2_SHARED_PAGE_NAME', 'pageName is required.', `${base}.pageName`);
  }

  const callSet = new Set(callNames);
  const commandCalls = callNames.filter(name => name.startsWith('cmd'));
  const queryCalls = callNames.filter(name => name.startsWith('qry'));
  const stateKeys = new Set(judgment.states.map(state => state.stateKey).filter(Boolean));

  if (!judgment.scenaries.some(scene => scene.kind === 'base' && scene.value === 'base')) {
    error(issues, 'P2_SHARED_SCENARY_BASE', 'scenaries must include a base scene.', `${base}.scenaries`);
  }

  const sceneValues = new Set<string>();
  judgment.scenaries.forEach((scene, position) => {
    const at = `${base}.scenaries[${position}]`;
    if (!isP2ScenaryKind(scene.kind)) {
      error(issues, 'P2_SHARED_SCENARY_KIND', 'kind must be base, detail or command.', `${at}.kind`);
    }
    if (!scene.value) error(issues, 'P2_SHARED_SCENARY_VALUE', 'scene value is required.', `${at}.value`);
    if (scene.value && sceneValues.has(scene.value)) {
      error(issues, 'P2_SHARED_SCENARY_DUP', `Duplicate scene value ${scene.value}.`, `${at}.value`);
    }
    if (scene.value) sceneValues.add(scene.value);
    if (scene.kind === 'command') {
      if (!scene.commandName.startsWith('cmd') || !callSet.has(scene.commandName)) {
        error(issues, 'P2_SHARED_SCENARY_CMD', `command scene must cite an existing cmd* call (got ${scene.commandName || 'empty'}).`, `${at}.commandName`);
      }
      if (judgment.destructiveCommandIds.includes(scene.commandName)) {
        error(issues, 'P2_SHARED_SCENARY_DESTRUCTIVE', `destructive command ${scene.commandName} must not be a scene.`, at);
      }
    }
    for (const key of scene.preconditions) {
      if (!stateKeys.has(key)) {
        error(issues, 'P2_SHARED_PRECONDITION', `precondition ${key} is not a declared stateKey.`, `${at}.preconditions`);
      }
    }
  });

  judgment.destructiveCommandIds.forEach((commandName, position) => {
    if (!commandCalls.includes(commandName)) {
      error(
        issues,
        'P2_SHARED_DESTRUCTIVE',
        `destructiveCommandIds must be a subset of command calls (got ${commandName}).`,
        `${base}.destructiveCommandIds[${position}]`,
      );
    }
  });

  judgment.states.forEach((state, position) => {
    const at = `${base}.states[${position}]`;
    if (!isP2StateKind(state.kind)) error(issues, 'P2_SHARED_STATE_KIND', 'unknown state kind.', `${at}.kind`);
    if (!state.stateKey || !STATE_KEY.test(state.stateKey) || !state.stateKey.startsWith(`ui.${pageId}.`)) {
      error(issues, 'P2_SHARED_STATE_KEY', `stateKey must live under ui.${pageId}.`, `${at}.stateKey`);
    }
    const cited = state.contractRef?.commandName || state.actionRef || '';
    if (cited && !callSet.has(cited)) {
      error(issues, 'P2_SHARED_STATE_CALL', `state cites unknown call ${cited}.`, at);
    }
  });

  judgment.actions.forEach((action, position) => {
    const at = `${base}.actions[${position}]`;
    if (!isP2ActionKind(action.kind)) error(issues, 'P2_SHARED_ACTION_KIND', 'unknown action kind.', `${at}.kind`);
    if (action.kind === 'query' || action.kind === 'command') {
      const cited = action.commandRef || action.actionId;
      if (!callSet.has(cited || '')) {
        error(issues, 'P2_SHARED_ACTION_CALL', `action cites unknown call ${cited || 'empty'}.`, at);
      }
    }
    for (const key of [
      ...(action.inputStateKeys || []),
      ...(action.outputStateKeys || []),
      ...(action.routeParamInputStateKeys || []),
      ...(action.selectedEntityInputStateKeys || []),
      ...(action.clearInputStateKeys || []),
      action.statusStateKey,
      action.errorStateKey,
      action.stateKey,
    ]) {
      if (key && !stateKeys.has(key)) {
        error(issues, 'P2_SHARED_ACTION_STATE', `action references undeclared stateKey ${key}.`, at);
      }
    }
  });

  judgment.dataBindings.forEach((binding, position) => {
    const at = `${base}.dataBindings[${position}]`;
    if (!isP2BindingKind(binding.kind)) error(issues, 'P2_SHARED_BINDING_KIND', 'binding kind must be query or command.', `${at}.kind`);
    if (!callSet.has(binding.command)) {
      error(issues, 'P2_SHARED_BINDING_CALL', `dataBinding cites unknown call ${binding.command}.`, `${at}.command`);
    }
    if (binding.stateKey && !stateKeys.has(binding.stateKey)) {
      error(issues, 'P2_SHARED_BINDING_STATE', `dataBinding stateKey ${binding.stateKey} is not declared.`, `${at}.stateKey`);
    }
  });

  judgment.initialLoads.forEach((load, position) => {
    const at = `${base}.initialLoads[${position}]`;
    if (!queryCalls.includes(load.actionId)) {
      error(issues, 'P2_SHARED_LOAD_CALL', `initialLoad must cite an existing qry* call (got ${load.actionId || 'empty'}).`, `${at}.actionId`);
    }
    if (load.stateKey && !stateKeys.has(load.stateKey)) {
      error(issues, 'P2_SHARED_LOAD_STATE', `initialLoad stateKey ${load.stateKey} is not declared.`, `${at}.stateKey`);
    }
  });
}

function validateDefinition(
  issues: P2SharedGateIssue[],
  definition: P2SharedDefinition,
  callNames: readonly string[],
  base: string,
): void {
  const keys = Object.keys(orderedDefinition(definition));
  for (const key of P2_SHARED_KEYS) {
    if (!keys.includes(key)) {
      error(issues, 'P2_SHARED_KEY_MISSING', `missing key ${key} (reader: ${P2_SHARED_KEY_READERS[key]}).`, base);
    }
  }
  for (const key of keys) {
    if (!(P2_SHARED_KEYS as readonly string[]).includes(key)) {
      error(issues, 'P2_SHARED_KEY_UNKNOWN', `key ${key} has no page11/page21 reader.`, `${base}.${key}`);
    }
  }

  const callSet = new Set(callNames);
  for (const operationId of definition.operationIds) {
    if (!callSet.has(operationId)) {
      error(issues, 'P2_SHARED_OPERATION', `operationId ${operationId} does not cite an existing call.`, `${base}.operationIds`);
    }
  }
  for (const ownerId of definition.ownerIds) {
    if (!ownerId.startsWith('contract:')) continue;
    const callName = ownerId.split('.').pop() || '';
    if (!callSet.has(callName)) {
      error(issues, 'P2_SHARED_CONTRACT_OWNER', `ownerId ${ownerId} does not cite an existing call.`, `${base}.ownerIds`);
    }
  }
}

function error(issues: P2SharedGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, path });
}
