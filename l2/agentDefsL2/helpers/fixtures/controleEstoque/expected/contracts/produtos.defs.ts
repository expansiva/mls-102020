/// <mls fileReference="_102047_/l2/controleEstoque/web/contracts/produtos.defs.ts" enhancement="_blank"/>

export interface ProdutoLoad {
  id: string;
  details: {
    identification: {
      name: string;
      readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
    };
    product: {
      unitOfMeasure: string;
    };
    controleEstoque: {
      readonly saldoAtual: number;
      quantidadeMinima: number;
      readonly saldoAbaixoDoMinimo: boolean;
    };
  };
}

export interface ProdutoCadastrarProduto {
  id: string;
  details: {
    identification: {
      name: string;
    };
    product: {
      unitOfMeasure: string;
    };
    controleEstoque: {
      quantidadeMinima: number;
    };
  };
}

export interface ProdutosContracts {
  'controleEstoque.produtos.load': {
    kind: 'qry';
    input: { search?: string; page?: number; pageSize?: number };
    output: { produtos: ProdutoLoad[]; pageListaProdutos: number; pageSizeListaProdutos: number; hasMoreListaProdutos: boolean };
    rules: ['quantidadeMinimaValida', 'saldoAtualProduto', 'avisoSaldoMinimoProduto'];
    access: { actors: ['estoquista']; grants: ['gerenciarEstoque']; scope: 'organization' };
  };
  'controleEstoque.produtos.cadastrarProduto': {
    kind: 'cmd';
    writes: 'Produto.create';
    input: { details: { identification: { name: string }; product: { unitOfMeasure: string }; controleEstoque: { quantidadeMinima: number } } };
    output: { produto: ProdutoCadastrarProduto };
    rules: ['quantidadeMinimaValida', 'saldoAtualProduto', 'avisoSaldoMinimoProduto'];
    access: { actors: ['estoquista']; grants: ['gerenciarEstoque']; scope: 'organization' };
  };
}
