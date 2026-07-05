/// <mls fileReference="_102020_/l2/agentNewSolution2/ns2ModuleConsistency.test.ts" enhancement="_blank"/>
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectModuleConsistencyIssues,
  formatModuleConsistencyIssues,
} from '/_102020_/l2/agentNewSolution2/ns2ModuleConsistency.js';

test('collectModuleConsistencyIssues rejects l5 module entries without matching artifacts', () => {
  const issues = collectModuleConsistencyIssues({
    projectJsonPresent: true,
    projectModules: ['cafeFlow'],
    artifactModules: [],
  });

  assert.deepEqual(issues, [{
    code: 'project-module-missing-artifacts',
    moduleName: 'cafeFlow',
  }]);
  assert.match(formatModuleConsistencyIssues(issues), /declared in l5\/project\.json but has no l1\/l2\/l4\/l5 module artifacts/);
});

test('collectModuleConsistencyIssues rejects module artifacts missing from l5 project modules', () => {
  const issues = collectModuleConsistencyIssues({
    projectJsonPresent: true,
    projectModules: ['cafeFlow'],
    artifactModules: [{ moduleName: 'cafeFlow2', levels: [4, 5] }],
  });

  assert.deepEqual(issues, [
    {
      code: 'project-module-missing-artifacts',
      moduleName: 'cafeFlow',
    },
    {
      code: 'artifact-module-missing-project',
      moduleName: 'cafeFlow2',
      levels: [4, 5],
    },
  ]);
});

test('collectModuleConsistencyIssues allows the module currently being merged', () => {
  const issues = collectModuleConsistencyIssues({
    projectJsonPresent: true,
    projectModules: ['existingModule'],
    artifactModules: [
      { moduleName: 'existingModule', levels: [4, 5] },
      { moduleName: 'cafeFlow', levels: [4] },
    ],
    allowPendingModuleName: 'cafeFlow',
  });

  assert.deepEqual(issues, []);
});

