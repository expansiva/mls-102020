/// <mls fileReference="_102047_/l4/controleEstoque/ontology/Movimentacao.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const controleEstoqueEntityMovimentacao = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "controleEstoque",
  "entityId": "Movimentacao",
  "title": "Movimentação de estoque",
  "description": "Registro permanente de uma entrada ou saída de quantidade de um produto. Depois de registrada não pode ser alterada; o saldo do produto é recalculado a partir destas movimentações.",
  "displayField": "numero",
  "relationships": {
    "produto": {
      "relationshipId": "produtoDaMovimentacao",
      "to": "Produto",
      "via": "Movimentacao.produtoId",
      "cardinality": "N:1",
      "title": "Produto",
      "description": "Produto cujo estoque recebe a entrada ou a saída registrada nesta movimentação.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Lê uma movimentação pelo identificador já conhecido · busca na tabela por id · o estoquista conferindo o registro permanente.",
    "locate.byColumn": "Lista movimentações filtradas por produto, tipo ou data, ordenadas e paginadas · igualdade nas colunas indexadas produtoId, tipo e registradoEm · o estoquista no histórico de estoque.",
    "locate.byText": "Encontra movimentações cujo número contém o texto digitado · busca textual na coluna numero · o estoquista localizando um registro citado.",
    "count": "Conta as movimentações que atendem ao filtro, sem paginar · a mesma restrição da lista · total no cabeçalho da lista do estoquista.",
    "listByForeignKey": "Lista as movimentações que apontam para um produto · filtro pela coluna produtoId · o estoquista na ficha do produto vendo entradas e saídas.",
    "create": "Grava uma nova entrada ou saída de quantidade; depois de gravada a linha não muda · insert na tabela, com número emitido na hora · o estoquista no passo de registrar movimentação.",
    "uniqueKey": "Recusa uma segunda movimentação com o mesmo número · índice único na coluna numero · o motor na gravação.",
    "read.mdmRecord": "Lê o produto mestre apontado por produtoId · leitura do registro MDM pelo identificador · telas que mostram o nome e o saldo do produto da movimentação.",
    "sequence.next": "Emite o próximo número da movimentação · contador da plataforma na criação da linha · o módulo ao registrar a entrada ou a saída."
  },
  "rules": [
    "movimentacaoImutavel",
    "quantidadePositiva"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "controleEstoque_movimentacao",
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
        "to": [
          "Produto"
        ],
        "title": "Produto",
        "description": "Produto cujo estoque recebe a entrada ou a saída registrada nesta movimentação."
      },
      "numero": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "title": "Número",
        "description": "Número sequencial da movimentação, emitido na gravação e usado pelo estoquista para localizar o registro."
      },
      "tipo": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "inbound",
            "title": "Entrada",
            "description": "Quantidade que entra no estoque do produto."
          },
          {
            "value": "outbound",
            "title": "Saída",
            "description": "Quantidade que sai do estoque do produto."
          }
        ],
        "title": "Tipo",
        "description": "Indica se a quantidade entra no estoque ou sai do estoque."
      },
      "registradoEm": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "title": "Registrado em",
        "description": "Data e hora em que a movimentação foi gravada; ordena o histórico de entradas e saídas."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes da movimentação",
        "description": "Quantidade movimentada na unidade de medida do produto; não serve de filtro nem de ordenação.",
        "fields": {
          "quantidade": {
            "type": "number",
            "required": true,
            "title": "Quantidade",
            "description": "Quantidade que entra ou sai do estoque nesta movimentação, na unidade de medida do produto. Deve ser maior que zero."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "numero"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ControleEstoqueEntityMovimentacaoType = typeof controleEstoqueEntityMovimentacao;

export default controleEstoqueEntityMovimentacao;
