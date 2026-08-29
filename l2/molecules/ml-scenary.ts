/// <mls fileReference="_102020_/l2/molecules/ml-scenary.ts" enhancement="_102020_/l2/enhancementAura"/>

// =============================================================================
// ML-SCENARY — one visible scene, remaining scenes stay in the DOM (hidden)
// =============================================================================
// This molecule does NOT contain business logic, i18n, or URL access.
import { html, TemplateResult, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { propertyDataSource } from '/_102029_/l2/collabDecorators.js';
import { MoleculeAuraElement } from '/_102033_/l2/moleculeBase.js';
import { cn } from '/_102033_/l2/shared/molecules/cn.js';
import {
  changeDetail,
  isDirectRender,
  normalizeMode,
  parseScenes,
  readSceneElements,
  resolveActive,
  resolveBackTarget,
  sceneHidden,
  showBack,
  showTabs,
  shouldEmitChange,
  stepEnabled,
  type SceneRecord,
} from '/_102020_/l2/molecules/ml-scenary.logic.js';

@customElement('molecules--ml-scenary-102020')
export class MlScenaryMolecule extends MoleculeAuraElement {
  slotTags = ['Scene'];
  protected usesLiveSlots = true;

  @propertyDataSource({ type: String })
  mode: string = 'scenary';

  @propertyDataSource({ type: String })
  value: string | null = null;

  @propertyDataSource({ type: String })
  backLabel: string = '';

  @propertyDataSource({ type: Boolean })
  disabled = false;

  @propertyDataSource({ type: Boolean })
  loading = false;

  @propertyDataSource({ type: Boolean })
  revealall = false;

  @state()
  private uid = `scenary-${Math.random().toString(36).slice(2, 10)}`;

  private pendingFocus: string | null = null;

  private scenes(): SceneRecord[] {
    return parseScenes(readSceneElements(this));
  }

  private sceneSource(value: string): Element | undefined {
    return Array.from(this.children).find(el =>
      el.tagName === 'SCENE' && (el.getAttribute('value') || '').trim() === value
    );
  }

  private toSafeId(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '-');
  }

  private headingId(value: string): string {
    return `${this.uid}-heading-${this.toSafeId(value)}`;
  }

  private tabId(value: string): string {
    return `${this.uid}-tab-${this.toSafeId(value)}`;
  }

  private panelId(value: string): string {
    return `${this.uid}-panel-${this.toSafeId(value)}`;
  }

  private navigate(next: string | null, scenes: SceneRecord[], previous: string | null) {
    if (!shouldEmitChange({
      internal: true,
      revealall: this.revealall,
      disabled: this.disabled,
      loading: this.loading,
      previous,
      next,
    })) return;
    const detail = changeDetail(scenes, previous, next as string);
    this.value = detail.value;
    this.pendingFocus = detail.value;
    this.dispatchEvent(new CustomEvent('change', {
      bubbles: true,
      composed: true,
      detail,
    }));
  }

  private handleTabClick(scene: SceneRecord, active: string | null) {
    if (this.disabled || this.loading || scene.disabled) return;
    this.navigate(scene.value, this.scenes(), active);
  }

  private handleBack(scene: SceneRecord, active: string | null) {
    const scenes = this.scenes();
    this.navigate(resolveBackTarget(scenes, scene), scenes, active);
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (this.disabled || this.loading || this.revealall) return;
    const scenes = this.scenes();
    if (!showTabs(normalizeMode(this.mode), scenes, this.revealall)) return;

    const active = resolveActive(scenes, this.value);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const next = stepEnabled(scenes, active, 1);
      if (!next) return;
      const btn = this.querySelector(`[data-tab-button][data-value="${next}"]`) as HTMLButtonElement | null;
      btn?.focus();
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const next = stepEnabled(scenes, active, -1);
      if (!next) return;
      const btn = this.querySelector(`[data-tab-button][data-value="${next}"]`) as HTMLButtonElement | null;
      btn?.focus();
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const focused = document.activeElement as HTMLElement | null;
      const tabValue = focused?.getAttribute('data-value');
      const scene = scenes.find(item => item.value === tabValue);
      if (scene) this.handleTabClick(scene, active);
    }
  }

  updated(changed: Map<string | number | symbol, unknown>): void {
    super.updated(changed);
    if (!this.pendingFocus) return;
    const target = this.pendingFocus;
    this.pendingFocus = null;
    const heading = this.querySelector(`#${this.headingId(target)}`) as HTMLElement | null;
    heading?.focus();
  }

  private renderBack(scene: SceneRecord): TemplateResult {
    const label = this.backLabel;
    return html`
      <button
        type="button"
        class="ml-scenary-back"
        ?disabled=${this.disabled || this.loading}
        aria-label=${label || nothing}
        @click=${() => this.handleBack(scene, resolveActive(this.scenes(), this.value))}
      >
        <svg class="ml-scenary-back-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M12.5 4.5L7 10l5.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ${label ? html`<span>${label}</span>` : nothing}
      </button>
    `;
  }

  private renderBadge(scene: SceneRecord): TemplateResult {
    return html`
      <div class="ml-scenary-badge">${scene.value}${scene.title ? html`<span class="ml-scenary-badge-title">${scene.title}</span>` : nothing}</div>
    `;
  }

  private renderPanel(
    scene: SceneRecord,
    source: Element | undefined,
    opts: { active: string | null; tabs: boolean; revealall: boolean; direct: boolean; mode: ReturnType<typeof normalizeMode> },
  ): TemplateResult {
    const hidden = sceneHidden(scene, opts.active, opts.revealall);
    const back = showBack(opts.mode, scene, this.scenes(), opts.revealall);
    const labelledBy = this.headingId(scene.value);
    const visibleHeading = !opts.direct && !opts.tabs && !opts.revealall;
    return html`
      <div
        id=${this.panelId(scene.value)}
        class=${cn(
          'ml-scenary-panel',
          hidden ? '' : 'ml-scenary-panel-active',
          opts.direct ? 'ml-scenary-panel-direct' : '',
        )}
        role=${opts.tabs ? 'tabpanel' : 'region'}
        aria-labelledby=${labelledBy}
        ?hidden=${hidden}
        ?inert=${hidden}
        aria-hidden=${hidden ? 'true' : 'false'}
      >
        ${opts.revealall ? this.renderBadge(scene) : nothing}
        ${back ? this.renderBack(scene) : nothing}
        ${visibleHeading
          ? html`<h2 id=${labelledBy} class="ml-scenary-heading" tabindex="-1">${scene.title}</h2>`
          : html`<span id=${labelledBy} class="ml-scenary-heading-sr" tabindex="-1">${scene.title}</span>`}
        ${this.renderLiveSlotFrom(source, 'ml-scenary-body')}
      </div>
    `;
  }

  render() {
    const scenes = this.scenes();
    const mode = normalizeMode(this.mode);
    const revealall = !!this.revealall;
    const active = revealall ? null : resolveActive(scenes, this.value);
    const tabs = showTabs(mode, scenes, revealall);
    const direct = isDirectRender(scenes, revealall);
    const blocked = this.disabled || this.loading;

    return html`
      <div
        class=${cn(
          'ml-scenary',
          this.cssClass,
          direct ? 'ml-scenary-direct' : '',
          revealall ? 'ml-scenary-reveal' : '',
          blocked ? 'ml-disabled' : '',
        )}
        aria-busy=${this.loading ? 'true' : 'false'}
      >
        ${tabs
          ? html`
              <div
                class="ml-scenary-tablist"
                role="tablist"
                @keydown=${this.handleKeyDown}
              >
                ${scenes.map(scene => {
                  const isActive = scene.value === active;
                  const isDisabled = blocked || scene.disabled;
                  return html`
                    <button
                      id=${this.tabId(scene.value)}
                      data-tab-button
                      data-value=${scene.value}
                      class=${cn('ml-scenary-tab', isActive ? 'ml-scenary-tab-active' : '')}
                      role="tab"
                      type="button"
                      aria-selected=${isActive ? 'true' : 'false'}
                      aria-disabled=${isDisabled ? 'true' : 'false'}
                      aria-controls=${this.panelId(scene.value)}
                      tabindex=${isActive ? '0' : '-1'}
                      ?disabled=${isDisabled}
                      @click=${() => this.handleTabClick(scene, active)}
                    >${scene.title}</button>
                  `;
                })}
              </div>
            `
          : nothing}
        ${scenes.map(scene => this.renderPanel(scene, this.sceneSource(scene.value), { active, tabs, revealall, direct, mode }))}
      </div>
    `;
  }
}
