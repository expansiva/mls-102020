/// <mls fileReference="_102047_/l4/compras/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const comprasAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "compras",
  "actors": [
    {
      "actorId": "comprador",
      "kind": "internal",
      "origin": "named",
      "title": "Comprador",
      "description": "Cadastra fornecedores e suas condições de fornecimento, abre pedidos de compra e os envia."
    },
    {
      "actorId": "gerenteCompras",
      "kind": "internal",
      "origin": "named",
      "title": "Gerente de compras",
      "description": "Aprova ou rejeita pedidos de compra acima do valor limite e acompanha os indicadores de compras."
    },
    {
      "actorId": "almoxarife",
      "kind": "internal",
      "origin": "named",
      "title": "Almoxarife",
      "description": "Registra o recebimento total ou parcial dos pedidos de compra."
    }
  ],
  "grants": [
    {
      "grantId": "compradorPerfilProprio",
      "actorRef": "comprador",
      "title": "Consultar próprio cadastro de comprador",
      "description": "Permite ao comprador consultar o seu próprio cadastro mestre vinculado ao módulo de compras.",
      "entityRefs": [
        "Buyer"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente o registro de pessoa compradora correspondente ao login da sessão.",
        "anchorEntity": "Buyer"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O comprador pode consultar integralmente o seu próprio registro de comprador."
      }
    },
    {
      "grantId": "compradorCadastrosDeCompra",
      "actorRef": "comprador",
      "title": "Cadastrar fornecedores e consultar produtos",
      "description": "Permite ao comprador cadastrar ou vincular fornecedores e seus canais de contato, além de consultar produtos disponíveis para compra.",
      "entityRefs": [
        "Supplier",
        "SupplierContact",
        "Product"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os cadastros de fornecedores, canais de contato e produtos da organização necessários às compras."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O comprador pode consultar integralmente os dados cadastrais necessários de fornecedores, contatos e produtos."
      }
    },
    {
      "grantId": "compradorCondicoesProprias",
      "actorRef": "comprador",
      "title": "Gerir próprias condições de fornecimento",
      "description": "Permite ao comprador registrar e consultar as condições comerciais que cadastrou para fornecedores e produtos.",
      "entityRefs": [
        "SupplierOffering"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente condições de fornecimento vinculadas ao cadastro de comprador correspondente ao login da sessão.",
        "anchorEntity": "Buyer"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O comprador pode consultar integralmente as próprias condições de fornecimento, incluindo fornecedor, produto e preço combinado."
      }
    },
    {
      "grantId": "compradorPedidosDeCompra",
      "actorRef": "comprador",
      "title": "Abrir e enviar pedidos de compra",
      "description": "Permite ao comprador abrir, consultar e enviar pedidos de compra da organização.",
      "entityRefs": [
        "PurchaseOrder"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os pedidos de compra da organização necessários para abertura e envio."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O comprador pode consultar integralmente os pedidos de compra, seus itens, valores e situação."
      }
    },
    {
      "grantId": "gerentePedidosDeCompra",
      "actorRef": "gerenteCompras",
      "title": "Decidir e acompanhar pedidos de compra",
      "description": "Permite ao gerente de compras consultar pedidos, fornecedores e produtos para aprovar ou rejeitar pedidos acima do limite.",
      "entityRefs": [
        "PurchaseOrder",
        "Supplier",
        "Product"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os pedidos de compra e os cadastros relacionados de toda a organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O gerente de compras pode consultar integralmente os pedidos, fornecedores e produtos necessários à decisão."
      }
    },
    {
      "grantId": "gerenteIndicadoresDeCompras",
      "actorRef": "gerenteCompras",
      "title": "Consultar indicadores de compras",
      "description": "Permite ao gerente de compras acompanhar os indicadores mensais de pedidos em aberto, atrasados e total comprado por fornecedor.",
      "entityRefs": [
        "PurchaseOrderDashboard"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os indicadores agregados de compras de toda a organização."
      },
      "disclosure": {
        "mode": "aggregateOnly",
        "description": "O gerente visualiza somente o período, o fornecedor agrupado e as medidas agregadas do painel.",
        "allowedFields": [
          "PurchaseOrderDashboard.period",
          "PurchaseOrderDashboard.groupKey",
          "PurchaseOrderDashboard.details"
        ]
      }
    },
    {
      "grantId": "almoxarifeRecebimentos",
      "actorRef": "almoxarife",
      "title": "Registrar recebimentos de mercadorias",
      "description": "Permite ao almoxarife consultar pedidos e produtos e registrar recebimentos totais ou parciais.",
      "entityRefs": [
        "PurchaseOrder",
        "GoodsReceipt",
        "Product"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os pedidos, produtos e recebimentos da organização necessários para a conferência e entrada de mercadorias."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O almoxarife pode consultar integralmente os pedidos, produtos e registros de recebimento necessários ao trabalho de almoxarifado."
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type ComprasAccessType = typeof comprasAccess;

export default comprasAccess;
