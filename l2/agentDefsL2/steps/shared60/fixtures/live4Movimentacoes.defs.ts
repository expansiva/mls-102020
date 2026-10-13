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
        "persist": true,
        "required": true
      },
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:historicoMovimentacoes",
        "persist": true,
        "required": false
      }
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
      "description": "Histórico de movimentações de estoque.",
      "organisms": []
    },
    "produtos": {
      "source": "load.produtos",
      "description": "Produtos com saldo e alertas de estoque.",
      "organisms": []
    },
    "produtoId": {
      "source": "entry.params.produtoId",
      "description": "Produto usado para filtrar o histórico.",
      "organisms": []
    },
    "page": {
      "source": "entry.params.page",
      "description": "Página atual do histórico de movimentações.",
      "organisms": []
    },
    "movimentacaoEstoque": {
      "source": "registrarMovimentacao.input",
      "description": "Movimentação de estoque em preenchimento.",
      "organisms": []
    },
    "movimentacaoEstoqueRegistrada": {
      "source": "registrarMovimentacao.movimentacaoEstoque",
      "description": "Movimentação de estoque registrada.",
      "organisms": []
    }
  },
  "journeys": [
    {
      "step": "registrarMovimentacaoEstoque/consultarSaldo",
      "organisms": [
        "historicoMovimentacoes",
        "formularioMovimentacao"
      ]
    },
    {
      "step": "registrarMovimentacaoEstoque/localizarProduto",
      "organisms": [
        "formularioMovimentacao",
        "historicoMovimentacoes"
      ]
    },
    {
      "step": "registrarMovimentacaoEstoque/registrarMovimentacao",
      "organisms": [
        "formularioMovimentacao",
        "confirmarMovimentacao"
      ],
      "continuesIn": "movimentacoes"
    }
  ],
  "rules": [
    "avisoSaldoMinimoProduto",
    "quantidadeMovimentadaPositiva",
    "registroMovimentacaoAtualizaSaldo",
    "saldoAtualProduto"
  ],
  "access": {
    "actors": [
      "estoquista"
    ],
    "grants": [
      "gerenciarEstoque"
    ]
  }
} as const;
