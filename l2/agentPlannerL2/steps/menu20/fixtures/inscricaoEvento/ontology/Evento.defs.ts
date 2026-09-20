/// <mls fileReference="_102047_/l4/inscricaoEvento/ontology/Evento.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoEntityEvento = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "inscricaoEvento",
  "entityId": "Evento",
  "title": "Evento",
  "description": "Evento organizado e publicado para receber inscrições públicas, com informações, capacidade e situação de publicação.",
  "displayField": "titulo",
  "relationships": {
    "inscricoes": {
      "relationshipId": "inscricaoDoEvento",
      "to": "Inscricao",
      "via": "Inscricao.eventoId",
      "cardinality": "1:N",
      "title": "Inscrições do evento",
      "description": "Inscrições registradas para este evento, incluindo as confirmadas e as que aguardam na lista de espera.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Lê um evento pelo identificador já conhecido no repositório da tabela, para telas que já têm o evento em contexto.",
    "locate.byColumn": "Localiza eventos por situação de publicação ou data do evento, com ordenação e paginação, para o organizador e para a página pública.",
    "locate.byText": "Encontra eventos pelo texto do título, por busca sem diferenciação entre maiúsculas e minúsculas, para o organizador localizar eventos cadastrados.",
    "count": "Conta os eventos que correspondem aos filtros de situação ou data, para a listagem do organizador.",
    "listByForeignKey": "Lista as inscrições que apontam para este evento pela chave estrangeira, para o organizador consultar inscritos e situações.",
    "create": "Cria um evento em cadastro com título, descrição, data, local e número de vagas, para o organizador.",
    "update": "Atualiza as informações de um evento ainda em cadastro pelo identificador, para o organizador corrigir seus dados antes da publicação.",
    "transition": "Move a situação indexada do evento de em cadastro para publicado, para o organizador disponibilizar a página pública.",
    "inscricaoEvento.exportarInscricoesCsv": "Gera e baixa em CSV a lista de inscrições vinculadas ao evento, para o organizador acompanhar e exportar os inscritos."
  },
  "rules": [
    "eventoCompletoParaPublicacao",
    "inscricoesConfirmadasOcupamVagas"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "inscricaoEvento_evento",
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
      "titulo": {
        "type": "string",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Título",
        "description": "Título pelo qual o organizador e o público identificam o evento.",
        "maxLength": 200,
        "min": 0,
        "max": 0
      },
      "dataEvento": {
        "type": "date",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Data do evento",
        "description": "Data em que o evento será realizado, usada para localizar e organizar os eventos.",
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
            "value": "draft",
            "title": "Em cadastro",
            "description": "Evento cadastrado, ainda não disponível para inscrições públicas."
          },
          {
            "value": "published",
            "title": "Publicado",
            "description": "Evento disponível na página pública para receber inscrições."
          }
        ],
        "title": "Situação de publicação",
        "description": "Situação que indica se o evento ainda está em cadastro ou se já está disponível na página pública.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Informações do evento",
        "description": "Informações informadas pelo organizador para apresentar e realizar o evento.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "descricao": {
            "type": "text",
            "required": true,
            "of": "Address",
            "title": "Descrição",
            "description": "Descrição apresentada ao público com as informações do evento.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "local": {
            "type": "string",
            "required": true,
            "of": "Address",
            "title": "Local",
            "description": "Local informado para a realização do evento.",
            "maxLength": 300,
            "min": 0,
            "max": 0
          },
          "numeroVagas": {
            "type": "integer",
            "required": true,
            "of": "Address",
            "title": "Número de vagas",
            "description": "Quantidade máxima de inscrições confirmadas que o evento comporta.",
            "maxLength": 0,
            "min": 1,
            "max": 0
          },
          "vagasOcupadas": {
            "type": "integer",
            "derived": true,
            "title": "Vagas ocupadas",
            "description": "Quantidade de inscrições confirmadas deste evento."
          },
          "vagasDisponiveis": {
            "type": "integer",
            "derived": true,
            "title": "Vagas disponíveis",
            "description": "Número de vagas do evento menos a quantidade de inscrições confirmadas deste evento."
          }
        }
      }
    }
  },
  "lifecycleStates": [
    {
      "state": "draft",
      "reachedBy": "actor"
    },
    {
      "state": "published",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "publicarEvento",
      "from": [
        "draft"
      ],
      "to": "published",
      "by": [
        "organizador"
      ],
      "description": "Publica o evento e disponibiliza sua página para inscrições públicas.",
      "ruleRefs": [
        "eventoCompletoParaPublicacao"
      ]
    }
  ]
} as const satisfies Ns5OntologyEntityV3;

export type InscricaoEventoEntityEventoType = typeof inscricaoEventoEntityEvento;

export default inscricaoEventoEntityEvento;
