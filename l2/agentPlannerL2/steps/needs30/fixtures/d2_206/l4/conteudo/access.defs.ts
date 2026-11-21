/// <mls fileReference="_102047_/l4/conteudo/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const conteudoAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "conteudo",
  "actors": [
    {
      "actorId": "editor",
      "kind": "internal",
      "origin": "named",
      "title": "Editor",
      "description": "Pessoa da empresa que navega pelas pastas (blog, docs, site), abre, lê, altera e salva arquivos markdown do repositório de conteúdo e cria conteúdos novos escolhendo pasta, título e texto.",
      "personEntity": "Editor"
    }
  ],
  "grants": [
    {
      "grantId": "editorArquivosConteudo",
      "actorRef": "editor",
      "title": "Navegar, ler, criar e alterar arquivos de conteúdo",
      "description": "O editor navega pelas pastas blog, docs e site, abre e lê os arquivos markdown do repositório de conteúdo, altera e salva, e cria conteúdos novos; toda gravação vai para o repositório pelo módulo de integração.",
      "entityRefs": [
        "ContentFile"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os arquivos das pastas blog, docs e site do repositório de conteúdo da empresa."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O editor vê o arquivo inteiro: caminho, pasta, nome, título, texto markdown, versão e data da última alteração."
      }
    },
    {
      "grantId": "editorHistoricoPublicacoes",
      "actorRef": "editor",
      "title": "Consultar o histórico de publicações",
      "description": "O editor lista e consulta as publicações registradas pelo módulo: quem publicou, qual arquivo, em qual pasta, se foi criação ou alteração e quando.",
      "entityRefs": [
        "Publication"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todas as publicações feitas por qualquer pessoa da empresa, filtráveis por pessoa, pasta ou período."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O editor vê o registro completo da publicação, incluindo título no momento da publicação e identificador da gravação no repositório."
      }
    },
    {
      "grantId": "editorPessoasPublicadoras",
      "actorRef": "editor",
      "title": "Ver quem publicou",
      "description": "O editor vê o nome das pessoas da empresa que publicaram conteúdos, para identificar no histórico quem gravou cada arquivo e filtrar por pessoa.",
      "entityRefs": [
        "Editor"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todas as pessoas da organização que atuam como editoras de conteúdo."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Apenas o nome, o tipo e a situação da pessoa na plataforma; os dados de base, de pessoa física e gerais não são exibidos.",
        "allowedFields": [
          "Editor.details.identification.name",
          "Editor.details.identification.subtype",
          "Editor.details.identification.status",
          "Editor.details.conteudo"
        ]
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type ConteudoAccessType = typeof conteudoAccess;

export default conteudoAccess;
