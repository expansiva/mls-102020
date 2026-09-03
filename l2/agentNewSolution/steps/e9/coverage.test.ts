/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e9/coverage.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createNs4Pipeline } from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';
import {
  applyNs4UseCaseCoverage,
  compareE7ToOperations,
  NS4_USECASE_DROP_DUPLICATE,
  NS4_USECASE_DROP_UNREFERENCED,
  useCaseCoverageLogLine,
} from '/_102020_/l2/agentNewSolution/steps/e9/coverage.js';

const petShopApproved = [
  'completeServiceExecution', 'decideAppointment', 'handoffToAppointment', 'inspectAppointments',
  'inspectInstitutionalHome', 'inspectPendingItems', 'inspectServiceExecutions', 'locateAppointment',
  'locateBusinessHours', 'locatePet', 'locateServiceExecution', 'locateServiceOffering',
  'recordPickupAndPayment', 'registerAvailabilityBlock', 'registerBusinessHours', 'registerCustomer',
  'registerPet', 'requestAppointment', 'requestFirstAppointment', 'startServiceExecution',
].map(useCaseId => ({
  useCaseId,
  compiledFrom: useCaseId === 'locateServiceExecution'
    ? ['completeServiceExecution.locateServiceExecution', 'recordPickupAndInStorePayment.locateServiceExecution']
    : [`someJourney.${useCaseId}`],
}));

const petShopEmitted = [
  'createAppointment', 'createAvailabilityBlock', 'createBusinessHours', 'createCustomer', 'createPet',
  'createServiceExecution', 'createServiceOffering', 'decideAppointment', 'deleteAppointment',
  'deleteAvailabilityBlock', 'deleteServiceExecution', 'handoffToAppointment', 'inactivateBusinessHours',
  'inactivateCustomer', 'inactivatePet', 'inactivateServiceOffering', 'inspectAppointments',
  'inspectInstitutionalHome', 'inspectPendingItems', 'inspectServiceExecutions', 'listAppointment',
  'listAvailabilityBlock', 'listBusinessHours', 'listCustomer', 'listPet', 'listServiceExecution',
  'listServiceOffering', 'locateAppointment', 'locateBusinessHours', 'locatePet', 'locateServiceOffering',
  'reactivateBusinessHours', 'reactivateCustomer', 'reactivatePet', 'reactivateServiceOffering',
  'registerAvailabilityBlock', 'registerPet', 'requestAppointment', 'requestFirstAppointment',
  'startServiceExecution', 'updateAppointment', 'updateAvailabilityBlock', 'updateBusinessHours',
  'updateCustomer', 'updatePet', 'updateServiceExecution', 'updateServiceOffering',
];

test('petShop-shaped gap lists locateServiceExecution among notEmitted', () => {
  const verdict = compareE7ToOperations({
    approved: petShopApproved,
    emittedOperationIds: petShopEmitted,
    hostedStepRefs: ['startServiceExecution.locateAppointment'],
  });
  assert.equal(verdict.useCases, 'degraded');
  if (verdict.useCases !== 'degraded') return;
  assert.ok(verdict.useCasesDropped.notEmitted.includes('locateServiceExecution'));
  assert.equal(verdict.useCasesDropped.approved, 20);
  assert.equal(verdict.useCasesDropped.emitted, 47);
  assert.equal(verdict.useCasesDropped.reasons?.locateServiceExecution, NS4_USECASE_DROP_UNREFERENCED);
  assert.match(useCaseCoverageLogLine(verdict), /20 approved, 47 emitted, 5 not emitted/);
});

test('a module with no loss is useCases ok and persist strips both fields', () => {
  const verdict = compareE7ToOperations({
    approved: [{ useCaseId: 'locateAppointment', compiledFrom: ['start.locateAppointment'] }],
    emittedOperationIds: ['locateAppointment', 'listCustomer'],
    hostedStepRefs: ['start.locateAppointment'],
  });
  assert.deepEqual(verdict, { useCases: 'ok', approved: 1, emitted: 2 });
  assert.equal(useCaseCoverageLogLine(verdict), '1 approved, 2 emitted, 0 not emitted');
  const previous = {
    ...createNs4Pipeline('shop', 'shop'),
    useCases: 'degraded' as const,
    useCasesDropped: { notEmitted: ['locateServiceExecution'], approved: 2, emitted: 1 },
  };
  const persisted = applyNs4UseCaseCoverage(previous, verdict);
  assert.equal(persisted.useCases, undefined);
  assert.equal(persisted.useCasesDropped, undefined);
  assert.equal(persisted.status, previous.status);
});

test('uniqueBy collision is named when the step is hosted but the operationId is missing', () => {
  const verdict = compareE7ToOperations({
    approved: [{ useCaseId: 'getInvoice', compiledFrom: ['reviewInvoice.inspectInvoice'] }],
    emittedOperationIds: ['listInvoice'],
    hostedStepRefs: ['reviewInvoice.inspectInvoice'],
  });
  assert.equal(verdict.useCases, 'degraded');
  if (verdict.useCases !== 'degraded') return;
  assert.deepEqual(verdict.useCasesDropped.notEmitted, ['getInvoice']);
  assert.equal(verdict.useCasesDropped.reasons?.getInvoice, NS4_USECASE_DROP_DUPLICATE);
});

test('unknown reason is omitted: listing without a motive is better than inventing one', () => {
  const verdict = compareE7ToOperations({
    approved: [{ useCaseId: 'orphanUseCase', compiledFrom: [] }],
    emittedOperationIds: [],
  });
  assert.equal(verdict.useCases, 'degraded');
  if (verdict.useCases !== 'degraded') return;
  assert.deepEqual(verdict.useCasesDropped.notEmitted, ['orphanUseCase']);
  assert.equal(verdict.useCasesDropped.reasons, undefined);
});

test('apply degraded never fails the pipeline', () => {
  const state = createNs4Pipeline('shop', 'shop');
  const next = applyNs4UseCaseCoverage(state, {
    useCases: 'degraded',
    useCasesDropped: { notEmitted: ['locateServiceExecution'], approved: 1, emitted: 0 },
  });
  assert.equal(next.status, state.status);
  assert.equal(next.useCases, 'degraded');
  assert.deepEqual(next.useCasesDropped?.notEmitted, ['locateServiceExecution']);
});

test('E9 wires the audit after emission and does not treat it as a gate', () => {
  const src = readFileSync(new URL('agentNs4E9.ts', import.meta.url), 'utf8');
  assert.match(src, /compareE7ToOperations/);
  assert.match(src, /applyNs4UseCaseCoverage/);
  assert.match(src, /useCaseCoverageLogLine/);
  assert.equal(/throw new Error\(.*useCases/.test(src), false);
});
