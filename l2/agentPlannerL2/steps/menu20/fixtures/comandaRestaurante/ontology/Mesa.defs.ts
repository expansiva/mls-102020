/// <mls fileReference="_102047_/l4/comandaRestaurante/ontology/Mesa.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteEntityMesa = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "comandaRestaurante",
  "entityId": "Mesa",
  "title": "Mesa",
  "description": "Mesa operada pelo restaurante, disponível ou ocupada conforme as comandas abertas vinculadas a ela.",
  "displayField": "details.identification.name",
  "relationships": {
    "comandas": {
      "relationshipId": "comandaMesa",
      "to": "Comanda",
      "via": "Comanda.mesaId",
      "cardinality": "1:N",
      "title": "Comandas da mesa",
      "description": "Comandas abertas ou já encerradas para esta mesa ao longo dos atendimentos.",
      "mode": "fk",
      "direction": "to",
      "required": "Não é obrigatória; uma mesa pode não ter comandas vinculadas.",
      "role": "mesa"
    }
  },
  "capabilities": {
    "read.byId": "Consulta uma mesa pelo identificador da linha no repositório de mesas para as telas que já possuem seu id, usada pelo garçom e pelo caixa.",
    "locate.byColumn": "Localiza mesas pelo número indexado, com ordenação e paginação, para o garçom selecionar uma mesa antes de abrir a comanda.",
    "count": "Conta as mesas que atendem aos critérios de número no repositório para a lista de mesas usada por usuários internos autorizados.",
    "listByForeignKey": "Lista as comandas que apontam para esta mesa pela chave estrangeira de Comanda para conferir seus atendimentos, usada pelo caixa.",
    "create": "Cadastra uma mesa com número único e nome de apresentação no repositório de mesas, usado por usuário interno autorizado a manter o salão.",
    "update": "Altera o número ou o nome de apresentação de uma mesa no repositório de mesas, usado por usuário interno autorizado a manter o salão.",
    "uniqueKey": "Recusa o cadastro de outra mesa com o mesmo número pelo índice único da tabela, aplicado pelo motor em toda gravação."
  },
  "rules": [
    "mesaDisponivelParaAbrirComanda"
  ],
  "writer": "crud",
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "comandaRestaurante_mesa",
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
        "type": "integer",
        "required": true,
        "unique": true,
        "indexed": true,
        "of": "Address",
        "title": "Número da mesa",
        "description": "Número que identifica a mesa no restaurante e permite localizá-la no atendimento.",
        "maxLength": 0,
        "min": 1,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Detalhes da mesa",
        "description": "Informações descritivas da mesa que não são usadas como filtro.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "identification": {
            "type": "object",
            "required": true,
            "of": "Address",
            "title": "Identificação",
            "description": "Identificação apresentada da mesa no restaurante.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "fields": {
              "name": {
                "type": "string",
                "required": true,
                "of": "Address",
                "title": "Nome da mesa",
                "description": "Nome apresentado para a mesa nas telas de atendimento.",
                "maxLength": 80,
                "min": 0,
                "max": 0
              }
            }
          },
          "available": {
            "type": "boolean",
            "derived": true,
            "title": "Disponível",
            "description": "A mesa está disponível quando não possui comanda aberta vinculada."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "number"
    ]
  ]
} as const satisfies Ns5OntologyEntityV3;

export type ComandaRestauranteEntityMesaType = typeof comandaRestauranteEntityMesa;

export default comandaRestauranteEntityMesa;
