/// <mls fileReference="_102047_/l4/comandaRestaurante/ontology/ItemComanda.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteEntityItemComanda = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "comandaRestaurante",
  "entityId": "ItemComanda",
  "title": "Item da comanda",
  "description": "Lançamento de um item do cardápio em uma comanda, com quantidade, observação e possibilidade de cancelamento enquanto a comanda estiver aberta.",
  "displayField": "details.description",
  "relationships": {
    "comanda": {
      "relationshipId": "itemComandaComanda",
      "to": "Comanda",
      "via": "ItemComanda.comandaId",
      "cardinality": "N:1",
      "title": "Pertence à comanda",
      "description": "Cada lançamento pertence a uma única comanda, que pode reunir vários itens lançados.",
      "mode": "fk",
      "required": "Sempre"
    },
    "itemCardapio": {
      "relationshipId": "itemComandaItemCardapio",
      "to": "ItemCardapio",
      "via": "ItemComanda.itemCardapioId",
      "cardinality": "N:1",
      "title": "Refere-se ao item do cardápio",
      "description": "Cada lançamento registra o item do cardápio solicitado, usando o preço vigente no momento do lançamento.",
      "mode": "fk",
      "required": "Sempre"
    }
  },
  "capabilities": {
    "read.byId": "Lê um lançamento pelo identificador da linha · consulta a linha pelo id no repositório · garçom e caixa nas telas que já possuem o lançamento em contexto.",
    "locate.byColumn": "Localiza lançamentos por comanda, item do cardápio ou situação · filtra as colunas indexadas com paginação · garçom e caixa ao consultar consumos.",
    "listByForeignKey": "Lista os itens vinculados a uma comanda ou a um item do cardápio · consulta pelas chaves estrangeiras indexadas · garçom e caixa na visualização da comanda.",
    "create": "Registra um item solicitado em uma comanda aberta · insere o lançamento com quantidade, preço vigente e observação · garçom ao atender o pedido.",
    "transition": "Cancela um lançamento lançado por engano · altera a situação de lançado para cancelado sob as regras da comanda aberta · garçom.",
    "read.mdmRecord": "Lê o registro mestre do item do cardápio apontado pelo lançamento · hidrata o produto pelo identificador mestre · garçom e caixa para exibir o item solicitado."
  },
  "rules": [
    "itemComandaRequiresOpenComanda",
    "itemComandaCancellationRequiresOpenComanda"
  ],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "comandaRestaurante_itemcomanda",
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
      "comandaId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "Comanda"
        ],
        "title": "Comanda",
        "description": "Comanda à qual este lançamento de consumo pertence.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "itemCardapioId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "ItemCardapio"
        ],
        "title": "Item do cardápio",
        "description": "Item do cardápio solicitado e registrado neste lançamento.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "of": "Address",
        "values": [
          {
            "value": "launched",
            "title": "Lançado",
            "description": "Item ativo e considerado no consumo da comanda."
          },
          {
            "value": "cancelled",
            "title": "Cancelado",
            "description": "Item retirado por engano e não considerado no consumo da comanda."
          }
        ],
        "title": "Situação",
        "description": "Situação do lançamento na comanda.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Dados do lançamento",
        "description": "Informações registradas para o item lançado na comanda.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "description": {
            "type": "string",
            "required": true,
            "of": "Address",
            "title": "Descrição",
            "description": "Descrição do lançamento exibida na comanda.",
            "maxLength": 200,
            "min": 0,
            "max": 0
          },
          "quantity": {
            "type": "number",
            "required": true,
            "of": "Address",
            "title": "Quantidade",
            "description": "Quantidade solicitada do item do cardápio.",
            "maxLength": 0,
            "min": 1,
            "max": 0
          },
          "unitPrice": {
            "type": "money",
            "required": true,
            "of": "Address",
            "title": "Preço unitário",
            "description": "Preço vigente do item do cardápio no momento em que foi lançado.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "observation": {
            "type": "text",
            "of": "Address",
            "title": "Observação",
            "description": "Orientação eventual do cliente para o preparo ou serviço do item.",
            "maxLength": 500,
            "min": 0,
            "max": 0
          },
          "subtotal": {
            "type": "money",
            "derived": true,
            "title": "Subtotal do item",
            "description": "Quantidade do item multiplicada pelo preço unitário registrado; é zero quando o lançamento está cancelado."
          }
        }
      }
    }
  },
  "lifecycleStates": [
    {
      "state": "launched",
      "reachedBy": "actor"
    },
    {
      "state": "cancelled",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "cancelarItem",
      "from": [
        "launched"
      ],
      "to": "cancelled",
      "by": [
        "garcom"
      ],
      "description": "Cancela um lançamento feito por engano enquanto a comanda permanece aberta.",
      "ruleRefs": [
        "itemComandaCancellationRequiresOpenComanda"
      ]
    }
  ]
} as const satisfies Ns5OntologyEntityV3;

export type ComandaRestauranteEntityItemComandaType = typeof comandaRestauranteEntityItemComanda;

export default comandaRestauranteEntityItemComanda;
