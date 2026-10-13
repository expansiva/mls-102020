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
    "loadProdutos": {
      "kind": "qry",
      "trigger": "loadProdutos",
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
    "produtos": {
      "source": "load.produtos",
      "description": "Produtos para saldos e avisos.",
      "organisms": []
    },
    "listaProdutos": {
      "source": "loadProdutos.produtos",
      "description": "Produtos da lista paginada.",
      "organisms": []
    },
    "produtoSelecionado": {
      "source": "entry.params.produtoId",
      "description": "Produto selecionado.",
      "organisms": []
    },
    "buscaProdutos": {
      "source": "entry.params.search",
      "description": "Busca de produtos.",
      "organisms": []
    },
    "paginaProdutos": {
      "source": "entry.params.page",
      "description": "Página da lista de produtos.",
      "organisms": []
    },
    "produtoCadastro": {
      "source": "cadastrarProduto.input",
      "description": "Dados do produto em cadastro.",
      "organisms": []
    },
    "produtoCadastrado": {
      "source": "cadastrarProduto.produto",
      "description": "Produto cadastrado.",
      "organisms": []
    }
  },
  "journeys": [
    {
      "step": "acompanharSaldos/consultarSaldos",
      "organisms": [
        "saldosResumo",
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
        "formularioCadastro",
        "acoesCadastro"
      ]
    },
    {
      "step": "registrarMovimentacaoEstoque/consultarSaldo",
      "organisms": [
        "detalheProduto"
      ],
      "continuesIn": "movimentacoes"
    },
    {
      "step": "registrarMovimentacaoEstoque/localizarProduto",
      "organisms": [
        "listaProdutos",
        "detalheProduto"
      ],
      "continuesIn": "movimentacoes"
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
