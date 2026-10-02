/// <mls fileReference="_102047_/l4/ordenServicio/journeys/prepararPresupuesto.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const prepararPresupuestoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "prepararPresupuesto",
  "business": {
    "actorRef": "tecnico",
    "title": "Analizar el aparato y preparar el presupuesto",
    "goal": "Diagnosticar la falla, registrar las piezas requeridas y enviar al cliente un presupuesto para decidir.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarOrdenPendiente",
        "kind": "locate",
        "entity": "OrdenServicio",
        "title": "Localizar la orden pendiente",
        "description": "Localiza la orden recibida para análisis técnico."
      },
      {
        "stepId": "registrarAnalisis",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "update",
        "title": "Registrar el análisis",
        "description": "Analiza la información de recepción y registra el diagnóstico, las piezas necesarias con su costo interno y el valor del presupuesto propuesto."
      },
      {
        "stepId": "emitirPresupuesto",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "transition",
        "transitionRef": "emitirPresupuesto",
        "title": "Emitir el presupuesto",
        "description": "Emite el presupuesto para que el cliente pueda revisarlo y decidir."
      },
      {
        "stepId": "enviarPresupuestoAlCliente",
        "kind": "handoff",
        "entity": "OrdenServicio",
        "title": "Poner el presupuesto a disposición",
        "description": "Pone el presupuesto a disposición del cliente en el portal para su decisión.",
        "handoffTo": "cliente"
      }
    ],
    "outcome": {
      "statement": "El cliente tiene un presupuesto con el diagnóstico y el valor a aprobar o rechazar.",
      "evidence": [
        "La OrdenServicio registra el diagnóstico y el valor del presupuesto.",
        "El presupuesto está disponible para la decisión del Cliente."
      ]
    }
  },
  "businessHash": "sha256:cc916c061a76ea04993a0d4535a980600a1e0beeddc4a3e35c7e7855b755674b"
} as const satisfies Ns5JourneyArtifact;

export type PrepararPresupuestoJourneyType = typeof prepararPresupuestoJourney;

export default prepararPresupuestoJourney;
