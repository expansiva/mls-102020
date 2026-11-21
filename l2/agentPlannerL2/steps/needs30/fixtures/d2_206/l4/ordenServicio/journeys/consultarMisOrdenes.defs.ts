/// <mls fileReference="_102047_/l4/ordenServicio/journeys/consultarMisOrdenes.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const consultarMisOrdenesJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarMisOrdenes",
  "business": {
    "actorRef": "cliente",
    "title": "Consultar mis órdenes",
    "goal": "Ver en el portal el estado, el diagnóstico y el valor del presupuesto de sus propias órdenes.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "listarMisOrdenes",
        "kind": "locate",
        "entity": "OrdenServicio",
        "title": "Ver mis órdenes",
        "description": "El cliente ve en el portal solamente sus propias órdenes de servicio."
      },
      {
        "stepId": "verDetalleOrden",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Ver detalle de la orden",
        "description": "El cliente ve el estado, el aparato, el diagnóstico y el valor del presupuesto, nunca el costo interno de las piezas ni las anotaciones del técnico."
      }
    ],
    "outcome": {
      "statement": "El cliente conoce la situación de sus órdenes sin acceder a información interna del taller.",
      "evidence": [
        "La lista muestra solo órdenes del cliente conectado",
        "El detalle muestra estado, diagnóstico y valor del presupuesto sin costos internos ni anotaciones"
      ]
    }
  },
  "businessHash": "sha256:1feb0bd1f83f353a35335757af21998f72c6df1e5ac66eefc53e678ad2d73195"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ConsultarMisOrdenesJourneyType = typeof consultarMisOrdenesJourney;

export default consultarMisOrdenesJourney;
