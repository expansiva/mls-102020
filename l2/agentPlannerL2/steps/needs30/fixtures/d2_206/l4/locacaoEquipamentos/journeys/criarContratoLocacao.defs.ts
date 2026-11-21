/// <mls fileReference="_102047_/l4/locacaoEquipamentos/journeys/criarContratoLocacao.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const criarContratoLocacaoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "criarContratoLocacao",
  "business": {
    "actorRef": "atendente",
    "title": "Criar contrato de locação",
    "goal": "Registrar a locação de um ou mais equipamentos para um cliente em um período definido.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarCliente",
        "kind": "locate",
        "entity": "Cliente",
        "title": "Localizar cliente",
        "description": "O atendente busca o cliente pelo nome ou documento ou o cadastra se ainda não existir."
      },
      {
        "stepId": "informarPeriodo",
        "kind": "act",
        "entity": "ContratoLocacao",
        "effect": "create",
        "title": "Abrir contrato com período",
        "description": "O atendente cria o contrato para o cliente informando a data de retirada e a data prevista de devolução."
      },
      {
        "stepId": "consultarEquipamentos",
        "kind": "locate",
        "entity": "Equipamento",
        "title": "Buscar equipamentos disponíveis",
        "description": "O atendente busca equipamentos pelo código ou descrição e confere a situação e o valor da diária."
      },
      {
        "stepId": "adicionarItens",
        "kind": "act",
        "entity": "ItemContrato",
        "effect": "create",
        "title": "Adicionar equipamentos ao contrato",
        "description": "O atendente inclui um ou mais equipamentos no contrato; o sistema recusa equipamento já presente em outro contrato com período sobreposto."
      },
      {
        "stepId": "confirmarContrato",
        "kind": "act",
        "entity": "ContratoLocacao",
        "effect": "transition",
        "transitionRef": "ativarContrato",
        "title": "Confirmar locação",
        "description": "O atendente confirma o contrato e os equipamentos passam a constar como locados."
      }
    ],
    "outcome": {
      "statement": "O contrato de locação fica ativo para o cliente com os equipamentos e o período informados, sem sobreposição com outros contratos.",
      "evidence": [
        "Contrato com situação ativa vinculado ao cliente",
        "Itens do contrato listando cada equipamento",
        "Equipamentos exibidos como locados no período"
      ]
    }
  },
  "businessHash": "sha256:2f536c7bcb39e51dbd00ba2a39148cf023a6f48d46e81c7c658875383d68b094"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CriarContratoLocacaoJourneyType = typeof criarContratoLocacaoJourney;

export default criarContratoLocacaoJourney;
