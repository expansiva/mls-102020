/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsConsoleGuard.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const L2 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

type Kind = 'info' | 'log' | 'warn';
const CALL = /(?<![\w.])console\.(info|log|warn)\s*\(/g;

/** Run-path files that still print, with a one-line why. A NEW print outside this list fails the test. */
const ALLOWED: Record<string, { info?: number; log?: number; warn?: number; why: string }> = {
  'agentChangeFrontend/helpers/cfeCreateShared.ts': {
    warn: 2, why: 'dossier path missing — last-chance note that the verify trace was not written',
  },
  'agentChangeFrontend/helpers/cfeMaterializeStudio.ts': {
    warn: 1, why: 'per-file Monaco diagnostic line during materialize; not a provenance stamp',
  },
  'agentChangeFrontend/steps/materialize/agentCfeMaterializeGen.ts': {
    info: 3, warn: 1, why: 'scaffold bail/skip per page — still on the console; dedicated cleanup later',
  },
};

function collect(dir: string, prefix: string): Map<string, Record<Kind, number>> {
  const counts = new Map<string, Record<Kind, number>>();
  const walk = (current: string, relBase: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const rel = path.join(relBase, entry.name);
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full, rel);
        continue;
      }
      if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts') || entry.name.startsWith('nodejs')) continue;
      const text = readFileSync(full, 'utf8');
      let match: RegExpExecArray | null;
      CALL.lastIndex = 0;
      while ((match = CALL.exec(text))) {
        const kind = match[1] as Kind;
        const slot = counts.get(rel) || { info: 0, log: 0, warn: 0 };
        slot[kind] += 1;
        counts.set(rel, slot);
      }
    }
  };
  walk(dir, prefix);
  return counts;
}

function assertClean(label: string, counts: Map<string, Record<Kind, number>>, allowed: typeof ALLOWED): void {
  const unexpected: string[] = [];
  for (const [file, slot] of counts) {
    const allow = allowed[file];
    if (!allow) {
      unexpected.push(`${file} info=${slot.info} log=${slot.log} warn=${slot.warn} (not in allowlist)`);
      continue;
    }
    for (const kind of ['info', 'log', 'warn'] as Kind[]) {
      const got = slot[kind];
      const max = allow[kind] ?? 0;
      if (got > max) unexpected.push(`${file} ${kind}=${got} max=${max} (${allow.why})`);
    }
  }
  for (const file of Object.keys(allowed)) {
    if (!counts.has(file) && (allowed[file].info || allowed[file].log || allowed[file].warn)) {
      unexpected.push(`${file} listed in allowlist but has no console.info|log|warn — drop the exception`);
    }
  }
  assert.equal(unexpected.length, 0, `${label}:\n${unexpected.join('\n')}`);
}

void test('ns run path has no console.info|log|warn (only console.error)', () => {
  const counts = collect(path.join(L2, 'agentNewSolution'), 'agentNewSolution');
  assertClean('agentNewSolution', counts, {});
});

void test('CF run path: stamp is not printed; remaining prints are declared', () => {
  const counts = collect(path.join(L2, 'agentChangeFrontend'), 'agentChangeFrontend');
  assert.equal(counts.get('agentChangeFrontend/helpers/cfeBuildStamp.ts'), undefined);
  assertClean('agentChangeFrontend', counts, ALLOWED);
});
