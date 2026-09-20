/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/MaintenanceOrder.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityMaintenanceOrder = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "manutencaoFrota",
  "entityId": "MaintenanceOrder",
  "title": "Ordem de manutenção",
  "description": "Ordem aberta para registrar e acompanhar uma manutenção preventiva vencida ou o reparo de um defeito do veículo.",
  "displayField": "details.description",
  "relationships": {
    "vehicle": {
      "relationshipId": "maintenanceOrderVehicle",
      "to": "Vehicle",
      "via": "MaintenanceOrder.vehicleId",
      "cardinality": "N:1",
      "title": "Veículo da ordem",
      "description": "Cada ordem de manutenção pertence a um único veículo da frota.",
      "mode": "fk",
      "required": "sempre"
    },
    "maintenancePlan": {
      "relationshipId": "maintenanceOrderPlan",
      "to": "MaintenancePlan",
      "via": "MaintenanceOrder.maintenancePlanId",
      "cardinality": "N:1",
      "title": "Plano preventivo",
      "description": "A ordem pode decorrer de um plano de manutenção preventiva.",
      "mode": "fk",
      "required": "quando o tipo de manutenção for preventiva"
    },
    "workshop": {
      "relationshipId": "maintenanceOrderWorkshop",
      "to": "Workshop",
      "via": "MaintenanceOrder.workshopId",
      "cardinality": "N:1",
      "title": "Oficina responsável",
      "description": "Cada ordem informa a oficina responsável pela execução do serviço.",
      "mode": "fk",
      "required": "sempre"
    }
  },
  "capabilities": {
    "read.byId": "Lê uma ordem de manutenção pelo identificador da linha para o gestor consultar os dados já selecionados.",
    "locate.byColumn": "Lista ordens de manutenção por veículo, plano, oficina ou data de entrada, com paginação, para o gestor localizar e acompanhar serviços.",
    "count": "Conta as ordens de manutenção conforme os filtros indexados para o gestor visualizar totais da consulta.",
    "listByForeignKey": "Lista as ordens vinculadas a um veículo, plano preventivo ou oficina para compor as respectivas consultas.",
    "create": "Cria uma ordem de manutenção vinculada ao veículo e à oficina para o gestor registrar uma preventiva vencida ou um defeito.",
    "update": "Atualiza os dados da ordem, incluindo custo final e data de saída, para o gestor registrar a conclusão do serviço.",
    "read.mdmRecord": "Lê os registros mestres do veículo e da oficina apontados pela ordem para o gestor ver seus dados sem copiá-los na transação."
  },
  "rules": [
    "preventiveOrderRequiresPlan",
    "repairOrderDoesNotRequirePlan",
    "completionRequiresExitDateAndFinalCost"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "manutencaoFrota_maintenanceorder",
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
        "of": "Address",
        "to": [
          "Vehicle"
        ],
        "title": "Veículo",
        "description": "Veículo da frota que receberá a manutenção registrada nesta ordem.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "maintenancePlanId": {
        "type": "record",
        "indexed": true,
        "of": "Address",
        "to": [
          "MaintenancePlan"
        ],
        "title": "Plano de manutenção",
        "description": "Plano preventivo que originou a ordem, quando a manutenção decorrer de uma preventiva.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "workshopId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "Workshop"
        ],
        "title": "Oficina",
        "description": "Oficina responsável pelo serviço descrito na ordem de manutenção.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "entryDate": {
        "type": "date",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Data de entrada",
        "description": "Data em que o veículo entrou na oficina para o serviço desta ordem.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Dados da ordem",
        "description": "Informações da manutenção que não são usadas como chave de consulta da ordem.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "maintenanceType": {
            "type": "enum",
            "required": true,
            "of": "Address",
            "values": [
              {
                "value": "preventive",
                "title": "Preventiva",
                "description": "Manutenção aberta em razão de um plano preventivo."
              },
              {
                "value": "repair",
                "title": "Reparo de defeito",
                "description": "Manutenção aberta para corrigir um defeito identificado no veículo."
              }
            ],
            "title": "Tipo de manutenção",
            "description": "Indica se a ordem foi aberta para uma manutenção preventiva ou para reparar um defeito.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "description": {
            "type": "text",
            "required": true,
            "of": "Address",
            "title": "Descrição do serviço",
            "description": "Descrição da manutenção preventiva necessária ou do defeito que será reparado.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "estimatedCost": {
            "type": "money",
            "of": "Address",
            "title": "Custo previsto",
            "description": "Custo previsto para o serviço, quando essa estimativa estiver disponível ao abrir a ordem.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "finalCost": {
            "type": "money",
            "of": "Address",
            "title": "Custo final",
            "description": "Custo efetivo informado quando o serviço de manutenção é concluído.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "exitDate": {
            "type": "date",
            "of": "Address",
            "title": "Data de saída",
            "description": "Data em que o veículo saiu da oficina após a conclusão do serviço.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "completed": {
            "type": "boolean",
            "derived": true,
            "title": "Manutenção concluída",
            "description": "A ordem está concluída quando a data de saída do veículo da oficina foi informada."
          }
        }
      }
    }
  }
} as const satisfies Ns5OntologyEntityV3;

export type ManutencaoFrotaEntityMaintenanceOrderType = typeof manutencaoFrotaEntityMaintenanceOrder;

export default manutencaoFrotaEntityMaintenanceOrder;
