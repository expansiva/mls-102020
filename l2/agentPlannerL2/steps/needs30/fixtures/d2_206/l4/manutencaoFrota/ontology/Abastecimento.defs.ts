/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/Abastecimento.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityAbastecimento = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "manutencaoFrota",
  "entityId": "Abastecimento",
  "title": "Abastecimento",
  "description": "Registro de abastecimento de um veículo feito pelo motorista, com data, litros, valor e km no painel.",
  "displayField": "data",
  "relationships": {
    "veiculo": {
      "relationshipId": "abastecimentoVeiculo",
      "to": "Veiculo",
      "via": "Abastecimento.veiculoId",
      "cardinality": "N:1",
      "title": "Veículo abastecido",
      "description": "O abastecimento pertence a um veículo.",
      "mode": "fk",
      "required": true
    },
    "motorista": {
      "relationshipId": "abastecimentoMotorista",
      "to": "Motorista",
      "via": "Abastecimento.motoristaId",
      "cardinality": "N:1",
      "title": "Motorista que registrou",
      "description": "O abastecimento foi registrado pelo motorista que dirigia o veículo.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "create": "Grava o novo abastecimento com data, litros, valor e km no painel; usado pelo motorista na jornada registrar abastecimento.",
    "transaction": "Grava o abastecimento e atualiza a quilometragem atual do veículo numa só operação, tudo ou nada; usado ao lançar o abastecimento.",
    "read.byId": "Abre um abastecimento pelo id para o motorista conferir data, litros, valor e km no painel.",
    "locate.byColumn": "Lista os abastecimentos filtrando por veículo, motorista e data, ordenados pela data; usado pelo motorista para consultar seus abastecimentos e pelo gestor.",
    "listByForeignKey": "Lista os abastecimentos de um veículo ou de vários veículos de uma vez pela coluna do veículo; usado na ficha do veículo pelo gestor.",
    "count": "Conta os abastecimentos que o filtro de veículo e período encontra, para o total no cabeçalho da lista.",
    "read.mdmRecord": "Lê no cadastro mestre o nome do motorista apontado pelo abastecimento, para exibir na lista e no detalhe.",
    "update": "Corrige litros, valor ou km no painel de um abastecimento lançado com erro; usado pelo gestor.",
    "delete": "Remove um abastecimento lançado em duplicidade; usado pelo gestor.",
    "attach.document": "Anexa a foto do cupom fiscal do posto ao abastecimento; usado pelo motorista ao registrar."
  },
  "rules": [
    "abastecimentoSomenteVeiculoAtribuido",
    "kmPainelNaoMenorQueAtual",
    "kmPainelAtualizaQuilometragemVeiculo",
    "motoristaVeSomenteSeusAbastecimentos",
    "litrosEValorPositivos"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "manutencaoFrota_abastecimento",
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
      "veiculoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Veiculo"
        ],
        "title": "Veículo",
        "description": "Veículo abastecido; deve ser um dos veículos atribuídos ao motorista que registra."
      },
      "motoristaId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Motorista"
        ],
        "title": "Motorista",
        "description": "Motorista que dirigia o veículo e registrou o abastecimento; define o escopo 'meus abastecimentos'."
      },
      "data": {
        "type": "date",
        "required": true,
        "indexed": true,
        "title": "Data",
        "description": "Data do abastecimento; usada para filtrar por período e ordenar a lista."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Dados do abastecimento que são apenas exibidos.",
        "fields": {
          "litros": {
            "type": "number",
            "required": true,
            "title": "Litros",
            "description": "Quantidade de combustível abastecida, em litros.",
            "min": 0.01
          },
          "valor": {
            "type": "money",
            "required": true,
            "title": "Valor",
            "description": "Valor total pago pelo abastecimento.",
            "min": 0
          },
          "kmPainel": {
            "type": "integer",
            "required": true,
            "title": "Km no painel",
            "description": "Quilometragem marcada no painel no momento do abastecimento; atualiza a quilometragem atual do veículo.",
            "min": 0
          },
          "precoPorLitro": {
            "type": "money",
            "derived": true,
            "title": "Preço por litro",
            "description": "Valor pago dividido pelos litros abastecidos neste abastecimento."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ManutencaoFrotaEntityAbastecimentoType = typeof manutencaoFrotaEntityAbastecimento;

export default manutencaoFrotaEntityAbastecimento;
