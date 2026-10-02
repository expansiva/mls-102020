/// <mls fileReference="_102047_/l4/reembolsoDespesas/journeys/registrarPagamentoDeDespesa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarPagamentoDeDespesaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarPagamentoDeDespesa",
  "business": {
    "actorRef": "financeiro",
    "title": "Registrar pagamento de despesa aprovada",
    "goal": "Localizar uma despesa aprovada e registrar sua data de pagamento.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarDespesaAprovada",
        "kind": "locate",
        "entity": "Despesa",
        "title": "Localizar despesa aprovada",
        "description": "Localiza uma despesa aprovada disponível para pagamento."
      },
      {
        "stepId": "inspecionarDespesaAprovada",
        "kind": "inspect",
        "entity": "Despesa",
        "title": "Inspecionar despesa aprovada",
        "description": "Consulta os dados necessários da despesa aprovada antes de registrar o pagamento."
      },
      {
        "stepId": "registrarPagamento",
        "kind": "act",
        "entity": "Despesa",
        "effect": "transition",
        "transitionRef": "registrarPagamento",
        "title": "Registrar pagamento",
        "description": "Registra a data em que a despesa foi paga."
      }
    ],
    "outcome": {
      "statement": "O pagamento da despesa aprovada é registrado com sua data.",
      "evidence": [
        "A despesa possui uma data de pagamento registrada.",
        "A despesa deixa de constar como pendente de pagamento."
      ]
    }
  },
  "businessHash": "sha256:e6046748d79f4edc13b6c5f8b5e58113632971f66524e64a20683c290469a03a"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarPagamentoDeDespesaJourneyType = typeof registrarPagamentoDeDespesaJourney;

export default registrarPagamentoDeDespesaJourney;
