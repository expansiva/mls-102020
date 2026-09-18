/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/shared40/contracts.ts" enhancement="_blank"/>

import { moduleFile, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import {
  collectionFieldName,
  isIdentityPath,
  type P2ContractCall,
  type P2ContractsDraft,
  type P2EntityField,
} from '/_102020_/l2/agentPlannerL2/steps/contracts30/contracts.js';
import type { P2L4Sources, P2Workspace, P2WorkspacesDraft } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';

export const P2_SHARED_SCHEMA_VERSION = '2026-09-18-p2-shared-v1' as const;

/** The 20 keys of the 102039 shared `definition`. No others. */
export const P2_SHARED_KEYS = [
  'pageId',
  'pageName',
  'moduleName',
  'baseClassName',
  'routePattern',
  'sourceKind',
  'ownerIds',
  'operationIds',
  'origin',
  'contractRef',
  'layoutRef',
  'states',
  'actions',
  'scenaries',
  'destructiveCommandIds',
  'initialLoads',
  'dataBindings',
  'businessContextRefs',
  'navigationRefs',
  'automation',
] as const;

export type P2SharedKey = typeof P2_SHARED_KEYS[number];

/**
 * Named reader of each key in page11 / page21 / the shared skill.
 * A key without a reader must not be emitted.
 */
export const P2_SHARED_KEY_READERS: Record<P2SharedKey, string> = {
  pageId: 'genCfeSharedTs Input contract; genCfePage21 import path',
  pageName: 'genCfeSharedTs Input contract; genCfePage21 `{pageName}.js`',
  moduleName: 'genCfeSharedTs Input contract; genCfePage21 import path',
  baseClassName: 'genCfeSharedTs class name; genCfePage21 `extends Definition.baseClassName`',
  routePattern: 'genCfeSharedTs parse `Definition.routePattern` against the URL',
  sourceKind: 'genCfeSharedTs Input contract',
  ownerIds: 'genCfeSharedTs Input contract',
  operationIds: 'genCfeSharedTs Input contract',
  origin: 'genCfeSharedTs page origin from the workspace cut',
  contractRef: 'genCfeSharedTs `Definition.contractRef.tsPath` and `contracts[]`',
  layoutRef: 'genCfeSharedTs Input contract (future page11 defs path)',
  states: 'genCfeSharedTs `Definition.states[]`; page11/21 JSDoc `state <stateKey>`',
  actions: 'genCfeSharedTs `Definition.actions[]`; page11/21 JSDoc `action <actionId>`',
  scenaries: 'genCfePage11/21 skeleton: one `<Scene value>` per `scenaries[].value`',
  destructiveCommandIds: 'genCfePage11/21 / uiScenary contract: never become scenes',
  initialLoads: 'genCfeSharedTs `connectedCallback` runs `initialLoads[]`',
  dataBindings: 'genCfePage21 `Definition.dataBindings[]` is the structure source',
  businessContextRefs: 'genCfeSharedTs Input contract; page21 businessContext badge',
  navigationRefs: 'genCfeSharedTs Input contract',
  automation: 'genCfeSharedTs Input contract (`statePrefix` / `stateKeys` / `actionIds`)',
};

export const P2_SCENARY_KINDS = ['base', 'detail', 'command'] as const;
export const P2_ACTION_KINDS = ['query', 'command', 'stateSetter'] as const;
export const P2_STATE_KINDS = [
  'pageStatus', 'uiScenary', 'actionStatus', 'queryResult', 'input', 'commandOutput', 'actionError', 'businessContext',
] as const;
export const P2_BINDING_KINDS = ['query', 'command'] as const;
export const P2_INPUT_SOURCES = ['userInput', 'selectedEntity', 'routeParam'] as const;
export const P2_PRESENTATIONS = ['form', 'selection', 'route'] as const;
export const P2_SOURCE_KINDS = ['operation', 'landing'] as const;

export type P2ScenaryKind = typeof P2_SCENARY_KINDS[number];
export type P2ActionKind = typeof P2_ACTION_KINDS[number];
export type P2StateKind = typeof P2_STATE_KINDS[number];
export type P2BindingKind = typeof P2_BINDING_KINDS[number];
export type P2InputSource = typeof P2_INPUT_SOURCES[number];
export type P2Presentation = typeof P2_PRESENTATIONS[number];
export type P2SourceKind = typeof P2_SOURCE_KINDS[number];

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const UI_SCENARY_HEADER = [
  'uiScenary contract (page skeleton reads `scenaries[].value` as <Scene value>):',
  '  scenaries[]: { value, kind: "base"|"detail"|"command", commandName?, preconditions: stateKey[] }',
  '  preconditions = required route/selection inputs (skill rule 8). Unsatisfied → base, silently.',
  '  URL `?scenary=` is a request; the shared setter is the source of truth.',
  '  destructiveCommandIds never become scenes (confirmation stays a modal).',
].join('\n');

export interface P2SharedContractRefEntry {
  commandName: string;
  routeConst: string;
}

export interface P2SharedOriginOwner {
  kind: string;
  id: string;
  defPath: string;
}

export interface P2SharedOriginFlowOp {
  operationId: string;
  commandName: string;
  steps: string[];
}

export interface P2SharedDerived {
  pageId: string;
  moduleName: string;
  baseClassName: string;
  routePattern: string;
  sourceKind: P2SourceKind;
  ownerIds: string[];
  operationIds: string[];
  origin: {
    source: string;
    workspaceId: string;
    workspaceKind: P2SourceKind;
    actor: string;
    entity: string;
    owners: P2SharedOriginOwner[];
    microUserFlow: {
      source: string;
      workflowSteps: string[];
      operations: P2SharedOriginFlowOp[];
    };
  };
  contractRef: {
    tsPath: string;
    contracts: P2SharedContractRefEntry[];
  };
  layoutRef: {
    defPath: string;
    layoutId: string;
  };
  businessContextRefs: unknown[];
  navigationRefs: unknown[];
}

export interface P2SharedScenary {
  value: string;
  kind: P2ScenaryKind;
  commandName: string;
  preconditions: string[];
}

export interface P2SharedStateContractRef {
  commandName: string;
  direction: 'input' | 'output';
  field?: string;
}

export interface P2SharedState {
  stateKey: string;
  name: string;
  kind: P2StateKind;
  defaultValue: unknown;
  valueSet?: string[];
  actionRef?: string;
  contractRef?: P2SharedStateContractRef;
  outputShape?: string;
  collection?: boolean;
  source?: P2InputSource;
  presentation?: P2Presentation;
}

export interface P2SharedActionPrefillField {
  itemField: string;
  targetStateKey: string;
}

export interface P2SharedActionPrefill {
  command: string;
  sourceStateKey: string;
  sourceOutputShape: string;
  matchField: string;
  fields: P2SharedActionPrefillField[];
}

export interface P2SharedAction {
  actionId: string;
  kind: P2ActionKind;
  commandRef?: string;
  routeKey?: string;
  purpose?: string;
  methodName: string;
  handlerName: string;
  inputStateKeys?: string[];
  routeParamInputStateKeys?: string[];
  selectedEntityInputStateKeys?: string[];
  outputStateKeys?: string[];
  statusStateKey?: string;
  errorStateKey?: string;
  feedback?: { successMessageKey: string; errorMessageKey: string; dismissible: boolean };
  clearInputStateKeys?: string[];
  refreshActionIds?: string[];
  stateKey?: string;
  prefill?: P2SharedActionPrefill;
}

export interface P2SharedBindingInput {
  name: string;
  stateKey: string;
  source: P2InputSource;
  required: boolean;
  presentation: P2Presentation;
}

export interface P2SharedBinding {
  id: string;
  source: string;
  command: string;
  description: string;
  kind: P2BindingKind;
  stateKey: string;
  inputStateKeys: string[];
  inputs: P2SharedBindingInput[];
  selection: string;
}

export interface P2SharedInitialLoad {
  actionId: string;
  stateKey: string;
}

export interface P2SharedJudgment {
  workspaceId: string;
  pageName: string;
  scenaries: P2SharedScenary[];
  states: P2SharedState[];
  dataBindings: P2SharedBinding[];
  initialLoads: P2SharedInitialLoad[];
  actions: P2SharedAction[];
  destructiveCommandIds: string[];
}

export interface P2SharedWorkspaceDraft extends P2SharedJudgment {}

export interface P2SharedDraft {
  schemaVersion: typeof P2_SHARED_SCHEMA_VERSION;
  moduleName: string;
  workspaces: P2SharedWorkspaceDraft[];
}

export interface P2SharedDefinition extends P2SharedDerived {
  pageName: string;
  states: P2SharedState[];
  actions: P2SharedAction[];
  scenaries: P2SharedScenary[];
  destructiveCommandIds: string[];
  initialLoads: P2SharedInitialLoad[];
  dataBindings: P2SharedBinding[];
  automation: {
    statePrefix: string;
    stateKeys: string[];
    actionIds: string[];
  };
}

export function isP2ScenaryKind(value: string): value is P2ScenaryKind {
  return (P2_SCENARY_KINDS as readonly string[]).includes(value);
}

export function isP2ActionKind(value: string): value is P2ActionKind {
  return (P2_ACTION_KINDS as readonly string[]).includes(value);
}

export function isP2StateKind(value: string): value is P2StateKind {
  return (P2_STATE_KINDS as readonly string[]).includes(value);
}

export function isP2BindingKind(value: string): value is P2BindingKind {
  return (P2_BINDING_KINDS as readonly string[]).includes(value);
}

export function isP2InputSource(value: string): value is P2InputSource {
  return (P2_INPUT_SOURCES as readonly string[]).includes(value);
}

export function isP2Presentation(value: string): value is P2Presentation {
  return (P2_PRESENTATIONS as readonly string[]).includes(value);
}

export function p2SharedFile(moduleName: string, workspaceId: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 2,
    folder: `${base.folder}/web/shared`,
    shortName: workspaceId,
    extension: '.defs.ts',
  };
}

export function sourceKindOf(workspaceKind: string): P2SourceKind {
  return workspaceKind === 'hub' ? 'landing' : 'operation';
}

export function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+|(?=[A-Z])/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('') || 'Item';
}

export function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export function callsOf(draft: P2ContractsDraft, workspaceId: string): P2ContractCall[] {
  return draft.workspaces.find(item => item.workspaceId === workspaceId)?.calls.slice() || [];
}

/**
 * Deterministic keys the LLM must not invent: pageId, moduleName, baseClassName,
 * routePattern, sourceKind, ownerIds, operationIds, origin, contractRef, layoutRef,
 * businessContextRefs, navigationRefs. automation is assembled after judgment.
 */
export function deriveP2SharedBase(input: {
  project: number;
  moduleName: string;
  workspace: P2Workspace;
  calls: readonly P2ContractCall[];
  sources: P2L4Sources;
}): P2SharedDerived {
  const pageId = input.workspace.workspaceId;
  const moduleName = input.moduleName;
  const sourceKind = sourceKindOf(input.workspace.kind);
  const operationIds = input.calls.map(call => call.callName).filter(Boolean);
  const ownerIds = [
    `workspace:${pageId}`,
    ...operationIds.map(callName => `contract:${moduleName}.${pageId}.${callName}`),
  ];
  const owners = input.calls.map(call => ({
    kind: 'operation',
    id: call.callName,
    defPath: journeyDefPath(input.project, moduleName, input.workspace, input.sources, call.stepRef),
  }));
  return {
    pageId,
    moduleName,
    baseClassName: `${toPascalCase(moduleName)}${toPascalCase(pageId)}Base`,
    routePattern: `/${moduleName}/${pageId}`,
    sourceKind,
    ownerIds,
    operationIds,
    origin: {
      source: 'l4-journey',
      workspaceId: pageId,
      workspaceKind: sourceKind,
      actor: input.workspace.actorRefs[0] || '',
      entity: input.workspace.entityRef,
      owners,
      microUserFlow: {
        source: 'l4/story.steps',
        workflowSteps: [],
        operations: input.calls.map(call => ({
          operationId: call.callName,
          commandName: call.callName,
          steps: [],
        })),
      },
    },
    contractRef: {
      tsPath: `_${input.project}_/l2/${moduleName}/web/contracts/${pageId}.ts`,
      contracts: input.calls.map(call => ({
        commandName: call.callName,
        routeConst: `${call.callName}Route`,
      })),
    },
    layoutRef: {
      defPath: `_${input.project}_/l2/${moduleName}/web/desktop/page11/${pageId}.defs.ts`,
      layoutId: `${toKebabCase(pageId)}-workspace`,
    },
    businessContextRefs: [],
    navigationRefs: [],
  };
}

/**
 * Mechanical starting cut from the contracts (CF `saveBaseSharedDefs` rules, local copy —
 * the planner graph must not import agentChangeFrontend). The model may change judgment.
 */
export function suggestP2SharedJudgment(
  workspace: P2Workspace,
  calls: readonly P2ContractCall[],
  catalog: ReadonlyMap<string, P2EntityField>,
  moduleName: string,
): P2SharedJudgment {
  const pageId = workspace.workspaceId;
  const inputsByCall = new Map(calls.map(call => [call.callName, describeInputs(call, catalog)]));
  const scenaries = deriveUiScenaries(pageId, calls, inputsByCall);
  const destructiveIds = calls
    .filter(call => call.kind === 'command' && isDestructiveCommandName(call.callName))
    .map(call => call.callName);
  const states = buildStates(pageId, calls, inputsByCall, scenaries, catalog);
  const actions = buildActions(pageId, moduleName, calls, inputsByCall, states);
  const dataBindings = buildBindings(pageId, calls, inputsByCall);
  const initialLoads = calls
    .filter(call => call.kind === 'query' && qualifiesForInitialLoad(inputsByCall.get(call.callName) || []))
    .map(call => ({
      actionId: call.callName,
      stateKey: queryDataStateKey(pageId, call.callName),
    }));
  return {
    workspaceId: pageId,
    pageName: workspace.title,
    scenaries,
    states,
    dataBindings,
    initialLoads,
    actions,
    destructiveCommandIds: destructiveIds,
  };
}

export function assembleP2SharedDefinition(base: P2SharedDerived, judgment: P2SharedJudgment): P2SharedDefinition {
  const states = judgment.states.slice();
  const actions = judgment.actions.slice();
  return {
    pageId: base.pageId,
    pageName: judgment.pageName,
    moduleName: base.moduleName,
    baseClassName: base.baseClassName,
    routePattern: base.routePattern,
    sourceKind: base.sourceKind,
    ownerIds: base.ownerIds,
    operationIds: base.operationIds,
    origin: base.origin,
    contractRef: base.contractRef,
    layoutRef: base.layoutRef,
    states,
    actions,
    scenaries: judgment.scenaries,
    destructiveCommandIds: judgment.destructiveCommandIds,
    initialLoads: judgment.initialLoads,
    dataBindings: judgment.dataBindings,
    businessContextRefs: base.businessContextRefs,
    navigationRefs: base.navigationRefs,
    automation: {
      statePrefix: `ui.${base.pageId}`,
      stateKeys: states.map(state => state.stateKey).filter(Boolean),
      actionIds: actions.map(action => action.actionId).filter(Boolean),
    },
  };
}

export function emitP2SharedDefs(input: {
  project: number;
  moduleName: string;
  workspaceId: string;
  definition: P2SharedDefinition;
}): string {
  const filePath = `_${input.project}_/l2/${input.moduleName}/web/shared/${input.workspaceId}.defs.ts`;
  const body = JSON.stringify(orderedDefinition(input.definition), null, 2);
  return [
    `/// <mls fileReference="${filePath}" enhancement="_blank"/>`,
    '',
    '/**',
    ...UI_SCENARY_HEADER.split('\n').map(line => ` * ${line}`),
    ' */',
    `export const definition = ${body} as const;`,
    '',
  ].join('\n');
}

export function orderedDefinition(definition: P2SharedDefinition): Record<string, unknown> {
  const source = definition as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of P2_SHARED_KEYS) out[key] = source[key];
  return out;
}

export function normalizeP2SharedPayload(value: unknown, moduleName: string): P2SharedDraft {
  const root = record(value);
  return {
    schemaVersion: P2_SHARED_SCHEMA_VERSION,
    moduleName: memberId(text(root.moduleName) || moduleName),
    workspaces: list(root.workspaces).map(item => normalizeJudgment(item)).filter(workspace => workspace.workspaceId),
  };
}

export function buildP2SharedTool(schema: Record<string, unknown>): mls.msg.LLMTool {
  return createP2ArtifactTool(
    'submitP2Shared',
    'Submit one shared definition judgment per workspace: scenaries, states, dataBindings, initialLoads, actions, destructiveCommandIds, pageName.',
    schema,
  );
}

export function collectP2SharedBases(
  workspaces: P2WorkspacesDraft,
  contracts: P2ContractsDraft,
  sources: P2L4Sources,
  project: number,
): P2SharedDerived[] {
  return workspaces.workspaces.map(workspace => deriveP2SharedBase({
    project,
    moduleName: workspaces.moduleName,
    workspace,
    calls: callsOf(contracts, workspace.workspaceId),
    sources,
  }));
}

interface CallInput {
  name: string;
  path: string;
  source: P2InputSource;
  presentation: P2Presentation;
  required: boolean;
  tsType: string;
  enumValues: string[];
}

function describeInputs(call: P2ContractCall, catalog: ReadonlyMap<string, P2EntityField>): CallInput[] {
  return call.inputFields.map(path => {
    const field = catalog.get(path);
    const name = field?.name || lastSegment(path);
    const identity = isIdentityPath(call.entityRef, path);
    const selected = identity && (call.shape === 'get' || call.shape === 'update' || call.shape === 'transition');
    return {
      name,
      path,
      source: selected ? 'selectedEntity' : 'userInput',
      presentation: selected ? 'selection' : 'form',
      required: field?.required === true || identity,
      tsType: field?.tsType || 'string',
      enumValues: field?.enumValues || [],
    };
  });
}

function deriveUiScenaries(
  pageId: string,
  calls: readonly P2ContractCall[],
  inputsByCall: Map<string, CallInput[]>,
): P2SharedScenary[] {
  const queries = calls.filter(call => call.kind === 'query');
  const mutations = calls.filter(call => call.kind === 'command');
  const baseQuery = queries.find(call => call.shape === 'list' || call.shape === 'ddm') || queries[0];
  const scenaries: P2SharedScenary[] = [{
    value: 'base',
    kind: 'base',
    commandName: baseQuery?.callName || '',
    preconditions: [],
  }];

  const inspect = queries.find(call => call.shape === 'get');
  const hasList = queries.some(call => call.shape === 'list');
  if (hasList && inspect) {
    scenaries.push({
      value: 'detail',
      kind: 'detail',
      commandName: inspect.callName,
      preconditions: preconditionKeys(pageId, inspect.callName, inputsByCall.get(inspect.callName) || []),
    });
  }

  for (const call of mutations) {
    if (isDestructiveCommandName(call.callName)) continue;
    scenaries.push({
      value: commandScenaryValue(call.callName),
      kind: 'command',
      commandName: call.callName,
      preconditions: preconditionKeys(pageId, call.callName, inputsByCall.get(call.callName) || []),
    });
  }
  return scenaries;
}

export function isDestructiveCommandName(commandName: string): boolean {
  const stripped = commandName.replace(/^cmd/i, '');
  const titled = stripped.charAt(0).toUpperCase() + stripped.slice(1);
  return /^(Delete|Cancel)(?=[A-Z]|$)/.test(titled);
}

export function commandScenaryValue(commandName: string): string {
  if (!/^cmd/i.test(commandName)) return commandName;
  const rest = commandName.replace(/^cmd/i, '');
  if (!rest) return commandName;
  return rest.charAt(0).toLowerCase() + rest.slice(1);
}

function preconditionKeys(pageId: string, callName: string, inputs: readonly CallInput[]): string[] {
  return inputs
    .filter(field => field.required && (field.presentation === 'selection' || field.presentation === 'route'))
    .map(field => inputStateKey(pageId, callName, field.name));
}

function qualifiesForInitialLoad(inputs: readonly CallInput[]): boolean {
  return !inputs.some(field => field.required && (field.source === 'userInput' || field.source === 'selectedEntity'));
}

function buildStates(
  pageId: string,
  calls: readonly P2ContractCall[],
  inputsByCall: Map<string, CallInput[]>,
  scenaries: readonly P2SharedScenary[],
  catalog: ReadonlyMap<string, P2EntityField>,
): P2SharedState[] {
  const states: P2SharedState[] = [
    {
      stateKey: `ui.${pageId}.status`,
      name: 'status',
      kind: 'pageStatus',
      defaultValue: '',
    },
    {
      stateKey: `ui.${pageId}.scenary`,
      name: 'uiScenary',
      kind: 'uiScenary',
      valueSet: (scenaries.length ? scenaries : [{ value: 'base' }]).map(scene => scene.value),
      defaultValue: 'base',
    },
  ];

  for (const call of calls) {
    const inputs = inputsByCall.get(call.callName) || [];
    states.push({
      stateKey: actionStatusStateKey(pageId, call.callName),
      name: `${call.callName}State`,
      kind: 'actionStatus',
      actionRef: call.callName,
      valueSet: ['idle', 'loading', 'success', 'error'],
      defaultValue: 'idle',
    });
    for (const field of inputs) {
      const state: P2SharedState = {
        stateKey: inputStateKey(pageId, call.callName, field.name),
        name: inputStateName(call.callName, field.name),
        kind: 'input',
        source: field.source,
        presentation: field.presentation,
        contractRef: { commandName: call.callName, direction: 'input', field: field.name },
        defaultValue: defaultValueForType(field.tsType),
      };
      if (field.enumValues.length) state.valueSet = field.enumValues;
      states.push(state);
    }
    if (call.kind === 'query') {
      const paginated = call.shape === 'list';
      const itemsKey = collectionFieldName(call.entityRef);
      states.push({
        stateKey: queryDataStateKey(pageId, call.callName),
        name: `${call.callName}Data`,
        kind: 'queryResult',
        contractRef: { commandName: call.callName, direction: 'output' },
        outputShape: paginated ? 'paginated' : 'object',
        collection: paginated,
        defaultValue: paginated ? { [itemsKey]: [], total: 0 } : null,
      });
    } else {
      states.push({
        stateKey: commandOutputStateKey(pageId, call.callName),
        name: `${call.callName}Output`,
        kind: 'commandOutput',
        contractRef: { commandName: call.callName, direction: 'output' },
        defaultValue: null,
      });
      states.push({
        stateKey: actionErrorStateKey(pageId, call.callName),
        name: `${call.callName}Error`,
        kind: 'actionError',
        actionRef: call.callName,
        defaultValue: '',
      });
    }
  }
  void catalog;
  return states;
}

function buildActions(
  pageId: string,
  moduleName: string,
  calls: readonly P2ContractCall[],
  inputsByCall: Map<string, CallInput[]>,
  states: readonly P2SharedState[],
): P2SharedAction[] {
  const queryIds = calls.filter(call => call.kind === 'query').map(call => call.callName);
  const actions: P2SharedAction[] = [];
  for (const call of calls) {
    const inputs = inputsByCall.get(call.callName) || [];
    const inputStateKeys = inputs.map(field => inputStateKey(pageId, call.callName, field.name));
    const isQuery = call.kind === 'query';
    const action: P2SharedAction = {
      actionId: call.callName,
      kind: isQuery ? 'query' : 'command',
      commandRef: call.callName,
      routeKey: `${moduleName}.${pageId}.${call.callName}`,
      purpose: call.callName,
      methodName: isQuery ? `load${toPascalCase(call.callName)}` : call.callName,
      handlerName: `handle${toPascalCase(call.callName)}Click`,
      inputStateKeys,
      routeParamInputStateKeys: inputs.filter(field => field.presentation === 'route').map(field => inputStateKey(pageId, call.callName, field.name)),
      selectedEntityInputStateKeys: inputs.filter(field => field.presentation === 'selection').map(field => inputStateKey(pageId, call.callName, field.name)),
      outputStateKeys: [isQuery ? queryDataStateKey(pageId, call.callName) : commandOutputStateKey(pageId, call.callName)],
      statusStateKey: actionStatusStateKey(pageId, call.callName),
    };
    if (!isQuery) {
      action.errorStateKey = actionErrorStateKey(pageId, call.callName);
      action.feedback = {
        successMessageKey: `action.${call.callName}.success`,
        errorMessageKey: `action.${call.callName}.error`,
        dismissible: true,
      };
      action.clearInputStateKeys = inputs
        .filter(field => field.presentation === 'form' || field.presentation === 'selection')
        .map(field => inputStateKey(pageId, call.callName, field.name));
      if (queryIds.length) action.refreshActionIds = queryIds.slice();
    }
    actions.push(action);
  }
  for (const state of states.filter(item => item.kind === 'input')) {
    actions.push({
      actionId: `set.${state.name}`,
      kind: 'stateSetter',
      stateKey: state.stateKey,
      methodName: `set${toPascalCase(state.name)}`,
      handlerName: `handle${toPascalCase(state.name)}Change`,
    });
  }
  return actions;
}

function buildBindings(
  pageId: string,
  calls: readonly P2ContractCall[],
  inputsByCall: Map<string, CallInput[]>,
): P2SharedBinding[] {
  return calls.map(call => {
    const inputs = inputsByCall.get(call.callName) || [];
    const isQuery = call.kind === 'query';
    return {
      id: `binding.${pageId}.${call.callName}`,
      source: `bff.${call.callName}`,
      command: call.callName,
      description: call.callName,
      kind: isQuery ? 'query' : 'command',
      stateKey: isQuery ? queryDataStateKey(pageId, call.callName) : commandOutputStateKey(pageId, call.callName),
      inputStateKeys: inputs.map(field => inputStateKey(pageId, call.callName, field.name)),
      inputs: inputs.map(field => ({
        name: field.name,
        stateKey: inputStateKey(pageId, call.callName, field.name),
        source: field.source,
        required: field.required,
        presentation: field.presentation,
      })),
      selection: call.shape === 'list' ? 'single' : 'none',
    };
  });
}

function journeyDefPath(
  project: number,
  moduleName: string,
  workspace: P2Workspace,
  sources: P2L4Sources,
  stepRef: string,
): string {
  const journeyId = sources.journeys.find(journey =>
    workspace.journeyRefs.includes(journey.journeyId) && journey.steps.some(step => step.stepId === stepRef),
  )?.journeyId || workspace.journeyRefs[0] || '';
  return `_${project}_/l4/${moduleName}/journeys/${journeyId}.defs.ts`;
}

function inputStateKey(pageId: string, callName: string, fieldName: string): string {
  return `ui.${pageId}.input.${callName}.${fieldName}`;
}

function inputStateName(callName: string, fieldName: string): string {
  return `${callName}${toPascalCase(fieldName)}`;
}

function actionStatusStateKey(pageId: string, callName: string): string {
  return `ui.${pageId}.action.${callName}.status`;
}

function queryDataStateKey(pageId: string, callName: string): string {
  return `ui.${pageId}.data.${callName}`;
}

function commandOutputStateKey(pageId: string, callName: string): string {
  return `ui.${pageId}.output.${callName}`;
}

function actionErrorStateKey(pageId: string, callName: string): string {
  return `ui.${pageId}.action.${callName}.error`;
}

function defaultValueForType(tsType: string): unknown {
  if (tsType === 'number') return 0;
  if (tsType === 'boolean') return false;
  return '';
}

function normalizeJudgment(value: unknown): P2SharedWorkspaceDraft {
  const source = record(value);
  return {
    workspaceId: memberId(text(source.workspaceId)),
    pageName: text(source.pageName),
    scenaries: list(source.scenaries).map(item => normalizeScenary(item)),
    states: list(source.states).map(item => normalizeState(item)),
    dataBindings: list(source.dataBindings).map(item => normalizeBinding(item)),
    initialLoads: list(source.initialLoads).map(item => normalizeLoad(item)),
    actions: list(source.actions).map(item => normalizeAction(item)),
    destructiveCommandIds: uniqueIds(source.destructiveCommandIds),
  };
}

function normalizeScenary(value: unknown): P2SharedScenary {
  const source = record(value);
  const kind = text(source.kind);
  return {
    value: text(source.value),
    kind: isP2ScenaryKind(kind) ? kind : '' as P2ScenaryKind,
    commandName: text(source.commandName),
    preconditions: uniqueStrings(source.preconditions),
  };
}

function normalizeState(value: unknown): P2SharedState {
  const source = record(value);
  const kind = text(source.kind);
  const src = text(source.source);
  const presentation = text(source.presentation);
  const state: P2SharedState = {
    stateKey: text(source.stateKey),
    name: text(source.name),
    kind: isP2StateKind(kind) ? kind : '' as P2StateKind,
    defaultValue: 'defaultValue' in source ? source.defaultValue : '',
  };
  const valueSet = uniqueStrings(source.valueSet);
  if (valueSet.length) state.valueSet = valueSet;
  if (text(source.actionRef)) state.actionRef = text(source.actionRef);
  const contract = record(source.contractRef);
  if (text(contract.commandName)) {
    state.contractRef = {
      commandName: text(contract.commandName),
      direction: text(contract.direction) === 'input' ? 'input' : 'output',
      ...(text(contract.field) ? { field: text(contract.field) } : {}),
    };
  }
  if (text(source.outputShape)) state.outputShape = text(source.outputShape);
  if (typeof source.collection === 'boolean') state.collection = source.collection;
  if (isP2InputSource(src)) state.source = src;
  if (isP2Presentation(presentation)) state.presentation = presentation;
  return state;
}

function normalizeAction(value: unknown): P2SharedAction {
  const source = record(value);
  const kind = text(source.kind);
  const action: P2SharedAction = {
    actionId: text(source.actionId),
    kind: isP2ActionKind(kind) ? kind : '' as P2ActionKind,
    methodName: text(source.methodName),
    handlerName: text(source.handlerName),
  };
  if (text(source.commandRef)) action.commandRef = text(source.commandRef);
  if (text(source.routeKey)) action.routeKey = text(source.routeKey);
  if (text(source.purpose)) action.purpose = text(source.purpose);
  if (Array.isArray(source.inputStateKeys)) action.inputStateKeys = uniqueStrings(source.inputStateKeys);
  if (Array.isArray(source.routeParamInputStateKeys)) action.routeParamInputStateKeys = uniqueStrings(source.routeParamInputStateKeys);
  if (Array.isArray(source.selectedEntityInputStateKeys)) action.selectedEntityInputStateKeys = uniqueStrings(source.selectedEntityInputStateKeys);
  if (Array.isArray(source.outputStateKeys)) action.outputStateKeys = uniqueStrings(source.outputStateKeys);
  if (text(source.statusStateKey)) action.statusStateKey = text(source.statusStateKey);
  if (text(source.errorStateKey)) action.errorStateKey = text(source.errorStateKey);
  const feedback = record(source.feedback);
  if (text(feedback.successMessageKey) || text(feedback.errorMessageKey)) {
    action.feedback = {
      successMessageKey: text(feedback.successMessageKey),
      errorMessageKey: text(feedback.errorMessageKey),
      dismissible: feedback.dismissible !== false,
    };
  }
  if (Array.isArray(source.clearInputStateKeys)) action.clearInputStateKeys = uniqueStrings(source.clearInputStateKeys);
  if (Array.isArray(source.refreshActionIds)) action.refreshActionIds = uniqueStrings(source.refreshActionIds);
  if (text(source.stateKey)) action.stateKey = text(source.stateKey);
  const prefill = record(source.prefill);
  if (text(prefill.command)) {
    action.prefill = {
      command: text(prefill.command),
      sourceStateKey: text(prefill.sourceStateKey),
      sourceOutputShape: text(prefill.sourceOutputShape),
      matchField: text(prefill.matchField),
      fields: list(prefill.fields).map(item => {
        const field = record(item);
        return { itemField: text(field.itemField), targetStateKey: text(field.targetStateKey) };
      }).filter(field => field.itemField && field.targetStateKey),
    };
  }
  return action;
}

function normalizeBinding(value: unknown): P2SharedBinding {
  const source = record(value);
  const kind = text(source.kind);
  return {
    id: text(source.id),
    source: text(source.source),
    command: text(source.command),
    description: text(source.description),
    kind: isP2BindingKind(kind) ? kind : '' as P2BindingKind,
    stateKey: text(source.stateKey),
    inputStateKeys: uniqueStrings(source.inputStateKeys),
    inputs: list(source.inputs).map(item => {
      const field = record(item);
      const src = text(field.source);
      const presentation = text(field.presentation);
      return {
        name: text(field.name),
        stateKey: text(field.stateKey),
        source: isP2InputSource(src) ? src : 'userInput',
        required: field.required === true,
        presentation: isP2Presentation(presentation) ? presentation : 'form',
      };
    }),
    selection: text(source.selection) || 'none',
  };
}

function normalizeLoad(value: unknown): P2SharedInitialLoad {
  const source = record(value);
  return {
    actionId: text(source.actionId),
    stateKey: text(source.stateKey),
  };
}

function createP2ArtifactTool(
  toolName: string,
  description: string,
  artifactSchema: Record<string, unknown>,
): mls.msg.LLMTool {
  const result: Record<string, unknown> = { ...artifactSchema };
  const defs = result.$defs;
  delete result.$defs;
  delete result.$id;
  delete result.$schema;
  const parameters: Record<string, unknown> = {
    type: 'object',
    additionalProperties: false,
    required: ['type', 'result'],
    properties: {
      type: { type: 'string', const: 'flexible' },
      result,
    },
  };
  if (isRecord(defs)) parameters.$defs = defs;
  return { type: 'function', function: { name: toolName, description, parameters } } as mls.msg.LLMTool;
}

function uniqueIds(value: unknown): string[] {
  return uniqueStrings(value).filter(item => MEMBER_ID.test(item) || item.length > 0);
}

function uniqueStrings(value: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list(value)) {
    const textValue = typeof item === 'string' ? item.trim() : '';
    if (!textValue || seen.has(textValue)) continue;
    seen.add(textValue);
    out.push(textValue);
  }
  return out;
}

function lastSegment(path: string): string {
  const parts = path.split('.');
  return parts[parts.length - 1] || path;
}

function memberId(value: string): string {
  const trimmed = value.trim();
  return MEMBER_ID.test(trimmed) ? trimmed : trimmed;
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
