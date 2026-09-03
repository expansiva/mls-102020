/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeMemberNames.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { commandMemberNames, dedupeSharedStateNames } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMemberNames.js';

test('commandMemberNames reserves method and handler names per command kind', () => {
  const reserved = commandMemberNames([
    { commandName: 'listClients', kind: 'query' },
    { commandName: 'updateWorkTaskStatus', kind: 'command' },
  ]);
  assert.deepEqual([...reserved].sort(), [
    'handleListClientsClick',
    'handleUpdateWorkTaskStatusClick',
    'loadListClients',
    'updateWorkTaskStatus',
  ]);
});

test('dedupeSharedStateNames renames the real projectDetail collision to ...Value', () => {
  // mls-102045 projectDetail: input updateWorkTask.status derived the name `updateWorkTaskStatus`,
  // colliding with the methodName of operation updateWorkTaskStatus.
  const states: Record<string, unknown>[] = [
    { stateKey: 'ui.projectDetail.input.updateWorkTask.status', name: 'updateWorkTaskStatus', kind: 'input' },
    { stateKey: 'ui.projectDetail.action.updateWorkTaskStatus.status', name: 'updateWorkTaskStatusState', kind: 'actionStatus' },
  ];
  const reserved = commandMemberNames([
    { commandName: 'updateWorkTask', kind: 'command' },
    { commandName: 'updateWorkTaskStatus', kind: 'command' },
  ]);
  const renames = dedupeSharedStateNames(states, reserved);
  assert.equal(states[0].name, 'updateWorkTaskStatusValue');
  assert.equal(states[1].name, 'updateWorkTaskStatusState');
  assert.deepEqual(renames, ['updateWorkTaskStatus -> updateWorkTaskStatusValue']);
});

test('dedupeSharedStateNames also protects the derived setter pair of input states', () => {
  // A command named `setPrice` claims the member `setPrice` — an input state named `price` would
  // derive the SAME setter name, so the state must be renamed even though `price` itself is free.
  const states: Record<string, unknown>[] = [
    { stateKey: 'ui.pg.input.updateItem.price', name: 'price', kind: 'input' },
  ];
  const reserved = commandMemberNames([{ commandName: 'setPrice', kind: 'command' }]);
  const renames = dedupeSharedStateNames(states, reserved);
  assert.equal(states[0].name, 'priceValue');
  assert.deepEqual(renames, ['price -> priceValue']);
});

test('dedupeSharedStateNames escalates the numeric suffix until a free name is found', () => {
  const states: Record<string, unknown>[] = [
    { stateKey: 'k1', name: 'thing', kind: 'actionError' },
    { stateKey: 'k2', name: 'thing', kind: 'actionError' },
    { stateKey: 'k3', name: 'thing', kind: 'actionError' },
  ];
  const renames = dedupeSharedStateNames(states, new Set());
  assert.equal(states[0].name, 'thing');
  assert.equal(states[1].name, 'thingValue');
  assert.equal(states[2].name, 'thingValue2');
  assert.equal(renames.length, 2);
});

test('dedupeSharedStateNames leaves collision-free defs untouched', () => {
  const states: Record<string, unknown>[] = [
    { stateKey: 'k1', name: 'status', kind: 'pageStatus' },
    { stateKey: 'k2', name: 'listClientsData', kind: 'queryResult' },
  ];
  const renames = dedupeSharedStateNames(states, commandMemberNames([{ commandName: 'listClients', kind: 'query' }]));
  assert.deepEqual(renames, []);
  assert.equal(states[0].name, 'status');
  assert.equal(states[1].name, 'listClientsData');
});
