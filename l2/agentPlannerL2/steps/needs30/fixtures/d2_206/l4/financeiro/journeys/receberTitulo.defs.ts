/// <mls fileReference="_102047_/l4/financeiro/journeys/receberTitulo.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const receberTituloJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "receberTitulo",
  "business": {
    "actorRef": "caixa",
    "title": "Receber título no caixa",
    "goal": "Registrar o recebimento total ou parcial de um título a receber em dinheiro, pix ou cartão via Stripe.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarTitulo",
        "kind": "locate",
        "entity": "TituloReceber",
        "title": "Localizar título em aberto",
        "description": "O caixa busca o título em aberto pelo pagador, pela origem ou pelo vencimento."
      },
      {
        "stepId": "conferirTitulo",
        "kind": "inspect",
        "entity": "TituloReceber",
        "title": "Conferir título",
        "description": "O caixa confere pagador, valor, saldo em aberto, vencimento e origem do título."
      },
      {
        "stepId": "registrarRecebimento",
        "kind": "act",
        "entity": "Recebimento",
        "effect": "create",
        "title": "Registrar recebimento",
        "description": "O caixa informa o valor recebido e a forma de pagamento (dinheiro, pix ou cartão via Stripe); um valor menor que o saldo gera baixa parcial e o saldo do título é atualizado, ficando quitado quando zerar."
      }
    ],
    "outcome": {
      "statement": "O recebimento fica registrado e o título fica quitado ou com saldo parcial reduzido.",
      "evidence": [
        "Recebimento listado no título com valor, forma de pagamento e data",
        "Saldo em aberto do título atualizado",
        "Título marcado como quitado quando o saldo chega a zero"
      ]
    }
  },
  "businessHash": "sha256:179d52634791df91a650935868c066fbdb94e4bcec19e5dc490cacd66893c350"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ReceberTituloJourneyType = typeof receberTituloJourney;

export default receberTituloJourney;
