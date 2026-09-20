/// <mls fileReference="_102047_/l4/financeiro/ontology/TituloReceber.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const financeiroEntityTituloReceber = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "financeiro",
  "entityId": "TituloReceber",
  "title": "Título a receber",
  "description": "Cobrança originada em outro módulo, com pagador, valor, vencimento, origem e saldo a receber.",
  "displayField": "number",
  "relationships": {
    "pagador": {
      "relationshipId": "tituloTemPagador",
      "to": "Pagador",
      "via": "TituloReceber.pagadorId",
      "cardinality": "N:1",
      "title": "Pagador do título",
      "description": "O título pertence ao pagador responsável por sua quitação.",
      "mode": "fk",
      "required": "sempre",
      "role": "pagador"
    },
    "recebimentos": {
      "relationshipId": "recebimentoDoTitulo",
      "to": "Recebimento",
      "via": "Recebimento.tituloReceberId",
      "cardinality": "1:N",
      "title": "Recebimentos do título",
      "description": "Recebimentos lançados para quitar total ou parcialmente este título.",
      "mode": "fk",
      "direction": "to",
      "required": "quando houver recebimento lançado para o título",
      "role": "título recebido"
    }
  },
  "capabilities": {
    "read.byId": "Consulta um título pelo identificador da linha para exibir seus dados, saldo e situação a quem já o selecionou.",
    "locate.byColumn": "Localiza títulos por pagador, vencimento, módulo de origem ou registro de origem, com ordenação e paginação, para caixa, gerente financeiro e pagador dentro do seu escopo.",
    "count": "Conta os títulos que correspondem aos filtros de pagador, período ou origem para os indicadores de consulta do gerente financeiro.",
    "listByForeignKey": "Lista os títulos vinculados a um ou mais pagadores pela chave de pagador, para o portal e para a emissão de extrato.",
    "create": "Registra, pela entrada do módulo de origem, um novo título a receber com pagador, valor e vencimento.",
    "uniqueKey": "Impede duplicidade do número do título e da cobrança recebida do mesmo registro de origem.",
    "transaction": "Grava de forma atômica o título recebido da origem e sua identificação sequencial quando a entrada exigir ambas as operações.",
    "read.mdmRecord": "Lê o registro mestre do pagador apontado pelo título para mostrar seu nome no caixa, nas análises e no portal.",
    "sequence.next": "Emite o próximo número sequencial do título a receber quando uma cobrança ingressa no financeiro.",
    "financeiro.localizarTitulosEmAberto": "Localiza títulos com saldo em aberto, inclusive vencidos, calculando a situação pelos recebimentos vinculados para o caixa, gerente financeiro e pagador no respectivo escopo."
  },
  "rules": [
    "tituloOrigemUnico",
    "saldoTituloCalculado",
    "valorRecebimentoNaoExcedeSaldo"
  ],
  "writer": "inbound",
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "financeiro_tituloreceber",
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
      "number": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "of": "Address",
        "title": "Número do título",
        "description": "Número sequencial usado para identificar e localizar o título a receber.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "pagadorId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "Pagador"
        ],
        "title": "Pagador",
        "description": "Pessoa responsável pelo pagamento do título.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "dueDate": {
        "type": "date",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Vencimento",
        "description": "Data em que o valor do título vence, usada para localizar recebíveis por período e identificar vencidos.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "originModule": {
        "type": "string",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Módulo de origem",
        "description": "Módulo que gerou a cobrança encaminhada ao contas a receber.",
        "maxLength": 100,
        "min": 0,
        "max": 0
      },
      "originRecordId": {
        "type": "uuid",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Registro de origem",
        "description": "Identificador do registro no módulo de origem que gerou esta cobrança.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Dados do título",
        "description": "Dados financeiros próprios da cobrança recebida de outro módulo.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "amount": {
            "type": "money",
            "required": true,
            "of": "Address",
            "title": "Valor original",
            "description": "Valor total cobrado na criação do título.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "totalReceived": {
            "type": "money",
            "derived": true,
            "title": "Total recebido",
            "description": "Soma dos recebimentos não estornados lançados para este título."
          },
          "outstandingBalance": {
            "type": "money",
            "derived": true,
            "title": "Saldo em aberto",
            "description": "Valor original do título menos a soma dos recebimentos não estornados vinculados a ele."
          },
          "situation": {
            "type": "string",
            "derived": true,
            "title": "Situação",
            "description": "Em aberto quando não há recebimento, parcialmente recebido quando o saldo em aberto é menor que o valor original, ou quitado quando não há saldo em aberto."
          },
          "overdue": {
            "type": "boolean",
            "derived": true,
            "title": "Vencido",
            "description": "Título com saldo em aberto e vencimento anterior à data de hoje."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "number"
    ],
    [
      "originModule",
      "originRecordId"
    ]
  ]
} as const satisfies Ns5OntologyEntityV3;

export type FinanceiroEntityTituloReceberType = typeof financeiroEntityTituloReceber;

export default financeiroEntityTituloReceber;
