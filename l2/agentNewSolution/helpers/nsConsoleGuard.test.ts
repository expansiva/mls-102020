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

};

/** True when `index` sits inside a `...` template. Nested ${`...`} is not modeled. */
function isInsideTemplate(source: string, index: number): boolean {
  let inside = false;
  for (let i = 0; i < index; i++) {
    if (source[i] === '\\') { i++; continue; }
    if (source[i] === '`') inside = !inside;
  }
  return inside;
}

/**
 * Count run-path console.info|log|warn calls.
 * A match inside a template literal is source being *emitted* (`lines.push(\`console.warn(...)\`)`,
 * `push(\`...\`)`, or an array of template lines) — not a call. A real call is never inside a
 * template: `console.warn('x')` and `console.warn(\`x\`)` both match *before* the backtick.
 */
function countCalls(source: string): Record<Kind, number> {
  const slot: Record<Kind, number> = { info: 0, log: 0, warn: 0 };
  const re = new RegExp(CALL.source, CALL.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    if (isInsideTemplate(source, match.index)) continue;
    slot[match[1] as Kind] += 1;
  }
  return slot;
}

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
      const slot = countCalls(readFileSync(full, 'utf8'));
      if (slot.info || slot.log || slot.warn) counts.set(rel, slot);
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
  assert.equal(counts.get('agentChangeFrontend/helpers/cfeSharedScaffold.ts'), undefined);
  assertClean('agentChangeFrontend', counts, ALLOWED);
});

void test('nsConsoleGuard: emitted console.warn in a template is ignored; a real call is not', () => {
  const emitted = [
    "lines.push(`          console.warn('handleIcaStateChange: unknown value for ${state.name}');`);",
    "push(`      console.warn('setX: unknown value');`);",
    "`      console.warn('setUiScenary: unknown value');`,",
  ].join('\n');
  assert.deepEqual(countCalls(emitted), { info: 0, log: 0, warn: 0 });

  const called = "        console.warn('handleIcaStateChange: unknown value');\n";
  assert.deepEqual(countCalls(called), { info: 0, log: 0, warn: 1 });

  const calledWithTemplateArg = '        console.warn(`unknown value ${x}`);\n';
  assert.deepEqual(countCalls(calledWithTemplateArg), { info: 0, log: 0, warn: 1 });

  assert.deepEqual(countCalls(`${emitted}\n${called}`), { info: 0, log: 0, warn: 1 });
});
