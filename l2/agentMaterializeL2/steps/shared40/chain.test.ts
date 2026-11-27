/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/shared40/chain.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import type { Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { runM4Input } from '/_102020_/l2/agentMaterializeL2/steps/input20/run.js';
import { approveM4Shared, buildM4SharedContext, sharedReceiptInfo } from '/_102020_/l2/agentMaterializeL2/steps/shared40/run.js';
import { m4ChainAfterPage, m4ChainSettled, m4ChainStart } from '/_102020_/l2/agentMaterializeL2/steps/shared40/chain.js';
import { approveM4Page, buildM4PageContext, pageReceiptInfo, pageSourceInfo, type M4PagePort } from '/_102020_/l2/agentMaterializeL2/steps/pages50/run.js';
import { M4_REVIEW_VERSION, reviewReceiptInfo } from '/_102020_/l2/agentMaterializeL2/steps/review55/run.js';

interface Fixture { project: number; module: string; knownMolecules: string[]; pages: Record<string, { contract: string; shared: string; desktop: string; mobile: string }> }
const fixture = JSON.parse(readFileSync(new URL('../input20/fixtures/controleEstoque.json', import.meta.url), 'utf8')) as Fixture;
const reference = (JSON.parse(readFileSync(new URL('./fixtures/produtosShared.json', import.meta.url), 'utf8')) as { source: string }).source;
const pageRef = JSON.parse(readFileSync(new URL('../pages50/fixtures/produtosDesktop.json', import.meta.url), 'utf8')) as { source: string; sharedDeclaration: string };
const BASE = new URL('../../../../../', import.meta.url);
const real = (path: string) => readFileSync(new URL(path, BASE), 'utf8');
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
    deleteText: async info => { files.delete(key(info)); },
    compile: async () => ({ errors: [], declaration: 'export declare class ControleEstoqueProdutosShared {}\n' }),
    declarations: async () => [],
    listDefs: (project, folder, level) => list(project, folder, level),
  };
  await runM4Input(identity, { listDefs: (project, folder, level = 2) => list(project, folder, level), exists: port.exists, read: port.read, readJson: port.readJson, write: port.writeJson });
  return port;
}

/** The page check reads the real template, molecules and L4. The thin `studio()` does not have them. */
async function pageStudio(compileErrors: string[] = []) {
  const files = new Map<string, string>();
  const put = (info: Ns5FileInfo, text: string) => files.set(key(info), text);
  const folders = { contract: 'web/contracts', shared: 'web/shared', desktop: 'web/desktop/page11', mobile: 'web/mobile/page11' } as const;
  for (const [pageId, row] of Object.entries(fixture.pages)) {
    for (const [kind, folder] of Object.entries(folders)) put({ project: identity.project, level: 2, folder: `${identity.module}/${folder}`, shortName: pageId, extension: '.defs.ts' }, row[kind as keyof typeof row]);
  }
  put({ project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2`, shortName: 'pipeline', extension: '.json' }, JSON.stringify({ status: 'complete' }));
  put({ project: 102020, level: 4, folder: 'collabux/templates/inventoryControl', shortName: 'page21', extension: '.md' }, real('mls-102020/l4/collabux/templates/inventoryControl/page21.md'));
  put({ project: identity.project, level: 2, folder: '', shortName: 'designSystem', extension: '.ts' }, real('mls-102047/l2/designSystem.ts'));
  put({ project: identity.project, level: 4, folder: identity.module, shortName: 'module', extension: '.defs.ts' }, real('mls-102047/l4/controleEstoque/module.defs.ts'));
  for (const group of new Set(fixture.knownMolecules.map(tag => tag.split('--')[0]))) {
    const index = real(`mls-102040/l2/molecules/${group}/index.defs.ts`);
    put({ project: 102040, level: 2, folder: `molecules/${group}`, shortName: 'index', extension: '.defs.ts' }, index);
    const usage = /usageContract\s*=\s*'\/_102020_\/l2\/(aura\/molecules\/skills\/[^/]+)\/usage'/u.exec(index)?.[1];
    if (usage && existsSync(new URL(`mls-102020/l2/${usage}/usage.ts`, BASE))) put({ project: 102020, level: 2, folder: usage, shortName: 'usage', extension: '.ts' }, real(`mls-102020/l2/${usage}/usage.ts`));
  }
  for (const tag of fixture.knownMolecules) {
    const [group, name] = tag.split('--');
    const path = `mls-102040/l2/molecules/${group}/${name}.defs.ts`;
    if (existsSync(new URL(path, BASE))) put({ project: 102040, level: 2, folder: `molecules/${group}`, shortName: name, extension: '.defs.ts' }, real(path));
  }
  put({ project: 102020, level: 2, folder: 'molecules', shortName: 'ml-scenary', extension: '.defs.ts' }, real('mls-102020/l2/molecules/ml-scenary.defs.ts'));
  put({ project: 102034, level: 1, folder: 'mdm/defs', shortName: 'ontology', extension: '.ts' }, real('mls-102034/l1/mdm/defs/ontology.ts'));
  put({ project: 102020, level: 2, folder: 'agentMaterializeL2/steps/shared40', shortName: 'prompt', extension: '.md' }, real('mls-102020/l2/agentMaterializeL2/steps/shared40/prompt.md'));
  put({ project: 102020, level: 2, folder: 'agentMaterializeL2/steps/pages50', shortName: 'prompt', extension: '.md' }, real('mls-102020/l2/agentMaterializeL2/steps/pages50/prompt.md'));
  put({ project: 102020, level: 2, folder: 'agentMaterializeL2/steps/pages50', shortName: 'promptRepair', extension: '.md' }, real('mls-102020/l2/agentMaterializeL2/steps/pages50/promptRepair.md'));
  const l4Root = new URL(`mls-102047/l4/${identity.module}/`, BASE);
  for (const sub of ['', 'ontology/', 'journeys/']) {
    const dir = new URL(sub, l4Root);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter(item => item.endsWith('.defs.ts'))) {
      put({ project: identity.project, level: 4, folder: `${identity.module}${sub ? `/${sub.slice(0, -1)}` : ''}`, shortName: name.slice(0, -'.defs.ts'.length), extension: '.defs.ts' }, readFileSync(new URL(name, dir), 'utf8'));
    }
  }
  const port: M4PagePort & { files: Map<string, string> } = {
    files,
    read: async info => { const text = files.get(key(info)); if (text === undefined) throw new Error(`file not found: ${key(info)}`); return text; },
    exists: info => files.has(key(info)),
    readJson: async <T>(info: Ns5FileInfo) => { const text = files.get(key(info)); return text === undefined ? null : JSON.parse(text) as T; },
    writeText: async (info, text) => { files.set(key(info), text); },
    writeJson: async (info, value) => { files.set(key(info), JSON.stringify(value)); },
    deleteText: async info => { files.delete(key(info)); },
    compile: async info => {
      if (info.folder.endsWith('/web/shared')) return { errors: [], declaration: pageRef.sharedDeclaration };
      return { errors: compileErrors, declaration: null };
    },
    declarations: async () => [],
    listDefs: (project, folder, level) => {
      const prefix = `${project}/l${level}/${folder}/`;
      return [...files.keys()].filter(item => item.startsWith(prefix) && item.endsWith('.defs.ts') && !item.slice(prefix.length).includes('/')).map(item => item.slice(item.lastIndexOf('/') + 1, -'.defs.ts'.length));
    },
  };
  await runM4Input(identity, { listDefs: (project, folder, level = 2) => port.listDefs(project, folder, level), exists: port.exists, read: port.read, readJson: port.readJson, write: port.writeJson });
  await approveM4Shared(await buildM4SharedContext(identity, 'produtos', port), reference, 1, port);
  return port;
}

function staleJson(port: { files: Map<string, string> }, info: Ns5FileInfo, patch: Record<string, unknown>) {
  const current = JSON.parse(port.files.get(key(info)) ?? '{}') as Record<string, unknown>;
  port.files.set(key(info), JSON.stringify({ ...current, ...patch }));
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
  // --force with --device keeps the shared; without --device it deletes the generated shared and starts again
  assert.deepEqual(titles((await m4ChainStart(identity, { pages: ['produtos'], device: 'mobile', force: true }, port)).steps), ['Page mobile']);
  const receiptKey = key(sharedReceiptInfo(identity, 'produtos'));
  const receipt = port.files.get(receiptKey);
  assert.deepEqual(titles((await m4ChainStart(identity, { pages: ['produtos'], force: true }, port)).steps), ['Shared']);
  assert.equal(port.files.has('102047/l2/controleEstoque/web/shared/produtos.ts'), false);
  assert.equal(port.files.has('102047/l2/controleEstoque/web/shared/produtosDts.txt'), false);
  assert.equal(port.files.has('102047/l2/controleEstoque/web/shared/produtos.defs.ts'), true, 'a defs file is not deleted');
  assert.equal(port.files.get(receiptKey), receipt, 'the receipt is not rewritten');
});

test('after a page, the review comes only with --review', async () => {
  const port = await studio();
  assert.deepEqual(await m4ChainAfterPage(identity, 'produtos', 'desktop', {}, port), []);
  const review = await m4ChainAfterPage(identity, 'produtos', 'desktop', { review: true }, port);
  assert.deepEqual(titles(review), ['Review desktop']);
  assert.equal(args(review[0]).chain, true);
});

test('a failed review receipt is deleted before --review dispatches, and the chain stays open', async () => {
  const port = await pageStudio();
  await approveM4Page(await buildM4PageContext(identity, 'produtos', 'desktop', port), pageRef.source, 1, port);
  const info = reviewReceiptInfo(identity, 'produtos', 'desktop');
  await port.writeJson(info, { schemaVersion: M4_REVIEW_VERSION, failed: 'M4_REVIEW_TOOL_JSON' });
  const scope = { pages: ['produtos'], device: 'desktop' as const, review: true };
  assert.equal((await m4ChainSettled(identity, scope, port)).settled, true);
  const review = await m4ChainAfterPage(identity, 'produtos', 'desktop', scope, port);
  assert.deepEqual(titles(review), ['Review desktop']);
  assert.equal(port.files.has(key(info)), false, 'the failed receipt is deleted before the worker runs');
  assert.equal((await m4ChainSettled(identity, scope, port)).settled, false);
});

test('without --force a shared that still compiles is kept and spawns no shared worker', async () => {
  const port = await studio();
  await approveM4Shared(await buildM4SharedContext(identity, 'produtos', port), reference, 1, port);
  const disk = port.files.get('102047/l2/controleEstoque/web/shared/produtos.ts');
  staleJson(port, sharedReceiptInfo(identity, 'produtos'), { unitInputHash: 'sha256:stale' });
  const started = await m4ChainStart(identity, { pages: ['produtos'] }, port);
  assert.equal(started.steps.some(step => step.stepTitle.startsWith('Shared')), false);
  assert.equal(port.files.get('102047/l2/controleEstoque/web/shared/produtos.ts'), disk);
  assert.ok(started.lines.includes('produtos: shared kept; desktop generated; mobile generated'));
});

test('without --force a shared that does not compile becomes one repair from the file on disk', async () => {
  const port = await studio();
  await approveM4Shared(await buildM4SharedContext(identity, 'produtos', port), reference, 1, port);
  const disk = `${reference}\n// on disk\n`;
  port.files.set('102047/l2/controleEstoque/web/shared/produtos.ts', disk);
  staleJson(port, sharedReceiptInfo(identity, 'produtos'), { unitInputHash: 'sha256:stale' });
  port.compile = async () => ({ errors: ["line 3:5 - TS2339 - Property 'x' does not exist."], declaration: null });
  const started = await m4ChainStart(identity, { pages: ['produtos'] }, port);
  assert.deepEqual(titles(started.steps), ['Shared (repair 1)']);
  const body = JSON.parse(started.steps[0].prompt ?? '{}') as { attempt: number; previous?: string; diagnostic?: string };
  assert.equal(body.attempt, 2);
  assert.equal(body.previous, disk);
  assert.match(body.diagnostic ?? '', /TS2339/u);
  assert.equal(port.files.get('102047/l2/controleEstoque/web/shared/produtos.ts'), disk);
  assert.deepEqual(started.lines, ['produtos: shared repaired']);
  assert.equal((await m4ChainSettled(identity, { pages: ['produtos'] }, port)).settled, false);
});

test('without --force a page that still compiles is kept; one that does not compile is repaired from disk', async () => {
  const keptPort = await pageStudio();
  await approveM4Page(await buildM4PageContext(identity, 'produtos', 'desktop', keptPort), pageRef.source, 1, keptPort);
  const pageKey = '102047/l2/controleEstoque/web/desktop/page11/produtos.ts';
  const disk = `${keptPort.files.get(pageKey)}\n// still the page\n`;
  keptPort.files.set(pageKey, disk);
  staleJson(keptPort, pageReceiptInfo(identity, 'produtos', 'desktop'), { dataHash: 'sha256:stale' });
  const scope = { pages: ['produtos'], device: 'desktop' as const };
  const kept = await m4ChainStart(identity, scope, keptPort);
  assert.deepEqual(titles(kept.steps), []);
  assert.deepEqual(kept.lines, ['produtos: shared reused; desktop kept']);
  assert.equal(keptPort.files.get(pageKey), disk);
  assert.equal((await m4ChainSettled(identity, scope, keptPort)).settled, true);

  const failing = await pageStudio(["line 4:1 - TS2339 - Property 'x' does not exist."]);
  const broken = `${pageRef.source}\n// on disk\n`;
  failing.files.set(pageKey, broken);
  await failing.writeJson(pageReceiptInfo(identity, 'produtos', 'desktop'), { fingerprint: 'data-v1', dataHash: 'sha256:old', attempt: 3, design: { concept: 'from the receipt', views: [], decisions: '' } });
  const repaired = await m4ChainStart(identity, scope, failing);
  assert.deepEqual(titles(repaired.steps), ['Page desktop (repair 1)']);
  const body = JSON.parse(repaired.steps[0].prompt ?? '{}') as { attempt: number; previous?: string; diagnostic?: string; design?: { concept?: string } };
  assert.equal(body.attempt, 2);
  assert.equal(body.previous, broken);
  assert.match(body.diagnostic ?? '', /TS2339/u);
  assert.equal(body.design?.concept, 'from the receipt');
  assert.equal(failing.files.get(pageKey), broken);
  assert.deepEqual(repaired.lines, ['produtos: shared reused; desktop repaired']);
  assert.equal((await m4ChainSettled(identity, scope, failing)).settled, false);
});

test('--force still deletes the generated files and starts from scratch', async () => {
  const port = await studio();
  await approveM4Shared(await buildM4SharedContext(identity, 'produtos', port), reference, 1, port);
  const started = await m4ChainStart(identity, { pages: ['produtos'], force: true }, port);
  assert.deepEqual(titles(started.steps), ['Shared']);
  assert.equal(JSON.parse(started.steps[0].prompt ?? '{}').attempt, 1);
  assert.deepEqual(started.lines, ['produtos: shared generated']);
  assert.equal(port.files.has('102047/l2/controleEstoque/web/shared/produtos.ts'), false);
});
