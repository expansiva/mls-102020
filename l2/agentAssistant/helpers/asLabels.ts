/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asLabels.ts" enhancement="_blank"/>

// Fixed UI text. The model detects userLanguage; only the two languages the product runs in are
// tabled and anything else falls back to English. Business words (field titles, entity titles,
// action titles) come from the app's ontology and from the model, never from here.

export interface AsLabels {
  stepInterpret: string;
  stepAsk: string;
  chooseActionTitle: string;
  chooseActionQuestion: string;
  completeTitle: string;
  completeIntro: string;
  confirmTitle: string;
  confirmIntro: string;
  confirmOption: string;
  pickOne: (field: string, text: string) => string;
  pickAny: (field: string) => string;
  notFound: (field: string, text: string) => string;
  typeValue: (field: string) => string;
  invalidValue: (field: string, value: string) => string;
  searchPlaceholder: string;
  valuePlaceholder: string;
  notUnderstood: string;
  noActions: string;
  emptyPrompt: string;
  cancelled: string;
  answered: string;
  done: string;
  failed: string;
  yes: string;
  no: string;
  running: string;
  processing: string;
  planTitle: string;
  planIntro: string;
  planOption: string;
  doneAction: (title: string) => string;
  nowAction: (title: string) => string;
  runsOnContinue: string;
  doneCount: (count: number) => string;
  answerTitle: string;
  messageTitle: string;
  ok: string;
  noAnswer: string;
  stepAnswer: string;
  datePlaceholder: string;
  timestampPlaceholder: string;
}

const PT: AsLabels = {
  stepInterpret: 'Entender o pedido',
  stepAsk: 'Completar o pedido',
  chooseActionTitle: 'O que você quer fazer?',
  chooseActionQuestion: 'Encontrei mais de uma ação possível para o seu pedido.',
  completeTitle: 'Faltam algumas informações',
  completeIntro: 'Preencha o que falta para eu executar a ação.',
  confirmTitle: 'Confirme a ação',
  confirmIntro: 'Confira os dados antes de executar.',
  confirmOption: 'Confirmar e executar',
  pickOne: (field, text) => `Encontrei mais de um resultado para "${text}" em ${field}. Qual deles?`,
  pickAny: field => `Escolha ${field}.`,
  notFound: (field, text) => `Não encontrei "${text}" em ${field}. Escolha um da lista ou digite outro termo.`,
  typeValue: field => `Informe ${field}.`,
  invalidValue: (field, value) => `"${value}" não é um valor válido para ${field}. Informe de novo.`,
  searchPlaceholder: 'Ou digite outro termo para buscar',
  valuePlaceholder: 'Digite o valor',
  notUnderstood: 'Não encontrei nenhuma ação deste app que atenda ao pedido.',
  noActions: 'Este app não expõe nenhuma ação que o assistente consiga executar.',
  emptyPrompt: 'Diga o que você quer fazer, por exemplo: "adicione uma salada na mesa 1".',
  cancelled: 'Cancelado',
  answered: 'Respostas registradas',
  done: 'Feito',
  failed: 'Não foi possível executar',
  yes: 'Sim',
  no: 'Não',
  running: 'Executando...',
  processing: 'Processando...',
  planTitle: 'Confirme as ações',
  planIntro: 'Vou executar, nesta ordem:',
  planOption: 'Executar tudo',
  doneAction: title => `Feito: ${title}`,
  nowAction: title => `Agora: ${title}`,
  runsOnContinue: 'Ao continuar, esta ação será executada.',
  doneCount: count => (count === 1 ? '1 ação anterior foi feita' : `${count} ações anteriores foram feitas`),
  answerTitle: 'Resposta',
  messageTitle: 'Assistente',
  ok: 'OK',
  noAnswer: 'Não consegui montar a resposta com os dados retornados.',
  stepAnswer: 'Responder',
  datePlaceholder: 'DD/MM/AAAA',
  timestampPlaceholder: 'DD/MM/AAAA HH:mm',
};

const EN: AsLabels = {
  stepInterpret: 'Understand the request',
  stepAsk: 'Complete the request',
  chooseActionTitle: 'What do you want to do?',
  chooseActionQuestion: 'I found more than one action that fits your request.',
  completeTitle: 'A few details are missing',
  completeIntro: 'Fill in what is missing so I can run the action.',
  confirmTitle: 'Confirm the action',
  confirmIntro: 'Check the data before running it.',
  confirmOption: 'Confirm and run',
  pickOne: (field, text) => `More than one ${field} matches "${text}". Which one?`,
  pickAny: field => `Choose the ${field}.`,
  notFound: (field, text) => `No ${field} matches "${text}". Pick one from the list or type another term.`,
  typeValue: field => `Enter the ${field}.`,
  invalidValue: (field, value) => `"${value}" is not a valid ${field}. Please enter it again.`,
  searchPlaceholder: 'Or type another term to search',
  valuePlaceholder: 'Type the value',
  notUnderstood: 'I could not find an action in this app that fits the request.',
  noActions: 'This app exposes no action the assistant can run.',
  emptyPrompt: 'Tell me what you want to do, e.g. "add a salad to table 1".',
  cancelled: 'Cancelled',
  answered: 'Answers recorded',
  done: 'Done',
  failed: 'Could not run the action',
  yes: 'Yes',
  no: 'No',
  running: 'Running...',
  processing: 'Processing...',
  planTitle: 'Confirm the actions',
  planIntro: 'I will run, in this order:',
  planOption: 'Run all',
  doneAction: title => `Done: ${title}`,
  nowAction: title => `Now: ${title}`,
  runsOnContinue: 'Continuing runs this action.',
  doneCount: count => (count === 1 ? '1 earlier action was done' : `${count} earlier actions were done`),
  answerTitle: 'Answer',
  messageTitle: 'Assistant',
  ok: 'OK',
  noAnswer: 'I could not build an answer from the returned data.',
  stepAnswer: 'Answer',
  datePlaceholder: 'YYYY-MM-DD',
  timestampPlaceholder: 'YYYY-MM-DD HH:mm',
};

export function asLabelsFor(userLanguage: string): AsLabels {
  return (userLanguage || '').slice(0, 2).toLowerCase() === 'pt' ? PT : EN;
}
