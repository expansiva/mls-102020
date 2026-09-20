/// <mls fileReference="_102047_/l4/locacaoEquipamentos/ontology/ManutencaoEquipamento.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosEntityManutencaoEquipamento = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "locacaoEquipamentos",
  "entityId": "ManutencaoEquipamento",
  "title": "Manutenção de equipamento",
  "description": "Período de indisponibilidade de um equipamento para manutenção, usado no cálculo de sua situação.",
  "displayField": "id",
  "relationships": {
    "equipamento": {
      "relationshipId": "equipamentoManutencoes",
      "to": "Equipamento",
      "via": "ManutencaoEquipamento.equipamentoId",
      "cardinality": "N:1",
      "title": "Equipamento em manutenção",
      "description": "Cada período de manutenção pertence a um único equipamento.",
      "mode": "fk",
      "direction": "to",
      "required": "Sempre, para registrar o período de indisponibilidade.",
      "role": "período de manutenção do equipamento"
    }
  },
  "capabilities": {
    "read.byId": "Lê um período de manutenção pelo identificador da linha, para o gerente consultar seus dados.",
    "locate.byColumn": "Lista períodos de manutenção por equipamento e por datas indexadas, com ordenação e paginação, para o gerente acompanhar indisponibilidades.",
    "count": "Conta os períodos de manutenção conforme os filtros aplicados, para o gerente visualizar o total da consulta.",
    "listByForeignKey": "Lista os períodos de manutenção vinculados a um ou mais equipamentos, para exibir o histórico de indisponibilidades de cada equipamento.",
    "create": "Registra um novo período de indisponibilidade para manutenção de um equipamento, usado pelo gerente para manter sua situação atualizada.",
    "update": "Altera as datas de um período de manutenção já registrado, usado pelo gerente enquanto a manutenção é planejada ou reprogramada.",
    "delete": "Remove um período de manutenção registrado indevidamente, usado pelo gerente antes de ele produzir uma indisponibilidade válida."
  },
  "rules": [
    "maintenanceDatesValid",
    "maintenanceDoesNotOverlapRental"
  ],
  "writer": "crud",
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "locacaoEquipamentos_manutencaoequipamento",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "equipamentoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "Equipamento"
        ],
        "title": "Equipamento",
        "description": "Equipamento que ficará indisponível durante este período de manutenção.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "dataInicio": {
        "type": "date",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "title": "Data de início",
        "description": "Data em que o equipamento passa a ficar indisponível para manutenção.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "dataFim": {
        "type": "date",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "title": "Data de término",
        "description": "Data em que termina o período de indisponibilidade do equipamento para manutenção.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "ContactSummary",
        "title": "Detalhes da manutenção",
        "description": "Informações próprias do período de manutenção que não exigem filtro, ordenação ou busca.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      }
    }
  }
} as const satisfies Ns5OntologyEntityV3;

export type LocacaoEquipamentosEntityManutencaoEquipamentoType = typeof locacaoEquipamentosEntityManutencaoEquipamento;

export default locacaoEquipamentosEntityManutencaoEquipamento;
