/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/cadastrarPlano.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const cadastrarPlanoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarPlano",
  "business": {
    "actorRef": "gerencia",
    "title": "Cadastrar plano",
    "goal": "Disponibilizar um plano (mensal, trimestral ou anual) com valor e dia de vencimento para as matrículas.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "consultarPlanos",
        "kind": "locate",
        "entity": "Plano",
        "title": "Consultar planos existentes",
        "description": "A gerência consulta os planos já cadastrados para evitar duplicidade."
      },
      {
        "stepId": "registrarPlano",
        "kind": "act",
        "entity": "Plano",
        "effect": "create",
        "title": "Registrar novo plano",
        "description": "A gerência informa nome, periodicidade (mensal, trimestral ou anual), valor e dia de vencimento do plano."
      }
    ],
    "outcome": {
      "statement": "O plano fica disponível para novas matrículas.",
      "evidence": [
        "O plano aparece na lista de planos com periodicidade, valor e dia de vencimento."
      ]
    }
  },
  "businessHash": "sha256:e2b67e90cb2b0bc48b34e25ab799010b74411a5baa689e2a6f0301d62305afc7"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CadastrarPlanoJourneyType = typeof cadastrarPlanoJourney;

export default cadastrarPlanoJourney;
