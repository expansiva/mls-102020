/// <mls fileReference="_102047_/l4/mensalidadesAcademia/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "mensalidadesAcademia",
  "actors": [
    {
      "actorId": "recepcao",
      "kind": "internal",
      "origin": "named",
      "title": "Recepção",
      "description": "Matricula alunos em planos e registra pagamentos de mensalidades."
    },
    {
      "actorId": "gerencia",
      "kind": "internal",
      "origin": "named",
      "title": "Gerência",
      "description": "Gera mensalidades mensais e acompanha os indicadores financeiros e de alunos."
    },
    {
      "actorId": "aluno",
      "kind": "external",
      "origin": "named",
      "title": "Aluno",
      "description": "Cancela a própria matrícula."
    }
  ],
  "grants": [
    {
      "grantId": "recepcaoGerenciarCadastrosEcobrancas",
      "actorRef": "recepcao",
      "title": "Gerenciar planos, matrículas e pagamentos",
      "description": "Permite à recepção consultar e manter os planos, registrar matrículas e consultar mensalidades para registrar os pagamentos recebidos em toda a academia.",
      "entityRefs": [
        "Plano",
        "Matricula",
        "Mensalidade",
        "Pagamento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os registros de planos, matrículas, mensalidades e pagamentos de toda a organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "A recepção visualiza todos os campos dos planos, matrículas, mensalidades e pagamentos necessários para efetuar matrículas e registrar recebimentos."
      }
    },
    {
      "grantId": "recepcaoLocalizarAluno",
      "actorRef": "recepcao",
      "title": "Localizar alunos para matrícula",
      "description": "Permite à recepção localizar ou cadastrar o aluno necessário para realizar uma matrícula.",
      "entityRefs": [
        "Aluno"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os cadastros de alunos da organização necessários para a matrícula."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "A recepção visualiza os dados de identificação e os dados básicos do aluno necessários para localizá-lo ou cadastrá-lo, sem acesso aos demais ramos do registro mestre.",
        "allowedFields": [
          "Aluno.details.identification",
          "Aluno.details.base"
        ]
      }
    },
    {
      "grantId": "gerenciaGerarMensalidades",
      "actorRef": "gerencia",
      "title": "Gerar mensalidades mensais",
      "description": "Permite à gerência consultar planos e matrículas ativas e gerar as mensalidades mensais da academia.",
      "entityRefs": [
        "Plano",
        "Matricula",
        "Mensalidade"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os planos, matrículas e mensalidades de toda a organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "A gerência visualiza todos os campos dos planos, matrículas e mensalidades necessários para a geração mensal das cobranças."
      }
    },
    {
      "grantId": "gerenciaAcompanharIndicadores",
      "actorRef": "gerencia",
      "title": "Acompanhar indicadores da academia",
      "description": "Permite à gerência consultar os totais financeiros e as quantidades mensais de alunos ativos, bloqueados e inadimplentes.",
      "entityRefs": [
        "IndicadoresAcademia"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os indicadores mensais consolidados de toda a organização."
      },
      "disclosure": {
        "mode": "aggregateOnly",
        "description": "A gerência visualiza somente o período e as medidas consolidadas dos indicadores, sem acesso a registros individuais por meio deste acesso.",
        "allowedFields": [
          "IndicadoresAcademia.period",
          "IndicadoresAcademia.details"
        ]
      }
    },
    {
      "grantId": "alunoCancelarPropriaMatricula",
      "actorRef": "aluno",
      "title": "Cancelar própria matrícula",
      "description": "Permite ao aluno consultar e cancelar somente a própria matrícula.",
      "entityRefs": [
        "Matricula"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Abrange exclusivamente as matrículas que alcançam o cadastro de aluno correspondente ao login da sessão.",
        "anchorEntity": "Aluno"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "O aluno visualiza o plano vinculado, a situação, a data de início e a eventual data de cancelamento de sua própria matrícula.",
        "allowedFields": [
          "Matricula.planoId",
          "Matricula.status",
          "Matricula.dataInicio",
          "Matricula.details.dataCancelamento"
        ]
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type MensalidadesAcademiaAccessType = typeof mensalidadesAcademiaAccess;

export default mensalidadesAcademiaAccess;
