/// <mls fileReference="_102047_/l4/ordenServicio/journeys/rechazarPresupuesto.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const rechazarPresupuestoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "rechazarPresupuesto",
  "business": {
    "actorRef": "cliente",
    "title": "Rechazar un presupuesto",
    "goal": "Rechazar el presupuesto de una de sus órdenes desde el portal.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "revisarPresupuestoParaRechazo",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Revisar el presupuesto",
        "description": "Consulta su orden y revisa su estado, el diagnóstico y el valor del presupuesto, sin acceso a costos internos ni anotaciones técnicas."
      },
      {
        "stepId": "decidirRechazo",
        "kind": "decide",
        "entity": "OrdenServicio",
        "title": "Decidir el rechazo",
        "description": "Decide rechazar el presupuesto recibido."
      },
      {
        "stepId": "confirmarRechazo",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "transition",
        "transitionRef": "rechazarPresupuesto",
        "title": "Confirmar el rechazo",
        "description": "Registra el rechazo del presupuesto, cierra la orden como rechazada y deja el aparato disponible para retiro."
      }
    ],
    "outcome": {
      "statement": "La orden queda cerrada como rechazada y el aparato queda disponible para retiro.",
      "evidence": [
        "La OrdenServicio muestra el estado de rechazo.",
        "La orden indica que el aparato está disponible para retiro."
      ]
    }
  },
  "businessHash": "sha256:be412654440fd6e03a11943d2090f21bed5ac053c992841ebfd76f4e1b9e776e"
} as const satisfies Ns5JourneyArtifact;

export type RechazarPresupuestoJourneyType = typeof rechazarPresupuestoJourney;

export default rechazarPresupuestoJourney;
