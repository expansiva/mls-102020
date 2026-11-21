/// <mls fileReference="_102047_/l4/ordenServicio/journeys/responderPresupuesto.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const responderPresupuestoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "responderPresupuesto",
  "business": {
    "actorRef": "cliente",
    "title": "Responder presupuesto",
    "goal": "Aprobar o rechazar desde el portal el presupuesto de su orden de servicio.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "abrirOrdenPresupuestada",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Ver presupuesto",
        "description": "El cliente abre su orden y ve el estado, el diagnóstico y el valor del presupuesto, sin costos internos ni anotaciones del técnico."
      },
      {
        "stepId": "decidirPresupuesto",
        "kind": "decide",
        "entity": "OrdenServicio",
        "title": "Aprobar o rechazar",
        "description": "El cliente elige entre aprobar o rechazar el presupuesto."
      },
      {
        "stepId": "aprobarPresupuesto",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "transition",
        "transitionRef": "aprobarPresupuesto",
        "title": "Aprobar presupuesto",
        "description": "Si el cliente aprueba, la orden pasa a aprobada y queda lista para la reparación."
      },
      {
        "stepId": "rechazarPresupuesto",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "transition",
        "transitionRef": "rechazarPresupuesto",
        "title": "Rechazar presupuesto",
        "description": "Si el cliente rechaza, la orden se cierra como rechazada y el aparato queda disponible para retiro."
      },
      {
        "stepId": "pasarAtecnicoReparacion",
        "kind": "handoff",
        "entity": "OrdenServicio",
        "title": "Avisar al técnico",
        "description": "Cuando el presupuesto es aprobado, la orden pasa al técnico para la reparación.",
        "handoffTo": "tecnico"
      }
    ],
    "outcome": {
      "statement": "El presupuesto queda aprobado y la orden pasa a reparación, o queda rechazado y la orden se cierra con el aparato disponible para retiro.",
      "evidence": [
        "La orden muestra estado aprobada o rechazada en el portal",
        "Una orden rechazada indica que el aparato está disponible para retiro"
      ]
    }
  },
  "businessHash": "sha256:b93f7a794c363dc1e3292b9f4794925513d0d30bbb48311c3c8f4fffbcc44cfc"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ResponderPresupuestoJourneyType = typeof responderPresupuestoJourney;

export default responderPresupuestoJourney;
