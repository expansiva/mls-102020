/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e6-journey-map/e6DetailLive.test.ts" enhancement="_blank"/>

// LIVE per-step content test for the E6 DETAIL phase (submitNsWorkspaceDetail) — the phase that failed
// in the 102051 run12 (TOOL_ARGS_SCHEMA on stockManagement; bff.output.from.unknownOp on shiftCommand/
// posWorkspace/menuManagement). Builds the REAL detail prompt from the REAL cafeFlow slices (inlined as
// fixtures) and sends it via testLlmClient — for BOTH modelTypes — then replays the REAL detail pipeline
// (prepare → derive → slice-owned fields → equality + scoped invariants), exactly like handleDetailResult.
// Catches SYSTEMATIC content/prompt issues the site-map-only live test cannot. DIAGNOSTIC, not CI.
//
// GATED: skipped unless live tests are enabled (AGENT_LIVE_TESTS=1).
//   Run:  AGENT_LIVE_TESTS=1 node scripts/run-tests.mjs 102020

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { liveTestsEnabled, liveRuns, callToolProvider, parseEnvFile } from '/_102025_/l2/testLlmClient.js';
import { createNsToolSchema, buildNsToolInstruction } from '/_102020_/l2/agentNewSolution/helpers/nsLlm.js';
import {
  E6GateContext,
  NsE6OperationFact,
  NsE6Workspace,
  deriveE6BffRoutes,
  prepareE6JourneyMap,
  repairE6BffFroms,
  validateE6Invariants,
} from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/gate.js';
import { validateE6WorkspaceEquality, NsE6SiteMapWorkspace } from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/siteMap.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..'); // .../mls-base
const DETAIL_TOOL = 'submitNsWorkspaceDetail';
const MODEL_TYPES = ['code', 'design'] as const; // code=Grok, design=Kimi — the two strict-tool providers
const MODULE = 'cafeFlow';
const config = () => parseEnvFile(readFileSync(path.join(MLS_BASE, '.env'), 'utf8'));

// ── FIXTURES: the two run12 failure profiles, verbatim from the 102051 cafeFlow artifacts ────────────
// stockManagement — the slice whose detail call was REJECTED at the provider (TOOL_ARGS_SCHEMA: kimi
// emitted {} entries; grok dropped `sections`). shiftCommand — the slice whose detail passed the schema
// but failed the gate (item `from` written relative — "$items.col" — instead of "<op>.$items.col").
const SLICES: Record<string, NsE6SiteMapWorkspace> = {
  stockManagement: {
    workspaceId: 'stockManagement',
    title: 'Gestão do estoque',
    actors: ['gerente'],
    kind: 'operation',
    entity: 'StockItem',
    operationIds: ['queryStockItems', 'createStockItem', 'updateStockItem', 'adjustStockQuantity'],
    purpose: 'O gerente mantém os itens de estoque, repõe quantidades e identifica itens com estoque baixo.',
  },
  shiftCommand: {
    workspaceId: 'shiftCommand',
    title: 'Turno e visão do dia',
    actors: ['gerente'],
    kind: 'workflow',
    entity: 'Shift',
    operationIds: ['openShift', 'viewDashboard', 'closeShift', 'viewShiftReport'],
    purpose: 'O gerente abre o turno, acompanha o dashboard do dia e fecha o turno consultando o relatório de fechamento.',
    workflowId: 'shiftLifecycle',
  },
};

// Prompt-side summaries (summarizeOperationDefs output) + gate-side facts (buildE6OperationFacts output),
// both computed from the REAL cafeFlow operation defs.
interface OperationFixture {
  summary: Record<string, unknown>;
  fact: NsE6OperationFact;
}

const OPERATIONS: Record<string, OperationFixture> = {
  queryStockItems: fixture({
    id: 'queryStockItems', title: 'Listar itens de estoque', actor: 'gerente', entity: 'StockItem', kind: 'query', pageId: 'queryStockItems',
    storySteps: [
      'O gerente abre a consulta de itens de estoque',
      'O sistema lista os itens com nome, unidade, quantidade atual, estoque mínimo e status',
      'O gerente pode filtrar por status ou apenas itens em estoque baixo',
    ],
    inputNames: ['status', 'name', 'lowStockOnly', 'page', 'pageSize'],
    outputTopPaths: ['stockItems', 'total', '$items'],
    outputItemPaths: [
      'stockItems.$items.stockItemId', 'stockItems.$items.name', 'stockItems.$items.unit', 'stockItems.$items.currentQuantity',
      'stockItems.$items.minimumLevel', 'stockItems.$items.status', 'stockItems.$items.notes', 'stockItems.$items.isLowStock',
      'stockItems.$items.createdAt', 'stockItems.$items.updatedAt',
      '$items.stockItemId', '$items.name', '$items.unit', '$items.currentQuantity', '$items.minimumLevel',
      '$items.status', '$items.notes', '$items.isLowStock', '$items.createdAt', '$items.updatedAt',
    ],
  }, { accessPatternKind: 'list', selection: 'single', opKind: 'query', hasPublicInput: true }),
  createStockItem: fixture({
    id: 'createStockItem', title: 'Cadastrar item de estoque', actor: 'gerente', entity: 'StockItem', kind: 'create', pageId: 'createStockItem',
    storySteps: ['Informar o nome do ingrediente', 'Selecionar a unidade de medida', 'Confirmar o cadastro'],
    inputNames: ['name', 'unit', 'currentQuantity', 'minimumLevel', 'status', 'notes', 'stockItemId', 'createdAt', 'updatedAt'],
    outputTopPaths: ['stockItemId', 'name', 'unit', 'currentQuantity', 'minimumLevel', 'status', 'notes', 'createdAt', 'updatedAt'],
    outputItemPaths: [],
  }, { accessPatternKind: 'commandInput', selection: 'none', opKind: 'create', hasPublicInput: true }),
  updateStockItem: fixture({
    id: 'updateStockItem', title: 'Atualizar item de estoque', actor: 'gerente', entity: 'StockItem', kind: 'update', pageId: 'updateStockItem',
    storySteps: ['Seleciona o item de estoque a alterar', 'Edita nome, unidade de medida, estoque mínimo, status ou observações', 'Confirma a atualização do cadastro'],
    inputNames: ['stockItemId', 'name', 'unit', 'minimumLevel', 'status', 'notes', 'updatedAt'],
    outputTopPaths: ['stockItemId', 'name', 'unit', 'currentQuantity', 'minimumLevel', 'status', 'notes', 'updatedAt'],
    outputItemPaths: [],
  }, { accessPatternKind: 'commandInput', selection: 'single', opKind: 'update', hasPublicInput: true }),
  adjustStockQuantity: fixture({
    id: 'adjustStockQuantity', title: 'Repor ou ajustar estoque', actor: 'gerente', entity: 'StockAdjustment', kind: 'create', pageId: 'adjustStockQuantity',
    storySteps: ['Seleciona o item de estoque a ajustar', 'Informa a direção do ajuste (entrada, saída ou correção), a quantidade e o motivo obrigatório', 'Confirma o registro do ajuste'],
    inputNames: ['stockItemId', 'direction', 'quantity', 'reason', 'notes', 'stockAdjustmentId', 'performedByUserId', 'status', 'occurredAt', 'createdAt', 'updatedAt'],
    outputTopPaths: ['stockAdjustmentId', 'stockItemId', 'direction', 'quantity', 'reason', 'status', 'occurredAt', 'notes', 'currentQuantity'],
    outputItemPaths: [],
  }, { accessPatternKind: 'commandInput', selection: 'none', opKind: 'create', hasPublicInput: true }),
  openShift: fixture({
    id: 'openShift', title: 'Abrir turno diário', actor: 'gerente', entity: 'Shift', kind: 'create', pageId: 'shiftLifecycle',
    storySteps: ['Confirma o contexto da unidade correta', 'Informa observações operacionais opcionais de abertura', 'Confirma a abertura do turno do dia'],
    inputNames: ['notes', 'unitId', 'openedByUserId', 'shiftId', 'openedAt', 'createdAt', 'updatedAt'],
    outputTopPaths: ['shiftId', 'unitId', 'openedByUserId', 'openedAt', 'status', 'notes', 'createdAt', 'updatedAt'],
    outputItemPaths: [],
  }, { accessPatternKind: 'commandInput', selection: 'none', opKind: 'create', hasPublicInput: true }),
  viewDashboard: fixture({
    id: 'viewDashboard', title: 'Visualizar dashboard do dia', actor: 'gerente', entity: 'Shift', kind: 'view', pageId: 'viewDashboard',
    storySteps: [
      'O gerente acessa o dashboard do dia',
      'O sistema agrega vendas e pedidos do turno, monta o ranking de mais vendidos e lista itens abaixo do estoque mínimo',
      'O gerente visualiza indicadores de vendas, ranking e alertas de estoque',
    ],
    inputNames: ['shiftId', 'unitId'],
    outputTopPaths: ['shiftId', 'unitId', 'status', 'openedAt', 'totalSales', 'totalOrders', 'topSellers', 'lowStockAlerts', '$items'],
    outputItemPaths: [
      'topSellers.$items.menuItemId', 'topSellers.$items.name', 'topSellers.$items.quantity',
      'lowStockAlerts.$items.stockItemId', 'lowStockAlerts.$items.name', 'lowStockAlerts.$items.currentQuantity',
      'lowStockAlerts.$items.minimumLevel', 'lowStockAlerts.$items.unit', 'lowStockAlerts.$items.status',
      '$items.menuItemId', '$items.name', '$items.quantity',
    ],
  }, { accessPatternKind: 'getById', selection: 'none', opKind: 'view', hasPublicInput: false }),
  closeShift: fixture({
    id: 'closeShift', title: 'Fechar turno e gerar relatório', actor: 'gerente', entity: 'Shift', kind: 'update', pageId: 'shiftLifecycle',
    storySteps: ['O gerente solicita o fechamento do turno aberto da unidade', 'O gerente confirma o encerramento e pode informar observações', 'O sistema gera o relatório de fechamento'],
    inputNames: ['shiftId', 'notes', 'closedByUserId', 'closedAt'],
    outputTopPaths: [
      'shiftId', 'status', 'closedAt', 'closedByUserId', 'notes', 'shiftReportId', 'totalSalesDineIn', 'totalSalesTakeout',
      'totalSales', 'totalOrders', 'totalCancellations', 'topSellingItemName', 'topSellingItemQuantity', 'generatedAt',
    ],
    outputItemPaths: [],
  }, { accessPatternKind: 'commandInput', selection: 'single', opKind: 'update', hasPublicInput: true }),
  viewShiftReport: fixture({
    id: 'viewShiftReport', title: 'Consultar relatório de fechamento', actor: 'gerente', entity: 'ShiftReport', kind: 'view', pageId: 'viewShiftReport',
    storySteps: ['Abre o relatório do turno encerrado a partir do identificador do relatório', 'Visualiza totais de vendas por tipo, pedidos, cancelamentos e item mais vendido'],
    inputNames: ['shiftReportId'],
    outputTopPaths: [
      'shiftReportId', 'shiftId', 'totalSalesDineIn', 'totalSalesTakeout', 'totalSales', 'totalOrders',
      'totalCancellations', 'topSellingItemName', 'topSellingItemQuantity', 'generatedAt', 'preservedUntil', 'notes',
    ],
    outputItemPaths: [],
  }, { accessPatternKind: 'getById', selection: 'none', opKind: 'view', hasPublicInput: true }),
};

function fixture(
  summary: Record<string, unknown>,
  fact: Pick<NsE6OperationFact, 'accessPatternKind' | 'selection' | 'opKind' | 'hasPublicInput'>,
): OperationFixture {
  return {
    summary,
    fact: {
      ...fact,
      actors: ['gerente'],
      inputNames: summary.inputNames as string[],
      outputTopPaths: summary.outputTopPaths as string[],
      outputItemPaths: summary.outputItemPaths as string[],
    },
  };
}

// Mirror of agentNsJourneyMap.buildDetailPrompt (same section headers and tool wiring).
function buildPrompts(slice: NsE6SiteMapWorkspace): { system: string; human: string; tool: unknown } {
  const promptMd = readFileSync(path.join(HERE, 'promptDetail.md'), 'utf8');
  const schema = JSON.parse(readFileSync(path.join(HERE, '../../schemas', 'e6-workspace.schema.json'), 'utf8'));
  const system = `${promptMd.split('{{toolName}}').join(DETAIL_TOOL)}\n\n${buildNsToolInstruction(DETAIL_TOOL, 'the site map slice is missing or unusable')}`;
  const summaries = slice.operationIds.map(operationId => OPERATIONS[operationId].summary);
  const human = [
    '## Your workspace (from the approved site map — copy workspaceId/title/actors/kind verbatim)',
    JSON.stringify(slice, null, 2),
    '',
    '## Operation summaries for THIS workspace only',
    '## `inputNames`/`outputTopPaths`/`outputItemPaths` are the ONLY valid names for bffCall `from` —',
    '## copy verbatim, respect position (outputItemPaths only inside item.fields).',
    JSON.stringify(summaries, null, 2),
    '',
    '## userLanguage: pt-BR',
  ].join('\n');
  return { system, human, tool: createNsToolSchema(DETAIL_TOOL, 'Submit ONE workspace detail (sections/organisms/bffCalls).', schema) };
}

// Mirror of buildSingleWorkspaceContext: classification ops scoped to the returned workspace.
function scopedContext(workspace: NsE6Workspace): E6GateContext {
  return {
    moduleName: MODULE,
    classificationWorkflowIds: ['orderLifecycle', 'shiftLifecycle'],
    classificationOperationIds: workspace.operationIds,
    rosterActorIds: ['gerente', 'atendente', 'cozinheiro'],
    entityIds: ['StockItem', 'StockAdjustment', 'Shift', 'ShiftReport', 'Order', 'MenuItem'],
    nowCapabilityActorIds: ['gerente'],
    operationFacts: Object.fromEntries(Object.entries(OPERATIONS).map(([operationId, entry]) => [operationId, entry.fact])),
  };
}

for (const [workspaceId, slice] of Object.entries(SLICES)) {
  for (const modelType of MODEL_TYPES) {
    void test(`e6-detail live ${workspaceId} @ ${modelType}: schema accepted + detail gate passes`, { skip: !liveTestsEnabled() }, async () => {
      const { system, human, tool } = buildPrompts(slice);
      for (let run = 1; run <= liveRuns(); run++) {
        const r = await callToolProvider(config(), { modelType, system, human, tool, maxTokens: 16000, timeoutMs: 300000 });
        const at = `${workspaceId} @ ${modelType} run ${run}/${liveRuns()}`;

        // HARD: never a schema-definition rejection, and the model must emit schema-valid tool args
        // (run12's TOOL_ARGS_SCHEMA — dropped `sections`, {} input/field entries — lands here as non-200).
        assert.ok(!r.schemaReject, `${at}: schema-definition rejection (status ${r.status}): ${r.text.replace(/\s+/g, ' ').slice(0, 300)}`);
        assert.equal(r.status, 200, `${at}: expected 200, got ${r.status}: ${r.text.replace(/\s+/g, ' ').slice(0, 300)}`);
        assert.ok(r.args, `${at}: no tool_call result in response`);

        // DIAGNOSTIC: replay handleDetailResult — prepare, derive, force slice-owned fields, then the
        // equality + scoped-invariants gate (run12's bff.output.from.unknownOp lands here).
        const prepared = deriveE6BffRoutes(prepareE6JourneyMap({ workspaces: [r.args], landings: [], navigationEdges: [] }, { moduleName: MODULE }));
        const workspace = prepared.workspaces[0];
        assert.ok(workspace, `${at}: detail produced no workspace`);
        workspace.kind = slice.kind;
        workspace.purpose = slice.purpose;
        if (slice.workflowId) workspace.workflowId = slice.workflowId; else delete workspace.workflowId;

        const context = scopedContext(workspace);
        repairE6BffFroms(prepared, context.operationFacts); // same deterministic repair the agent runs
        const localGate = validateE6Invariants(prepared, context);
        const equality = validateE6WorkspaceEquality(workspace, slice);
        const errors = [
          ...equality,
          ...localGate.issues.filter(issue => issue.severity === 'error' && issue.code !== 'navigationEntry.target.unknown'),
        ];
        if (errors.length) console.log(`[${at}] gate errors:\n` + errors.map(issue => `  - ${issue.code}: ${issue.message}`).join('\n'));
        assert.equal(errors.length, 0, `${at}: gate rejected the returned args (${errors.length} error(s)) — see log`);
      }
    });
  }
}
