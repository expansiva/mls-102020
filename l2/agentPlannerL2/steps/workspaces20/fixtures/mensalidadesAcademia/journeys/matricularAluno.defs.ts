/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/matricularAluno.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const matricularAlunoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "matricularAluno",
  "business": {
    "actorRef": "recepcao",
    "title": "Matricular aluno em um plano",
    "goal": "Registrar a matrícula de um aluno em um plano a partir de uma data de início.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarAluno",
        "kind": "locate",
        "entity": "Aluno",
        "title": "x",
        "description": "Localiza o cadastro do aluno ou inicia seu registro quando ele ainda não existe."
      },
      {
        "stepId": "localizarPlano",
        "kind": "locate",
        "entity": "Plano",
        "title": "x",
        "description": "Localiza o plano mensal, trimestral ou anual escolhido pelo aluno."
      },
      {
        "stepId": "criarMatricula",
        "kind": "act",
        "entity": "Matricula",
        "effect": "create",
        "title": "x",
        "description": "Registra a matrícula com o plano selecionado e a data de início, vinculando o aluno ao módulo quando necessário."
      }
    ],
    "outcome": {
      "statement": "A matrícula do aluno fica ativa no plano escolhido a partir da data informada.",
      "evidence": [
        "Matrícula registrada com aluno, plano e data de início.",
        "Aluno incluído entre os alunos ativos para geração de mensalidades."
      ]
    }
  },
  "businessHash": "sha256:9328ee220ea8bd559541ce24405cd062376d4a958e5e5f3f46931900b91a497d"
} as const satisfies Ns5JourneyArtifact;

export type MatricularAlunoJourneyType = typeof matricularAlunoJourney;

export default matricularAlunoJourney;
