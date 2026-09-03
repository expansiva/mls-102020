/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/materialize/agentCfeMaterializeGen.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { callToolProvider, liveTestsEnabled, parseEnvFile } from '/_102025_/l2/testLlmClient.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..');
const MODEL_TYPES = ['code', 'design'] as const;

void test('agentCfeMaterializeGen tool schema is provider-clean', async () => {
  const mod = await loadMaterializeCore();
  const errs = lintToolSchema(JSON.stringify(mod.GEN_TOOL.function.parameters));
  assert.equal(errs, null, errs?.join(' | '));
});

for (const modelType of MODEL_TYPES) {
  void test(`agentCfeMaterializeGen live @ ${modelType}: schema accepted + returns code`, { skip: !liveTestsEnabled() }, async () => {
    const mod = await loadMaterializeCore();
    const r = await callToolProvider(config(), {
      modelType,
      system: mod.buildSystemPrompt([], '/_102020_/l2/mockPage.ts', modelType),
      human: [
        '## Definition',
        '```json',
        JSON.stringify({ componentName: 'mock-page-102020', purpose: 'Render a tiny mock page.' }, null, 2),
        '```',
        '',
        '## Output',
        'Generate only a minimal TypeScript file exporting an empty class. Call the tool with complete code.',
      ].join('\n'),
      tool: mod.GEN_TOOL,
    });
    assertLiveResponse(r);
    assert.ok(isRecord(r.args) && typeof r.args.code === 'string' && r.args.code.includes('class'), `${modelType}: code missing`);
  });
}

async function loadMaterializeCore(): Promise<{ GEN_TOOL: any; buildSystemPrompt: (skills: string[], outputPath: string, modelType: string) => string }> {
  const loaded = await import('/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js') as Record<string, any>;
  return loaded.default || loaded['module.exports'] || loaded;
}

function config() {
  return parseEnvFile(readFileSync(path.join(MLS_BASE, '.env'), 'utf8'));
}

function assertLiveResponse(r: { modelType: string; status: number; text: string; args: unknown; schemaReject: boolean }) {
  const sample = r.text.replace(/\s+/g, ' ').slice(0, 200);
  assert.ok(!r.schemaReject, `${r.modelType}: schema rejected (${r.status}): ${sample}`);
  assert.equal(r.status, 200, `${r.modelType}: expected 200, got ${r.status}: ${sample}`);
  assert.ok(r.args, `${r.modelType}: no tool_call result`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
