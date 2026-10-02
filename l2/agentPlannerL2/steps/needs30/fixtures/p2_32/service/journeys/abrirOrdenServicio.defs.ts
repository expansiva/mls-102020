/// <mls fileReference="_102047_/l4/ordenServicio/journeys/abrirOrdenServicio.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const abrirOrdenServicioJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "abrirOrdenServicio",
  "business": {
    "actorRef": "recepcionista",
    "title": "Abrir una orden al recibir un aparato",
    "goal": "Registrar la recepción del aparato del cliente y dejar una orden lista para análisis técnico.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "registrarRecepcion",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "create",
        "title": "Registrar la recepción",
        "description": "Abre la orden con el cliente, el aparato recibido, el defecto informado y las fotos de recepción."
      },
      {
        "stepId": "enviarAanalisis",
        "kind": "handoff",
        "entity": "OrdenServicio",
        "title": "Derivar a análisis técnico",
        "description": "Deriva la orden recién abierta al técnico para su análisis.",
        "handoffTo": "tecnico"
      }
    ],
    "outcome": {
      "statement": "La orden queda registrada con el aparato y la información de recepción para que el técnico pueda analizarla.",
      "evidence": [
        "Existe una OrdenServicio nueva con el defecto informado y las fotos de recepción.",
        "La orden queda disponible para el Técnico."
      ]
    }
  },
  "businessHash": "sha256:d9e65132b851e81906eab669fe3c0248dc9d536255505c36f25a90a3b45e94e3"
} as const satisfies Ns5JourneyArtifact;

export type AbrirOrdenServicioJourneyType = typeof abrirOrdenServicioJourney;

export default abrirOrdenServicioJourney;
