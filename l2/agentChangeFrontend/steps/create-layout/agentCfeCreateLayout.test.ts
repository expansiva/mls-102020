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

// Regression (102051 run16): the prompt (promptGoalFirst §32) tells the model to set `displayHint` on
// organisms and the page21 render skill reads it, but the organism tool schema omitted it. On a model
// without native strict (design->claude-sonnet), the strict tool-args gate then rejected the whole
// layout: "sections/N/organisms/N must NOT have additional properties". displayHint must be an allowed,
// carried-through organism property (mirroring intent.displayHint).
void test('agentCfeCreateLayout organism schema allows displayHint', async () => {
  const mod = await loadCreateShared();
  const organismSchema = mod.cfePageLayoutToolSchema.function.parameters
    .properties.result.properties.pageLayout.properties.sections.items.properties.organisms.items;
  assert.ok(organismSchema.properties.displayHint, 'organism schema must expose displayHint');
  assert.equal(organismSchema.additionalProperties, false, 'organism schema must stay closed (lint/strict)');
});

void test('agentCfeCreateLayout preserves organism displayHint through normalization', async () => {
  const mod = await loadCreateShared() as unknown as { extractCfePageLayoutOutput: (p: unknown) => any };
  const payload = {
    status: 'ok',
    result: {
      pageLayout: {
        pageId: 'dashboardWorkspace',
        layoutId: 'dashboardWorkspace.page21.goal_first',
        sections: [{
          id: 'sec.kpiOverview', type: 'section', sectionName: 'kpiOverview', titleKey: 'x.title', mode: 'view', order: 1,
          organisms: [{
            id: 'org-kpi', type: 'summary', organismName: 'OperationalKpiSummary', titleKey: 'org.title',
            displayHint: 'master-detail', purpose: 'p',
            userActions: ['getDashboard'], requiredEntities: ['OperationalDashboard'],
            readsFields: [], writesFields: [], rulesApplied: [], order: 1,
            intentions: [{ id: 'int.kpi', intent: 'view', order: 1 }],
          }],
        }],
      },
    },
  };
  const out = mod.extractCfePageLayoutOutput(payload);
  assert.equal(out.status, 'ok');
  assert.equal(out.result.pageLayout.sections[0].organisms[0].displayHint, 'master-detail');
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
