/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/atualizarOrdemManutencao.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const atualizarOrdemManutencaoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "atualizarOrdemManutencao",
  "business": {
    "actorRef": "gestor",
    "title": "Atualizar ordem de manutenção",
    "goal": "Registrar os dados finais de um serviço de manutenção executado.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarOrdemManutencao",
        "kind": "locate",
        "entity": "MaintenanceOrder",
        "title": "x",
        "description": "Localiza a ordem de manutenção em andamento quando ela não estiver previamente em contexto."
      },
      {
        "stepId": "inspecionarOrdemManutencao",
        "kind": "inspect",
        "entity": "MaintenanceOrder",
        "title": "x",
        "description": "Confere a oficina, a descrição do serviço, os custos e as datas já registradas na ordem."
      },
      {
        "stepId": "atualizarDadosDaOrdem",
        "kind": "act",
        "entity": "MaintenanceOrder",
        "effect": "update",
        "title": "x",
        "description": "Atualiza o custo e a data de saída da ordem de manutenção quando o serviço é concluído."
      }
    ],
    "outcome": {
      "statement": "Os dados de execução da ordem de manutenção ficam registrados.",
      "evidence": [
        "A ordem contém o custo do serviço e a data de saída quando informados.",
        "A ordem permanece vinculada ao veículo e à oficina responsável."
      ]
    }
  },
  "businessHash": "sha256:91aaa9e292bc67061dc36f20a0f7bd2b4b37b41373f53b5e59795729ef64a996"
} as const satisfies Ns5JourneyArtifact;

export type AtualizarOrdemManutencaoJourneyType = typeof atualizarOrdemManutencaoJourney;

export default atualizarOrdemManutencaoJourney;
