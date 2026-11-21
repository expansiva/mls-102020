/// <mls fileReference="_102047_/l4/controleEstoque/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const controleEstoqueAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "controleEstoque",
  "actors": [
    {
      "actorId": "estoquista",
      "kind": "internal",
      "origin": "named",
      "title": "Estoquista",
      "description": "Registra produtos, entradas e saídas de estoque, consulta o saldo atual por produto e recebe aviso quando o saldo fica abaixo do mínimo. Não altera movimentações já registradas.",
      "personEntity": ""
    }
  ],
  "grants": [
    {
      "grantId": "gestaoCompletaEstoque",
      "actorRef": "estoquista",
      "title": "Gestão completa do estoque",
      "description": "O estoquista cadastra produtos, define o saldo mínimo, registra entradas e saídas, consulta o saldo atual por produto e confere o aviso quando o saldo fica abaixo do mínimo. Movimentações já registradas permanecem visíveis e não são alteradas.",
      "entityRefs": [
        "Produto",
        "Movimentacao"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os produtos e todas as movimentações de estoque da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O estoquista lê o cadastro completo do produto, inclusive identificação, catálogo, saldo mínimo, saldo atual e situação abaixo do mínimo, e o registro completo de cada movimentação."
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type ControleEstoqueAccessType = typeof controleEstoqueAccess;

export default controleEstoqueAccess;
