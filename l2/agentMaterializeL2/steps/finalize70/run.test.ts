/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/finalize70/run.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { m4OwnedFile } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { m4DefsInfo } from '/_102020_/l2/agentMaterializeL2/steps/input20/io.js';
import { pageSourceInfo } from '/_102020_/l2/agentMaterializeL2/steps/pages50/run.js';
import { configInfo, formatM4FinalizeReport, menuInfo, moduleDefsInfo, runM4Finalize, type M4FinalizePort, type M4FinalizeReceipt } from '/_102020_/l2/agentMaterializeL2/steps/finalize70/run.js';

const root = new URL('../../../../../mls-102047/', import.meta.url);
const disk = (path: string) => readFileSync(new URL(path, root), 'utf8');
const identity = { project: 102047, module: 'reembolsoDespesas' };
const key = (info: Ns5FileInfo) => `${info.project}/l${info.level}/${info.folder}/${info.shortName}${info.extension}`;
const PAGES = ['despesas_aprovadas', 'despesas_da_equipe', 'inicio', 'minhas_despesas'];

function navItem(id: string) {
  return { id, label: id, href: `/reembolsoDespesas/${id}`, description: id, actors: ['colaborador'] };
}
function frontendPage(id: string) {
  return { pageId: id, route: `/reembolsoDespesas/${id}`, source: `l2/reembolsoDespesas/web/desktop/page11/${id}.ts`, definition: `l2/reembolsoDespesas/web/desktop/page11/${id}.defs.ts`, componentTag: `reembolsoDespesas--web--desktop--page11--${id}-102047`, title: id, actors: ['colaborador'] };
}

/** An in-memory Studio with the real defs, menu and module of reembolsoDespesas and a CRLF config. No page receipt. */
async function memory(approved: string[], opts: { accepted?: string[]; current?: Record<string, unknown> } = {}): Promise<M4FinalizePort & { files: Map<string, string>; writes: string[] }> {
  const files = new Map<string, string>();
  const writes: string[] = [];
  const put = (info: Ns5FileInfo, text: string) => files.set(key(info), text);
  const accepted = opts.accepted ?? PAGES;
  put(m4OwnedFile(identity, 'input'), JSON.stringify({ accepted, pages: [] }));
  for (const pageId of PAGES) {
    put(m4DefsInfo(identity, 'desktop', pageId), disk(`l2/reembolsoDespesas/web/desktop/page11/${pageId}.defs.ts`));
    put(m4DefsInfo(identity, 'shared', pageId), disk(`l2/reembolsoDespesas/web/shared/${pageId}.defs.ts`));
    if (!approved.includes(pageId)) continue;
    put(pageSourceInfo(identity, pageId, 'desktop'), `// page ${pageId}\n`);
  }
  put(menuInfo(identity), disk('l4/reembolsoDespesas/pool/l2/web/menu.json'));
  put(moduleDefsInfo(identity), disk('l4/reembolsoDespesas/module.defs.ts'));
  const config = { projects: { 102047: { type: 'client', modules: [{ moduleId: 'outro', basePath: '/outro' }, { moduleId: 'reembolsoDespesas', basePath: '/reembolsoDespesas', backendControllers: './l1/x', ...opts.current }] } } };
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

test('registers a desktop page that exists and has no receipt; keeps the line ends; a second run writes nothing', async () => {
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

test('a registered page with a stale desktop receipt stays in the menu and is reported as kept', async () => {
  const registered = ['minhas_despesas', 'inicio', 'despesas_da_equipe', 'despesas_aprovadas'];
  const port = await memory(['inicio', 'minhas_despesas'], {
    current: { navigation: registered.map(navItem), frontend: { pages: registered.map(frontendPage) } },
  });
  const { receipt } = await runM4Finalize(identity, port);
  assert.deepEqual(receipt.pages, ['inicio', 'minhas_despesas']);
  assert.deepEqual(receipt.notApproved, ['despesas_aprovadas', 'despesas_da_equipe']);
  assert.deepEqual(receipt.kept, ['despesas_aprovadas', 'despesas_da_equipe']);
  const entry = JSON.parse(port.files.get('102047/l5//config.json')!).projects['102047'].modules[1];
  assert.deepEqual(entry.navigation.map((item: { id: string }) => item.id), registered);
});

test('five stale registered pages and one approved stay in menu order', async () => {
  const extra = ['relatorio_mensal', 'painel'];
  const registered = ['minhas_despesas', 'inicio', 'despesas_da_equipe', 'despesas_aprovadas', ...extra];
  const port = await memory(['minhas_despesas'], {
    accepted: registered,
    current: { navigation: registered.map(navItem), frontend: { pages: registered.map(frontendPage) } },
  });
  const { receipt } = await runM4Finalize(identity, port);
  assert.deepEqual(receipt.pages, ['minhas_despesas']);
  assert.deepEqual(receipt.notApproved, ['inicio', 'despesas_da_equipe', 'despesas_aprovadas', ...extra]);
  assert.deepEqual(receipt.kept, receipt.notApproved);
  const entry = JSON.parse(port.files.get('102047/l5//config.json')!).projects['102047'].modules[1];
  assert.deepEqual(entry.navigation.map((item: { id: string }) => item.id), registered);
});

test('a registered page that left accepted stays in the config', async () => {
  const registered = ['minhas_despesas', 'inicio', 'despesas_da_equipe'];
  const port = await memory(['minhas_despesas'], {
    accepted: ['minhas_despesas', 'inicio'],
    current: { navigation: registered.map(navItem), frontend: { pages: registered.map(frontendPage) } },
  });
  const { receipt } = await runM4Finalize(identity, port);
  assert.deepEqual(receipt.notApproved, ['inicio']);
  assert.deepEqual(receipt.kept, ['inicio']);
  assert.deepEqual(receipt.navigationAdded, []);
  assert.equal(receipt.navigationKept, 3);
  const entry = JSON.parse(port.files.get('102047/l5//config.json')!).projects['102047'].modules[1];
  assert.deepEqual(entry.navigation.map((item: { id: string }) => item.id), registered);
  assert.match(formatM4FinalizeReport(receipt), /navigation: added none; kept 3\./u);
});

test('the report names the navigation ids appended and how many stayed', () => {
  const receipt = {
    schemaVersion: '2026-10-16-materialize-l2-finalize-v1', project: 102047, module: 'tarefas', configPath: 'l5/config.json',
    pages: ['nova'], notApproved: [], kept: [], navigationAdded: ['nova'], navigationKept: 2, changes: ['navigation'], written: true,
  } as M4FinalizeReceipt;
  assert.equal(formatM4FinalizeReport(receipt).split('\n')[1], 'navigation: added nova; kept 2.');
});

test('no approved page at all writes nothing', async () => {
  const port = await memory([]);
  const { receipt } = await runM4Finalize(identity, port);
  assert.equal(receipt.written, false);
  assert.deepEqual(port.writes, []);
});
