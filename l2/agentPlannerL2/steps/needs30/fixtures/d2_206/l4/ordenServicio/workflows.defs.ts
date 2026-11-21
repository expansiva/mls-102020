/// <mls fileReference="_102047_/l4/ordenServicio/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const ordenServicioWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "ordenServicio",
  "processes": [
    {
      "processId": "cicloOrdenServicio",
      "title": "Ciclo de la orden de servicio",
      "description": "Lleva el aparato desde la apertura de la orden por el recepcionista, el diagnóstico y presupuesto del técnico y la respuesta del cliente, hasta la reparación y la entrega, o el cierre por rechazo.",
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
            "diagnosticar"
          ],
          "description": "El recepcionista abre la orden con los datos del cliente, el aparato, el defecto informado y las fotos, y la pasa al técnico."
        },
        {
          "taskId": "diagnosticar",
          "kind": "human",
          "actorRef": "tecnico",
          "journeyRef": "diagnosticarYpresupuestar",
          "next": [
            "responder"
          ],
          "description": "El técnico registra el diagnóstico, las piezas con costo interno y emite el presupuesto para el cliente."
        },
        {
          "taskId": "responder",
          "kind": "human",
          "actorRef": "cliente",
          "journeyRef": "responderPresupuesto",
          "next": [
            "reparar"
          ],
          "description": "El cliente aprueba o rechaza el presupuesto desde el portal; si lo rechaza, la orden se cierra como rechazada y el aparato queda disponible para retiro, y si lo aprueba, pasa al técnico."
        },
        {
          "taskId": "reparar",
          "kind": "human",
          "actorRef": "tecnico",
          "journeyRef": "realizarReparacion",
          "next": [
            "entregar"
          ],
          "description": "Con el presupuesto aprobado, el técnico repara el aparato, registra lo realizado y marca la orden como lista para el recepcionista."
        },
        {
          "taskId": "entregar",
          "kind": "human",
          "actorRef": "recepcionista",
          "journeyRef": "entregarYfinalizar",
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
      "processId": "cicloOrdenServicio"
    },
    {
      "journeyId": "diagnosticarYpresupuestar",
      "inProcess": true,
      "processId": "cicloOrdenServicio"
    },
    {
      "journeyId": "responderPresupuesto",
      "inProcess": true,
      "processId": "cicloOrdenServicio"
    },
    {
      "journeyId": "realizarReparacion",
      "inProcess": true,
      "processId": "cicloOrdenServicio"
    },
    {
      "journeyId": "entregarYfinalizar",
      "inProcess": true,
      "processId": "cicloOrdenServicio"
    },
    {
      "journeyId": "consultarMisOrdenes",
      "inProcess": false
    }
  ]
} as const satisfies Ns5Readonly<Ns5WorkflowsArtifact>;

export type OrdenServicioWorkflowsType = typeof ordenServicioWorkflows;

export default ordenServicioWorkflows;
