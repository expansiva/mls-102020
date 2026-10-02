/// <mls fileReference="_102047_/l4/compras/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact } from '/_102035_/l2/solution/types.js';

export const comprasWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "compras",
  "processes": [
    {
      "processId": "aprovarPedidoAcimaDoLimite",
      "title": "Aprovação de pedido de compra acima do limite",
      "description": "Orquestra o encaminhamento de pedidos de compra acima do limite para a decisão do gerente de compras.",
      "trigger": {
        "kind": "manual",
        "actorRef": "comprador"
      },
      "tasks": [
        {
          "taskId": "enviarEEncaminharPedido",
          "kind": "human",
          "actorRef": "comprador",
          "journeyRef": "abrirEenviarPedidoCompra",
          "next": [
            "decidirPedidoEncaminhado"
          ],
          "description": "O comprador envia o pedido de compra e encaminha ao gerente de compras aqueles cujo valor exige aprovação."
        },
        {
          "taskId": "decidirPedidoEncaminhado",
          "kind": "human",
          "actorRef": "gerenteCompras",
          "journeyRef": "decidirPedidoAcimaDoLimite",
          "next": [],
          "description": "O gerente de compras avalia o pedido encaminhado e registra sua aprovação ou rejeição."
        }
      ]
    }
  ],
  "journeyDecisions": [
    {
      "journeyId": "cadastrarFornecedor",
      "inProcess": false
    },
    {
      "journeyId": "abrirEenviarPedidoCompra",
      "inProcess": true,
      "processId": "aprovarPedidoAcimaDoLimite"
    },
    {
      "journeyId": "decidirPedidoAcimaDoLimite",
      "inProcess": true,
      "processId": "aprovarPedidoAcimaDoLimite"
    },
    {
      "journeyId": "registrarRecebimentoPedido",
      "inProcess": false
    },
    {
      "journeyId": "acompanharIndicadoresDeCompras",
      "inProcess": false
    }
  ]
} as const satisfies Ns5WorkflowsArtifact;

export type ComprasWorkflowsType = typeof comprasWorkflows;

export default comprasWorkflows;
