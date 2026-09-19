/// <mls fileReference="_102047_/l4/compras/journeys/abrirEenviarPedidoCompra.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const abrirEenviarPedidoCompraJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "abrirEenviarPedidoCompra",
  "business": {
    "actorRef": "comprador",
    "title": "Abrir e enviar pedido de compra",
    "goal": "Enviar ao fornecedor um pedido com os produtos, quantidades e preços necessários.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarFornecedor",
        "kind": "locate",
        "entity": "Supplier",
        "title": "Localizar fornecedor",
        "description": "Localiza o fornecedor para o qual o pedido será aberto."
      },
      {
        "stepId": "consultarCondicoesFornecimento",
        "kind": "inspect",
        "entity": "SupplierOffering",
        "title": "Consultar condições de fornecimento",
        "description": "Consulta os produtos e preços combinados disponíveis para o fornecedor."
      },
      {
        "stepId": "abrirPedidoCompra",
        "kind": "act",
        "entity": "PurchaseOrder",
        "effect": "create",
        "title": "Abrir pedido de compra",
        "description": "Abre o pedido com um ou mais produtos, suas quantidades e preços."
      },
      {
        "stepId": "enviarPedidoCompra",
        "kind": "act",
        "entity": "PurchaseOrder",
        "effect": "transition",
        "transitionRef": "sendPurchaseOrder",
        "title": "Enviar pedido de compra",
        "description": "Envia o pedido de compra; quando seu valor excede o limite, ele segue para aprovação do gerente de compras."
      },
      {
        "stepId": "encaminharParaAprovacao",
        "kind": "handoff",
        "entity": "PurchaseOrder",
        "title": "Encaminhar pedido para aprovação",
        "description": "Encaminha ao gerente de compras o pedido cujo valor exige aprovação.",
        "handoffTo": "gerenteCompras"
      }
    ],
    "outcome": {
      "statement": "O pedido de compra é enviado e, quando necessário, fica disponível para decisão do gerente.",
      "evidence": [
        "Pedido contém fornecedor, produtos, quantidades e preços.",
        "Pedido registra o envio.",
        "Pedidos acima do limite estão pendentes de aprovação."
      ]
    }
  },
  "businessHash": "sha256:6942c86af64a149a92e9c10ac3444c6a4890ec4dc26fbfa7be080bfbdb65d357"
} as const satisfies Ns5JourneyArtifact;

export type AbrirEenviarPedidoCompraJourneyType = typeof abrirEenviarPedidoCompraJourney;

export default abrirEenviarPedidoCompraJourney;
