/// <mls fileReference="_102047_/l4/agendaClinica/journeys/cadastrarPaciente.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const cadastrarPacienteJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarPaciente",
  "business": {
    "actorRef": "recepcionista",
    "title": "Cadastrar paciente",
    "goal": "Registrar um novo paciente para permitir o agendamento de consultas.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "registrarPaciente",
        "kind": "act",
        "entity": "Paciente",
        "effect": "create",
        "title": "Cadastrar paciente",
        "description": "A recepcionista registra os dados do paciente necessários para identificá-lo na clínica."
      }
    ],
    "outcome": {
      "statement": "O paciente fica cadastrado e disponível para receber consultas.",
      "evidence": [
        "O cadastro do paciente pode ser localizado pela recepcionista.",
        "O paciente está disponível ao criar uma consulta."
      ]
    }
  },
  "businessHash": "sha256:dd1c085792aa5d8bec429dc2f22c5a65084d28bf22ac6f61dbaa326dfab99040"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CadastrarPacienteJourneyType = typeof cadastrarPacienteJourney;

export default cadastrarPacienteJourney;
