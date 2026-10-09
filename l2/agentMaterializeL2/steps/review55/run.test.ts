/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/review55/run.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { buildM4PlannedSteps, m4PlannedStepIds, parseM4MessageInvocation } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { runM4Input } from '/_102020_/l2/agentMaterializeL2/steps/input20/run.js';
import type { M4PagePort } from '/_102020_/l2/agentMaterializeL2/steps/pages50/run.js';
import {
  buildM4ReviewContext, formatM4Review, m4ReviewState, m4ReviewToolAnswer, m4ReviewToolSchema, recordM4Review, reviewReceiptInfo,
} from '/_102020_/l2/agentMaterializeL2/steps/review55/run.js';

interface Fixture { project: number; module: string; pages: Record<string, { contract: string; shared: string; desktop: string; mobile: string }> }
const fixture = JSON.parse(readFileSync(new URL('../input20/fixtures/controleEstoque.json', import.meta.url), 'utf8')) as Fixture;
const pageRef = JSON.parse(readFileSync(new URL('../pages50/fixtures/produtosDesktop.json', import.meta.url), 'utf8')) as { source: string };
const promptText = readFileSync(new URL('./prompt.md', import.meta.url), 'utf8');
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
  put({ project: 102020, level: 4, folder: 'collabux/templates/inventoryControl', shortName: 'page21', extension: '.md' }, '# template\n## Forbidden\n- a long single column');
  put({ project: 102020, level: 2, folder: 'agentMaterializeL2/steps/review55', shortName: 'prompt', extension: '.md' }, promptText);
  put({ project: identity.project, level: 2, folder: `${identity.module}/web/desktop/page11`, shortName: 'produtos', extension: '.ts' }, pageRef.source);
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
    compile: async () => ({ errors: [], declaration: null }),
    declarations: async () => [],
    listDefs: (project, folder, level) => list(project, folder, level),
  };
  await runM4Input(identity, { listDefs: (project, folder, level = 2) => list(project, folder, level), exists: port.exists, read: port.read, readJson: port.readJson, write: port.writeJson });
  return port;
}

test('review55 is planned only with --review (Guilherme, 05/10: off by default)', () => {
  assert.deepEqual(m4PlannedStepIds({}), ['entry10', 'input20', 'shared40', 'pages50']);
  assert.deepEqual(m4PlannedStepIds({ review: true }), ['entry10', 'input20', 'shared40', 'pages50', 'review55']);
  const parsed = parseM4MessageInvocation('@@agentMaterializeL2 comandaRestaurante --review --page mesas', 102047);
  assert.deepEqual(parsed, { kind: 'run', project: 102047, module: 'comandaRestaurante', scope: { review: true, pages: ['mesas'] } });
  if (parsed.kind === 'run') assert.equal(buildM4PlannedSteps(parsed, parsed.scope).at(-1)?.planning?.planId, 'review55');
});

test('the review prompt carries the page file, the design answer, the definition, the template and the declaration', async () => {
  const port = await studio();
  const context = await buildM4ReviewContext(identity, 'produtos', 'desktop', port);
  assert.equal(context.prompt, promptText);
  for (const needle of ['# The page file', 'controle-estoque--web--desktop--page11--produtos-102047', '# The design answer its author gave', '# Page definition', '"intent"', '# Template —', '## Forbidden', '# Business context (L4)', '# Shared declaration']) {
    assert.ok(context.humanPrompt.includes(needle), needle);
  }
  assert.match(promptText, /^<!-- modelType: code -->/u);
  await assert.rejects(buildM4ReviewContext(identity, 'produtos', 'mobile', port), /M4_REVIEW_PAGE_MISSING/u);
});

test('report only: findings are recorded; a failed review settles the unit but is not reused', async () => {
  const port = await studio();
  const context = await buildM4ReviewContext(identity, 'produtos', 'desktop', port);
  const answer = m4ReviewToolAnswer({ arguments: JSON.stringify({
    summary: 'Works, but the title repeats.',
    findings: [
      { severity: 'major', area: 'titles', message: 'Scene title repeated as an h2 and as the table caption', basis: 'no heading anywhere repeats…', where: 'renderSceneLista', fix: 'Drop the h2 and the caption.' },
      { severity: 'huge', area: 'x', message: 'dropped: not a severity', basis: '', where: '', fix: '' },
    ],
  }) });
  assert.deepEqual(answer.findings.map(item => item.severity), ['major']);
  const receipt = await recordM4Review(context, answer, port);
  assert.match(formatM4Review(receipt), /^Review produtos\/desktop: 0 blocker, 1 major, 0 minor\. Works, but the title repeats\.\nmajor \[titles\]/u);
  assert.deepEqual(await m4ReviewState(identity, 'produtos', 'desktop', port), { settled: true, reusable: true });
  // the page changes: the review is stale
  const pagePath = `${identity.project}/l2/${identity.module}/web/desktop/page11/produtos.ts`;
  port.files.set(pagePath, `${pageRef.source}\n// changed\n`);
  assert.deepEqual(await m4ReviewState(identity, 'produtos', 'desktop', port), { settled: false, reusable: false });
  // a failed review: settled for this run, reviewed again next time
  const fresh = await buildM4ReviewContext(identity, 'produtos', 'desktop', port);
  await recordM4Review(fresh, { summary: '', findings: [], failed: 'M4_REVIEW_TOOL_JSON' }, port);
  assert.deepEqual(await m4ReviewState(identity, 'produtos', 'desktop', port), { settled: true, reusable: false });
  assert.ok(port.files.has(key(reviewReceiptInfo(identity, 'produtos', 'desktop'))));
});

test('the tool requires a basis for every finding', () => {
  assert.deepEqual(m4ReviewToolSchema.properties.findings.items.required, ['severity', 'area', 'message', 'basis', 'where', 'fix']);
});
