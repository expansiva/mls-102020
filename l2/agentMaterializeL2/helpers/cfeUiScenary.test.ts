/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/cfeUiScenary.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  commandScenaryValue,
  deriveUiScenaries,
  destructiveCommandIds,
  isDestructiveCommandName,
  type CfeUiScenaryCommand,
} from '/_102020_/l2/agentMaterializeL2/helpers/cfeUiScenary.js';

test('one query only still emits a constant base uiScenary', () => {
  const commands: CfeUiScenaryCommand[] = [{
    commandName: 'qryListThings',
    kind: 'query',
    accessKind: 'list',
    outputShape: 'array',
    input: [],
  }];
  const scenes = deriveUiScenaries('things', commands);
  assert.deepEqual(scenes, [{ value: 'base', kind: 'base', commandName: 'qryListThings', preconditions: [] }]);
});

test('destructive delete/cancel commands are marked and never become scenes', () => {
  assert.equal(isDestructiveCommandName('cmdDeleteTask'), true);
  assert.equal(isDestructiveCommandName('deleteTask'), true);
  assert.equal(isDestructiveCommandName('cmdCancelOrder'), true);
  assert.equal(isDestructiveCommandName('cmdDecideTaskStatus'), false);
  assert.equal(isDestructiveCommandName('cmdCancelledStatus'), false);
  const commands: CfeUiScenaryCommand[] = [
    { commandName: 'qryListTask', kind: 'query', accessKind: 'list', outputShape: 'array', input: [] },
    {
      commandName: 'cmdDeleteTask',
      kind: 'command',
      accessKind: 'commandInput',
      input: [{ name: 'taskId', required: true, presentation: 'selection', source: 'selectedEntity' }],
    },
  ];
  const scenes = deriveUiScenaries('tasks', commands);
  assert.deepEqual(scenes.map(scene => scene.value), ['base']);
  assert.deepEqual(destructiveCommandIds(commands), ['cmdDeleteTask']);
});

test('commandScenaryValue strips the cmd prefix', () => {
  assert.equal(commandScenaryValue('cmdDecideTaskStatus'), 'decideTaskStatus');
  assert.equal(commandScenaryValue('decideTaskStatus'), 'decideTaskStatus');
});
