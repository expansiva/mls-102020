/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/gerarMensalidadesDoMes.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const gerarMensalidadesDoMesJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "gerarMensalidadesDoMes",
  "business": {
    "actorRef": "gerencia",
    "title": "Gerar mensalidades do mês",
    "goal": "Criar as mensalidades mensais dos alunos com matrícula ativa.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "criarMensalidades",
        "kind": "act",
        "entity": "Mensalidade",
        "effect": "create",
        "title": "x",
        "description": "Gera uma mensalidade para cada aluno com matrícula ativa, usando o valor do plano e o dia de vencimento correspondente ao mês."
      }
    ],
    "outcome": {
      "statement": "As mensalidades do período são geradas para todos os alunos ativos.",
      "evidence": [
        "Existe uma mensalidade do mês para cada matrícula ativa.",
        "Cada mensalidade apresenta valor e data de vencimento definidos pelo plano."
      ]
    }
  },
  "businessHash": "sha256:c32e4d42a0c3164e2dd1e930e0a70f9022e25cb98841bcc48857264dec1da46b"
} as const satisfies Ns5JourneyArtifact;

export type GerarMensalidadesDoMesJourneyType = typeof gerarMensalidadesDoMesJourney;

export default gerarMensalidadesDoMesJourney;
