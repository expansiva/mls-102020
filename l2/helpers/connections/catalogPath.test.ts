/// <mls fileReference="_102020_/l2/helpers/connections/catalogPath.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogFilePath, catalogImportPath, externalConnectionId } from '/_102020_/l2/helpers/connections/catalogPath.js';

test('a valid connectionId is the catalog file and the import specifier', () => {
  assert.equal(catalogFilePath('cm'), '/_102034_/l2/shared/contracts/connections/cm.ts');
  assert.equal(catalogImportPath('cm'), '/_102034_/l2/shared/contracts/connections/cm.js');
});

test('an external entity is read by connectionId alone', () => {
  assert.equal(externalConnectionId({ kind: 'external', connectionId: 'cm', source: '/old/catalog.defs.ts' }), 'cm');
  assert.equal(externalConnectionId({ connectionId: 'platform' }), 'platform');
});

test('a missing or invalid connectionId finds no catalog', () => {
  assert.equal(externalConnectionId({ kind: 'external', source: '/old/catalog.defs.ts' }), '');
  assert.equal(externalConnectionId({ connectionId: '../cm' }), '');
  assert.equal(externalConnectionId({ connectionId: '' }), '');
  assert.equal(externalConnectionId(null), '');
  assert.equal(catalogFilePath('cm.ts'), '');
  assert.equal(catalogImportPath(''), '');
});
