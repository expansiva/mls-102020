/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/Aluno.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityAluno = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "mensalidadesAcademia",
  "entityId": "Aluno",
  "title": "Aluno",
  "description": "Pessoa matriculada na academia. O cadastro é o registro mestre de pessoa da organização; a situação de bloqueio é derivada das mensalidades vencidas da matrícula.",
  "displayField": "details.identification.name",
  "relationships": {
    "matriculas": {
      "relationshipId": "matriculaAluno",
      "to": "Matricula",
      "via": "Matricula.alunoId",
      "cardinality": "1:N",
      "title": "Matrículas do aluno",
      "description": "Matrículas do aluno em planos ao longo do tempo.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "mensalidades": {
      "relationshipId": "alunoMensalidades",
      "to": "Mensalidade",
      "via": "Matricula",
      "cardinality": "1:N",
      "title": "Mensalidades do aluno",
      "description": "Mensalidades geradas para as matrículas do aluno.",
      "mode": "throughTable",
      "path": "Aluno <- Matricula.alunoId <- Mensalidade.matriculaId",
      "derived": true
    }
  },
  "capabilities": {
    "read.byId": "Lê o cadastro do aluno pelo id quando a matrícula, a mensalidade ou o pagamento já apontam para ele; usado pela recepção e pela gerência.",
    "locate.byName": "A recepção busca o aluno pelo nome ao iniciar a matrícula ou registrar um pagamento.",
    "locate.byDocument": "A recepção busca o aluno pelo CPF para evitar cadastro duplicado antes de matricular.",
    "locate.byContact": "A recepção encontra o aluno pelo telefone ou e-mail quando ele entra em contato sobre mensalidades.",
    "register.createOrAttach": "Na matrícula, a recepção cria o cadastro da pessoa se ainda não existir e a marca como aluno da academia.",
    "edit.platformFields": "A recepção corrige nome, documento, endereço e consentimento LGPD do aluno.",
    "inactivate": "A recepção inativa o cadastro do aluno que deixou a academia, podendo reativá-lo numa nova matrícula.",
    "link.contact": "A recepção registra telefone, WhatsApp ou e-mail do aluno como canais de contato vinculados, usados em avisos de cobrança.",
    "listLinks": "A tela do aluno mostra seus vínculos e contatos com vigência.",
    "attach.document": "A recepção anexa ao aluno documentos como a ficha de matrícula assinada ou a foto.",
    "comment": "Recepção e gerência deixam observações no cadastro do aluno, como acordos de regularização.",
    "statusHistory.read": "A gerência consulta quando o cadastro do aluno foi ativado ou inativado e por quem.",
    "audit": "A gerência verifica quem alterou o cadastro do aluno e quando.",
    "mensalidadesAcademia.consultarBloqueio": "A recepção consulta, na entrada, se o aluno está bloqueado por duas ou mais mensalidades vencidas, calculado a partir das mensalidades das suas matrículas."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
    "rule-person-privacy-consent-required-br-eu",
    "rule-delete-blocked-by-relationships",
    "mensalidadeVencidaAposVencimento",
    "alunoBloqueadoComDuasVencidas",
    "alunoBloqueadoNaoEntra"
  ],
  "kind": "role",
  "subtype": "Person",
  "roleTag": "mensalidadesAcademia.Aluno",
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
        "description": "Registro mestre de pessoa da organização, visto pela academia como aluno.",
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
                "description": "Sempre pessoa: o aluno é uma pessoa física.",
                "title": "Subtipo"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "Nome pelo qual a recepção localiza o aluno na matrícula e no registro de pagamentos.",
                "title": "Nome"
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Ativo"
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo"
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado"
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado"
                  }
                ],
                "title": "Situação do cadastro",
                "description": "Situação do registro mestre (ativo ou inativo); não é a situação de bloqueio por mensalidades, que é calculada."
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "CPF",
                    "title": "CPF"
                  },
                  {
                    "value": "Passport",
                    "title": "Passaporte"
                  },
                  {
                    "value": "NationalId",
                    "title": "Documento de identidade"
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para não cadastrar o mesmo aluno duas vezes."
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento, usado pela recepção para buscar o aluno antes de criar o cadastro.",
                "title": "Número do documento"
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "País do documento e das regras legais aplicáveis ao aluno (ISO 3166-1 alfa-2).",
                "title": "País"
              },
              "createdAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Cadastrado em",
                "description": "Momento em que o cadastro foi criado."
              },
              "updatedAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Atualizado em",
                "description": "Momento da última alteração do cadastro."
              }
            },
            "description": "Dados de identificação do aluno, mantidos pela organização."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "aliases": {
                "type": "string",
                "required": true,
                "collection": true,
                "description": "Apelidos ou nomes sociais pelos quais o aluno também é conhecido na recepção.",
                "title": "Outros nomes"
              },
              "addresses": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "Address",
                "title": "Endereços",
                "description": "Endereços do aluno."
              },
              "contacts": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "ContactSummary",
                "derived": true,
                "description": "Resumo dos canais de contato (telefone, WhatsApp, e-mail) vinculados ao aluno, usado para avisos de cobrança.",
                "title": "Contatos"
              },
              "relationshipRefs": {
                "type": "object",
                "required": true,
                "derived": true,
                "description": "Chaves compactas dos vínculos do aluno, recalculadas pela plataforma.",
                "title": "Vínculos"
              }
            },
            "description": "Dados comuns a todo registro mestre."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "birthDate": {
                "type": "date",
                "title": "Data de nascimento",
                "description": "Data de nascimento do aluno."
              },
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimento de tratamento de dados do aluno, exigido pela LGPD para alunos residentes no Brasil.",
                "title": "Consentimento LGPD",
                "required": true
              }
            },
            "description": "Dados de pessoa física do aluno."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização; a academia apenas lê."
          },
          "mensalidadesAcademia": {
            "type": "object",
            "owner": "module",
            "fields": {
              "inadimplente": {
                "type": "boolean",
                "derived": true,
                "title": "Inadimplente",
                "description": "Verdadeiro quando o aluno tem ao menos uma mensalidade em aberto com vencimento anterior a hoje, considerando as mensalidades das suas matrículas."
              },
              "bloqueado": {
                "type": "boolean",
                "derived": true,
                "title": "Bloqueado",
                "description": "Verdadeiro quando o aluno tem duas ou mais mensalidades vencidas (em aberto e com vencimento anterior a hoje); deixa de estar bloqueado assim que regulariza os pagamentos."
              },
              "quantidadeMensalidadesVencidas": {
                "type": "integer",
                "derived": true,
                "title": "Mensalidades vencidas",
                "description": "Quantidade de mensalidades do aluno em aberto com vencimento anterior a hoje."
              }
            },
            "description": "Espaço do módulo sobre o aluno; vazio, pois matrícula, mensalidades e pagamentos são registrados nas entidades próprias do módulo."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type MensalidadesAcademiaEntityAlunoType = typeof mensalidadesAcademiaEntityAluno;

export default mensalidadesAcademiaEntityAluno;
