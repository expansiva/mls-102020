/// <mls fileReference="_102047_/l4/inscricaoEvento/ontology/Evento.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoEntityEvento = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "inscricaoEvento",
  "entityId": "Evento",
  "title": "Evento",
  "description": "Evento cadastrado pelo organizador com título, descrição, data, local e número de vagas; nasce como rascunho e, ao ser publicado, ganha uma página pública aberta a inscrições. Vagas ocupadas, vagas restantes e tamanho da lista de espera são campos derivados das inscrições.",
  "displayField": "title",
  "relationships": {
    "inscricoes": {
      "relationshipId": "inscricaoEvento",
      "to": "Inscricao",
      "via": "Inscricao.eventoId",
      "cardinality": "1:N",
      "title": "Inscrições do evento",
      "description": "Inscritos confirmados e lista de espera do evento.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "participantes": {
      "relationshipId": "eventosDoParticipante",
      "to": "Participante",
      "via": "Inscricao",
      "cardinality": "N:N",
      "title": "Participantes do evento",
      "description": "Pessoas inscritas no evento, obtidas a partir das inscrições.",
      "mode": "throughTable",
      "path": "Participante <- Inscricao.participanteId -> Inscricao.eventoId -> Evento",
      "derived": true,
      "direction": "to"
    }
  },
  "capabilities": {
    "create": "Cria o evento como rascunho com título, descrição, data, local e número de vagas; usado pelo organizador ao cadastrar o evento.",
    "update": "Altera os dados do evento (título, descrição, data, local, vagas); usado pelo organizador ao revisar o evento.",
    "transition": "Publica o evento movendo a situação de rascunho para publicado; usado pelo organizador, com a regra de dados completos verificada no módulo.",
    "read.byId": "Lê o evento pelo id para a página pública de inscrição e para a tela de revisão e ocupação do organizador.",
    "locate.byColumn": "Lista eventos filtrando por situação e ordenando por data; o público vê só os publicados e o organizador vê todos.",
    "locate.byText": "Busca eventos pelo título digitado; usado pelo organizador para localizar o evento entre os cadastrados.",
    "count": "Conta os eventos por situação para o cabeçalho da lista do organizador.",
    "listByForeignKey": "Lista as inscrições que apontam para o evento, para calcular vagas ocupadas, lista de espera e mostrar os inscritos ao organizador.",
    "delete": "Remove um evento em rascunho cadastrado por engano; usado pelo organizador.",
    "inscricaoEvento.paginaPublica": "Expõe a página pública de um evento publicado com título, descrição, data, local e disponibilidade de vagas, acessível ao público sem login."
  },
  "rules": [
    "publicarExigeDadosCompletos",
    "inscricaoSomenteEventoPublicado",
    "vagasNaoMenorQueOcupadas",
    "inscricaoExcedenteVaiParaListaEspera"
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
      "title": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Título",
        "description": "Título do evento, mostrado na página pública e usado na busca do organizador.",
        "maxLength": 200
      },
      "eventDate": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "title": "Data",
        "description": "Data e hora do evento; a lista de eventos é ordenada e filtrada por ela."
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "draft",
            "title": "Rascunho",
            "description": "Evento em edição, sem página pública."
          },
          {
            "value": "published",
            "title": "Publicado",
            "description": "Evento com página pública aberta a inscrições."
          }
        ],
        "title": "Situação",
        "description": "Situação do evento: rascunho enquanto o organizador edita, publicado quando a página pública aceita inscrições."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Dados do evento que não são filtrados.",
        "fields": {
          "description": {
            "type": "text",
            "required": true,
            "title": "Descrição",
            "description": "Texto que apresenta o evento ao público na página pública."
          },
          "venue": {
            "type": "object",
            "required": true,
            "title": "Local",
            "description": "Onde o evento acontece.",
            "fields": {
              "name": {
                "type": "string",
                "required": true,
                "title": "Nome do local",
                "description": "Nome do local como aparece para o público (ex.: auditório, sala, endereço resumido ou 'online').",
                "maxLength": 200
              },
              "address": {
                "type": "object",
                "of": "Address",
                "title": "Endereço",
                "description": "Endereço do local, quando presencial.",
                "fields": {
                  "line1": {
                    "type": "string",
                    "title": "Logradouro"
                  },
                  "line2": {
                    "type": "string",
                    "title": "Complemento"
                  },
                  "city": {
                    "type": "string",
                    "title": "Cidade"
                  },
                  "stateOrProvince": {
                    "type": "string",
                    "title": "Estado"
                  },
                  "postalCode": {
                    "type": "string",
                    "title": "CEP"
                  },
                  "countryCode": {
                    "type": "string",
                    "title": "País"
                  }
                }
              }
            }
          },
          "capacity": {
            "type": "integer",
            "required": true,
            "title": "Número de vagas",
            "description": "Quantidade de vagas confirmadas do evento; inscrições além dela entram na lista de espera.",
            "min": 1
          },
          "publishedAt": {
            "type": "timestamp",
            "derived": true,
            "title": "Publicado em",
            "description": "Momento em que o organizador publicou o evento, registrado pelo sistema na publicação."
          },
          "occupiedSeats": {
            "type": "integer",
            "derived": true,
            "title": "Vagas ocupadas",
            "description": "Quantidade de inscrições confirmadas deste evento, sem contar as canceladas nem as que estão na lista de espera."
          },
          "remainingSeats": {
            "type": "integer",
            "derived": true,
            "title": "Vagas restantes",
            "description": "Número de vagas do evento menos as vagas ocupadas, nunca abaixo de zero."
          },
          "waitlistSize": {
            "type": "integer",
            "derived": true,
            "title": "Tamanho da lista de espera",
            "description": "Quantidade de inscrições deste evento que estão aguardando na lista de espera."
          },
          "isFull": {
            "type": "boolean",
            "derived": true,
            "title": "Lotado",
            "description": "Verdadeiro quando as vagas ocupadas alcançaram o número de vagas do evento; a partir daí novas inscrições vão para a lista de espera."
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
      "transitionId": "publicar",
      "from": [
        "draft"
      ],
      "to": "published",
      "by": [
        "organizador"
      ],
      "description": "O organizador publica o evento, que ganha uma página pública aberta a inscrições.",
      "payload": [],
      "ruleRefs": [
        "publicarExigeDadosCompletos"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type InscricaoEventoEntityEventoType = typeof inscricaoEventoEntityEvento;

export default inscricaoEventoEntityEvento;
