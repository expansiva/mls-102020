/// <mls fileReference="_102047_/l4/compras/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comprasRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "compras",
  "rules": {
    "solicitacaoCompletaParaEnviar": "A solicitação só segue para a pesquisa de opções se tiver produto, quantidade, justificativa e data de necessidade preenchidos; se faltar algo, volta ao comprador com as pendências.",
    "quantidadePositiva": "A quantidade da solicitação de compra deve ser maior que zero.",
    "pesquisaNaoAutoriza": "A pesquisa de opções por IA nunca autoriza a solicitação nem gera pedido de compra.",
    "maximoTresOpcoes": "A pesquisa grava no máximo três opções de fornecedor e preço para cada solicitação.",
    "autorizacaoExigeOpcao": "O gerente de compras só pode autorizar uma solicitação escolhendo uma das opções pesquisadas.",
    "opcaoDaMesmaSolicitacao": "A opção escolhida na autorização deve pertencer à própria solicitação que está sendo autorizada.",
    "apenasGerenteDecide": "Somente o gerente de compras pode autorizar ou rejeitar uma solicitação, e apenas quando ela está aguardando autorização.",
    "rejeicaoExigeMotivo": "A rejeição de uma solicitação exige que o gerente informe o motivo.",
    "recebimentoNaoExcedePedido": "A soma das quantidades recebidas de um pedido não pode ultrapassar a quantidade pedida.",
    "recebimentoAtualizaSituacaoPedido": "Ao registrar um recebimento, o pedido passa a recebido quando a soma recebida alcança a quantidade pedida e a parcialmente recebido quando ainda resta saldo.",
    "fornecedorCnpjObrigatorio": "Todo fornecedor deve ter CNPJ informado, e não pode haver dois fornecedores com o mesmo CNPJ.",
    "produtoInativoNaoSolicitado": "Um produto inativo no cadastro não pode ser escolhido em nova solicitação de compra.",
    "compradorEscolhidoDaListaDeUsuarios": "O comprador é sempre escolhido da lista de usuários da organização e nunca é cadastrado pelo módulo.",
    "compradorInativoNaoAbreSolicitacao": "Somente comprador ativo pode abrir solicitação de compra.",
    "produtoFornecidoUnicoPorFornecedor": "Um mesmo produto só pode ser associado uma vez a cada fornecedor.",
    "precoCombinadoPositivo": "O preço combinado de um produto fornecido deve ser maior que zero e ter moeda informada.",
    "opcaoMaximoTresPorSolicitacao": "Cada opção ocupa uma posição de 1 a 3 na solicitação, sem repetir posição, de modo que não existam mais de três opções por solicitação.",
    "opcaoSomenteEstimativa": "Toda opção pesquisada é marcada e exibida como estimativa e não gera compromisso de compra.",
    "opcaoFonteObrigatoria": "Toda opção deve guardar fornecedor, preço unitário, moeda, fonte e data da pesquisa; quando a fonte é a web, o endereço da página é obrigatório.",
    "opcaoPedidoOrigemQuandoCompraAnterior": "Quando a opção vem de uma compra anterior registrada no módulo, ela deve apontar o pedido de compra de origem.",
    "opcaoGravadaSomentePelaPesquisa": "Opções de cotação são gravadas apenas pela pesquisa do sistema e não são criadas nem alteradas manualmente pelos usuários.",
    "numeroPedidoSequencial": "Cada pedido de compra recebe um número sequencial único emitido pelo sistema na sua geração.",
    "pedidoSomenteDeSolicitacaoAutorizada": "Um pedido de compra só é gerado a partir de uma solicitação autorizada.",
    "pedidoUsaOpcaoEscolhida": "O pedido usa o fornecedor, o preço unitário, a moeda e o prazo da opção escolhida e o produto e a quantidade da solicitação, e sua data prevista de entrega é a data de emissão somada ao prazo de entrega da opção.",
    "umPedidoPorSolicitacao": "Cada solicitação autorizada gera no máximo um pedido de compra.",
    "lembreteEntregaEAtraso": "Enquanto o pedido não for totalmente recebido, a verificação diária lembra o almoxarife na data prevista de entrega e a cada dia de atraso, no máximo uma vez por dia.",
    "recebimentoSomentePedidoEmAberto": "Só é possível registrar recebimento de pedido em aberto ou parcialmente recebido.",
    "quantidadeRecebidaPositiva": "A quantidade de cada recebimento deve ser maior que zero.",
    "recebimentoNaoExcedeSaldo": "A quantidade de um recebimento não pode ser maior que o saldo a receber do pedido.",
    "recebimentoDaEntradaEstoque": "Cada recebimento registrado dá entrada no estoque da quantidade recebida do produto do pedido.",
    "pedidoAtrasadoAposDataPrevista": "Um pedido em aberto ou parcialmente recebido está atrasado quando a data prevista de entrega é anterior a hoje, e os dias de atraso são contados desde essa data.",
    "totalCompradoPorFornecedorNoMes": "O total comprado por fornecedor no mês é a soma de quantidade vezes preço unitário dos pedidos de compra gerados para esse fornecedor no mês.",
    "solicitacaoAguardandoAutorizacao": "Uma solicitação está aguardando autorização quando foi enviada, conferida e pesquisada e ainda não foi autorizada nem rejeitada pelo gerente."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type ComprasRulesType = typeof comprasRules;

export default comprasRules;
