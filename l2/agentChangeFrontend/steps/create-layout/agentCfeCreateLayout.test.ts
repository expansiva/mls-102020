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

// Redesign (102051 run16/run17): the tool contract is now a minimal SEMANTIC COMPOSITION. Organisms
// carry only { id, organismName, purpose, order } + optional { displayHint, uses, notes } — never the
// rigid intention/field tree the model kept drifting on ("organisms/N must NOT have additional
// properties"). The concrete intentions/fields are expanded deterministically from L4 afterwards.
void test('agentCfeCreateLayout organism schema is the minimal composition', async () => {
  const mod = await loadCreateShared();
  const organismSchema = mod.cfePageLayoutToolSchema.function.parameters
    .properties.result.properties.pageLayout.properties.sections.items.properties.organisms.items;
  assert.equal(organismSchema.additionalProperties, false, 'organism schema must stay closed (lint/strict)');
  assert.deepEqual([...Object.keys(organismSchema.properties)].sort(), ['displayHint', 'id', 'notes', 'order', 'organismName', 'purpose', 'uses']);
  assert.deepEqual([...organismSchema.required].sort(), ['id', 'order', 'organismName', 'purpose']);
  assert.ok(!('intentions' in organismSchema.properties), 'organism must NOT carry an intention tree');
});

void test('agentCfeCreateLayout normalizes to a minimal composition (uses + displayHint kept)', async () => {
  const mod = await loadCreateShared() as unknown as { extractCfePageLayoutOutput: (p: unknown) => any };
  const payload = {
    status: 'ok',
    result: {
      pageLayout: {
        pageId: 'dashboardWorkspace',
        layoutId: 'dashboardWorkspace.page21.goal_first',
        sections: [{
          id: 'sec.kpiOverview', sectionName: 'KPI Overview', order: 1,
          organisms: [{
            id: 'org-kpi', organismName: 'OperationalKpiSummary', purpose: 'Show shift KPIs.',
            order: 1, displayHint: 'summary-first', uses: ['getDashboardQuery'],
          }],
        }],
      },
    },
  };
  const out = mod.extractCfePageLayoutOutput(payload);
  assert.equal(out.status, 'ok');
  const organism = out.result.pageLayout.sections[0].organisms[0];
  assert.equal(organism.displayHint, 'summary-first');
  assert.deepEqual(organism.uses, ['getDashboardQuery']);
  assert.ok(!('intentions' in organism), 'normalized composition organism has no intention tree');
});

// The concrete intention/field tree is expanded deterministically from L4 by the agent (not the model),
// so downstream (reconcile/render/validate/materialize) still receives the full structure it expects.
void test('agentCfeCreateLayout expands a composition into the full L4-derived layout', async () => {
  const mod = await loadCreateShared() as unknown as { expandLayoutComposition: (p: unknown, c: unknown) => any };
  const prepared = {
    page: { pageId: 'catalog', pageName: 'Catalog', moduleName: 'shop' },
    commands: [
      { commandName: 'browseProductsQuery', kind: 'query', purpose: 'Browse products', output: [{ name: 'name' }, { name: 'price' }], input: [], rulesApplied: [] },
      { commandName: 'createProductCmd', kind: 'command', purpose: 'Create product', input: [{ name: 'name', presentation: 'form' }], output: [], rulesApplied: [] },
    ],
  };
  const composition = {
    pageId: 'catalog', layoutId: 'catalog.page11.x',
    sections: [{ id: 'sec.main', sectionName: 'Main', order: 1, organisms: [
      { id: 'org.list', organismName: 'ProductList', purpose: 'List products', order: 1, displayHint: 'list', uses: ['browseProductsQuery'] },
      { id: 'org.form', organismName: 'ProductForm', purpose: 'Create product', order: 2, displayHint: 'form', uses: ['createProductCmd'] },
    ] }],
  };
  const full = mod.expandLayoutComposition(prepared, composition);
  const organisms = full.sections[0].organisms;
  assert.equal(organisms.length, 2);
  // The model's composition identity/hint rides through.
  assert.equal(organisms[0].id, 'org.list');
  assert.equal(organisms[0].displayHint, 'list');
  assert.deepEqual(organisms[0].userActions, ['browseProductsQuery']);
  // Columns/fields are derived from L4 — the model did NOT author them.
  assert.ok(organisms[0].intentions.length >= 1, 'query organism has an intention');
  assert.ok(organisms[0].intentions[0].columns.some((c: { field: string }) => c.field === 'name'), 'list columns come from L4 output');
  assert.ok(organisms[1].intentions[0].fields.some((f: { field: string }) => f.field === 'name'), 'form fields come from L4 input');
  assert.deepEqual(organisms[1].userActions, ['createProductCmd']);
});

// Coverage guarantee: if the model's `uses` omit a command, expansion must still surface it (else
// validatePageLayout rejects "does not represent operation"). Restores the deterministic seed's guarantee.
void test('agentCfeCreateLayout backfills commands the composition leaves uncovered', async () => {
  const mod = await loadCreateShared() as unknown as { expandLayoutComposition: (p: unknown, c: unknown) => any };
  const prepared = {
    page: { pageId: 'catalog', pageName: 'Catalog', moduleName: 'shop' },
    commands: [
      { commandName: 'browseProductsQuery', kind: 'query', purpose: 'Browse', output: [{ name: 'name' }], input: [], rulesApplied: [] },
      { commandName: 'createProductCmd', kind: 'command', purpose: 'Create', input: [{ name: 'name', presentation: 'form' }], output: [], rulesApplied: [] },
    ],
  };
  // Composition only mentions the query — the command is omitted from every `uses`.
  const composition = { pageId: 'catalog', layoutId: 'catalog.page11.x', sections: [
    { id: 'sec.main', sectionName: 'Main', order: 1, organisms: [{ id: 'org.list', organismName: 'ProductList', purpose: 'List', order: 1, uses: ['browseProductsQuery'] }] },
  ] };
  const full = mod.expandLayoutComposition(prepared, composition);
  const covered = new Set(full.sections.flatMap((s: any) => s.organisms.flatMap((o: any) => o.userActions)));
  assert.ok(covered.has('browseProductsQuery'), 'query stays covered');
  assert.ok(covered.has('createProductCmd'), 'omitted command was backfilled deterministically');
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
