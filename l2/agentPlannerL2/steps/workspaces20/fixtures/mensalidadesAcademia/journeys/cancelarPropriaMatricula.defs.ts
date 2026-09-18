/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/cancelarPropriaMatricula.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const cancelarPropriaMatriculaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cancelarPropriaMatricula",
  "business": {
    "actorRef": "aluno",
    "title": "Cancelar própria matrícula",
    "goal": "Encerrar a própria matrícula para interromper a geração de mensalidades futuras.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarPropriaMatricula",
        "kind": "locate",
        "entity": "Matricula",
        "title": "x",
        "description": "Localiza a matrícula vinculada ao próprio aluno."
      },
      {
        "stepId": "inspecionarPropriaMatricula",
        "kind": "inspect",
        "entity": "Matricula",
        "title": "x",
        "description": "Confere o plano e a situação da própria matrícula antes do cancelamento."
      },
      {
        "stepId": "cancelarMatricula",
        "kind": "act",
        "entity": "Matricula",
        "effect": "transition",
        "transitionRef": "cancelarMatricula",
        "title": "x",
        "description": "Cancela a matrícula, encerrando a geração de mensalidades futuras."
      }
    ],
    "outcome": {
      "statement": "A matrícula do aluno é cancelada e deixa de gerar mensalidades futuras.",
      "evidence": [
        "Matrícula registrada como cancelada.",
        "Não são geradas novas mensalidades após o cancelamento."
      ]
    }
  },
  "businessHash": "sha256:2cce1d7cc5e606a96894f84fc40cc1d0a6b73fb2f419b1b7e9c342ee666c813e"
} as const satisfies Ns5JourneyArtifact;

export type CancelarPropriaMatriculaJourneyType = typeof cancelarPropriaMatriculaJourney;

export default cancelarPropriaMatriculaJourney;
