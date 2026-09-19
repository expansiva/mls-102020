/// <mls fileReference="_102047_/l4/compras/ontology/PurchaseOrderDashboard.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const comprasEntityPurchaseOrderDashboard = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "PurchaseOrderDashboard",
  "title": "Painel de pedidos de compra",
  "description": "Resumo recalculado de pedidos em aberto, pedidos atrasados e total comprado por fornecedor no mês.",
  "displayField": "period",
  "relationships": {},
  "capabilities": {
    "aggregate.byWindow": "Resume os pedidos de compra por mês e por fornecedor, a partir dos dados transacionais, para compor os indicadores usados pelo gerente de compras.",
    "read.window": "Lê os indicadores de pedidos em aberto, atrasados e total comprado em um período mensal e fornecedor, para o gerente de compras acompanhar o painel.",
    "read.mdmRecord": "Lê o registro mestre apontado pelo fornecedor do resumo para identificar cada linha do painel ao gerente de compras.",
    "compras.consultarPainelPedidos": "Apresenta o painel mensal de pedidos de compra por fornecedor, com pedidos em aberto, atrasados e total comprado, para o gerente de compras."
  },
  "rules": [],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "compras_purchaseorderdashboard",
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
      "period": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Período mensal",
        "description": "Início do mês ao qual o resumo de pedidos de compra se refere, recalculado a partir dos pedidos de compra.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "derived": true
      },
      "groupKey": {
        "type": "string",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Fornecedor",
        "description": "Identificador do fornecedor ao qual os indicadores mensais se referem; permite ler o painel por fornecedor.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "derived": true
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Indicadores de compras",
        "description": "Medidas mensais recalculadas dos pedidos de compra do fornecedor.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "openPurchaseOrdersCount": {
            "type": "integer",
            "required": true,
            "of": "Address",
            "title": "Pedidos em aberto",
            "description": "Quantidade recalculada de pedidos de compra do fornecedor que permanecem em aberto no período.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "derived": true
          },
          "overduePurchaseOrdersCount": {
            "type": "integer",
            "required": true,
            "of": "Address",
            "title": "Pedidos atrasados",
            "description": "Quantidade recalculada de pedidos de compra do fornecedor em aberto cuja data prevista de entrega já passou.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "derived": true
          },
          "totalPurchasedAmount": {
            "type": "money",
            "required": true,
            "of": "Address",
            "title": "Total comprado",
            "description": "Valor total recalculado dos pedidos de compra do fornecedor no mês.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "derived": true
          }
        },
        "derived": true
      }
    }
  }
} as const satisfies Ns5OntologyEntityV3;

export type ComprasEntityPurchaseOrderDashboardType = typeof comprasEntityPurchaseOrderDashboard;

export default comprasEntityPurchaseOrderDashboard;
