/// <mls fileReference="_102047_/l4/compras/journeys/decidirPedidoAcimaDoLimite.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const decidirPedidoAcimaDoLimiteJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "decidirPedidoAcimaDoLimite",
  "business": {
    "actorRef": "gerenteCompras",
    "title": "Decidir pedido de compra acima do limite",
    "goal": "Autorizar ou rejeitar um pedido de valor elevado antes que ele prossiga para recebimento.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarPedidoPendente",
        "kind": "locate",
        "entity": "PurchaseOrder",
        "title": "Localizar pedido pendente",
        "description": "Localiza o pedido enviado que está pendente de aprovação."
      },
      {
        "stepId": "inspecionarPedidoCompra",
        "kind": "inspect",
        "entity": "PurchaseOrder",
        "title": "Inspecionar pedido de compra",
        "description": "Examina fornecedor, itens, quantidades, preços e valor total do pedido."
      },
      {
        "stepId": "decidirPedido",
        "kind": "decide",
        "entity": "PurchaseOrder",
        "title": "Decidir aprovação do pedido",
        "description": "Decide entre aprovar ou rejeitar o pedido conforme a necessidade e o valor da compra."
      },
      {
        "stepId": "registrarDecisaoDoPedido",
        "kind": "act",
        "entity": "PurchaseOrder",
        "effect": "transition",
        "transitionRef": "decidePurchaseOrder",
        "title": "Registrar decisão do pedido",
        "description": "Registra a aprovação para liberar o pedido ao recebimento ou a rejeição para impedir seu prosseguimento."
      }
    ],
    "outcome": {
      "statement": "O pedido acima do limite tem a decisão do gerente registrada: aprovado para prosseguir ao recebimento ou rejeitado sem seguir para recebimento.",
      "evidence": [
        "Pedido registra a aprovação ou a rejeição do gerente de compras.",
        "Pedido aprovado permanece disponível para acompanhamento e recebimento.",
        "Pedido rejeitado deixa de estar pendente de aprovação."
      ]
    }
  },
  "businessHash": "sha256:b87365870ccec425c313b1eeac0e22714190ac4c95616fd8b7826f51655cf964"
} as const satisfies Ns5JourneyArtifact;

export type DecidirPedidoAcimaDoLimiteJourneyType = typeof decidirPedidoAcimaDoLimiteJourney;

export default decidirPedidoAcimaDoLimiteJourney;
