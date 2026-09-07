import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * One-way ratchet: prompts must not gain domain nouns from past modules.
 * Counts were measured 2026-09-07 (leaked-noun list, case-insensitive word match).
 * Cleaning a prompt means lowering the number in LEGACY; the test fails only when a count rises.
 */
const LEAKED = /\b(Project|Client|Pet|Petition|Material|Invoice|WorkTask|ChangeOrder|campaign|buildFlow|petShop|listaAssinatura)\b/gi;

const AGENT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const STEPS_ROOT = fileURLToPath(new URL('.', import.meta.url));

/** Expected counts measured 2026-09-07; ns12 set the class-E prompts to 0. */
const LEGACY: Record<string, { count: number; since: string }> = {
  'promptPlan.md': { count: 0, since: '2026-09-07' },
  'steps/e1/prompt.md': { count: 0, since: '2026-09-07' },
  'steps/e1/promptStatus.md': { count: 0, since: '2026-09-07' },
  'steps/e2/coverageJudge.md': { count: 0, since: '2026-09-07' },
  'steps/e2/coverageRepair.md': { count: 0, since: '2026-09-07' },
  'steps/e2/prompt.md': { count: 0, since: '2026-09-07' },
  'steps/e3/prompt.md': { count: 0, since: '2026-09-07' },
  'steps/e4/prompt.md': { count: 0, since: '2026-09-07' },
  'steps/e4/promptDerivations.md': { count: 0, since: '2026-09-07' },
  'steps/e4/promptEntity.md': { count: 3, since: '2026-09-07' },
  'steps/e4/promptRelationships.md': { count: 0, since: '2026-09-07' },
  'steps/e5/prompt.md': { count: 0, since: '2026-09-07' },
  'steps/e6/prompt.md': { count: 0, since: '2026-09-07' },
  'steps/e7/promptUseCase.md': { count: 3, since: '2026-09-07' },
  'steps/e8/promptHub.md': { count: 0, since: '2026-09-07' },
};

const ACCENT = /[À-ÿ]/u;
const PORTUGUESE_TERNARY = /portuguese\s*\?/g;

/**
 * Prompt accent-line ceiling. ns12 set every prompt to 0. The test fails only when a count rises.
 */
const ACCENT_LEGACY: Record<string, { count: number; since: string }> = {
  'promptPlan.md': { count: 0, since: '2026-09-07' },
  'steps/e1/prompt.md': { count: 0, since: '2026-09-07' },
  'steps/e1/promptStatus.md': { count: 0, since: '2026-09-07' },
  'steps/e2/coverageJudge.md': { count: 0, since: '2026-09-07' },
  'steps/e2/coverageRepair.md': { count: 0, since: '2026-09-07' },
  'steps/e2/prompt.md': { count: 0, since: '2026-09-07' },
  'steps/e3/prompt.md': { count: 0, since: '2026-09-07' },
  'steps/e4/prompt.md': { count: 0, since: '2026-09-07' },
  'steps/e4/promptDerivations.md': { count: 0, since: '2026-09-07' },
  'steps/e4/promptEntity.md': { count: 0, since: '2026-09-07' },
  'steps/e4/promptRelationships.md': { count: 0, since: '2026-09-07' },
  'steps/e5/prompt.md': { count: 0, since: '2026-09-07' },
  'steps/e6/prompt.md': { count: 0, since: '2026-09-07' },
  'steps/e7/promptUseCase.md': { count: 0, since: '2026-09-07' },
  'steps/e8/promptHub.md': { count: 0, since: '2026-09-07' },
};

/**
 * Generator `.ts` (not tests, not captured fixtures). Measured 2026-09-07 after ns12
 * subtracted the language regexes; ns11 took helpers/steps to 0; ns13 includes widgets/.
 */
const CODE_ACCENT_LINES = { count: 0, since: '2026-09-07' };
const CODE_PORTUGUESE_TERNARY = { count: 0, since: '2026-09-07' };

interface DomainHit { line: number; token: string }

function hitsIn(source: string): DomainHit[] {
  const hits: DomainHit[] = [];
  source.split('\n').forEach((text, index) => {
    for (const match of text.matchAll(LEAKED)) {
      hits.push({ line: index + 1, token: match[0] });
    }
  });
  return hits;
}

function promptFiles(): string[] {
  const files = ['promptPlan.md'];
  for (const step of readdirSync(STEPS_ROOT).sort()) {
    const dir = join(STEPS_ROOT, step);
    let names: string[] = [];
    try { names = readdirSync(dir); } catch { continue; }
    for (const name of names.sort()) {
      if (/^prompt.*\.md$/u.test(name)) files.push(`steps/${step}/${name}`);
      if (step === 'e2' && (name === 'coverageJudge.md' || name === 'coverageRepair.md')) {
        files.push(`steps/${step}/${name}`);
      }
      if (step === 'e8' && name === 'promptHub.md' && !files.includes(`steps/${step}/${name}`)) {
        files.push(`steps/${step}/${name}`);
      }
    }
  }
  return [...new Set(files)];
}

test('NS prompts do not gain leaked domain nouns (one-way ratchet)', () => {
  const scanned = promptFiles();
  for (const relative of scanned) {
    const expected = LEGACY[relative] || { count: 0, since: '2026-09-07' };
    const source = readFileSync(join(AGENT_ROOT, relative), 'utf8');
    const hits = hitsIn(source);
    if (hits.length > expected.count) {
      const detail = hits.map(hit => `${relative}:${hit.line}:${hit.token}`).join('\n');
      assert.fail(
        `${relative} domain-noun count rose from ${expected.count} (since ${expected.since}) to ${hits.length}.\n${detail}`,
      );
    }
    if (!(relative in LEGACY) && hits.length > 0) {
      const detail = hits.map(hit => `${relative}:${hit.line}:${hit.token}`).join('\n');
      assert.fail(`${relative} is not in the ratchet table and has ${hits.length} leaked noun(s).\n${detail}`);
    }
  }
  for (const relative of Object.keys(LEGACY)) {
    assert.ok(scanned.includes(relative), `ratchet table names missing file ${relative}`);
  }
  assert.equal(LEGACY['steps/e4/prompt.md'].count, 0);
  assert.equal(hitsIn(readFileSync(join(AGENT_ROOT, 'steps/e4/prompt.md'), 'utf8')).length, 0);
});

function accentLinesIn(source: string): number[] {
  return source.split('\n').flatMap((text, index) => ACCENT.test(text) ? [index + 1] : []);
}

test('NS prompts do not gain accented lines (one-way ratchet)', () => {
  const scanned = promptFiles();
  for (const relative of scanned) {
    const expected = ACCENT_LEGACY[relative] || { count: 0, since: '2026-09-07' };
    const lines = accentLinesIn(readFileSync(join(AGENT_ROOT, relative), 'utf8'));
    if (lines.length > expected.count) {
      assert.fail(
        `${relative} accent-line count rose from ${expected.count} (since ${expected.since}) to ${lines.length} (lines ${lines.join(', ')}).`,
      );
    }
    if (!(relative in ACCENT_LEGACY) && lines.length > 0) {
      assert.fail(`${relative} is not in the accent ratchet table and has ${lines.length} accented line(s).`);
    }
  }
  for (const relative of Object.keys(ACCENT_LEGACY)) {
    assert.ok(scanned.includes(relative), `accent ratchet table names missing file ${relative}`);
  }
});

function walkTs(dir: string, relative: string, into: string[]): void {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const rel = relative ? `${relative}/${name}` : name;
    let statNames: string[] = [];
    try { statNames = readdirSync(full); } catch {
      if (name.endsWith('.ts')) into.push(rel);
      continue;
    }
    walkTs(full, rel, into);
  }
}

function generatorTsFiles(): string[] {
  const files: string[] = [];
  walkTs(AGENT_ROOT, '', files);
  return files.filter(relative =>
    !relative.endsWith('.test.ts')
    && !relative.includes('/fixtures/')
    && !relative.startsWith('fixtures/'));
}

/** ns08 leftover domain regex; ns11 does not touch it. */
const ACCENT_FILE_EXCEPTIONS = new Set(['steps/e4/gate.ts']);

test('NS generator code does not gain accented lines or portuguese ternaries (one-way ratchet)', () => {
  let accentLines = 0;
  let ternaries = 0;
  const accentHits: string[] = [];
  for (const relative of generatorTsFiles()) {
    const source = readFileSync(join(AGENT_ROOT, relative), 'utf8');
    const lines = ACCENT_FILE_EXCEPTIONS.has(relative) ? [] : accentLinesIn(source);
    if (lines.length) {
      accentLines += lines.length;
      accentHits.push(`${relative}:${lines.join(',')}`);
    }
    const matches = source.match(PORTUGUESE_TERNARY);
    if (matches) ternaries += matches.length;
  }
  if (accentLines > CODE_ACCENT_LINES.count) {
    assert.fail(
      `generator accent-line count rose from ${CODE_ACCENT_LINES.count} (since ${CODE_ACCENT_LINES.since}) to ${accentLines}.\n${accentHits.join('\n')}`,
    );
  }
  if (ternaries > CODE_PORTUGUESE_TERNARY.count) {
    assert.fail(
      `generator portuguese-ternary count rose from ${CODE_PORTUGUESE_TERNARY.count} (since ${CODE_PORTUGUESE_TERNARY.since}) to ${ternaries}.`,
    );
  }
});

test('NS widgets do not switch language in code', () => {
  const widgetsDir = join(AGENT_ROOT, 'widgets');
  for (const name of readdirSync(widgetsDir).sort()) {
    if (!name.endsWith('.ts') || name.endsWith('.test.ts')) continue;
    const source = readFileSync(join(widgetsDir, name), 'utf8');
    assert.doesNotMatch(source, /startsWith\('pt'\)/, name);
    assert.doesNotMatch(source, /startsWith\('es'\)/, name);
    assert.doesNotMatch(source, /\blabels\.(pt|es)\b/, name);
  }
});
