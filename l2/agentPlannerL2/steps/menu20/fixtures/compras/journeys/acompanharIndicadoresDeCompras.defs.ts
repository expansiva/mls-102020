/// <mls fileReference="_102047_/l4/compras/journeys/acompanharIndicadoresDeCompras.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const acompanharIndicadoresDeComprasJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "acompanharIndicadoresDeCompras",
  "business": {
    "actorRef": "gerenteCompras",
    "title": "Acompanhar indicadores de compras",
    "goal": "Monitorar pedidos em aberto, atrasados e o total comprado por fornecedor no mês.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "consultarPedidosDeCompra",
        "kind": "locate",
        "entity": "PurchaseOrder",
        "title": "Consultar pedidos de compra",
        "description": "Acessa os pedidos de compra da organização para acompanhamento."
      },
      {
        "stepId": "inspecionarIndicadoresDePedidos",
        "kind": "inspect",
        "entity": "PurchaseOrder",
        "title": "Inspecionar indicadores de pedidos",
        "description": "Consulta os indicadores de pedidos em aberto, pedidos atrasados e total comprado por fornecedor no mês."
      }
    ],
    "outcome": {
      "statement": "O gerente visualiza a situação dos pedidos e os totais mensais por fornecedor.",
      "evidence": [
        "Indicadores mostram a quantidade de pedidos em aberto.",
        "Indicadores mostram os pedidos atrasados.",
        "Indicadores mostram o total comprado por fornecedor no mês."
      ]
    }
  },
  "businessHash": "sha256:91da38701e1e4dd1b473f295c84c90923fec4178aceb0867df08d59b819372b5"
} as const satisfies Ns5JourneyArtifact;

export type AcompanharIndicadoresDeComprasJourneyType = typeof acompanharIndicadoresDeComprasJourney;

export default acompanharIndicadoresDeComprasJourney;
