import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildD2SharedV2, parseD2SharedV2, renderD2SharedV2, type D2SharedV2Definition } from './format.ts';

const location = { project: 102020, module: 'modulo', pageId: 'pagina' };

const shared: D2SharedV2Definition = {
  entry: { params: { filtro: { type: 'string', sources: ['url'], effect: 'filter', persist: false, required: true } } },
  requests: { lista: { kind: 'qry', trigger: 'buscar', returns: ['Lista'] } },
  states: { lista: { source: 'lista', description: 'a lista', organisms: ['tabela'] } },
  journeys: [
    { step: 'ver', organisms: ['tabela'] },
    { step: 'seguir', organisms: ['tabela'], continuesIn: 'outra' },
  ],
  rules: [],
  access: { actors: ['usuario'], grants: ['ler'] },
};

test('render then parse returns the same definition', () => {
  const parsed = parseD2SharedV2(renderD2SharedV2(location, shared));
  assert.deepEqual(parsed.location, location);
  assert.deepEqual(parsed.definition, shared);
});

test('shared from before 2026-10-13 is refused', () => {
  const source = readFileSync(new URL('./fixtures/minhas_despesas_ate_20261013.defs.txt', import.meta.url), 'utf8');
  assert.throws(() => parseD2SharedV2(source), /D2_SHARED_V2_KEYS: forbidden field forms/);
});

test('param without required is refused', () => {
  const { required: _required, ...param } = shared.entry.params.filtro;
  const value = { ...shared, entry: { params: { filtro: param } } };
  assert.throws(() => buildD2SharedV2(value), /D2_SHARED_V2_PARAM: filtro: missing field required/);
});
