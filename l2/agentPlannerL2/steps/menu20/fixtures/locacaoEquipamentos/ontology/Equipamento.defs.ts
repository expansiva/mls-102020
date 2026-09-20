/// <mls fileReference="_102047_/l4/locacaoEquipamentos/ontology/Equipamento.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosEntityEquipamento = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "locacaoEquipamentos",
  "entityId": "Equipamento",
  "title": "Equipamento",
  "description": "Equipamento da locadora identificado por código, com diária definida e situação operacional calculada a partir das locações e manutenções.",
  "displayField": "codigo",
  "relationships": {
    "itensLocacao": {
      "relationshipId": "itemLocacaoEquipamento",
      "to": "ItemLocacao",
      "via": "ItemLocacao.equipamentoId",
      "cardinality": "1:N",
      "title": "Itens de locação",
      "description": "Itens de locação que referenciam este equipamento em contratos da locadora.",
      "mode": "fk",
      "direction": "to",
      "required": "Sempre que um item de locação for registrado."
    },
    "manutencoes": {
      "relationshipId": "equipamentoManutencoes",
      "to": "ManutencaoEquipamento",
      "via": "ManutencaoEquipamento.equipamentoId",
      "cardinality": "1:N",
      "title": "Manutenções",
      "description": "Períodos de manutenção associados a este equipamento.",
      "mode": "fk",
      "required": "Sempre que uma manutenção for registrada."
    }
  },
  "capabilities": {
    "read.byId": "Consulta um equipamento pelo identificador da linha no repositório de equipamentos para as telas que já possuem seu id, usada pelo gerente.",
    "locate.byColumn": "Localiza equipamentos pelo código indexado, com ordenação e paginação, para o gerente encontrar equipamentos da locadora.",
    "count": "Conta os equipamentos que atendem aos filtros por colunas indexadas para exibir o total na consulta do gerente.",
    "locacaoEquipamentos.consultarSituacaoEquipamentos": "Apura e apresenta a situação operacional calculada de cada equipamento a partir das locações e manutenções vigentes, para o gerente acompanhar os disponíveis, locados e em manutenção."
  },
  "rules": [
    "periodosLocacaoNaoSobrepostos",
    "situacaoOperacionalEquipamento"
  ],
  "writer": "crud",
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "locacaoEquipamentos_equipamento",
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
      "codigo": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "of": "Address",
        "title": "Código",
        "description": "Código único que identifica o equipamento na locadora e permite sua localização.",
        "maxLength": 80,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Detalhes",
        "description": "Dados descritivos e comerciais do equipamento que não exigem índice próprio.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "descricao": {
            "type": "text",
            "required": true,
            "of": "Address",
            "title": "Descrição",
            "description": "Descrição do equipamento de construção disponibilizado para locação.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "valorDiaria": {
            "type": "money",
            "required": true,
            "of": "Address",
            "title": "Valor da diária",
            "description": "Valor cobrado por uma diária de locação deste equipamento.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "situacaoOperacional": {
            "type": "enum",
            "derived": true,
            "title": "Situação operacional",
            "description": "Situação calculada na data da consulta: em manutenção quando há manutenção em andamento; locado quando há item de locação em período vigente; disponível quando não há manutenção em andamento nem locação vigente."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "codigo"
    ]
  ]
} as const satisfies Ns5OntologyEntityV3;

export type LocacaoEquipamentosEntityEquipamentoType = typeof locacaoEquipamentosEntityEquipamento;

export default locacaoEquipamentosEntityEquipamento;
