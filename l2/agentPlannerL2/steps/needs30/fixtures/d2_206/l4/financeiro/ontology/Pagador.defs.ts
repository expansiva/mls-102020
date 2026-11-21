/// <mls fileReference="_102047_/l4/financeiro/ontology/Pagador.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const financeiroEntityPagador = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "financeiro",
  "entityId": "Pagador",
  "title": "Pagador",
  "description": "Pessoa responsável pelo pagamento dos títulos a receber; acessa o portal para ver os próprios títulos e recebimentos e pagar com cartão.",
  "displayField": "details.identification.name",
  "relationships": {
    "titulos": {
      "relationshipId": "tituloPagador",
      "to": "TituloReceber",
      "via": "TituloReceber.pagadorId",
      "cardinality": "1:N",
      "title": "Títulos a receber do pagador",
      "description": "Títulos pelos quais o pagador responde; base do portal e do extrato.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "recebimentos": {
      "relationshipId": "pagadorRecebimentos",
      "to": "Recebimento",
      "via": "TituloReceber",
      "cardinality": "1:N",
      "title": "Recebimentos do pagador",
      "description": "Recebimentos e estornos obtidos pelos títulos do pagador, exibidos no portal e no extrato.",
      "mode": "throughTable",
      "path": "Pagador <- TituloReceber.pagadorId <- Recebimento.tituloId",
      "derived": true
    }
  },
  "capabilities": {
    "read.byId": "Lê o pagador pelo mdmId para preencher nome e documento nas listas de títulos, recebimentos e no extrato; usado por caixa, gerente financeiro e pelo portal.",
    "locate.byName": "Localiza o pagador pelo nome digitado no índice da plataforma; usado pelo gerente financeiro ao emitir o extrato e pelo caixa ao receber.",
    "locate.byDocument": "Localiza o pagador pelo CPF ou outro documento nacional; usado pelo gerente financeiro no extrato e pela entrada de cobranças para deduplicar.",
    "register.createOrAttach": "Cria ou anexa o papel financeiro.Pagador quando um título chega de outro módulo (comanda, mensalidade, ordem de serviço), procurando primeiro pelo documento; feito pela integração de entrada.",
    "locate.byLogin": "Resolve o pagador logado pelo e-mail de login na tabela de tags, para o portal mostrar só os próprios títulos e recebimentos; usado pela plataforma na sessão.",
    "invite.login": "Dá ao pagador um login para acessar o portal de títulos e pagar com cartão; feito pela plataforma a pedido da equipe financeira.",
    "link.contact": "Vincula telefone, WhatsApp ou e-mail do pagador como canal de contato da plataforma, usado na cobrança de títulos vencidos; mantido pela plataforma.",
    "listLinks": "Mostra os vínculos do pagador (contatos e demais relações) na ficha consultada pelo gerente financeiro.",
    "inactivate": "Inativa o papel de pagador sem apagar o histórico de títulos, podendo ser reativado; usado pelo gerente financeiro.",
    "comment": "Registra observações de cobrança sobre o pagador, como acordos combinados; usado por caixa e gerente financeiro.",
    "tag": "Marca o pagador com rótulos do financeiro (ex.: inadimplente recorrente) para agrupamento; usado pelo gerente financeiro.",
    "audit": "Mostra quem alterou o cadastro do pagador e quando, pelo módulo de auditoria da plataforma; usado pelo gerente financeiro.",
    "financeiro.extratoPagador": "Reúne os títulos do pagador no período com seus recebimentos, estornos e saldo para exportar ou imprimir; usado pelo gerente financeiro."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
    "rule-delete-blocked-by-relationships",
    "rule-person-privacy-consent-required-br-eu",
    "pagadorVeApenasProprios"
  ],
  "writer": "inbound",
  "kind": "role",
  "subtype": "Person",
  "roleTag": "financeiro.Pagador",
  "source": "/_102034_/l4/ontology/mdm.defs.ts",
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "indexed": true,
        "derived": true,
        "description": "mdmId; stable through promotion and merge."
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true,
        "writePrecondition": true,
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Registro mestre da pessoa que responde pelo pagamento dos títulos a receber.",
        "fields": {
          "identification": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "subtype": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Person",
                    "title": "Pessoa"
                  }
                ],
                "description": "Sempre pessoa física neste papel.",
                "title": "Subtipo"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "Nome pelo qual o gerente financeiro localiza o pagador e que aparece nos títulos, recebimentos e no extrato.",
                "title": "Nome do pagador"
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  "Active",
                  "Inactive",
                  "Merged",
                  "Blocked"
                ],
                "title": "Situação no cadastro",
                "description": "Situação do registro mestre (ativo, inativo, mesclado, bloqueado), mantida pela plataforma."
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  "SSN",
                  "EIN",
                  "Passport",
                  "DriversLicense",
                  "NationalId",
                  "CPF",
                  "CNPJ",
                  "VAT",
                  "Other"
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional do pagador, usado para localizá-lo e deduplicar quando a cobrança chega de outro módulo."
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento do pagador (ex.: CPF), impresso no extrato e usado na busca do gerente.",
                "title": "Número do documento"
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "País ao qual pertencem o documento e as regras legais do pagador (ex.: BR para LGPD).",
                "title": "País"
              }
            },
            "description": "Chaves de índice da plataforma usadas para localizar o pagador no extrato e no portal."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "addresses": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "Address",
                "title": "Endereços",
                "description": "Endereços do pagador, exibidos no cabeçalho do extrato quando existirem."
              },
              "contacts": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "ContactSummary",
                "derived": true,
                "description": "Resumo dos canais de contato vinculados ao pagador, mantido pela plataforma; usado para entrar em contato sobre títulos vencidos.",
                "title": "Contatos"
              }
            },
            "description": "Dados comuns da plataforma lidos pelo financeiro."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimento LGPD do pagador para o tratamento dos dados de cobrança e acesso ao portal.",
                "title": "Consentimento de privacidade"
              }
            },
            "description": "Dados de pessoa física da plataforma."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização; o financeiro apenas lê."
          },
          "financeiro": {
            "type": "object",
            "owner": "module",
            "fields": {},
            "description": "Module namespace; the prompt asked for no data of this module about the record."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type FinanceiroEntityPagadorType = typeof financeiroEntityPagador;

export default financeiroEntityPagador;
