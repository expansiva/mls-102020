/// <mls fileReference="_102047_/l4/ordenServicio/journeys/abrirOrdenServicio.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const abrirOrdenServicioJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "abrirOrdenServicio",
  "business": {
    "actorRef": "recepcionista",
    "title": "Abrir orden de servicio",
    "goal": "Registrar la entrada del aparato del cliente abriendo una orden de servicio con el defecto informado y fotos.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "buscarCliente",
        "kind": "locate",
        "entity": "Cliente",
        "title": "Buscar cliente",
        "description": "El recepcionista busca al cliente por documento o nombre para saber si ya está registrado."
      },
      {
        "stepId": "registrarCliente",
        "kind": "act",
        "entity": "Cliente",
        "effect": "create",
        "title": "Registrar datos del cliente",
        "description": "Si el cliente no existe, el recepcionista registra sus datos; si ya existe, se reutiliza el mismo registro."
      },
      {
        "stepId": "crearOrden",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "create",
        "title": "Abrir orden de servicio",
        "description": "El recepcionista abre la orden con el cliente, los datos del aparato, el defecto informado y las fotos del aparato."
      },
      {
        "stepId": "pasarAtecnico",
        "kind": "handoff",
        "entity": "OrdenServicio",
        "title": "Enviar a análisis técnico",
        "description": "La orden abierta queda disponible para que el técnico la analice.",
        "handoffTo": "tecnico"
      }
    ],
    "outcome": {
      "statement": "La orden de servicio queda abierta y vinculada al cliente y al aparato, a la espera de análisis.",
      "evidence": [
        "La orden aparece con estado abierta y un número de orden",
        "La orden muestra el cliente, el aparato, el defecto informado y las fotos"
      ]
    }
  },
  "businessHash": "sha256:0d39488a1f916f3ba18a929a152d41cb979660eb3667de9ce42480a68d217e10"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AbrirOrdenServicioJourneyType = typeof abrirOrdenServicioJourney;

export default abrirOrdenServicioJourney;
