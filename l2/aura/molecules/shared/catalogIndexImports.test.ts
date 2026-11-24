/// <mls fileReference="_102020_/l2/aura/molecules/shared/catalogIndexImports.test.ts" enhancement="_blank"/>

// Guard for the catalog pages (`l2/molecules/<group>/index.ts`) of every molecule library.
//
// Two failures the Studio's "Assets → Components" panel hit when it opened them:
//   - an import without `.js`: the app pages import the same molecule WITH `.js`, so the browser
//     loads the module twice and the second `customElements.define` throws ("has already been used
//     with this registry");
//   - an import of a molecule that was deleted from the group: the page 404s.

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// mls-102020/l2/aura/molecules/shared → the monorepo root
const MONOREPO = path.resolve(HERE, '../../../../..');
const LIBRARIES = ['102040', '102054', '102055'];
const MOLECULE_IMPORT = /^import '\/_(\d+)_\/l2\/(molecules\/[^']+?)';$/gmu;

function catalogPages(): Array<{ file: string; text: string }> {
  const out: Array<{ file: string; text: string }> = [];
  for (const project of LIBRARIES) {
    const base = path.join(MONOREPO, `mls-${project}`, 'l2', 'molecules');
    if (!existsSync(base)) continue;
    for (const group of readdirSync(base)) {
      const file = path.join(base, group, 'index.ts');
      if (!existsSync(file)) continue;
      out.push({ file: `mls-${project}/l2/molecules/${group}/index.ts`, text: readFileSync(file, 'utf8').replace(/\r\n/gu, '\n') });
    }
  }
  return out;
}

test('there are catalog pages to check', () => {
  assert.ok(catalogPages().length > 0, 'no l2/molecules/*/index.ts found — the guard would pass on nothing');
});

test('catalog pages import every molecule with .js (one module URL per molecule)', () => {
  const offenders: string[] = [];
  for (const { file, text } of catalogPages()) {
    for (const match of text.matchAll(MOLECULE_IMPORT)) {
      if (!match[2].endsWith('.js')) offenders.push(`${file}: ${match[2]}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('catalog pages only import molecules that exist', () => {
  const missing: string[] = [];
  for (const { file, text } of catalogPages()) {
    for (const match of text.matchAll(MOLECULE_IMPORT)) {
      const source = path.join(MONOREPO, `mls-${match[1]}`, 'l2', `${match[2].replace(/\.js$/u, '')}.ts`);
      if (!existsSync(source)) missing.push(`${file}: ${match[2]}`);
    }
  }
  assert.deepEqual(missing, []);
});
