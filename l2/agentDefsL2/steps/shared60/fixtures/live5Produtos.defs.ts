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
        "persist": true
      },
      "search": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaProdutos",
        "persist": true
      },
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaProdutos",
        "persist": true
      }
    }
  },
  "forms": {
    "formularioCadastro": {
      "organism": "formularioCadastro",
      "submit": "cadastrarProduto"
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
      "description": "Produtos para saldos e avisos."
    },
    "listaProdutos": {
      "source": "loadProdutos.produtos",
      "description": "Produtos da lista paginada."
    },
    "produtoSelecionado": {
      "source": "entry.params.produtoId",
      "description": "Produto selecionado."
    },
    "buscaProdutos": {
      "source": "entry.params.search",
      "description": "Busca de produtos."
    },
    "paginaProdutos": {
      "source": "entry.params.page",
      "description": "Página da lista de produtos."
    },
    "produtoCadastro": {
      "source": "cadastrarProduto.input",
      "description": "Dados do produto em cadastro."
    },
    "produtoCadastrado": {
      "source": "cadastrarProduto.produto",
      "description": "Produto cadastrado."
    }
  },
  "functions": {
    "load": {
      "description": "Carrega produtos para consulta de saldos e avisos.",
      "calls": "load",
      "sets": "produtos"
    },
    "filterListaProdutos": {
      "description": "Recarrega a lista de produtos conforme busca e página.",
      "calls": "loadProdutos",
      "sets": "listaProdutos"
    },
    "loadMoreListaProdutos": {
      "description": "Anexa a próxima página de produtos à lista.",
      "calls": "loadProdutos",
      "sets": "listaProdutos"
    },
    "cadastrarProduto": {
      "description": "Cadastra o produto informado.",
      "calls": "cadastrarProduto",
      "sets": "produtoCadastrado",
      "updates": [
        "produtos",
        "listaProdutos"
      ]
    },
    "abrirMovimentacoes": {
      "description": "Abre as movimentações do produto selecionado.",
      "navigate": "movimentacoes",
      "carries": {
        "produtoId": "produtoSelecionado.id"
      }
    }
  },
  "journeys": [
    {
      "step": "acompanharSaldos/consultarSaldos",
      "organisms": [
        "saldosResumo",
        "alertasSaldoBaixo"
      ],
      "functions": [
        "load"
      ]
    },
    {
      "step": "acompanharSaldos/localizarProdutos",
      "organisms": [
        "listaProdutos",
        "detalheProduto"
      ],
      "functions": [
        "filterListaProdutos",
        "loadMoreListaProdutos",
        "abrirMovimentacoes"
      ]
    },
    {
      "step": "cadastrarProduto/informarProduto",
      "organisms": [
        "formularioCadastro",
        "acoesCadastro"
      ],
      "functions": [
        "cadastrarProduto"
      ]
    },
    {
      "step": "registrarMovimentacaoEstoque/consultarSaldo",
      "organisms": [
        "detalheProduto"
      ],
      "functions": [
        "abrirMovimentacoes"
      ],
      "continuesIn": "movimentacoes"
    },
    {
      "step": "registrarMovimentacaoEstoque/localizarProduto",
      "organisms": [
        "listaProdutos",
        "detalheProduto"
      ],
      "functions": [
        "abrirMovimentacoes"
      ],
      "continuesIn": "movimentacoes"
    },
    {
      "step": "registrarMovimentacaoEstoque/registrarMovimentacao",
      "organisms": [
        "detalheProduto"
      ],
      "functions": [
        "abrirMovimentacoes"
      ],
      "continuesIn": "movimentacoes"
    },
    {
      "step": "tratarAvisoSaldoBaixo/consultarProdutoAvisado",
      "organisms": [
        "alertasSaldoBaixo",
        "detalheProduto"
      ],
      "functions": []
    }
  ],
  "rules": {
    "load": [
      "saldoAtualProduto",
      "avisoSaldoMinimoProduto"
    ],
    "loadProdutos": [
      "saldoAtualProduto"
    ],
    "cadastrarProduto": [
      "quantidadeMinimaValida",
      "saldoAtualProduto",
      "avisoSaldoMinimoProduto"
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
