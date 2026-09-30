/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/page11Definition.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildD2Page11DefinitionDocument, parseD2Page11DefinitionSource, renderD2Page11DefinitionDocument, type D2Page11DefinitionInput } from '/_102020_/l2/agentDefsL2/steps/pages50/page11Definition.js';

const shared = { purpose: 'shared behavior', fileRef: 'l2/inventory/web/shared/products.defs.ts', fragment: 'definition' };
const capability = { purpose: 'list products', fileRef: shared.fileRef, fragment: 'listProducts' };
const journey = { purpose: 'user journey step', fileRef: 'l4/inventory/journeys/manageProducts.defs.ts', fragment: 'inspectStock' };
const field = { purpose: 'selected display field', fileRef: 'l2/inventory/web/contracts/products.defs.ts', fragment: 'ListProductsOutput.Product.name' };
const category = { purpose: 'selected category', fileRef: 'l2/pageCategories/management.md' };
const width = { purpose: 'fluid narrow viewport reference 390px; future checks 360px and 430px', fileRef: 'l2/mobileGuidance.md' };
const index = 'l2/molecules/productList/index.ts';
const usage = 'l2/molecules/productList/usage.md';
const symbols = [
  { fileRef: shared.fileRef, fragment: shared.fragment, contentIds: ['products'] },
  capability, journey, field, category, width,
  { fileRef: index }, { fileRef: usage },
];

function input(device: 'desktop' | 'mobile' = 'desktop'): D2Page11DefinitionInput {
  return {
    pageId: 'products', device,
    intent: 'Help the operator inspect stock and find products.',
    sharedRef: shared,
    references: [journey, category, category],
    presentation: { categoryRef: category, reason: 'The inventory task needs a product overview.', ...(device === 'mobile' ? { mobileWidthRef: width } : {}) },
    organisms: [{
      id: 'productList', kind: 'list',
      description: device === 'mobile'
        ? 'Show the same products in a fluid narrow view. Announce loading, empty results and errors; keep actions reachable by touch and keyboard.'
        : 'Show products and stock. Announce loading, empty results and errors; keep list actions reachable by keyboard.',
      contentRef: 'products', capabilityRefs: [capability], journeyRefs: [journey], fieldRefs: [field],
    }],
    selectedRoles: [{
      needId: `${device}/productList`, device, organismId: 'productList', role: 'browse', groupId: 'productList',
      preferred: { tag: device === 'mobile' ? 'compact-list' : 'stock-list', reason: 'Matches the browsing task.', indexReference: index, usageContractReference: usage },
      alternative: { tag: 'plain-list', reason: 'A simpler accessible fallback.', indexReference: index, usageContractReference: usage },
    }],
    symbols,
    capabilityRefsByOrganism: new Map([['productList', [capability]]]),
  };
}

test('page11 roundtrips literal prose and selected recommendations without pipeline', () => {
  const sourceInput = input();
  sourceInput.organisms[0].description += ' Literal `name`, "quote", and ${stock} stay prose.';
  const document = buildD2Page11DefinitionDocument(sourceInput);
  const source = renderD2Page11DefinitionDocument('inventory', document, symbols, 102047);
  const parsed = parseD2Page11DefinitionSource(source, symbols);
  assert.deepEqual(parsed, document);
  assert.match(parsed.organisms[0].description, /\$\{stock\}/u);
  assert.equal(parsed.moleculeRecommendations[0].preferred.tag, 'stock-list');
  assert.equal(parsed.moleculeRecommendations[0].alternative?.reason, 'A simpler accessible fallback.');
  assert.equal(parsed.references.length, 2);
  assert.doesNotMatch(source, /pipeline|outputPath|dependsOn|templateSelection|coverage|discardedCandidates/u);
  assert.ok(source.length < 4000);
});

test('page11 preserves capabilities while prose and selected molecule vary by device', () => {
  const desktop = buildD2Page11DefinitionDocument(input());
  const mobile = buildD2Page11DefinitionDocument(input('mobile'));
  assert.deepEqual(mobile.organisms[0].capabilityRefs, desktop.organisms[0].capabilityRefs);
  assert.notEqual(mobile.organisms[0].description, desktop.organisms[0].description);
  assert.notEqual(mobile.moleculeRecommendations[0].preferred.tag, desktop.moleculeRecommendations[0].preferred.tag);
  assert.match(mobile.presentation.mobileWidthRef?.purpose ?? '', /390.*360.*430/u);
});

test('organisms sharing a capability keep their own selected roles', () => {
  const value = input();
  value.organisms.push({
    id: 'productForm', kind: 'form',
    description: 'Edit a product while preserving the current values; announce save progress and errors.',
    contentRef: 'products', capabilityRefs: [capability], journeyRefs: [journey],
  });
  value.capabilityRefsByOrganism = new Map([
    ['productList', [capability]], ['productForm', [capability]],
  ]);
  value.selectedRoles.push({
    needId: 'desktop/productForm', device: 'desktop', organismId: 'productForm', role: 'edit', groupId: 'productForm',
    preferred: { tag: 'stock-editor', reason: 'Supports deliberate editing.', indexReference: index, usageContractReference: usage },
  });
  const document = buildD2Page11DefinitionDocument(value);
  assert.deepEqual(document.moleculeRecommendations.map(item => [item.organismRef, item.role, item.preferred.tag]), [
    ['productList', 'browse', 'stock-list'], ['productForm', 'edit', 'stock-editor'],
  ]);
});

test('page11 rejects unknown content, journey, field, capability and incomplete coverage', () => {
  const changes: Array<[string, (value: D2Page11DefinitionInput) => void, RegExp]> = [
    ['content', value => { value.organisms[0].contentRef = 'missing'; }, /CONTENT_REF_MISSING/u],
    ['journey', value => { value.organisms[0].journeyRefs[0] = { ...journey, fragment: 'unknown' }; }, /REFERENCE_MISSING/u],
    ['field', value => { value.organisms[0].fieldRefs = [{ ...field, fragment: 'UnknownOutput.x' }]; }, /REFERENCE_MISSING/u],
    ['capability', value => { value.organisms[0].capabilityRefs = []; }, /CAPABILITY_COVERAGE/u],
    ['layout', value => { value.organisms[0].description = 'Use a two-column grid.'; }, /LAYOUT_PRESCRIPTION/u],
  ];
  for (const [name, change, code] of changes) {
    const value = input(); change(value);
    assert.throws(() => buildD2Page11DefinitionDocument(value), code, name);
  }
});

test('page11 parser requires supplied symbols and refuses execution metadata', () => {
  const document = buildD2Page11DefinitionDocument(input());
  const source = renderD2Page11DefinitionDocument('inventory', document, symbols);
  assert.throws(() => parseD2Page11DefinitionSource(source, []), /REFERENCE_MISSING/u);
  assert.throws(() => parseD2Page11DefinitionSource(source.replace('"artifactType": "page11",', '"artifactType": "page11", "pipeline": [],'), symbols), /EXECUTION_METADATA/u);
  assert.throws(() => parseD2Page11DefinitionSource(source.replace('/desktop/page11/', '/mobile/page11/'), symbols), /SOURCE_PATH/u);
});
