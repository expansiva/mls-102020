/// <mls fileReference="_102047_/l4/comandaRestaurante/ontology/Comanda.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteEntityComanda = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "comandaRestaurante",
  "entityId": "Comanda",
  "title": "Comanda",
  "description": "Registro do atendimento aberto para uma mesa, que reúne os itens consumidos, o desconto e o fechamento com pagamento.",
  "displayField": "details.number",
  "relationships": {
    "mesa": {
      "relationshipId": "comandaMesa",
      "to": "Mesa",
      "via": "Comanda.mesaId",
      "cardinality": "N:1",
      "title": "Mesa da comanda",
      "description": "Mesa para a qual a comanda foi aberta; uma mesa pode ter comandas em atendimentos diferentes ao longo do tempo.",
      "mode": "fk",
      "required": "sempre",
      "role": "mesa"
    },
    "itens": {
      "relationshipId": "itemComandaComanda",
      "to": "ItemComanda",
      "via": "ItemComanda.comandaId",
      "cardinality": "1:N",
      "title": "Itens lançados",
      "description": "Lançamentos de itens que pertencem a esta comanda.",
      "mode": "fk",
      "direction": "to",
      "required": "quando houver itens lançados",
      "role": "comanda"
    }
  },
  "capabilities": {
    "read.byId": "Lê uma comanda pelo identificador da linha para o garçom ou caixa que já a tenha em contexto.",
    "locate.byColumn": "Lista comandas por mesa e situação indexadas, para o garçom localizar a comanda aberta ou o caixa localizar a comanda a fechar.",
    "count": "Conta comandas conforme mesa ou situação para apoiar as listas de atendimento do garçom e do caixa.",
    "listByForeignKey": "Lista as comandas vinculadas a uma mesa pela chave estrangeira mesaId para consultar os atendimentos dessa mesa.",
    "create": "Cria uma comanda aberta vinculada à mesa selecionada para o garçom iniciar o atendimento.",
    "transition": "Move a comanda de aberta para fechada no fechamento realizado pelo caixa, registrando pagamento, desconto eventual e a liberação da mesa.",
    "sequence.next": "Emite o próximo número sequencial da comanda no momento em que o garçom abre o atendimento.",
    "transaction": "Executa atomicamente a abertura ou o fechamento da comanda e a atualização correspondente da disponibilidade da mesa para o garçom ou caixa."
  },
  "rules": [
    "comandaMesaDisponivel",
    "umaComandaAbertaPorMesa",
    "formaPagamentoObrigatoriaNoFechamento",
    "descontoNaoExcedeTotal",
    "fechamentoLiberaMesa"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "comandaRestaurante_comanda",
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
      "mesaId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "Mesa"
        ],
        "title": "Mesa",
        "description": "Mesa para a qual esta comanda foi aberta.",
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
            "value": "open",
            "title": "Aberta",
            "description": "Comanda em atendimento, disponível para lançamento e cancelamento de itens."
          },
          {
            "value": "closed",
            "title": "Fechada",
            "description": "Comanda paga e concluída, com a mesa liberada."
          }
        ],
        "title": "Situação",
        "description": "Situação do atendimento da mesa: aberta enquanto recebe lançamentos ou fechada após o pagamento.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Dados da comanda",
        "description": "Dados do atendimento, do fechamento e do pagamento que não precisam de índice.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "number": {
            "type": "integer",
            "required": true,
            "of": "Address",
            "title": "Número da comanda",
            "description": "Número sequencial emitido para identificar a comanda no atendimento.",
            "maxLength": 0,
            "min": 1,
            "max": 0
          },
          "discount": {
            "type": "money",
            "of": "Address",
            "title": "Desconto",
            "description": "Valor de desconto aplicado pelo caixa no fechamento, quando houver.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "paymentMethod": {
            "type": "enum",
            "of": "Address",
            "values": [
              {
                "value": "cash",
                "title": "Dinheiro",
                "description": "Pagamento realizado em dinheiro."
              },
              {
                "value": "debitCard",
                "title": "Cartão de débito",
                "description": "Pagamento realizado com cartão de débito."
              },
              {
                "value": "creditCard",
                "title": "Cartão de crédito",
                "description": "Pagamento realizado com cartão de crédito."
              },
              {
                "value": "pix",
                "title": "Pix",
                "description": "Pagamento realizado por Pix."
              }
            ],
            "title": "Forma de pagamento",
            "description": "Forma de pagamento registrada pelo caixa ao fechar a comanda.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "total": {
            "type": "money",
            "derived": true,
            "title": "Total da comanda",
            "description": "Soma dos valores dos itens válidos lançados na comanda, menos o desconto aplicado quando houver."
          }
        }
      }
    }
  },
  "lifecycleStates": [
    {
      "state": "open",
      "reachedBy": "actor"
    },
    {
      "state": "closed",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "fecharComanda",
      "from": [
        "open"
      ],
      "to": "closed",
      "by": [
        "caixa"
      ],
      "description": "Fecha a comanda após registrar a forma de pagamento e o eventual desconto, liberando a mesa para novo atendimento.",
      "ruleRefs": [
        "formaPagamentoObrigatoriaNoFechamento",
        "descontoNaoExcedeTotal",
        "fechamentoLiberaMesa"
      ]
    }
  ]
} as const satisfies Ns5OntologyEntityV3;

export type ComandaRestauranteEntityComandaType = typeof comandaRestauranteEntityComanda;

export default comandaRestauranteEntityComanda;
