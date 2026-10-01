/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/helpers/m3TsLineBreaks.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { insertGeneratedTsLineBreaks, stripAllWhitespace } from './m3TsLineBreaks.js';

test('line breaks never touch template text, strings, comments or regex bodies', () => {
  const code = [
    "const re = /;{}[/]/g; const s = 'a; { b; }'; // c; { d; }",
    'export function f() { const t = html`<p>a; b</p><span>${cond ? list.map(x => { const y = x.id; return html`<i>${y}</i>`; }) : nothing}</span>`; return t; }',
  ].join('\n');
  const out = insertGeneratedTsLineBreaks(code);
  assert.equal(stripAllWhitespace(out), stripAllWhitespace(code));
  assert.match(out, /<p>a; b<\/p>/u, 'template text untouched');
  assert.match(out, /\/;\{\}\[\/\]\/g/u, 'regex body untouched');
  assert.match(out, /'a; \{ b; \}'/u, 'string untouched');
});

test('conservative: anything the scanner cannot classify comes back unchanged', () => {
  const unterminated = 'const t = html`<p>never closed';
  assert.equal(insertGeneratedTsLineBreaks(unterminated), unterminated);
  const unbalanced = 'export function f() { return 1;';
  assert.equal(insertGeneratedTsLineBreaks(unbalanced), unbalanced);
});
