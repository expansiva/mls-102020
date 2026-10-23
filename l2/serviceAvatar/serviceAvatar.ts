/// <mls fileReference="_102020_/l2/serviceAvatar/serviceAvatar.ts" enhancement="_102027_/l2/enhancementLit"/>

// collabStudio avatar — test service. Opening this tab (studio mode, level 7) puts the floating
// avatar on the page; the avatar then lives on document.body and stays when the tab is left, until
// the page reloads. The chat talks to agentAssistant (mls-102020/l2/agentAssistant). The tab itself
// only explains where the avatar is and can hide/show it.

import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';
import { avatarVisible, mountAvatar, setAvatarVisible } from '/_102020_/l2/serviceAvatar/svaBubble.js';
import { svaLabels } from '/_102020_/l2/serviceAvatar/svaLabels.js';

@customElement('service-avatar--service-avatar-102020')
export class ServiceAvatar102020 extends ServiceBase {

  public details: IService = {
    icon: '&#xf4ad;',
    state: 'foreground',
    position: 'left',
    tooltip: 'collabStudio',
    visible: true,
    widget: '_102020_/l2/serviceAvatar/serviceAvatar',
    level: [7],
  };

  public menu: IServiceMenu = {
    title: 'collabStudio',
    main: {},
    tools: {},
    tabs: undefined,
    onClickMain: () => undefined,
  };

  private readonly labels = svaLabels();

  @state() private shown = true;

  onServiceClick(_visible: boolean, _reinit: boolean, _el: IToolbarContent | null): void {
    this.ensureAvatar();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.ensureAvatar();
  }

  createRenderRoot() { return this; }

  private ensureAvatar(): void {
    mountAvatar();
    this.shown = avatarVisible();
  }

  private toggleAvatar(): void {
    setAvatarVisible(!avatarVisible());
    this.shown = avatarVisible();
  }

  render() {
    return html`
      <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px; font-size: 14px; line-height: 1.5;">
        <strong>collabStudio</strong>
        <p style="margin: 0;">${this.labels.servicePanel}</p>
        <button type="button" style="align-self: flex-start; padding: 6px 14px; border-radius: 8px; cursor: pointer;"
          @click=${() => this.toggleAvatar()}>
          ${this.shown ? this.labels.serviceHide : this.labels.serviceShow}
        </button>
      </div>
    `;
  }
}
