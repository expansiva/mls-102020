/// <mls fileReference="_102047_/l4/locacaoEquipamentos/journeys/registrarDevolucao.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const registrarDevolucaoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarDevolucao",
  "business": {
    "actorRef": "atendente",
    "title": "Registrar devolução",
    "goal": "Encerrar o contrato registrando a data real de devolução e a multa por atraso, se houver.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarContrato",
        "kind": "locate",
        "entity": "ContratoLocacao",
        "title": "Localizar contrato ativo",
        "description": "O atendente busca o contrato ativo pelo cliente ou pelo código do equipamento."
      },
      {
        "stepId": "conferirContrato",
        "kind": "inspect",
        "entity": "ContratoLocacao",
        "title": "Conferir contrato",
        "description": "O atendente confere os equipamentos, a data de retirada e a data prevista de devolução."
      },
      {
        "stepId": "registrarDataReal",
        "kind": "act",
        "entity": "ContratoLocacao",
        "effect": "transition",
        "transitionRef": "registrarDevolucao",
        "title": "Registrar data real",
        "description": "O atendente informa a data real de devolução; se houve atraso, o sistema calcula a multa (diária × dias de atraso × 1,5) e os equipamentos voltam a ficar disponíveis."
      },
      {
        "stepId": "conferirMulta",
        "kind": "inspect",
        "entity": "ContratoLocacao",
        "title": "Conferir multa calculada",
        "description": "O atendente visualiza os dias de atraso e o valor da multa para informar ao cliente."
      }
    ],
    "outcome": {
      "statement": "O contrato fica encerrado com a data real de devolução e a multa calculada quando houve atraso.",
      "evidence": [
        "Contrato com situação devolvido e data real registrada",
        "Valor da multa exibido quando a devolução foi após a data prevista",
        "Equipamentos exibidos como disponíveis"
      ]
    }
  },
  "businessHash": "sha256:f3a8b3816f66c96f8fec4bcbece189f86cb7ad2d937bc11454ab936402aa7ff2"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RegistrarDevolucaoJourneyType = typeof registrarDevolucaoJourney;

export default registrarDevolucaoJourney;
