/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/cadastrarPlanoPreventivo.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const cadastrarPlanoPreventivoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarPlanoPreventivo",
  "business": {
    "actorRef": "gestor",
    "title": "Cadastrar plano de manutenção preventiva",
    "goal": "Definir a periodicidade de manutenção preventiva de um veículo da frota.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarVeiculoDaFrota",
        "kind": "locate",
        "entity": "Vehicle",
        "title": "x",
        "description": "Localiza o veículo da frota que receberá o plano preventivo."
      },
      {
        "stepId": "inspecionarVeiculoDaFrota",
        "kind": "inspect",
        "entity": "Vehicle",
        "title": "x",
        "description": "Confere os dados e a quilometragem atual do veículo para definir a manutenção preventiva."
      },
      {
        "stepId": "cadastrarPlano",
        "kind": "act",
        "entity": "MaintenancePlan",
        "effect": "create",
        "title": "x",
        "description": "Cadastra para o veículo o intervalo de manutenção por quilometragem, por meses, ou ambos."
      }
    ],
    "outcome": {
      "statement": "Um plano de manutenção preventiva é cadastrado para o veículo.",
      "evidence": [
        "Há um plano vinculado ao veículo com o intervalo em quilômetros e/ou meses.",
        "A próxima manutenção preventiva pode ser acompanhada a partir do plano."
      ]
    }
  },
  "businessHash": "sha256:8309c09a5769090e58acea54eb659551fba44b76972d71cb9c8d77ae5f118630"
} as const satisfies Ns5JourneyArtifact;

export type CadastrarPlanoPreventivoJourneyType = typeof cadastrarPlanoPreventivoJourney;

export default cadastrarPlanoPreventivoJourney;
