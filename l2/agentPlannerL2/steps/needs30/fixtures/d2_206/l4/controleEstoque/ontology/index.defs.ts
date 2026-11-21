/// <mls fileReference="_102047_/l4/controleEstoque/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const controleEstoqueOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "controleEstoque",
  "businessDomain": "Controle de estoque: cadastro de produtos, registro permanente de entradas e saídas, saldo atual por produto e aviso quando o saldo fica abaixo do mínimo.",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "controleEstoque",
    "description": "Branch details.controleEstoque of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Produto",
      "kind": "role",
      "subtype": "Product"
    },
    {
      "entityId": "Movimentacao",
      "kind": "entity",
      "class": "event"
    }
  ],
  "relationships": [
    {
      "relationshipId": "produtoDaMovimentacao",
      "from": "Movimentacao",
      "to": "Produto",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Produto cujo estoque recebe a entrada ou a saída registrada nesta movimentação.",
      "field": "Movimentacao.produtoId"
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export type ControleEstoqueOntologyIndexType = typeof controleEstoqueOntologyIndex;

export default controleEstoqueOntologyIndex;
