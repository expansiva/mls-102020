/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/registrarPagamento.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const registrarPagamentoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarPagamento",
  "business": {
    "actorRef": "recepcao",
    "title": "Registrar pagamento de mensalidade",
    "goal": "Registrar o pagamento de uma mensalidade com data, valor e forma.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarMensalidade",
        "kind": "locate",
        "entity": "Mensalidade",
        "title": "Buscar mensalidade do aluno",
        "description": "A recepção busca as mensalidades em aberto ou vencidas do aluno."
      },
      {
        "stepId": "conferirMensalidade",
        "kind": "inspect",
        "entity": "Mensalidade",
        "title": "Conferir valor e vencimento",
        "description": "A recepção confere valor, vencimento e situação da mensalidade antes de receber."
      },
      {
        "stepId": "lancarPagamento",
        "kind": "act",
        "entity": "Pagamento",
        "effect": "create",
        "title": "Lançar pagamento",
        "description": "A recepção registra data, valor e forma do pagamento; a mensalidade passa a paga e, se o aluno regularizar as vencidas, deixa de estar bloqueado."
      }
    ],
    "outcome": {
      "statement": "A mensalidade fica quitada e a situação do aluno é atualizada.",
      "evidence": [
        "A mensalidade aparece como paga com o pagamento registrado.",
        "O aluno que regularizou deixa de aparecer como bloqueado."
      ]
    }
  },
  "businessHash": "sha256:8fedd8af0f2c66ea1e89e98a628b80cd62c70b28b17ebda834eb7588c7c489b6"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RegistrarPagamentoJourneyType = typeof registrarPagamentoJourney;

export default registrarPagamentoJourney;
