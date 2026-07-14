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
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeL4Contract.js';
import { buildMaterializeTypecheckTest, evaluateGeneratedPageQuality, normalizeGeneratedCode } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';

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

  assert.match(source || '', /type ExpectedCafeFlowListOrdersOutput = \{ items: ExpectedCafeFlowListOrdersOutputItem\[\]; total: number; page\?: number; pageSize\?: number; \};/);
});

test('materialization fixes deterministic page seams without changing generated render logic', () => {
  const page = normalizeGeneratedCode({ id: 'report__l2_page', type: 'l2_page', outputPath: '_102048_/l2/buildFlowFsm/web/desktop/page11/report.ts' }, { baseClassName: 'BuildFlowFsmReportBase' }, "import { WrongBase } from '/_102048_/l2/buildFlowFsm/web/shared/report.ts';\nexport class ReportPage extends WrongBase {}");
  assert.match(page, /import \{ BuildFlowFsmReportBase \} from '\/_102048_\/l2\/buildFlowFsm\/web\/shared\/report\.js';/);

  const shared = normalizeGeneratedCode({ id: 'report__l2_shared', type: 'l2_shared', outputPath: '_102048_/l2/buildFlowFsm/web/shared/report.ts' }, { baseClassName: 'BuildFlowFsmReportBase' }, 'export class WrongBase extends CollabLitElement {}');
  assert.match(shared, /export class BuildFlowFsmReportBase extends CollabLitElement/);
});

test('UX hygiene gate catches every defect observed by the improve2 study', () => {
  const page = {
    pageId: 'items',
    templateId: 'tabular_classic',
    templateValidationChecks: [],
    templateWiring: { minimumStates: [], transitions: [] },
    layout: { sections: [{
      titleKey: 'section.title',
      organisms: [{ titleKey: 'organism.title', intentions: [{
        id: 'items.list', intent: 'queryList', titleKey: 'intent.title', emptyKey: 'intent.empty',
        fields: [{ id: 'items.categoryId', field: 'categoryId', stateKey: 'ui.items.input.categoryId', inputType: 'text' }],
        filters: [], toolbar: [], actions: [],
        rowActions: [{ id: 'items.delete', action: 'deleteItem', confirmation: false }],
      }] }],
    }] },
  };
  const shared = {
    i18n: { 'section.title': 'Items', 'organism.title': 'Items', 'intent.title': 'Items', 'intent.empty': 'Items' },
    states: [
      { stateKey: 'ui.items.dead', kind: 'layoutState', defaultValue: '' },
      { stateKey: 'ui.items.input.categoryId', kind: 'input', presentation: 'form', referenceEntity: 'Category' },
    ],
    actions: [{ actionId: 'deleteItem', kind: 'command', operationKind: 'delete', clearInputStateKeys: [] }],
  };

  const result = evaluateGeneratedPageQuality(page, shared, 'return html`✓`;');
  const failures = result.checks.filter(check => !check.passed).map(check => check.id);
  assert.ok(failures.includes('hygiene.layout-state-binding'));
  assert.ok(failures.some(id => id.startsWith('hygiene.technical-input.')));
  assert.ok(failures.some(id => id.startsWith('hygiene.mutation-feedback.')));
  assert.ok(failures.some(id => id.startsWith('hygiene.empty-state.')));
  assert.ok(failures.some(id => id.startsWith('hygiene.row-action.')));
  assert.ok(failures.some(id => id.startsWith('hygiene.destructive-confirmation.')));
});

test('UX hygiene gate accepts lookup, contextual row action, feedback, confirmation and loading', () => {
  const page = {
    pageId: 'items',
    templateId: 'tabular_classic',
    templateValidationChecks: [],
    templateWiring: { minimumStates: [], transitions: [] },
    layout: { sections: [{
      titleKey: 'section.title',
      organisms: [{ titleKey: 'organism.title', intentions: [{
        id: 'items.list', intent: 'queryList', titleKey: 'intent.title', emptyKey: 'intent.empty',
        fields: [{ id: 'items.categoryId', field: 'categoryId', stateKey: 'ui.items.input.categoryId', inputType: 'select', source: 'bff.listCategories' }],
        filters: [], toolbar: [], actions: [],
        rowActions: [{ id: 'items.delete', action: 'deleteItem', context: 'row', rowRef: 'itemId', confirmation: true }],
      }] }],
    }] },
  };
  const shared = {
    i18n: {
      'section.title': 'Items', 'organism.title': 'Available items', 'intent.title': 'Inventory',
      'intent.empty': 'Register the first item to continue', 'action.deleteItem.success': 'Item deleted.',
      'action.deleteItem.error': 'Could not delete item.',
    },
    states: [{ stateKey: 'ui.items.input.categoryId', kind: 'input', presentation: 'form', referenceEntity: 'Category' }],
    actions: [
      {
        actionId: 'deleteItem', kind: 'command', operationKind: 'delete', errorStateKey: 'ui.items.delete.error', clearInputStateKeys: [],
        feedback: { successMessageKey: 'action.deleteItem.success', errorMessageKey: 'action.deleteItem.error', dismissible: true, dismissActionId: 'dismiss.deleteItemFeedback' },
      },
      { actionId: 'dismiss.deleteItemFeedback', kind: 'feedbackDismiss', handlerName: 'handleDismissDeleteItemFeedback' },
    ],
  };
  const code = "const loading = true; const itemId = row.itemId; this.msg['action.deleteItem.success']; this.msg['action.deleteItem.error']; this.handleDismissDeleteItemFeedback(); window.confirm('Confirm');";
  const result = evaluateGeneratedPageQuality(page, shared, code);
  assert.equal(result.passed, true, result.checks.filter(check => !check.passed).map(check => check.message).join('; '));
});
