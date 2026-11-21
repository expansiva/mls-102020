/// <mls fileReference="_102047_/l4/conteudo/ontology/ContentFile.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const conteudoEntityContentFile = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "conteudo",
  "entityId": "ContentFile",
  "title": "Arquivo de conteúdo",
  "description": "Arquivo markdown do blog, da documentação ou do site guardado no repositório de conteúdo. O conteúdo de verdade está no repositório: o módulo não guarda cópia, apenas lista, lê e grava pelo módulo de integração.",
  "displayField": "path",
  "relationships": {
    "publications": {
      "relationshipId": "publicationContentFile",
      "to": "Publication",
      "via": "Publication.filePath",
      "cardinality": "1:N",
      "title": "Publicações do arquivo",
      "description": "Histórico de publicações (criação ou alteração) feitas neste arquivo pelo módulo, com quem e quando.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {},
  "rules": [
    "contentRepositoryIsSourceOfTruth",
    "contentFolderAllowed",
    "contentWriteThroughIntegration"
  ],
  "kind": "external",
  "connectionId": "github",
  "record": {
    "fields": {
      "path": {
        "type": "string",
        "required": true,
        "title": "Caminho do arquivo",
        "description": "Caminho do arquivo markdown no repositório de conteúdo, incluindo a pasta (blog, docs ou site) e o nome do arquivo; identifica o arquivo."
      },
      "folder": {
        "type": "enum",
        "required": true,
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
        "description": "Pasta do repositório onde o arquivo fica: blog, documentação ou site institucional."
      },
      "name": {
        "type": "string",
        "required": true,
        "title": "Nome do arquivo",
        "description": "Nome do arquivo markdown dentro da pasta, como aparece na lista."
      },
      "title": {
        "type": "string",
        "title": "Título",
        "description": "Título do conteúdo, informado pelo editor ao criar o arquivo e lido do próprio texto markdown.",
        "maxLength": 200
      },
      "content": {
        "type": "text",
        "title": "Texto",
        "description": "Texto markdown do arquivo, trazido do repositório quando o editor abre o arquivo e enviado de volta quando ele salva; o módulo não guarda cópia."
      },
      "sha": {
        "type": "string",
        "title": "Versão no repositório",
        "description": "Identificador da versão atual do arquivo no repositório, usado para gravar a alteração sobre a versão que o editor leu."
      },
      "updatedAt": {
        "type": "timestamp",
        "title": "Última alteração",
        "description": "Momento da última alteração do arquivo no repositório, feita pelo módulo ou por fora."
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ConteudoEntityContentFileType = typeof conteudoEntityContentFile;

export default conteudoEntityContentFile;
