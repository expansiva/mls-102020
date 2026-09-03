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
  listCfeLayerTraceKeys,
  nextPipelineRunNn,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfePipelineTrace.js';
import { cfRunLatestMlsPath, cfRunSnapshotMlsPath } from '/_102020_/l2/agentChangeFrontend/helpers/cfeRunReport.js';

void test('nextPipelineRunNn is deterministic from existing shortNames', () => {
  assert.equal(nextPipelineRunNn([], 'changefrontend'), '01');
  assert.equal(nextPipelineRunNn(['pipeline', 'e2-journeys-draft'], 'changefrontend'), '01');
  assert.equal(nextPipelineRunNn(['run01_changefrontend', 'run01_newsolution'], 'changefrontend'), '02');
  assert.equal(nextPipelineRunNn(['run01_changefrontend', 'run02_changefrontend', 'run04_changefrontend'], 'changefrontend'), '05');
});

void test('CF chokepoint is l4/<mod>/pipeline/trace/l2 and never a bare trace folder', () => {
  assert.equal(cfePipelineFolder('todo'), 'todo/pipeline');
  assert.equal(cfePipelineTraceFolder('todo'), 'todo/pipeline/trace/l2');
  assert.equal(cfePipelineTraceFolder('todo', 'frontend-materialize-verify'), 'todo/pipeline/trace/l2/frontend-materialize-verify');
  const info = cfePipelineTraceFileInfo('todo', 'materialize-phase-pages-verify-summary', 'frontend-materialize-verify', 102047);
  assert.equal(info.level, 4);
  assert.equal(info.folder, 'todo/pipeline/trace/l2/frontend-materialize-verify');
  assert.equal(info.extension, '.json');
  assert.equal(
    cfePipelineTraceMlsPath(102047, 'todo', 'frontend-page-split/page11', 'taskCatalogue.json'),
    '_102047_/l4/todo/pipeline/trace/l2/frontend-page-split/page11/taskCatalogue.json',
  );
  assert.equal(isCfeMaterializeVerifyFolder('todo/pipeline/trace/l2/frontend-materialize-verify', 'todo'), true);
  assert.equal(isCfeMaterializeVerifyFolder('todo/pipeline/trace/frontend-materialize-verify', 'todo'), false);
  assert.equal(isCfeMaterializeVerifyFolder('todo/trace/frontend-materialize-verify', 'todo'), false);
  assert.equal(isCfeMaterializeVerifyFolder('outro/pipeline/trace/l2/frontend-materialize-verify', 'todo'), false);
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

function assertTraceLayer(path: string, layer: 'l1' | 'l2'): void {
  const match = /\/pipeline\/trace(?:\/([^/]*))?/.exec(path);
  assert.ok(match, `expected /pipeline/trace in ${path}`);
  assert.equal(match[1], layer, `builder returned unlayered trace path: ${path}`);
}

void test('T5.1 CF builder path contains /pipeline/trace/l2/', () => {
  assert.match(cfePipelineTraceFolder('todo', 'frontend-materialize-verify'), /\/pipeline\/trace\/l2\//);
  assert.match(cfePipelineTraceMlsPath(1, 'todo', 'frontend-page-split/page11', 'x.json'), /\/pipeline\/trace\/l2\//);
  assert.match(cfRunLatestMlsPath(1, 'todo'), /\/pipeline\/trace\/l2\//);
});

void test('T5.2 /rebuild all of CF lists only this module trace/l2', () => {
  const files = {
    l2: { project: 1, level: 4, status: 'active', folder: 'petShop/pipeline/trace/l2/frontend-materialize-verify', shortName: 'a' },
    l2root: { project: 1, level: 4, status: 'active', folder: 'petShop/pipeline/trace/l2', shortName: 'cf-run' },
    l1: { project: 1, level: 4, status: 'active', folder: 'petShop/pipeline/trace/l1', shortName: 'cb-health-report' },
    neighbor: { project: 1, level: 4, status: 'active', folder: 'todo/pipeline/trace/l2', shortName: 'x' },
    gone: { project: 1, level: 4, status: 'deleted', folder: 'petShop/pipeline/trace/l2', shortName: 'old' },
  };
  assert.deepEqual(listCfeLayerTraceKeys(files, 1, 'petShop').sort(), ['l2', 'l2root']);
  const root = readFileSync(new URL('../agentChangeFrontend.ts', import.meta.url), 'utf8');
  assert.match(root, /command\.kind === 'rebuild-all' && command\.module/);
  assert.match(root, /clearCfeLayerTrace/);
  const scan = readFileSync(new URL('../steps/scan/agentCfeCreateScanL4.ts', import.meta.url), 'utf8');
  assert.match(scan, /scanArgs\.command === 'rebuild-all' && sweepModule/);
  assert.match(scan, /clearCfeLayerTrace/);
});

void test('T5.4 no CF trace builder returns /pipeline/trace/<algo> without the layer segment', () => {
  assertTraceLayer(cfePipelineTraceFolder('todo'), 'l2');
  assertTraceLayer(cfePipelineTraceFolder('todo', 'frontend-materialize-verify'), 'l2');
  assertTraceLayer(cfePipelineTraceFileInfo('todo', 'x', 'frontend-page-split/page11').folder, 'l2');
  assertTraceLayer(cfePipelineTraceMlsPath(1, 'todo', 'frontend-page-split/page11', 'x.json'), 'l2');
  assertTraceLayer(cfRunLatestMlsPath(1, 'todo'), 'l2');
  assertTraceLayer(cfRunSnapshotMlsPath(1, 'todo', 'stamp'), 'l2');
});
