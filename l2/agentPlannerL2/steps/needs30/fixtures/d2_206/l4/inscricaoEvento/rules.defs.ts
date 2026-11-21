/// <mls fileReference="_102047_/l4/inscricaoEvento/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "inscricaoEvento",
  "rules": {
    "publicarExigeDadosCompletos": "Um evento só pode ser publicado quando tem título, descrição, data, local e número de vagas preenchidos, e o número de vagas é maior que zero.",
    "inscricaoSomenteEventoPublicado": "Só é possível se inscrever em um evento que esteja publicado; eventos em rascunho não aceitam inscrições.",
    "umaInscricaoPorEmailPorEvento": "Ao criar uma inscrição, ela é recusada se o mesmo e-mail já tiver uma inscrição confirmada ou em lista de espera no mesmo evento.",
    "inscricaoUnicaPorEmailEvento": "Em um mesmo evento, cada e-mail corresponde a no máximo uma inscrição não cancelada, seja confirmada ou em lista de espera.",
    "listaEsperaQuandoVagasEsgotadas": "Quando as vagas ocupadas de um evento alcançam o número de vagas, o evento fica lotado e passa a receber inscrições apenas na lista de espera.",
    "inscricaoExcedenteVaiParaListaEspera": "Uma nova inscrição é criada como confirmada se houver vaga restante no evento e, caso contrário, é criada em lista de espera.",
    "ordemChegadaListaEspera": "A lista de espera de um evento é ordenada pelo momento de chegada de cada inscrição, da mais antiga para a mais recente.",
    "cancelamentoSomentePropriaInscricao": "Uma pessoa do público só pode cancelar a própria inscrição, e apenas quando ela está confirmada ou em lista de espera.",
    "promoverPrimeiroListaEsperaAoCancelar": "Quando uma inscrição confirmada é cancelada, a primeira inscrição da lista de espera do mesmo evento, por ordem de chegada, é promovida automaticamente para confirmada, registrando o momento da promoção.",
    "vagasNaoMenorQueOcupadas": "O número de vagas de um evento não pode ser definido abaixo da quantidade de vagas já ocupadas por inscrições confirmadas.",
    "calculoVagasOcupadas": "As vagas ocupadas de um evento são a quantidade de inscrições confirmadas desse evento, sem contar as canceladas nem as em lista de espera.",
    "calculoVagasRestantes": "As vagas restantes de um evento são o número de vagas menos as vagas ocupadas, nunca abaixo de zero.",
    "calculoPosicaoListaEspera": "A posição de uma inscrição na lista de espera é a quantidade de inscrições do mesmo evento em lista de espera que chegaram antes dela, mais um."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type InscricaoEventoRulesType = typeof inscricaoEventoRules;

export default inscricaoEventoRules;
