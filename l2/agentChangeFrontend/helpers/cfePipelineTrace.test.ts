/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfePipelineTrace.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  cfePipelineFolder,
  cfePipelineTraceFolder,
  cfePipelineTraceFileInfo,
  cfePipelineTraceMlsPath,
  describeAgentCommand,
  isCfeMaterializeVerifyFolder,
  nextPipelineRunNn,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfePipelineTrace.js';

void test('nextPipelineRunNn is deterministic from existing shortNames', () => {
  assert.equal(nextPipelineRunNn([], 'changefrontend'), '01');
  assert.equal(nextPipelineRunNn(['pipeline', 'e2-journeys-draft'], 'changefrontend'), '01');
  assert.equal(nextPipelineRunNn(['run01_changefrontend', 'run01_newsolution'], 'changefrontend'), '02');
  assert.equal(nextPipelineRunNn(['run01_changefrontend', 'run02_changefrontend', 'run04_changefrontend'], 'changefrontend'), '05');
});

void test('CF chokepoint is l4/<mod>/pipeline/trace and never a bare trace folder', () => {
  assert.equal(cfePipelineFolder('todo'), 'todo/pipeline');
  assert.equal(cfePipelineTraceFolder('todo'), 'todo/pipeline/trace');
  assert.equal(cfePipelineTraceFolder('todo', 'frontend-materialize-verify'), 'todo/pipeline/trace/frontend-materialize-verify');
  const info = cfePipelineTraceFileInfo('todo', 'materialize-phase-pages-verify-summary', 'frontend-materialize-verify', 102047);
  assert.equal(info.level, 4);
  assert.equal(info.folder, 'todo/pipeline/trace/frontend-materialize-verify');
  assert.equal(info.extension, '.json');
  assert.equal(
    cfePipelineTraceMlsPath(102047, 'todo', 'frontend-page-split/page11', 'taskCatalogue.json'),
    '_102047_/l4/todo/pipeline/trace/frontend-page-split/page11/taskCatalogue.json',
  );
  assert.equal(isCfeMaterializeVerifyFolder('todo/pipeline/trace/frontend-materialize-verify', 'todo'), true);
  assert.equal(isCfeMaterializeVerifyFolder('todo/trace/frontend-materialize-verify', 'todo'), true);
  assert.equal(isCfeMaterializeVerifyFolder('outro/pipeline/trace/frontend-materialize-verify', 'todo'), false);
});

void test('describeAgentCommand keeps /fast and /rebuild from longMemory', () => {
  assert.equal(describeAgentCommand({ fastMode: 'true', cliCommand: 'rebuild-all' }), '/fast /rebuild all');
  assert.equal(describeAgentCommand({ cliCommand: 'rebuild-defs' }), '/rebuild defs');
  assert.equal(describeAgentCommand({}, '@@changeFrontend'), '@@changeFrontend');
});

void test('CF writers go through cfePipelineTraceFileInfo; leftover /trace/ strings are readers of the previous path', () => {
  const shared = readFileSync(new URL('./cfeCreateShared.ts', import.meta.url), 'utf8');
  assert.match(shared, /cfePipelineTraceFileInfo\(/);
  assert.doesNotMatch(shared, /level:\s*2,\s*\n\s*folder:\s*`\$\{[^}]+\}(?:\/trace\/)/);
  const gen = readFileSync(new URL('../steps/materialize/agentCfeMaterializeGen.ts', import.meta.url), 'utf8');
  assert.match(gen, /recordCfeDegradation\(/);
  assert.doesNotMatch(gen, /console\.info\(/);
  assert.match(gen, /cfePipelineTraceMlsPath\(/);
});
