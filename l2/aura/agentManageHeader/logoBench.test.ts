/// <mls fileReference="_102020_/l2/aura/agentManageHeader/logoBench.test.ts" enhancement="_blank"/>

// Isolated bench for the brand-mark generation (agentGenerateLogo), per skills/agentTest.md.
//
// Why a bench and not just a live test: "which model draws the best logo" is not answerable from the
// prompt alone, and the mechanical validator already gives an OBJECTIVE score (a mark that trips
// validateLogoSvg is unusable regardless of taste). So this file sends the REAL production prompt to
// each modelType, scores every answer, prints a scoreboard, and writes an HTML gallery so the one
// thing a machine cannot judge — does it look professional — can be judged by eye in one place.
//
// Off by default (network). To run:
//   AGENT_LIVE_TESTS=1 npx tsx --import ./test/register-hooks.mjs --import ./test/setup-l2.ts \
//     --test mls-102020/l2/aura/agentManageHeader/logoBench.test.ts
// Knobs: AGENT_LIVE_RUNS=3 (runs per case), LOGO_BENCH_MODELS=code,design,reasoning,general
//        LOGO_BENCH_OUT=<dir> (gallery destination; defaults to the OS temp dir)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';
import { callToolProvider, liveRuns, liveTestsEnabled, parseEnvFile } from '/_102025_/l2/testLlmClient.js';
import { buildGenerateLogoHumanPrompt, normalizeLogoRequest, validateLogoSvg } from '/_102020_/l2/aura/agentManageHeader/helpers/generateLogoCore.js';
import { skill as logoContract } from '/_102020_/l2/aura/agentManageHeader/skills/logoContract.js';
import { isSafeLogoSvg } from '/_102033_/l2/shared/layout/auraHeaderCore.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../..');

/** The production system prompt, minus the [[OutputSection]] placeholder the runtime expands. */
const SYSTEM = `
You are a brand designer who writes SVG by hand. You draw ONE small monochrome mark for an app, and
you return its markup — nothing else. Restraint is the whole job: the mark lives at 28px next to the
brand name, so a shape that reads instantly beats a clever illustration.

${logoContract}
`;

/** Mirrors the agent's Output type, as a strict tool (the bench path collab-llm validates). */
const SVG_TOOL = {
  type: 'function',
  function: {
    name: 'result',
    description: 'Return the brand mark as inline SVG markup.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['svg'],
      properties: {
        svg: { type: 'string', description: 'A single <svg> root with a viewBox, painted with currentColor only.' },
        notes: { type: 'string', description: 'One or two sentences on the choice made.' },
      },
    },
  },
};

const CASES = [
  { name: 'monogram-cafe', request: { projectId: 999999, brandTitle: 'Cafe Flow', brief: 'cafeteria acolhedora, xicara e grao', style: 'monogram' } },
  { name: 'mark-cafe', request: { projectId: 999999, brandTitle: 'Cafe Flow', brief: 'cafeteria acolhedora, xicara e grao', style: 'mark' } },
  { name: 'monogram-build', request: { projectId: 999999, brandTitle: 'Build Flow', brief: 'gestao de obras, preciso e tecnico', style: 'monogram' } },
] as const;

interface Attempt {
  modelType: string;
  caseName: string;
  run: number;
  status: number;
  svg: string;
  errors: string[];
  notes: string;
}

function models(): string[] {
  const raw = process.env.LOGO_BENCH_MODELS;
  return raw ? raw.split(',').map((value) => value.trim()).filter(Boolean) : ['code', 'design'];
}

function config() {
  // CRLF is stripped here on purpose: parseEnvFile's line regex ends in `(.*)$` without the `m`
  // flag, and `.` does not match a CR — so on a Windows-checked-out .env NO line matches and the
  // config comes back empty. The base is shared by every agent test; normalizing in the node half
  // (which is where the file reading already lives) keeps this bench working without touching it.
  const raw = readFileSync(path.join(MLS_BASE, '.env'), 'utf8').replace(/\r/gu, '');
  return parseEnvFile(raw);
}

/** Cheap geometry facts — what a human notices at 28px and a validator does not check. */
function geometry(svg: string): { shapes: number; strokes: string[]; bytes: number } {
  const shapes = [...svg.matchAll(/<(rect|circle|ellipse|path|polygon|polyline|line)\b/gu)].length;
  const strokes = [...new Set([...svg.matchAll(/stroke-width\s*=\s*"([^"]*)"/gu)].map((match) => match[1]))];
  return { shapes, strokes, bytes: svg.length };
}

function galleryHtml(attempts: Attempt[]): string {
  const cards = attempts.map((attempt) => {
    const ok = attempt.errors.length === 0;
    const geo = geometry(attempt.svg);
    return `<figure class="${ok ? 'ok' : 'bad'}">
      <div class="band">${attempt.svg || '<em>(vazio)</em>'}</div>
      <div class="band dark">${attempt.svg || ''}</div>
      <figcaption>
        <strong>${attempt.modelType}</strong> · ${attempt.caseName} · run ${attempt.run}<br>
        ${geo.shapes} shapes · strokes [${geo.strokes.join(', ')}] · ${geo.bytes}B<br>
        ${ok ? '<span class="pass">valido</span>' : `<span class="fail">${attempt.errors.join('; ')}</span>`}
        ${attempt.notes ? `<div class="notes">${attempt.notes}</div>` : ''}
      </figcaption>
    </figure>`;
  }).join('\n');

  return `<!doctype html><meta charset="utf-8"><title>Logo bench</title>
<style>
  body { font: 14px system-ui; margin: 24px; background: #fafafa; color: #102a43; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
  figure { margin: 0; border: 1px solid #d9e2ec; border-radius: 12px; background: #fff; overflow: hidden; }
  figure.bad { border-color: #f7c6c7; }
  /* The band is the real context: 66px tall, mark at 28px, next to the brand name. */
  .band { display: flex; align-items: center; gap: 10px; height: 66px; padding: 0 16px; color: #102a43; background: #fff; border-bottom: 1px solid #eef2f6; }
  .band.dark { color: #f8fafc; background: #17324d; }
  .band svg { height: 28px; width: auto; display: block; }
  figcaption { padding: 10px 12px; font-size: 12px; line-height: 1.5; }
  .pass { color: #0b7a3b; font-weight: 600; }
  .fail { color: #b91c1c; }
  .notes { margin-top: 6px; color: #52606d; }
</style>
<h1>Logo bench</h1>
<p>Cada card mostra a marca no tamanho real da banda, em claro e escuro (currentColor).</p>
<div class="grid">${cards}</div>`;
}

void test('logo bench: score every modelType on the real prompt', { skip: !liveTestsEnabled() }, async () => {
  const cfg = config();
  const attempts: Attempt[] = [];

  for (const modelType of models()) {
    for (const testCase of CASES) {
      for (let run = 1; run <= liveRuns(); run += 1) {
        const request = normalizeLogoRequest(testCase.request);
        const result = await callToolProvider(cfg, {
          modelType,
          system: SYSTEM,
          human: buildGenerateLogoHumanPrompt(request),
          tool: SVG_TOOL,
          maxTokens: 2000,
        });

        const args = (result.args ?? {}) as { svg?: unknown; notes?: unknown };
        const svg = typeof args.svg === 'string' ? args.svg.trim() : '';
        const errors = svg ? validateLogoSvg(svg) : [`no svg returned (HTTP ${result.status})`];
        attempts.push({
          modelType,
          caseName: testCase.name,
          run,
          status: result.status,
          svg,
          errors,
          notes: typeof args.notes === 'string' ? args.notes : '',
        });
      }
    }
  }

  // Scoreboard: the objective half of "which model is better".
  const scoreboard = new Map<string, { total: number; valid: number; reasons: Map<string, number> }>();
  for (const attempt of attempts) {
    const row = scoreboard.get(attempt.modelType) ?? { total: 0, valid: 0, reasons: new Map<string, number>() };
    row.total += 1;
    if (attempt.errors.length === 0) row.valid += 1;
    for (const error of attempt.errors) {
      const key = error.split('—')[0].trim().slice(0, 60);
      row.reasons.set(key, (row.reasons.get(key) ?? 0) + 1);
    }
    scoreboard.set(attempt.modelType, row);
  }

  console.log('\n=== logo bench ===');
  for (const [modelType, row] of scoreboard) {
    console.log(`${modelType}: ${row.valid}/${row.total} valid`);
    for (const [reason, count] of [...row.reasons].sort((a, b) => b[1] - a[1])) {
      console.log(`   ${count}x ${reason}`);
    }
  }

  const outDir = process.env.LOGO_BENCH_OUT || path.join(tmpdir(), 'logo-bench');
  mkdirSync(outDir, { recursive: true });
  const galleryPath = path.join(outDir, 'gallery.html');
  writeFileSync(galleryPath, galleryHtml(attempts), 'utf8');
  console.log(`\ngallery: ${galleryPath}\n`);

  // The bench is a diagnostic, but one thing must hold: the model the agent SHIPS with has to be
  // able to draw a usable mark. Everything else is for the eye and the scoreboard.
  const production = scoreboard.get('design');
  if (production) {
    assert.ok(production.valid > 0, `the production modelType produced no valid mark in ${production.total} runs`);
  }
  // And a mark the generator accepts must always be renderable by the runtime.
  for (const attempt of attempts.filter((item) => item.errors.length === 0)) {
    assert.ok(isSafeLogoSvg(attempt.svg), `runtime refused a mark the generator accepted (${attempt.modelType}/${attempt.caseName})`);
  }
});
