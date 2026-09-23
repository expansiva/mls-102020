/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared40/contracts.ts" enhancement="_blank"/>

import type { D2ContractCall, D2ContractField, D2PageContract } from '/_102020_/l2/agentDefsL2/steps/contracts30/contracts.js';
import type { D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';

export const D2_SHARED_VERSION = '2026-09-23-agent-defs-l2-shared-v2' as const;
export const D2_SHARED_JUDGMENT_VERSION = '2026-09-21-agent-defs-l2-shared-judgment-v1' as const;
export const D2_SHARED_SKILL = '_102020_/l2/agentDefsL2/skills/genD2SharedTs.ts' as const;
export const D2_SHARED_RUNTIME_CONTEXT = '_102029_.d.ts' as const;
export const D2_SHARED_KEYS = ['schemaVersion', 'moduleName', 'pageId', 'pageName', 'baseClassName', 'routePattern', 'contractRef', 'states', 'actions', 'scenaries', 'initialLoads', 'dataBindings'] as const;

export interface D2SharedScenarioJudgment { value: string; kind: 'base' | 'detail' | 'command'; actionId: string; preconditions: string[]; }
export interface D2SharedActionBehavior { actionId: string; refreshActionIds: string[]; destructive: boolean; confirmation?: { title: string; description: string }; }
export interface D2SharedJudgment { schemaVersion: typeof D2_SHARED_JUDGMENT_VERSION; pageId: string; scenaries: D2SharedScenarioJudgment[]; initialLoadActionIds: string[]; actionBehaviors: D2SharedActionBehavior[]; }
export interface D2SharedState { stateKey: string; name: string; kind: string; defaultValue: unknown; valueSet?: string[]; actionRef?: string; contractRef?: string; outputShape?: 'array' | 'object'; source?: 'userInput' | 'selectedEntity' | 'routeParam' | 'session'; presentation?: 'form' | 'selection' | 'route' | 'hidden'; editable?: boolean; required?: boolean; }
export interface D2SharedAction { actionId: string; kind: 'query' | 'command' | 'stateSetter'; commandRef?: string; routeRef?: string; inputTypeRef?: string; outputTypeRef?: string; inputStateKeys: string[]; outputStateKeys: string[]; statusStateKey: string; errorStateKey: string; refreshActionIds: string[]; confirmation?: { required: true; title: string; description: string }; stateKey?: string; }
export interface D2SharedBinding { actionId: string; kind: 'query' | 'command'; routeRef: string; inputTypeRef: string; outputTypeRef: string; inputStateKeys: string[]; resultStateKey: string; }
export interface D2SharedDefinition { schemaVersion: typeof D2_SHARED_VERSION; moduleName: string; pageId: string; pageName: string; baseClassName: string; routePattern: string; contractRef: { defPath: string; calls: Array<{ actionId: string; routeConst: string; inputType: string; outputType: string }> }; states: D2SharedState[]; actions: D2SharedAction[]; scenaries: D2SharedScenarioJudgment[]; initialLoads: Array<{ actionId: string; stateKey: string }>; dataBindings: D2SharedBinding[]; }
export interface D2SharedPipelineItem { id: string; type: 'l2_shared'; defPath: string; outputPath: string; dependsFiles: string[]; dependsOn: string[]; skills: string[]; }

export function buildD2SharedDefinition(moduleName: string, page: D2SelectedPage, contract: D2PageContract, judgment: D2SharedJudgment): D2SharedDefinition {
  const states: D2SharedState[] = [
    { stateKey: `ui.${page.pageId}.pageStatus`, name: 'pageStatus', kind: 'pageStatus', defaultValue: 'idle', valueSet: ['idle', 'loading', 'empty', 'success', 'error'] },
    { stateKey: `ui.${page.pageId}.scenary`, name: 'scenary', kind: 'uiScenary', defaultValue: 'base', valueSet: judgment.scenaries.map(item => item.value) },
  ];
  const behavior = new Map(judgment.actionBehaviors.map(item => [item.actionId, item]));
  const actions: D2SharedAction[] = [];
  const dataBindings: D2SharedBinding[] = [];
  for (const call of contract.calls) {
    const prefix = `ui.${page.pageId}.${call.callName}`;
    const inputStates = flatten(call.input).map(field => {
      const stateKey = `${prefix}.input.${field.path.replace(/^[^.]+\./, '').replace(/\./g, '_').replace('$', '')}`;
      const selected = isSelectedEntity(call, field);
      states.push({ stateKey, name: field.name, kind: 'input', defaultValue: null, actionRef: call.callName, contractRef: `${call.callPascal}Input.${field.path}`, source: selected ? 'selectedEntity' : 'userInput', presentation: selected ? 'selection' : 'form', editable: !selected, required: field.required });
      actions.push({ actionId: `set${call.callPascal}${field.path.split('.').slice(1).map(part => pascal(part.replace(/^\$/, ''))).join('')}`, kind: 'stateSetter', inputStateKeys: [], outputStateKeys: [stateKey], statusStateKey: '', errorStateKey: '', refreshActionIds: [], stateKey });
      return stateKey;
    });
    const statusStateKey = `${prefix}.status`;
    const errorStateKey = `${prefix}.error`;
    const resultStateKey = `${prefix}.result`;
    states.push(
      { stateKey: statusStateKey, name: `${call.callName}Status`, kind: 'actionStatus', defaultValue: 'idle', valueSet: ['idle', 'loading', 'success', 'error'], actionRef: call.callName },
      { stateKey: errorStateKey, name: `${call.callName}Error`, kind: 'actionError', defaultValue: null, actionRef: call.callName },
      { stateKey: resultStateKey, name: `${call.callName}Result`, kind: call.operation === 'list' || call.operation === 'get' ? 'queryResult' : 'commandOutput', defaultValue: call.outputShape === 'array' ? [] : null, actionRef: call.callName, contractRef: `${call.callPascal}Output`, outputShape: call.outputShape },
    );
    const item = behavior.get(call.callName);
    const kind = call.operation === 'list' || call.operation === 'get' ? 'query' : 'command';
    actions.push({ actionId: call.callName, kind, commandRef: call.callName, routeRef: call.routeName, inputTypeRef: `${call.callPascal}Input`, outputTypeRef: `${call.callPascal}Output`, inputStateKeys: inputStates, outputStateKeys: [resultStateKey], statusStateKey, errorStateKey, refreshActionIds: item?.refreshActionIds || [], ...(item?.destructive && item.confirmation ? { confirmation: { required: true, ...item.confirmation } } : {}) });
    dataBindings.push({ actionId: call.callName, kind, routeRef: call.routeName, inputTypeRef: `${call.callPascal}Input`, outputTypeRef: `${call.callPascal}Output`, inputStateKeys: inputStates, resultStateKey });
  }
  return {
    schemaVersion: D2_SHARED_VERSION, moduleName, pageId: page.pageId, pageName: page.label,
    baseClassName: `${pascal(page.pageId)}Shared`, routePattern: routeOf(page),
    contractRef: { defPath: `l2/${moduleName}/web/contracts/${page.pageId}.defs.ts`, calls: contract.calls.map(call => ({ actionId: call.callName, routeConst: call.routeName, inputType: `${call.callPascal}Input`, outputType: `${call.callPascal}Output` })) },
    states, actions, scenaries: judgment.scenaries,
    initialLoads: judgment.initialLoadActionIds.map(actionId => ({ actionId, stateKey: `ui.${page.pageId}.${actionId}.result` })),
    dataBindings,
  };
}

export function buildD2SharedPipeline(moduleName: string, pageId: string): D2SharedPipelineItem {
  return { id: `${pageId}__l2_shared`, type: 'l2_shared', defPath: `l2/${moduleName}/web/shared/${pageId}.defs.ts`, outputPath: `l2/${moduleName}/web/shared/${pageId}.ts`, dependsFiles: [`l2/${moduleName}/web/contracts/${pageId}.defs.ts`, D2_SHARED_RUNTIME_CONTEXT], dependsOn: [], skills: [D2_SHARED_SKILL] };
}

export function suggestedD2SharedJudgment(page: D2SelectedPage, contract: D2PageContract): D2SharedJudgment {
  const queries = contract.calls.filter(call => call.operation === 'list' || call.operation === 'get');
  const commands = contract.calls.filter(call => call.operation !== 'list' && call.operation !== 'get');
  const base = queries.find(call => call.operation === 'list') || queries[0] || contract.calls[0];
  return {
    schemaVersion: D2_SHARED_JUDGMENT_VERSION, pageId: page.pageId,
    scenaries: [{ value: 'base', kind: 'base', actionId: base?.callName || '', preconditions: [] }, ...commands.filter(call => !isObviouslyDestructive(call.callName)).map(call => ({ value: call.callName, kind: 'command' as const, actionId: call.callName, preconditions: selectedKeys(page.pageId, call) }))],
    initialLoadActionIds: queries.filter(call => flatten(call.input).every(field => !field.required)).map(call => call.callName),
    actionBehaviors: contract.calls.map(call => ({ actionId: call.callName, refreshActionIds: call.operation === 'list' || call.operation === 'get' ? [] : queries.map(query => query.callName), destructive: isObviouslyDestructive(call.callName), ...(isObviouslyDestructive(call.callName) ? { confirmation: { title: 'Confirm action', description: 'Confirm this destructive action before continuing.' } } : {}) })),
  };
}

export function d2SharedPreconditionStateKeysByAction(page: D2SelectedPage, contract: D2PageContract): Record<string, string[]> {
  return Object.fromEntries(contract.calls.map(call => [
    call.callName,
    flatten(call.input).map(field => inputStateKey(page.pageId, call, field)),
  ]));
}

export function flatten(fields: D2ContractField[]): D2ContractField[] { return fields.flatMap(field => [field, ...flatten(field.children)]); }
export function inputStateKey(pageId: string, call: D2ContractCall, field: D2ContractField): string { return `ui.${pageId}.${call.callName}.input.${field.path.replace(/^[^.]+\./, '').replace(/\./g, '_').replace('$', '')}`; }
function selectedKeys(pageId: string, call: D2ContractCall): string[] { return flatten(call.input).filter(field => isSelectedEntity(call, field) && field.required).map(field => inputStateKey(pageId, call, field)); }
function isSelectedEntity(call: D2ContractCall, field: D2ContractField): boolean { return field.derived && field.name === 'id' && (call.operation === 'get' || call.operation === 'update' || call.operation === 'transition'); }
export function isObviouslyDestructive(actionId: string): boolean { return /^(delete|remove|cancel|revoke|deactivate|archive)/i.test(actionId); }
function routeOf(page: D2SelectedPage): string { return `/${[...page.ancestors.map(item => item.id), page.pageId].map(segment => segment.replace(/[^A-Za-z0-9_-]/g, '')).filter(Boolean).join('/')}`; }
function pascal(value: string): string { return value.replace(/[^A-Za-z0-9]+(.)/g, (_all, next: string) => next.toUpperCase()).replace(/^./, first => first.toUpperCase()); }
