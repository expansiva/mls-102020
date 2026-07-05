/// <mls fileReference="_102020_/l2/agentNewSolution2/ns2ProjectMetadata.test.ts" enhancement="_blank"/>
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDefaultProjectMetadata, projectIdToRuntimePort } from '/_102020_/l2/agentNewSolution2/ns2ProjectMetadata.js';

test('projectIdToRuntimePort maps project ids into the 2000-2999 runtime range', () => {
  assert.equal(projectIdToRuntimePort('5030'), 2030);
  assert.equal(projectIdToRuntimePort(102050), 2050);
  assert.equal(projectIdToRuntimePort('102999'), 2999);
});

test('buildDefaultProjectMetadata prepares l5/project.json visible runtime metadata', () => {
  assert.deepEqual(buildDefaultProjectMetadata('102050'), {
    projectId: '102050',
    domain: '102050.collab.codes',
    port: 2050,
    databaseName: 'collab_102050',
    environment: 'production',
    studioEnabled: true,
  });
});
