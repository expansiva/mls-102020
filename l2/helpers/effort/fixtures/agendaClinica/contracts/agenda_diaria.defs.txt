/// <mls fileReference="_102047_/l2/agendaClinica/web/contracts/agenda_diaria.defs.ts" enhancement="_blank"/>

/** Identificação do paciente relacionada à consulta exibida na agenda. */
export interface PacienteIdentificacao {
  details: {
    identification: {
      name: string;
    };
  };
}

/** Paciente resolvido da relação da consulta, nos campos autorizados para o profissional. */
export interface PacienteDaConsulta {
  id: string;
  details: PacienteIdentificacao;
}

/** Identificação do profissional responsável pela consulta. */
export interface ProfissionalIdentificacao {
  details: {
    identification: {
      name: string;
    };
  };
}

/** Profissional resolvido da relação da consulta, nos campos autorizados para a própria agenda. */
export interface ProfissionalDaConsulta {
  id: string;
  details: ProfissionalIdentificacao;
}

/** Detalhes clínicos da consulta necessários para exibir ou registrar o atendimento. */
export interface DetalhesAtendimento {
  details: {
    attendanceNote?: string;
  };
}

/** Payload de detalhes exigido para registrar uma consulta como atendida. */
export interface DetalhesAtendimentoParaRegistro {
  details: {
    attendanceNote: string;
  };
}

/** Linha resumida da agenda diária do profissional. */
export interface ConsultaDoDia {
  id: string;
  pacienteId: string;
  profissionalId: string;
  scheduledAt: string;
  status: 'scheduled' | 'confirmed' | 'noShow' | 'attended';
  paciente: PacienteDaConsulta;
}

/** Consulta aberta pelo profissional, com paciente, profissional e anotação para conferência e registro. */
export interface ConsultaSelecionada {
  id: string;
  version: number;
  pacienteId: string;
  profissionalId: string;
  scheduledAt: string;
  status: 'scheduled' | 'confirmed' | 'noShow' | 'attended';
  paciente: PacienteDaConsulta;
  profissional: ProfissionalDaConsulta;
  details: DetalhesAtendimento;
}

export interface Agenda_diariaContracts {
  /**
   * Finalidade: Carrega a primeira página da agenda de hoje do profissional autenticado para exibir seus horários, pacientes e situações.
   * Entrada: page e pageSize definem a página inicial e a quantidade de consultas por página; ambos vêm do contexto de navegação da agenda.
   * Processamento: Obtém o profissional autenticado no contexto, filtra Consulta por profissionalId desse profissional e por scheduledAt no dia atual, ordena por horário crescente, resolve somente o paciente relacionado e aplica a paginação solicitada. O escopo próprio e os campos retornados respeitam as permissões do profissional.
   * Saída: Retorna consultas no formato de linha da agenda, já limitadas à agenda própria de hoje e acompanhadas de items, page, pageSize e hasMore para a lista paginada.
   */
  'agendaClinica.agenda_diaria.carregarAgendaDiaria': {
    kind: 'qry';
    input: { page: number; pageSize: number };
    output: { consultas: { items: ConsultaDoDia[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['profissional']; grants: ['profissionalConsultarEregistrarPropriaAgenda', 'profissionalIdentificarPacientesDaPropriaAgenda']; scope: 'own' };
  };
  /**
   * Finalidade: Busca sob demanda a próxima página de consultas da agenda de hoje do profissional autenticado.
   * Entrada: page informa a página solicitada pela ação de carregar mais, e pageSize define o limite de linhas dessa página.
   * Processamento: Repete o filtro da agenda própria do dia atual pelo profissional autenticado, ordena as consultas por scheduledAt crescente, resolve o nome do paciente relacionado e aplica a página requerida. Não amplia o escopo para consultas de outro profissional ou de outro dia.
   * Saída: Retorna uma página adicional de linhas da agenda, com items, page, pageSize e hasMore, para ser acrescentada à lista já exibida.
   */
  'agendaClinica.agenda_diaria.carregarMaisConsultasDoDia': {
    kind: 'qry';
    input: { page: number; pageSize: number };
    output: { consultas: { items: ConsultaDoDia[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['profissional']; grants: ['profissionalConsultarEregistrarPropriaAgenda', 'profissionalIdentificarPacientesDaPropriaAgenda']; scope: 'own' };
  };
  /**
   * Finalidade: Abre a consulta escolhida na agenda diária para identificar paciente, horário e profissional e permitir o registro do atendimento.
   * Entrada: consultaId é o identificador da linha selecionada pelo profissional na lista da própria agenda.
   * Processamento: Localiza a Consulta pelo identificador, confirma que ela pertence ao profissional autenticado e que está prevista para o dia atual, resolve os dados autorizados do Paciente e do Profissional relacionados e inclui a versão e a anotação existente.
   * Saída: Retorna a consulta selecionada completa no formato usado pelo resumo, formulário e ações, inclusive version para controle de concorrência no registro.
   */
  'agendaClinica.agenda_diaria.carregarConsultaSelecionada': {
    kind: 'qry';
    input: { consultaId: string };
    output: { consulta: ConsultaSelecionada };
    rules: [];
    access: { actors: ['profissional']; grants: ['profissionalConsultarEregistrarPropriaAgenda', 'profissionalIdentificarPacientesDaPropriaAgenda']; scope: 'own' };
  };
  /**
   * Finalidade: Registra o atendimento realizado na consulta aberta pelo profissional e devolve o estado atualizado para redesenhar a página.
   * Entrada: id e version identificam a Consulta e protegem a alteração concorrente; details.attendanceNote é a anotação obrigatória enviada pelo formulário para o payload da transição.
   * Processamento: Confirma que a consulta pertence ao profissional autenticado e executa Consulta.registrarAtendimento. Aplica transicaoConsultaValida, aceitando somente a mudança de scheduled ou confirmed para attended, e anotacaoObrigatoriaNoAtendimento, recusando payload sem anotação. Após a transição, resolve paciente e profissional relacionados para compor o registro atualizado.
   * Saída: Retorna a consulta já atendida, com nova version, status e anotação persistida, para atualizar tanto o detalhe aberto quanto sua linha na agenda sem uma segunda chamada.
   */
  'agendaClinica.agenda_diaria.registrarAtendimento': {
    kind: 'cmd';
    writes: 'Consulta.registrarAtendimento';
    input: { id: string; version: number; details: DetalhesAtendimentoParaRegistro };
    output: { consulta: ConsultaSelecionada };
    rules: ['transicaoConsultaValida', 'anotacaoObrigatoriaNoAtendimento'];
    access: { actors: ['profissional']; grants: ['profissionalConsultarEregistrarPropriaAgenda', 'profissionalIdentificarPacientesDaPropriaAgenda']; scope: 'own' };
  };
}
