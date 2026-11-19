/// <mls fileReference="_102020_/l2/aura/helpers/componentUsage.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildComponentUsage,
  declaredTags,
  fileKey,
  parseImports,
  parseTags,
  resolveImport,
  stripComments,
  type IFileRef,
  type IUsageSource,
} from '/_102020_/l2/aura/helpers/componentUsage.js';

// Shapes cut from mls-102047 (18/11/2026): pages import each molecule of 102040 and use it as a tag.

const P = 102047;

const molecule = (group: string, name: string, extra = ''): IUsageSource => ({
  project: 102040,
  folder: `molecules/${group}`,
  shortName: name,
  content: `import { html } from 'lit';\nimport { customElement } from 'lit/decorators.js';\n${extra}\n@customElement('${group}--${name}')\nexport class X extends HTMLElement {}\n`,
});

const page = (module: string, device: string, name: string, body: string, variation = 'page11'): IUsageSource => ({
  project: P,
  folder: `${module}/web/${device}/${variation}`,
  shortName: name,
  content: `import { html } from 'lit';\nimport { Shared } from '/_${P}_/l2/${module}/web/shared/${name}.js';\n${body}\n@customElement('${module}--web--${device}--${variation}--${name}-${P}')\nexport class Page extends Shared {}\n`,
});

const shared = (module: string, name: string): IUsageSource => ({
  project: P,
  folder: `${module}/web/shared`,
  shortName: name,
  content: `export class Shared {}\n`,
});

const find = (index: ReturnType<typeof buildComponentUsage>, ref: IFileRef) =>
  index.components.find((c) => c.key === fileKey(ref));

const BUTTON: IFileRef = { project: 102040, folder: 'molecules/grouptriggeraction', shortName: 'ml-button-group' };
const CARD: IFileRef = { project: 102040, folder: 'molecules/groupviewmetric', shortName: 'ml-metric-card' };

test('import with tag: confirmed use, count and lines', () => {
  const body = [
    `import '/_102040_/l2/molecules/grouptriggeraction/ml-button-group.js';`,
    'const t = html`',
    '  <grouptriggeraction--ml-button-group size="sm"></grouptriggeraction--ml-button-group>',
    '  <grouptriggeraction--ml-button-group',
    '     size="sm">',
    '`;',
  ].join('\n');
  const index = buildComponentUsage({
    project: P,
    sources: [molecule('grouptriggeraction', 'ml-button-group'), page('tarefas', 'desktop', 'inicio', body), shared('tarefas', 'inicio')],
  });
  const button = find(index, BUTTON)!;
  assert.equal(button.uses, 2);
  assert.equal(button.screens.length, 1);
  const variation = button.modules[0].screens[0].variations[0];
  assert.deepEqual(variation.lines, [5, 6]);
  assert.equal(variation.imported, true);
  assert.equal(variation.variation, 'desktop/page11');
  assert.deepEqual(index.warnings, []);
});

test('import without tag and tag without import are warnings', () => {
  const body = [
    `import '/_102040_/l2/molecules/grouptriggeraction/ml-button-group.js';`,
    'const t = html`<groupviewmetric--ml-metric-card></groupviewmetric--ml-metric-card>`;',
  ].join('\n');
  const index = buildComponentUsage({
    project: P,
    sources: [molecule('grouptriggeraction', 'ml-button-group'), molecule('groupviewmetric', 'ml-metric-card'), page('tarefas', 'desktop', 'inicio', body)],
  });
  const kinds = index.warnings.map((w) => `${w.kind}:${w.component?.shortName}`).sort();
  assert.deepEqual(kinds, ['import-without-use:ml-button-group', 'used-without-import:ml-metric-card']);
  assert.equal(find(index, BUTTON)!.unused, false, 'imported, so not "no use at all"');
  assert.equal(find(index, CARD)!.modules[0].screens[0].variations[0].imported, false);
});

test('both tag formats: declared tags first, the resolver for the rest', () => {
  const scenary: IUsageSource = {
    project: 102020,
    folder: 'molecules',
    shortName: 'ml-scenary',
    content: `@customElement('molecules--ml-scenary-102020')\nexport class S {}\n`,
  };
  const body = [
    `import '/_102020_/l2/molecules/ml-scenary.js';`,
    `import '/_102040_/l2/molecules/grouptriggeraction/ml-button-group.js';`,
    'const t = html`<molecules--ml-scenary-102020></molecules--ml-scenary-102020>',
    '<grouptriggeraction--ml-button-group></grouptriggeraction--ml-button-group>`;',
  ].join('\n');
  const asked: string[] = [];
  const index = buildComponentUsage({
    project: P,
    // ml-button-group is NOT read: only the resolver knows it.
    sources: [scenary, page('tarefas', 'desktop', 'inicio', body)],
    resolveTag: (tag) => {
      asked.push(tag);
      return tag === 'grouptriggeraction--ml-button-group' ? BUTTON : undefined;
    },
  });
  assert.deepEqual(asked, ['grouptriggeraction--ml-button-group']);
  assert.equal(find(index, { project: 102020, folder: 'molecules', shortName: 'ml-scenary' })!.uses, 1);
  const button = find(index, BUTTON)!;
  assert.equal(button.loaded, false);
  assert.equal(button.uses, 1);
  assert.deepEqual(index.warnings, [], 'no false "import without use" for the legacy format');
});

test('a tag nobody resolves is reported with its lines', () => {
  const index = buildComponentUsage({
    project: P,
    sources: [page('tarefas', 'desktop', 'inicio', 'const t = html`\n<ml-gone></ml-gone>`;')],
  });
  assert.equal(index.warnings.length, 1);
  assert.equal(index.warnings[0].kind, 'unresolved-tag');
  assert.equal(index.warnings[0].tag, 'ml-gone');
  assert.deepEqual(index.warnings[0].lines, [4]);
});

test('indirect use: a component inside a component reaches its screens', () => {
  const organism: IUsageSource = {
    project: P,
    folder: 'organisms',
    shortName: 'painelResumo',
    content: [
      `import '/_102040_/l2/molecules/grouptriggeraction/ml-button-group.js';`,
      'const t = html`<grouptriggeraction--ml-button-group></grouptriggeraction--ml-button-group>',
      '<grouptriggeraction--ml-button-group></grouptriggeraction--ml-button-group>`;',
      `@customElement('organisms--painel-resumo-${P}')`,
      'export class O {}',
    ].join('\n'),
  };
  const usesOrganism = `import '/_${P}_/l2/organisms/painelResumo.js';\nconst t = html\`<organisms--painel-resumo-${P}></organisms--painel-resumo-${P}>\`;`;
  const index = buildComponentUsage({
    project: P,
    sources: [
      molecule('grouptriggeraction', 'ml-button-group'),
      organism,
      page('tarefas', 'desktop', 'inicio', usesOrganism),
      page('compras', 'desktop', 'pedidos', usesOrganism),
    ],
  });
  const button = find(index, BUTTON)!;
  assert.equal(button.modules.length, 0, 'no page uses it directly');
  assert.equal(button.inner.length, 1);
  assert.equal(button.inner[0].ref.shortName, 'painelResumo');
  assert.deepEqual(button.inner[0].lines, [2, 3]);
  assert.deepEqual(button.inner[0].screens.map((s) => s.key), ['compras/pedidos', 'tarefas/inicio']);
  assert.deepEqual(button.screens.map((s) => s.key), ['compras/pedidos', 'tarefas/inicio']);
  assert.equal(button.uses, 2);
});

test('variations of the same screen are grouped, with title and route from the config', () => {
  const body = `import '/_102040_/l2/molecules/grouptriggeraction/ml-button-group.js';\nconst t = html\`<grouptriggeraction--ml-button-group></grouptriggeraction--ml-button-group>\`;`;
  const index = buildComponentUsage({
    project: P,
    sources: [
      molecule('grouptriggeraction', 'ml-button-group'),
      page('tarefas', 'mobile', 'inicio', body),
      page('tarefas', 'desktop', 'inicio', body, 'page21'),
      page('tarefas', 'desktop', 'inicio', body),
    ],
    pages: [{ source: 'l2/tarefas/web/desktop/page11/inicio.ts', title: 'Início', route: '/tarefas/inicio/:id?' }],
  });
  const button = find(index, BUTTON)!;
  assert.equal(button.screens.length, 1);
  const screen = button.modules[0].screens[0];
  assert.equal(screen.screen.title, 'Início');
  assert.equal(screen.screen.route, '/tarefas/inicio');
  assert.deepEqual(screen.variations.map((v) => v.variation), ['desktop/page11', 'desktop/page21', 'mobile/page11']);
  assert.equal(screen.count, 3);
});

test('what is not a component: lit, shared, helpers, and a component nobody uses', () => {
  const helper: IUsageSource = { project: P, folder: 'tarefas/web/shared', shortName: 'format', content: 'export const f = 1;' };
  const body = `import { f } from '/_${P}_/l2/tarefas/web/shared/format.js';\nimport { html } from 'lit';`;
  const index = buildComponentUsage({
    project: P,
    sources: [helper, shared('tarefas', 'inicio'), molecule('groupviewmetric', 'ml-metric-card'), page('tarefas', 'desktop', 'inicio', body)],
  });
  assert.deepEqual(index.components.map((c) => c.ref.shortName), ['ml-metric-card'], 'pages, shared and helpers are not components');
  assert.equal(index.components[0].unused, true);
  assert.deepEqual(index.warnings.map((w) => w.kind), ['unused-component']);
});

test('comments do not count, and lines do not move', () => {
  const src = [
    '// <grouptriggeraction--ml-button-group>',
    "const url = 'http://x';",
    '/* <a-b> */ const t = html`<!-- <c-d> -->',
    '<e-f></e-f> ${ x /* <g-h> */ } <i-j>`;',
  ].join('\n');
  const text = stripComments(src);
  assert.equal(text.length, src.length);
  assert.deepEqual(parseTags(text), [{ tag: 'e-f', line: 4 }, { tag: 'i-j', line: 4 }]);
  assert.ok(text.includes("'http://x'"), 'a // inside a string is not a comment');
});

test('imports: absolute, relative, re-export, type-only and dynamic', () => {
  const from: IFileRef = { project: P, folder: 'tarefas/web/desktop/page11', shortName: 'inicio' };
  const text = [
    `import '/_102040_/l2/molecules/g/ml-a.js';`,
    `import { B } from '../../shared/b.js';`,
    `import type { C } from '/_${P}_/l2/c.js';`,
    `export * from './d.js';`,
    `const e = import('/_${P}_/l2/e.js');`,
    `import { html } from 'lit';`,
  ].join('\n');
  const found = parseImports(text, from).map((i) => `${fileKey(i.ref)}${i.sideEffect ? ' (effect)' : ''}`).sort();
  assert.deepEqual(found, [
    '_102040_/l2/molecules/g/ml-a (effect)',
    `_${P}_/l2/tarefas/web/desktop/page11/d`,
    `_${P}_/l2/tarefas/web/shared/b`,
  ]);
  assert.equal(resolveImport('lit/decorators.js', from), undefined);
});

test('a tag registered through a constant and a define helper is declared', () => {
  const text = `export const ML_SCENARY_TAG = 'molecules--ml-scenary-102020';\ndefineMoleculeOnce(ML_SCENARY_TAG, X);\nObject.defineProperty(obj, 'a', {});`;
  assert.deepEqual(declaredTags(text), ['molecules--ml-scenary-102020']);
});

test("a dependency's demo file that shows the molecule is not a use of the project", () => {
  const demo: IUsageSource = {
    project: 102040,
    folder: 'molecules/grouptriggeraction',
    shortName: 'index',
    content: "const t = html`<grouptriggeraction--ml-button-group></grouptriggeraction--ml-button-group>`;\n@customElement('molecules--grouptriggeraction--index-102040')\nexport class I {}",
  };
  const index = buildComponentUsage({ project: P, sources: [molecule('grouptriggeraction', 'ml-button-group'), demo] });
  const button = find(index, BUTTON)!;
  assert.equal(button.uses, 0);
  assert.deepEqual(button.inner, []);
  assert.equal(button.unused, true);
});
