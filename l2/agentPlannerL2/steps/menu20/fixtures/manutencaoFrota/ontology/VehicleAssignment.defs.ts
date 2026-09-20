/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/VehicleAssignment.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityVehicleAssignment = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "manutencaoFrota",
  "entityId": "VehicleAssignment",
  "title": "Atribuição de veículo",
  "description": "Registro operacional que vincula um veículo da frota ao motorista autorizado a conduzi-lo.",
  "displayField": "details.assignmentLabel",
  "relationships": {
    "vehicle": {
      "relationshipId": "vehicleAssignmentVehicle",
      "to": "Vehicle",
      "via": "VehicleAssignment.vehicleId",
      "cardinality": "N:1",
      "title": "Veículo atribuído",
      "description": "Cada atribuição vincula obrigatoriamente um veículo da frota.",
      "mode": "fk",
      "required": "sempre",
      "role": "veículo da frota"
    },
    "driver": {
      "relationshipId": "vehicleAssignmentDriver",
      "to": "Driver",
      "via": "VehicleAssignment.driverId",
      "cardinality": "N:1",
      "title": "Motorista autorizado",
      "description": "Cada atribuição vincula obrigatoriamente o motorista autorizado a conduzir o veículo.",
      "mode": "fk",
      "required": "sempre",
      "role": "motorista autorizado"
    }
  },
  "capabilities": {
    "read.byId": "Lê uma atribuição pelo identificador da linha no repositório, para o gestor de frota e para o motorista dentro do seu escopo de veículos atribuídos.",
    "locate.byColumn": "Lista atribuições filtradas pelos índices de veículo ou motorista, com paginação, para o gestor de frota e para as consultas do motorista limitadas às suas atribuições.",
    "count": "Conta atribuições conforme os filtros de veículo ou motorista, para o gestor de frota acompanhar os vínculos cadastrados.",
    "listByForeignKey": "Lista as atribuições que apontam para um veículo ou motorista pelos respectivos identificadores, para telas de veículos, motoristas e controle de acesso.",
    "create": "Cria a vinculação operacional entre um veículo e um motorista autorizado, gravando a linha de atribuição, para o gestor de frota.",
    "update": "Atualiza a identificação operacional de uma atribuição existente pelo identificador da linha, para o gestor de frota.",
    "delete": "Remove uma atribuição operacional cadastrada pelo identificador da linha, para o gestor de frota quando o vínculo deixar de valer.",
    "uniqueKey": "Recusa uma segunda atribuição com a mesma combinação de veículo e motorista pelo índice único, para manter um único vínculo operacional idêntico.",
    "read.mdmRecord": "Lê os registros mestres do veículo e do motorista apontados pela atribuição, pelos seus identificadores MDM, para exibir os dados nas telas da frota."
  },
  "rules": [],
  "writer": "crud",
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "manutencaoFrota_vehicleassignment",
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
        "description": "Veículo da frota vinculado a esta atribuição operacional.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "driverId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "Driver"
        ],
        "title": "Motorista",
        "description": "Motorista autorizado a conduzir o veículo nesta atribuição.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Detalhes da atribuição",
        "description": "Informações operacionais da vinculação entre o veículo e o motorista.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "assignmentLabel": {
            "type": "string",
            "required": true,
            "of": "Address",
            "title": "Identificação da atribuição",
            "description": "Identificação operacional da atribuição para apresentação nas telas da frota.",
            "maxLength": 120,
            "min": 0,
            "max": 0
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "vehicleId",
      "driverId"
    ]
  ]
} as const satisfies Ns5OntologyEntityV3;

export type ManutencaoFrotaEntityVehicleAssignmentType = typeof manutencaoFrotaEntityVehicleAssignment;

export default manutencaoFrotaEntityVehicleAssignment;
