/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/cancelarMatricula.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const cancelarMatriculaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cancelarMatricula",
  "business": {
    "actorRef": "recepcao",
    "title": "Cancelar matrícula",
    "goal": "A pedido do aluno, localizar a matrícula ativa, conferir sua situação e registrar o cancelamento, encerrando a geração de mensalidades futuras.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarMatriculaCancelar",
        "kind": "locate",
        "entity": "Matricula",
        "title": "Buscar matrícula do aluno",
        "description": "A recepção busca a matrícula ativa do aluno que pediu o cancelamento."
      },
      {
        "stepId": "conferirSituacaoMatricula",
        "kind": "inspect",
        "entity": "Matricula",
        "title": "Conferir situação da matrícula",
        "description": "A recepção confere plano, data de início e mensalidades em aberto ou vencidas da matrícula."
      },
      {
        "stepId": "registrarCancelamento",
        "kind": "act",
        "entity": "Matricula",
        "effect": "transition",
        "transitionRef": "cancelar",
        "title": "Registrar cancelamento",
        "description": "A recepção registra o cancelamento da matrícula, que deixa de receber mensalidades nas próximas gerações."
      }
    ],
    "outcome": {
      "statement": "A matrícula fica cancelada e não gera mais mensalidades futuras.",
      "evidence": [
        "A matrícula aparece como cancelada.",
        "A próxima geração de mensalidades não inclui o aluno."
      ]
    }
  },
  "businessHash": "sha256:7f0d4513792f4afceb19d730ed95194188a7bc2b92139760ee5ba882f6a6d1cf"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CancelarMatriculaJourneyType = typeof cancelarMatriculaJourney;

export default cancelarMatriculaJourney;
