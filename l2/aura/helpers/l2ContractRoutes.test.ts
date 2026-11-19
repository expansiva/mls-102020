/// <mls fileReference="_102020_/l2/aura/helpers/l2ContractRoutes.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { callsRoute, checkContractRoutes, contractRoutes, parseArtifactData, type ContractSource } from '/_102020_/l2/aura/helpers/l2ContractRoutes.js';

const CONTRACT = `export interface InicioContracts {
  'tarefas.inicio.load': { input: { id: string }; output: { 'nested.key': string } };
  "tarefas.inicio.save"?: { input: {}; output: {} };
}`;

const source = (folder: string, shortName: string, extension: string, content: string, project = 102047): ContractSource => ({ project, folder, shortName, extension, content });

test('contractRoutes: only the first-level quoted keys of the Contracts interface', () => {
  assert.deepEqual(contractRoutes(CONTRACT), ['tarefas.inicio.load', 'tarefas.inicio.save']);
  assert.deepEqual(contractRoutes('export const x = 1;'), []);
});

test('callsRoute: the route as an argument of a file that uses execBff, not a type position', () => {
  assert.equal(callsRoute(`execBff<Output<'tarefas.inicio.load'>>('tarefas.inicio.load', {})`, 'tarefas.inicio.load'), true);
  assert.equal(callsRoute(`this.query('tarefas.inicio.load', x); execBff(request)`, 'tarefas.inicio.load'), true);
  assert.equal(callsRoute(`type R = Output<'tarefas.inicio.load'>; execBff(r)`, 'tarefas.inicio.load'), false);
  assert.equal(callsRoute(`call('tarefas.inicio.load')`, 'tarefas.inicio.load'), false, 'no execBff in the file');
});

test('parseArtifactData: unwraps data of the artifact block', () => {
  assert.deepEqual(parseArtifactData('export const a = {"data":{"handlers":[]}} as const;'), { handlers: [] });
  assert.equal(parseArtifactData('nothing here'), undefined);
});

test('checkContractRoutes: every declared route, called and handled or not', () => {
  const rows = checkContractRoutes(
    [source('tarefas/web/contracts', 'inicio', '.defs.ts', CONTRACT)],
    [source('tarefas/web/shared', 'inicio', '.ts', `execBff('tarefas.inicio.load', {})`)],
    [source('tarefas/layer_1_external/adapters/http/controllers', 'inicio', '.defs.ts', 'export const c = {"handlers":[{"route":"tarefas.inicio.load"}]} as const;')],
  );
  assert.deepEqual(rows.map(row => [row.routeName, row.calledInFrontend, row.existsInBackend, row.hasIssue]), [['load', true, true, false], ['save', false, false, true]]);
  assert.equal(rows[0].contractPath, 'tarefas/web/contracts/inicio.defs.ts');
  assert.equal(rows[0].sharedPath, 'tarefas/web/shared/inicio.ts');
  assert.equal(rows[0].backendPath, 'tarefas/layer_1_external/adapters/http/controllers/inicio.ts');
  assert.equal(rows[0].backendProject, 102047);
});
