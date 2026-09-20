/// <mls fileReference="_102047_/l4/controleEstoque/ontology/MovimentacaoEstoque.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const controleEstoqueEntityMovimentacaoEstoque = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "controleEstoque",
  "entityId": "MovimentacaoEstoque",
  "title": "Movimentação de estoque",
  "description": "Registro imutável de entrada ou saída de unidades de um produto para composição do saldo disponível.",
  "displayField": "occurredAt",
  "relationships": {
    "produto": {
      "relationshipId": "produtoMovimentacoesEstoque",
      "to": "Produto",
      "via": "MovimentacaoEstoque.produtoId",
      "cardinality": "N:1",
      "title": "Produto da movimentação",
      "description": "Cada movimentação de estoque refere-se obrigatoriamente a um produto.",
      "mode": "fk",
      "direction": "to",
      "required": "sempre"
    }
  },
  "capabilities": {
    "read.byId": "Lê uma movimentação de estoque pelo identificador da linha para o estoquista consultar seu registro.",
    "locate.byColumn": "Lista movimentações filtradas por produto ou data e hora, com ordenação e paginação, para o estoquista acompanhar o estoque.",
    "count": "Conta as movimentações que atendem aos filtros de produto ou período para o estoquista consultar o total da lista.",
    "listByForeignKey": "Lista as movimentações vinculadas a um produto pelo campo produtoId para o estoquista verificar a origem do saldo disponível.",
    "create": "Registra uma nova entrada ou saída com produto, quantidade, tipo e data e hora para o estoquista compor o saldo disponível.",
    "read.mdmRecord": "Lê o registro mestre do produto apontado por produtoId para exibir sua identificação e saldo ao estoquista."
  },
  "rules": [
    "movimentacaoEstoqueImutavel",
    "quantidadeMovimentacaoPositiva"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "controleEstoque_movimentacaoestoque",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "produtoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "Produto"
        ],
        "title": "Produto",
        "description": "Produto ao qual esta entrada ou saída de estoque se refere.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "occurredAt": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Data e hora da movimentação",
        "description": "Data e hora em que a entrada ou saída de unidades foi registrada.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Detalhes da movimentação",
        "description": "Dados que caracterizam a entrada ou saída registrada para o produto.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "movementType": {
            "type": "enum",
            "required": true,
            "of": "Address",
            "values": [
              {
                "value": "entry",
                "title": "Entrada",
                "description": "Adiciona unidades ao saldo disponível do produto."
              },
              {
                "value": "exit",
                "title": "Saída",
                "description": "Retira unidades do saldo disponível do produto."
              }
            ],
            "title": "Tipo de movimentação",
            "description": "Indica se as unidades foram adicionadas ou retiradas do estoque.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "quantity": {
            "type": "integer",
            "required": true,
            "of": "Address",
            "title": "Quantidade",
            "description": "Número de unidades adicionadas ou retiradas na movimentação.",
            "maxLength": 0,
            "min": 1,
            "max": 0
          }
        }
      }
    }
  }
} as const satisfies Ns5OntologyEntityV3;

export type ControleEstoqueEntityMovimentacaoEstoqueType = typeof controleEstoqueEntityMovimentacaoEstoque;

export default controleEstoqueEntityMovimentacaoEstoque;
