/// <mls fileReference="_102047_/l4/reembolsoDespesas/ontology/Colaborador.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasEntityColaborador = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "reembolsoDespesas",
  "entityId": "Colaborador",
  "title": "Colaborador",
  "description": "Pessoa colaboradora que registra, acompanha, corrige e reenvia as próprias despesas para reembolso.",
  "displayField": "details.identification.name",
  "relationships": {
    "despesaDoColaborador": {
      "relationshipId": "despesaDoColaborador",
      "to": "Despesa",
      "via": "Despesa.colaboradorId",
      "cardinality": "1:N",
      "title": "Despesas do colaborador",
      "description": "Despesas registradas pelo colaborador; cada uma pertence obrigatoriamente a este colaborador.",
      "mode": "fk",
      "direction": "to",
      "required": "Sempre que uma despesa for registrada.",
      "role": "colaborador"
    },
    "colaboradorReportaGestor": {
      "relationshipId": "colaboradorReportaGestor",
      "to": "GestorEquipe",
      "via": "ReportsTo",
      "cardinality": "N:1",
      "title": "Gestor da equipe",
      "description": "Vínculo ReportsTo pelo qual o colaborador se reporta ao gestor que pode avaliar suas despesas.",
      "roles": [
        "direct-report"
      ],
      "required": "Quando o colaborador estiver vinculado a uma equipe com gestor responsável."
    }
  },
  "capabilities": {
    "read.byId": "Consulta o colaborador pelo identificador mestre para apresentar seu nome e seus vínculos nas despesas · por mdmId no índice e no documento mestre · colaborador, gestor da equipe e financeiro.",
    "locate.byName": "Localiza um colaborador pelo nome ao associar ou conferir registros de reembolso · por busca textual no índice de pessoas · gestor da equipe e financeiro.",
    "locate.byDocument": "Localiza a pessoa pelo documento para evitar duplicidade ao habilitá-la como colaboradora · por tipo e número de documento no cadastro mestre · o módulo ao registrar ou vincular colaborador.",
    "register.createOrAttach": "Cria a pessoa quando ausente ou anexa o papel de Colaborador quando ela já existe · por documento ou contato, com a tag reembolsoDespesas.Colaborador · o módulo ao habilitar uma pessoa para registrar despesas.",
    "edit.platformFields": "Atualiza dados cadastrais de plataforma que identificam o colaborador · pela atualização do registro mestre e de seus índices · quem mantém o cadastro de colaboradores.",
    "edit.moduleNamespace": "Atualiza somente o espaço reembolsoDespesas do colaborador, que não possui dados adicionais neste caso · pela chave details.reembolsoDespesas do documento mestre · o módulo de reembolso de despesas.",
    "inactivate": "Inativa ou reativa o papel do colaborador sem excluir seu registro mestre · pela situação ativa ou inativa no MDM · quem mantém o cadastro de colaboradores.",
    "link": "Vincula o colaborador ao gestor responsável da equipe · pelo relacionamento versionado ReportsTo com papel direct-report · quem mantém a estrutura de equipes.",
    "unlink": "Encerra o vínculo vigente entre colaborador e gestor sem apagar seu histórico · pela inativação do relacionamento ReportsTo · quem mantém a estrutura de equipes.",
    "listLinks": "Exibe o gestor atual e o histórico de vínculos do colaborador · pela lista de relacionamentos mestre com papel e vigência · gestor da equipe e financeiro, quando necessário para consulta.",
    "invite.login": "Concede acesso para que a pessoa consulte e registre somente as próprias despesas · pelo convite que cria o identificador de login no índice da plataforma · quem habilita o colaborador no módulo.",
    "audit": "Consulta quem alterou o cadastro ou os vínculos do colaborador e quando · pelo log de auditoria do MDM · administração autorizada."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-person-privacy-consent-required-br-eu"
  ],
  "kind": "role",
  "subtype": "Person",
  "roleTag": "reembolsoDespesas.Colaborador",
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
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Registro mestre da pessoa colaboradora, com os dados da plataforma e o espaço próprio do módulo de reembolso de despesas.",
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
                    "title": "Pessoa",
                    "description": "Pessoa natural cadastrada na plataforma."
                  }
                ],
                "description": "Indica que este registro mestre é de uma pessoa.",
                "title": "Tipo de cadastro",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 0,
                "description": "Nome pelo qual o colaborador é reconhecido no registro de despesas e nas consultas.",
                "title": "Nome",
                "min": 0,
                "max": 0
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Ativo",
                    "description": "Registro disponível para uso."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo",
                    "description": "Registro fora de uso."
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado",
                    "description": "Registro unido a outro cadastro mestre."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Registro bloqueado pela plataforma."
                  }
                ],
                "title": "Situação do cadastro",
                "description": "Situação do registro mestre do colaborador na plataforma.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "SSN",
                    "title": "SSN",
                    "description": "Social Security Number."
                  },
                  {
                    "value": "EIN",
                    "title": "EIN",
                    "description": "Employer Identification Number."
                  },
                  {
                    "value": "Passport",
                    "title": "Passaporte",
                    "description": "Documento de viagem."
                  },
                  {
                    "value": "DriversLicense",
                    "title": "Carteira de motorista",
                    "description": "Documento de habilitação."
                  },
                  {
                    "value": "NationalId",
                    "title": "Documento nacional",
                    "description": "Documento nacional de identificação."
                  },
                  {
                    "value": "CPF",
                    "title": "CPF",
                    "description": "Cadastro de Pessoas Físicas."
                  },
                  {
                    "value": "CNPJ",
                    "title": "CNPJ",
                    "description": "Cadastro Nacional da Pessoa Jurídica."
                  },
                  {
                    "value": "VAT",
                    "title": "VAT",
                    "description": "Identificador tributário."
                  },
                  {
                    "value": "Other",
                    "title": "Outro",
                    "description": "Outro tipo de documento."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para deduplicar o colaborador no cadastro mestre.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento nacional do colaborador, usado na deduplicação do cadastro mestre.",
                "title": "Número do documento",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 0,
                "default": "US",
                "description": "Código ISO do país aplicável ao documento e às regras do colaborador.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação da pessoa usados para reconhecê-la, localizá-la e controlar sua atividade no cadastro mestre."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "relationshipRefs": {
                "type": "object",
                "required": true,
                "derived": true,
                "description": "Referências compactas, recalculadas pela plataforma, dos relacionamentos do colaborador, incluindo sua vinculação ao gestor.",
                "title": "Referências de relacionamentos",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados comuns do registro mestre necessários para consultar os vínculos organizacionais do colaborador."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados específicos de pessoa natural mantidos pela plataforma."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização para uso compartilhado entre módulos; este módulo apenas os consulta."
          },
          "reembolsoDespesas": {
            "type": "object",
            "owner": "module",
            "fields": {},
            "description": "Module namespace; the prompt asked for no data of this module about the record."
          }
        }
      }
    }
  }
} as const satisfies Ns5OntologyEntityV3;

export type ReembolsoDespesasEntityColaboradorType = typeof reembolsoDespesasEntityColaborador;

export default reembolsoDespesasEntityColaborador;
