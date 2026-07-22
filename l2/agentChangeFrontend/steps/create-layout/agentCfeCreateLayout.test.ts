/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-layout/agentCfeCreateLayout.test.ts" enhancement="_blank"/>

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

void test('agentCfeCreateLayout tool schema is provider-clean', async () => {
  const mod = await loadCreateShared();
  const tool = mod.cfePageLayoutToolSchema;
  const errs = lintToolSchema(JSON.stringify(tool.function.parameters));
  assert.equal(errs, null, errs?.join(' | '));
});

for (const modelType of MODEL_TYPES) {
  void test(`agentCfeCreateLayout live @ ${modelType}: schema accepted + result has pageLayout`, { skip: !liveTestsEnabled() }, async () => {
    const mod = await loadCreateShared();
    const r = await callToolProvider(config(), {
      modelType,
      system: [
        '<!-- modelType: design -->',
        '<!-- x-tool-strict: true -->',
        `Return one semantic page layout through ${mod.cfePageLayoutToolName}.`,
      ].join('\n'),
      human: JSON.stringify({
        pageId: 'catalog',
        shared: { actions: [{ actionId: 'browseCatalog' }], fieldCatalog: ['Product.productId', 'Product.name'] },
        requirement: 'Create a compact catalog page with one section and one organism.',
      }, null, 2),
      tool: mod.cfePageLayoutToolSchema,
    });
    assertLiveResponse(r);
    assert.ok(isRecord(r.args) && isRecord(r.args.pageLayout), `${modelType}: result.pageLayout missing`);
  });
}

async function loadCreateShared(): Promise<{ cfePageLayoutToolName: string; cfePageLayoutToolSchema: any }> {
  const g = globalThis as unknown as Record<string, any>;
  if (!g.window) g.window = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  if (!g.document) g.document = { documentElement: { lang: 'pt-BR' }, addEventListener() {}, removeEventListener() {}, createElement: () => ({ style: {} }) };
  if (!g.mls) g.mls = { actualProject: 102020, stor: { files: {} } };
  if (!g.mls.events) g.mls.events = { addEventListener() {}, removeEventListener() {}, dispatch() {} };
  if (!g.mls.stor) g.mls.stor = { files: {} };
  const loaded = await import('/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js') as Record<string, any>;
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
