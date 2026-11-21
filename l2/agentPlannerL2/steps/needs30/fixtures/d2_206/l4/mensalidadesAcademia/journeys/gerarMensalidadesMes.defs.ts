/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/gerarMensalidadesMes.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const gerarMensalidadesMesJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "gerarMensalidadesMes",
  "business": {
    "actorRef": "gerencia",
    "title": "Gerar mensalidades do mês",
    "goal": "Gerar uma mensalidade por aluno ativo com o valor do plano e o vencimento do mês.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "conferirMatriculasAtivas",
        "kind": "locate",
        "entity": "Matricula",
        "title": "Conferir matrículas ativas",
        "description": "A gerência confere as matrículas ativas que receberão mensalidade no mês de referência."
      },
      {
        "stepId": "gerarMensalidades",
        "kind": "act",
        "entity": "Mensalidade",
        "effect": "create",
        "title": "Gerar mensalidades",
        "description": "A gerência informa o mês de referência e gera uma mensalidade por matrícula ativa, com o valor do plano e o vencimento no dia do plano, sem duplicar mensalidades já geradas."
      },
      {
        "stepId": "revisarMensalidadesGeradas",
        "kind": "inspect",
        "entity": "Mensalidade",
        "title": "Revisar mensalidades geradas",
        "description": "A gerência revisa a lista de mensalidades geradas no mês com aluno, valor e vencimento."
      }
    ],
    "outcome": {
      "statement": "Cada aluno ativo possui uma mensalidade em aberto para o mês.",
      "evidence": [
        "A lista do mês mostra uma mensalidade por aluno ativo, com valor e vencimento.",
        "Matrículas canceladas não recebem mensalidade."
      ]
    }
  },
  "businessHash": "sha256:025b8847b9a7ad0f6e4a0096a09776cf3c397a2c4b06189c328b4fc05d378722"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type GerarMensalidadesMesJourneyType = typeof gerarMensalidadesMesJourney;

export default gerarMensalidadesMesJourney;
