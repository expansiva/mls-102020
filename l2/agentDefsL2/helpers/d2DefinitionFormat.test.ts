/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2DefinitionFormat.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  D2_DEFINITION_VERSION,
  parseD2Definition,
  type D2DefinitionDocument,
  type D2ResolvableSymbol,
} from '/_102020_/l2/agentDefsL2/helpers/d2DefinitionFormat.js';

const SYMBOLS: D2ResolvableSymbol[] = [
  { fileRef: 'l2/sample/web/contracts/records.defs.ts' },
  { fileRef: 'l2/sample/web/contracts/records.defs.ts', fragment: 'listRecordRoute' },
  { fileRef: 'l2/sample/web/shared/records.defs.ts', fragment: 'definition', contentIds: ['recordList'] },
  { fileRef: 'l2/sample/rules.defs.ts', fragment: 'canViewRecords' },
];

void test('shared definition has one serializable identity and semantic refs resolve exactly', () => {
  const document = sharedDocument();
  const model = parseD2Definition(JSON.parse(JSON.stringify(document)), SYMBOLS);
  assert.deepEqual(model.document, document);
  assert.deepEqual(model.resolvedReferences.map(item => item.declaration.fragment).sort(), [
    'canViewRecords', 'listRecordRoute', 'listRecordRoute', undefined,
  ]);
  assert.equal('pipeline' in model.document, false);
});

void test('page11 document carries an explicit device and resolves its shared and presentation refs', () => {
  const document = {
    schemaVersion: D2_DEFINITION_VERSION,
    artifactType: 'page11',
    pageId: 'records',
    device: 'mobile',
    intent: 'Find and inspect records.',
    sharedRef: { purpose: 'shared behavior', fileRef: 'l2/sample/web/shared/records.defs.ts', fragment: 'definition' },
    references: [],
    presentation: { categoryRef: { purpose: 'category', fileRef: 'l2/sample/rules.defs.ts', fragment: 'canViewRecords' }, reason: 'The task is record review.' },
    organisms: [],
    moleculeRecommendations: [],
  } as const;
  assert.deepEqual(parseD2Definition(document, SYMBOLS).document, document);
});

void test('refs with no declaration or more than one declaration are rejected', () => {
  const missing = sharedDocument();
  missing.references[0].fileRef = 'l2/sample/rules.defs.ts';
  missing.references[0].fragment = 'missingRule';
  assert.throws(() => parseD2Definition(missing, SYMBOLS), /D2_DEFINITION_REFERENCE_MISSING/);

  const ambiguous = sharedDocument();
  ambiguous.references[0].fragment = undefined;
  ambiguous.references[0].fileRef = 'l2/sample/web/contracts/records.defs.ts';
  assert.throws(() => parseD2Definition(ambiguous, [
    ...SYMBOLS,
    { fileRef: 'l2/sample/web/contracts/records.defs.ts' },
  ]), /D2_DEFINITION_REFERENCE_AMBIGUOUS/);
});

void test('public definitions reject execution metadata and stale identity', () => {
  const withPipeline = { ...sharedDocument(), actions: [{ id: 'list', pipeline: [] }] };
  assert.throws(() => parseD2Definition(withPipeline, SYMBOLS), /D2_DEFINITION_EXECUTION_METADATA: pipeline/);
  assert.throws(() => parseD2Definition({ ...sharedDocument(), schemaVersion: 'old' }, SYMBOLS), /D2_DEFINITION_SCHEMA_VERSION/);
  assert.throws(() => parseD2Definition({ ...sharedDocument(), pageId: 'Other' }, SYMBOLS), /D2_DEFINITION_PAGE_ID/);
});

void test('shared parser rejects malformed state, action, content and scenario structures', () => {
  const badStateId = sharedDocument();
  badStateId.states[0].id = 'NotLowerCamel';
  assert.throws(() => parseD2Definition(badStateId, SYMBOLS), /D2_DEFINITION_STATE_ID/);

  const badPurpose = sharedDocument();
  badPurpose.states[0].purpose = '  ';
  assert.throws(() => parseD2Definition(badPurpose, SYMBOLS), /D2_DEFINITION_STATE_PURPOSE/);

  const badCallRef = sharedDocument();
  badCallRef.actions[0].callRef = { purpose: 'load records', fileRef: '' };
  assert.throws(() => parseD2Definition(badCallRef, SYMBOLS), /D2_DEFINITION_REFERENCE_SHAPE/);

  const badInputRef = sharedDocument();
  badInputRef.actions[0].inputs = [{ parameterRef: { purpose: '', fileRef: 'l2/sample/rules.defs.ts' }, stateRef: 'records' }];
  assert.throws(() => parseD2Definition(badInputRef, SYMBOLS), /D2_DEFINITION_REFERENCE_SHAPE/);

  const missingInputState = sharedDocument();
  missingInputState.actions[0].inputs = [{ parameterRef: { purpose: 'filter', fileRef: 'l2/sample/rules.defs.ts', fragment: 'canViewRecords' }, stateRef: 'missingState' }];
  assert.throws(() => parseD2Definition(missingInputState, SYMBOLS), /D2_DEFINITION_STATE_REF_MISSING/);

  const missingContentState = sharedDocument();
  missingContentState.contents[0].stateRefs = ['missingState'];
  assert.throws(() => parseD2Definition(missingContentState, SYMBOLS), /D2_DEFINITION_STATE_REF_MISSING/);

  const missingScenarioContent = sharedDocument();
  missingScenarioContent.scenarios[0].contentRefs = ['missingContent'];
  assert.throws(() => parseD2Definition(missingScenarioContent, SYMBOLS), /D2_DEFINITION_CONTENT_REF_MISSING/);
});

void test('page11 parser validates organism and molecule reference shapes and links', () => {
  const badOrganism = page11Document();
  badOrganism.organisms[0].capabilityRefs = [{ purpose: 'capability' } as never];
  assert.throws(() => parseD2Definition(badOrganism, SYMBOLS), /D2_DEFINITION_REFERENCE_SHAPE/);

  const badChoice = page11Document();
  badChoice.moleculeRecommendations[0].preferred.indexRef = { purpose: 'index', fileRef: '' };
  assert.throws(() => parseD2Definition(badChoice, SYMBOLS), /D2_DEFINITION_REFERENCE_SHAPE/);

  const orphanRecommendation = page11Document();
  orphanRecommendation.moleculeRecommendations[0].organismRef = 'missingOrganism';
  assert.throws(() => parseD2Definition(orphanRecommendation, SYMBOLS), /D2_DEFINITION_ORGANISM_REF_MISSING/);

  const orphanContent = page11Document();
  orphanContent.organisms[0].contentRef = 'missingContent';
  assert.throws(() => parseD2Definition(orphanContent, SYMBOLS), /D2_DEFINITION_CONTENT_REF_MISSING/);

  const sharedWithoutContentCatalog = SYMBOLS.map(({ contentIds: _contentIds, ...symbol }) => symbol);
  assert.throws(() => parseD2Definition(page11Document(), sharedWithoutContentCatalog), /D2_DEFINITION_SHARED_CONTENT_CATALOG_MISSING/);
});

function sharedDocument(): Extract<D2DefinitionDocument, { artifactType: 'shared' }> {
  return {
    schemaVersion: D2_DEFINITION_VERSION,
    artifactType: 'shared',
    pageId: 'records',
    intent: 'Review records and their current state.',
    contractRef: { purpose: 'typed routes and DTOs', fileRef: 'l2/sample/web/contracts/records.defs.ts' },
    references: [{ purpose: 'view rule', fileRef: 'l2/sample/rules.defs.ts', fragment: 'canViewRecords' }],
    states: [{ id: 'records', purpose: 'loaded records', typeRef: { purpose: 'DTO', fileRef: 'l2/sample/web/contracts/records.defs.ts', fragment: 'listRecordRoute' } }],
    actions: [{ id: 'list', callRef: { purpose: 'load records', fileRef: 'l2/sample/web/contracts/records.defs.ts', fragment: 'listRecordRoute' }, inputs: [], resultStateRef: 'records' }],
    contents: [{ id: 'recordList', intent: 'Review the list.', stateRefs: ['records'], inactiveBehavior: 'hiddenInertOutOfFocus' }],
    scenarios: [{ id: 'base', contentRefs: ['recordList'], preconditions: [] }],
    authorityRefs: [{ purpose: 'view rule', fileRef: 'l2/sample/rules.defs.ts', fragment: 'canViewRecords' }],
  };
}

function page11Document(): Extract<D2DefinitionDocument, { artifactType: 'page11' }> {
  return {
    schemaVersion: D2_DEFINITION_VERSION,
    artifactType: 'page11',
    pageId: 'records',
    device: 'desktop',
    intent: 'Review the record list.',
    sharedRef: { purpose: 'shared behavior', fileRef: 'l2/sample/web/shared/records.defs.ts', fragment: 'definition' },
    references: [],
    presentation: { categoryRef: { purpose: 'category', fileRef: 'l2/sample/rules.defs.ts', fragment: 'canViewRecords' }, reason: 'Record review is the primary task.' },
    organisms: [{ id: 'recordList', kind: 'list', description: 'Review records.', contentRef: 'recordList', capabilityRefs: [], journeyRefs: [] }],
    moleculeRecommendations: [{
      organismRef: 'recordList', role: 'operator', preferred: {
        tag: 'record-list', indexRef: { purpose: 'molecule index', fileRef: 'l2/sample/rules.defs.ts', fragment: 'canViewRecords' },
        usageRef: { purpose: 'molecule usage', fileRef: 'l2/sample/web/contracts/records.defs.ts', fragment: 'listRecordRoute' }, reason: 'It supports scanning records.',
      },
    }],
  };
}
