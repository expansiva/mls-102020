/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/Fueling.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityFueling = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "manutencaoFrota",
  "entityId": "Fueling",
  "title": "Abastecimento",
  "description": "Registro de abastecimento realizado por um motorista em um veículo atribuído.",
  "displayField": "details.fuelingDate",
  "relationships": {
    "veiculo": {
      "relationshipId": "fuelingVehicle",
      "to": "Vehicle",
      "via": "Fueling.vehicleId",
      "cardinality": "N:1",
      "title": "Veículo abastecido",
      "description": "Todo abastecimento é registrado para um único veículo atribuído.",
      "mode": "fk",
      "required": "Sempre"
    },
    "motorista": {
      "relationshipId": "fuelingDriver",
      "to": "Driver",
      "via": "Fueling.driverId",
      "cardinality": "N:1",
      "title": "Motorista responsável",
      "description": "Todo abastecimento identifica o motorista que o registrou.",
      "mode": "fk",
      "required": "Sempre"
    }
  },
  "capabilities": {
    "read.byId": "Consulta um abastecimento pelo identificador da linha para exibir seus dados ao motorista ou ao gestor de frota.",
    "locate.byColumn": "Lista abastecimentos por veículo ou motorista, usando as colunas indexadas e paginação, para consultas da frota.",
    "count": "Conta os abastecimentos que correspondem aos filtros de veículo ou motorista para os totais das listas.",
    "listByForeignKey": "Lista os abastecimentos vinculados a um veículo ou a um motorista para o histórico consultado por motoristas e gestores.",
    "create": "Registra um novo abastecimento com data, litros, valor e quilometragem do painel para o veículo atribuído ao motorista.",
    "update": "Corrige os dados de um abastecimento já registrado quando necessário, preservando o veículo e o motorista responsáveis.",
    "transaction": "Grava o abastecimento e atualiza a quilometragem atual do veículo na mesma operação para manter a frota consistente.",
    "read.mdmRecord": "Lê os registros mestres do veículo e do motorista apontados pelo abastecimento para mostrar seus dados nas consultas."
  },
  "rules": [
    "motoristaAbasteceVeiculoAtribuido",
    "quilometragemAbastecimentoNaoMenorQueAtual"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "manutencaoFrota_fueling",
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
        "description": "Veículo da frota abastecido.",
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
        "description": "Motorista que registrou o abastecimento.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Dados do abastecimento",
        "description": "Informações registradas no abastecimento do veículo.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "fuelingDate": {
            "type": "date",
            "required": true,
            "of": "Address",
            "title": "Data do abastecimento",
            "description": "Data em que o abastecimento foi realizado.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "liters": {
            "type": "number",
            "required": true,
            "of": "Address",
            "title": "Litros abastecidos",
            "description": "Quantidade de combustível abastecida, em litros.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "amount": {
            "type": "money",
            "required": true,
            "of": "Address",
            "title": "Valor total",
            "description": "Valor total pago pelo abastecimento.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "odometerKm": {
            "type": "integer",
            "required": true,
            "of": "Address",
            "title": "Quilometragem no painel",
            "description": "Quilometragem indicada no painel do veículo no momento do abastecimento.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          }
        }
      }
    }
  }
} as const satisfies Ns5OntologyEntityV3;

export type ManutencaoFrotaEntityFuelingType = typeof manutencaoFrotaEntityFueling;

export default manutencaoFrotaEntityFueling;
