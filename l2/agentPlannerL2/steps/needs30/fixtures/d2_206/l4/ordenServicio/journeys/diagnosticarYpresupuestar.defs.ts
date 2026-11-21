/// <mls fileReference="_102047_/l4/ordenServicio/journeys/diagnosticarYpresupuestar.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const diagnosticarYpresupuestarJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "diagnosticarYpresupuestar",
  "business": {
    "actorRef": "tecnico",
    "title": "Diagnosticar y presupuestar",
    "goal": "Analizar el aparato, registrar el diagnóstico, las piezas con costo interno y el valor del presupuesto para el cliente.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "buscarOrdenAbierta",
        "kind": "locate",
        "entity": "OrdenServicio",
        "title": "Buscar órdenes por analizar",
        "description": "El técnico localiza las órdenes abiertas pendientes de análisis."
      },
      {
        "stepId": "revisarOrden",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Revisar defecto y fotos",
        "description": "El técnico revisa el aparato, el defecto informado y las fotos de la orden."
      },
      {
        "stepId": "registrarDiagnostico",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "update",
        "title": "Registrar diagnóstico",
        "description": "El técnico registra el diagnóstico y sus anotaciones internas."
      },
      {
        "stepId": "registrarPiezas",
        "kind": "act",
        "entity": "PiezaOrden",
        "effect": "create",
        "title": "Agregar piezas necesarias",
        "description": "El técnico agrega cada pieza necesaria con su cantidad y costo interno."
      },
      {
        "stepId": "emitirPresupuesto",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "transition",
        "transitionRef": "emitirPresupuesto",
        "title": "Emitir presupuesto",
        "description": "El técnico define el valor del presupuesto para el cliente y lo emite, dejando la orden a la espera de aprobación."
      },
      {
        "stepId": "pasarAcliente",
        "kind": "handoff",
        "entity": "OrdenServicio",
        "title": "Enviar presupuesto al cliente",
        "description": "El presupuesto queda disponible en el portal para que el cliente lo apruebe o lo rechace.",
        "handoffTo": "cliente"
      }
    ],
    "outcome": {
      "statement": "La orden tiene diagnóstico, piezas con costo interno y un presupuesto emitido esperando la respuesta del cliente.",
      "evidence": [
        "La orden muestra estado presupuesto enviado",
        "El diagnóstico, las piezas y el valor del presupuesto quedan registrados en la orden"
      ]
    }
  },
  "businessHash": "sha256:2cce635ded1b3f2785191cccef99bbe275014689cc159506c085a13081ecffb0"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type DiagnosticarYpresupuestarJourneyType = typeof diagnosticarYpresupuestarJourney;

export default diagnosticarYpresupuestarJourney;
