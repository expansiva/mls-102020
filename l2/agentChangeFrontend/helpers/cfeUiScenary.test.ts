/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeUiScenary.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  commandScenaryValue,
  deriveUiScenaries,
  destructiveCommandIds,
  isDestructiveCommandName,
  type CfeUiScenaryCommand,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeUiScenary.js';
import {
  MONITOR_PAGE_ID,
  monitorAndUpdateTaskStatusCommands,
} from '/_102020_/l2/agentChangeFrontend/helpers/fixtures/monitorAndUpdateTaskStatusScenary.js';

test('monitorAndUpdateTaskStatus derives base, detail and decideTaskStatus', () => {
  const scenes = deriveUiScenaries(MONITOR_PAGE_ID, monitorAndUpdateTaskStatusCommands);
  assert.deepEqual(scenes.map(scene => scene.value), ['base', 'detail', 'decideTaskStatus']);
  assert.equal(scenes[0].kind, 'base');
  assert.equal(scenes[0].commandName, 'qryInspectTaskSummary');
  assert.deepEqual(scenes[0].preconditions, []);
  assert.equal(scenes[1].kind, 'detail');
  assert.equal(scenes[1].commandName, 'qryInspectTask');
  assert.deepEqual(scenes[1].preconditions, [`ui.${MONITOR_PAGE_ID}.input.qryInspectTask.taskId`]);
  assert.equal(scenes[2].kind, 'command');
  assert.equal(scenes[2].commandName, 'cmdDecideTaskStatus');
  assert.deepEqual(scenes[2].preconditions, [`ui.${MONITOR_PAGE_ID}.input.cmdDecideTaskStatus.taskId`]);
});

test('form required fields are not scenary preconditions', () => {
  const scenes = deriveUiScenaries(MONITOR_PAGE_ID, monitorAndUpdateTaskStatusCommands);
  const command = scenes.find(scene => scene.value === 'decideTaskStatus')!;
  assert.equal(command.preconditions.some(key => key.endsWith('.status')), false);
});

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
