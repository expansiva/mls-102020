/// <mls fileReference="_102047_/l4/conteudo/ontology/Editor.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const conteudoEntityEditor = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "conteudo",
  "entityId": "Editor",
  "title": "Editor",
  "description": "Pessoa da organização, usuária da plataforma, que publica conteúdos no repositório; escolhida na lista de usuários, nunca cadastrada pelo módulo.",
  "displayField": "details.identification.name",
  "relationships": {
    "publications": {
      "relationshipId": "publicationEditor",
      "to": "Publication",
      "via": "Publication.editorId",
      "cardinality": "1:N",
      "title": "Publicações do editor",
      "description": "Cada publicação registra a pessoa que gravou o arquivo no repositório; o editor tem várias.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "locate.users": "Lista as pessoas da organização que já têm login na plataforma, para identificar o editor que grava um arquivo; usado pelo módulo ao registrar a publicação e pelo histórico.",
    "read.byId": "Lê o editor pelo mdmId guardado na publicação, para mostrar o nome de quem publicou no histórico; usado pela tela de histórico.",
    "locate.byName": "Encontra editores pelo nome digitado, para filtrar o histórico de publicações por pessoa; usado pelo editor.",
    "listLinks": "Mostra as publicações ligadas ao editor, para ver o que cada pessoa publicou e quando; usado pela tela de histórico."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace"
  ],
  "writer": "crud",
  "kind": "role",
  "subtype": "Person",
  "roleTag": "conteudo.Editor",
  "source": "/_102034_/l4/ontology/mdm.defs.ts",
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "indexed": true,
        "derived": true,
        "description": "mdmId; stable through promotion and merge."
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true,
        "writePrecondition": true,
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Registro da pessoa na plataforma, como ela é lida pelo módulo de conteúdo.",
        "fields": {
          "identification": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "subtype": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Person",
                    "title": "Pessoa"
                  }
                ],
                "description": "Sempre Pessoa: o editor é uma pessoa da organização.",
                "title": "Subtipo"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "Nome do editor, mostrado no histórico de publicações como quem gravou o arquivo.",
                "title": "Nome"
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Ativo"
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo"
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado"
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado"
                  }
                ],
                "title": "Situação",
                "description": "Situação do usuário na plataforma; o módulo apenas lê."
              }
            },
            "description": "Dados de identificação da pessoa, mantidos pela plataforma."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados comuns da plataforma; o módulo de conteúdo não usa nenhum deles."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados de pessoa física da plataforma; o módulo de conteúdo não usa nenhum deles."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização; lidos, não declarados aqui."
          },
          "conteudo": {
            "type": "object",
            "owner": "module",
            "fields": {},
            "description": "Module namespace; the prompt asked for no data of this module about the record."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ConteudoEntityEditorType = typeof conteudoEntityEditor;

export default conteudoEntityEditor;
