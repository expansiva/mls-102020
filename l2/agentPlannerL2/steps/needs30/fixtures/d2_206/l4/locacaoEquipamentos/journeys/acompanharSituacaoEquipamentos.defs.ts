/// <mls fileReference="_102047_/l4/locacaoEquipamentos/journeys/acompanharSituacaoEquipamentos.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const acompanharSituacaoEquipamentosJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "acompanharSituacaoEquipamentos",
  "business": {
    "actorRef": "gerente",
    "title": "Acompanhar situação dos equipamentos",
    "goal": "Ver quais equipamentos estão disponíveis, locados ou em manutenção.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "listarEquipamentos",
        "kind": "locate",
        "entity": "Equipamento",
        "title": "Listar equipamentos por situação",
        "description": "O gerente filtra os equipamentos pela situação: disponível, locado ou em manutenção."
      },
      {
        "stepId": "verEquipamento",
        "kind": "inspect",
        "entity": "Equipamento",
        "title": "Ver detalhes do equipamento",
        "description": "O gerente consulta código, descrição, valor da diária, situação e o contrato em que o equipamento está locado."
      }
    ],
    "outcome": {
      "statement": "O gerente conhece a situação atual de cada equipamento da locadora.",
      "evidence": [
        "Lista de equipamentos agrupada ou filtrada por situação",
        "Totais de equipamentos disponíveis, locados e em manutenção"
      ]
    }
  },
  "businessHash": "sha256:b10ab0216be78e39ce7448cfabaf73acffdc92c71851fbda5955e6fbebb351c6"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AcompanharSituacaoEquipamentosJourneyType = typeof acompanharSituacaoEquipamentosJourney;

export default acompanharSituacaoEquipamentosJourney;
