/// <mls fileReference="_102047_/l4/controleEstoque/journeys/cadastrarProduto.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const cadastrarProdutoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarProduto",
  "business": {
    "actorRef": "estoquista",
    "title": "Cadastrar produto",
    "goal": "Cadastrar um produto no estoque e definir o saldo mínimo para aviso.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "registrarProduto",
        "kind": "act",
        "entity": "Produto",
        "effect": "create",
        "title": "Registrar produto",
        "description": "Informa os dados do produto e o saldo mínimo que dispara o aviso."
      }
    ],
    "outcome": {
      "statement": "O produto está cadastrado no estoque com o saldo mínimo definido.",
      "evidence": [
        "O produto pode ser localizado no estoque.",
        "O saldo mínimo informado está gravado no produto."
      ]
    }
  },
  "businessHash": "sha256:187fc3d2db0078a0ee823d346e998853ff91839a2fc7cfd0a2f7fd2afdb8bc86"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CadastrarProdutoJourneyType = typeof cadastrarProdutoJourney;

export default cadastrarProdutoJourney;
