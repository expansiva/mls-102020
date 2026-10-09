/// <mls fileReference="_102020_/l2/agentMaterializeL2v4/helpers/cfeMlsImports.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { declaredEnhancementPackages, normalizeMlsImports } from './cfeMlsImports.js';

const outputPath = '_817263_/l2/stock/web/desktop/page11/stockDesk.ts';
const knownFiles = [
  '_817263_/l2/stock/web/shared/stock.ts',
  '_817263_/l2/stock/web/contracts/stock.defs.ts',
  '_817263_/l2/other/web/shared/stock.ts',
];

test('MLS imports across declaration forms become exact absolute .js aliases and are idempotent', () => {
  const source = [
    "import '../../shared/stock';",
    "import type { ListInput } from '../../contracts/stock.defs.ts';",
    "export { StockShared } from '../../shared/stock.ts';",
    "export type { ListInput } from '_817263_/l2/stock/web/contracts/stock.defs.ts';",
    "const lazy = import('/_817263_/l2/stock/web/shared/stock');",
  ].join('\n');
  const result = normalizeMlsImports(source, { outputPath, knownFiles, declaredPackages: [] });
  assert.deepEqual(result.issues, []);
  assert.match(result.code, /import '\/_817263_\/l2\/stock\/web\/shared\/stock\.js'/u);
  assert.match(result.code, /from '\/_817263_\/l2\/stock\/web\/contracts\/stock\.defs\.js'/u);
  assert.match(result.code, /export \{ StockShared \} from '\/_817263_\/l2\/stock\/web\/shared\/stock\.js'/u);
  assert.equal(result.changes.length, 5);
  assert.deepEqual(normalizeMlsImports(result.code, { outputPath, knownFiles, declaredPackages: [] }), {
    code: result.code, changes: [], issues: [],
  });
});

test('only import syntax is touched; comments, ordinary strings, and template text are preserved', () => {
  const source = [
    "// import './not-a-reference';",
    "const note = \"import './also-not-a-reference'\";",
    'const template = `import(\'not-a-module\') ${await import(\'../../shared/stock\')}`;',
    "import '../../shared/stock';",
  ].join('\n');
  const result = normalizeMlsImports(source, { outputPath, knownFiles, declaredPackages: [] });
  assert.deepEqual(result.issues, []);
  assert.equal(result.changes.length, 2);
  assert.ok(result.code.includes("import('not-a-module')"));
  assert.ok(result.code.includes("import('/_817263_/l2/stock/web/shared/stock.js')"));
  assert.match(result.code, /import '\/_817263_\/l2\/stock\/web\/shared\/stock\.js'/u);
});

test('regex literals containing import syntax stay untouched, including escaped slashes and character classes', () => {
  const source = [
    "const unknown = /import 'unknown-package'/;",
    "const relative = /import '.\\/foo'/;",
    "const classed = /[/'\\]]import 'unknown-package'/;",
    "const returned = () => /import 'unknown-package'/;",
    "if (true) /import 'unknown-package'/.test('');",
    "const nested = `${/} import 'unknown-package'/.test('') ? 'ok' : 'no'}`;",
    "const quotient = 10 / 2;",
    "import '../../shared/stock';",
  ].join('\n');
  const result = normalizeMlsImports(source, { outputPath, knownFiles, declaredPackages: [] });
  assert.deepEqual(result.issues, []);
  assert.equal(result.changes.length, 1);
  assert.equal(result.code, source.replace("import '../../shared/stock';", "import '/_817263_/l2/stock/web/shared/stock.js';"));
  assert.deepEqual(normalizeMlsImports(result.code, { outputPath, knownFiles, declaredPackages: [] }), {
    code: result.code, changes: [], issues: [],
  });
});

test('distinct indexed .ts and .js sources with the same module specifier are ambiguous', () => {
  const dualFiles = [...knownFiles, '_817263_/l2/stock/web/shared/stock.js'];
  for (const specifier of ['../../shared/stock', '../../shared/stock.js']) {
    const source = `import '${specifier}';`;
    const result = normalizeMlsImports(source, { outputPath, knownFiles: dualFiles, declaredPackages: [] });
    assert.equal(result.code, source);
    assert.deepEqual(result.changes, []);
    assert.equal(result.issues.length, 1);
    assert.match(result.issues[0], /multiple indexed MLS targets/u);
  }
  const explicitTs = normalizeMlsImports("import '../../shared/stock.ts';", {
    outputPath, knownFiles: dualFiles, declaredPackages: [],
  });
  assert.deepEqual(explicitTs.issues, []);
  assert.match(explicitTs.code, /stock\.js/u);
});

test('packages need an exact declaration and ambiguous, absent, or non-literal targets are errors', () => {
  const source = [
    "import { html } from 'lit';",
    "import { unsafeHTML } from 'lit/directives/unsafe-html.js';",
    "import { missing } from 'unknown-package';",
    "import { x } from './not-in-index';",
    'const module = import(resolveName());',
  ].join('\n');
  const result = normalizeMlsImports(source, {
    outputPath, knownFiles,
    declaredPackages: ['lit', 'lit/directives/unsafe-html.js'],
  });
  assert.equal(result.issues.length, 3);
  assert.ok(result.issues.some(issue => issue.includes("undeclared or unrecognized module 'unknown-package'")));
  assert.ok(result.issues.some(issue => issue.includes("no exact indexed MLS target for '_817263_/l2/stock/web/desktop/page11/not-in-index'")));
  assert.ok(result.issues.some(issue => issue.includes('non-literal dynamic import()')));
  assert.deepEqual(declaredEnhancementPackages(`export const requires: unknown[] = [{ name: 'lit' }, { name: 'lit/decorators.js' }];`), ['lit', 'lit/decorators.js']);
});

test('basename collisions in other modules do not redirect exact module paths', () => {
  const result = normalizeMlsImports("import '/_817263_/l2/stock/web/shared/stock.js';", { outputPath, knownFiles, declaredPackages: [] });
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.changes, []);
});
