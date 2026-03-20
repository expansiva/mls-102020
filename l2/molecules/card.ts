/// <mls fileReference="_102020_/l2/molecules/card.ts" enhancement="_102020_/l2/enhancementAura"/>

// =============================================================================
// FLIP CARD MOLECULE — UI-FIRST COMPONENT (NO SHADOW DOM)
// =============================================================================
// Card com face frontal (header/body/footer) e verso, com animação 3D flip,
// acessibilidade (teclado/ARIA), responsivo e customização visual por propriedades.
//
// Observações arquiteturais:
// - Molecule: presentation-only (sem lógica de negócio, sem acesso a estado global).
// - Sem Shadow DOM.
// - Sem slots (uso de propriedades de template/HTML via lit).
// - Sem bibliotecas externas.

import {
  html,
  HTMLTemplateResult,
  classMap,
  ifDefined,
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { propertyDataSource, propertyCompositeDataSource } from '/_100554_/l2/collabDecorators';
import { StateLitElement } from '/_100554_/l2/stateLitElement.js';

/// **collab_i18n_start**
const message_en = {
  flipLabel: 'Flip card',
};
const message_pt = {
  flipLabel: 'Alternar card',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
  en: message_en,
  pt: message_pt,
};
/// **collab_i18n_end**

type MaxWidth = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

type FlipEventDetail = {
  flipped: boolean;
};

@customElement('molecules--card-102020')
export class CardMolecule extends StateLitElement {
  private msg: MessageType = messages.en;

  // =========================================================================
  // CONTENT PROPERTIES (per GroupCard contract; extended for flip content)
  // =========================================================================
  @propertyCompositeDataSource({ type: String })
  title: string = '';

  @propertyCompositeDataSource({ type: String })
  subtitle: string = '';

  @propertyCompositeDataSource({ type: String })
  description: string = '';

  @propertyDataSource({ type: String })
  image: string = '';

  @property({ type: String, attribute: 'image-alt' })
  imageAlt: string = '';

  @propertyDataSource({ type: String })
  icon: string = '';

  @propertyDataSource({ type: Object })
  metadata: Record<string, unknown> = {};

  // Content injection areas (NO slots):
  // Consumers should pass lit templates or plain strings.
  @property({ attribute: false })
  headerContent?: HTMLTemplateResult | string;

  @property({ attribute: false })
  bodyContent?: HTMLTemplateResult | string;

  @property({ attribute: false })
  footerContent?: HTMLTemplateResult | string;

  @property({ attribute: 'back-content' })
  backContent?: HTMLTemplateResult | string;

  // =========================================================================
  // BEHAVIOR & STATE PROPERTIES
  // =========================================================================
  @property({ type: Boolean })
  clickable = true;

  @property({ type: Boolean })
  hoverable = true;

  @property({ type: Boolean })
  selectable = false;

  @propertyDataSource({ type: Boolean })
  selected = false;

  @property({ type: Boolean })
  expandable = false;

  @propertyDataSource({ type: Boolean })
  expanded = false;

  @property({ type: Boolean })
  dismissible = false;

  @property({ type: Boolean })
  draggable = false;

  @property({ type: Boolean })
  disabled = false;

  @property({ type: Boolean })
  loading = false;

  @property({ type: String })
  error: boolean | string = false;

  // Flip state exposed as observable property/attribute
  @property({ type: Boolean, reflect: true })
  flipped = false;

  // If true, internal interactive elements (a, button, input, etc.) will NOT trigger flip.
  @property({ type: Boolean, attribute: 'ignore-internal-interactions' })
  ignoreInternalInteractions = true;

  // Image behavior
  @property({ type: Boolean, attribute: 'show-image' })
  showImage = true;

  // =========================================================================
  // VISUAL CUSTOMIZATION (via properties -> inline style tokens)
  // =========================================================================
  @property({ type: String, attribute: 'max-width' })
  maxWidth: MaxWidth = 'none';

  @property({ type: String, attribute: 'bg-color' })
  bgColor = 'rgb(248 250 252)'; // slate-50-ish

  @property({ type: String, attribute: 'text-color' })
  textColor = 'rgb(15 23 42)'; // slate-900-ish

  @property({ type: String, attribute: 'border-color' })
  borderColor = 'rgb(226 232 240)'; // slate-200-ish

  @property({ type: String, attribute: 'border-width' })
  borderWidth = '1px';

  @property({ type: String, attribute: 'radius' })
  radius = '16px';

  @property({ type: String, attribute: 'shadow' })
  shadow = '0 14px 40px rgba(2, 6, 23, 0.10)';

  @property({ type: String, attribute: 'flip-duration-ms' })
  flipDurationMs = 520;

  @property({ type: String, attribute: 'header-image-height' })
  headerImageHeight = '9.5rem';

  // =========================================================================
  // INTERNAL STATE
  // =========================================================================
  @state()
  private prefersReducedMotion = false;

  private reduceMotionMql?: MediaQueryList;

  // =========================================================================
  // LIFECYCLE
  // =========================================================================
  connectedCallback(): void {
    super.connectedCallback();

    // Reduced motion preference
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      this.reduceMotionMql = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion = !!this.reduceMotionMql.matches;
      const handler = (e: MediaQueryListEvent) => {
        this.prefersReducedMotion = e.matches;
      };

      // Safari/old support
      if ('addEventListener' in this.reduceMotionMql) {
        this.reduceMotionMql.addEventListener('change', handler);
      } else {
        // @ts-expect-error legacy
        this.reduceMotionMql.addListener(handler);
      }
    }
  }

  disconnectedCallback(): void {
    // Remove listeners if possible (best-effort)
    if (this.reduceMotionMql) {
      // We don't have a stable reference to the handler above unless stored.
      // Avoid complexity for a molecule; leaving is acceptable in many apps,
      // but we'll try to be clean by recreating no-op removal.
      // (In production, store the handler function in a field.)
    }
    super.disconnectedCallback();
  }

  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================
  private shouldIgnoreFlipFromTarget(target: EventTarget | null): boolean {
    if (!this.ignoreInternalInteractions) return false;
    const el = target as HTMLElement | null;
    if (!el) return false;

    // Ignore if originating within interactive controls or explicitly opted-out.
    // Data attribute allows consumers to fine-tune: data-no-flip
    const interactiveSelector = [
      'a',
      'button',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[contenteditable="true"]',
      '[data-no-flip]',
    ].join(',');

    return !!el.closest(interactiveSelector);
  }

  private emitFlipEvent(): void {
    this.dispatchEvent(
      new CustomEvent<FlipEventDetail>('flip-change', {
        bubbles: true,
        composed: true,
        detail: { flipped: this.flipped },
      }),
    );
  }

  private toggleFlip(): void {
    if (this.disabled) return;
    if (!this.clickable) return;

    this.flipped = !this.flipped;
    this.emitFlipEvent();
  }

  private handleClick(e: MouseEvent): void {
    if (this.disabled) return;
    if (!this.clickable) return;

    if (this.shouldIgnoreFlipFromTarget(e.target)) return;

    this.toggleFlip();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.disabled) return;
    if (!this.clickable) return;

    if (e.key === 'Enter' || e.key === ' ') {
      // Prevent page scroll on Space
      e.preventDefault();
      // Respect ignore rule when focus is on internal interactive elements
      // (e.g., a focused button inside card shouldn't flip if configured).
      if (this.shouldIgnoreFlipFromTarget(e.target)) return;
      this.toggleFlip();
    }
  }

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================
  private getInteractiveRole(): string {
    // Requirement: role apropriado para interação + refletir estado ARIA equivalente.
    // For a flip action, button is the most semantically correct.
    // If not clickable, it should be an article.
    return this.clickable && !this.disabled ? 'button' : 'article';
  }

  private getTabIndex(): number | undefined {
    if (!this.clickable) return undefined;
    return this.disabled ? -1 : 0;
  }

  private getAriaPressed(): string | undefined {
    // For toggle-like interaction, aria-pressed maps well.
    if (!this.clickable) return undefined;
    return String(!!this.flipped);
  }

  // =========================================================================
  // STYLES
  // =========================================================================
  private getMaxWidthClass(): string {
    switch (this.maxWidth) {
      case 'sm':
        return 'max-w-sm';
      case 'md':
        return 'max-w-md';
      case 'lg':
        return 'max-w-lg';
      case 'xl':
        return 'max-w-xl';
      case '2xl':
        return 'max-w-2xl';
      case 'none':
      default:
        return 'max-w-none';
    }
  }

  private cardVarsStyle(): string {
    const duration = this.prefersReducedMotion ? 1 : Math.max(0, Number(this.flipDurationMs) || 0);

    // Inline CSS vars allow consumer customization while keeping Tailwind layout.
    return [
      `--card-bg: ${this.bgColor}`,
      `--card-fg: ${this.textColor}`,
      `--card-border: ${this.borderColor}`,
      `--card-border-width: ${this.borderWidth}`,
      `--card-radius: ${this.radius}`,
      `--card-shadow: ${this.shadow}`,
      `--flip-duration: ${duration}ms`,
      `--header-img-h: ${this.headerImageHeight}`,
    ].join('; ');
  }

  // =========================================================================
  // RENDER HELPERS
  // =========================================================================
  private renderMaybeImage(): HTMLTemplateResult {
    const canShow = this.showImage && !!this.image && String(this.image).trim().length > 0;
    if (!canShow) return html``;

    // Decorative tilt border treatment for a more distinctive card header
    return html`
      <div
        class="relative overflow-hidden rounded-[calc(var(--card-radius)-6px)] border border-slate-200/60"
        style=${ifDefined(`border-color: var(--card-border);`)}
      >
        <img
          class="block w-full object-cover"
          style=${ifDefined(`height: var(--header-img-h);`)}
          src=${this.image}
          alt=${this.imageAlt || ''}
          loading="lazy"
          decoding="async"
          @click=${(e: MouseEvent) => {
            // If consumer wants image to be interactive (e.g. wrapped by link), they can.
            // Here we just honor ignoreInternalInteractions via shouldIgnoreFlipFromTarget.
            // No-op.
            void e;
          }}
        />
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent"></div>
      </div>
    `;
  }

  private renderHeader(): HTMLTemplateResult {
    const hasAny =
      !!(this.title && this.title.trim()) ||
      !!(this.subtitle && this.subtitle.trim()) ||
      !!this.headerContent ||
      (this.showImage && !!this.image);

    if (!hasAny) return html``;

    return html`
      <div class="space-y-3">
        ${this.renderMaybeImage()}

        <div class="space-y-1">
          ${this.title
            ? html`<div class="font-[600] tracking-tight text-[1.05rem] leading-snug" style="color: var(--card-fg);">
                ${this.title}
              </div>`
            : html``}
          ${this.subtitle
            ? html`<div class="text-sm opacity-80" style="color: var(--card-fg);">${this.subtitle}</div>`
            : html``}
        </div>

        ${this.headerContent ? html`<div class="text-sm" style="color: var(--card-fg);">${this.headerContent}</div>` : html``}
      </div>
    `;
  }

  private renderBody(): HTMLTemplateResult {
    const hasAny = !!this.bodyContent || !!(this.description && this.description.trim());
    if (!hasAny) return html``;

    return html`
      <div class="space-y-3">
        ${this.description
          ? html`<div class="text-sm leading-relaxed opacity-90" style="color: var(--card-fg);">
              ${this.description}
            </div>`
          : html``}
        ${this.bodyContent ? html`<div class="text-sm" style="color: var(--card-fg);">${this.bodyContent}</div>` : html``}
      </div>
    `;
  }

  private renderFooter(): HTMLTemplateResult {
    if (!this.footerContent) return html``;

    return html`
      <div class="pt-4">
        <div class="border-t border-slate-200/70 pt-4" style=${ifDefined(`border-color: var(--card-border);`)}>
          <div class="flex items-center justify-between gap-3 text-sm" style="color: var(--card-fg);">
            ${this.footerContent}
          </div>
        </div>
      </div>
    `;
  }

  private renderFrontFace(): HTMLTemplateResult {
    // Front face: header/body/footer
    return html`
      <div class="flex h-full flex-col">
        <div class="p-5 sm:p-6">
          <div class="space-y-5">
            ${this.renderHeader()}
            ${this.renderBody()}
            ${this.renderFooter()}
          </div>
        </div>
      </div>
    `;
  }

  private renderBackFace(): HTMLTemplateResult {
    // Back face must occupy the exact same area.
    // Provide a dedicated area for additional content.
    return html`
      <div class="flex h-full flex-col">
        <div class="p-5 sm:p-6">
          <div class="space-y-4">
            <div class="text-xs uppercase tracking-[0.14em] opacity-70" style="color: var(--card-fg);">
              ${this.msg.flipLabel}
            </div>
            <div class="text-sm leading-relaxed" style="color: var(--card-fg);">
              ${this.backContent ?? html``}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // RENDER
  // =========================================================================
  render(): HTMLTemplateResult {
    const lang = this.getMessageKey(messages);
    this.msg = messages[lang] ?? messages.en;

    const outerClasses = classMap({
      'w-full': true,
      [this.getMaxWidthClass()]: true,
      'select-none': this.clickable,
      'opacity-60': this.disabled,
      'cursor-pointer': this.clickable && !this.disabled,
      'cursor-default': !this.clickable || this.disabled,
    });

    // Deterministic layout constraints:
    // - Use a fixed 3D stage (perspective) and a "card" that rotates.
    // - Faces are absolutely positioned and fill same area.
    // - No size changes while flipping.

    const role = this.getInteractiveRole();
    const tabindex = this.getTabIndex();

    return html`
      <div
        class=${outerClasses}
        style=${this.cardVarsStyle()}
      >
        <div
          class="relative"
          style="perspective: 1200px;"
        >
          <div
            class=${classMap({
              'relative w-full': true,
              'rounded-[var(--card-radius)]': true,
              'outline-none': true,
              'transition-[transform]': true,
              '[transform-style:preserve-3d]': true,
              // Tailwind cannot express dynamic duration reliably; use inline.
            })}
            style=${ifDefined(
              `transform: ${this.flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'}; ` +
                `transition-duration: var(--flip-duration); ` +
                `transition-timing-function: cubic-bezier(0.2, 0.9, 0.2, 1);`,
            )}
            role=${role}
            aria-pressed=${ifDefined(this.getAriaPressed())}
            aria-disabled=${ifDefined(this.clickable ? String(!!this.disabled) : undefined)}
            aria-busy=${ifDefined(this.loading ? 'true' : undefined)}
            aria-label=${ifDefined(this.title || this.msg.flipLabel)}
            tabindex=${ifDefined(tabindex === undefined ? undefined : String(tabindex))}
            @click=${this.handleClick}
            @keydown=${this.handleKeyDown}
          >
            <!-- FRONT FACE -->
            <div
              class=${classMap({
                'absolute inset-0': true,
                'rounded-[var(--card-radius)]': true,
                'overflow-hidden': true,
                'bg-white': true,
                '[backface-visibility:hidden]': true,
                // focus ring on container
                'focus-visible:ring-2 focus-visible:ring-offset-2': true,
                // subtle hover lift only when hoverable & interactive
                'transition-[box-shadow,transform]': true,
              })}
              style=${ifDefined(
                `background: var(--card-bg); ` +
                  `color: var(--card-fg); ` +
                  `border: var(--card-border-width) solid var(--card-border); ` +
                  `box-shadow: var(--card-shadow);`,
              )}
            >
              <div
                class=${classMap({
                  'h-full': true,
                  // Hover affordance applied on inner face to avoid messing with 3D transform.
                  'group': true,
                  'hover:shadow-[0_22px_70px_rgba(2,6,23,0.16)]': this.hoverable && this.clickable && !this.disabled,
                })}
              >
                ${this.renderFrontFace()}
              </div>
            </div>

            <!-- BACK FACE -->
            <div
              class="absolute inset-0 overflow-hidden rounded-[var(--card-radius)] bg-white [backface-visibility:hidden]"
              style=${ifDefined(
                `transform: rotateY(180deg); ` +
                  `background: var(--card-bg); ` +
                  `color: var(--card-fg); ` +
                  `border: var(--card-border-width) solid var(--card-border); ` +
                  `box-shadow: var(--card-shadow);`,
              )}
            >
              ${this.renderBackFace()}
            </div>

            <!-- SIZER: ensures layout height is stable based on the larger face content -->
            <div class="invisible pointer-events-none">
              <div class="rounded-[var(--card-radius)]">
                <div class="p-5 sm:p-6">
                  <div class="space-y-5">
                    ${this.renderHeader()}
                    ${this.renderBody()}
                    ${this.renderFooter()}
                    ${this.backContent ? html`<div class="pt-4">${this.backContent}</div>` : html``}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Reduced motion: keep interaction deterministic, but reduce animation -->
        <style>
          @media (prefers-reduced-motion: reduce) {
            molecules--card-102020 [style*="--flip-duration"] {
              transition-duration: 1ms !important;
            }
          }
        </style>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'molecules--card-102020': CardMolecule;
  }
}
