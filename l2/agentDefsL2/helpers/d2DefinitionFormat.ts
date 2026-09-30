/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2DefinitionFormat.ts" enhancement="_blank"/>

export const D2_DEFINITION_VERSION = '2026-09-29-agent-defs-l2-definition-v1' as const;

export type D2DefinitionArtifactType = 'shared' | 'page11';
export type D2DefinitionDevice = 'desktop' | 'mobile';

export interface D2DefinitionReference {
  purpose: string;
  fileRef: string;
  fragment?: string;
}

export interface D2DefinitionState {
  id: string;
  purpose: string;
  origin?: D2DefinitionReference;
  typeRef?: D2DefinitionReference;
  uiType?: 'string' | 'number' | 'boolean' | 'object' | 'string[]';
  initialValue?: string | number | boolean | null;
  required?: boolean;
  values?: Array<string | number | boolean | null>;
  selection?: { sourceActionRef: string; resultStateRef: string; identityRef: D2DefinitionReference };
  snapshot?: { sourceActionRef: string; resultStateRef: string; selectedIdentityStateRef: string; identityRef: D2DefinitionReference; valueRef: D2DefinitionReference; capture: 'onSelection'; missing: 'blockCommandPreserveEdit' };
  source?: 'userInput' | 'selectedEntity' | 'routeParam' | 'session';
  presentation?: 'form' | 'selection' | 'route' | 'hidden';
  editable?: boolean;
}

export interface D2DefinitionAction {
  id: string;
  callRef: D2DefinitionReference;
  inputs: Array<{ parameterRef: D2DefinitionReference; stateRef: string }>;
  resultStateRef?: string;
  statusStateRef?: string;
  errorStateRef?: string;
  refreshActionRefs?: string[];
  authorityRefs?: D2DefinitionReference[];
  confirmation?: { title: string; description: string };
  initialLoad?: boolean;
  transitions?: Array<{ actorRef: string; id: string; from: string[]; to: string; by: string[]; payload: string[] }>;
}

export interface D2DefinitionContent {
  id: string;
  intent: string;
  actionRef?: string;
  visibleWhen?: D2DefinitionReference[];
  stateRefs?: string[];
  inactiveBehavior?: 'hiddenInertOutOfFocus';
}

export interface D2DefinitionScenario {
  id: string;
  actionRef?: string;
  contentRefs: string[];
  preconditions: D2DefinitionReference[];
}

export interface D2DefinitionPresentation {
  categoryRef: D2DefinitionReference;
  templateRef?: D2DefinitionReference;
  styleRef?: D2DefinitionReference;
  reason: string;
  mobileWidthRef?: D2DefinitionReference;
}

export interface D2DefinitionOrganism {
  id: string;
  kind: string;
  description: string;
  contentRef: string;
  capabilityRefs: D2DefinitionReference[];
  journeyRefs: D2DefinitionReference[];
  fieldRefs?: D2DefinitionReference[];
}

export interface D2MoleculeChoice {
  tag: string;
  indexRef: D2DefinitionReference;
  usageRef: D2DefinitionReference;
  reason: string;
}

export interface D2MoleculeRecommendation {
  organismRef: string;
  role: string;
  preferred: D2MoleculeChoice;
  alternative?: D2MoleculeChoice;
}

export interface D2SharedDefinitionDocument {
  schemaVersion: typeof D2_DEFINITION_VERSION;
  artifactType: 'shared';
  pageId: string;
  intent: string;
  references: D2DefinitionReference[];
  contractRef: D2DefinitionReference;
  states: D2DefinitionState[];
  actions: D2DefinitionAction[];
  contents: D2DefinitionContent[];
  scenarios: D2DefinitionScenario[];
  authorityRefs: D2DefinitionReference[];
}

export interface D2Page11DefinitionDocument {
  schemaVersion: typeof D2_DEFINITION_VERSION;
  artifactType: 'page11';
  pageId: string;
  device: D2DefinitionDevice;
  intent: string;
  sharedRef: D2DefinitionReference;
  references: D2DefinitionReference[];
  presentation: D2DefinitionPresentation;
  organisms: D2DefinitionOrganism[];
  moleculeRecommendations: D2MoleculeRecommendation[];
}

export type D2DefinitionDocument = D2SharedDefinitionDocument | D2Page11DefinitionDocument;

/** Normalized validation model. This is deliberately separate from the public artifact. */
export interface D2DefinitionModel {
  document: D2DefinitionDocument;
  resolvedReferences: Array<{ reference: D2DefinitionReference; declaration: D2ResolvableSymbol }>;
}

/** Technical freshness data belongs in the D2 receipt, never in a public definition. */
export interface D2DefinitionReceipt {
  schemaVersion: typeof D2_DEFINITION_VERSION;
  artifactHash: string;
  sourceHashes: Array<{ fileRef: string; sha256: string }>;
}

export interface D2ResolvableSymbol {
  fileRef: string;
  fragment?: string;
  /** Content IDs declared by a shared-definition symbol, used to resolve page11 contentRef values. */
  contentIds?: readonly string[];
}

const EXECUTION_KEYS = new Set([
  'agent', 'outputPath', 'dependsOn', 'pipeline', 'sequence', 'materializationOrder', 'receipt',
]);

const REFERENCE_KEYS = new Set([
  'contractRef', 'sharedRef', 'references', 'origin', 'typeRef', 'callRef', 'parameterRef',
  'visibleWhen', 'preconditions', 'categoryRef', 'templateRef', 'styleRef', 'mobileWidthRef',
  'capabilityRefs', 'journeyRefs', 'fieldRefs', 'indexRef', 'usageRef',
]);

export function parseD2Definition(value: unknown, symbols: readonly D2ResolvableSymbol[]): D2DefinitionModel {
  const root = record(value);
  if (!root) throw new Error('D2_DEFINITION_OBJECT_REQUIRED');
  if (root.schemaVersion !== D2_DEFINITION_VERSION) throw new Error('D2_DEFINITION_SCHEMA_VERSION');
  if (root.artifactType !== 'shared' && root.artifactType !== 'page11') throw new Error('D2_DEFINITION_ARTIFACT_TYPE');
  if (!isPageId(root.pageId)) throw new Error('D2_DEFINITION_PAGE_ID');
  if (typeof root.intent !== 'string' || !root.intent.trim()) throw new Error('D2_DEFINITION_INTENT');
  rejectExecutionKeys(root);
  assertKeys(root, root.artifactType === 'shared'
    ? ['schemaVersion', 'artifactType', 'pageId', 'intent', 'references', 'contractRef', 'states', 'actions', 'contents', 'scenarios', 'authorityRefs']
    : ['schemaVersion', 'artifactType', 'pageId', 'device', 'intent', 'sharedRef', 'references', 'presentation', 'organisms', 'moleculeRecommendations']);

  const document = root.artifactType === 'shared'
    ? parseShared(root)
    : parsePage11(root);
  const references = collectReferences(document);
  const resolvedReferences = references.map(reference => ({
    reference,
    declaration: resolveD2DefinitionReference(reference, symbols),
  }));
  if (document.artifactType === 'page11') validatePageContentRefs(document, resolvedReferences);
  return { document, resolvedReferences };
}

export function resolveD2DefinitionReference(
  reference: D2DefinitionReference,
  symbols: readonly D2ResolvableSymbol[],
): D2ResolvableSymbol {
  const matches = symbols.filter(symbol => symbol.fileRef === reference.fileRef
    && (reference.fragment === undefined ? symbol.fragment === undefined : symbol.fragment === reference.fragment));
  if (!matches.length) throw new Error(`D2_DEFINITION_REFERENCE_MISSING: ${reference.fileRef}${reference.fragment ? `#${reference.fragment}` : ''}`);
  if (matches.length !== 1) throw new Error(`D2_DEFINITION_REFERENCE_AMBIGUOUS: ${reference.fileRef}${reference.fragment ? `#${reference.fragment}` : ''}`);
  return matches[0];
}

function parseShared(root: Record<string, unknown>): D2SharedDefinitionDocument {
  if (!Array.isArray(root.states) || !Array.isArray(root.actions) || !Array.isArray(root.contents) || !Array.isArray(root.scenarios)) {
    throw new Error('D2_DEFINITION_SHARED_SHAPE');
  }
  const document: D2SharedDefinitionDocument = {
    schemaVersion: D2_DEFINITION_VERSION,
    artifactType: 'shared',
    pageId: root.pageId as string,
    intent: root.intent as string,
    references: references(root.references),
    contractRef: reference(root.contractRef),
    states: parseStates(root.states),
    actions: parseActions(root.actions),
    contents: parseContents(root.contents),
    scenarios: parseScenarios(root.scenarios),
    authorityRefs: references(root.authorityRefs),
  };
  validateSharedLinks(document);
  return document;
}

function parsePage11(root: Record<string, unknown>): D2Page11DefinitionDocument {
  if (root.device !== 'desktop' && root.device !== 'mobile') throw new Error('D2_DEFINITION_DEVICE');
  const presentation = record(root.presentation);
  if (!presentation || !Array.isArray(root.organisms) || !Array.isArray(root.moleculeRecommendations)) {
    throw new Error('D2_DEFINITION_PAGE11_SHAPE');
  }
  const document: D2Page11DefinitionDocument = {
    schemaVersion: D2_DEFINITION_VERSION,
    artifactType: 'page11',
    pageId: root.pageId as string,
    device: root.device,
    intent: root.intent as string,
    sharedRef: reference(root.sharedRef),
    references: references(root.references),
    presentation: parsePresentation(presentation),
    organisms: parseOrganisms(root.organisms),
    moleculeRecommendations: parseMoleculeRecommendations(root.moleculeRecommendations),
  };
  const organismIds = uniqueIds(document.organisms, 'D2_DEFINITION_ORGANISM_ID_DUPLICATE');
  for (const item of document.moleculeRecommendations) {
    if (!organismIds.has(item.organismRef)) throw new Error(`D2_DEFINITION_ORGANISM_REF_MISSING: ${item.organismRef}`);
  }
  return document;
}

function validatePageContentRefs(
  document: D2Page11DefinitionDocument,
  resolvedReferences: D2DefinitionModel['resolvedReferences'],
): void {
  const shared = resolvedReferences.find(item => sameReference(item.reference, document.sharedRef));
  if (!shared || !Array.isArray(shared.declaration.contentIds)) {
    throw new Error('D2_DEFINITION_SHARED_CONTENT_CATALOG_MISSING');
  }
  const contentIds = new Set<string>();
  for (const contentId of shared.declaration.contentIds) {
    if (!isId(contentId) || contentIds.has(contentId)) throw new Error('D2_DEFINITION_SHARED_CONTENT_CATALOG_INVALID');
    contentIds.add(contentId);
  }
  for (const organism of document.organisms) {
    if (!contentIds.has(organism.contentRef)) throw new Error(`D2_DEFINITION_CONTENT_REF_MISSING: ${organism.contentRef}`);
  }
}

function sameReference(left: D2DefinitionReference, right: D2DefinitionReference): boolean {
  return left.fileRef === right.fileRef && left.fragment === right.fragment;
}

function reference(value: unknown): D2DefinitionReference {
  const item = record(value);
  if (!item || typeof item.purpose !== 'string' || !item.purpose.trim()
    || typeof item.fileRef !== 'string' || !item.fileRef.trim()
    || (item.fragment !== undefined && (typeof item.fragment !== 'string' || !item.fragment.trim()))) {
    throw new Error('D2_DEFINITION_REFERENCE_SHAPE');
  }
  assertKeys(item, ['purpose', 'fileRef', 'fragment']);
  return {
    purpose: item.purpose,
    fileRef: item.fileRef,
    ...(typeof item.fragment === 'string' ? { fragment: item.fragment } : {}),
  };
}

function references(value: unknown): D2DefinitionReference[] {
  if (!Array.isArray(value)) throw new Error('D2_DEFINITION_REFERENCES_REQUIRED');
  return value.map(reference);
}

function parsePresentation(value: Record<string, unknown>): D2DefinitionPresentation {
  assertKeys(value, ['categoryRef', 'templateRef', 'styleRef', 'reason', 'mobileWidthRef']);
  const reason = requiredText(value, 'reason', 'D2_DEFINITION_PRESENTATION_REASON');
  return {
    categoryRef: reference(value.categoryRef),
    ...(value.templateRef === undefined ? {} : { templateRef: reference(value.templateRef) }),
    ...(value.styleRef === undefined ? {} : { styleRef: reference(value.styleRef) }),
    reason,
    ...(value.mobileWidthRef === undefined ? {} : { mobileWidthRef: reference(value.mobileWidthRef) }),
  };
}

function parseStates(value: unknown): D2DefinitionState[] {
  const result = records(value, 'D2_DEFINITION_STATES');
  const states = result.map(item => {
    assertKeys(item, ['id', 'purpose', 'origin', 'typeRef', 'uiType', 'initialValue', 'required', 'values', 'selection', 'snapshot', 'source', 'presentation', 'editable']);
    return {
    id: requiredId(item, 'id', 'D2_DEFINITION_STATE_ID'),
    purpose: requiredText(item, 'purpose', 'D2_DEFINITION_STATE_PURPOSE'),
    ...(item.origin === undefined ? {} : { origin: reference(item.origin) }),
    ...(item.typeRef === undefined ? {} : { typeRef: reference(item.typeRef) }),
    ...(item.uiType === undefined ? {} : { uiType: uiType(item.uiType) }),
    ...(item.initialValue === undefined ? {} : { initialValue: scalarValue(item.initialValue, 'D2_DEFINITION_STATE_INITIAL_VALUE') }),
    ...(item.required === undefined ? {} : { required: booleanValue(item.required, 'D2_DEFINITION_STATE_REQUIRED') }),
    ...(item.values === undefined ? {} : { values: scalarValues(item.values, 'D2_DEFINITION_STATE_VALUES') }),
    ...(item.selection === undefined ? {} : { selection: parseSelection(item.selection) }),
    ...(item.snapshot === undefined ? {} : { snapshot: parseSnapshot(item.snapshot) }),
    ...(item.source === undefined ? {} : { source: stateSource(item.source) }),
    ...(item.presentation === undefined ? {} : { presentation: presentation(item.presentation) }),
    ...(item.editable === undefined ? {} : { editable: booleanValue(item.editable, 'D2_DEFINITION_STATE_EDITABLE') }),
    };
  });
  uniqueIds(states, 'D2_DEFINITION_STATE_ID_DUPLICATE');
  return states;
}

function parseActions(value: unknown): D2DefinitionAction[] {
  const result = records(value, 'D2_DEFINITION_ACTIONS');
  const actions = result.map(item => {
    assertKeys(item, ['id', 'callRef', 'inputs', 'resultStateRef', 'statusStateRef', 'errorStateRef', 'refreshActionRefs', 'authorityRefs', 'transitions', 'confirmation', 'initialLoad']);
    return {
    id: requiredId(item, 'id', 'D2_DEFINITION_ACTION_ID'),
    callRef: reference(item.callRef),
    inputs: records(item.inputs, 'D2_DEFINITION_ACTION_INPUTS').map(input => {
      assertKeys(input, ['parameterRef', 'stateRef']);
      return { parameterRef: reference(input.parameterRef), stateRef: requiredId(input, 'stateRef', 'D2_DEFINITION_ACTION_STATE_REF') };
    }),
    ...(item.resultStateRef === undefined ? {} : { resultStateRef: idValue(item.resultStateRef, 'D2_DEFINITION_ACTION_STATE_REF') }),
    ...(item.statusStateRef === undefined ? {} : { statusStateRef: idValue(item.statusStateRef, 'D2_DEFINITION_ACTION_STATE_REF') }),
    ...(item.errorStateRef === undefined ? {} : { errorStateRef: idValue(item.errorStateRef, 'D2_DEFINITION_ACTION_STATE_REF') }),
    ...(item.refreshActionRefs === undefined ? {} : { refreshActionRefs: ids(item.refreshActionRefs, 'D2_DEFINITION_ACTION_REFRESH_REFS') }),
    ...(item.authorityRefs === undefined ? {} : { authorityRefs: references(item.authorityRefs) }),
    ...(item.confirmation === undefined ? {} : { confirmation: parseConfirmation(item.confirmation) }),
    ...(item.initialLoad === undefined ? {} : { initialLoad: booleanValue(item.initialLoad, 'D2_DEFINITION_ACTION_INITIAL_LOAD') }),
    ...(item.transitions === undefined ? {} : { transitions: records(item.transitions, 'D2_DEFINITION_ACTION_TRANSITIONS').map(parseActorTransition) }),
    };
  });
  uniqueIds(actions, 'D2_DEFINITION_ACTION_ID_DUPLICATE');
  return actions;
}

function parseContents(value: unknown): D2DefinitionContent[] {
  const result = records(value, 'D2_DEFINITION_CONTENTS');
  const contents = result.map(item => {
    assertKeys(item, ['id', 'intent', 'actionRef', 'visibleWhen', 'stateRefs', 'inactiveBehavior']);
    return {
    id: requiredId(item, 'id', 'D2_DEFINITION_CONTENT_ID'),
    intent: requiredText(item, 'intent', 'D2_DEFINITION_CONTENT_INTENT'),
    ...(item.actionRef === undefined ? {} : { actionRef: idValue(item.actionRef, 'D2_DEFINITION_CONTENT_ACTION_REF') }),
    ...(item.visibleWhen === undefined ? {} : { visibleWhen: references(item.visibleWhen) }),
    ...(item.stateRefs === undefined ? {} : { stateRefs: ids(item.stateRefs, 'D2_DEFINITION_CONTENT_STATE_REFS') }),
    ...(item.inactiveBehavior === undefined ? {} : { inactiveBehavior: inactiveBehavior(item.inactiveBehavior) }),
    };
  });
  uniqueIds(contents, 'D2_DEFINITION_CONTENT_ID_DUPLICATE');
  return contents;
}

function parseScenarios(value: unknown): D2DefinitionScenario[] {
  const result = records(value, 'D2_DEFINITION_SCENARIOS');
  const scenarios = result.map(item => {
    assertKeys(item, ['id', 'actionRef', 'contentRefs', 'preconditions']);
    return {
    id: requiredId(item, 'id', 'D2_DEFINITION_SCENARIO_ID'),
    ...(item.actionRef === undefined ? {} : { actionRef: idValue(item.actionRef, 'D2_DEFINITION_SCENARIO_ACTION_REF') }),
    contentRefs: ids(item.contentRefs, 'D2_DEFINITION_SCENARIO_CONTENT_REFS'),
    preconditions: references(item.preconditions),
    };
  });
  uniqueIds(scenarios, 'D2_DEFINITION_SCENARIO_ID_DUPLICATE');
  return scenarios;
}

function parseOrganisms(value: unknown): D2DefinitionOrganism[] {
  const result = records(value, 'D2_DEFINITION_ORGANISMS');
  const organisms = result.map(item => {
    assertKeys(item, ['id', 'kind', 'description', 'contentRef', 'capabilityRefs', 'journeyRefs', 'fieldRefs']);
    return {
    id: requiredText(item, 'id', 'D2_DEFINITION_ORGANISM_ID'),
    kind: requiredText(item, 'kind', 'D2_DEFINITION_ORGANISM_KIND'),
    description: requiredText(item, 'description', 'D2_DEFINITION_ORGANISM_DESCRIPTION'),
    contentRef: requiredId(item, 'contentRef', 'D2_DEFINITION_ORGANISM_CONTENT_REF'),
    capabilityRefs: references(item.capabilityRefs),
    journeyRefs: references(item.journeyRefs),
    ...(item.fieldRefs === undefined ? {} : { fieldRefs: references(item.fieldRefs) }),
    };
  });
  uniqueIds(organisms, 'D2_DEFINITION_ORGANISM_ID_DUPLICATE');
  return organisms;
}

function parseMoleculeRecommendations(value: unknown): D2MoleculeRecommendation[] {
  const result = records(value, 'D2_DEFINITION_MOLECULE_RECOMMENDATIONS');
  const parseChoice = (candidate: unknown): D2MoleculeChoice => {
    const item = record(candidate);
    if (!item) throw new Error('D2_DEFINITION_MOLECULE_CHOICE');
    assertKeys(item, ['tag', 'indexRef', 'usageRef', 'reason']);
    return {
      tag: requiredText(item, 'tag', 'D2_DEFINITION_MOLECULE_TAG'),
      indexRef: reference(item.indexRef),
      usageRef: reference(item.usageRef),
      reason: requiredText(item, 'reason', 'D2_DEFINITION_MOLECULE_REASON'),
    };
  };
  const recommendations = result.map(item => {
    assertKeys(item, ['organismRef', 'role', 'preferred', 'alternative']);
    return {
    organismRef: requiredId(item, 'organismRef', 'D2_DEFINITION_MOLECULE_ORGANISM_REF'),
    role: requiredText(item, 'role', 'D2_DEFINITION_MOLECULE_ROLE'),
    preferred: parseChoice(item.preferred),
    ...(item.alternative === undefined ? {} : { alternative: parseChoice(item.alternative) }),
    };
  });
  const seen = new Set<string>();
  for (const recommendation of recommendations) {
    const key = `${recommendation.organismRef}\0${recommendation.role}`;
    if (seen.has(key)) throw new Error(`D2_DEFINITION_MOLECULE_ROLE_DUPLICATE: ${recommendation.organismRef}/${recommendation.role}`);
    seen.add(key);
  }
  return recommendations;
}

function validateSharedLinks(document: D2SharedDefinitionDocument): void {
  const stateIds = uniqueIds(document.states, 'D2_DEFINITION_STATE_ID_DUPLICATE');
  const actionIds = uniqueIds(document.actions, 'D2_DEFINITION_ACTION_ID_DUPLICATE');
  const contentIds = uniqueIds(document.contents, 'D2_DEFINITION_CONTENT_ID_DUPLICATE');
  for (const action of document.actions) {
    const stateRefs = [
      ...action.inputs.map(input => input.stateRef),
      action.resultStateRef, action.statusStateRef, action.errorStateRef,
    ].filter((item): item is string => !!item);
    for (const stateRef of stateRefs) if (!stateIds.has(stateRef)) throw new Error(`D2_DEFINITION_STATE_REF_MISSING: ${stateRef}`);
    for (const actionRef of action.refreshActionRefs ?? []) if (!actionIds.has(actionRef)) throw new Error(`D2_DEFINITION_ACTION_REF_MISSING: ${actionRef}`);
  }
  for (const state of document.states) {
    if (state.selection && (!actionIds.has(state.selection.sourceActionRef) || !stateIds.has(state.selection.resultStateRef))) throw new Error(`D2_DEFINITION_SELECTION_REF_MISSING: ${state.id}`);
    if (state.snapshot && (!actionIds.has(state.snapshot.sourceActionRef) || !stateIds.has(state.snapshot.resultStateRef) || !stateIds.has(state.snapshot.selectedIdentityStateRef))) throw new Error(`D2_DEFINITION_SNAPSHOT_REF_MISSING: ${state.id}`);
  }
  for (const content of document.contents) {
    if (content.actionRef && !actionIds.has(content.actionRef)) throw new Error(`D2_DEFINITION_ACTION_REF_MISSING: ${content.actionRef}`);
    for (const stateRef of content.stateRefs ?? []) if (!stateIds.has(stateRef)) throw new Error(`D2_DEFINITION_STATE_REF_MISSING: ${stateRef}`);
  }
  for (const scenario of document.scenarios) {
    if (scenario.actionRef && !actionIds.has(scenario.actionRef)) throw new Error(`D2_DEFINITION_ACTION_REF_MISSING: ${scenario.actionRef}`);
    for (const contentRef of scenario.contentRefs) if (!contentIds.has(contentRef)) throw new Error(`D2_DEFINITION_CONTENT_REF_MISSING: ${contentRef}`);
  }
}

function records(value: unknown, code: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error(`${code}_ARRAY_REQUIRED`);
  return value.map(item => {
    const result = record(item);
    if (!result) throw new Error(`${code}_RECORD_REQUIRED`);
    return result;
  });
}

function requiredText(item: Record<string, unknown>, key: string, code: string): string {
  const value = item[key];
  if (typeof value !== 'string' || !value.trim()) throw new Error(code);
  return value;
}

function requiredId(item: Record<string, unknown>, key: string, code: string): string {
  return idValue(item[key], code);
}

function idValue(value: unknown, code: string): string {
  if (!isId(value)) throw new Error(code);
  return value;
}

function ids(value: unknown, code: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${code}_ARRAY_REQUIRED`);
  return value.map(item => idValue(item, code));
}

function uniqueIds<T extends { id: string }>(items: readonly T[], code: string): Set<string> {
  const result = new Set<string>();
  for (const item of items) {
    if (result.has(item.id)) throw new Error(`${code}: ${item.id}`);
    result.add(item.id);
  }
  return result;
}

function uiType(value: unknown): D2DefinitionState['uiType'] {
  if (value === 'string' || value === 'number' || value === 'boolean' || value === 'object' || value === 'string[]') return value;
  throw new Error('D2_DEFINITION_STATE_UI_TYPE');
}

function scalarValue(value: unknown, code: string): string | number | boolean | null {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  throw new Error(code);
}

function scalarValues(value: unknown, code: string): Array<string | number | boolean | null> {
  if (!Array.isArray(value)) throw new Error(code);
  return value.map(item => scalarValue(item, code));
}

function booleanValue(value: unknown, code: string): boolean {
  if (typeof value !== 'boolean') throw new Error(code);
  return value;
}

function parseActorTransition(value: Record<string, unknown>): NonNullable<D2DefinitionAction['transitions']>[number] {
  assertKeys(value, ['actorRef', 'id', 'from', 'to', 'by', 'payload']);
  return {
    actorRef: requiredId(value, 'actorRef', 'D2_DEFINITION_TRANSITION_ACTOR'),
    id: requiredText(value, 'id', 'D2_DEFINITION_TRANSITION_ID'),
    from: nonEmptyStrings(value.from, 'D2_DEFINITION_TRANSITION_FROM'),
    to: requiredText(value, 'to', 'D2_DEFINITION_TRANSITION_TO'),
    by: nonEmptyStrings(value.by, 'D2_DEFINITION_TRANSITION_BY'),
    payload: ids(value.payload, 'D2_DEFINITION_TRANSITION_PAYLOAD'),
  };
}

function parseConfirmation(value: unknown): NonNullable<D2DefinitionAction['confirmation']> {
  const item = record(value);
  if (!item) throw new Error('D2_DEFINITION_CONFIRMATION');
  assertKeys(item, ['title', 'description']);
  return { title: requiredText(item, 'title', 'D2_DEFINITION_CONFIRMATION_TITLE'), description: requiredText(item, 'description', 'D2_DEFINITION_CONFIRMATION_DESCRIPTION') };
}

function nonEmptyStrings(value: unknown, code: string): string[] {
  if (!Array.isArray(value) || !value.length || value.some(item => typeof item !== 'string' || !item.trim())) throw new Error(code);
  return value as string[];
}

function inactiveBehavior(value: unknown): 'hiddenInertOutOfFocus' {
  if (value !== 'hiddenInertOutOfFocus') throw new Error('D2_DEFINITION_CONTENT_INACTIVE_BEHAVIOR');
  return value;
}

function parseSelection(value: unknown): NonNullable<D2DefinitionState['selection']> {
  const item = record(value);
  if (!item) throw new Error('D2_DEFINITION_SELECTION');
  assertKeys(item, ['sourceActionRef', 'resultStateRef', 'identityRef']);
  return { sourceActionRef: idValue(item.sourceActionRef, 'D2_DEFINITION_SELECTION_ACTION_REF'), resultStateRef: idValue(item.resultStateRef, 'D2_DEFINITION_SELECTION_STATE_REF'), identityRef: reference(item.identityRef) };
}

function parseSnapshot(value: unknown): NonNullable<D2DefinitionState['snapshot']> {
  const item = record(value);
  if (!item) throw new Error('D2_DEFINITION_SNAPSHOT');
  assertKeys(item, ['sourceActionRef', 'resultStateRef', 'selectedIdentityStateRef', 'identityRef', 'valueRef', 'capture', 'missing']);
  if (item.capture !== 'onSelection' || item.missing !== 'blockCommandPreserveEdit') throw new Error('D2_DEFINITION_SNAPSHOT_POLICY');
  return {
    sourceActionRef: idValue(item.sourceActionRef, 'D2_DEFINITION_SNAPSHOT_ACTION_REF'),
    resultStateRef: idValue(item.resultStateRef, 'D2_DEFINITION_SNAPSHOT_STATE_REF'),
    selectedIdentityStateRef: idValue(item.selectedIdentityStateRef, 'D2_DEFINITION_SNAPSHOT_IDENTITY_STATE_REF'),
    identityRef: reference(item.identityRef),
    valueRef: reference(item.valueRef),
    capture: 'onSelection',
    missing: 'blockCommandPreserveEdit',
  };
}

function stateSource(value: unknown): NonNullable<D2DefinitionState['source']> {
  if (value === 'userInput' || value === 'selectedEntity' || value === 'routeParam' || value === 'session') return value;
  throw new Error('D2_DEFINITION_STATE_SOURCE');
}

function presentation(value: unknown): NonNullable<D2DefinitionState['presentation']> {
  if (value === 'form' || value === 'selection' || value === 'route' || value === 'hidden') return value;
  throw new Error('D2_DEFINITION_STATE_PRESENTATION');
}

function assertKeys(item: Record<string, unknown>, allowed: string[]): void {
  const known = new Set(allowed);
  const unknown = Object.keys(item).find(key => !known.has(key));
  if (unknown) throw new Error(`D2_DEFINITION_FIELD_UNKNOWN: ${unknown}`);
}

function collectReferences(value: unknown): D2DefinitionReference[] {
  const object = record(value);
  if (!object) return Array.isArray(value) ? value.flatMap(collectReferences) : [];
  return Object.entries(object).flatMap(([key, child]) => {
    if (!REFERENCE_KEYS.has(key)) return collectReferences(child);
    if (Array.isArray(child)) return child.map(reference);
    return [reference(child)];
  });
}

function rejectExecutionKeys(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(rejectExecutionKeys);
    return;
  }
  const object = record(value);
  if (!object) return;
  for (const [key, child] of Object.entries(object)) {
    if (EXECUTION_KEYS.has(key)) throw new Error(`D2_DEFINITION_EXECUTION_METADATA: ${key}`);
    rejectExecutionKeys(child);
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z][A-Za-z0-9_]*$/.test(value);
}

function isPageId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z][A-Za-z0-9_-]*$/.test(value);
}
