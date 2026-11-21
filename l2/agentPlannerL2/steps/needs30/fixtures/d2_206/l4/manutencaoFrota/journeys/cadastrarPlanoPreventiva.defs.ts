/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/cadastrarPlanoPreventiva.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const cadastrarPlanoPreventivaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarPlanoPreventiva",
  "business": {
    "actorRef": "gestor",
    "title": "Cadastrar plano de preventiva",
    "goal": "Definir o plano de manutenção preventiva de um veículo, a cada N km ou a cada N meses.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarVeiculoPlano",
        "kind": "locate",
        "entity": "Veiculo",
        "title": "Localizar veículo",
        "description": "O gestor localiza o veículo pela placa ou modelo."
      },
      {
        "stepId": "verVeiculoPlano",
        "kind": "inspect",
        "entity": "Veiculo",
        "title": "Ver veículo e planos",
        "description": "O gestor confere a quilometragem atual e os planos já existentes do veículo."
      },
      {
        "stepId": "criarPlano",
        "kind": "act",
        "entity": "PlanoManutencao",
        "effect": "create",
        "title": "Criar plano preventivo",
        "description": "O gestor descreve a preventiva e define o intervalo em quilômetros ou em meses."
      }
    ],
    "outcome": {
      "statement": "O veículo tem um plano preventivo ativo com o próximo vencimento previsto.",
      "evidence": [
        "O plano aparece no veículo com seu intervalo em km ou meses",
        "O km ou a data prevista da próxima preventiva é exibido"
      ]
    }
  },
  "businessHash": "sha256:444b8589627033e7ec6bb935da217c5c823fb417deba7b71bee14f0c25a40097"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CadastrarPlanoPreventivaJourneyType = typeof cadastrarPlanoPreventivaJourney;

export default cadastrarPlanoPreventivaJourney;
