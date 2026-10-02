/// <mls fileReference="_102047_/l4/ordenServicio/journeys/entregarAparatoYfinalizar.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const entregarAparatoYfinalizarJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "entregarAparatoYfinalizar",
  "business": {
    "actorRef": "recepcionista",
    "title": "Entregar el aparato reparado y finalizar la orden",
    "goal": "Entregar al cliente su aparato reparado y cerrar la atención.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarOrdenLista",
        "kind": "locate",
        "entity": "OrdenServicio",
        "title": "Localizar la orden lista",
        "description": "Localiza la orden marcada como lista para entrega."
      },
      {
        "stepId": "verificarOrdenParaEntrega",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Verificar la orden para entrega",
        "description": "Verifica el cliente, el aparato y que la reparación está registrada antes de entregarlo."
      },
      {
        "stepId": "finalizarEntrega",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "transition",
        "transitionRef": "entregarYfinalizar",
        "title": "Finalizar la entrega",
        "description": "Entrega el aparato reparado al cliente y finaliza la orden de servicio."
      }
    ],
    "outcome": {
      "statement": "El aparato reparado fue entregado y la orden quedó finalizada.",
      "evidence": [
        "La OrdenServicio muestra que fue finalizada.",
        "La orden registra la entrega del aparato al cliente."
      ]
    }
  },
  "businessHash": "sha256:850a02de6f8177b35860734fd004d9f857064a0d54bdb1457deaed7534ffc35e"
} as const satisfies Ns5JourneyArtifact;

export type EntregarAparatoYfinalizarJourneyType = typeof entregarAparatoYfinalizarJourney;

export default entregarAparatoYfinalizarJourney;
