/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/defs/shared.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildL2Shared, parseL2Shared } from '/_102020_/l2/agentMaterializeL2/helpers/defs/shared.js';

const shared = (state: Record<string, unknown>) => ({
  entry: { params: {} },
  forms: {},
  requests: { loadPatients: { kind: 'qry', trigger: 'load', returns: ['patients'] } },
  states: { patients: state },
  functions: { loadPatients: { description: 'Loads the patients.', calls: 'loadPatients', sets: 'patients' } },
  journeys: [],
  rules: {},
  access: { actors: [], grants: [] },
});

const source = (definition: unknown) => [
  '/// <mls fileReference="_102047_/l2/agendaClinica/web/shared/pacientes.defs.ts" enhancement="_blank"/>',
  '',
  `export const definition = ${JSON.stringify(definition, null, 2)} as const;`,
  '',
].join('\n');

// agentDefsL2 d2_80 (05/10/2026): every state lists the organisms it feeds. agendaClinica (07/10) was refused with
// "L2_SHARED_STATE: patients: forbidden field organisms".
test('a state that lists the organisms it feeds is read, and keeps them', () => {
  const { definition } = parseL2Shared(source(shared({ source: 'loadPatients.patients', description: 'Patients.', organisms: ['patientList', 'patientDetail'] })));
  assert.deepEqual(definition.states.patients, { source: 'loadPatients.patients', description: 'Patients.', organisms: ['patientList', 'patientDetail'] });
});

// Defs rendered before d2_80 (comandaRestaurante, 04/10) have no organisms: same reading as before, no new key.
test('a state without organisms is read as before', () => {
  const { definition } = parseL2Shared(source(shared({ source: 'loadPatients.patients', description: 'Patients.' })));
  assert.deepEqual(definition.states.patients, { source: 'loadPatients.patients', description: 'Patients.' });
  assert.equal('organisms' in definition.states.patients, false);
});

test('organisms that is not a list of names is refused', () => {
  assert.throws(() => buildL2Shared(shared({ source: 'loadPatients.patients', description: 'Patients.', organisms: 'patientList' })), /L2_SHARED_STATE_ORGANISMS: patients/u);
  assert.throws(() => buildL2Shared(shared({ source: 'loadPatients.patients', description: 'Patients.', organisms: [1] })), /L2_SHARED_STATE_ORGANISMS: patients/u);
});

test('any other unknown state field is still refused, and source and description stay required', () => {
  assert.throws(() => buildL2Shared(shared({ source: 'loadPatients.patients', description: 'Patients.', feeds: ['patientList'] })), /L2_SHARED_STATE: patients: forbidden field feeds/u);
  assert.throws(() => buildL2Shared(shared({ source: 'loadPatients.patients', organisms: ['patientList'] })), /L2_SHARED_STATE: patients: missing field description/u);
});
