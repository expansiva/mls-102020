/// <mls fileReference="_102047_/l4/ordenServicio/journeys/consultarMisOrdenes.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const consultarMisOrdenesJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarMisOrdenes",
  "business": {
    "actorRef": "cliente",
    "title": "Consultar mis órdenes de servicio",
    "goal": "Conocer el avance y el presupuesto de sus propias órdenes desde el portal.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarMisOrdenes",
        "kind": "locate",
        "entity": "OrdenServicio",
        "title": "Localizar mis órdenes",
        "description": "Localiza únicamente sus propias órdenes de servicio en el portal."
      },
      {
        "stepId": "consultarDetalleDeOrden",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Consultar el detalle de la orden",
        "description": "Consulta el estado, el diagnóstico y el valor del presupuesto de una de sus órdenes, sin ver costos internos de piezas ni anotaciones del técnico."
      }
    ],
    "outcome": {
      "statement": "El cliente conoce el estado, diagnóstico y presupuesto de sus propias órdenes.",
      "evidence": [
        "El portal muestra al Cliente únicamente sus OrdenServicio.",
        "El detalle visible incluye estado, diagnóstico y valor del presupuesto, sin costos internos ni anotaciones técnicas."
      ]
    }
  },
  "businessHash": "sha256:82025fa7fc5f1d9ee3ed774253b05b06b4edc19d9ecbfdbbcff779f35cc147e4"
} as const satisfies Ns5JourneyArtifact;

export type ConsultarMisOrdenesJourneyType = typeof consultarMisOrdenesJourney;

export default consultarMisOrdenesJourney;
