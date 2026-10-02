/// <mls fileReference="_102047_/l4/reembolsoDespesas/journeys/consultarPropriasDespesas.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const consultarPropriasDespesasJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarPropriasDespesas",
  "business": {
    "actorRef": "colaborador",
    "title": "Consultar próprias despesas",
    "goal": "Acompanhar as despesas de reembolso registradas pelo próprio colaborador.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarPropriasDespesas",
        "kind": "locate",
        "entity": "Despesa",
        "title": "Localizar próprias despesas",
        "description": "Localiza as despesas vinculadas ao próprio colaborador."
      },
      {
        "stepId": "inspecionarDespesa",
        "kind": "inspect",
        "entity": "Despesa",
        "title": "Inspecionar despesa",
        "description": "Consulta os dados, a situação e, quando houver, o motivo da rejeição ou a data de pagamento."
      }
    ],
    "outcome": {
      "statement": "O colaborador visualiza o andamento de suas próprias despesas.",
      "evidence": [
        "São exibidas apenas despesas vinculadas ao colaborador.",
        "A situação de cada despesa pode ser observada."
      ]
    }
  },
  "businessHash": "sha256:84dc5ecd96ebbb65b2e3a491b73c3459712dc9b329c266ba02c88471df6070bf"
} as const satisfies Ns5JourneyArtifact;

export type ConsultarPropriasDespesasJourneyType = typeof consultarPropriasDespesasJourney;

export default consultarPropriasDespesasJourney;
