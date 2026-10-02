/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/MaintenancePlan.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityMaintenancePlan = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "manutencaoFrota",
  "entityId": "MaintenancePlan",
  "title": "Plano de manutenção preventiva",
  "description": "Definição da periodicidade preventiva de manutenção de um veículo por quilometragem, meses ou ambos.",
  "displayField": "details.name",
  "relationships": {
    "vehicle": {
      "relationshipId": "maintenancePlanVehicle",
      "to": "Vehicle",
      "via": "MaintenancePlan.vehicleId",
      "cardinality": "N:1",
      "title": "Veículo do plano",
      "description": "Veículo da frota para o qual a periodicidade preventiva foi definida.",
      "mode": "fk",
      "required": "Sempre"
    },
    "maintenanceOrders": {
      "relationshipId": "maintenanceOrderPlan",
      "to": "MaintenanceOrder",
      "via": "MaintenanceOrder.maintenancePlanId",
      "cardinality": "1:N",
      "title": "Ordens de manutenção do plano",
      "description": "Ordens de manutenção preventiva que foram abertas a partir deste plano.",
      "mode": "fk",
      "direction": "to",
      "required": "Nunca"
    }
  },
  "capabilities": {
    "read.byId": "Lê um plano preventivo pelo identificador da linha · consulta o repositório pelo id · gestor de frota ao abrir os detalhes do plano.",
    "locate.byColumn": "Lista planos preventivos pelo veículo, com ordenação e paginação · filtra pela coluna indexada do veículo · gestor de frota ao consultar os planos da frota.",
    "count": "Conta os planos preventivos que correspondem ao veículo informado · aplica o mesmo filtro da listagem · gestor de frota no resumo da frota.",
    "listByForeignKey": "Lista os planos preventivos vinculados a um veículo · consulta as linhas pela chave estrangeira do veículo · gestor de frota na tela do veículo.",
    "create": "Cadastra um plano de manutenção preventiva para um veículo · grava o veículo e as periodicidades informadas · gestor de frota ao definir a preventiva.",
    "update": "Atualiza a periodicidade ou as referências de um plano preventivo · altera parcialmente a linha do plano · gestor de frota ao revisar o planejamento.",
    "read.mdmRecord": "Lê o registro mestre do veículo vinculado ao plano · hidrata o veículo pela chave estrangeira no MDM · gestor de frota ao conferir dados e quilometragem atual.",
    "manutencaoFrota.alertarPreventivaVencida": "Sinaliza planos cuja preventiva está vencida · calcula a condição a partir dos intervalos do plano, de suas referências e da quilometragem atual do veículo · gestor de frota ao tratar alertas preventivos."
  },
  "rules": [
    "maintenanceIntervalRequired",
    "preventiveMileageAlert"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "manutencaoFrota_maintenanceplan",
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
      "vehicleId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "Vehicle"
        ],
        "title": "Veículo",
        "description": "Veículo da frota ao qual este plano de manutenção preventiva se aplica.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "ContactSummary",
        "title": "Dados do plano preventivo",
        "description": "Periodicidade e referências usadas para acompanhar a próxima manutenção preventiva do veículo.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "name": {
            "type": "string",
            "required": true,
            "of": "ContactSummary",
            "title": "Nome do plano",
            "description": "Identificação do plano preventivo para uso do gestor de frota.",
            "maxLength": 120,
            "min": 0,
            "max": 0
          },
          "intervalKilometers": {
            "type": "integer",
            "of": "ContactSummary",
            "title": "Intervalo em quilômetros",
            "description": "Quantidade de quilômetros entre manutenções preventivas, quando o plano é controlado por quilometragem.",
            "maxLength": 0,
            "min": 1,
            "max": 0
          },
          "intervalMonths": {
            "type": "integer",
            "of": "ContactSummary",
            "title": "Intervalo em meses",
            "description": "Quantidade de meses entre manutenções preventivas, quando o plano é controlado por tempo.",
            "maxLength": 0,
            "min": 1,
            "max": 0
          },
          "referenceMileage": {
            "type": "integer",
            "required": true,
            "of": "ContactSummary",
            "title": "Quilometragem de referência",
            "description": "Quilometragem do veículo que inicia a contagem do próximo ciclo preventivo.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "referenceDate": {
            "type": "date",
            "required": true,
            "of": "ContactSummary",
            "title": "Data de referência",
            "description": "Data que inicia a contagem do próximo ciclo preventivo por tempo.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "nextPreventiveMileage": {
            "type": "integer",
            "derived": true,
            "title": "Próxima quilometragem preventiva",
            "description": "Quilometragem prevista para a próxima manutenção, calculada a partir da quilometragem de referência e do intervalo em quilômetros quando o plano usa quilometragem."
          },
          "nextPreventiveDate": {
            "type": "date",
            "derived": true,
            "title": "Próxima data preventiva",
            "description": "Data prevista para a próxima manutenção, calculada a partir da data de referência e do intervalo em meses quando o plano usa tempo."
          },
          "preventiveOverdue": {
            "type": "boolean",
            "derived": true,
            "title": "Preventiva vencida",
            "description": "O veículo atingiu ou ultrapassou a próxima quilometragem preventiva, ou alcançou a próxima data preventiva, conforme os intervalos definidos neste plano e a quilometragem atual do veículo."
          }
        }
      }
    }
  }
} as const satisfies Ns5OntologyEntityV3;

export type ManutencaoFrotaEntityMaintenancePlanType = typeof manutencaoFrotaEntityMaintenancePlan;

export default manutencaoFrotaEntityMaintenancePlan;
