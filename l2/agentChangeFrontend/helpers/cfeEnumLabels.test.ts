/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeEnumLabels.test.ts" enhancement="_blank"/>
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enumDisplayLabel, enumDisplayOptions, enumLabelFallbackWarnings, missingEnumDisplayCodes, readEnumLabels,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeEnumLabels.js';

test('enumDisplayLabel prefers the authored label and falls back to the code', () => {
  const labels = [{ code: 'active', label: 'Ativo' }, { code: 'inactive', label: 'Inativo' }];
  assert.equal(enumDisplayLabel('active', labels), 'Ativo');
  assert.equal(enumDisplayLabel('monday', labels), 'monday');
  assert.equal(enumDisplayLabel('active'), 'active');
  assert.deepEqual(enumDisplayOptions(['active', 'inactive'], labels), [
    { value: 'active', label: 'Ativo' },
    { value: 'inactive', label: 'Inativo' },
  ]);
});

test('missing enumLabels is a recorded CF degradation and still paints the wire code', () => {
  assert.deepEqual(missingEnumDisplayCodes(['low', 'medium'], [{ code: 'low', label: 'Baixa' }]), ['medium']);
  assert.deepEqual(enumDisplayOptions(['low', 'medium'], [{ code: 'low', label: 'Baixa' }]), [
    { value: 'low', label: 'Baixa' },
    { value: 'medium', label: 'medium' },
  ]);
  const warnings = enumLabelFallbackWarnings({
    entityId: 'Task',
    fields: [
      { fieldId: 'status', enum: ['pending', 'inProgress'] },
      { fieldId: 'priority', enum: ['low', 'medium', 'high'] },
    ],
    lifecycleLabels: [{ code: 'pending', label: 'Pendente' }, { code: 'inProgress', label: 'Em andamento' }],
  });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Task field priority/);
  assert.match(warnings[0], /wire still sends the code/);
});

test('readEnumLabels keeps closed {code,label} objects and drops junk', () => {
  assert.deepEqual(readEnumLabels([
    { code: 'active', label: 'Ativo' },
    { code: 'active', label: 'duplicate ignored' },
    { foo: 'bar' },
    'active',
  ]), [{ code: 'active', label: 'Ativo' }]);
  assert.deepEqual(readEnumLabels(undefined), []);
});
