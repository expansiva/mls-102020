/// <mls fileReference="_102047_/l4/locacaoEquipamentos/ontology/ItemContrato.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosEntityItemContrato = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "locacaoEquipamentos",
  "entityId": "ItemContrato",
  "title": "Item do contrato",
  "description": "Equipamento incluído em um contrato de locação, com o valor da diária praticado; o mesmo equipamento não pode estar em dois contratos com períodos sobrepostos.",
  "displayField": "equipamentoId",
  "relationships": {
    "contrato": {
      "relationshipId": "itemContrato",
      "to": "ContratoLocacao",
      "via": "ItemContrato.contratoId",
      "cardinality": "N:1",
      "title": "Contrato do item",
      "description": "Cada item pertence a um contrato; um contrato tem um ou mais itens.",
      "mode": "fk",
      "required": true
    },
    "equipamento": {
      "relationshipId": "itemEquipamento",
      "to": "Equipamento",
      "via": "ItemContrato.equipamentoId",
      "cardinality": "N:1",
      "title": "Equipamento do item",
      "description": "Cada item aponta para o equipamento locado; um equipamento aparece em vários itens ao longo do tempo, sem períodos sobrepostos.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Lê um item do contrato pelo id, quando o atendente abre o detalhe de um equipamento do contrato.",
    "locate.byColumn": "Lista itens filtrando por contrato ou por equipamento, para o atendente e o gerente conferirem onde cada equipamento está locado.",
    "listByForeignKey": "Lista os itens de um contrato na tela do contrato, e os itens de vários equipamentos de uma vez para montar a situação de locação que o gerente acompanha.",
    "count": "Conta os itens de um contrato ou de um equipamento, para o cabeçalho da lista e para garantir que o contrato tem ao menos um item.",
    "create": "O atendente inclui um equipamento no contrato com o valor da diária praticado, após a verificação de sobreposição de períodos.",
    "update": "O atendente corrige o valor da diária ou a observação de um item enquanto o contrato ainda não foi confirmado.",
    "delete": "O atendente remove um equipamento incluído por engano em um contrato ainda não confirmado.",
    "uniqueKey": "O motor recusa o mesmo equipamento duas vezes no mesmo contrato, pela chave única contrato + equipamento.",
    "transaction": "Grava o contrato e seus itens tudo ou nada quando o atendente confirma a locação de vários equipamentos.",
    "locacaoEquipamentos.verificarSobreposicao": "Antes de incluir um item, busca pelo equipamento os itens de outros contratos não encerrados e recusa quando o período de retirada a devolução prevista se sobrepõe; usado pelo atendente ao adicionar itens."
  },
  "rules": [
    "equipamentoSemPeriodoSobreposto",
    "itemUnicoPorContrato",
    "multaPorAtraso",
    "contratoComAoMenosUmItem",
    "equipamentoEmManutencaoNaoLoca"
  ],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "locacaoEquipamentos_itemcontrato",
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
      "contratoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "ContratoLocacao"
        ],
        "title": "Contrato",
        "description": "Contrato de locação ao qual este item pertence."
      },
      "equipamentoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Equipamento"
        ],
        "title": "Equipamento",
        "description": "Equipamento locado neste item; usado para verificar se o mesmo equipamento já está em outro contrato com período sobreposto."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Dados do item que só são exibidos.",
        "fields": {
          "valorDiaria": {
            "type": "money",
            "required": true,
            "title": "Valor da diária praticado",
            "description": "Valor da diária do equipamento no momento em que foi incluído no contrato; base do valor previsto e da multa por atraso.",
            "min": 0
          },
          "observacao": {
            "type": "text",
            "title": "Observação",
            "description": "Anotação do atendente sobre o equipamento neste contrato (acessórios, estado na retirada).",
            "maxLength": 1000
          },
          "diasPrevistos": {
            "type": "integer",
            "derived": true,
            "title": "Dias previstos",
            "description": "Quantidade de dias entre a data de retirada e a data prevista de devolução do contrato deste item."
          },
          "valorPrevisto": {
            "type": "money",
            "derived": true,
            "title": "Valor previsto",
            "description": "Valor da diária praticado neste item multiplicado pelos dias previstos do contrato."
          },
          "diasAtraso": {
            "type": "integer",
            "derived": true,
            "title": "Dias de atraso",
            "description": "Dias entre a data prevista de devolução e a data real de devolução registrada no contrato; zero quando devolvido no prazo ou ainda não devolvido."
          },
          "multaAtraso": {
            "type": "money",
            "derived": true,
            "title": "Multa por atraso",
            "description": "Quando a devolução atrasou: valor da diária praticado neste item × dias de atraso × 1,5; zero quando não houve atraso."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "contratoId",
      "equipamentoId"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type LocacaoEquipamentosEntityItemContratoType = typeof locacaoEquipamentosEntityItemContrato;

export default locacaoEquipamentosEntityItemContrato;
