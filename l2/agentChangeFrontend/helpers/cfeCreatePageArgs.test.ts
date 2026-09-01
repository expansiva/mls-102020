/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeCreatePageArgs.test.ts" enhancement="_blank"/>
import test, { after } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Page-queue args are { moduleName, pageId, runId }. A producer that omits moduleName
 * turns prepareCreateRunPage into a search for '' and the run dies three steps later.
 * Compile-time: CfeCreatePageArgs + cfeCreatePageArgs. Runtime: this parser still
 * refuses incomplete JSON, because the queue string comes from outside tsc.
 */

const PROJECT = 102049;
const g = globalThis as unknown as Record<string, any>;
const priorMls = g.mls;
after(() => { g.mls = priorMls; });

async function loadParse(): Promise<(prompt: string | undefined) => { moduleName: string; pageId: string; runId: string }> {
  if (!g.window) g.window = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  if (!g.document) g.document = { documentElement: { lang: 'pt-BR' }, addEventListener() {}, removeEventListener() {}, createElement: () => ({ style: {} }) };
  if (!g.mls) g.mls = { actualProject: PROJECT, stor: { files: {} } };
  if (!g.mls.events) g.mls.events = { addEventListener() {}, removeEventListener() {}, dispatch() {} };
  if (!g.mls.stor) g.mls.stor = { files: {} };
  const mod = await import('/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js');
  return mod.parseCreatePageArgs;
}

void test('parseCreatePageArgs refuses args without moduleName instead of searching for empty', async () => {
  const parseCreatePageArgs = await loadParse();
  assert.throws(() => parseCreatePageArgs(JSON.stringify({ pageId: 'landing', runId: 'r1' })), /invalid page args/);
  assert.throws(() => parseCreatePageArgs(JSON.stringify({ pageId: 'landing', runId: 'r1', moduleName: '' })), /invalid page args/);
  assert.throws(() => parseCreatePageArgs(JSON.stringify({ pageId: 'landing', runId: 'r1', moduleName: '   ' })), /invalid page args/);
  assert.throws(() => parseCreatePageArgs(JSON.stringify({ moduleName: 'modA', runId: 'r1' })), /invalid page args/);
  assert.throws(() => parseCreatePageArgs(JSON.stringify({ moduleName: 'modA', pageId: 'landing' })), /invalid page args/);
  assert.deepEqual(
    parseCreatePageArgs(JSON.stringify({ moduleName: 'modA', pageId: 'landing', runId: 'r1' })),
    { moduleName: 'modA', pageId: 'landing', runId: 'r1' },
  );
});
