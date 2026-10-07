/// <mls fileReference="_102047_/l4/agendaClinica/journeys/consultarAgendaDiaria.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const consultarAgendaDiariaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarAgendaDiaria",
  "business": {
    "actorRef": "profissional",
    "title": "Consultar agenda diária",
    "goal": "Ver apenas as consultas próprias previstas para o dia.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarAgendaDoDia",
        "kind": "locate",
        "entity": "Consulta",
        "title": "Localizar agenda diária",
        "description": "O profissional localiza as consultas da própria agenda para o dia."
      },
      {
        "stepId": "consultarConsultasDoDia",
        "kind": "inspect",
        "entity": "Consulta",
        "title": "Consultar consultas diárias",
        "description": "O profissional consulta os horários e pacientes das consultas que lhe pertencem no dia."
      }
    ],
    "outcome": {
      "statement": "O profissional visualiza sua agenda diária.",
      "evidence": [
        "São exibidas apenas consultas vinculadas ao próprio profissional.",
        "As consultas exibidas correspondem ao dia consultado."
      ]
    }
  },
  "businessHash": "sha256:67c0f4a0ad8954cc17592aa106e26ab285f040b968f145b0bd3113816866deab"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ConsultarAgendaDiariaJourneyType = typeof consultarAgendaDiariaJourney;

export default consultarAgendaDiariaJourney;
