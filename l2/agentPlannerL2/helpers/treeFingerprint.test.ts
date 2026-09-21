/// <mls fileReference="_102020_/l2/agentPlannerL2/helpers/treeFingerprint.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  changedOutside,
  diffTrees,
  pathUnder,
  snapshotEntries,
} from '/_102020_/l2/agentPlannerL2/helpers/treeFingerprint.js';
import { snapshotDir } from '/_102020_/l2/agentPlannerL2/helpers/nodejsTreeFingerprint.js';

void test('treeFingerprint.ts has no Node runtime imports', () => {
  const source = readFileSync(fileURLToPath(new URL('./treeFingerprint.ts', import.meta.url)), 'utf8');
  const specs = [...source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map(match => match[1]);
  assert.deepEqual(specs.filter(spec => spec.startsWith('node:')), []);
});

void test('snapshotDir plus diffTrees reports created, modified and deleted files', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'p2-tree-'));
  try {
    mkdirSync(path.join(root, 'l4', 'mod'), { recursive: true });
    mkdirSync(path.join(root, 'l2', 'mod', 'pipeline'), { recursive: true });
    writeFileSync(path.join(root, 'l4', 'mod', 'module.defs.ts'), 'canonical\n');
    writeFileSync(path.join(root, 'l2', 'mod', 'pipeline', 'pipeline.json'), '{}\n');
    const before = snapshotDir(root);

    writeFileSync(path.join(root, 'l4', 'mod', 'module.defs.ts'), 'changed\n');
    writeFileSync(path.join(root, 'l4', 'mod', 'rules.defs.ts'), 'new\n');
    rmSync(path.join(root, 'l2', 'mod', 'pipeline', 'pipeline.json'));
    const after = snapshotDir(root);

    const diff = diffTrees(before, after);
    assert.deepEqual(diff.created, ['l4/mod/rules.defs.ts']);
    assert.deepEqual(diff.modified, ['l4/mod/module.defs.ts']);
    assert.deepEqual(diff.deleted, ['l2/mod/pipeline/pipeline.json']);
    assert.deepEqual(changedOutside(diff, ['l4/mod/tobe/plan']), [
      'l2/mod/pipeline/pipeline.json',
      'l4/mod/module.defs.ts',
      'l4/mod/rules.defs.ts',
    ]);
    assert.deepEqual(changedOutside(diff, ['l4/mod', 'l2/mod']), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

void test('candidate mode: canonical menu is read, not written; writes stay under the override', () => {
  const before = snapshotEntries([
    { rel: 'l4/mod/pool/l2/web/menu.json', fingerprint: 'canonical-menu' },
    { rel: 'l2/mod/pipeline/pipeline.json', fingerprint: 'canonical-pipe' },
  ]);
  const after = snapshotEntries([
    { rel: 'l4/mod/pool/l2/web/menu.json', fingerprint: 'canonical-menu' },
    { rel: 'l2/mod/pipeline/pipeline.json', fingerprint: 'canonical-pipe' },
    { rel: 'l4/mod/tobe/plan/pool/l2/web/menu.json', fingerprint: 'candidate-menu' },
    { rel: 'l4/mod/tobe/plan/pool/l2/web/l4diff.json', fingerprint: 'diff' },
    { rel: 'l2/mod/tobe/plan/pipeline/pipeline.json', fingerprint: 'candidate-pipe' },
  ]);
  const diff = diffTrees(before, after);
  assert.deepEqual(diff.modified, []);
  assert.deepEqual(diff.deleted, []);
  assert.equal(diff.created.includes('l4/mod/pool/l2/web/menu.json'), false);
  assert.deepEqual(changedOutside(diff, ['l4/mod/tobe/plan', 'l2/mod/tobe/plan', 'l1/mod/tobe/plan']), []);
});

void test('snapshotEntries and pathUnder work without touching disk', () => {
  const before = snapshotEntries([
    { rel: 'l2/mod/pipeline/pipeline.json', fingerprint: 'a' },
    { rel: 'l4/mod/tobe/plan/pipeline/pipeline.json', fingerprint: 'b' },
  ]);
  const after = snapshotEntries([
    { rel: 'l2/mod/pipeline/pipeline.json', fingerprint: 'a' },
    { rel: 'l4/mod/tobe/plan/pipeline/pipeline.json', fingerprint: 'c' },
    { rel: 'l2/mod/tobe/plan/pipeline/pipeline.json', fingerprint: 'd' },
  ]);
  const diff = diffTrees(before, after);
  assert.deepEqual(diff.created, ['l2/mod/tobe/plan/pipeline/pipeline.json']);
  assert.deepEqual(diff.modified, ['l4/mod/tobe/plan/pipeline/pipeline.json']);
  assert.deepEqual(diff.deleted, []);
  assert.equal(pathUnder('l2/mod/tobe/plan/pipeline/pipeline.json', 'l2/mod/tobe/plan'), true);
  assert.equal(pathUnder('l2/mod/pipeline/pipeline.json', 'l2/mod/tobe/plan'), false);
  assert.deepEqual(changedOutside(diff, ['l4/mod/tobe/plan', 'l2/mod/tobe/plan', 'l1/mod/tobe/plan']), []);
});
