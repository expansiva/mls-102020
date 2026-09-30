/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared40/definition.ts" enhancement="_blank"/>

import {
  D2_DEFINITION_VERSION,
  parseD2Definition,
  type D2DefinitionAction,
  type D2DefinitionReference,
  type D2DefinitionState,
  type D2ResolvableSymbol,
  type D2SharedDefinitionDocument,
} from '/_102020_/l2/agentDefsL2/helpers/d2DefinitionFormat.js';
import type { D2ContractCall, D2ContractField, D2PageContract } from '/_102020_/l2/agentDefsL2/steps/contracts30/contracts.js';
import type { D2OperationBinding, D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { buildD2SharedDefinition, D2_SHARED_JUDGMENT_VERSION, flatten, inputLeaves, isObviouslyDestructive, type D2SharedJudgment } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';

export const D2_SHARED_DEFINITION_KEYS = ['schemaVersion', 'artifactType', 'pageId', 'intent', 'references', 'contractRef', 'states', 'actions', 'contents', 'scenarios', 'authorityRefs'] as const;
export const D2_SHARED_DEFINITION_SKILL = '_102020_/l2/agentDefsL2/skills/genD2SharedDefinition.ts' as const;

export interface D2SharedDefinitionBuild {
  document: D2SharedDefinitionDocument;
  symbols: D2ResolvableSymbol[];
}

export function buildD2SharedDefinitionDocument(
  moduleName: string,
  page: D2SelectedPage,
  contract: D2PageContract,
  judgment: D2SharedJudgment,
): D2SharedDefinitionBuild {
  validateSharedJudgment(page, contract, judgment);
  const contractFile = `l2/${moduleName}/web/contracts/${page.pageId}.defs.ts`;
  const sharedFile = `l2/${moduleName}/web/shared/${page.pageId}.defs.ts`;
  const bindings = page.operationBindings ?? [];
  const byRoute = new Map<string, D2OperationBinding[]>(contract.calls.map(call => [call.route, bindings.filter(binding => binding.route === call.route)]));
  const stateByPath = new Map<string, D2DefinitionState>();
  const symbols: D2ResolvableSymbol[] = [{ fileRef: contractFile }];
  const callsById = new Map(contract.calls.map(call => [call.callName, call]));

  for (const call of contract.calls) {
    symbols.push({ fileRef: contractFile, fragment: `${call.callPascal}Input` }, { fileRef: contractFile, fragment: `${call.callPascal}Output` });
    symbols.push({ fileRef: contractFile, fragment: call.routeName });
    for (const field of inputLeaves(call.input)) symbols.push({ fileRef: contractFile, fragment: `${call.callPascal}Input.${dtoPathOf(call.entityId, field.path)}` });
    for (const field of inputLeaves(call.output)) if (field.path.startsWith(`${call.entityId}.`)) symbols.push({ fileRef: contractFile, fragment: `${call.callPascal}Output.${dtoPathOf(call.entityId, field.path)}` });
  }

  const states: D2DefinitionState[] = [];
  const actions: D2DefinitionAction[] = [];
  const authorityRefs: D2DefinitionReference[] = [];
  const authorityKeys = new Set<string>();
  const reference = (purpose: string, fileRef: string, fragment?: string): D2DefinitionReference => ({ purpose, fileRef, ...(fragment ? { fragment } : {}) });

  for (const call of contract.calls) {
    const opBindings = byRoute.get(call.route) ?? [];
    if (!opBindings.length && call.operation !== 'get' && call.operation !== 'list') throw new Error(`D2_SHARED_OPERATION_BINDING_MISSING: ${call.route}`);
    const bindingSignatures = opBindings.map(binding => JSON.stringify(binding.inputFields.map(field => [field.path, field.origin, field.required]).sort()));
    if (new Set(bindingSignatures).size > 1) throw new Error(`D2_SHARED_OPERATION_BINDING_AMBIGUOUS: ${call.route}`);
    const userInputFields = inputLeaves(call.input);
    const inputs: D2DefinitionAction['inputs'] = [];
    for (const field of sharedInputFields(call, userInputFields, byRoute.get(call.route) ?? [])) {
      const dtoPath = dtoPathOf(call.entityId, field.path);
      const stateId = stateIdOf(call.callName, dtoPath);
      const matchingBindings = opBindings.flatMap(binding => binding.inputFields.filter(item => item.path === field.path));
      const source = field.writePrecondition || isSelectedIdentity(call, field) || (field.referenceTo.length > 0 && (call.operation !== 'list' || field.required || hasSelectionSource(field, contract)))
        ? 'selectedEntity'
        : matchingBindings.some(item => item.origin === 'server') ? 'session'
          : field.path.endsWith('$page') ? 'routeParam' : 'userInput';
      if (!matchingBindings.length && call.operation !== 'list' && call.operation !== 'get' && !field.writePrecondition) throw new Error(`D2_SHARED_INPUT_ORIGIN_MISSING: ${call.route} ${field.path}`);
      if (source === 'selectedEntity' && !field.writePrecondition && !isSelectedIdentity(call, field)) {
        const hasSource = contract.calls.some(candidate => (candidate.operation === 'list' || candidate.operation === 'get')
          && field.referenceTo.includes(candidate.entityId)
          && flatten(candidate.output).some(output => output.derived && output.name === 'id'));
        if (!hasSource) throw new Error(`D2_SHARED_SELECTION_SOURCE_MISSING: ${call.callName}/${field.path}`);
      }
      const origin = reference(source, contractFile, `${call.callPascal}Input.${dtoPath}`);
      const querySource = source === 'selectedEntity' && !field.writePrecondition
        ? selectionSource(call, field, contract)
        : undefined;
      if (source === 'selectedEntity' && !field.writePrecondition && !querySource) throw new Error(`D2_SHARED_SELECTION_SOURCE_MISSING: ${call.callName}/${field.path}`);
      const identityInput = field.writePrecondition ? inputLeaves(call.input).find(candidate => isSelectedIdentity(call, candidate)) : undefined;
      const snapshotSource = field.writePrecondition ? contract.calls.find(candidate => (candidate.operation === 'list' || candidate.operation === 'get')
        && candidate.entityId === call.entityId
        && identityInput && flatten(candidate.output).some(output => output.path === identityInput.path)
        && flatten(candidate.output).some(output => output.path === field.path)) : undefined;
      if (field.writePrecondition && (!identityInput || !snapshotSource)) throw new Error(`D2_SHARED_WRITE_PRECONDITION_SOURCE_MISSING: ${call.callName}`);
      const sourceIdentity = querySource && flatten(querySource.output).find(output => output.derived && output.name === 'id');
      const snapshotIdentity = snapshotSource && identityInput && flatten(snapshotSource.output).find(output => output.path === identityInput.path);
      const state: D2DefinitionState = {
        id: stateId,
        purpose: field.title || field.description || `${source} ${field.name}`,
        origin,
        typeRef: reference('contract input type', contractFile, `${call.callPascal}Input.${dtoPath}`),
        source,
        presentation: field.writePrecondition || source === 'session' ? 'hidden' : source === 'routeParam' ? 'route' : source === 'selectedEntity' ? 'selection' : 'form',
        editable: source === 'userInput' && !field.writePrecondition,
        ...(field.scalar === 'object' && field.collection ? { uiType: 'object' as const } : field.collection ? { uiType: 'string[]' as const } : { uiType: field.scalar }),
        required: field.writePrecondition || ((matchingBindings[0]?.required ?? field.required) && !hasOptionalObjectAncestor(call.input, field.path)),
        ...(field.enumValues.length ? { values: [...field.enumValues] } : {}),
        ...(querySource && sourceIdentity ? { selection: {
          sourceActionRef: querySource.callName,
          resultStateRef: stateIdOf(querySource.callName, 'result'),
          identityRef: reference('selected record identity', contractFile, `${querySource.callPascal}Output.${dtoPathOf(querySource.entityId, sourceIdentity.path)}`),
        } } : {}),
        ...(snapshotSource && snapshotIdentity && identityInput ? { snapshot: {
          sourceActionRef: snapshotSource.callName,
          resultStateRef: stateIdOf(snapshotSource.callName, 'result'),
          selectedIdentityStateRef: stateIdOf(call.callName, dtoPathOf(call.entityId, identityInput.path)),
          identityRef: reference('selected record identity', contractFile, `${snapshotSource.callPascal}Output.${dtoPathOf(snapshotSource.entityId, snapshotIdentity.path)}`),
          valueRef: reference('write precondition snapshot value', contractFile, `${snapshotSource.callPascal}Output.${dtoPathOf(snapshotSource.entityId, field.path)}`),
          capture: 'onSelection',
          missing: 'blockCommandPreserveEdit',
        } } : {}),
      };
      stateByPath.set(`${call.callName}\0${field.path}`, state);
      states.push(state);
      inputs.push({ parameterRef: reference('contract input parameter', contractFile, `${call.callPascal}Input.${dtoPath}`), stateRef: stateId });
    }

    const resultStateRef = stateIdOf(call.callName, 'result');
    const statusStateRef = stateIdOf(call.callName, 'status');
    const errorStateRef = stateIdOf(call.callName, 'error');
    states.push(
      { id: resultStateRef, purpose: `${call.operation} result`, typeRef: reference('contract output type', contractFile, `${call.callPascal}Output`), ...(call.outputShape === 'array' ? { uiType: 'object' as const } : {}) },
      { id: statusStateRef, purpose: 'request feedback status', uiType: 'string', initialValue: 'idle', values: ['idle', 'loading', 'success', 'error'] },
      { id: errorStateRef, purpose: 'request feedback error', uiType: 'object' },
    );

    const behavior = judgment.actionBehaviors.find(item => item.actionId === call.callName);
    if (!behavior) throw new Error(`D2_SHARED_ACTION_UNKNOWN: ${call.callName}`);
    const actionAuthorities: D2DefinitionReference[] = [];
    for (const binding of opBindings) {
      actionAuthorities.push(reference(`actor ${binding.actorRef}`, `l4/${moduleName}/access.defs.ts`, `actors.${binding.actorRef}`));
      for (const grant of binding.grantRefs) actionAuthorities.push(reference(`grant ${grant}`, `l4/${moduleName}/access.defs.ts`, `grants.${grant}`));
      for (const authority of binding.authorities) actionAuthorities.push(reference(`authority ${authority}`, `l4/${moduleName}/access.defs.ts`, `authorities.${authority}`));
      for (const rule of binding.ruleRefs) actionAuthorities.push(reference(`rule ${rule.ruleId}`, rule.file, rule.symbol));
      if (binding.transition) for (const actor of binding.transition.by) actionAuthorities.push(reference(`transition authority ${actor}`, `l4/${moduleName}/access.defs.ts`, `authorities.${actor}`));
    }
    for (const authority of actionAuthorities) {
      const key = referenceKey(authority);
      if (!authorityKeys.has(key)) { authorityKeys.add(key); authorityRefs.push(authority); }
      if (!symbols.some(symbol => symbol.fileRef === authority.fileRef && symbol.fragment === authority.fragment)) symbols.push({ fileRef: authority.fileRef, fragment: authority.fragment });
    }
    const transitions = opBindings.flatMap(binding => binding.transition ? [{ actorRef: binding.actorRef, id: binding.transition.transitionId, from: binding.transition.from, to: binding.transition.to, by: binding.transition.by, payload: binding.transition.payload }] : []);
    actions.push({
      id: call.callName,
      callRef: reference(`${call.operation} operation`, contractFile, call.routeName),
      inputs,
      resultStateRef,
      statusStateRef,
      errorStateRef,
      ...(behavior.refreshActionIds.length ? { refreshActionRefs: [...behavior.refreshActionIds] } : {}),
      ...(actionAuthorities.length ? { authorityRefs: actionAuthorities } : {}),
      ...(judgment.initialLoadActionIds.includes(call.callName) ? { initialLoad: true } : {}),
      ...(transitions.length ? { transitions } : {}),
      ...(behavior.destructive && behavior.confirmation ? { confirmation: behavior.confirmation } : {}),
    });
  }

  const contentMap = new Map<string, { intent: string; refs: string[] }>();
  const organisms = page.organisms.map((raw, index) => {
    const item = record(raw);
    const kind = text(item.kind);
    if (!kind) throw new Error(`D2_SHARED_COVERAGE_KIND_MISSING: ${page.pageId}/${index}`);
    const rawId = text(item.contentRef) || `content.${fold(kind)}`;
    const contentId = safeId(rawId, 'content');
    const intent = text(item.text) || text(item.intent) || text(item.description);
    if (!intent) throw new Error(`D2_SHARED_COVERAGE_CONTENT_MISSING: ${rawId}`);
    const existing = contentMap.get(contentId);
    if (existing && existing.intent !== intent) throw new Error(`D2_SHARED_CONTENT_INTENT_AMBIGUOUS: ${contentId}`);
    contentMap.set(contentId, { intent, refs: existing?.refs ?? [] });
    const content = contentMap.get(contentId)!;
    for (const scenario of judgment.scenaries) if (!content.refs.includes(scenario.value)) content.refs.push(scenario.value);
    return { contentId, kind, intent };
  });

  const contents = [...contentMap].map(([id, content]) => ({
    id,
    intent: content.intent,
    visibleWhen: content.refs.map(value => reference(`visible in scenario ${value}`, sharedFile, `scenarios.${safeId(value, 'scenario')}`)),
    inactiveBehavior: 'hiddenInertOutOfFocus' as const,
  }));
  const scenarios = judgment.scenaries.map(scene => {
    const call = callsById.get(scene.actionId);
    const preconditions = scene.preconditions.map(key => {
      const field = call && userInputByStateKey(page.pageId, call, key);
      if (!field) throw new Error(`D2_SHARED_PRECONDITION_UNKNOWN: ${key}`);
      return reference('scenario precondition', contractFile, `${call.callPascal}Input.${dtoPathOf(call.entityId, field.path)}`);
    });
    return {
      id: safeId(scene.value, 'scenario'),
      ...(call ? { actionRef: call.callName } : {}),
      contentRefs: [...new Set(organisms.map(item => item.contentId))],
      preconditions,
    };
  });

  const explicitAuthorities = page.authorityRefs.map(ref => reference(`page authority ${ref}`, `l4/${moduleName}/access.defs.ts`, `authorities.${ref}`));
  for (const authority of explicitAuthorities) {
    const key = referenceKey(authority);
    if (!authorityKeys.has(key)) { authorityKeys.add(key); authorityRefs.push(authority); }
    if (!symbols.some(symbol => symbol.fileRef === authority.fileRef && symbol.fragment === authority.fragment)) symbols.push({ fileRef: authority.fileRef, fragment: authority.fragment });
  }
  for (const scene of judgment.scenaries) symbols.push({ fileRef: sharedFile, fragment: `scenarios.${safeId(scene.value, 'scenario')}` });

  const intent = organisms.map(item => item.intent).filter((value, index, all) => all.indexOf(value) === index).join(' ')
    || `${page.label} shared interaction behavior.`;
  const document: D2SharedDefinitionDocument = {
    schemaVersion: D2_DEFINITION_VERSION,
    artifactType: 'shared',
    pageId: page.pageId,
    intent,
    references: [],
    contractRef: reference('page operation contract', contractFile),
    states,
    actions,
    contents,
    scenarios,
    authorityRefs,
  };
  const parsed = parseD2Definition(document, symbols);
  return { document: parsed.document as D2SharedDefinitionDocument, symbols };
}

export function parseD2SharedDefinitionDocument(value: unknown, symbols: readonly D2ResolvableSymbol[]): D2SharedDefinitionDocument {
  const parsed = parseD2Definition(value, symbols);
  if (parsed.document.artifactType !== 'shared') throw new Error('D2_SHARED_DEFINITION_ARTIFACT_TYPE');
  if (Object.keys(parsed.document).join('\0') !== D2_SHARED_DEFINITION_KEYS.join('\0')) throw new Error('D2_SHARED_DEFINITION_KEYS');
  return parsed.document;
}

/** Derive validation-only coverage from the current contract and public semantic references. */
export function deriveD2SharedValidationModel(moduleName: string, page: D2SelectedPage, contract: D2PageContract, document: D2SharedDefinitionDocument) {
  const judgment: D2SharedJudgment = {
    schemaVersion: D2_SHARED_JUDGMENT_VERSION, pageId: page.pageId,
    scenaries: document.scenarios.map(scene => {
      const call = contract.calls.find(item => item.callName === scene.actionRef);
      const isQuery = call?.operation === 'list' || call?.operation === 'get';
      if (scene.id === 'base' && call && !isQuery) throw new Error(`D2_SHARED_BASE_SCENARY_COMMAND_INCOMPATIBLE: ${scene.actionRef}`);
      return {
        value: scene.id,
        kind: scene.id === 'base' ? 'base' : isQuery ? 'detail' : 'command',
        actionId: scene.actionRef || '',
        preconditions: scene.preconditions.map(ref => {
          const inputCall = contract.calls.find(item => `${item.callPascal}Input` === ref.fragment?.split('.')[0]);
          if (!inputCall || !ref.fragment?.includes('.')) throw new Error(`D2_SHARED_PRECONDITION_UNKNOWN: ${ref.fragment}`);
          return `ui.${page.pageId}.${inputCall.callName}.input.${ref.fragment.slice(ref.fragment.indexOf('.') + 1)}`;
        }),
      };
    }),
    initialLoadActionIds: document.actions.filter(action => action.initialLoad).map(action => action.id),
    actionBehaviors: document.actions.map(action => ({ actionId: action.id, refreshActionIds: action.refreshActionRefs || [], destructive: !!action.confirmation, ...(action.confirmation ? { confirmation: action.confirmation } : {}) })),
  };
  validateD2SharedDefinitionAgainstContract(document, page, contract, judgment);
  const model = buildD2SharedDefinition(moduleName, page, contract, judgment);
  for (const coverage of model.coverage) {
    const content = document.contents.find(item => item.id === safeId(coverage.contentRef, 'content'));
    if (!content) throw new Error(`D2_SHARED_CONTENT_REF_MISSING: ${coverage.organismId}`);
    coverage.contentRef = content.id;
    coverage.content = content.intent;
    if (coverage.capabilityRefs.some(ref => !document.actions.some(action => action.id === ref))) throw new Error(`D2_SHARED_COVERAGE_CAPABILITY_UNKNOWN: ${coverage.organismId}`);
  }
  return model;
}

export function validateD2SharedDefinitionAgainstContract(
  document: D2SharedDefinitionDocument,
  page: D2SelectedPage,
  contract: D2PageContract,
  judgment: D2SharedJudgment,
): void {
  if (document.pageId !== page.pageId || judgment.pageId !== page.pageId) throw new Error('D2_SHARED_PAGE_CHANGED');
  const calls = new Map(contract.calls.map(call => [call.callName, call]));
  const actions = new Map(document.actions.map(action => [action.id, action]));
  const operationBindings = page.operationBindings ?? [];
  if (document.scenarios.length !== judgment.scenaries.length) throw new Error('D2_SHARED_SCENARY_COVERAGE');
  const scenarios = new Map(document.scenarios.map(item => [item.id, item]));
  for (const action of document.actions) {
    const call = calls.get(action.id);
    if (!call || action.callRef.fragment !== call.routeName) throw new Error(`D2_SHARED_ACTION_UNKNOWN: ${action.id}`);
    const expected = sharedInputFields(call, inputLeaves(call.input), operationBindings.filter(binding => binding.route === call.route))
      .map(field => `${call.callPascal}Input.${dtoPathOf(call.entityId, field.path)}`).sort();
    const actual = action.inputs.map(input => input.parameterRef.fragment || '').sort();
    if (expected.join('\0') !== actual.join('\0')) throw new Error(`D2_SHARED_ACTION_INPUT_COVERAGE: ${action.id}`);
    const binding = (page.operationBindings ?? []).find(item => item.route === call.route);
    if (binding) for (const input of action.inputs) {
      const state = document.states.find(item => item.id === input.stateRef)!;
      const path = input.parameterRef.fragment?.replace(`${call.callPascal}Input.`, '') ?? '';
      const source = binding.inputFields.find(item => item.path === `${call.entityId}.${path}`);
      if (source?.origin === 'server' && !fieldWritePrecondition(call, path) && state.origin?.purpose !== 'session') throw new Error(`D2_SHARED_FIELD_ORIGIN_DENIED: ${call.callName}/${path}`);
      if (source?.origin === 'server' && fieldWritePrecondition(call, path) && (!state.snapshot || state.origin?.purpose !== 'selectedEntity' || state.initialValue !== undefined || state.required !== true || state.editable !== false || state.presentation !== 'hidden')) throw new Error(`D2_SHARED_WRITE_PRECONDITION_STATE_INVALID: ${call.callName}/${path}`);
      if (!source && call.operation !== 'list' && call.operation !== 'get' && !flatten(call.input).some(field => field.writePrecondition && dtoPathOf(call.entityId, field.path) === path)) throw new Error(`D2_SHARED_FIELD_NOT_AUTHORIZED: ${call.callName}/${path}`);
      const field = inputLeaves(call.input).find(item => dtoPathOf(call.entityId, item.path) === path)!;
      const required = field.writePrecondition || ((source?.required ?? field.required) && !hasOptionalObjectAncestor(call.input, field.path));
      if (state.required !== required) throw new Error(`D2_SHARED_FIELD_REQUIRED_MISMATCH: ${call.callName}/${path}`);
      if (state.snapshot && !field.writePrecondition) throw new Error(`D2_SHARED_SNAPSHOT_UNDECLARED: ${call.callName}/${path}`);
      const expectedSource = field.writePrecondition || isSelectedIdentity(call, field) || (field.referenceTo.length > 0 && (call.operation !== 'list' || field.required || hasSelectionSource(field, contract)))
        ? 'selectedEntity' : source?.origin === 'server' ? 'session' : field.path.endsWith('$page') ? 'routeParam' : 'userInput';
      if (state.source !== expectedSource || state.editable !== (expectedSource === 'userInput' && !field.writePrecondition)
        || state.presentation !== (field.writePrecondition || expectedSource === 'session' ? 'hidden' : expectedSource === 'routeParam' ? 'route' : expectedSource === 'selectedEntity' ? 'selection' : 'form')) {
        throw new Error(`D2_SHARED_FIELD_ORIGIN_DENIED: ${call.callName}/${path}`);
      }
      if (!field.writePrecondition && state.source === 'selectedEntity') {
        const sourceCall = selectionSource(call, field, contract);
        const identity = sourceCall && flatten(sourceCall.output).find(output => output.derived && output.name === 'id');
        if (!sourceCall || !identity || state.selection?.sourceActionRef !== sourceCall.callName
          || state.selection.resultStateRef !== stateIdOf(sourceCall.callName, 'result')
          || state.selection.identityRef.fragment !== `${sourceCall.callPascal}Output.${dtoPathOf(sourceCall.entityId, identity.path)}`
          || state.editable !== false || state.presentation !== 'selection') throw new Error(`D2_SHARED_SELECTION_STATE_INVALID: ${call.callName}/${path}`);
      }
      if (field.writePrecondition) {
        const sourceCall = contract.calls.find(candidate => (candidate.operation === 'list' || candidate.operation === 'get')
          && candidate.entityId === call.entityId
          && inputLeaves(candidate.output).some(output => output.path === field.path));
        const selectedIdentity = inputLeaves(call.input).find(candidate => isSelectedIdentity(call, candidate));
        const outputIdentity = sourceCall && flatten(sourceCall.output).find(output => output.path === selectedIdentity?.path);
        if (!sourceCall || !selectedIdentity || !outputIdentity || !state.snapshot
          || state.snapshot.sourceActionRef !== sourceCall.callName
          || state.snapshot.resultStateRef !== stateIdOf(sourceCall.callName, 'result')
          || state.snapshot.selectedIdentityStateRef !== stateIdOf(call.callName, dtoPathOf(call.entityId, selectedIdentity.path))
          || state.snapshot.identityRef.fragment !== `${sourceCall.callPascal}Output.${dtoPathOf(sourceCall.entityId, outputIdentity.path)}`
          || state.snapshot.valueRef.fragment !== `${sourceCall.callPascal}Output.${dtoPathOf(sourceCall.entityId, field.path)}`) {
          throw new Error(`D2_SHARED_WRITE_PRECONDITION_SOURCE_INVALID: ${call.callName}/${path}`);
        }
      }
    }
    const expectedInitial = judgment.initialLoadActionIds.includes(call.callName);
    if (!!action.initialLoad !== expectedInitial || (expectedInitial && call.operation !== 'list' && call.operation !== 'get')) throw new Error(`D2_SHARED_INITIAL_LOAD_MISMATCH: ${call.callName}`);
    const behavior = judgment.actionBehaviors.find(item => item.actionId === call.callName)!;
    if ((action.refreshActionRefs ?? []).join('\0') !== behavior.refreshActionIds.join('\0')) throw new Error(`D2_SHARED_REFRESH_MISMATCH: ${call.callName}`);
    const transitions = operationBindings.filter(item => item.route === call.route && item.transition).map(item => `${item.actorRef}\0${item.transition!.transitionId}\0${item.transition!.from.join(',')}\0${item.transition!.to}\0${item.transition!.by.join(',')}\0${item.transition!.payload.join(',')}`);
    const actualTransitions = (action.transitions ?? []).map(item => `${item.actorRef}\0${item.id}\0${item.from.join(',')}\0${item.to}\0${item.by.join(',')}\0${item.payload.join(',')}`);
    if (transitions.join('\n') !== actualTransitions.join('\n')) throw new Error(`D2_SHARED_TRANSITION_MISMATCH: ${call.callName}`);
    if (behavior.destructive && !action.confirmation) throw new Error(`D2_SHARED_DESTRUCTIVE_CONFIRMATION: ${call.callName}`);
  }
  for (const scene of judgment.scenaries) {
    const call = calls.get(scene.actionId);
    const action = actions.get(scene.actionId);
    const publicScene = scenarios.get(safeId(scene.value, 'scenario'));
    if (!publicScene || (call && publicScene.actionRef !== call.callName)) throw new Error(`D2_SHARED_SCENARY_ACTION_UNKNOWN: ${scene.actionId}`);
    const expectedPreconditions = scene.preconditions.map(key => {
      const field = call && userInputByStateKey(page.pageId, call, key);
      if (!field) throw new Error(`D2_SHARED_PRECONDITION_UNKNOWN: ${key}`);
      return `${call.callPascal}Input.${dtoPathOf(call.entityId, field.path)}`;
    }).sort();
    if (expectedPreconditions.join('\0') !== publicScene.preconditions.map(item => item.fragment || '').sort().join('\0')) throw new Error(`D2_SHARED_PRECONDITION_MISMATCH: ${scene.value}`);
    if (!action && (scene.kind !== 'base' || scene.actionId)) throw new Error(`D2_SHARED_SCENARY_ACTION_UNKNOWN: ${scene.actionId}`);
    const sceneBinding = call && operationBindings.find(binding => binding.route === call.route);
    const required = call ? inputLeaves(call.input).filter(field => isSelectedIdentity(call, field)
      && (sceneBinding?.inputFields.find(input => input.path === field.path)?.required ?? field.required))
      .map(field => `${call.callPascal}Input.${dtoPathOf(call.entityId, field.path)}`).sort() : [];
    const actual = publicScene.preconditions.map(ref => ref.fragment || '').sort();
    if (required.some(ref => !actual.includes(ref))) throw new Error(`D2_SHARED_PRECONDITION_REMOVED: ${scene.value}`);
    for (const refresh of judgment.actionBehaviors.find(item => item.actionId === scene.actionId)?.refreshActionIds ?? []) {
      const refreshed = calls.get(refresh);
      if (!refreshed || (refreshed.operation !== 'list' && refreshed.operation !== 'get')) throw new Error(`D2_SHARED_REFRESH_NOT_QUERY: ${scene.actionId} -> ${refresh}`);
    }
  }
  if (actions.size !== calls.size || contract.calls.some(call => !actions.has(call.callName))) throw new Error('D2_SHARED_ACTION_COVERAGE');
}

function validateSharedJudgment(page: D2SelectedPage, contract: D2PageContract, judgment: D2SharedJudgment): void {
  if (judgment.pageId !== page.pageId || contract.pageId !== page.pageId) throw new Error('D2_SHARED_PAGE_CHANGED');
  const calls = new Map(contract.calls.map(call => [call.callName, call]));
  const bindings = page.operationBindings ?? [];
  if (new Set(bindings.map(binding => `${binding.route}\0${binding.actorRef}`)).size !== bindings.length) throw new Error('D2_SHARED_OPERATION_BINDING_DUPLICATE');
  for (const call of contract.calls) {
    const matches = bindings.filter(binding => binding.route === call.route);
    if (matches.some(binding => binding.entityId !== call.entityId || binding.operation !== call.operation)) throw new Error(`D2_SHARED_OPERATION_BINDING_MISMATCH: ${call.route}`);
    if (!matches.length && call.operation !== 'list' && call.operation !== 'get') throw new Error(`D2_SHARED_OPERATION_BINDING_MISSING: ${call.route}`);
    const signatures = matches.map(binding => JSON.stringify(binding.inputFields.map(field => [field.path, field.origin, field.required]).sort()));
    if (new Set(signatures).size > 1) throw new Error(`D2_SHARED_OPERATION_BINDING_AMBIGUOUS: ${call.route}`);
    const permitted = new Set(matches.flatMap(binding => binding.inputFields.map(field => field.path)));
    for (const field of inputLeaves(call.input)) {
      if (matches.length && call.operation !== 'list' && call.operation !== 'get'
        && !permitted.has(field.path) && !field.writePrecondition && !field.path.endsWith('$page')) {
        throw new Error(`D2_SHARED_FIELD_NOT_AUTHORIZED: ${call.callName}/${field.path}`);
      }
    }
  }
  if (!judgment.scenaries.some(item => item.kind === 'base' && item.value === 'base')) throw new Error('D2_SHARED_BASE_SCENARY_MISSING');
  const sceneIds = new Set<string>();
  for (const scene of judgment.scenaries) {
    if (!scene.value || sceneIds.has(scene.value)) throw new Error(`D2_SHARED_SCENARY_DUPLICATE: ${scene.value}`);
    sceneIds.add(scene.value);
    const call = calls.get(scene.actionId);
    if (scene.value === 'base' && call && call.operation !== 'list' && call.operation !== 'get') throw new Error(`D2_SHARED_BASE_SCENARY_COMMAND_INCOMPATIBLE: ${scene.actionId}`);
    if (!call && !(scene.kind === 'base' && !scene.actionId && !scene.preconditions.length && !contract.calls.length)) throw new Error(`D2_SHARED_SCENARY_ACTION_UNKNOWN: ${scene.actionId}`);
    for (const key of scene.preconditions) if (!call || !userInputByStateKey(page.pageId, call, key)) throw new Error(`D2_SHARED_PRECONDITION_UNKNOWN: ${key}`);
    const binding = call && bindings.find(item => item.route === call.route);
    const requiredSelectionKeys = call ? inputLeaves(call.input).filter(field => isSelectedIdentity(call, field)
      && (binding?.inputFields.find(input => input.path === field.path)?.required ?? field.required))
      .map(field => `ui.${page.pageId}.${call.callName}.input.${dtoPathOf(call.entityId, field.path)}`) : [];
    if (requiredSelectionKeys.some(key => !scene.preconditions.includes(key))) throw new Error(`D2_SHARED_PRECONDITION_REMOVED: ${scene.value}`);
  }
  const behaviorIds = new Set(judgment.actionBehaviors.map(item => item.actionId));
  if (behaviorIds.size !== contract.calls.length || contract.calls.some(call => !behaviorIds.has(call.callName))) throw new Error('D2_SHARED_ACTION_COVERAGE');
  for (const behavior of judgment.actionBehaviors) {
    if (!calls.has(behavior.actionId)) throw new Error(`D2_SHARED_ACTION_UNKNOWN: ${behavior.actionId}`);
    if (behavior.refreshActionIds.some(id => !['list', 'get'].includes(calls.get(id)?.operation ?? ''))) throw new Error(`D2_SHARED_REFRESH_NOT_QUERY: ${behavior.actionId}`);
    if (behavior.destructive && (!behavior.confirmation?.title || !behavior.confirmation.description)) throw new Error(`D2_SHARED_DESTRUCTIVE_CONFIRMATION: ${behavior.actionId}`);
    if (isObviouslyDestructive(behavior.actionId) && !behavior.destructive) throw new Error(`D2_SHARED_DESTRUCTIVE_UNMARKED: ${behavior.actionId}`);
    if (!behavior.destructive && behavior.confirmation) throw new Error(`D2_SHARED_CONFIRMATION_UNUSED: ${behavior.actionId}`);
  }
  for (const actionId of judgment.initialLoadActionIds) {
    const call = calls.get(actionId);
    if (!call || (call.operation !== 'list' && call.operation !== 'get')) throw new Error(`D2_SHARED_INITIAL_LOAD_NOT_QUERY: ${actionId}`);
    const binding = bindings.find(item => item.route === call.route);
    const unavailable = inputLeaves(call.input).filter(field => {
      const input = binding?.inputFields.find(item => item.path === field.path);
      return (input?.required ?? field.required) && input?.origin !== 'server' && !field.writePrecondition && !field.path.endsWith('$page');
    });
    if (unavailable.length) throw new Error(`D2_SHARED_INITIAL_LOAD_INPUT_UNAVAILABLE: ${actionId}`);
  }
}

function isSelectedIdentity(call: D2ContractCall, field: D2ContractField): boolean {
  return field.derived && field.name === 'id' && (call.operation === 'get' || call.operation === 'update' || call.operation === 'transition');
}
function sharedInputFields(call: D2ContractCall, fields: D2ContractField[], bindings: D2OperationBinding[]): D2ContractField[] {
  if (call.operation !== 'list' && call.operation !== 'get') return fields;
  const permitted = new Set(bindings.flatMap(binding => binding.inputFields.map(field => field.path)));
  return fields.filter(field => permitted.has(field.path) || field.path.endsWith('$page')
    || (call.operation === 'get' && isSelectedIdentity(call, field)));
}
function fieldWritePrecondition(call: D2ContractCall, path: string): boolean {
  return flatten(call.input).some(field => field.writePrecondition && dtoPathOf(call.entityId, field.path) === path);
}
function selectionSource(call: D2ContractCall, field: D2ContractField, contract: D2PageContract): D2ContractCall | undefined {
  const targets = field.referenceTo.length ? field.referenceTo : isSelectedIdentity(call, field) ? [call.entityId] : [];
  return contract.calls.find(candidate => (candidate.operation === 'list' || candidate.operation === 'get')
    && targets.includes(candidate.entityId)
    && flatten(candidate.output).some(output => output.derived && output.name === 'id'));
}
function hasSelectionSource(field: D2ContractField, contract: D2PageContract): boolean {
  return field.referenceTo.length > 0 && contract.calls.some(candidate => (candidate.operation === 'list' || candidate.operation === 'get')
    && field.referenceTo.includes(candidate.entityId)
    && flatten(candidate.output).some(output => output.derived && output.name === 'id'));
}
function userInputByStateKey(pageId: string, call: D2ContractCall, key: string): D2ContractField | undefined {
  return inputLeaves(call.input).find(field => `ui.${pageId}.${call.callName}.input.${dtoPathOf(call.entityId, field.path)}` === key);
}
function hasOptionalObjectAncestor(fields: D2ContractField[], path: string): boolean {
  return fields.some(field => (field.scalar === 'object' && !field.collection && !field.required && path.startsWith(`${field.path}.`)) || hasOptionalObjectAncestor(field.children, path));
}
function dtoPathOf(entityId: string, path: string): string {
  if (!path.startsWith(`${entityId}.`)) throw new Error(`D2_SHARED_DTO_PATH_INVALID: ${path}`);
  const value = path.slice(entityId.length + 1);
  return value === '$page' ? 'page' : value;
}
function stateIdOf(actionId: string, path: string): string { return `state${pascal(actionId)}${pascal(path)}`; }
function safeId(value: string, prefix: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9]+(.)?/g, (_all, next: string | undefined) => next ? next.toUpperCase() : '').replace(/[^A-Za-z0-9]/g, '');
  const base = cleaned ? `${cleaned.slice(0, 1).toLowerCase()}${cleaned.slice(1)}` : prefix;
  return /^[a-z]/.test(base) ? base : `${prefix}${pascal(base)}`;
}
function pascal(value: string): string { return value.replace(/[^A-Za-z0-9]+(.)/g, (_all, next: string) => next.toUpperCase()).replace(/^./, first => first.toUpperCase()); }
function fold(value: string): string { return value.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase(); }
function referenceKey(value: D2DefinitionReference): string { return `${value.fileRef}\0${value.fragment ?? ''}`; }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
