/// <mls fileReference="_102047_/l2/controleEstoque/web/shared/movimentacoes.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "produtoId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:historicoMovimentacoes",
        "persist": true
      },
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:historicoMovimentacoes",
        "persist": true
      }
    }
  },
  "forms": {
    "formularioMovimentacao": {
      "organism": "formularioMovimentacao",
      "submit": "registrarMovimentacao"
    }
  },
  "requests": {
    "load": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "movimentacoes",
        "produtos"
      ]
    },
    "loadMovimentacoes": {
      "kind": "qry",
      "trigger": "loadMovimentacoes",
      "returns": [
        "movimentacoes"
      ]
    },
    "registrarMovimentacao": {
      "kind": "cmd",
      "trigger": "registrarMovimentacao",
      "returns": [
        "movimentacaoEstoque"
      ],
      "writes": "MovimentacaoEstoque.create"
    }
  },
  "states": {
    "movimentacoes": {
      "source": "load.movimentacoes",
      "description": "Histórico de movimentações de estoque."
    },
    "produtos": {
      "source": "load.produtos",
      "description": "Produtos com saldo e alertas de estoque."
    },
    "produtoId": {
      "source": "entry.params.produtoId",
      "description": "Produto usado para filtrar o histórico."
    },
    "page": {
      "source": "entry.params.page",
      "description": "Página atual do histórico de movimentações."
    },
    "movimentacaoEstoque": {
      "source": "registrarMovimentacao.input",
      "description": "Movimentação de estoque em preenchimento."
    },
    "movimentacaoEstoqueRegistrada": {
      "source": "registrarMovimentacao.movimentacaoEstoque",
      "description": "Movimentação de estoque registrada."
    }
  },
  "functions": {
    "load": {
      "description": "Carrega movimentações e produtos para consulta e registro.",
      "calls": "load",
      "sets": "movimentacoes",
      "updates": [
        "produtos"
      ]
    },
    "filterHistoricoMovimentacoes": {
      "description": "Recarrega o histórico desde a primeira página conforme o produto e a página informados.",
      "calls": "loadMovimentacoes",
      "sets": "movimentacoes"
    },
    "loadMoreHistoricoMovimentacoes": {
      "description": "Acrescenta a próxima página ao histórico de movimentações.",
      "calls": "loadMovimentacoes",
      "sets": "movimentacoes"
    },
    "registrarMovimentacao": {
      "description": "Registra a movimentação de estoque informada.",
      "calls": "registrarMovimentacao",
      "sets": "movimentacaoEstoqueRegistrada",
      "updates": [
        "movimentacoes"
      ]
    }
  },
  "journeys": [
    {
      "step": "registrarMovimentacaoEstoque/consultarSaldo",
      "organisms": [
        "historicoMovimentacoes",
        "formularioMovimentacao"
      ],
      "functions": [
        "load"
      ]
    },
    {
      "step": "registrarMovimentacaoEstoque/localizarProduto",
      "organisms": [
        "formularioMovimentacao",
        "historicoMovimentacoes"
      ],
      "functions": [
        "filterHistoricoMovimentacoes",
        "loadMoreHistoricoMovimentacoes"
      ]
    },
    {
      "step": "registrarMovimentacaoEstoque/registrarMovimentacao",
      "organisms": [
        "formularioMovimentacao",
        "confirmarMovimentacao"
      ],
      "functions": [
        "registrarMovimentacao"
      ],
      "continuesIn": "movimentacoes"
    }
  ],
  "rules": {
    "load": [
      "saldoAtualProduto",
      "avisoSaldoMinimoProduto"
    ],
    "loadMovimentacoes": [],
    "registrarMovimentacao": [
      "quantidadeMovimentadaPositiva",
      "registroMovimentacaoAtualizaSaldo"
    ]
  },
  "access": {
    "actors": [
      "estoquista"
    ],
    "grants": [
      "gerenciarEstoque"
    ]
  }
} as const;
