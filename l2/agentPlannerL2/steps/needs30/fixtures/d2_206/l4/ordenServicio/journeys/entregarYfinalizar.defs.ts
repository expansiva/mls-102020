/// <mls fileReference="_102047_/l4/ordenServicio/journeys/entregarYfinalizar.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const entregarYfinalizarJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "entregarYfinalizar",
  "business": {
    "actorRef": "recepcionista",
    "title": "Entregar y finalizar orden",
    "goal": "Entregar al cliente el aparato reparado y finalizar la orden de servicio.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "buscarOrdenLista",
        "kind": "locate",
        "entity": "OrdenServicio",
        "title": "Buscar órdenes listas",
        "description": "El recepcionista localiza la orden lista del cliente que viene a retirar el aparato."
      },
      {
        "stepId": "revisarOrdenLista",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Verificar orden y aparato",
        "description": "El recepcionista confirma el cliente, el aparato y el valor del presupuesto aprobado."
      },
      {
        "stepId": "finalizarOrden",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "transition",
        "transitionRef": "finalizar",
        "title": "Entregar y finalizar",
        "description": "El recepcionista entrega el aparato al cliente y finaliza la orden."
      }
    ],
    "outcome": {
      "statement": "El aparato fue entregado y la orden de servicio quedó finalizada.",
      "evidence": [
        "La orden muestra estado finalizada",
        "La fecha de entrega queda registrada en la orden"
      ]
    }
  },
  "businessHash": "sha256:59b4955630ec98732c8783762344f0f536f287bc12ab028c1db7a4d7df8b6d54"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type EntregarYfinalizarJourneyType = typeof entregarYfinalizarJourney;

export default entregarYfinalizarJourney;
