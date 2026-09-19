/// <mls fileReference="_102047_/l4/mensalidadesAcademia/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "mensalidadesAcademia",
  "processes": [
    {
      "processId": "lembrarGeracaoMensalidades",
      "title": "Lembrete mensal de geração de mensalidades",
      "description": "Lembra a gerência de gerar as mensalidades dos alunos com matrícula ativa a cada mês.",
      "trigger": {
        "kind": "scheduled",
        "schedule": "Todo mês"
      },
      "tasks": [
        {
          "taskId": "alertarGerenciaGeracao",
          "kind": "alert",
          "actorRef": "gerencia",
          "next": [],
          "description": "Gere as mensalidades do mês executando a jornada Gerar mensalidades do mês para todos os alunos com matrícula ativa."
        }
      ]
    }
  ],
  "journeyDecisions": [
    {
      "journeyId": "matricularAluno",
      "inProcess": false
    },
    {
      "journeyId": "gerarMensalidadesDoMes",
      "inProcess": false
    },
    {
      "journeyId": "registrarPagamentoMensalidade",
      "inProcess": false
    },
    {
      "journeyId": "acompanharIndicadoresAcademia",
      "inProcess": false
    },
    {
      "journeyId": "cancelarPropriaMatricula",
      "inProcess": false
    }
  ]
} as const satisfies Ns5WorkflowsArtifact;

export type MensalidadesAcademiaWorkflowsType = typeof mensalidadesAcademiaWorkflows;

export default mensalidadesAcademiaWorkflows;
