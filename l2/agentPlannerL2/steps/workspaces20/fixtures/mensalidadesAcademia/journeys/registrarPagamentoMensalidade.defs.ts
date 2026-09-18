/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/registrarPagamentoMensalidade.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarPagamentoMensalidadeJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarPagamentoMensalidade",
  "business": {
    "actorRef": "recepcao",
    "title": "Registrar pagamento de mensalidade",
    "goal": "Registrar o pagamento informado por um aluno para regularizar sua mensalidade.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarMensalidade",
        "kind": "locate",
        "entity": "Mensalidade",
        "title": "x",
        "description": "Localiza a mensalidade do aluno que será paga."
      },
      {
        "stepId": "inspecionarMensalidade",
        "kind": "inspect",
        "entity": "Mensalidade",
        "title": "x",
        "description": "Confere o valor devido, o vencimento e a situação atual da mensalidade."
      },
      {
        "stepId": "registrarPagamento",
        "kind": "act",
        "entity": "Pagamento",
        "effect": "create",
        "title": "x",
        "description": "Registra a data, o valor e a forma de pagamento, atualizando a situação da mensalidade e a regularidade do aluno quando aplicável."
      }
    ],
    "outcome": {
      "statement": "O pagamento fica registrado e a mensalidade passa a refletir a situação de quitação correspondente.",
      "evidence": [
        "Pagamento registrado com data, valor e forma de pagamento.",
        "Situação da mensalidade atualizada após o registro."
      ]
    }
  },
  "businessHash": "sha256:7be3642aa93c9483c17cd06a2eee8dc1142bc286a4491647f685d7a95a86e2d0"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarPagamentoMensalidadeJourneyType = typeof registrarPagamentoMensalidadeJourney;

export default registrarPagamentoMensalidadeJourney;
