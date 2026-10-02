/// <mls fileReference="_102047_/l4/compras/ontology/PurchaseOrder.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const comprasEntityPurchaseOrder = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "PurchaseOrder",
  "title": "Pedido de compra",
  "description": "Pedido de compra aberto para um fornecedor, com itens, quantidades, preços e decisão de aprovação quando necessária.",
  "displayField": "orderNumber",
  "relationships": {
    "supplier": {
      "relationshipId": "purchaseOrderSupplier",
      "to": "Supplier",
      "via": "PurchaseOrder.supplierId",
      "cardinality": "N:1",
      "title": "Fornecedor do pedido",
      "description": "Fornecedor para o qual o pedido de compra foi aberto.",
      "mode": "fk",
      "required": "sempre"
    },
    "goodsReceipts": {
      "relationshipId": "goodsReceiptPurchaseOrder",
      "to": "GoodsReceipt",
      "via": "GoodsReceipt.purchaseOrderId",
      "cardinality": "1:N",
      "title": "Recebimentos do pedido",
      "description": "Recebimentos totais ou parciais registrados para os itens deste pedido.",
      "mode": "fk",
      "direction": "to",
      "required": "quando houver itens recebidos"
    }
  },
  "capabilities": {
    "read.byId": "Lê um pedido de compra pelo identificador da linha · consulta por id no repositório de pedidos · telas que já possuem o identificador do pedido.",
    "locate.byColumn": "Lista pedidos por fornecedor, situação, data do pedido ou previsão de entrega · filtra e pagina as colunas indexadas · comprador, gerente de compras e almoxarife.",
    "locate.byText": "Localiza pedidos pelo número informado · busca textual na coluna de número do pedido · comprador, gerente de compras e almoxarife.",
    "count": "Conta pedidos que atendem aos critérios de acompanhamento · usa o mesmo filtro das listas sem paginação · gerente de compras.",
    "listByForeignKey": "Lista os pedidos abertos para um fornecedor · consulta pela chave estrangeira do fornecedor · comprador e gerente de compras.",
    "create": "Abre um pedido de compra em elaboração com seus itens · insere a linha do pedido e seu documento de detalhes · comprador.",
    "update": "Altera os itens e as datas de um pedido ainda em elaboração · atualiza a linha identificada pelo id · comprador.",
    "transition": "Envia, aprova ou rejeita o pedido alterando sua situação indexada · aplica a transição autorizada pelas regras do módulo · comprador e gerente de compras.",
    "uniqueKey": "Impede a repetição do número de pedido · aplica índice único na coluna orderNumber · motor da plataforma ao gravar.",
    "sequence.next": "Emite o próximo número sequencial do pedido de compra · usa a sequência do módulo e da entidade · comprador ao abrir o pedido.",
    "read.mdmRecord": "Lê o cadastro mestre do fornecedor e dos produtos referenciados pelo pedido · hidrata os identificadores MDM dos registros relacionados · comprador, gerente de compras e almoxarife."
  },
  "rules": [
    "purchaseOrderMustHaveItems",
    "purchaseOrderItemProductOfferedBySupplier",
    "purchaseOrderItemQuantityPositive",
    "purchaseOrderItemPriceNonnegative",
    "purchaseOrderEditableOnlyDraft",
    "purchaseOrderApprovalRequiredAboveLimit",
    "purchaseOrderReceiptRequiresApprovalWhenRequired",
    "goodsReceiptQuantityWithinOrderedQuantity"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "compras_purchaseorder",
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
      "supplierId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "Supplier"
        ],
        "title": "Fornecedor",
        "description": "Fornecedor para o qual o pedido de compra foi aberto.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "orderNumber": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "of": "ContactSummary",
        "title": "Número do pedido",
        "description": "Número sequencial pelo qual o pedido de compra é identificado e consultado.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "values": [
          {
            "value": "draft",
            "title": "Em elaboração",
            "description": "Pedido ainda em preparação pelo comprador."
          },
          {
            "value": "sent",
            "title": "Enviado",
            "description": "Pedido enviado, aguardando recebimento ou decisão de aprovação quando exigida."
          },
          {
            "value": "approved",
            "title": "Aprovado",
            "description": "Pedido de valor acima do limite aprovado pelo gerente de compras."
          },
          {
            "value": "rejected",
            "title": "Rejeitado",
            "description": "Pedido recusado pelo gerente de compras e impedido de seguir para recebimento."
          }
        ],
        "title": "Situação do pedido",
        "description": "Etapa operacional do pedido de compra, alterada pelo envio ou pela decisão do gerente.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "orderDate": {
        "type": "date",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "title": "Data do pedido",
        "description": "Data em que o pedido de compra foi aberto.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "expectedDeliveryDate": {
        "type": "date",
        "indexed": true,
        "of": "ContactSummary",
        "title": "Previsão de entrega",
        "description": "Data prevista para a chegada dos produtos, usada para acompanhar atrasos.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "ContactSummary",
        "title": "Detalhes do pedido",
        "description": "Itens e valores acordados para a compra.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "items": {
            "type": "object",
            "required": true,
            "collection": true,
            "of": "ContactSummary",
            "title": "Itens do pedido",
            "description": "Produtos solicitados, com as quantidades e os preços acordados neste pedido.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "fields": {
              "productId": {
                "type": "record",
                "required": true,
                "of": "ContactSummary",
                "to": [
                  "Product"
                ],
                "title": "Produto",
                "description": "Produto solicitado no item do pedido.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "quantity": {
                "type": "number",
                "required": true,
                "of": "ContactSummary",
                "title": "Quantidade solicitada",
                "description": "Quantidade do produto solicitada neste item.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "unitPrice": {
                "type": "money",
                "required": true,
                "of": "ContactSummary",
                "title": "Preço unitário combinado",
                "description": "Preço unitário acordado com o fornecedor para este item do pedido.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            }
          },
          "orderTotal": {
            "type": "money",
            "derived": true,
            "title": "Valor total do pedido",
            "description": "Soma dos preços unitários multiplicados pelas quantidades de todos os itens deste pedido."
          },
          "requiresApproval": {
            "type": "boolean",
            "derived": true,
            "title": "Exige aprovação",
            "description": "O valor total do pedido excede o limite de aprovação definido para compras."
          },
          "receiptSituation": {
            "type": "string",
            "derived": true,
            "title": "Situação do recebimento",
            "description": "Indica se nenhum item, parte dos itens ou todos os itens do pedido já foram recebidos, comparando as quantidades recebidas com as quantidades solicitadas."
          },
          "isOpen": {
            "type": "boolean",
            "derived": true,
            "title": "Pedido em aberto",
            "description": "Pedido enviado ou aprovado que não foi rejeitado e ainda não teve todos os seus itens recebidos."
          },
          "isOverdue": {
            "type": "boolean",
            "derived": true,
            "title": "Pedido atrasado",
            "description": "Pedido em aberto cuja previsão de entrega é anterior à data de hoje e que ainda não teve todos os seus itens recebidos."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "orderNumber"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "draft",
      "reachedBy": "actor"
    },
    {
      "state": "sent",
      "reachedBy": "actor"
    },
    {
      "state": "approved",
      "reachedBy": "actor"
    },
    {
      "state": "rejected",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "sendPurchaseOrder",
      "from": [
        "draft"
      ],
      "to": "sent",
      "by": [
        "comprador"
      ],
      "description": "Envia o pedido ao fornecedor; pedidos acima do limite ficam sujeitos à aprovação antes do recebimento.",
      "ruleRefs": [
        "purchaseOrderMustHaveItems",
        "purchaseOrderItemProductOfferedBySupplier",
        "purchaseOrderItemQuantityPositive",
        "purchaseOrderItemPriceNonnegative"
      ]
    },
    {
      "transitionId": "decidePurchaseOrder",
      "from": [
        "sent"
      ],
      "to": "approved",
      "by": [
        "gerenteCompras"
      ],
      "description": "Aprova um pedido enviado cujo valor exige decisão do gerente de compras.",
      "ruleRefs": [
        "purchaseOrderApprovalRequiredAboveLimit"
      ]
    },
    {
      "transitionId": "rejectPurchaseOrder",
      "from": [
        "sent"
      ],
      "to": "rejected",
      "by": [
        "gerenteCompras"
      ],
      "description": "Rejeita um pedido enviado cujo valor exige decisão do gerente de compras.",
      "ruleRefs": [
        "purchaseOrderApprovalRequiredAboveLimit"
      ]
    }
  ]
} as const satisfies Ns5OntologyEntityV3;

export type ComprasEntityPurchaseOrderType = typeof comprasEntityPurchaseOrder;

export default comprasEntityPurchaseOrder;
