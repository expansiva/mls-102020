/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/studioDeclaration.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { compactDiagnostics, locateDiagnostic } from '/_102020_/l2/agentMaterializeL2/helpers/studioDeclaration.js';

// The first shared40 Studio run (30/09/2026) got 12 x "TS18047 - 'output' is possibly 'null'." with no line,
// and the repair could not find them. The raw diagnostic carries `start`; the source locates it.
const source = ['const a = 1;', 'const output = find();', 'use(output.rows);', ''].join('\n');

test('adds line, column and the source line when the diagnostic has a start offset', () => {
  const start = source.indexOf('output.rows');
  const text = locateDiagnostic({ start, code: 18047 }, "file://server/_1_/l2/x.ts - TS18047 - 'output' is possibly 'null'.", source);
  assert.equal(text, "line 3:5 - TS18047 - 'output' is possibly 'null'.\n    > use(output.rows);");
});

test('collapses the same error repeated at one position (01/10: 68 × TS2540 on one line)', () => {
  const repeated = ['ATTRIBUTE_NODE', 'childNodes', 'saldoAtual'].map(name => `line 94:37 - TS2540 - Cannot assign to '${name}' because it is a read-only property.\n    > this[member] = value;`);
  const other = "line 120:5 - TS18047 - 'output' is possibly 'null'.\n    > output.rows";
  assert.deepEqual(compactDiagnostics([...repeated, other]), [
    "line 94:37 - TS2540 - Cannot assign to 'ATTRIBUTE_NODE' because it is a read-only property. (and 2 more of the same error at this position)\n    > this[member] = value;",
    other,
  ]);
  const many = Array.from({ length: 40 }, (_, index) => `line ${index + 1}:1 - TS1 - x`);
  assert.equal(compactDiagnostics(many).length, 31);
  assert.match(compactDiagnostics(many).at(-1)!, /… and 10 more distinct errors/u);
});

test('keeps the text when there is no offset, or when it already has a position', () => {
  assert.equal(locateDiagnostic({}, 'TS1 - x', source), 'TS1 - x');
  assert.equal(locateDiagnostic({ start: 3 }, 'file.ts:1:4 - TS1 - x', source), 'file.ts:1:4 - TS1 - x');
  assert.equal(locateDiagnostic({ start: 999 }, 'TS1 - x', source), 'TS1 - x');
});
