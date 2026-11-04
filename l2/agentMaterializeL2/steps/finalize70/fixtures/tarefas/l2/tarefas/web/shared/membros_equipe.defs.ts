/// <mls fileReference="_102047_/l2/tarefas/web/shared/membros_equipe.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "busca": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:pessoasEquipe",
        "persist": true,
        "required": false
      },
      "membroEquipeId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:cadastroPessoa",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "qryPessoasEquipe": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "pessoas"
      ]
    },
    "cmdCadastrarPessoa": {
      "kind": "cmd",
      "trigger": "cadastrarPessoa",
      "returns": [
        "pessoa"
      ],
      "writes": "MembroEquipe.create"
    },
    "cmdSalvarAlteracoes": {
      "kind": "cmd",
      "trigger": "salvarAlteracoes",
      "returns": [
        "pessoa"
      ],
      "writes": "MembroEquipe.update"
    }
  },
  "states": {
    "pessoas": {
      "source": "qryPessoasEquipe.pessoas",
      "description": "the list of Membro da equipe com identificação, situação no cadastro, papéis e resumo dos contatos.",
      "organisms": [
        "pessoasEquipe"
      ]
    },
    "cmdCadastrarPessoaPessoa": {
      "source": "cmdCadastrarPessoa.pessoa",
      "description": "Membro da equipe com identificação, situação no cadastro, papéis e resumo dos contatos.",
      "organisms": [
        "cadastroPessoa"
      ]
    },
    "cmdSalvarAlteracoesPessoa": {
      "source": "cmdSalvarAlteracoes.pessoa",
      "description": "Membro da equipe com identificação, situação no cadastro, papéis e resumo dos contatos.",
      "organisms": [
        "cadastroPessoa"
      ]
    },
    "selectedMembroEquipe": {
      "source": "entry.params.membroEquipeId",
      "description": "the id of the MembroEquipe selected in pessoasEquipe",
      "organisms": [
        "cadastroPessoa",
        "pessoasEquipe"
      ]
    }
  },
  "journeys": [],
  "rules": [],
  "access": {
    "actors": [
      "gestor"
    ],
    "grants": [
      "gestorMembros"
    ]
  }
} as const;
