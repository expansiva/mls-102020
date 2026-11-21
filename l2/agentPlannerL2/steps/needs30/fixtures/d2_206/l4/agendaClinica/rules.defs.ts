/// <mls fileReference="_102047_/l4/agendaClinica/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agendaClinicaRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "agendaClinica",
  "rules": {
    "transicaoConsultaValida": "A consulta só pode transitar de agendada para confirmada, de agendada ou confirmada para falta, ou de agendada ou confirmada para atendida.",
    "anotacaoObrigatoriaNoAtendimento": "O registro de uma consulta como atendida exige uma anotação do atendimento.",
    "consultaSemConflito": "Não podem existir duas consultas para o mesmo profissional na mesma data e horário."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type AgendaClinicaRulesType = typeof agendaClinicaRules;

export default agendaClinicaRules;
