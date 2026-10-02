/// <mls fileReference="_102047_/l4/ordenServicio/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicioJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "ordenServicio",
  "journeys": [
    {
      "journeyId": "abrirOrdenServicio",
      "actorRef": "recepcionista",
      "title": "Abrir una orden al recibir un aparato"
    },
    {
      "journeyId": "prepararPresupuesto",
      "actorRef": "tecnico",
      "title": "Analizar el aparato y preparar el presupuesto"
    },
    {
      "journeyId": "aprobarPresupuesto",
      "actorRef": "cliente",
      "title": "Aprobar un presupuesto"
    },
    {
      "journeyId": "rechazarPresupuesto",
      "actorRef": "cliente",
      "title": "Rechazar un presupuesto"
    },
    {
      "journeyId": "repararYmarcarLista",
      "actorRef": "tecnico",
      "title": "Reparar el aparato y marcar la orden como lista"
    },
    {
      "journeyId": "entregarAparatoYfinalizar",
      "actorRef": "recepcionista",
      "title": "Entregar el aparato reparado y finalizar la orden"
    },
    {
      "journeyId": "consultarMisOrdenes",
      "actorRef": "cliente",
      "title": "Consultar mis órdenes de servicio"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5JourneyIndexArtifact;

export type OrdenServicioJourneyIndexType = typeof ordenServicioJourneyIndex;

export default ordenServicioJourneyIndex;
