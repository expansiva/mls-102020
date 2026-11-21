/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/Veiculo.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityVeiculo = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "manutencaoFrota",
  "entityId": "Veiculo",
  "title": "Veículo",
  "description": "Veículo da frota operado por este módulo, com placa, modelo, ano e quilometragem atual, atribuído a um motorista; a quilometragem é atualizada pelos abastecimentos.",
  "displayField": "placa",
  "relationships": {
    "motorista": {
      "relationshipId": "veiculoMotorista",
      "to": "Motorista",
      "via": "Veiculo.motoristaId",
      "cardinality": "N:1",
      "title": "Motorista que dirige o veículo",
      "description": "Caminho do escopo do motorista: ele só vê os veículos atribuídos a ele.",
      "mode": "fk"
    },
    "abastecimentos": {
      "relationshipId": "abastecimentoVeiculo",
      "to": "Abastecimento",
      "via": "Abastecimento.veiculoId",
      "cardinality": "1:N",
      "title": "Abastecimentos do veículo",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "planos": {
      "relationshipId": "planoVeiculo",
      "to": "PlanoManutencao",
      "via": "PlanoManutencao.veiculoId",
      "cardinality": "1:N",
      "title": "Planos de preventiva do veículo",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "ordens": {
      "relationshipId": "ordemVeiculo",
      "to": "OrdemManutencao",
      "via": "OrdemManutencao.veiculoId",
      "cardinality": "1:N",
      "title": "Ordens de manutenção do veículo",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Abre a ficha do veículo pelo id para o motorista conferir placa, modelo e quilometragem antes de abastecer e para o gestor ver seus planos.",
    "locate.byColumn": "Lista os veículos filtrando por placa ou motorista atribuído; para o motorista a lista vem sempre restrita aos veículos atribuídos a ele.",
    "locate.byText": "Busca veículos por parte da placa ou do modelo, usada pelo gestor ao cadastrar planos e abrir ordens por defeito.",
    "count": "Conta os veículos da frota e os de um motorista para os totais das listas do gestor.",
    "listByForeignKey": "Lista os veículos atribuídos a um motorista pela coluna motoristaId, base do escopo do motorista.",
    "create": "O gestor cadastra o veículo com placa, modelo, ano e quilometragem atual.",
    "update": "O gestor atribui ou troca o motorista do veículo e corrige seus dados; o abastecimento atualiza a quilometragem atual.",
    "uniqueKey": "Recusa o cadastro de um segundo veículo com a mesma placa.",
    "transaction": "Grava o abastecimento e a nova quilometragem atual do veículo de uma só vez, tudo ou nada.",
    "read.mdmRecord": "Lê o registro mestre do motorista atribuído para exibir seu nome na ficha e na lista de veículos.",
    "manutencaoFrota.avisoPreventivaKm": "Destaca para o gestor os veículos cuja quilometragem atual passou do km previsto para a próxima preventiva, a partir dos planos do veículo."
  },
  "rules": [
    "placaUnica",
    "quilometragemNaoRegride",
    "motoristaVeSomenteVeiculosAtribuidos",
    "avisoPreventivaVencidaKm"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "manutencaoFrota_veiculo",
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
      "placa": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "title": "Placa",
        "description": "Placa do veículo (padrão antigo ou Mercosul), usada para localizar o veículo e exibida como identificação dele nas listas.",
        "pattern": "^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$",
        "maxLength": 8
      },
      "modelo": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Modelo",
        "description": "Modelo do veículo; o gestor e o motorista também localizam o veículo por ele.",
        "maxLength": 80
      },
      "motoristaId": {
        "type": "record",
        "indexed": true,
        "to": [
          "Motorista"
        ],
        "title": "Motorista atribuído",
        "description": "Motorista que dirige o veículo; define quais veículos o motorista vê e para quais pode registrar abastecimentos."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Dados do veículo",
        "description": "Demais dados do veículo que não são usados como filtro.",
        "fields": {
          "ano": {
            "type": "integer",
            "required": true,
            "title": "Ano",
            "description": "Ano de fabricação/modelo do veículo.",
            "min": 1950,
            "max": 2100
          },
          "quilometragemAtual": {
            "type": "integer",
            "required": true,
            "title": "Quilometragem atual",
            "description": "Quilometragem atual do veículo, informada no cadastro e atualizada pelo km no painel de cada abastecimento; base do aviso de preventiva vencida.",
            "min": 0
          },
          "preventivaVencida": {
            "type": "boolean",
            "derived": true,
            "title": "Preventiva vencida por km",
            "description": "Verdadeiro quando a quilometragem atual do veículo passou do km previsto para a próxima preventiva em algum dos planos de manutenção do veículo."
          },
          "kmProximaPreventiva": {
            "type": "integer",
            "derived": true,
            "title": "Km da próxima preventiva",
            "description": "Menor quilometragem prevista para a próxima preventiva entre os planos por quilometragem do veículo, contada a partir da última manutenção realizada de cada plano."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "placa"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ManutencaoFrotaEntityVeiculoType = typeof manutencaoFrotaEntityVeiculo;

export default manutencaoFrotaEntityVeiculo;
