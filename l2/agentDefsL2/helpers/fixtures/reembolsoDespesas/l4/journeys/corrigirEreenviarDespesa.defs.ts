/// <mls fileReference="_102047_/l4/reembolsoDespesas/journeys/corrigirEreenviarDespesa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const corrigirEreenviarDespesaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "corrigirEreenviarDespesa",
  "business": {
    "actorRef": "colaborador",
    "title": "Corrigir e reenviar despesa rejeitada",
    "goal": "Ajustar uma despesa rejeitada e reenviá-la para nova aprovação.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarDespesaRejeitada",
        "kind": "locate",
        "entity": "Despesa",
        "title": "Localizar despesa rejeitada",
        "description": "Localiza uma despesa própria rejeitada que ainda pode ser corrigida e reenviada."
      },
      {
        "stepId": "inspecionarMotivoRejeicao",
        "kind": "inspect",
        "entity": "Despesa",
        "title": "Inspecionar motivo da rejeição",
        "description": "Consulta o motivo informado pelo gestor para a rejeição."
      },
      {
        "stepId": "corrigirDespesa",
        "kind": "act",
        "entity": "Despesa",
        "effect": "update",
        "title": "Corrigir despesa",
        "description": "Corrige os dados necessários da própria despesa rejeitada."
      },
      {
        "stepId": "reenviarDespesa",
        "kind": "act",
        "entity": "Despesa",
        "effect": "transition",
        "transitionRef": "reenviarParaAprovacao",
        "title": "Reenviar despesa",
        "description": "Reenvia a despesa corrigida para nova avaliação, respeitando o único reenvio permitido."
      }
    ],
    "outcome": {
      "statement": "A despesa rejeitada é corrigida e reenviada uma única vez para aprovação.",
      "evidence": [
        "A despesa contém os dados corrigidos.",
        "A despesa volta a ficar disponível para avaliação do gestor.",
        "O reenvio da despesa fica registrado."
      ]
    }
  },
  "businessHash": "sha256:c49dcaf1ccfe892a8c8aecdc1f7335ab9f653409d1f034af1c5e3ef10e83586f"
} as const satisfies Ns5JourneyArtifact;

export type CorrigirEreenviarDespesaJourneyType = typeof corrigirEreenviarDespesaJourney;

export default corrigirEreenviarDespesaJourney;
