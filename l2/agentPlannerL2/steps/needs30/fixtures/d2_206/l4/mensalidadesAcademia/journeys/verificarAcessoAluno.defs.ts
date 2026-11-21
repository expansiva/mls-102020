/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/verificarAcessoAluno.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const verificarAcessoAlunoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "verificarAcessoAluno",
  "business": {
    "actorRef": "recepcao",
    "title": "Verificar liberação de entrada",
    "goal": "Saber se o aluno pode entrar na academia ou está bloqueado por mensalidades vencidas.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarMatriculaAluno",
        "kind": "locate",
        "entity": "Matricula",
        "title": "Buscar matrícula do aluno",
        "description": "A recepção busca a matrícula do aluno que chegou à academia."
      },
      {
        "stepId": "consultarSituacao",
        "kind": "inspect",
        "entity": "Matricula",
        "title": "Consultar situação do aluno",
        "description": "A recepção vê se a matrícula está ativa, bloqueada por duas mensalidades vencidas ou cancelada, e quais mensalidades estão vencidas."
      }
    ],
    "outcome": {
      "statement": "A recepção sabe se libera ou impede a entrada do aluno.",
      "evidence": [
        "A tela mostra a situação da matrícula e as mensalidades vencidas que impedem a entrada."
      ]
    }
  },
  "businessHash": "sha256:9de2909efce26df8909e74c52657d06f3ec277a1d2605380907cf625ac5311eb"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type VerificarAcessoAlunoJourneyType = typeof verificarAcessoAlunoJourney;

export default verificarAcessoAlunoJourney;
