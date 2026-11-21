/// <mls fileReference="_102047_/l4/inscricaoEvento/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "inscricaoEvento",
  "processes": [
    {
      "processId": "promoverListaEspera",
      "title": "Promover primeiro da lista de espera",
      "description": "Quando uma inscrição é cancelada, a primeira inscrição da lista de espera do mesmo evento, por ordem de chegada, é promovida para a vaga liberada.",
      "trigger": {
        "kind": "event",
        "event": "Inscricao.cancelar"
      },
      "tasks": [
        {
          "taskId": "promoverPrimeiraDaFila",
          "kind": "mechanical",
          "entityRef": "Inscricao",
          "effect": "transition",
          "transitionRef": "promover",
          "next": [],
          "description": "Se a inscrição cancelada ocupava vaga, a inscrição mais antiga em lista de espera do evento passa a ocupar a vaga liberada."
        }
      ]
    }
  ],
  "journeyDecisions": [
    {
      "journeyId": "cadastrarPublicarEvento",
      "inProcess": false
    },
    {
      "journeyId": "inscreverEmEvento",
      "inProcess": false
    },
    {
      "journeyId": "cancelarInscricao",
      "inProcess": false
    },
    {
      "journeyId": "acompanharInscritos",
      "inProcess": false
    }
  ]
} as const satisfies Ns5Readonly<Ns5WorkflowsArtifact>;

export type InscricaoEventoWorkflowsType = typeof inscricaoEventoWorkflows;

export default inscricaoEventoWorkflows;
