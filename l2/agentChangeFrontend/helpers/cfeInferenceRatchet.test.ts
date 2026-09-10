/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeInferenceRatchet.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * One-way ratchet on CF name-inference of pickers / identifying fields.
 * Counts measured 2026-09-08 (n05). This spec does not change CF behaviour — it only locks the
 * current counts so they cannot rise. Phase 3 of the CF will lower them.
 */
const ROOT = dirname(fileURLToPath(import.meta.url));

const ID_DOLLAR = /\/Id\$\/[gium]*/g;
const ENDS_WITH_ID = /\.endsWith\(\s*['"](?:Id|_id|id)['"]\s*\)/gi;
const INCLUDES_WORD = /\.includes\(\s*['"][A-Za-z]{2,}['"]\s*\)/g;

interface InferenceLegacy { idDollar: number; endsWithId: number; includesWord: number; since: string }

const LEGACY: Record<string, InferenceLegacy> = {
  'cfeCreateShared.ts': { idDollar: 2, endsWithId: 2, includesWord: 6, since: '2026-09-08' },
  'cfeMaterializeCore.ts': { idDollar: 3, endsWithId: 0, includesWord: 5, since: '2026-09-08' },
};

function countsIn(source: string): { idDollar: number; endsWithId: number; includesWord: number } {
  return {
    idDollar: [...source.matchAll(ID_DOLLAR)].length,
    endsWithId: [...source.matchAll(ENDS_WITH_ID)].length,
    includesWord: [...source.matchAll(INCLUDES_WORD)].length,
  };
}

test('n05 CF ratchet file stays English in comments and identifiers', () => {
  const source = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  assert.doesNotMatch(source, /portuguese\s*\?/);
  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    if (!(trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*'))) continue;
    assert.doesNotMatch(line, /[À-ÿ]/, trimmed);
  }
});

test('CF does not gain name-inference of pickers or identifying fields (one-way ratchet)', () => {
  for (const [relative, expected] of Object.entries(LEGACY)) {
    const source = readFileSync(join(ROOT, relative), 'utf8');
    const got = countsIn(source);
    if (got.idDollar > expected.idDollar) {
      assert.fail(`${relative} /Id$/ count rose from ${expected.idDollar} (since ${expected.since}) to ${got.idDollar}`);
    }
    if (got.endsWithId > expected.endsWithId) {
      assert.fail(`${relative} endsWith(Id) count rose from ${expected.endsWithId} (since ${expected.since}) to ${got.endsWithId}`);
    }
    if (got.includesWord > expected.includesWord) {
      assert.fail(`${relative} .includes('<word>') count rose from ${expected.includesWord} (since ${expected.since}) to ${got.includesWord}`);
    }
  }
});
