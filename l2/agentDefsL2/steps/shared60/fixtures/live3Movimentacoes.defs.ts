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
    "historicoMovimentacoes": {
      "source": "load.movimentacoes",
      "description": "Histórico de movimentações de estoque.",
      "organisms": []
    },
    "produtos": {
      "source": "load.produtos",
      "description": "Produtos e saldos de estoque.",
      "organisms": []
    },
    "produtoIdFiltro": {
      "source": "entry.params.produtoId",
      "description": "Produto selecionado para filtrar o histórico.",
      "organisms": []
    },
    "paginaHistorico": {
      "source": "entry.params.page",
      "description": "Página atual do histórico.",
      "organisms": []
    },
    "movimentacaoEstoqueFormulario": {
      "source": "registrarMovimentacao.input",
      "description": "Dados da movimentação em preenchimento.",
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
        "historicoMovimentacoes"
      ]
    },
    {
      "step": "registrarMovimentacaoEstoque/localizarProduto",
      "organisms": [
        "formularioMovimentacao"
      ]
    },
    {
      "step": "registrarMovimentacaoEstoque/registrarMovimentacao",
      "organisms": [
        "formularioMovimentacao",
        "acoesRegistro"
      ]
    }
  ],
  "rules": [
    "avisoSaldoMinimoProduto",
    "movimentacaoEstoqueImutavel",
    "quantidadeMinimaValida",
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
