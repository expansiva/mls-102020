/// <mls fileReference="_102047_/l4/conteudo/ontology/Publication.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const conteudoEntityPublication = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "conteudo",
  "entityId": "Publication",
  "title": "Publicação",
  "description": "Registro de cada gravação feita pelo módulo no repositório: quem publicou, qual arquivo, em qual pasta, se foi criação ou alteração e quando. Não guarda o texto do arquivo.",
  "displayField": "filePath",
  "relationships": {
    "editor": {
      "relationshipId": "publicationEditor",
      "to": "Editor",
      "via": "Publication.editorId",
      "cardinality": "N:1",
      "title": "Pessoa que publicou",
      "description": "Cada publicação registra a pessoa que gravou o arquivo no repositório.",
      "mode": "fk",
      "required": true
    },
    "contentFile": {
      "relationshipId": "publicationContentFile",
      "to": "ContentFile",
      "via": "Publication.filePath",
      "cardinality": "N:1",
      "title": "Arquivo publicado",
      "description": "Cada publicação aponta o arquivo do repositório que foi criado ou alterado.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Abre uma publicação pelo id para o editor ver quem publicou, qual arquivo e quando.",
    "locate.byColumn": "Lista as publicações filtrando por pessoa, pasta, operação ou período, ordenadas pela data de publicação, na tela de histórico do editor.",
    "locate.byText": "Procura publicações pelo caminho do arquivo digitado na busca do histórico.",
    "count": "Conta as publicações do filtro aplicado para o total no cabeçalho do histórico.",
    "listByForeignKey": "Lista as publicações de um arquivo ou de uma pessoa, mostrando o histórico de gravações daquele item.",
    "create": "Registra uma publicação quando o módulo grava um arquivo no repositório pelo módulo de integração, ao salvar ou criar um conteúdo do editor.",
    "read.mdmRecord": "Lê o registro mestre do editor para mostrar o nome de quem publicou em cada linha do histórico."
  },
  "rules": [
    "publicationRecordedOnSave",
    "publicationKeepsNoFileText"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "conteudo_publication",
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
      "editorId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Editor"
        ],
        "title": "Editor",
        "description": "Pessoa da empresa que gravou o arquivo no repositório; filtra o histórico por pessoa."
      },
      "filePath": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "ContentFile"
        ],
        "title": "Arquivo",
        "description": "Caminho do arquivo markdown no repositório de conteúdo que foi criado ou alterado."
      },
      "folder": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "blog",
            "title": "Blog"
          },
          {
            "value": "docs",
            "title": "Documentação"
          },
          {
            "value": "site",
            "title": "Site institucional"
          }
        ],
        "title": "Pasta",
        "description": "Pasta do repositório onde o arquivo está; filtra o histórico por pasta."
      },
      "publishedAt": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "derived": true,
        "title": "Publicado em",
        "description": "Momento em que a gravação foi confirmada no repositório; filtra e ordena o histórico por período."
      },
      "operation": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "create",
            "title": "Criação"
          },
          {
            "value": "update",
            "title": "Alteração"
          }
        ],
        "title": "Operação",
        "description": "Se a gravação criou um conteúdo novo ou alterou um arquivo existente."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Dados da publicação que só são exibidos; não guarda o texto do arquivo.",
        "fields": {
          "title": {
            "type": "string",
            "title": "Título",
            "description": "Título do conteúdo no momento da publicação, para exibição no histórico.",
            "maxLength": 300
          },
          "commitId": {
            "type": "string",
            "title": "Identificador da gravação no repositório",
            "description": "Identificador devolvido pelo repositório para a gravação feita pelo módulo de integração.",
            "maxLength": 100
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ConteudoEntityPublicationType = typeof conteudoEntityPublication;

export default conteudoEntityPublication;
