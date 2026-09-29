/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared40/contracts.ts" enhancement="_blank"/>

import type { D2ContractCall, D2ContractField, D2PageContract } from '/_102020_/l2/agentDefsL2/steps/contracts30/contracts.js';
import type { D2InputSnapshot, D2OperationBinding, D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';

export const D2_SHARED_VERSION = '2026-09-26-agent-defs-l2-shared-v4' as const;
export const D2_SHARED_JUDGMENT_VERSION = '2026-09-21-agent-defs-l2-shared-judgment-v1' as const;
export const D2_SHARED_SKILL = '_102020_/l2/agentDefsL2/skills/genD2SharedTs.ts' as const;
export const D2_SHARED_RUNTIME_CONTEXT = '_102029_.d.ts' as const;
export const D2_SHARED_KEYS = ['schemaVersion', 'moduleName', 'pageId', 'pageName', 'baseClassName', 'routePattern', 'contractRef', 'states', 'actions', 'scenaries', 'initialLoads', 'dataBindings', 'coverage'] as const;

export interface D2SharedScenarioJudgment { value: string; kind: 'base' | 'detail' | 'command'; actionId: string; preconditions: string[]; methodName?: string; operationBindings?: D2SharedOperationBinding[]; }
export interface D2SharedActionBehavior { actionId: string; refreshActionIds: string[]; destructive: boolean; confirmation?: { title: string; description: string }; }
export interface D2SharedJudgment { schemaVersion: typeof D2_SHARED_JUDGMENT_VERSION; pageId: string; scenaries: D2SharedScenarioJudgment[]; initialLoadActionIds: string[]; actionBehaviors: D2SharedActionBehavior[]; }
export interface D2SharedState { stateKey: string; memberName: string; name: string; kind: string; defaultValue: unknown; title?: string; description?: string; enumOptions?: D2ContractField['enumOptions']; valueSet?: string[]; actionRef?: string; contractRef?: string; ontologyRef?: string; dtoPath?: string; outputShape?: 'array' | 'object'; source?: 'userInput' | 'selectedEntity' | 'routeParam' | 'session'; presentation?: 'form' | 'selection' | 'route' | 'hidden'; editable?: boolean; required?: boolean; }
export interface D2SharedOperationBinding { actorRef: string; grantRefs: string[]; authorities: string[]; transition?: D2OperationBinding['transition']; ruleRefs: D2OperationBinding['ruleRefs']; sourceHashes: string[]; }
export interface D2SharedAction { actionId: string; methodName: string; kind: 'query' | 'command' | 'stateSetter' | 'selection'; commandRef?: string; routeRef?: string; inputTypeRef?: string; outputTypeRef?: string; inputStateKeys: string[]; outputStateKeys: string[]; statusStateKey: string; errorStateKey: string; refreshActionIds: string[]; operationBinding?: D2SharedOperationBinding; operationBindings?: D2SharedOperationBinding[]; selection?: { sourceActionId: string; resultStateKey: string; identityPath: string }; confirmation?: { required: true; title: string; description: string }; stateKey?: string; }
export interface D2SharedSnapshotPrecondition { inputStateKey: string; selectedIdentityStateKey: string; sourceActionId: string; resultStateKey: string; identityPath: string; valuePath: string; valueScalar: D2ContractField['scalar']; capture: 'onSelection'; missing: 'blockCommandPreserveEdit'; }
export interface D2SharedBinding { actionId: string; kind: 'query' | 'command'; routeRef: string; inputTypeRef: string; outputTypeRef: string; inputStateKeys: string[]; resultStateKey: string; snapshotPreconditions?: D2SharedSnapshotPrecondition[]; }
export interface D2SharedOutputField { actionId: string; outputTypeRef: string; path: string; }
export interface D2SharedCoverage { organismId: string; sourceIndex: number; kind: string; contentRef: string; content: string; scenarioRefs: string[]; capabilityRefs: string[]; outputFieldsByCapability: Record<string, D2SharedOutputField[]>; source: unknown; }
export interface D2SharedDefinition { schemaVersion: typeof D2_SHARED_VERSION; moduleName: string; pageId: string; pageName: string; baseClassName: string; routePattern: string; contractRef: { defPath: string; calls: Array<{ actionId: string; routeConst: string; inputType: string; outputType: string }> }; states: D2SharedState[]; actions: D2SharedAction[]; scenaries: D2SharedScenarioJudgment[]; initialLoads: Array<{ actionId: string; stateKey: string }>; dataBindings: D2SharedBinding[]; coverage: D2SharedCoverage[]; }
export interface D2SharedPipelineItem { id: string; type: 'l2_shared'; defPath: string; outputPath: string; dependsFiles: string[]; dependsOn: string[]; skills: string[]; }

export function buildD2SharedDefinition(moduleName: string, page: D2SelectedPage, contract: D2PageContract, judgment: D2SharedJudgment): D2SharedDefinition {
  const bindingsByRoute = new Map((page.operationBindings ?? []).map(binding => [binding.route, binding]));
  const states: D2SharedState[] = [
    { stateKey: `ui.${page.pageId}.pageStatus`, memberName: 'pageStatus', name: 'pageStatus', kind: 'pageStatus', defaultValue: 'idle', valueSet: ['idle', 'loading', 'empty', 'success', 'error'] },
    { stateKey: `ui.${page.pageId}.scenary`, memberName: 'scenary', name: 'scenary', kind: 'uiScenary', defaultValue: 'base', valueSet: judgment.scenaries.map(item => item.value) },
  ];
  const behavior = new Map(judgment.actionBehaviors.map(item => [item.actionId, item]));
  const actions: D2SharedAction[] = [{ actionId: 'set:scenario', methodName: 'setScenario', kind: 'stateSetter', inputStateKeys: [], outputStateKeys: [`ui.${page.pageId}.scenary`], statusStateKey: '', errorStateKey: '', refreshActionIds: [], stateKey: `ui.${page.pageId}.scenary` }];
  const dataBindings: D2SharedBinding[] = [];
  for (const call of contract.calls) {
    const operationBinding = bindingsByRoute.get(call.route);
    if (!operationBinding && call.operation !== 'get' && call.operation !== 'list') throw new Error(`D2_SHARED_OPERATION_BINDING_MISSING: ${call.route}`);
    if (operationBinding && (operationBinding.entityId !== call.entityId || operationBinding.operation !== call.operation)) throw new Error(`D2_SHARED_OPERATION_BINDING_MISMATCH: ${call.route}`);
    const prefix = `ui.${page.pageId}.${call.callName}`;
    const inputStates = inputLeaves(call.input).map(field => {
      const dtoPath = dtoPathOf(call.entityId, field.path);
      const stateKey = `${prefix}.input.${dtoPath}`;
      const hasSelectionSource = field.referenceTo.length > 0 && contract.calls.some(candidate =>
        (candidate.operation === 'list' || candidate.operation === 'get')
        && field.referenceTo.includes(candidate.entityId)
        && flatten(candidate.output).some(output => output.derived && output.name === 'id'));
      const selected = isSelectedEntity(call, field)
        || (field.referenceTo.length > 0 && (call.operation !== 'list' || field.required || hasSelectionSource));
      const snapshot = field.writePrecondition;
      const boundInput = operationBinding?.inputFields.find(item => item.path === field.path);
      const inputOrigin = boundInput?.origin;
      if (!inputOrigin && !selected && !snapshot && call.operation !== 'list') throw new Error(`D2_SHARED_INPUT_ORIGIN_MISSING: ${call.route} ${field.path}`);
      const source = selected || snapshot ? 'selectedEntity' : field.path.endsWith('$page') ? 'routeParam' : inputOrigin === 'server' ? 'session' : 'userInput';
      const editable = source === 'userInput' && !selected && !snapshot;
      const required = (boundInput?.required ?? field.required) && !hasOptionalObjectAncestor(call.input, field.path);
      const memberName = `state${pascal(call.callName)}${memberPath(dtoPath)}`;
      states.push({ stateKey, memberName, name: field.name, kind: 'input', defaultValue: null, ...(field.title ? { title: field.title } : {}), ...(field.description ? { description: field.description } : {}), ...(field.enumOptions ? { enumOptions: structuredClone(field.enumOptions) } : {}), ...(field.enumValues.length ? { valueSet: [...field.enumValues] } : {}), actionRef: call.callName, contractRef: `${call.callPascal}Input.${dtoPath}`, ontologyRef: field.path, dtoPath, source, presentation: snapshot || inputOrigin === 'server' ? 'hidden' : source === 'routeParam' ? 'route' : selected ? 'selection' : 'form', editable, required });
      if (editable) actions.push({ actionId: `set:${call.callName}:${dtoPath}`, methodName: `set${pascal(call.callName)}${memberPath(dtoPath)}`, kind: 'stateSetter', inputStateKeys: [], outputStateKeys: [stateKey], statusStateKey: '', errorStateKey: '', refreshActionIds: [], stateKey });
      if (selected && !snapshot) {
        const targets = field.referenceTo.length ? field.referenceTo : [call.entityId];
        const sourceCall = contract.calls.find(candidate => (candidate.operation === 'list' || candidate.operation === 'get') && targets.includes(candidate.entityId) && flatten(candidate.output).some(output => output.derived && output.name === 'id'));
        if (!sourceCall) throw new Error(`D2_SHARED_SELECTION_SOURCE_MISSING: ${call.callName}/${field.path}`);
        const identity = flatten(sourceCall.output).find(output => output.derived && output.name === 'id')!;
        actions.push({ actionId: `select:${call.callName}:${dtoPath}`, methodName: `select${pascal(call.callName)}${memberPath(dtoPath)}`, kind: 'selection', inputStateKeys: [], outputStateKeys: [stateKey], statusStateKey: '', errorStateKey: '', refreshActionIds: [], stateKey, selection: { sourceActionId: sourceCall.callName, resultStateKey: `ui.${page.pageId}.${sourceCall.callName}.result`, identityPath: dtoPathOf(sourceCall.entityId, identity.path) } });
      }
      return stateKey;
    });
    const statusStateKey = `${prefix}.status`;
    const errorStateKey = `${prefix}.error`;
    const resultStateKey = `${prefix}.result`;
    states.push(
      { stateKey: statusStateKey, memberName: `state${pascal(call.callName)}Status`, name: `${call.callName}Status`, kind: 'actionStatus', defaultValue: 'idle', valueSet: ['idle', 'loading', 'success', 'error'], actionRef: call.callName },
      { stateKey: errorStateKey, memberName: `state${pascal(call.callName)}Error`, name: `${call.callName}Error`, kind: 'actionError', defaultValue: null, actionRef: call.callName },
      { stateKey: resultStateKey, memberName: `state${pascal(call.callName)}Result`, name: `${call.callName}Result`, kind: call.operation === 'list' || call.operation === 'get' ? 'queryResult' : 'commandOutput', defaultValue: call.outputShape === 'array' ? [] : null, actionRef: call.callName, contractRef: `${call.callPascal}Output`, outputShape: call.outputShape },
    );
    const item = behavior.get(call.callName);
    const kind = call.operation === 'list' || call.operation === 'get' ? 'query' : 'command';
    actions.push({ actionId: call.callName, methodName: `run${pascal(call.callName)}`, kind, commandRef: call.callName, routeRef: call.routeName, inputTypeRef: `${call.callPascal}Input`, outputTypeRef: `${call.callPascal}Output`, inputStateKeys: inputStates, outputStateKeys: [resultStateKey], statusStateKey, errorStateKey, refreshActionIds: item?.refreshActionIds || [], ...(operationBinding ? { operationBinding: { actorRef: operationBinding.actorRef, grantRefs: [...operationBinding.grantRefs], authorities: [...operationBinding.authorities], ...(operationBinding.transition ? { transition: structuredClone(operationBinding.transition) } : {}), ruleRefs: structuredClone(operationBinding.ruleRefs), sourceHashes: [...operationBinding.sourceHashes] } } : {}), ...(item?.destructive && item.confirmation ? { confirmation: { required: true, ...item.confirmation } } : {}) });
    const snapshotPreconditions = buildSnapshotPreconditions(page.pageId, contract, call);
    dataBindings.push({ actionId: call.callName, kind, routeRef: call.routeName, inputTypeRef: `${call.callPascal}Input`, outputTypeRef: `${call.callPascal}Output`, inputStateKeys: inputStates, resultStateKey, ...(snapshotPreconditions.length ? { snapshotPreconditions } : {}) });
  }
  for (const action of actions.filter(item => item.commandRef)) {
    const call = contract.calls.find(item => item.callName === action.commandRef)!;
    action.operationBindings = (page.operationBindings ?? []).filter(binding => binding.route === call.route).map(({ actorRef, grantRefs, authorities, transition, ruleRefs, sourceHashes }) => ({ actorRef, grantRefs: [...grantRefs], authorities: [...authorities], ...(transition ? { transition: structuredClone(transition) } : {}), ruleRefs: structuredClone(ruleRefs), sourceHashes: [...sourceHashes] }));
  }
  const scenaries = judgment.scenaries.map(scene => ({ ...scene, methodName: `enter${pascal(scene.value)}Scenario`, operationBindings: structuredClone(actions.find(action => action.actionId === scene.actionId)?.operationBindings ?? []) }));
  assignPublicNames(states, actions, scenaries);
  return {
    schemaVersion: D2_SHARED_VERSION, moduleName, pageId: page.pageId, pageName: page.label,
    baseClassName: `${pascal(page.pageId)}Shared`, routePattern: routeOf(page),
    contractRef: { defPath: `l2/${moduleName}/web/contracts/${page.pageId}.defs.ts`, calls: contract.calls.map(call => ({ actionId: call.callName, routeConst: call.routeName, inputType: `${call.callPascal}Input`, outputType: `${call.callPascal}Output` })) },
    states, actions, scenaries,
    initialLoads: judgment.initialLoadActionIds.map(actionId => ({ actionId, stateKey: `ui.${page.pageId}.${actionId}.result` })),
    dataBindings, coverage: deriveCoverage(page, contract, scenaries, actions),
  };
}

export function buildD2SharedPipeline(moduleName: string, pageId: string, semanticRefs: string[] = []): D2SharedPipelineItem {
  return { id: `${pageId}__l2_shared`, type: 'l2_shared', defPath: `l2/${moduleName}/web/shared/${pageId}.defs.ts`, outputPath: `l2/${moduleName}/web/shared/${pageId}.ts`, dependsFiles: [`l2/${moduleName}/web/contracts/${pageId}.defs.ts`, D2_SHARED_RUNTIME_CONTEXT, ...new Set(semanticRefs)], dependsOn: [], skills: [D2_SHARED_SKILL] };
}

export function d2PageSemanticRefs(snapshot: D2InputSnapshot, pageId: string): string[] {
  const page = snapshot.selection.pages.find(item => item.pageId === pageId);
  if (!page || !snapshot.l4) return [];
  const entities = new Set((page.operationBindings ?? []).map(item => item.entityId));
  return [...new Set([
    snapshot.l4.access.path, snapshot.l4.rules.path, snapshot.l4.workflows.path,
    ...snapshot.l4.entities.filter(item => entities.has(item.entityId)).map(item => item.source.path),
    ...(page.operationBindings ?? []).flatMap(item => item.ruleRefs.map(rule => rule.file)),
  ])].filter(Boolean).sort();
}

export function suggestedD2SharedJudgment(page: D2SelectedPage, contract: D2PageContract): D2SharedJudgment {
  const queries = contract.calls.filter(call => call.operation === 'list' || call.operation === 'get');
  const commands = contract.calls.filter(call => call.operation !== 'list' && call.operation !== 'get');
  const base = queries.find(call => call.operation === 'list') || queries[0] || contract.calls[0];
  return {
    schemaVersion: D2_SHARED_JUDGMENT_VERSION, pageId: page.pageId,
    scenaries: [{ value: 'base', kind: 'base', actionId: base?.callName || '', preconditions: [] }, ...commands.filter(call => !isObviouslyDestructive(call.callName)).map(call => ({ value: call.callName, kind: 'command' as const, actionId: call.callName, preconditions: selectedKeys(page.pageId, call) }))],
    initialLoadActionIds: queries.filter(call => inputLeaves(call.input).every(field => !field.required || page.operationBindings?.find(binding => binding.route === call.route)?.inputFields.find(input => input.path === field.path)?.origin === 'server')).map(call => call.callName),
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
export function inputLeaves(fields: D2ContractField[]): D2ContractField[] { return fields.flatMap(field => field.children.length && !field.collection ? inputLeaves(field.children) : [field]); }
function hasOptionalObjectAncestor(fields: D2ContractField[], path: string): boolean {
  return fields.some(field => (field.scalar === 'object' && !field.collection && !field.required && path.startsWith(`${field.path}.`))
    || hasOptionalObjectAncestor(field.children, path));
}
export function inputStateKey(pageId: string, call: D2ContractCall, field: D2ContractField): string { return `ui.${pageId}.${call.callName}.input.${dtoPathOf(call.entityId, field.path)}`; }
export function captureD2SelectedSnapshot(binding: D2SharedSnapshotPrecondition, selectedIdentity: unknown, result: unknown, active?: { selectedIdentity: unknown; value: unknown }): unknown {
  if (selectedIdentity === null || selectedIdentity === undefined) return null;
  if (active?.selectedIdentity === selectedIdentity && validScalar(active.value, binding.valueScalar)) return active.value;
  const rows = Array.isArray(result) ? result : result && typeof result === 'object' ? [result] : [];
  const selected = rows.find(row => readPath(row, binding.identityPath) === selectedIdentity);
  const value = selected ? readPath(selected, binding.valuePath) : undefined;
  return validScalar(value, binding.valueScalar) ? value : null;
}

export function missingD2SnapshotPreconditions(binding: D2SharedBinding, state: Readonly<Record<string, unknown>>): string[] {
  return (binding.snapshotPreconditions ?? []).filter(item => !validScalar(state[item.inputStateKey], item.valueScalar)).map(item => item.inputStateKey);
}

function buildSnapshotPreconditions(pageId: string, contract: D2PageContract, call: D2ContractCall): D2SharedSnapshotPrecondition[] {
  const fields = flatten(call.input).filter(field => field.writePrecondition);
  if (!fields.length) return [];
  const identity = flatten(call.input).find(field => isSelectedEntity(call, field));
  const source = contract.calls.find(candidate => (candidate.operation === 'list' || candidate.operation === 'get')
    && candidate.entityId === call.entityId
    && fields.every(field => flatten(candidate.output).some(output => output.path === field.path))
    && identity && flatten(candidate.output).some(output => output.path === identity.path));
  if (!identity || !source) throw new Error(`D2_SHARED_WRITE_PRECONDITION_SOURCE_MISSING: ${call.callName}`);
  return fields.map(field => ({
    inputStateKey: inputStateKey(pageId, call, field),
    selectedIdentityStateKey: inputStateKey(pageId, call, identity),
    sourceActionId: source.callName,
    resultStateKey: `ui.${pageId}.${source.callName}.result`,
    identityPath: identity.path.replace(/^[^.]+\./, ''),
    valuePath: field.path.replace(/^[^.]+\./, ''),
    valueScalar: field.scalar,
    capture: 'onSelection',
    missing: 'blockCommandPreserveEdit',
  }));
}

function readPath(value: unknown, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((current, part) => current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : undefined, value);
}
function dtoPathOf(entityId: string, fieldPath: string): string {
  const prefix = `${entityId}.`;
  if (!fieldPath.startsWith(prefix)) throw new Error(`D2_SHARED_DTO_PATH_INVALID: ${fieldPath}`);
  const path = fieldPath.slice(prefix.length);
  return path === '$page' ? 'page' : path;
}
function memberPath(dtoPath: string): string { return dtoPath.split('.').map(pascal).join(''); }
function outputDtoPaths(call: D2ContractCall): Array<{ field: D2ContractField; path: string }> {
  const result: Array<{ field: D2ContractField; path: string }> = [];
  const seen = new Set<string>();
  const visit = (field: D2ContractField, parent: string, relational: boolean) => {
    const path = parent ? `${parent}.${field.name}` : field.name;
    if (!field.name || field.name.includes('.') || (relational ? field.path : dtoPathOf(call.entityId, field.path)) !== path) {
      throw new Error(`D2_SHARED_DTO_PATH_INVALID: ${field.path}`);
    }
    if (seen.has(path)) throw new Error(`D2_SHARED_DTO_PATH_AMBIGUOUS: ${path}`);
    seen.add(path);
    result.push({ field, path });
    for (const child of field.children) visit(child, path, relational);
  };
  for (const field of call.output) {
    const relational = field.path === field.name && call.relationships.filter(relation => relation.relationshipId === field.name).length === 1;
    visit(field, '', relational);
  }
  return result;
}
function deriveCoverage(page: D2SelectedPage, contract: D2PageContract, scenes: D2SharedScenarioJudgment[], actions: D2SharedAction[]): D2SharedCoverage[] {
  const occurrences = new Map<string, number>();
  const ids = new Set<string>();
  return page.organisms.map((source, sourceIndex) => {
    const item = source && typeof source === 'object' ? source as Record<string, unknown> : {};
    const kind = typeof item.kind === 'string' ? item.kind : '';
    const folded = kind.replace(/[^A-Za-z0-9]+/gu, '-').replace(/^-|-$/gu, '').toLowerCase();
    if (!folded) throw new Error(`D2_SHARED_COVERAGE_KIND_MISSING: ${page.pageId}/${sourceIndex}`);
    const occurrence = (occurrences.get(folded) ?? 0) + 1; occurrences.set(folded, occurrence);
    const organismId = typeof item.organismId === 'string' ? item.organismId : typeof item.id === 'string' ? item.id : `organism.${folded}.${occurrence}`;
    if (ids.has(organismId)) throw new Error(`D2_SHARED_COVERAGE_DUPLICATE: ${organismId}`); ids.add(organismId);
    const content = typeof item.text === 'string' ? item.text : typeof item.intent === 'string' ? item.intent : typeof item.description === 'string' ? item.description : '';
    if (!content.trim()) throw new Error(`D2_SHARED_COVERAGE_CONTENT_MISSING: ${organismId}`);
    const contentRef = typeof item.contentRef === 'string' ? item.contentRef : `content.${folded}`;
    const scenarioRefs = scenes.map(scene => scene.value);
    const capabilityRefs = Array.isArray(item.capabilityRefs)
      ? item.capabilityRefs.filter((value): value is string => typeof value === 'string')
      : actions.filter(action => action.commandRef && (action.kind === 'query' || action.kind === 'command')).map(action => action.actionId);
    if (capabilityRefs.some(ref => !actions.some(action => action.actionId === ref))) throw new Error(`D2_SHARED_COVERAGE_CAPABILITY_UNKNOWN: ${organismId}`);
    const outputFieldsByCapability = Object.fromEntries(capabilityRefs.map(capability => {
      const action = actions.find(candidate => candidate.actionId === capability);
      const call = contract.calls.find(candidate => candidate.callName === action?.commandRef);
      const fields = call && (call.operation === 'list' || call.operation === 'get')
        ? outputDtoPaths(call).map(({ path }) => ({ actionId: call.callName, outputTypeRef: `${call.callPascal}Output`, path }))
        : [];
      return [capability, fields];
    }));
    return { organismId, sourceIndex, kind, contentRef, content, scenarioRefs, capabilityRefs, outputFieldsByCapability, source: structuredClone(source) };
  });
}
function assignPublicNames(states: D2SharedState[], actions: D2SharedAction[], scenes: D2SharedScenarioJudgment[]): void {
  const members = [
    ...states.map(item => ({ identity: `state:${item.stateKey}`, name: item.memberName, set: (name: string) => { item.memberName = name; } })),
    ...actions.map(item => ({ identity: `action:${item.actionId}`, name: item.methodName, set: (name: string) => { item.methodName = name; } })),
    ...scenes.map(item => ({ identity: `scene:${item.value}`, name: item.methodName!, set: (name: string) => { item.methodName = name; } })),
  ];
  const counts = new Map<string, number>();
  for (const member of members) counts.set(member.name, (counts.get(member.name) ?? 0) + 1);
  for (const member of members) if ((counts.get(member.name) ?? 0) > 1) {
    // The full identity encoding is injective, order independent, and cannot alias another normalised path.
    member.set(`${member.name}X${Array.from(member.identity, value => value.codePointAt(0)!.toString(16).padStart(6, '0')).join('')}`);
  }
}
function validScalar(value: unknown, scalar: D2ContractField['scalar']): boolean {
  if (value === null || value === undefined) return false;
  return scalar === 'object' ? typeof value === 'object' : typeof value === scalar;
}
function selectedKeys(pageId: string, call: D2ContractCall): string[] { return flatten(call.input).filter(field => isSelectedEntity(call, field) && field.required).map(field => inputStateKey(pageId, call, field)); }
function isSelectedEntity(call: D2ContractCall, field: D2ContractField): boolean { return field.derived && field.name === 'id' && (call.operation === 'get' || call.operation === 'update' || call.operation === 'transition'); }
export function isObviouslyDestructive(actionId: string): boolean { return /^(delete|remove|cancel|revoke|deactivate|archive)/i.test(actionId); }
function routeOf(page: D2SelectedPage): string { return `/${[...page.ancestors.map(item => item.id), page.pageId].map(segment => segment.replace(/[^A-Za-z0-9_-]/g, '')).filter(Boolean).join('/')}`; }
function pascal(value: string): string { return value.replace(/[^A-Za-z0-9]+(.)/g, (_all, next: string) => next.toUpperCase()).replace(/^./, first => first.toUpperCase()); }
