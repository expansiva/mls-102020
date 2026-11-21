/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/PlanoManutencao.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityPlanoManutencao = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "manutencaoFrota",
  "entityId": "PlanoManutencao",
  "title": "Plano de manutenção preventiva",
  "description": "Plano de preventiva de um veículo, a cada N km ou a cada N meses; o km previsto da próxima preventiva e a situação de vencido são derivados.",
  "displayField": "descricao",
  "relationships": {
    "veiculo": {
      "relationshipId": "planoVeiculo",
      "to": "Veiculo",
      "via": "PlanoManutencao.veiculoId",
      "cardinality": "N:1",
      "title": "Veículo do plano",
      "description": "O plano de preventiva é definido para um veículo.",
      "mode": "fk",
      "required": true
    },
    "ordens": {
      "relationshipId": "ordemPlano",
      "to": "OrdemManutencao",
      "via": "OrdemManutencao.planoId",
      "cardinality": "1:N",
      "title": "Ordens preventivas do plano",
      "description": "Ordens de manutenção abertas porque este plano venceu.",
      "mode": "fk",
      "direction": "to"
    }
  },
  "capabilities": {
    "read.byId": "Abre o plano pelo id quando o gestor vem do aviso ou da ficha do veículo, mostrando km previsto, quilometragem atual e se há ordem aberta.",
    "locate.byColumn": "Lista os planos filtrando por veículo, ordenados pela descrição, para o gestor conferir as preventivas existentes.",
    "locate.byText": "Busca planos pelo texto da descrição na lista do gestor.",
    "count": "Conta os planos de um veículo ou os vencidos para o contador do painel do gestor.",
    "listByForeignKey": "Lista os planos de um ou de vários veículos de uma vez pelo veiculoId, na ficha do veículo e na lista de preventivas vencidas.",
    "create": "O gestor cadastra o plano do veículo com descrição e intervalo em km ou em meses.",
    "update": "O gestor ajusta a descrição, o intervalo ou a referência inicial do plano.",
    "delete": "O gestor remove um plano que deixou de valer para o veículo.",
    "comment": "O gestor deixa notas sobre a preventiva no plano.",
    "manutencaoFrota.avisoPreventivaVencida": "Avisa o gestor quando a quilometragem atual do veículo passou do km previsto do plano, lendo os planos com seus veículos e ordens abertas; usado na jornada de acompanhar preventivas vencidas."
  },
  "rules": [
    "planoIntervaloObrigatorio",
    "avisoPreventivaVencidaKm",
    "planoUmaOrdemAberta"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "manutencaoFrota_planomanutencao",
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
        "description": "Veículo para o qual a preventiva é definida; o gestor lista os planos de um veículo por esta chave."
      },
      "descricao": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Descrição",
        "description": "O que a preventiva faz (troca de óleo, revisão de freios…); é o nome do plano nas listas e na busca.",
        "maxLength": 200
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Dados do plano",
        "description": "Intervalo e referência inicial da preventiva.",
        "fields": {
          "intervaloKm": {
            "type": "integer",
            "title": "Intervalo em km",
            "description": "A preventiva se repete a cada este número de quilômetros rodados.",
            "min": 1
          },
          "intervaloMeses": {
            "type": "integer",
            "title": "Intervalo em meses",
            "description": "A preventiva se repete a cada este número de meses.",
            "min": 1,
            "max": 120
          },
          "kmReferencia": {
            "type": "integer",
            "required": true,
            "title": "Km de referência",
            "description": "Quilometragem do veículo a partir da qual o intervalo começa a contar, quando ainda não há ordem preventiva concluída para o plano.",
            "min": 0
          },
          "dataReferencia": {
            "type": "date",
            "required": true,
            "title": "Data de referência",
            "description": "Data a partir da qual o intervalo em meses começa a contar, quando ainda não há ordem preventiva concluída para o plano."
          },
          "observacoes": {
            "type": "text",
            "title": "Observações",
            "description": "Orientações do gestor para a execução da preventiva."
          },
          "kmUltimaPreventiva": {
            "type": "integer",
            "derived": true,
            "title": "Km da última preventiva",
            "description": "Quilometragem registrada na saída da última ordem preventiva concluída deste plano; sem ordem concluída, o km de referência do plano."
          },
          "dataUltimaPreventiva": {
            "type": "date",
            "derived": true,
            "title": "Data da última preventiva",
            "description": "Data de saída da última ordem preventiva concluída deste plano; sem ordem concluída, a data de referência do plano."
          },
          "kmPrevisto": {
            "type": "integer",
            "derived": true,
            "title": "Km previsto da próxima preventiva",
            "description": "Km da última preventiva somado ao intervalo em km do plano; vazio quando o plano é só por meses."
          },
          "dataPrevista": {
            "type": "date",
            "derived": true,
            "title": "Data prevista da próxima preventiva",
            "description": "Data da última preventiva somada ao intervalo em meses do plano; vazia quando o plano é só por km."
          },
          "vencidoPorKm": {
            "type": "boolean",
            "derived": true,
            "title": "Vencido por km",
            "description": "A quilometragem atual do veículo já passou do km previsto da próxima preventiva."
          },
          "vencidoPorTempo": {
            "type": "boolean",
            "derived": true,
            "title": "Vencido por tempo",
            "description": "A data de hoje já passou da data prevista da próxima preventiva."
          },
          "kmExcedido": {
            "type": "integer",
            "derived": true,
            "title": "Km além do previsto",
            "description": "Quanto a quilometragem atual do veículo passou do km previsto; zero quando ainda não passou."
          },
          "temOrdemAberta": {
            "type": "boolean",
            "derived": true,
            "title": "Há ordem aberta",
            "description": "Existe uma ordem de manutenção deste plano que ainda não teve data de saída."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ManutencaoFrotaEntityPlanoManutencaoType = typeof manutencaoFrotaEntityPlanoManutencao;

export default manutencaoFrotaEntityPlanoManutencao;
