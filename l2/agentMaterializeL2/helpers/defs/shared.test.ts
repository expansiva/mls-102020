/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/defs/shared.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyL2StateSource, parseL2Shared } from '/_102020_/l2/agentMaterializeL2/helpers/defs/shared.js';

// The frozen structure (Wagner, 13/10/2026): no forms, no functions, rules is one list, params carry required.
const shared = (extra: Record<string, unknown> = {}) => ({
  entry: { params: { pacienteId: { type: 'string', sources: ['url', 'localStorage'], effect: 'select:patientDetail', persist: true, required: false } } },
  requests: {
    listarPacientes: { kind: 'qry', trigger: 'onLoad', returns: ['pacientes'] },
    salvarPaciente: { kind: 'cmd', trigger: 'salvarPaciente', returns: ['paciente'], writes: 'Paciente.update' },
  },
  states: {
    pacientes: { source: 'listarPacientes.pacientes', description: 'Patients.', organisms: ['patientList'] },
    selectedPaciente: { source: 'entry.params.pacienteId', description: 'The chosen patient.', organisms: ['patientDetail'] },
  },
  journeys: [{ step: 'cadastrarPaciente/localizarPaciente', organisms: ['patientList'] }],
  rules: ['patientOwnerOnly'],
  access: { actors: ['recepcao'], grants: [] },
  ...extra,
});

const source = (definition: unknown, eol = '\n') => [
  '/// <mls fileReference="_102047_/l2/agendaClinica/web/shared/pacientes.defs.ts" enhancement="_blank"/>',
  '',
  `export const definition = ${JSON.stringify(definition, null, 2)} as const;`,
  '',
].join(eol);

test('the frozen structure is read through the official format', () => {
  const { location, definition } = parseL2Shared(source(shared()));
  assert.deepEqual(location, { project: 102047, module: 'agendaClinica', pageId: 'pacientes' });
  assert.deepEqual(definition.rules, ['patientOwnerOnly']);
  assert.equal(definition.entry.params.pacienteId.required, false);
  assert.deepEqual(definition.journeys[0], { step: 'cadastrarPaciente/localizarPaciente', organisms: ['patientList'] });
});

test('a file saved with CRLF is read', () => {
  assert.equal(Object.keys(parseL2Shared(source(shared(), '\r\n')).definition.requests).length, 2);
});

// The old structure (before 13/10/2026) is refused: its forms and functions are no longer part of the format.
test('a shared with forms or functions is refused', () => {
  assert.throws(() => parseL2Shared(source(shared({ forms: {} }))), /forbidden field forms/u);
  assert.throws(() => parseL2Shared(source(shared({ functions: {} }))), /forbidden field functions/u);
});

test('state sources are classified by the grammar', () => {
  const { definition } = parseL2Shared(source(shared()));
  assert.deepEqual(classifyL2StateSource('listarPacientes.pacientes', definition), { kind: 'requestReturn', request: 'listarPacientes', key: 'pacientes' });
  assert.deepEqual(classifyL2StateSource('entry.params.pacienteId', definition), { kind: 'entryParam', param: 'pacienteId' });
  assert.deepEqual(classifyL2StateSource('salvarPaciente.input', definition), { kind: 'requestInput', request: 'salvarPaciente' });
  assert.deepEqual(classifyL2StateSource('listarPacientes.total', definition), { kind: 'invalid' });
});
