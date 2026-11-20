/// <mls fileReference="_102047_/l2/repoHost/web/shared/conteudo_repositorio.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "parentEntryId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:arvoreRepositorio",
        "persist": true,
        "required": false
      },
      "busca": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:arvoreRepositorio",
        "persist": true,
        "required": false
      },
      "repositoryEntryId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:conteudoArquivo",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "listarItensRepositorio": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "itens"
      ]
    },
    "lerArquivo": {
      "kind": "qry",
      "trigger": "lerArquivo",
      "returns": [
        "arquivo"
      ]
    }
  },
  "states": {
    "itens": {
      "source": "listarItensRepositorio.itens",
      "description": "the list of Pasta ou arquivo do repositório com seu caminho, tipo e pasta pai.",
      "organisms": [
        "arvoreRepositorio"
      ]
    },
    "arquivo": {
      "source": "lerArquivo.arquivo",
      "description": "Arquivo do repositório com seus dados de versão e sincronização e o conteúdo atual trazido do serviço que o hospeda.",
      "organisms": [
        "conteudoArquivo"
      ]
    },
    "selectedRepositoryEntry": {
      "source": "entry.params.repositoryEntryId",
      "description": "the id of the RepositoryEntry selected in arvoreRepositorio",
      "organisms": [
        "arvoreRepositorio",
        "conteudoArquivo"
      ]
    }
  },
  "journeys": [
    {
      "step": "consultarConteudoRepositorio/listarPastasArquivos",
      "organisms": [
        "arvoreRepositorio"
      ]
    },
    {
      "step": "consultarConteudoRepositorio/lerArquivo",
      "organisms": [
        "conteudoArquivo"
      ]
    }
  ],
  "rules": [
    "repoHostFolderHasNoContent",
    "repoHostNameFromPath",
    "repoHostParentMustBeFolder"
  ],
  "access": {
    "actors": [
      "administrador"
    ],
    "grants": [
      "administradorConsultaRepositorio"
    ]
  }
} as const;
