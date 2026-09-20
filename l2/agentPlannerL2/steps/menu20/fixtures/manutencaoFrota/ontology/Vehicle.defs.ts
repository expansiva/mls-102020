/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/Vehicle.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityVehicle = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "manutencaoFrota",
  "entityId": "Vehicle",
  "title": "Veículo",
  "description": "Veículo da frota, mantido como ativo veicular compartilhado da organização, com dados de operação específicos deste módulo.",
  "displayField": "details.identification.name",
  "relationships": {
    "vehicleAssignments": {
      "relationshipId": "vehicleAssignmentVehicle",
      "to": "VehicleAssignment",
      "via": "VehicleAssignment.vehicleId",
      "cardinality": "1:N",
      "title": "Atribuições do veículo",
      "description": "Atribuições que vinculam este veículo a motoristas da frota.",
      "mode": "fk",
      "direction": "to",
      "required": "Nunca é obrigatório para a existência do veículo."
    },
    "assignedDrivers": {
      "relationshipId": "vehicleAssignedDrivers",
      "to": "Driver",
      "via": "VehicleAssignment",
      "cardinality": "N:N",
      "title": "Motoristas atribuídos",
      "description": "Motoristas que podem conduzir e consultar este veículo, obtidos pelas atribuições de veículo.",
      "mode": "throughTable",
      "path": "VehicleAssignment.vehicleId -> VehicleAssignment.driverId",
      "derived": true,
      "required": "Nunca é obrigatório para a existência do veículo."
    },
    "fuelings": {
      "relationshipId": "fuelingVehicle",
      "to": "Fueling",
      "via": "Fueling.vehicleId",
      "cardinality": "1:N",
      "title": "Abastecimentos",
      "description": "Abastecimentos registrados para este veículo.",
      "mode": "fk",
      "direction": "to",
      "required": "Nunca é obrigatório para a existência do veículo."
    },
    "maintenancePlans": {
      "relationshipId": "maintenancePlanVehicle",
      "to": "MaintenancePlan",
      "via": "MaintenancePlan.vehicleId",
      "cardinality": "1:N",
      "title": "Planos preventivos",
      "description": "Planos de manutenção preventiva definidos para este veículo.",
      "mode": "fk",
      "direction": "to",
      "required": "Nunca é obrigatório para a existência do veículo."
    },
    "maintenanceOrders": {
      "relationshipId": "maintenanceOrderVehicle",
      "to": "MaintenanceOrder",
      "via": "MaintenanceOrder.vehicleId",
      "cardinality": "1:N",
      "title": "Ordens de manutenção",
      "description": "Ordens de manutenção abertas para este veículo.",
      "mode": "fk",
      "direction": "to",
      "required": "Nunca é obrigatório para a existência do veículo."
    }
  },
  "capabilities": {
    "read.byId": "Lê um veículo pelo identificador mestre, por consulta direta ao MDM, para motorista e gestor visualizarem um veículo já selecionado.",
    "locate.byName": "Localiza veículos pelo nome de identificação indexado, para motorista encontrar somente veículos atribuídos e gestor localizar veículos da frota.",
    "locate.byTag": "Lista os registros com a etiqueta de papel manutencaoFrota.Vehicle no índice de tags do MDM, para o módulo compor a relação de veículos da frota.",
    "register.createOrAttach": "Cria ou anexa o papel de veículo da frota a um registro mestre pelo fluxo create-or-attach do MDM, para o gestor cadastrar veículos.",
    "edit.platformFields": "Atualiza placa, modelo, ano e demais dados veiculares da plataforma no documento mestre, para o gestor manter o cadastro do veículo.",
    "edit.moduleNamespace": "Atualiza a quilometragem operacional no namespace manutencaoFrota do documento mestre, para o módulo manter a quilometragem atualizada após os registros de abastecimento.",
    "inactivate": "Inativa ou reativa o registro mestre pela situação do MDM, para o gestor retirar temporariamente um veículo de uso sem apagar seu histórico.",
    "statusHistory.read": "Exibe o histórico de mudanças de situação do registro mestre, pela consulta de histórico de status, para o gestor acompanhar a disponibilidade cadastral do veículo.",
    "audit": "Consulta quem alterou os dados do veículo e quando no log de auditoria do MDM, para o gestor rastrear alterações cadastrais."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "preventiveMaintenanceMileageAlert"
  ],
  "writer": "crud",
  "kind": "role",
  "subtype": "AssetVehicle",
  "roleTag": "manutencaoFrota.Vehicle",
  "source": "/_102034_/l4/ontology/mdm.defs.ts",
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "indexed": true,
        "derived": true,
        "description": "mdmId; stable through promotion and merge."
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true,
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Documento mestre do veículo, com dados de identificação, dados veiculares da plataforma e informações operacionais deste módulo.",
        "fields": {
          "identification": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "subtype": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "AssetVehicle",
                    "title": "Veículo",
                    "description": "Ativo veicular."
                  }
                ],
                "description": "Indica que este registro mestre é um veículo da frota.",
                "title": "Subtipo",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 0,
                "description": "Nome pelo qual o veículo é localizado e reconhecido na frota.",
                "title": "Nome de identificação",
                "min": 0,
                "max": 0
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Ativo",
                    "description": "Registro disponível para uso."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo",
                    "description": "Registro fora de uso."
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado",
                    "description": "Registro incorporado a outro registro mestre."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Registro bloqueado pela organização."
                  }
                ],
                "title": "Situação do registro",
                "description": "Situação do veículo no cadastro mestre da organização.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 0,
                "default": "US",
                "description": "Código do país aplicável ao registro mestre do veículo.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação e situação do registro mestre do veículo."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados comuns do registro mestre, mantidos pela plataforma."
          },
          "assetVehicle": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "plate": {
                "type": "string",
                "title": "Placa",
                "description": "Placa de identificação do veículo da frota.",
                "required": true,
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "model": {
                "type": "string",
                "title": "Modelo",
                "description": "Modelo informado para identificação do veículo.",
                "required": true,
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "year": {
                "type": "integer",
                "title": "Ano",
                "description": "Ano do veículo da frota.",
                "required": true,
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Características do ativo veicular usadas para identificar o veículo da frota."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização para uso compartilhado entre módulos."
          },
          "manutencaoFrota": {
            "type": "object",
            "owner": "module",
            "fields": {
              "currentMileageKm": {
                "type": "integer",
                "required": true,
                "of": "Address",
                "title": "Quilometragem atual",
                "description": "Última quilometragem conhecida no painel do veículo, em quilômetros.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "preventiveMaintenanceMileageOverdue": {
                "type": "boolean",
                "derived": true,
                "title": "Preventiva por quilometragem vencida",
                "description": "Há plano preventivo ativo por quilometragem e a quilometragem atual do veículo passou da quilometragem prevista para a próxima manutenção."
              }
            },
            "description": "Informações operacionais do veículo mantidas exclusivamente pelo módulo de manutenção de frota."
          }
        }
      }
    }
  }
} as const satisfies Ns5OntologyEntityV3;

export type ManutencaoFrotaEntityVehicleType = typeof manutencaoFrotaEntityVehicle;

export default manutencaoFrotaEntityVehicle;
