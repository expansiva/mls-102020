/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/OrdemManutencao.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityOrdemManutencao = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "manutencaoFrota",
  "entityId": "OrdemManutencao",
  "title": "Ordem de manutenção",
  "description": "Ordem de manutenção preventiva ou corretiva de um veículo em uma oficina, com descrição, custo e datas de entrada e saída.",
  "displayField": "numero",
  "relationships": {
    "veiculo": {
      "relationshipId": "ordemVeiculo",
      "to": "Veiculo",
      "via": "OrdemManutencao.veiculoId",
      "cardinality": "N:1",
      "title": "Veículo da ordem",
      "description": "A ordem de manutenção é aberta para um veículo.",
      "mode": "fk",
      "required": true
    },
    "plano": {
      "relationshipId": "ordemPlano",
      "to": "PlanoManutencao",
      "via": "OrdemManutencao.planoId",
      "cardinality": "N:1",
      "title": "Plano que venceu",
      "description": "A ordem preventiva é vinculada ao plano que venceu; a corretiva não tem plano.",
      "mode": "fk",
      "required": "quando a ordem é preventiva"
    },
    "oficina": {
      "relationshipId": "ordemOficina",
      "to": "Oficina",
      "via": "OrdemManutencao.oficinaId",
      "cardinality": "N:1",
      "title": "Oficina executora",
      "description": "A ordem é executada em uma oficina.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Abre a ordem pelo id para o gestor conferir oficina, descrição, datas e custo.",
    "locate.byColumn": "Lista as ordens filtradas por veículo, oficina, tipo, situação ou datas de entrada e saída, para o gestor localizar a ordem aberta a concluir.",
    "locate.byText": "Busca a ordem pelo número digitado pelo gestor.",
    "count": "Conta as ordens abertas para o painel do gestor.",
    "listByForeignKey": "Lista as ordens de um veículo, de um plano ou de uma oficina na ficha correspondente.",
    "create": "O gestor abre a ordem preventiva a partir do aviso de plano vencido ou a corretiva por defeito, informando veículo, oficina, descrição e data de entrada.",
    "update": "O gestor corrige descrição, oficina ou data de entrada enquanto a ordem está aberta.",
    "transition": "O gestor conclui a ordem, registrando data de saída e custo.",
    "uniqueKey": "O motor recusa uma segunda ordem com o mesmo número.",
    "transaction": "Na conclusão de uma preventiva, grava a ordem concluída e o novo vencimento do plano juntos, tudo ou nada.",
    "read.mdmRecord": "Lê no cadastro mestre o nome e os contatos da oficina para exibir na ordem.",
    "sequence.next": "Emite o número da ordem na abertura, pela sequência manutencaoFrota.OrdemManutencao.",
    "attach.document": "O gestor anexa à ordem a nota fiscal ou o orçamento da oficina.",
    "comment": "O gestor registra observações sobre o andamento da manutenção na ordem."
  },
  "rules": [
    "ordemPreventivaExigePlano",
    "ordemCorretivaSemPlano",
    "conclusaoExigeSaidaECusto",
    "dataSaidaNaoAnteriorEntrada",
    "conclusaoRecalculaPlano",
    "ordemConcluidaNaoEditavel",
    "numeroOrdemUnico"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "manutencaoFrota_ordemmanutencao",
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
      "numero": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "derived": true,
        "title": "Número da ordem",
        "description": "Número da ordem de manutenção emitido pela sequência do módulo na abertura; é por ele que o gestor e a oficina se referem à ordem."
      },
      "veiculoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Veiculo"
        ],
        "title": "Veículo",
        "description": "Veículo que entra na oficina por esta ordem."
      },
      "planoId": {
        "type": "record",
        "indexed": true,
        "to": [
          "PlanoManutencao"
        ],
        "title": "Plano de manutenção",
        "description": "Plano preventivo que venceu e motivou a ordem; vazio quando a ordem é corretiva."
      },
      "oficinaId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Oficina"
        ],
        "title": "Oficina",
        "description": "Oficina que executa a manutenção; nome e contatos são lidos do cadastro mestre."
      },
      "tipo": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "preventive",
            "title": "Preventiva"
          },
          {
            "value": "corrective",
            "title": "Corretiva"
          }
        ],
        "title": "Tipo da ordem",
        "description": "Se a ordem é preventiva (aberta por plano vencido) ou corretiva (aberta por defeito)."
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "open",
            "title": "Aberta"
          },
          {
            "value": "completed",
            "title": "Concluída"
          }
        ],
        "title": "Situação",
        "description": "Situação da ordem: aberta enquanto o veículo está na oficina, concluída após a saída e o custo registrados."
      },
      "dataEntrada": {
        "type": "date",
        "required": true,
        "indexed": true,
        "title": "Data de entrada",
        "description": "Data em que o veículo entrou na oficina."
      },
      "dataSaida": {
        "type": "date",
        "indexed": true,
        "title": "Data de saída",
        "description": "Data em que o veículo saiu da oficina; informada na conclusão da ordem."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Dados da ordem que só são exibidos.",
        "fields": {
          "descricao": {
            "type": "text",
            "required": true,
            "title": "Descrição",
            "description": "Descrição do serviço preventivo a executar ou do defeito apresentado pelo veículo.",
            "maxLength": 4000
          },
          "custo": {
            "type": "money",
            "title": "Custo",
            "description": "Custo final da manutenção cobrado pela oficina, informado na conclusão.",
            "min": 0
          },
          "kmEntrada": {
            "type": "integer",
            "title": "Km na entrada",
            "description": "Quilometragem do veículo no momento da entrada na oficina, usada para recalcular a próxima preventiva.",
            "min": 0
          },
          "diasNaOficina": {
            "type": "integer",
            "derived": true,
            "title": "Dias na oficina",
            "description": "Quantidade de dias entre a data de entrada e a data de saída; enquanto a ordem está aberta, conta até hoje."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "numero"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "open",
      "reachedBy": "actor"
    },
    {
      "state": "completed",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "concluir",
      "from": [
        "open"
      ],
      "to": "completed",
      "by": [
        "gestor"
      ],
      "description": "O gestor informa a data de saída e o custo final e conclui a ordem; se for preventiva, o próximo vencimento do plano é recalculado.",
      "payload": [
        "dataSaida",
        "details.custo"
      ],
      "ruleRefs": [
        "conclusaoExigeSaidaECusto",
        "dataSaidaNaoAnteriorEntrada",
        "conclusaoRecalculaPlano"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ManutencaoFrotaEntityOrdemManutencaoType = typeof manutencaoFrotaEntityOrdemManutencao;

export default manutencaoFrotaEntityOrdemManutencao;
