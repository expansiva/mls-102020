/// <mls fileReference="_102020_/l2/helpers/connections/declarationObject.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { declarationObjectOf } from '/_102020_/l2/helpers/connections/declarationObject.js';

void test('declarationObjectOf reads an export const catalog and a generated default declaration', () => {
  const catalog = declarationObjectOf('export const cm = { "connectionId": "cm", "operations": [] } as const;\n');
  assert.deepEqual(catalog, { connectionId: 'cm', operations: [] });

  const generated = [
    'const declaration: ExternalSystemDeclaration = { "connectionId": "github", "operations": [{ "operationId": "gravarArquivo" }] };',
    'export default declaration;',
  ].join('\n');
  assert.deepEqual(declarationObjectOf(generated), { connectionId: 'github', operations: [{ operationId: 'gravarArquivo' }] });
  assert.equal(declarationObjectOf('const declaration = { "a": 1 };'), null);
});
