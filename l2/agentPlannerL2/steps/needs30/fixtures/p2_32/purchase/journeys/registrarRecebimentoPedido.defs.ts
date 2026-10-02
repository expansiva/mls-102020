/// <mls fileReference="_102047_/l4/compras/journeys/registrarRecebimentoPedido.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarRecebimentoPedidoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarRecebimentoPedido",
  "business": {
    "actorRef": "almoxarife",
    "title": "Registrar recebimento total ou parcial",
    "goal": "Registrar os itens efetivamente recebidos e dar entrada deles no estoque.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarPedidoParaRecebimento",
        "kind": "locate",
        "entity": "PurchaseOrder",
        "title": "Localizar pedido para recebimento",
        "description": "Localiza o pedido de compra que chegou ao almoxarifado."
      },
      {
        "stepId": "inspecionarItensDoPedido",
        "kind": "inspect",
        "entity": "PurchaseOrder",
        "title": "Inspecionar itens do pedido",
        "description": "Confere os produtos e as quantidades ainda esperadas no pedido."
      },
      {
        "stepId": "registrarRecebimento",
        "kind": "act",
        "entity": "GoodsReceipt",
        "effect": "create",
        "title": "Registrar recebimento",
        "description": "Registra o recebimento total ou parcial dos itens; os produtos e quantidades recebidos dão entrada no estoque e o pedido é atualizado."
      }
    ],
    "outcome": {
      "statement": "O recebimento é registrado e o estoque reflete os produtos efetivamente recebidos.",
      "evidence": [
        "Registro de recebimento identifica o pedido e as quantidades recebidas.",
        "Estoque dos produtos recebidos apresenta a entrada correspondente.",
        "O pedido indica o que foi recebido e o que eventualmente permanece pendente."
      ]
    }
  },
  "businessHash": "sha256:43f33b44c4cc6fddecce99d59a146286662b33613f1aaa7c416cfa30dad86625"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarRecebimentoPedidoJourneyType = typeof registrarRecebimentoPedidoJourney;

export default registrarRecebimentoPedidoJourney;
