/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/fixtures/monitorAndUpdateTaskStatusScenary.ts" enhancement="_blank"/>

// Byte-stable copy of the 102047 monitorAndUpdateTaskStatus command shapes that drive
// uiScenary derivation. Live mls-102047 is discarded on rebuild — tests must not read it.

import type { CfeUiScenaryCommand } from '/_102020_/l2/agentChangeFrontend/helpers/cfeUiScenary.js';

export const MONITOR_PAGE_ID = 'monitorAndUpdateTaskStatus';

export const monitorAndUpdateTaskStatusCommands: CfeUiScenaryCommand[] = [
  {
    commandName: 'qryInspectTaskSummary',
    kind: 'query',
    accessKind: 'list',
    selection: 'single',
    outputShape: 'array',
    input: [],
  },
  {
    commandName: 'qryLocateTask',
    kind: 'query',
    accessKind: 'list',
    selection: 'single',
    outputShape: 'array',
    input: [],
  },
  {
    commandName: 'qryInspectTask',
    kind: 'query',
    accessKind: 'getById',
    selection: 'none',
    outputShape: 'object',
    input: [{ name: 'taskId', required: true, presentation: 'route', source: 'routeParam' }],
  },
  {
    commandName: 'cmdDecideTaskStatus',
    kind: 'command',
    accessKind: 'transition',
    selection: 'none',
    outputShape: 'object',
    input: [
      { name: 'taskId', required: true, presentation: 'route', source: 'routeParam' },
      { name: 'status', required: true, presentation: 'form', source: 'userInput' },
    ],
  },
];
