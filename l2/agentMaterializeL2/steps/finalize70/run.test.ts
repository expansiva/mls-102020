/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/finalize70/run.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { m4OwnedFile } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { m4DefsInfo } from '/_102020_/l2/agentMaterializeL2/steps/input20/io.js';
import { storedHash } from '/_102020_/l2/agentMaterializeL2/steps/shared40/run.js';
import { pageReceiptInfo, pageSourceInfo } from '/_102020_/l2/agentMaterializeL2/steps/pages50/run.js';
import { configInfo, menuInfo, moduleDefsInfo, runM4Finalize, type M4FinalizePort } from '/_102020_/l2/agentMaterializeL2/steps/finalize70/run.js';

const root = new URL('../../../../../mls-102047/', import.meta.url);
const disk = (path: string) => readFileSync(new URL(path, root), 'utf8');
const identity = { project: 102047, module: 'reembolsoDespesas' };
const key = (info: Ns5FileInfo) => `${info.project}/l${info.level}/${info.folder}/${info.shortName}${info.extension}`;
const PAGES = ['despesas_aprovadas', 'despesas_da_equipe', 'inicio', 'minhas_despesas'];

/** An in-memory Studio with the real defs, menu and module of reembolsoDespesas, a CRLF config and pages50 receipts. */
async function memory(approved: string[]): Promise<M4FinalizePort & { files: Map<string, string>; writes: string[] }> {
  const files = new Map<string, string>();
  const writes: string[] = [];
  const put = (info: Ns5FileInfo, text: string) => files.set(key(info), text);
  put(m4OwnedFile(identity, 'input'), JSON.stringify({ accepted: PAGES, pages: [] }));
  for (const pageId of PAGES) {
    put(m4DefsInfo(identity, 'desktop', pageId), disk(`l2/reembolsoDespesas/web/desktop/page11/${pageId}.defs.ts`));
    put(m4DefsInfo(identity, 'shared', pageId), disk(`l2/reembolsoDespesas/web/shared/${pageId}.defs.ts`));
    if (!approved.includes(pageId)) continue;
    const source = `// page ${pageId}\n`;
    put(pageSourceInfo(identity, pageId, 'desktop'), source);
    put(pageReceiptInfo(identity, pageId, 'desktop'), JSON.stringify({ pageId, sourceHash: await storedHash(source) }));
  }
  put(menuInfo(identity), disk('l4/reembolsoDespesas/pool/l2/web/menu.json'));
  put(moduleDefsInfo(identity), disk('l4/reembolsoDespesas/module.defs.ts'));
  const config = { projects: { 102047: { type: 'client', modules: [{ moduleId: 'outro', basePath: '/outro' }, { moduleId: 'reembolsoDespesas', basePath: '/reembolsoDespesas', backendControllers: './l1/x' }] } } };
  put(configInfo(102047), `${JSON.stringify(config, null, 2)}\n`.replace(/\n/gu, '\r\n'));
  return {
    files, writes,
    exists: info => files.has(key(info)),
    read: async info => { const text = files.get(key(info)); if (text === undefined) throw new Error(`missing ${key(info)}`); return text; },
    readJson: async <T>(info: Ns5FileInfo) => { const text = files.get(key(info)); return text === undefined ? null : JSON.parse(text) as T; },
    writeText: async (info, text) => { writes.push(key(info)); files.set(key(info), text); },
    writeJson: async (info, value) => { files.set(key(info), JSON.stringify(value)); },
  };
}

test('registers the approved pages once, keeps the line ends and the other fields; a second run writes nothing', async () => {
  const port = await memory(PAGES);
  const first = await runM4Finalize(identity, port);
  assert.equal(first.receipt.written, true);
  assert.deepEqual(first.receipt.pages, PAGES);
  assert.deepEqual(port.writes, ['102047/l5//config.json']);
  const text = port.files.get('102047/l5//config.json')!;
  assert.ok(text.includes('\r\n') && !/[^\r]\n/u.test(text), 'CRLF kept');
  const modules = JSON.parse(text).projects['102047'].modules;
  assert.deepEqual(modules[0], { moduleId: 'outro', basePath: '/outro' }, 'another module is untouched');
  assert.equal(modules[1].backendControllers, './l1/x', 'the L1 field stays');
  assert.equal(modules[1].frontend.pages.length, 4);
  assert.deepEqual(modules[1].languages, ['pt-BR', 'en-US', 'es-ES']);
  const second = await runM4Finalize(identity, port);
  assert.equal(second.receipt.written, false);
  assert.deepEqual(port.writes, ['102047/l5//config.json'], 'nothing written the second time');
});

test('a page with no approved desktop page is left out and reported', async () => {
  const port = await memory(['inicio', 'minhas_despesas']);
  const { receipt } = await runM4Finalize(identity, port);
  assert.deepEqual(receipt.pages, ['inicio', 'minhas_despesas']);
  assert.deepEqual(receipt.notApproved, ['despesas_aprovadas', 'despesas_da_equipe']);
  const entry = JSON.parse(port.files.get('102047/l5//config.json')!).projects['102047'].modules[1];
  assert.deepEqual(entry.navigation.map((item: { id: string }) => item.id), ['minhas_despesas', 'inicio']);
});

test('no approved page at all writes nothing', async () => {
  const port = await memory([]);
  const { receipt } = await runM4Finalize(identity, port);
  assert.equal(receipt.written, false);
  assert.deepEqual(port.writes, []);
});
