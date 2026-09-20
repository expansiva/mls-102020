/// <mls fileReference="_102047_/l4/locacaoEquipamentos/journeys/criarContratoLocacao.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const criarContratoLocacaoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "criarContratoLocacao",
  "business": {
    "actorRef": "atendente",
    "title": "Criar contrato de locação",
    "goal": "Registrar a locação de equipamentos para um cliente em um período definido.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarCliente",
        "kind": "locate",
        "entity": "Cliente",
        "title": "x",
        "description": "Localiza o cliente que fará a locação."
      },
      {
        "stepId": "criarContrato",
        "kind": "act",
        "entity": "ContratoLocacao",
        "effect": "create",
        "title": "x",
        "description": "Cria o contrato com os equipamentos, as datas de retirada e devolução prevista, verificando que cada equipamento não possui locação em período sobreposto."
      }
    ],
    "outcome": {
      "statement": "O contrato de locação é registrado para o cliente com os equipamentos reservados no período informado.",
      "evidence": [
        "Contrato de locação identificado para o cliente.",
        "Equipamentos e período de locação registrados no contrato."
      ]
    }
  },
  "businessHash": "sha256:14fceaf696efd2484998a6d8e74c959dff6e78c380ee5b77f850f0977d99b48d"
} as const satisfies Ns5JourneyArtifact;

export type CriarContratoLocacaoJourneyType = typeof criarContratoLocacaoJourney;

export default criarContratoLocacaoJourney;
