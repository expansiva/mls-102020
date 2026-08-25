/// <mls fileReference="_102020_/l2/aura/molecules/shared/contractFingerprint.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { contractFingerprint, fingerprintLabel } from '/_102020_/l2/aura/molecules/shared/contractFingerprint.js';

test('same text, same fingerprint', () => {
  const text = '# Contract\n\nA rule that matters.\n';
  assert.deepEqual(contractFingerprint(text), contractFingerprint(text));
});

test('one character apart, different hash', () => {
  const a = contractFingerprint('propagate per row');
  const b = contractFingerprint('propagate per Row');
  assert.equal(a.chars, b.chars);
  assert.notEqual(a.hash, b.hash);
});

test('chars counts characters, not UTF-8 bytes', () => {
  // The size budget of a contract is measured in characters, and the multibyte glyphs the files
  // actually use (⚠, ·, ×, →) would inflate a byte count by a few percent.
  const print = contractFingerprint('⚠ · × →');
  assert.equal(print.chars, 7);
});

test('empty and missing text are the FNV offset basis, never a throw', () => {
  assert.equal(contractFingerprint('').hash, '811c9dc5');
  assert.equal(contractFingerprint(undefined as unknown as string).chars, 0);
});

test('the hash is always 8 hex digits', () => {
  for (const text of ['', 'a', 'is-editing', 'x'.repeat(20000)]) {
    assert.match(contractFingerprint(text).hash, /^[0-9a-f]{8}$/);
  }
});

test('label reads as one line', () => {
  assert.equal(fingerprintLabel({ chars: 19548, hash: '9b52bbcb' }), '19548 chars · 9b52bbcb');
});

// THE INVARIANT THIS FILE EXISTS FOR: the runtime side (this module, what a trace records) and the
// local side (`harness/contract-fingerprint.mjs`, what the working copy holds) must compute the same
// pair, or comparing a trace against a file is meaningless. The values below were measured on
// 2026-08-25 with both implementations over the `skill` value of the groupViewTable contracts.
test('agrees with the harness script on measured values', () => {
  // Literal expectations, so changing the hash function fails HERE instead of silently splitting
  // the pair. Both values were printed by the two implementations on 2026-08-25.
  assert.deepEqual(contractFingerprint('is-editing'), { chars: 10, hash: 'e624fa9c' });
  assert.deepEqual(contractFingerprint('groupViewTable'), { chars: 14, hash: '6575baef' });
});
