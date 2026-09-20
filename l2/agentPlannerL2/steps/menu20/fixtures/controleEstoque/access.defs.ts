/// <mls fileReference="_102047_/l4/controleEstoque/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const controleEstoqueAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "controleEstoque",
  "actors": [
    {
      "actorId": "estoquista",
      "kind": "internal",
      "origin": "named",
      "title": "Estoquista",
      "description": "Profissional responsável por registrar e acompanhar as movimentações e os saldos de estoque."
    }
  ],
  "grants": [
    {
      "grantId": "estoquistaControleEstoque",
      "actorRef": "estoquista",
      "title": "Controlar estoque",
      "description": "Permite cadastrar produtos no controle de estoque, registrar movimentações imutáveis e acompanhar saldos, avisos de reposição e movimentações de todos os produtos da organização.",
      "entityRefs": [
        "Produto",
        "MovimentacaoEstoque"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os produtos e as movimentações de estoque de toda a organização."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Permite consultar a identificação e a unidade do produto, a configuração e os indicadores de estoque do módulo, além de todos os dados das movimentações registradas.",
        "allowedFields": [
          "Produto.id",
          "Produto.details.identification",
          "Produto.details.product",
          "Produto.details.controleEstoque",
          "MovimentacaoEstoque.id",
          "MovimentacaoEstoque.version",
          "MovimentacaoEstoque.produtoId",
          "MovimentacaoEstoque.occurredAt",
          "MovimentacaoEstoque.details"
        ]
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type ControleEstoqueAccessType = typeof controleEstoqueAccess;

export default controleEstoqueAccess;
