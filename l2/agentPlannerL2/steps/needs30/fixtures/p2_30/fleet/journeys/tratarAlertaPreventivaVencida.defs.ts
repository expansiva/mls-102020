/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/tratarAlertaPreventivaVencida.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const tratarAlertaPreventivaVencidaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "tratarAlertaPreventivaVencida",
  "business": {
    "actorRef": "gestor",
    "title": "Tratar alerta de manutenção preventiva vencida",
    "goal": "Abrir uma ordem de manutenção para um veículo que ultrapassou a quilometragem prevista no plano preventivo.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "inspecionarAlertaPreventivo",
        "kind": "inspect",
        "entity": "MaintenancePlan",
        "title": "x",
        "description": "Consulta o plano e a quilometragem do veículo indicado no alerta de preventiva vencida."
      },
      {
        "stepId": "abrirOrdemPreventiva",
        "kind": "act",
        "entity": "MaintenanceOrder",
        "effect": "create",
        "title": "x",
        "description": "Abre uma ordem de manutenção preventiva para o veículo indicado, informando oficina, descrição, custo previsto quando disponível e data de entrada."
      }
    ],
    "outcome": {
      "statement": "A manutenção preventiva vencida é encaminhada por uma ordem de manutenção.",
      "evidence": [
        "O alerta identifica que o veículo ultrapassou a quilometragem prevista.",
        "Há uma ordem de manutenção preventiva vinculada ao veículo e ao plano vencido."
      ]
    }
  },
  "businessHash": "sha256:24d3a0105c839d734d5d614533495c8e6624d46e79105094fbc388e0b402ac58"
} as const satisfies Ns5JourneyArtifact;

export type TratarAlertaPreventivaVencidaJourneyType = typeof tratarAlertaPreventivaVencidaJourney;

export default tratarAlertaPreventivaVencidaJourney;
