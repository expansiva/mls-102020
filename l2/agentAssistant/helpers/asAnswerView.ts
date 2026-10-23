/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asAnswerView.ts" enhancement="_blank"/>

// The final screen of a question (or of a message the user must see): the text and one OK button.
// Plain DOM on purpose: it has no state besides "clicked", and the loading host (asBusy) covers it
// while the task closes.

const STYLE = `
.as-answer { display: flex; flex-direction: column; gap: 12px; padding: 12px 4px; }
.as-answer-title { font-weight: 600; font-size: 15px; }
.as-answer-text { white-space: pre-wrap; line-height: 1.5; font-size: 14px; }
.as-answer-actions { display: flex; justify-content: flex-end; }
.as-answer-ok { min-width: 88px; padding: 6px 16px; border-radius: 6px; border: 1px solid currentColor; background: transparent; color: inherit; cursor: pointer; font: inherit; }
.as-answer-ok:disabled { opacity: 0.5; cursor: default; }
`;

export function createAnswerView(args: { title: string; text: string; okLabel: string; onOk: () => void }): HTMLElement {
  const root = document.createElement('div');
  root.className = 'as-answer';
  const style = document.createElement('style');
  style.textContent = STYLE;
  const title = document.createElement('div');
  title.className = 'as-answer-title';
  title.textContent = args.title;
  const text = document.createElement('div');
  text.className = 'as-answer-text';
  text.textContent = args.text;
  const actions = document.createElement('div');
  actions.className = 'as-answer-actions';
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'as-answer-ok';
  ok.textContent = args.okLabel;
  ok.addEventListener('click', () => {
    if (!ok.disabled) args.onOk();
  });
  actions.append(ok);
  root.append(style, title, text, actions);
  // same switch the shared widget exposes, so the loading host (asBusy) locks and unlocks the button
  Object.defineProperty(root, 'readonly', {
    get: () => ok.disabled,
    set: (value: boolean) => { ok.disabled = !!value; },
  });
  return root;
}
