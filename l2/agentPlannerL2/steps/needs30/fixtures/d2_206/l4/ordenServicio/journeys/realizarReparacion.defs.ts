/// <mls fileReference="_102047_/l4/ordenServicio/journeys/realizarReparacion.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const realizarReparacionJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "realizarReparacion",
  "business": {
    "actorRef": "tecnico",
    "title": "Realizar reparación",
    "goal": "Reparar el aparato de una orden aprobada, registrar lo realizado y marcarla como lista.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "buscarOrdenAprobada",
        "kind": "locate",
        "entity": "OrdenServicio",
        "title": "Buscar órdenes aprobadas",
        "description": "El técnico localiza las órdenes con presupuesto aprobado."
      },
      {
        "stepId": "revisarOrdenAprobada",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Revisar diagnóstico y piezas",
        "description": "El técnico revisa el diagnóstico y las piezas previstas antes de reparar."
      },
      {
        "stepId": "registrarTrabajo",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "update",
        "title": "Registrar trabajo realizado",
        "description": "El técnico registra la descripción de lo que hizo en la reparación."
      },
      {
        "stepId": "marcarLista",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "transition",
        "transitionRef": "marcarLista",
        "title": "Marcar como lista",
        "description": "El técnico marca la orden como lista para entrega."
      },
      {
        "stepId": "pasarArecepcion",
        "kind": "handoff",
        "entity": "OrdenServicio",
        "title": "Enviar a entrega",
        "description": "La orden lista queda disponible para que el recepcionista entregue el aparato.",
        "handoffTo": "recepcionista"
      }
    ],
    "outcome": {
      "statement": "La reparación queda registrada y la orden está lista para entrega.",
      "evidence": [
        "La orden muestra estado lista",
        "El trabajo realizado queda registrado en la orden"
      ]
    }
  },
  "businessHash": "sha256:972d1cba62cdc5f914fbfb6151ad51448162efe5a0021acc321b2b413047fe46"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RealizarReparacionJourneyType = typeof realizarReparacionJourney;

export default realizarReparacionJourney;
