/// <mls fileReference="_102047_/l4/compras/ontology/GoodsReceipt.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const comprasEntityGoodsReceipt = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "GoodsReceipt",
  "title": "Recebimento de mercadorias",
  "description": "Registro do recebimento total ou parcial dos itens de um pedido de compra, que origina a entrada no estoque.",
  "displayField": "receiptNumber",
  "relationships": {
    "purchaseOrder": {
      "relationshipId": "goodsReceiptPurchaseOrder",
      "to": "PurchaseOrder",
      "via": "GoodsReceipt.purchaseOrderId",
      "cardinality": "N:1",
      "title": "Pedido de compra",
      "description": "Cada recebimento registra a entrega total ou parcial de um pedido de compra.",
      "mode": "fk",
      "required": "sempre"
    }
  },
  "capabilities": {
    "read.byId": "Consulta um recebimento pelo identificador da linha no repositório de recebimentos, para telas que já possuem esse identificador.",
    "locate.byColumn": "Lista recebimentos por pedido de compra, número ou data indexados, com ordenação e paginação, para o almoxarife e o comprador localizarem registros.",
    "count": "Conta os recebimentos que atendem aos filtros aplicados, para totais das listas de recebimentos.",
    "listByForeignKey": "Lista os recebimentos vinculados a um pedido de compra pela chave estrangeira, para acompanhar entregas parciais do pedido.",
    "create": "Grava um novo recebimento com seus itens efetivamente entregues, para o almoxarife registrar a chegada das mercadorias.",
    "uniqueKey": "Impede a emissão de dois recebimentos com o mesmo número sequencial, por meio da chave única do recebimento.",
    "transaction": "Registra o recebimento, dá entrada dos itens no estoque e atualiza o pedido em uma única transação, para o almoxarife.",
    "read.mdmRecord": "Lê os registros mestres dos produtos referenciados nos itens, para exibir sua identificação ao almoxarife e ao comprador.",
    "sequence.next": "Emite o próximo número sequencial do recebimento no contador do módulo, ao criar o registro para o almoxarife.",
    "compras.registerReceipt": "Registra o recebimento total ou parcial, valida as quantidades pendentes e aciona a entrada no estoque, para o almoxarife."
  },
  "rules": [
    "goodsReceiptHasItems",
    "goodsReceiptQuantityPositive",
    "goodsReceiptProductsMatchOrder",
    "goodsReceiptQuantityDoesNotExceedOutstanding",
    "goodsReceiptAllowedForOpenOrder",
    "goodsReceiptPostsStockAtomically"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "compras_goodsreceipt",
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
      "receiptNumber": {
        "type": "string",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Número do recebimento",
        "description": "Número sequencial que identifica o recebimento de mercadorias.",
        "maxLength": 80,
        "min": 0,
        "max": 0
      },
      "purchaseOrderId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "PurchaseOrder"
        ],
        "title": "Pedido de compra",
        "description": "Pedido de compra ao qual pertencem as mercadorias recebidas.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "receivedAt": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Data e hora do recebimento",
        "description": "Data e hora em que as mercadorias foram efetivamente recebidas no almoxarifado.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Detalhes do recebimento",
        "description": "Itens efetivamente recebidos e observações do lançamento.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "items": {
            "type": "object",
            "required": true,
            "collection": true,
            "of": "Address",
            "title": "Itens recebidos",
            "description": "Produtos e quantidades efetivamente recebidos neste lançamento.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "fields": {
              "productId": {
                "type": "record",
                "required": true,
                "of": "Address",
                "to": [
                  "Product"
                ],
                "title": "Produto",
                "description": "Produto do pedido de compra que foi recebido.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "receivedQuantity": {
                "type": "number",
                "required": true,
                "of": "Address",
                "title": "Quantidade recebida",
                "description": "Quantidade efetivamente recebida do produto, na unidade definida para ele.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            }
          },
          "notes": {
            "type": "text",
            "of": "Address",
            "title": "Observações",
            "description": "Observações relevantes do almoxarife sobre a entrega.",
            "maxLength": 2000,
            "min": 0,
            "max": 0
          },
          "receiptCompletion": {
            "type": "string",
            "derived": true,
            "title": "Situação do recebimento",
            "description": "Indica se, após este registro, as quantidades recebidas de todos os itens do pedido alcançam as quantidades pedidas; caso contrário, o recebimento é parcial."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "receiptNumber"
    ]
  ]
} as const satisfies Ns5OntologyEntityV3;

export type ComprasEntityGoodsReceiptType = typeof comprasEntityGoodsReceipt;

export default comprasEntityGoodsReceipt;
