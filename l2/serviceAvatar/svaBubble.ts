/// <mls fileReference="_102020_/l2/serviceAvatar/svaBubble.ts" enhancement="_blank"/>

// The floating avatar and its chat box, mounted once on document.body (outside every region the
// shell re-renders, so it survives navigation and level changes until the page reloads).
// Clicking the avatar opens/closes the box; closing only hides it — a running task goes on, and the
// avatar shows a dot when it stops at a question while the box is closed.

import { SVA_STYLE } from '/_102020_/l2/serviceAvatar/svaStyle.js';
import { svaLabels, type SvaLabels } from '/_102020_/l2/serviceAvatar/svaLabels.js';
import { SvaChat } from '/_102020_/l2/serviceAvatar/svaChat.js';
import type { SvaView } from '/_102020_/l2/serviceAvatar/svaView.js';

export const SVA_ROOT_ID = 'service-avatar-root-102020';

type AvatarState = 'idle' | 'thinking' | 'waiting' | 'done' | 'error';

class SvaBubble {
  private readonly labels: SvaLabels = svaLabels();
  private readonly root: HTMLElement;
  private readonly avatar: HTMLButtonElement;
  private readonly list: HTMLElement;
  private readonly input: HTMLTextAreaElement;
  private readonly sendButton: HTMLButtonElement;
  private readonly chat: SvaChat;
  private thinkingRow: HTMLElement | null = null;
  private activeWidget: { holder: HTMLElement; stepId: number } | null = null;
  private doneTimer = 0;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = SVA_ROOT_ID;
    this.root.className = 'sva-root';
    this.root.dataset.open = 'false';
    this.root.dataset.state = 'idle';

    const style = document.createElement('style');
    style.textContent = SVA_STYLE;

    const panel = document.createElement('section');
    panel.className = 'sva-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', this.labels.name);
    const head = document.createElement('header');
    head.className = 'sva-head';
    head.append(markElement(), text(this.labels.name));
    this.list = document.createElement('div');
    this.list.className = 'sva-list';
    this.list.setAttribute('aria-live', 'polite');
    const form = document.createElement('form');
    form.className = 'sva-form';
    this.input = document.createElement('textarea');
    this.input.className = 'sva-input';
    this.input.rows = 1;
    this.input.placeholder = this.labels.placeholder;
    this.sendButton = document.createElement('button');
    this.sendButton.type = 'submit';
    this.sendButton.className = 'sva-send';
    this.sendButton.textContent = this.labels.send;
    form.append(this.input, this.sendButton);
    panel.append(head, this.list, form);

    this.avatar = document.createElement('button');
    this.avatar.type = 'button';
    this.avatar.className = 'sva-avatar';
    this.avatar.setAttribute('aria-label', this.labels.open);
    const dot = document.createElement('span');
    dot.className = 'sva-dot';
    this.avatar.append(markElement(), dot);

    this.root.append(style, panel, this.avatar);
    document.body.append(this.root);

    this.avatar.addEventListener('click', () => this.toggle());
    form.addEventListener('submit', event => {
      event.preventDefault();
      this.submit();
    });
    this.input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.submit();
      }
    });

    this.chat = new SvaChat({
      onView: view => this.showView(view),
      onClarification: (element, stepId) => this.showWidget(element, stepId),
      onError: message => this.fail(message),
    });
    this.addBot(this.labels.welcome);
  }

  get isOpen(): boolean {
    return this.root.dataset.open === 'true';
  }

  toggle(force?: boolean): void {
    const open = force ?? !this.isOpen;
    this.root.dataset.open = String(open);
    this.avatar.setAttribute('aria-label', open ? this.labels.close : this.labels.open);
    if (open) {
      this.root.dataset.attention = 'false';
      this.scrollToEnd();
      this.input.focus();
    }
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? '' : 'none';
  }

  get visible(): boolean {
    return this.root.style.display !== 'none';
  }

  private submit(): void {
    const value = this.input.value.trim();
    if (!value || this.chat.busy) return;
    if (!SvaChat.ready()) {
      this.addBot(this.labels.notReady, true);
      return;
    }
    this.input.value = '';
    this.addMe(value);
    this.setWorking(true);
    this.showThinking(this.labels.thinking);
    this.setAvatar('thinking');
    this.chat.send(value).catch(error => this.fail(error instanceof Error ? error.message : String(error)));
  }

  private showView(view: SvaView): void {
    // the open question stays only while it is the one pending; once answered it leaves
    if (this.activeWidget && !(view.kind === 'waiting' && view.stepId === this.activeWidget.stepId)) this.closeWidget();
    if (view.kind === 'thinking') {
      this.setAvatar('thinking');
      this.showThinking(view.text || this.labels.thinking);
      return;
    }
    if (view.kind === 'waiting') {
      // the widget itself is appended by onClarification
      this.clearThinking();
      this.setAvatar('waiting');
      if (!this.isOpen) this.root.dataset.attention = 'true';
      return;
    }
    this.clearThinking();
    this.setWorking(false);
    if (view.kind === 'done') {
      this.addBot(view.text || this.labels.done);
      this.setAvatar('done');
      window.clearTimeout(this.doneTimer);
      this.doneTimer = window.setTimeout(() => this.setAvatar('idle'), 1600);
    } else {
      this.addBot(view.text ? `${this.labels.failed}\n${view.text}` : this.labels.failed, true);
      this.setAvatar('error');
    }
    if (!this.isOpen) this.root.dataset.attention = 'true';
  }

  private showWidget(element: HTMLElement, stepId: number): void {
    this.clearThinking();
    this.closeWidget();
    const holder = document.createElement('div');
    holder.className = 'sva-widget';
    holder.append(element);
    this.list.append(holder);
    this.activeWidget = { holder, stepId };
    this.scrollToEnd();
  }

  private closeWidget(): void {
    if (!this.activeWidget) return;
    this.activeWidget.holder.dataset.answered = 'true';
    this.activeWidget = null;
  }

  private fail(message: string): void {
    this.chat.reset();
    this.closeWidget();
    this.clearThinking();
    this.setWorking(false);
    this.addBot(`${this.labels.failed}\n${message}`, true);
    this.setAvatar('error');
  }

  private setAvatar(state: AvatarState): void {
    this.root.dataset.state = state;
  }

  private setWorking(working: boolean): void {
    this.input.disabled = working;
    this.sendButton.disabled = working;
    if (!working && this.isOpen) this.input.focus();
  }

  private showThinking(value: string): void {
    if (!this.thinkingRow) {
      this.thinkingRow = document.createElement('div');
      this.thinkingRow.className = 'sva-thinking';
      this.list.append(this.thinkingRow);
    }
    this.thinkingRow.textContent = value;
    this.scrollToEnd();
  }

  private clearThinking(): void {
    this.thinkingRow?.remove();
    this.thinkingRow = null;
  }

  private addMe(value: string): void {
    this.addMessage(value, 'sva-msg sva-me');
  }

  private addBot(value: string, error = false): void {
    this.addMessage(value, `sva-msg sva-bot${error ? ' sva-error' : ''}`);
  }

  private addMessage(value: string, className: string): void {
    const row = document.createElement('div');
    row.className = className;
    row.textContent = value;
    // the thinking line always stays last
    if (this.thinkingRow) this.list.insertBefore(row, this.thinkingRow);
    else this.list.append(row);
    this.scrollToEnd();
  }

  private scrollToEnd(): void {
    this.list.scrollTop = this.list.scrollHeight;
  }
}

function markElement(): HTMLElement {
  const mark = document.createElement('span');
  mark.className = 'sva-mark';
  mark.setAttribute('aria-hidden', 'true');
  const c1 = document.createElement('span');
  c1.className = 'sva-c sva-c1';
  const c2 = document.createElement('span');
  c2.className = 'sva-c sva-c2';
  mark.append(c1, c2);
  return mark;
}

function text(value: string): HTMLElement {
  const span = document.createElement('span');
  span.textContent = value;
  return span;
}

// One avatar per page, whoever asks first.
let instance: SvaBubble | null = null;

export function mountAvatar(): SvaBubble {
  if (!instance || !document.getElementById(SVA_ROOT_ID)) instance = new SvaBubble();
  return instance;
}

export function avatarVisible(): boolean {
  return !!instance && !!document.getElementById(SVA_ROOT_ID) && instance.visible;
}

export function setAvatarVisible(visible: boolean): void {
  mountAvatar().setVisible(visible);
}
