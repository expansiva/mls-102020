/// <mls fileReference="_102047_/l4/ordenServicio/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicioWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "ordenServicio",
  "processes": [
    {
      "processId": "gestionarOrdenServicio",
      "title": "Gestionar orden de servicio",
      "description": "Coordina la recepción, análisis, decisión del cliente, reparación y entrega de una orden de servicio.",
      "trigger": {
        "kind": "manual",
        "actorRef": "recepcionista"
      },
      "tasks": [
        {
          "taskId": "abrirOrden",
          "kind": "human",
          "actorRef": "recepcionista",
          "journeyRef": "abrirOrdenServicio",
          "next": [
            "prepararPresupuesto"
          ],
          "description": "El recepcionista recibe el aparato, abre la orden y la deriva al análisis técnico."
        },
        {
          "taskId": "prepararPresupuesto",
          "kind": "human",
          "actorRef": "tecnico",
          "journeyRef": "prepararPresupuesto",
          "next": [
            "aprobarPresupuesto",
            "rechazarPresupuesto"
          ],
          "description": "El técnico analiza el aparato, prepara el presupuesto y lo pone a disposición del cliente."
        },
        {
          "taskId": "aprobarPresupuesto",
          "kind": "human",
          "actorRef": "cliente",
          "journeyRef": "aprobarPresupuesto",
          "next": [
            "repararYMarcarLista"
          ],
          "description": "El cliente revisa y aprueba el presupuesto para autorizar la reparación."
        },
        {
          "taskId": "rechazarPresupuesto",
          "kind": "human",
          "actorRef": "cliente",
          "journeyRef": "rechazarPresupuesto",
          "next": [],
          "description": "El cliente rechaza el presupuesto, se cierra la orden como rechazada y el aparato queda disponible para retiro."
        },
        {
          "taskId": "repararYMarcarLista",
          "kind": "human",
          "actorRef": "tecnico",
          "journeyRef": "repararYmarcarLista",
          "next": [
            "entregarAparatoYFinalizar"
          ],
          "description": "El técnico repara el aparato autorizado, registra el trabajo realizado y marca la orden como lista."
        },
        {
          "taskId": "entregarAparatoYFinalizar",
          "kind": "human",
          "actorRef": "recepcionista",
          "journeyRef": "entregarAparatoYfinalizar",
          "next": [],
          "description": "El recepcionista entrega el aparato reparado al cliente y finaliza la orden."
        }
      ]
    }
  ],
  "journeyDecisions": [
    {
      "journeyId": "abrirOrdenServicio",
      "inProcess": true,
      "processId": "gestionarOrdenServicio"
    },
    {
      "journeyId": "prepararPresupuesto",
      "inProcess": true,
      "processId": "gestionarOrdenServicio"
    },
    {
      "journeyId": "aprobarPresupuesto",
      "inProcess": true,
      "processId": "gestionarOrdenServicio"
    },
    {
      "journeyId": "rechazarPresupuesto",
      "inProcess": true,
      "processId": "gestionarOrdenServicio"
    },
    {
      "journeyId": "repararYmarcarLista",
      "inProcess": true,
      "processId": "gestionarOrdenServicio"
    },
    {
      "journeyId": "entregarAparatoYfinalizar",
      "inProcess": true,
      "processId": "gestionarOrdenServicio"
    },
    {
      "journeyId": "consultarMisOrdenes",
      "inProcess": false
    }
  ]
} as const satisfies Ns5WorkflowsArtifact;

export type OrdenServicioWorkflowsType = typeof ordenServicioWorkflows;

export default ordenServicioWorkflows;
