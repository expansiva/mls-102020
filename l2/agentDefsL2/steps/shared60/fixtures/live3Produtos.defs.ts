/// <mls fileReference="_102047_/l2/controleEstoque/web/shared/produtos.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "produtoId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "select:detalheProduto",
        "persist": true,
        "required": false
      },
      "search": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaProdutos",
        "persist": true,
        "required": true
      },
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaProdutos",
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
        "produtos"
      ]
    },
    "cadastrarProduto": {
      "kind": "cmd",
      "trigger": "cadastrarProduto",
      "returns": [
        "produto"
      ],
      "writes": "Produto.create"
    }
  },
  "states": {
    "listaProdutos": {
      "source": "load.produtos",
      "description": "Produtos carregados",
      "organisms": []
    },
    "filtroBuscaProdutos": {
      "source": "entry.params.search",
      "description": "Busca de produtos",
      "organisms": []
    },
    "paginaProdutos": {
      "source": "entry.params.page",
      "description": "Página de produtos",
      "organisms": []
    },
    "produtoSelecionado": {
      "source": "entry.params.produtoId",
      "description": "Produto selecionado",
      "organisms": []
    },
    "produtoCadastro": {
      "source": "cadastrarProduto.input",
      "description": "Dados do produto",
      "organisms": []
    },
    "produtoCadastrado": {
      "source": "cadastrarProduto.produto",
      "description": "Produto cadastrado",
      "organisms": []
    },
    "movimentacoesProduto": {
      "source": "abrirMovimentacoes",
      "description": "Produto para movimentações",
      "organisms": []
    }
  },
  "journeys": [
    {
      "step": "acompanharSaldos/consultarSaldos",
      "organisms": [
        "saldoAtual",
        "alertasSaldoBaixo"
      ]
    },
    {
      "step": "acompanharSaldos/localizarProdutos",
      "organisms": [
        "listaProdutos",
        "detalheProduto"
      ]
    },
    {
      "step": "cadastrarProduto/informarProduto",
      "organisms": [
        "formularioProduto",
        "acoesCadastro"
      ]
    },
    {
      "step": "registrarMovimentacaoEstoque/consultarSaldo",
      "organisms": [
        "saldoAtual",
        "detalheProduto"
      ]
    },
    {
      "step": "registrarMovimentacaoEstoque/localizarProduto",
      "organisms": [
        "listaProdutos",
        "detalheProduto"
      ]
    },
    {
      "step": "registrarMovimentacaoEstoque/registrarMovimentacao",
      "organisms": [
        "detalheProduto"
      ],
      "continuesIn": "movimentacoes"
    },
    {
      "step": "tratarAvisoSaldoBaixo/consultarProdutoAvisado",
      "organisms": [
        "alertasSaldoBaixo",
        "detalheProduto"
      ]
    }
  ],
  "rules": [
    "avisoSaldoMinimoProduto",
    "quantidadeMinimaValida",
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
