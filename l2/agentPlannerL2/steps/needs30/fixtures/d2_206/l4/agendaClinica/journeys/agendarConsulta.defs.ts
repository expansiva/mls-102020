/// <mls fileReference="_102047_/l4/agendaClinica/journeys/agendarConsulta.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agendarConsultaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "agendarConsulta",
  "business": {
    "actorRef": "recepcionista",
    "title": "Agendar consulta",
    "goal": "Marcar uma consulta para um paciente com um profissional em data e horário disponíveis.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarPaciente",
        "kind": "locate",
        "entity": "Paciente",
        "title": "Localizar paciente",
        "description": "A recepcionista localiza o paciente que receberá a consulta."
      },
      {
        "stepId": "registrarConsulta",
        "kind": "act",
        "entity": "Consulta",
        "effect": "create",
        "title": "Agendar consulta",
        "description": "A recepcionista agenda a consulta para um profissional, informando a data e o horário, desde que o horário esteja disponível."
      }
    ],
    "outcome": {
      "statement": "A consulta fica agendada para o paciente, profissional, data e horário informados.",
      "evidence": [
        "A consulta aparece na agenda do profissional na data marcada.",
        "Não existe outra consulta do mesmo profissional no mesmo horário."
      ]
    }
  },
  "businessHash": "sha256:3df2238ac25de6ef20dcc5ee52a59b0d62f42dbf4149a2c47ea27233fad6b1f4"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AgendarConsultaJourneyType = typeof agendarConsultaJourney;

export default agendarConsultaJourney;
