/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/shared40/chain.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { runM4Input } from '/_102020_/l2/agentMaterializeL2/steps/input20/run.js';
import { approveM4Shared, buildM4SharedContext } from '/_102020_/l2/agentMaterializeL2/steps/shared40/run.js';
import { m4ChainAfterPage, m4ChainSettled, m4ChainStart } from '/_102020_/l2/agentMaterializeL2/steps/shared40/chain.js';
import type { M4PagePort } from '/_102020_/l2/agentMaterializeL2/steps/pages50/run.js';

interface Fixture { project: number; module: string; pages: Record<string, { contract: string; shared: string; desktop: string; mobile: string }> }
const fixture = JSON.parse(readFileSync(new URL('../input20/fixtures/controleEstoque.json', import.meta.url), 'utf8')) as Fixture;
const reference = (JSON.parse(readFileSync(new URL('./fixtures/produtosShared.json', import.meta.url), 'utf8')) as { source: string }).source;
const identity = { project: fixture.project, module: fixture.module };
const key = (info: Ns5FileInfo) => `${info.project}/l${info.level}/${info.folder}/${info.shortName}${info.extension}`;

async function studio() {
  const files = new Map<string, string>();
  const put = (info: Ns5FileInfo, text: string) => files.set(key(info), text);
  const folders = { contract: 'web/contracts', shared: 'web/shared', desktop: 'web/desktop/page11', mobile: 'web/mobile/page11' } as const;
  for (const [pageId, row] of Object.entries(fixture.pages)) {
    for (const [kind, folder] of Object.entries(folders)) put({ project: identity.project, level: 2, folder: `${identity.module}/${folder}`, shortName: pageId, extension: '.defs.ts' }, row[kind as keyof typeof row]);
  }
  put({ project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2`, shortName: 'pipeline', extension: '.json' }, JSON.stringify({ status: 'complete' }));
  put({ project: 102020, level: 2, folder: 'agentMaterializeL2/steps/shared40', shortName: 'prompt', extension: '.md' }, readFileSync(new URL('./prompt.md', import.meta.url), 'utf8'));
  const list = (project: number, folder: string, level = 2) => {
    const prefix = `${project}/l${level}/${folder}/`;
    return [...files.keys()].filter(item => item.startsWith(prefix) && item.endsWith('.defs.ts') && !item.slice(prefix.length).includes('/')).map(item => item.slice(item.lastIndexOf('/') + 1, -'.defs.ts'.length));
  };
  const port: M4PagePort & { files: Map<string, string> } = {
    files,
    read: async info => { const text = files.get(key(info)); if (text === undefined) throw new Error(`file not found: ${key(info)}`); return text; },
    exists: info => files.has(key(info)),
    readJson: async <T>(info: Ns5FileInfo) => { const text = files.get(key(info)); return text === undefined ? null : JSON.parse(text) as T; },
    writeText: async (info, text) => { files.set(key(info), text); },
    writeJson: async (info, value) => { files.set(key(info), JSON.stringify(value)); },
    compile: async () => ({ errors: [], declaration: 'export declare class ControleEstoqueProdutosShared {}\n' }),
    declarations: async () => [],
    listDefs: (project, folder, level) => list(project, folder, level),
  };
  await runM4Input(identity, { listDefs: (project, folder, level = 2) => list(project, folder, level), exists: port.exists, read: port.read, readJson: port.readJson, write: port.writeJson });
  return port;
}
const titles = (steps: mls.msg.AIAgentStep[]) => steps.map(step => step.stepTitle);
const args = (step: mls.msg.AIAgentStep) => JSON.parse(step.prompt ?? '{}') as { chain?: boolean; device?: string };
/** pageId → the titles of its first units, the shape the shared40 dispatcher turns into one group step per page. */
const grouped = (chains: Array<{ pageId: string; steps: mls.msg.AIAgentStep[] }>) => chains.map(chain => [chain.pageId, titles(chain.steps)]);

test('a fresh module starts one chain per page with its shared, grouped by page; --page narrows it', async () => {
  const port = await studio();
  assert.deepEqual(grouped((await m4ChainStart(identity, {}, port)).chains), [['movimentacoes', ['Shared']], ['produtos', ['Shared']]]);
  assert.deepEqual(grouped((await m4ChainStart(identity, { pages: ['produtos'] }, port)).chains), [['produtos', ['Shared']]]);
  assert.equal((await m4ChainSettled(identity, {}, port)).settled, false);
});

test('a page whose shared is ready goes straight to its pages (chained), per device in scope; --force restarts it', async () => {
  const port = await studio();
  await approveM4Shared(await buildM4SharedContext(identity, 'produtos', port), reference, 1, port);
  const both = (await m4ChainStart(identity, { pages: ['produtos'] }, port)).steps;
  assert.deepEqual(titles(both), ['Page desktop', 'Page mobile'], 'inside the page group the title names only the device');
  assert.ok(both.every(step => args(step).chain === true), 'chained page workers end the chain, not the pages50 sweeper');
  assert.deepEqual(titles((await m4ChainStart(identity, { pages: ['produtos'], device: 'mobile' }, port)).steps), ['Page mobile']);
  // --force with --device keeps the shared; without --device it regenerates it
  assert.deepEqual(titles((await m4ChainStart(identity, { pages: ['produtos'], device: 'mobile', force: true }, port)).steps), ['Page mobile']);
  assert.deepEqual(titles((await m4ChainStart(identity, { pages: ['produtos'], force: true }, port)).steps), ['Shared']);
});

test('after a page, the review comes only with --review', async () => {
  const port = await studio();
  assert.deepEqual(await m4ChainAfterPage(identity, 'produtos', 'desktop', {}, port), []);
  const review = await m4ChainAfterPage(identity, 'produtos', 'desktop', { review: true }, port);
  assert.deepEqual(titles(review), ['Review desktop']);
  assert.equal(args(review[0]).chain, true);
});
