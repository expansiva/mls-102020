/// <mls fileReference="_102020_/l2/serviceAvatar/svaLabels.ts" enhancement="_blank"/>

export interface SvaLabels {
  name: string;
  open: string;
  close: string;
  placeholder: string;
  send: string;
  thinking: string;
  welcome: string;
  done: string;
  failed: string;
  notReady: string;
  servicePanel: string;
  serviceShow: string;
  serviceHide: string;
}

const PT: SvaLabels = {
  name: 'collabStudio',
  open: 'Abrir o collabStudio',
  close: 'Fechar o collabStudio',
  placeholder: 'Pergunte ou peça algo ao app...',
  send: 'Enviar',
  thinking: 'Pensando...',
  welcome: 'Olá! Diga como posso te ajudar hoje.',
  done: 'Pronto.',
  failed: 'Não consegui concluir.',
  notReady: 'O estúdio ainda está carregando. Tente de novo em alguns segundos.',
  servicePanel: 'O avatar do collabStudio fica no canto inferior direito da tela. Clique nele para conversar.',
  serviceShow: 'Mostrar avatar',
  serviceHide: 'Ocultar avatar',
};

const EN: SvaLabels = {
  name: 'collabStudio',
  open: 'Open collabStudio',
  close: 'Close collabStudio',
  placeholder: 'Ask or tell the app something...',
  send: 'Send',
  thinking: 'Thinking...',
  welcome: 'Hi! Tell me how I can help you today.',
  done: 'Done.',
  failed: 'I could not finish.',
  notReady: 'The studio is still loading. Try again in a few seconds.',
  servicePanel: 'The collabStudio avatar sits in the bottom-right corner of the screen. Click it to chat.',
  serviceShow: 'Show avatar',
  serviceHide: 'Hide avatar',
};

export function svaLabels(): SvaLabels {
  const language = typeof navigator !== 'undefined' && typeof navigator.language === 'string' ? navigator.language : 'en';
  return language.toLowerCase().startsWith('pt') ? PT : EN;
}
