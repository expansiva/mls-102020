/// <mls fileReference="_102047_/l4/compras/module.defs.ts" enhancement="_blank"/>

import type { Ns5ModuleArtifact } from '/_102035_/l2/solution/types.js';

export const comprasModule = {
  "schemaVersion": "2026-09-10-ns5-module-v2",
  "moduleName": "compras",
  "title": "Compras",
  "userLanguage": "pt-BR",
  "productLanguages": [
    "pt-BR"
  ],
  "defaultLanguage": "pt-BR",
  "sourcePrompt": "criar o módulo compras em português. a organização compra de fornecedores (empresas com CNPJ, razão social, contato). o comprador cadastra fornecedores e quais produtos cada um fornece, com preço combinado. o comprador abre um pedido de compra para um fornecedor com um ou mais produtos, quantidade e preço, e envia; o gerente de compras aprova ou rejeita pedidos acima de um valor limite. quando o pedido chega, o almoxarife registra o recebimento (total ou parcial) e isso dá entrada no estoque dos produtos recebidos. o gerente vê o painel de pedidos em aberto, atrasados e o total comprado por fornecedor no mês. perfis: comprador, gerente de compras e almoxarife."
} as const satisfies Ns5ModuleArtifact;

export type ComprasModuleType = typeof comprasModule;

export default comprasModule;
