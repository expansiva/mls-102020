/// <mls fileReference="_102047_/l4/mensalidadesAcademia/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "mensalidadesAcademia",
  "actors": [
    {
      "actorId": "recepcao",
      "kind": "internal",
      "origin": "named",
      "title": "Recepção",
      "description": "Matricula alunos em planos a partir de uma data e registra os pagamentos das mensalidades (data, valor e forma).",
      "personEntity": "Recepcao"
    },
    {
      "actorId": "gerencia",
      "kind": "internal",
      "origin": "named",
      "title": "Gerência",
      "description": "Gera mensalidades do mês para todos os alunos ativos e acompanha o painel com total a receber, total recebido e quantidade de alunos ativos, bloqueados e inadimplentes.",
      "personEntity": ""
    }
  ],
  "grants": [
    {
      "grantId": "recepcaoAlunos",
      "actorRef": "recepcao",
      "title": "Cadastro de alunos",
      "description": "A recepção localiza o aluno por nome ou documento e cria o cadastro na matrícula quando ele ainda não existe.",
      "entityRefs": [
        "Aluno"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os alunos da academia, pois qualquer aluno pode chegar à recepção."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Cadastro completo do aluno, incluindo identificação, contatos, consentimento e situação de bloqueio."
      }
    },
    {
      "grantId": "recepcaoPlanos",
      "actorRef": "recepcao",
      "title": "Consulta de planos",
      "description": "A recepção consulta os planos para escolher o plano da matrícula e conferir valor e dia de vencimento.",
      "entityRefs": [
        "Plano"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os planos oferecidos pela academia."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Todos os dados do plano."
      }
    },
    {
      "grantId": "recepcaoMatriculas",
      "actorRef": "recepcao",
      "title": "Matrículas, mensalidades e pagamentos",
      "description": "A recepção registra e cancela matrículas, verifica a liberação de entrada, consulta mensalidades e registra pagamentos.",
      "entityRefs": [
        "Matricula",
        "Mensalidade",
        "Pagamento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todas as matrículas, mensalidades e pagamentos da academia, para atender qualquer aluno no balcão."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Registros completos, incluindo situação calculada de vencimento e bloqueio."
      }
    },
    {
      "grantId": "recepcaoProprioCadastro",
      "actorRef": "recepcao",
      "title": "Meu cadastro de atendente",
      "description": "O atendente da recepção consulta o próprio cadastro.",
      "entityRefs": [
        "Recepcao"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente o cadastro do atendente que está conectado.",
        "anchorEntity": "Recepcao"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Todo o próprio cadastro."
      }
    },
    {
      "grantId": "gerenciaPlanos",
      "actorRef": "gerencia",
      "title": "Gestão de planos",
      "description": "A gerência cadastra e consulta os planos mensal, trimestral e anual com valor e dia de vencimento.",
      "entityRefs": [
        "Plano"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os planos da academia."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Todos os dados do plano."
      }
    },
    {
      "grantId": "gerenciaMensalidades",
      "actorRef": "gerencia",
      "title": "Geração e acompanhamento de mensalidades",
      "description": "A gerência confere as matrículas ativas, gera as mensalidades do mês e acompanha mensalidades vencidas e pagamentos.",
      "entityRefs": [
        "Matricula",
        "Mensalidade",
        "Pagamento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todas as matrículas, mensalidades e pagamentos da academia."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Registros completos."
      }
    },
    {
      "grantId": "gerenciaAlunos",
      "actorRef": "gerencia",
      "title": "Alunos inadimplentes",
      "description": "A gerência identifica os alunos nas listas de mensalidades e de inadimplentes, sem acessar dados pessoais desnecessários.",
      "entityRefs": [
        "Aluno"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os alunos da academia."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Nome, situação do cadastro e indicadores de inadimplência e bloqueio do aluno.",
        "allowedFields": [
          "Aluno.details.identification.name",
          "Aluno.details.identification.status",
          "Aluno.details.mensalidadesAcademia"
        ]
      }
    },
    {
      "grantId": "gerenciaPainel",
      "actorRef": "gerencia",
      "title": "Painel financeiro",
      "description": "A gerência acompanha o total a receber e recebido no mês e as quantidades de alunos ativos, bloqueados e inadimplentes.",
      "entityRefs": [
        "PainelMensalidades"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Painel de toda a academia, por mês de referência."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Todos os totais e quantidades do painel."
      }
    },
    {
      "grantId": "gerenciaAtendentes",
      "actorRef": "gerencia",
      "title": "Cadastro de atendentes da recepção",
      "description": "A gerência mantém o cadastro das pessoas que trabalham na recepção.",
      "entityRefs": [
        "Recepcao"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os atendentes da recepção da academia."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Cadastro completo do atendente."
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type MensalidadesAcademiaAccessType = typeof mensalidadesAcademiaAccess;

export default mensalidadesAcademiaAccess;
