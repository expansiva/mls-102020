/// <mls fileReference="_102047_/l4/locacaoEquipamentos/ontology/ItemLocacao.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosEntityItemLocacao = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "locacaoEquipamentos",
  "entityId": "ItemLocacao",
  "title": "Item de locação",
  "description": "Item de um contrato que vincula um equipamento à locação e preserva a diária usada no cálculo de multa.",
  "displayField": "id",
  "relationships": {
    "contratoLocacao": {
      "relationshipId": "contratoItensLocacao",
      "to": "ContratoLocacao",
      "via": "ItemLocacao.contratoLocacaoId",
      "cardinality": "N:1",
      "title": "Pertence ao contrato de locação",
      "description": "Este item pertence a exatamente um contrato de locação.",
      "mode": "fk",
      "direction": "to",
      "required": "sempre",
      "role": "item do contrato"
    },
    "equipamento": {
      "relationshipId": "itemLocacaoEquipamento",
      "to": "Equipamento",
      "via": "ItemLocacao.equipamentoId",
      "cardinality": "N:1",
      "title": "Referencia o equipamento locado",
      "description": "Este item reserva exatamente um equipamento para o período definido no contrato.",
      "mode": "fk",
      "required": "sempre",
      "role": "equipamento locado"
    }
  },
  "capabilities": {
    "read.byId": "Lê um item de locação pelo identificador da linha no repositório; atendente e gerente o usam ao abrir um contrato ou consultar uma locação.",
    "locate.byColumn": "Lista itens de locação pelos contratos ou equipamentos indexados, com ordenação e paginação; atendente e gerente usam para consultar itens vinculados.",
    "count": "Conta os itens que correspondem aos filtros de contrato ou equipamento; atendente e gerente usam para exibir totais em consultas.",
    "listByForeignKey": "Lista os itens que apontam para um contrato ou equipamento pelas chaves estrangeiras; atendente e gerente usam para ver equipamentos de uma locação e o histórico de locações do equipamento.",
    "create": "Cria o item que vincula um equipamento ao contrato e registra a diária contratada; atendente usa ao montar o contrato de locação.",
    "update": "Altera os dados permitidos de um item de locação por atualização parcial; atendente usa enquanto ajusta o contrato conforme as regras aplicáveis.",
    "delete": "Remove fisicamente um item de locação pelo identificador; atendente usa para retirar um equipamento de um contrato antes da efetivação, conforme as regras aplicáveis.",
    "uniqueKey": "Recusa repetir o mesmo equipamento no mesmo contrato pela chave única de contrato e equipamento; o sistema aplica ao gravar itens criados pelo atendente.",
    "transaction": "Grava os itens e as alterações do contrato como uma única transação; atendente usa ao criar ou ajustar uma locação com um ou mais equipamentos."
  },
  "rules": [
    "equipamentoSemSobreposicao",
    "itemEquipamentoUnicoNoContrato",
    "calcularMultaAtraso"
  ],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "locacaoEquipamentos_itemlocacao",
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
      "contratoLocacaoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "ContratoLocacao"
        ],
        "title": "Contrato de locação",
        "description": "Contrato de locação ao qual este item pertence.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "equipamentoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "Equipamento"
        ],
        "title": "Equipamento",
        "description": "Equipamento de construção reservado neste item de locação.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "ContactSummary",
        "title": "Dados do item de locação",
        "description": "Dados próprios do equipamento dentro deste contrato de locação.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "valorDiariaContratada": {
            "type": "money",
            "required": true,
            "of": "ContactSummary",
            "title": "Valor da diária contratada",
            "description": "Valor diário do equipamento preservado no momento da inclusão no contrato e usado para calcular eventual multa por atraso.",
            "maxLength": 0,
            "min": 0.01,
            "max": 0
          },
          "multaAtraso": {
            "type": "money",
            "derived": true,
            "title": "Multa por atraso",
            "description": "Valor calculado quando a devolução real do contrato ocorre após a data prevista, usando a diária contratada deste item, a quantidade de dias de atraso e o multiplicador de 1,5."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "contratoLocacaoId",
      "equipamentoId"
    ]
  ]
} as const satisfies Ns5OntologyEntityV3;

export type LocacaoEquipamentosEntityItemLocacaoType = typeof locacaoEquipamentosEntityItemLocacao;

export default locacaoEquipamentosEntityItemLocacao;
