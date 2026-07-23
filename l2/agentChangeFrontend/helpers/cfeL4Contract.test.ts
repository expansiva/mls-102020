/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeL4Contract.test.ts" enhancement="_blank"/>
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  frontendOutputShapeForOperation,
  frontendQueryStateDefaults,
  frontendInputPresentation,
  isRuntimeResolvedInputSource,
  isUserFacingOperationInput,
  l4OperationInputs,
  hasWorkspaceBffCalls,
  parseWorkspaceBffCalls,
  parseWorkspaceSections,
  bffCallCommandShape,
  isContentOrganismRole,
  buildWorkspaceContractSource,
  isCopiedL4Contract,
  type CfeL4OperationInput,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeL4Contract.js';
import { buildMaterializeTypecheckTest, normalizeGeneratedCode } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';

test('frontendOutputShapeForOperation follows L4 accessPattern pagination', () => {
  assert.equal(frontendOutputShapeForOperation({ kind: 'query', accessPattern: { kind: 'list', pagination: 'required' } }), 'paginated');
  assert.equal(frontendOutputShapeForOperation({ kind: 'query', accessPattern: { kind: 'list', pagination: 'none' } }), 'array');
  assert.equal(frontendOutputShapeForOperation({ kind: 'view', accessPattern: { kind: 'getById' } }), 'object');
  assert.equal(frontendOutputShapeForOperation({ kind: 'create', accessPattern: { kind: 'commandInput' } }), 'object');
});

test('frontendQueryStateDefaults preserves paginated object shape', () => {
  assert.deepEqual(frontendQueryStateDefaults('array'), { collection: true, defaultValue: [] });
  assert.deepEqual(frontendQueryStateDefaults('paginated'), { collection: false, defaultValue: { items: [], total: 0 } });
  assert.deepEqual(frontendQueryStateDefaults('object'), { collection: false, defaultValue: null });
});

test('L4 inputs retain every browser boundary input and classify contextual inputs', () => {
  const inputs = l4OperationInputs({
    inputs: [
      { inputId: 'nameFilter', fieldRef: 'Company.name', required: false, source: 'userInput', description: 'Filter by name.' },
      { inputId: 'companyId', fieldRef: 'Company.companyId', required: true, source: 'businessContext', description: 'Active company.' },
      { inputId: 'workspaceId', fieldRef: 'Workspace.workspaceId', required: true, source: 'currentWorkspace', description: 'Current UI workspace.' },
      { inputId: 'statusReportId', fieldRef: 'StatusReport.statusReportId', required: true, source: 'routeParam', description: 'Share link route parameter.' },
      { inputId: 'selectedId', fieldRef: 'StatusReport.statusReportId', required: true, source: 'selectedEntity', description: 'Selected report.' },
    ],
  });

  assert.deepEqual(inputs.filter(isUserFacingOperationInput).map(input => input.inputId), ['nameFilter', 'statusReportId', 'selectedId']);
  assert.equal(frontendInputPresentation(inputs[0]), 'form');
  assert.equal(frontendInputPresentation(inputs[3]), 'route');
  assert.equal(frontendInputPresentation(inputs[4]), 'selection');
  assert.equal(isRuntimeResolvedInputSource('businessContext'), true);
  assert.equal(isRuntimeResolvedInputSource('currentWorkspace'), true);
  assert.equal(isRuntimeResolvedInputSource('userInput'), false);
  assert.equal(isRuntimeResolvedInputSource('routeParam'), false);
  assert.equal(isRuntimeResolvedInputSource('selectedEntity'), false);
});

test('generated contract typecheck expects paginated query output when outputShape is paginated', () => {
  const source = buildMaterializeTypecheckTest({
    id: 'orders__l2_contract',
    type: 'l2_contract',
    outputPath: '_102050_/l2/cafeFlow/web/contracts/orders.ts',
  }, [{
    commandName: 'listOrders',
    kind: 'query',
    outputShape: 'paginated',
    input: [{ name: 'nameFilter', type: 'string', required: false }],
    output: [{ name: 'orderId', type: 'string', required: true }],
  }]);

  assert.match(source || '', /type ExpectedListOrdersOutput = \{ items: ExpectedListOrdersOutputItem\[\]; total: number; page\?: number; pageSize\?: number; \};/);
});

// Generated tests must import through the project alias (/_<project>_/...), never a relative path —
// a relative import (`./x.js`, `../contracts/x.js`) does not resolve and fails compilation (102051 run18).
test('generated typecheck tests import via the project alias, not relative paths', () => {
  const contract = buildMaterializeTypecheckTest({
    id: 'menuManagement__l2_contract', type: 'l2_contract', outputPath: '_102051_/l2/cafeFlow/web/contracts/menuManagement.ts',
  }, [{ commandName: 'listMenuItems', kind: 'query', input: [{ name: 'status' }], output: [{ name: 'name' }] }]) || '';
  const shared = buildMaterializeTypecheckTest({
    id: 'menuManagement__l2_shared', type: 'l2_shared', outputPath: '_102051_/l2/cafeFlow/web/shared/menuManagement.ts',
  }, { moduleName: 'cafeFlow', pageId: 'menuManagement', contractRef: { tsPath: '_102051_/l2/cafeFlow/web/contracts/menuManagement.ts' },
    states: [{ name: 'listMenuItemsData', stateKey: 'ui.menuManagement.data.listMenuItems', kind: 'queryResult', contractRef: { commandName: 'listMenuItems', direction: 'output' } }], actions: [] }) || '';
  for (const src of [contract, shared]) {
    for (const line of src.split('\n').filter(l => l.startsWith('import'))) {
      assert.doesNotMatch(line, /from '\.\.?\//, `relative import in generated test: ${line}`);
      assert.match(line, /from '\/_\d+_\/l2\//, `import must use project alias: ${line}`);
    }
  }
  assert.match(shared, /from '\/_102051_\/l2\/cafeFlow\/web\/shared\/menuManagement\.js'/);
});

// ---- L4 v2: workspace bffCalls -> page commands ----

// Trimmed fixture mirroring l4/petShop/workspaces/catalog.defs.ts (a query surface + a detailPanel query).
const CATALOG_WORKSPACE = {
  workspaceId: 'catalog',
  title: 'Catálogo de produtos',
  actors: ['cliente'],
  kind: 'operation',
  bffCalls: [
    {
      bffId: 'catalogList',
      kind: 'query',
      uses: [{ operationId: 'browseCatalog' }],
      input: [
        { name: 'searchTerm', from: 'browseCatalog.searchTerm' },
        { name: 'page', from: 'browseCatalog.page' },
      ],
      output: { kind: 'paginated', fields: [{ name: 'productId', from: 'browseCatalog.$items.productId' }, { name: 'name', from: 'browseCatalog.$items.name' }] },
      route: 'petShop.catalog.catalogList',
    },
    {
      bffId: 'productDetail',
      kind: 'query',
      uses: [{ operationId: 'viewProductDetail' }],
      input: [{ name: 'productId', from: 'viewProductDetail.productId' }],
      output: { kind: 'object', fields: [{ name: 'productId', from: 'viewProductDetail.productId' }] },
      route: 'petShop.catalog.productDetail',
    },
  ],
  sections: [
    {
      sectionId: 'catalog',
      intent: 'Navegar, buscar e filtrar o catálogo',
      organisms: [
        { role: 'primarySurface', dataSource: 'catalogList' },
        { role: 'filterControl', attachTo: 'catalogList' },
        { role: 'detailPanel', dataSource: 'productDetail' },
      ],
    },
  ],
};

test('hasWorkspaceBffCalls distinguishes l4 v2 workspaces from the legacy operationIds-only shape', () => {
  assert.equal(hasWorkspaceBffCalls(CATALOG_WORKSPACE), true);
  assert.equal(hasWorkspaceBffCalls({ workspaceId: 'legacy', operationIds: ['browseCatalog'] }), false);
  assert.equal(hasWorkspaceBffCalls({ bffCalls: [] }), false);
});

test('parseWorkspaceBffCalls reads bffId/kind/route/uses/input/output projection', () => {
  const calls = parseWorkspaceBffCalls(CATALOG_WORKSPACE);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].bffId, 'catalogList');
  assert.equal(calls[0].kind, 'query');
  assert.equal(calls[0].route, 'petShop.catalog.catalogList');
  assert.deepEqual(calls[0].uses, ['browseCatalog']);
  assert.equal(calls[0].output?.kind, 'paginated');
  assert.deepEqual(calls[0].output?.fields.map(f => f.name), ['productId', 'name']);
  assert.equal(calls[1].output?.kind, 'object');
});

test('parseWorkspaceSections keeps organism roles and their bffId references', () => {
  const sections = parseWorkspaceSections(CATALOG_WORKSPACE);
  assert.equal(sections.length, 1);
  assert.deepEqual(sections[0].organisms.map(o => o.role), ['primarySurface', 'filterControl', 'detailPanel']);
  assert.equal(sections[0].organisms[0].dataSource, 'catalogList');
  assert.equal(sections[0].organisms[1].attachTo, 'catalogList');
  assert.equal(sections[0].organisms[2].dataSource, 'productDetail');
  assert.equal(isContentOrganismRole('showcase'), true);
  assert.equal(isContentOrganismRole('primarySurface'), false);
});

test('bffCallCommandShape maps a query bffCall to a paginated command, resolving required from the operation', () => {
  const operationInputs = new Map<string, CfeL4OperationInput[]>([
    ['browseCatalog', [
      { inputId: 'searchTerm', fieldRef: 'Product.name', required: false, source: 'userInput', description: '' },
      { inputId: 'page', fieldRef: '', required: false, source: 'userInput', description: '' },
    ]],
  ]);
  const [catalogList] = parseWorkspaceBffCalls(CATALOG_WORKSPACE);
  const command = bffCallCommandShape(catalogList, operationInputs);
  assert.equal(command.commandName, 'catalogList');
  assert.equal(command.kind, 'query');
  assert.equal(command.routeKey, 'petShop.catalog.catalogList');
  assert.equal(command.outputShape, 'paginated');
  assert.deepEqual(command.input.map(i => i.name), ['searchTerm', 'page']);
  assert.equal(command.input[0].required, false);
  assert.equal(command.input[0].presentation, 'form');
  assert.deepEqual(command.output.map(o => o.name), ['productId', 'name']);
  assert.equal(command.canonicalOutputShape?.kind, 'paginated');
});

test('buildWorkspaceContractSource generates ONE file per workspace: all bffCall interfaces + route consts (no l4 .ts read)', () => {
  const source = buildWorkspaceContractSource({
    l2Ref: '_102049_/l2/petShop/web/contracts/catalog.ts',
    workspaceId: 'catalog',
    calls: [
      { interfaceName: 'CatalogList', bffId: 'catalogList', kind: 'query', outputKind: 'paginated', route: 'petShop.catalog.catalogList',
        input: [{ name: 'searchTerm', type: 'string', optional: true }], output: [{ name: 'productId', type: 'string' }, { name: 'name', type: 'string' }] },
      { interfaceName: 'ProductDetail', bffId: 'productDetail', kind: 'query', outputKind: 'object', route: 'petShop.catalog.productDetail',
        input: [{ name: 'productId', type: 'string' }], output: [{ name: 'productId', type: 'string' }, { name: 'description', type: 'string' }] },
    ],
  });
  assert.match(source, /<mls fileReference="_102049_\/l2\/petShop\/web\/contracts\/catalog\.ts"/);
  assert.doesNotMatch(source, /l4\/petShop\/contracts/); // NEVER references an l4 .ts
  // Both bffCalls' interfaces + route consts live in the single file.
  assert.match(source, /export interface CatalogListInput \{\n {2}searchTerm\?: string;\n\}/);
  assert.match(source, /export interface CatalogListOutput \{/);
  assert.match(source, /export const catalogListRoute = 'petShop\.catalog\.catalogList' as const;/);
  assert.match(source, /export interface ProductDetailInput \{/);
  assert.match(source, /export const productDetailRoute = 'petShop\.catalog\.productDetail' as const;/);
  assert.equal(isCopiedL4Contract(source), true);
  assert.equal(isCopiedL4Contract('export const x = 1;'), false);
});

test('buildWorkspaceContractSource emits empty interfaces for a command with no projected fields', () => {
  const source = buildWorkspaceContractSource({
    l2Ref: '_1_/l2/m/web/contracts/w.ts', workspaceId: 'w',
    calls: [{ interfaceName: 'Act', bffId: 'act', kind: 'command', outputKind: 'object', route: 'm.w.act', input: [], output: [] }],
  });
  assert.match(source, /export interface ActInput \{\}/);
  assert.match(source, /export interface ActOutput \{\}/);
});

test('materialization fixes deterministic page seams without changing generated render logic', () => {
  const page = normalizeGeneratedCode({ id: 'report__l2_page', type: 'l2_page', outputPath: '_102048_/l2/buildFlowFsm/web/desktop/page11/report.ts' }, { baseClassName: 'BuildFlowFsmReportBase' }, "import { WrongBase } from '/_102048_/l2/buildFlowFsm/web/shared/report.ts';\nexport class ReportPage extends WrongBase {}");
  assert.match(page, /import \{ BuildFlowFsmReportBase \} from '\/_102048_\/l2\/buildFlowFsm\/web\/shared\/report\.js';/);

  const shared = normalizeGeneratedCode({ id: 'report__l2_shared', type: 'l2_shared', outputPath: '_102048_/l2/buildFlowFsm/web/shared/report.ts' }, { baseClassName: 'BuildFlowFsmReportBase' }, 'export class WrongBase extends CollabLitElement {}');
  assert.match(shared, /export class BuildFlowFsmReportBase extends CollabLitElement/);
});
