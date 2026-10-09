/// <mls fileReference="_102047_/l2/agendaClinica/web/contracts/consultas.defs.ts" enhancement="_blank"/>

/** Cabeçalho da agenda no dia consultado. */
export interface AgendaCabecalho {
  dataAgenda: string;
}

/** Identificação do paciente exibida e usada na localização. */
export interface PacienteIdentificacao {
  details: {
    identification: {
      readonly subtype: 'Person';
      name: string;
      readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
      docType?: 'SSN' | 'EIN' | 'Passport' | 'DriversLicense' | 'NationalId' | 'CPF' | 'CNPJ' | 'VAT' | 'Other';
      docId?: string;
    };
  };
}

/** Canais de contato derivados do paciente, preservados como a estrutura mestre autorizada para conferência. */
export interface ContatosPaciente {
  details: {
    base: {
      readonly contacts: string;
    };
  };
}

/** Dados-base do paciente necessários à conferência da consulta. */
export interface PacienteBase {
  details: {
    base: string;
  };
  contacts: ContatosPaciente;
}

/** Paciente identificado em uma linha de agenda ou opção de agendamento. */
export interface PacienteResumo {
  id: string;
  identification: PacienteIdentificacao;
}

/** Paciente vinculado à consulta, com identificação e contatos para conferência. */
export interface PacienteDetalhe {
  id: string;
  identification: PacienteIdentificacao;
  base: PacienteBase;
}

/** Identificação do profissional exibida na agenda e na escolha do agendamento. */
export interface ProfissionalIdentificacao {
  details: {
    identification: {
      readonly subtype: 'Person';
      name: string;
      readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
      docType?: 'CPF' | 'Passport' | 'NationalId' | 'Other';
      docId?: string;
      countryCode: string;
    };
  };
}

/** Dados da agenda clínica que qualificam o profissional escolhido. */
export interface AgendaClinicaProfissional {
  details: {
    agendaClinica: {
      professionalType: 'medical' | 'therapist';
    };
  };
}

/** Profissional identificado em uma linha de agenda ou opção de agendamento. */
export interface ProfissionalResumo {
  id: string;
  identification: ProfissionalIdentificacao;
  agendaClinica: AgendaClinicaProfissional;
}

/** Linha pronta para a agenda, com os nomes resolvidos do paciente e do profissional. */
export interface ConsultaAgenda {
  id: string;
  pacienteId: string;
  profissionalId: string;
  scheduledAt: string;
  status: 'scheduled' | 'confirmed' | 'noShow' | 'attended';
  paciente: PacienteResumo;
  profissional: ProfissionalResumo;
}

/** Consulta selecionada, composta com paciente e profissional, para conferência, ações e preenchimento do formulário. */
export interface ConsultaDetalhe {
  id: string;
  version: number;
  pacienteId: string;
  profissionalId: string;
  scheduledAt: string;
  status: 'scheduled' | 'confirmed' | 'noShow' | 'attended';
  paciente: PacienteDetalhe;
  profissional: ProfissionalResumo;
}

export interface ConsultasContracts {
  /**
   * Finalidade: Carrega a visão inicial da agenda clínica para a recepcionista localizar e conferir consultas.
   * Entrada: Recebe a data de agenda do contexto, um filtro opcional de situação e a página solicitada.
   * Processamento: Busca consultas da data informada, aplica a situação quando ela foi escolhida, ordena por data e horário e resolve os dados mestres permitidos de paciente e profissional. Calcula quantidadePendentes a partir das consultas da data com situação scheduled ou confirmed; o indicador é derivado e não é gravado.
   * Saída: Devolve o cabeçalho da data, o indicador já calculado e uma página de linhas de agenda prontas para exibição.
   */
  'agendaClinica.consultas.carregarAgenda': {
    kind: 'qry';
    input: { dataAgenda: string; status?: 'scheduled' | 'confirmed' | 'noShow' | 'attended'; page: number; pageSize: number };
    output: { cabecalho: AgendaCabecalho; readonly quantidadePendentes: number; agenda: { items: ConsultaAgenda[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['recepcionistaGerenciarPacientesEconsultas', 'recepcionistaConsultarProfissionais']; scope: 'organization' };
  };
  /**
   * Finalidade: Substitui a agenda exibida quando a recepcionista muda a data ou a situação procurada.
   * Entrada: Recebe a data, a situação opcional e a primeira página desejada para a nova consulta de agenda.
   * Processamento: Aplica os filtros informados, ordena a agenda por horário, compõe nomes e tipo de profissional e calcula novamente quantidadePendentes para a data escolhida.
   * Saída: Devolve o novo cabeçalho, indicador e página filtrada, para substituir a visão anterior sem a página somar registros.
   */
  'agendaClinica.consultas.filtrarAgenda': {
    kind: 'qry';
    input: { dataAgenda: string; status?: 'scheduled' | 'confirmed' | 'noShow' | 'attended'; page: number; pageSize: number };
    output: { cabecalho: AgendaCabecalho; readonly quantidadePendentes: number; agenda: { items: ConsultaAgenda[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['recepcionistaGerenciarPacientesEconsultas', 'recepcionistaConsultarProfissionais']; scope: 'organization' };
  };
  /**
   * Finalidade: Traz a próxima página da mesma agenda já filtrada.
   * Entrada: Recebe os filtros atuais e o número da próxima página com seu tamanho.
   * Processamento: Repete exatamente os filtros de data e situação da agenda atual, mantém a ordenação por horário e busca apenas a página solicitada.
   * Saída: Devolve mais linhas de agenda e os metadados de paginação para acrescentá-las à lista existente.
   */
  'agendaClinica.consultas.carregarMaisAgenda': {
    kind: 'qry';
    input: { dataAgenda: string; status?: 'scheduled' | 'confirmed' | 'noShow' | 'attended'; page: number; pageSize: number };
    output: { agenda: { items: ConsultaAgenda[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['recepcionistaGerenciarPacientesEconsultas', 'recepcionistaConsultarProfissionais']; scope: 'organization' };
  };
  /**
   * Finalidade: Carrega a consulta escolhida com os dados necessários para conferir, agir ou reutilizar no formulário.
   * Entrada: Recebe o identificador da linha selecionada na agenda.
   * Processamento: Lê a consulta por id e compõe o paciente com identificação e contatos, além do profissional com identificação e tipo de atuação.
   * Saída: Devolve uma consulta detalhada com versão, para exibir o contexto conferido e enviar transições com concorrência otimista.
   */
  'agendaClinica.consultas.consultarConsultaSelecionada': {
    kind: 'qry';
    input: { id: string };
    output: { consulta: ConsultaDetalhe };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['recepcionistaGerenciarPacientesEconsultas', 'recepcionistaConsultarProfissionais']; scope: 'organization' };
  };
  /**
   * Finalidade: Localiza pacientes para a recepcionista escolher quem receberá o novo agendamento.
   * Entrada: Recebe o texto informado no nome do paciente e a primeira página de resultados.
   * Processamento: Pesquisa o índice de nomes de pacientes dentro da organização e retorna somente a identificação que a recepcionista pode consultar.
   * Saída: Devolve uma página de pacientes identificados para preencher pacienteId no formulário de agendamento.
   */
  'agendaClinica.consultas.localizarPacientesParaAgendamento': {
    kind: 'qry';
    input: { termo: string; page: number; pageSize: number };
    output: { pacientes: { items: PacienteResumo[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['recepcionistaGerenciarPacientesEconsultas', 'recepcionistaConsultarProfissionais']; scope: 'organization' };
  };
  /**
   * Finalidade: Acrescenta resultados à localização de pacientes usada no agendamento.
   * Entrada: Recebe o mesmo termo de nome e a próxima página solicitada.
   * Processamento: Mantém a pesquisa de pacientes pelo nome e busca somente a próxima página de registros permitidos.
   * Saída: Devolve mais opções de paciente e metadados de paginação para anexar à pesquisa atual.
   */
  'agendaClinica.consultas.carregarMaisPacientesParaAgendamento': {
    kind: 'qry';
    input: { termo: string; page: number; pageSize: number };
    output: { pacientes: { items: PacienteResumo[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['recepcionistaGerenciarPacientesEconsultas', 'recepcionistaConsultarProfissionais']; scope: 'organization' };
  };
  /**
   * Finalidade: Localiza profissionais da agenda para a recepcionista definir o responsável pela nova consulta.
   * Entrada: Recebe o nome pesquisado e a primeira página de resultados.
   * Processamento: Pesquisa profissionais da organização pelo nome e compõe sua identificação e o tipo de atuação da agenda clínica.
   * Saída: Devolve uma página de profissionais que o formulário usa para preencher profissionalId.
   */
  'agendaClinica.consultas.localizarProfissionaisParaAgendamento': {
    kind: 'qry';
    input: { termo: string; page: number; pageSize: number };
    output: { profissionais: { items: ProfissionalResumo[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['recepcionistaGerenciarPacientesEconsultas', 'recepcionistaConsultarProfissionais']; scope: 'organization' };
  };
  /**
   * Finalidade: Acrescenta resultados à localização de profissionais para o agendamento.
   * Entrada: Recebe o termo de nome mantido na pesquisa e a próxima página.
   * Processamento: Repete a busca de profissionais pelo nome e retorna apenas a página posterior solicitada.
   * Saída: Devolve opções adicionais de profissional para anexar à lista de escolha existente.
   */
  'agendaClinica.consultas.carregarMaisProfissionaisParaAgendamento': {
    kind: 'qry';
    input: { termo: string; page: number; pageSize: number };
    output: { profissionais: { items: ProfissionalResumo[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['recepcionistaGerenciarPacientesEconsultas', 'recepcionistaConsultarProfissionais']; scope: 'organization' };
  };
  /**
   * Finalidade: Cria o agendamento informado pela recepcionista e devolve a visão que a página precisa redesenhar.
   * Entrada: Recebe pacienteId, profissionalId e data e horário editados no formulário, além dos filtros e da página de agenda atualmente visíveis.
   * Processamento: Cria a consulta com situação scheduled e aplica consultaSemConflito, recusando o comando se já existir consulta do mesmo profissional na mesma data e horário. Em seguida compõe a consulta criada e recompõe a página atual da agenda e seu indicador derivado.
   * Saída: Devolve a consulta criada com versão e vínculos resolvidos, bem como cabeçalho, indicador e página de agenda atualizados; não exige nova chamada para redesenhar a página.
   */
  'agendaClinica.consultas.agendarConsulta': {
    kind: 'cmd';
    writes: 'Consulta.create';
    input: { pacienteId: string; profissionalId: string; scheduledAt: string; dataAgenda: string; statusAgenda?: 'scheduled' | 'confirmed' | 'noShow' | 'attended'; page: number; pageSize: number };
    output: { consulta: ConsultaDetalhe; cabecalho: AgendaCabecalho; readonly quantidadePendentes: number; agenda: { items: ConsultaAgenda[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['consultaSemConflito'];
    access: { actors: ['recepcionista']; grants: ['recepcionistaGerenciarPacientesEconsultas', 'recepcionistaConsultarProfissionais']; scope: 'organization' };
  };
  /**
   * Finalidade: Registra a confirmação telefônica da consulta conferida e atualiza a agenda exibida.
   * Entrada: Recebe id e version da consulta selecionada, mais os filtros e a página de agenda que precisam ser redesenhados.
   * Processamento: Executa a transição confirmarConsulta e aplica transicaoConsultaValida, aceitando somente a mudança de scheduled para confirmed. Após a transição, recompõe a consulta, a página filtrada e quantidadePendentes.
   * Saída: Devolve a consulta confirmada com a nova versão, o indicador recalculado e as linhas atualizadas da página da agenda.
   */
  'agendaClinica.consultas.confirmarConsulta': {
    kind: 'cmd';
    writes: 'Consulta.confirmarConsulta';
    input: { id: string; version: number; dataAgenda: string; statusAgenda?: 'scheduled' | 'confirmed' | 'noShow' | 'attended'; page: number; pageSize: number };
    output: { consulta: ConsultaDetalhe; cabecalho: AgendaCabecalho; readonly quantidadePendentes: number; agenda: { items: ConsultaAgenda[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['transicaoConsultaValida'];
    access: { actors: ['recepcionista']; grants: ['recepcionistaGerenciarPacientesEconsultas', 'recepcionistaConsultarProfissionais']; scope: 'organization' };
  };
  /**
   * Finalidade: Registra a falta do paciente na consulta conferida e devolve a agenda já atualizada.
   * Entrada: Recebe id e version da consulta, junto dos filtros e da página de agenda em uso.
   * Processamento: Executa registrarFalta conforme transicaoConsultaValida, permitindo somente scheduled ou confirmed para noShow. Recompõe a consulta resultante, a página filtrada e o indicador derivado após a transição.
   * Saída: Devolve a consulta marcada como falta, com nova versão, e os dados completos para redesenhar o cabeçalho, o indicador e a lista sem recarga adicional.
   */
  'agendaClinica.consultas.registrarFalta': {
    kind: 'cmd';
    writes: 'Consulta.registrarFalta';
    input: { id: string; version: number; dataAgenda: string; statusAgenda?: 'scheduled' | 'confirmed' | 'noShow' | 'attended'; page: number; pageSize: number };
    output: { consulta: ConsultaDetalhe; cabecalho: AgendaCabecalho; readonly quantidadePendentes: number; agenda: { items: ConsultaAgenda[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['transicaoConsultaValida'];
    access: { actors: ['recepcionista']; grants: ['recepcionistaGerenciarPacientesEconsultas', 'recepcionistaConsultarProfissionais']; scope: 'organization' };
  };
}
