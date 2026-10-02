/// <mls fileReference="_102047_/l4/ordenServicio/journeys/aprobarPresupuesto.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const aprobarPresupuestoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "aprobarPresupuesto",
  "business": {
    "actorRef": "cliente",
    "title": "Aprobar un presupuesto",
    "goal": "Autorizar la reparación de una de sus órdenes desde el portal.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "revisarPresupuestoRecibido",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Revisar el presupuesto",
        "description": "Consulta su orden y revisa su estado, el diagnóstico y el valor del presupuesto, sin acceso a costos internos ni anotaciones técnicas."
      },
      {
        "stepId": "decidirAprobacion",
        "kind": "decide",
        "entity": "OrdenServicio",
        "title": "Decidir la aprobación",
        "description": "Decide aprobar el presupuesto recibido para autorizar la reparación."
      },
      {
        "stepId": "confirmarAprobacion",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "transition",
        "transitionRef": "aprobarPresupuesto",
        "title": "Confirmar la aprobación",
        "description": "Registra la aprobación del presupuesto por parte del cliente."
      },
      {
        "stepId": "derivarReparacion",
        "kind": "handoff",
        "entity": "OrdenServicio",
        "title": "Derivar a reparación",
        "description": "Deriva la orden aprobada al técnico para realizar la reparación.",
        "handoffTo": "tecnico"
      }
    ],
    "outcome": {
      "statement": "La reparación queda autorizada por el cliente.",
      "evidence": [
        "La OrdenServicio muestra que el presupuesto fue aprobado.",
        "La orden queda disponible para reparación por el Técnico."
      ]
    }
  },
  "businessHash": "sha256:e7b149a864b5d444a924ea25148e334d2066c445cac541e98336c1e3241bc1d1"
} as const satisfies Ns5JourneyArtifact;

export type AprobarPresupuestoJourneyType = typeof aprobarPresupuestoJourney;

export default aprobarPresupuestoJourney;
