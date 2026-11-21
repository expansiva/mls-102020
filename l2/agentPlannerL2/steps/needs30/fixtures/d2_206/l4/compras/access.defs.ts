/// <mls fileReference="_102047_/l4/compras/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comprasAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "compras",
  "actors": [
    {
      "actorId": "comprador",
      "kind": "internal",
      "origin": "named",
      "title": "Comprador",
      "description": "Cadastra fornecedores e os produtos que cada um fornece com preço combinado, abre e envia solicitações de compra e pesquisa solicitações e pedidos.",
      "personEntity": "Comprador"
    },
    {
      "actorId": "gerenteCompras",
      "kind": "internal",
      "origin": "named",
      "title": "Gerente de compras",
      "description": "Analisa as solicitações com as opções pesquisadas, autoriza escolhendo uma opção ou rejeita com motivo, pesquisa solicitações e pedidos e acompanha o painel de compras.",
      "personEntity": ""
    },
    {
      "actorId": "almoxarife",
      "kind": "internal",
      "origin": "named",
      "title": "Almoxarife",
      "description": "Recebe os lembretes de entrega e de atraso dos pedidos e registra o recebimento total ou parcial, dando entrada no estoque.",
      "personEntity": ""
    }
  ],
  "grants": [
    {
      "grantId": "compradorCadastros",
      "actorRef": "comprador",
      "title": "Cadastro de fornecedores e produtos",
      "description": "O comprador localiza, cria ou vincula fornecedores, seus contatos, produtos do catálogo e os produtos fornecidos com preço combinado.",
      "entityRefs": [
        "Fornecedor",
        "ContatoFornecedor",
        "Produto",
        "ProdutoFornecido"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os fornecedores, contatos, produtos e produtos fornecidos da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Registro completo, incluindo CNPJ, razão social, contatos e preço combinado."
      }
    },
    {
      "grantId": "compradorSolicitacoesPedidos",
      "actorRef": "comprador",
      "title": "Solicitações, opções e pedidos",
      "description": "O comprador abre e envia solicitações, consulta as opções pesquisadas por IA e pesquisa solicitações, pedidos e recebimentos por produto, fornecedor, situação e período.",
      "entityRefs": [
        "SolicitacaoCompra",
        "OpcaoCotacao",
        "PedidoCompra",
        "Recebimento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Solicitações, opções, pedidos e recebimentos de toda a organização, para a pesquisa de compras."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Registro completo das solicitações, opções, pedidos e recebimentos."
      }
    },
    {
      "grantId": "compradorProprioRegistro",
      "actorRef": "comprador",
      "title": "Meu registro de comprador",
      "description": "O comprador vê o próprio registro de comprador, com nome e e-mail de acesso.",
      "entityRefs": [
        "Comprador"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Apenas o registro do comprador da sessão.",
        "anchorEntity": "Comprador"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Registro completo do próprio comprador."
      }
    },
    {
      "grantId": "compradorListaCompradores",
      "actorRef": "comprador",
      "title": "Compradores nas solicitações",
      "description": "O comprador vê o nome de quem abriu cada solicitação ao pesquisar.",
      "entityRefs": [
        "Comprador"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Compradores da organização que aparecem nas solicitações."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Somente nome, situação e e-mail de acesso do comprador.",
        "allowedFields": [
          "Comprador.details.identification.name",
          "Comprador.details.identification.status",
          "Comprador.details.compras.loginEmail"
        ]
      }
    },
    {
      "grantId": "gerenteCadastrosConsulta",
      "actorRef": "gerenteCompras",
      "title": "Consulta de fornecedores e produtos",
      "description": "O gerente consulta fornecedores, contatos, produtos e preços combinados ao analisar solicitações e pedidos.",
      "entityRefs": [
        "Fornecedor",
        "ContatoFornecedor",
        "Produto",
        "ProdutoFornecido"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os fornecedores e produtos da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Registro completo para análise."
      }
    },
    {
      "grantId": "gerenteSolicitacoesPedidos",
      "actorRef": "gerenteCompras",
      "title": "Autorização e pesquisa de compras",
      "description": "O gerente analisa solicitações com as opções pesquisadas, autoriza escolhendo uma opção ou rejeita com motivo, e pesquisa solicitações, pedidos e recebimentos.",
      "entityRefs": [
        "SolicitacaoCompra",
        "OpcaoCotacao",
        "PedidoCompra",
        "Recebimento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todas as solicitações, opções, pedidos e recebimentos da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Registro completo, incluindo justificativa, opções, preços e recebimentos."
      }
    },
    {
      "grantId": "gerenteCompradores",
      "actorRef": "gerenteCompras",
      "title": "Compradores das solicitações",
      "description": "O gerente vê quem abriu cada solicitação.",
      "entityRefs": [
        "Comprador"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Compradores da organização."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Somente nome, situação e e-mail de acesso do comprador.",
        "allowedFields": [
          "Comprador.details.identification.name",
          "Comprador.details.identification.status",
          "Comprador.details.compras.loginEmail"
        ]
      }
    },
    {
      "grantId": "gerentePainel",
      "actorRef": "gerenteCompras",
      "title": "Painel de compras",
      "description": "O gerente acompanha solicitações aguardando autorização, pedidos em aberto e atrasados e o total comprado por fornecedor no mês.",
      "entityRefs": [
        "PainelCompras"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Indicadores de toda a organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Todos os totais do painel."
      }
    },
    {
      "grantId": "almoxarifeRecebimento",
      "actorRef": "almoxarife",
      "title": "Recebimento de pedidos",
      "description": "O almoxarife abre os pedidos a partir dos lembretes, confere o pedido e registra o recebimento total ou parcial, dando entrada no estoque.",
      "entityRefs": [
        "PedidoCompra",
        "Recebimento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Pedidos e recebimentos de toda a organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Registro completo do pedido e dos recebimentos."
      }
    },
    {
      "grantId": "almoxarifeFornecedorProduto",
      "actorRef": "almoxarife",
      "title": "Fornecedor e produto do pedido",
      "description": "O almoxarife identifica o fornecedor e o produto ao conferir a entrega.",
      "entityRefs": [
        "Fornecedor",
        "Produto"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Fornecedores e produtos da organização."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Somente identificação do fornecedor e dados do produto necessários à conferência.",
        "allowedFields": [
          "Fornecedor.details.identification.name",
          "Fornecedor.details.identification.docId",
          "Fornecedor.details.company.legalName",
          "Fornecedor.details.company.tradeName",
          "Produto.details.identification.name",
          "Produto.details.product.sku",
          "Produto.details.product.unitOfMeasure",
          "Produto.details.product.isInventoried"
        ]
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type ComprasAccessType = typeof comprasAccess;

export default comprasAccess;
