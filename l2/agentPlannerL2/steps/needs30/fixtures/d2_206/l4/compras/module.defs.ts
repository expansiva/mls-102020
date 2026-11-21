/// <mls fileReference="_102047_/l4/compras/module.defs.ts" enhancement="_blank"/>

import type { Ns5ModuleArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comprasModule = {
  "schemaVersion": "2026-09-10-ns5-module-v2",
  "moduleName": "compras",
  "title": "Compras",
  "userLanguage": "pt-BR",
  "productLanguages": [
    "pt-BR"
  ],
  "defaultLanguage": "pt-BR",
  "sourcePrompt": "criar o módulo compras em português. a organização compra de fornecedores (empresas com CNPJ, razão social, contato). o comprador cadastra fornecedores e quais produtos cada um fornece, com preço combinado. o comprador abre uma solicitação de compra com o produto, a quantidade, a justificativa e a data em que precisa, e envia. o sistema confere se a solicitação está completa. depois, o módulo usa IA para pesquisar até três opções de fornecedor e preço para a solicitação, na web e nas compras e fornecedores já registrados no módulo; cada opção guarda o fornecedor, o preço unitário, a moeda, o prazo de entrega, a fonte (endereço da página ou compra anterior) e a data da pesquisa, e aparece na solicitação como estimativa. a pesquisa nunca autoriza nem compra nada. o gerente de compras vê a solicitação com as opções pesquisadas e autoriza escolhendo uma opção, ou rejeita com motivo. autorizada, o sistema gera o pedido de compra para o fornecedor escolhido, com o produto, a quantidade e o preço. enquanto o pedido não chega, o sistema verifica todo dia e lembra o almoxarife na data prevista de entrega e a cada dia de atraso. quando o pedido chega, o almoxarife registra o recebimento (total ou parcial) e isso dá entrada no estoque dos produtos recebidos. o comprador e o gerente pesquisam solicitações e pedidos por produto, fornecedor, situação e período. o gerente vê o painel de solicitações aguardando autorização, pedidos em aberto e atrasados e o total comprado por fornecedor no mês. perfis: comprador, gerente de compras e almoxarife."
} as const satisfies Ns5Readonly<Ns5ModuleArtifact>;

export type ComprasModuleType = typeof comprasModule;

export default comprasModule;
