/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/matricularAluno.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const matricularAlunoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "matricularAluno",
  "business": {
    "actorRef": "recepcao",
    "title": "Matricular aluno em plano",
    "goal": "Matricular um aluno em um plano a partir de uma data.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarAluno",
        "kind": "locate",
        "entity": "Aluno",
        "title": "Buscar aluno",
        "description": "A recepção busca o aluno pelo nome ou documento; se não existir, o cadastro é criado na própria matrícula."
      },
      {
        "stepId": "escolherPlano",
        "kind": "locate",
        "entity": "Plano",
        "title": "Escolher plano",
        "description": "A recepção seleciona o plano desejado pelo aluno e confere valor e dia de vencimento."
      },
      {
        "stepId": "registrarMatricula",
        "kind": "act",
        "entity": "Matricula",
        "effect": "create",
        "title": "Registrar matrícula",
        "description": "A recepção registra a matrícula do aluno no plano escolhido com a data de início, deixando-a ativa."
      }
    ],
    "outcome": {
      "statement": "O aluno está matriculado e ativo no plano a partir da data informada.",
      "evidence": [
        "A matrícula aparece como ativa com plano e data de início.",
        "O aluno passa a ser considerado na próxima geração de mensalidades."
      ]
    }
  },
  "businessHash": "sha256:b4b53c56665fe437395e02fc845bc62a2a513872d6f8c77480321213435bf435"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type MatricularAlunoJourneyType = typeof matricularAlunoJourney;

export default matricularAlunoJourney;
