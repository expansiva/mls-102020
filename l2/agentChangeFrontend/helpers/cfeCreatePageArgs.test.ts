/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeCreatePageArgs.test.ts" enhancement="_blank"/>
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Page-queue args are { moduleName, pageId, runId }. A producer that omits moduleName
 * turns prepareCreateRunPage into a search for '' and the run dies three steps later.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const SELF = fileURLToPath(import.meta.url);
const PROJECT = 102049;
const g = globalThis as unknown as Record<string, any>;
const priorMls = g.mls;
after(() => { g.mls = priorMls; });

async function loadParse(): Promise<(prompt: string | undefined) => { moduleName: string; pageId: string }> {
  if (!g.window) g.window = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  if (!g.document) g.document = { documentElement: { lang: 'pt-BR' }, addEventListener() {}, removeEventListener() {}, createElement: () => ({ style: {} }) };
  if (!g.mls) g.mls = { actualProject: PROJECT, stor: { files: {} } };
  if (!g.mls.events) g.mls.events = { addEventListener() {}, removeEventListener() {}, dispatch() {} };
  if (!g.mls.stor) g.mls.stor = { files: {} };
  const mod = await import('/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js');
  return mod.parseCreatePageArgs;
}

function walkTs(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walkTs(full, out);
    else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts') && full !== SELF) out.push(full);
  }
  return out;
}

void test('parseCreatePageArgs refuses args without moduleName instead of searching for empty', async () => {
  const parseCreatePageArgs = await loadParse();
  assert.throws(() => parseCreatePageArgs(JSON.stringify({ pageId: 'landing', runId: 'r1' })), /invalid page args/);
  assert.throws(() => parseCreatePageArgs(JSON.stringify({ pageId: 'landing', runId: 'r1', moduleName: '' })), /invalid page args/);
  assert.throws(() => parseCreatePageArgs(JSON.stringify({ pageId: 'landing', runId: 'r1', moduleName: '   ' })), /invalid page args/);
  assert.throws(() => parseCreatePageArgs(JSON.stringify({ moduleName: 'modA', runId: 'r1' })), /invalid page args/);
  assert.deepEqual(
    parseCreatePageArgs(JSON.stringify({ moduleName: 'modA', pageId: 'landing', runId: 'r1' })),
    { moduleName: 'modA', pageId: 'landing' },
  );
});

void test('every page-args producer emits moduleName; a new producer without it fails here', () => {
  const producers: { rel: string; emit: RegExp }[] = [
    { rel: 'steps/scan/agentCfeCreateScanL4.ts', emit: /JSON\.stringify\(\{\s*moduleName:\s*page\.moduleName,\s*pageId:\s*page\.pageId,\s*runId\s*\}\)/ },
    { rel: 'helpers/cfeCreateShared.ts', emit: /pages\.map\(page => \(\{\s*moduleName:\s*page\.moduleName,\s*pageId:\s*page\.pageId,\s*runId\s*\}\)\)/ },
    { rel: 'helpers/cfeCreateShared.ts', emit: /args\.push\(\{\s*moduleName:\s*page\.moduleName,\s*pageId:\s*page\.pageId,/ },
  ];
  assert.equal(producers.length, 3, 'the three known page-args producers; add the fourth here and require moduleName');
  for (const producer of producers) {
    const src = readFileSync(path.join(ROOT, producer.rel), 'utf8');
    assert.match(src, producer.emit, producer.rel);
  }

  const offences: string[] = [];
  for (const file of walkTs(ROOT)) {
    const src = readFileSync(file, 'utf8');
    for (const match of src.matchAll(/JSON\.stringify\(\{([^}]*)\}\)/g)) {
      const inner = match[1];
      if (!/\bpageId\b/.test(inner) || !/\brunId\b/.test(inner)) continue;
      if (!/\bmoduleName\b/.test(inner)) {
        offences.push(`${path.relative(ROOT, file)}: page-queue stringify omits moduleName: ${match[0]}`);
      }
    }
  }
  assert.deepEqual(offences, [], offences.join('\n'));

  const flow = JSON.parse(readFileSync(path.join(ROOT, 'flow.json'), 'utf8')) as {
    steps: Array<{ planId?: string; dynamicArgs?: { shape?: Record<string, string> } }>;
  };
  for (const step of flow.steps) {
    const shape = step.dynamicArgs?.shape;
    if (!shape || !shape.pageId || !shape.runId) continue;
    assert.equal(shape.moduleName, 'string', `${step.planId} dynamicArgs.shape is missing moduleName`);
  }
});
