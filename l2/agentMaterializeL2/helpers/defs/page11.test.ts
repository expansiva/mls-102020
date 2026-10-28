/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/defs/page11.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseL2Page11 } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import { withDefsHistory, type DefsHistoryEntry } from '/_102020_/l2/helpers/defsHistory/defsHistory.js';

const input = JSON.parse(readFileSync(new URL('../../steps/input20/fixtures/controleEstoque.json', import.meta.url), 'utf8')) as { pages: Record<string, { desktop: string }> };
const source = input.pages.produtos.desktop;
const entry: DefsHistoryEntry = { kind: 'text', organism: null, target: 'title', at: '2026-10-28T00:00:00Z', from: 'Produtos', to: 'Estoque', attribute: null, lang: 'pt-br' };

test('a page11 with a Studio edit history parses to the same definition, and returns the history apart', () => {
  const plain = parseL2Page11(source);
  assert.deepEqual(plain.history, []);
  const edited = parseL2Page11(withDefsHistory(source, [entry]));
  assert.deepEqual(edited.definition, plain.definition);
  assert.deepEqual(edited.location, plain.location);
  assert.deepEqual(edited.history, [entry]);
});

test('a history that does not parse refuses the file', () => {
  assert.throws(() => parseL2Page11(`${source}\nexport const history = [oops] as const;\n`), /DEFS_HISTORY_FORMAT/u);
});
