/// <mls fileReference="_102047_/l4/controleEstoque/journeys/registrarMovimentacao.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const registrarMovimentacaoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarMovimentacao",
  "business": {
    "actorRef": "estoquista",
    "title": "Registrar movimentação",
    "goal": "Registrar uma entrada ou saída de quantidade no estoque de um produto.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarProdutoMovimentacao",
        "kind": "locate",
        "entity": "Produto",
        "title": "Localizar produto",
        "description": "Encontra o produto que receberá a entrada ou a saída de estoque."
      },
      {
        "stepId": "verSaldoMovimentacao",
        "kind": "inspect",
        "entity": "Produto",
        "title": "Ver saldo atual",
        "description": "Confere o saldo atual do produto antes de registrar a movimentação."
      },
      {
        "stepId": "registrarMovimentacaoEstoque",
        "kind": "act",
        "entity": "Movimentacao",
        "effect": "create",
        "title": "Registrar movimentação",
        "description": "Informa se é entrada ou saída e a quantidade; a movimentação fica permanente, o saldo é atualizado e o aviso ocorre se ficar abaixo do mínimo."
      }
    ],
    "outcome": {
      "statement": "A movimentação foi registrada e o saldo atual do produto foi atualizado.",
      "evidence": [
        "A movimentação consta no produto e não pode ser alterada.",
        "O saldo atual do produto reflete a quantidade entrada ou retirada."
      ]
    }
  },
  "businessHash": "sha256:4930ed6477d273bf1aa89f9b9701956bce1ca62f5ae312c68967aae3859eb44e"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RegistrarMovimentacaoJourneyType = typeof registrarMovimentacaoJourney;

export default registrarMovimentacaoJourney;
