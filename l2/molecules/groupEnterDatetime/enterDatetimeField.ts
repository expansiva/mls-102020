/// <mls fileReference="_102020_/l2/molecules/groupEnterDatetime/enterDatetimeField.ts" enhancement="_102020_/l2/enhancementAura" />

// =============================================================================
// ENTER DATETIME FIELD MOLECULE
// =============================================================================
// Skill Group: enter + datetime
// This molecule is presentation-only. No backend calls. No global state access.
// - No Shadow DOM
// - Tailwind CSS classes
// - Slot Tags: Label, Helper
// =============================================================================
import { html, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { propertyDataSource } from '/_102027_/l2/collabDecorators';
import { MoleculeAuraElement } from '/_102020_/l2/moleculeBase.js';

/// **collab_i18n_start**
const message_en = {
  placeholder: 'Select date and time',
  clear: 'Clear',
  confirm: 'Confirm',
  loading: 'Loading...',
  invalidDate: 'Invalid date',
  invalidTime: 'Invalid time',
  dialogLabel: 'Date and time picker',
  prevMonth: 'Previous month',
  nextMonth: 'Next month',
  hours: 'Hours',
  minutes: 'Minutes',
  viewEmpty: '—',
};

type MessageType = typeof message_en;

const messages: Record<string, MessageType> = {
  en: message_en,
  pt: {
    placeholder: 'Selecione data e hora',
    clear: 'Limpar',
    confirm: 'Confirmar',
    loading: 'Carregando...',
    invalidDate: 'Data inválida',
    invalidTime: 'Hora inválida',
    dialogLabel: 'Seletor de data e hora',
    prevMonth: 'Mês anterior',
    nextMonth: 'Próximo mês',
    hours: 'Horas',
    minutes: 'Minutos',
    viewEmpty: '—',
  },
};
/// **collab_i18n_end**

type LocalParts = {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number;
  minute: number;
  second: number;
};

type DateParts = { year: number; month: number; day: number };

type TimeParts = { hour: number; minute: number };

@customElement('molecules--group-enter-datetime--enter-datetime-field-102020')
export class EnterDatetimeFieldMolecule extends MoleculeAuraElement {
  private msg: MessageType = messages.en;

  // ===========================================================================
  // SLOT TAGS
  // ===========================================================================
  slotTags = ['Label', 'Helper'];

  // ===========================================================================
  // PROPERTIES — Contract
  // ===========================================================================
  // Data
  @propertyDataSource({ type: String })
  value: string | null = null; // ISO: YYYY-MM-DDTHH:mm:ss

  @propertyDataSource({ type: String })
  error: string = '';

  @propertyDataSource({ type: String })
  name: string = '';

  // Configuration
  @propertyDataSource({ type: String })
  locale: string = '';

  @propertyDataSource({ type: String })
  timezone: string = '';

  @propertyDataSource({ type: String })
  minDatetime: string = '';

  @propertyDataSource({ type: String })
  maxDatetime: string = '';

  @propertyDataSource({ type: Number })
  minuteStep: number = 1;

  @propertyDataSource({ type: String })
  placeholder: string = '';

  // States
  @propertyDataSource({ type: Boolean })
  isEditing: boolean = true;

  @propertyDataSource({ type: Boolean })
  disabled: boolean = false;

  @propertyDataSource({ type: Boolean })
  readonly: boolean = false;

  @propertyDataSource({ type: Boolean })
  required: boolean = false;

  @propertyDataSource({ type: Boolean })
  loading: boolean = false;

  // ===========================================================================
  // INTERNAL STATE
  // ===========================================================================
  @state()
  private isOpen: boolean = false;

  @state()
  private isFocused: boolean = false;

  // Derived display state
  @state()
  private displayValue: string = '';

  // Draft selection in picker
  @state()
  private draftDate: DateParts | null = null;

  @state()
  private draftTime: TimeParts | null = null;

  @state()
  private viewYear: number = new Date().getFullYear();

  @state()
  private viewMonth: number = new Date().getMonth() + 1; // 1-12

  // ===========================================================================
  // STATE CHANGE HANDLER — keep derived display in sync with external state
  // ===========================================================================
  handleIcaStateChange(key: string, value: any) {
    const valueAttr = this.getAttribute('value');
    const localeAttr = this.getAttribute('locale');
    const tzAttr = this.getAttribute('timezone');

    if (valueAttr === `{{${key}}}` || localeAttr === `{{${key}}}` || tzAttr === `{{${key}}}`) {
      this.displayValue = this.formatForDisplay(this.value);
      if (!this.isOpen) {
        this.syncDraftFromValue();
      }
    }

    this.requestUpdate();
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================
  firstUpdated() {
    this.msg = messages[this.getMessageKey(messages)];
    this.displayValue = this.formatForDisplay(this.value);
    this.syncDraftFromValue();

    // Close on outside click
    window.addEventListener('pointerdown', this.handleGlobalPointerDown, { capture: true });
    window.addEventListener('keydown', this.handleGlobalKeyDown, { capture: true });
  }

  disconnectedCallback() {
    window.removeEventListener('pointerdown', this.handleGlobalPointerDown, { capture: true } as any);
    window.removeEventListener('keydown', this.handleGlobalKeyDown, { capture: true } as any);
    super.disconnectedCallback();
  }

  // ===========================================================================
  // GLOBAL HANDLERS
  // ===========================================================================
  private handleGlobalPointerDown = (e: Event) => {
    if (!this.isOpen) return;
    const path = (e as PointerEvent).composedPath?.() || [];
    const isInside = path.includes(this);
    if (!isInside) {
      this.isOpen = false;
      this.requestUpdate();
    }
  };

  private handleGlobalKeyDown = (e: KeyboardEvent) => {
    if (!this.isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.isOpen = false;
      this.requestUpdate();
    }
  };

  // ===========================================================================
  // HELPERS — parsing/formatting
  // ===========================================================================
  private normalizeMinuteStep(step: number): number {
    if (!Number.isFinite(step) || step <= 0) return 1;
    if (step > 60) return 60;
    return Math.floor(step);
  }

  private pad2(n: number): string {
    return String(n).padStart(2, '0');
  }

  private parseIsoLocal(value: string | null): LocalParts | null {
    if (!value) return null;
    // Expected: YYYY-MM-DDTHH:mm:ss (seconds required by contract)
    const m = value.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/
    );
    if (!m) return null;

    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const hour = Number(m[4]);
    const minute = Number(m[5]);
    const second = Number(m[6]);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day) ||
      !Number.isFinite(hour) ||
      !Number.isFinite(minute) ||
      !Number.isFinite(second)
    ) {
      return null;
    }

    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    if (hour < 0 || hour > 23) return null;
    if (minute < 0 || minute > 59) return null;
    if (second < 0 || second > 59) return null;

    // Basic validity check using Date rollover
    const d = new Date(year, month - 1, day, hour, minute, second);
    if (
      d.getFullYear() !== year ||
      d.getMonth() !== month - 1 ||
      d.getDate() !== day ||
      d.getHours() !== hour ||
      d.getMinutes() !== minute ||
      d.getSeconds() !== second
    ) {
      return null;
    }

    return { year, month, day, hour, minute, second };
  }

  private toIsoLocal(parts: { year: number; month: number; day: number; hour: number; minute: number }): string {
    // Always seconds = 00 by contract when user selects
    return `${parts.year}-${this.pad2(parts.month)}-${this.pad2(parts.day)}T${this.pad2(parts.hour)}:${this.pad2(parts.minute)}:00`;
  }

  private formatForDisplay(value: string | null): string {
    if (!value) return '';
    const p = this.parseIsoLocal(value);
    if (!p) return value;

    // NOTE: Timezone support is limited without Temporal/polyfill.
    // If timezone is empty: use local Date.
    // If timezone is provided: we still format using Intl with timeZone option,
    // but the underlying Date is constructed as local time. This is a best-effort display.
    const d = new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const locale = (this.locale || '').trim() || undefined;
    const timeZone = (this.timezone || '').trim() || undefined;

    try {
      const formatter = new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: undefined,
        timeZone,
      });
      return formatter.format(d);
    } catch {
      // Fallback
      return `${this.pad2(p.day)}/${this.pad2(p.month)}/${p.year} ${this.pad2(p.hour)}:${this.pad2(p.minute)}`;
    }
  }

  private syncDraftFromValue(): void {
    const parsed = this.parseIsoLocal(this.value);
    if (!parsed) {
      const now = new Date();
      this.viewYear = now.getFullYear();
      this.viewMonth = now.getMonth() + 1;
      this.draftDate = null;
      this.draftTime = null;
      return;
    }

    this.viewYear = parsed.year;
    this.viewMonth = parsed.month;
    this.draftDate = { year: parsed.year, month: parsed.month, day: parsed.day };
    this.draftTime = { hour: parsed.hour, minute: parsed.minute };
  }

  private clampViewMonth(year: number, month: number): { year: number; month: number } {
    let y = year;
    let m = month;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    return { year: y, month: m };
  }

  private getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }

  private getFirstWeekday(year: number, month: number): number {
    // 0 = Sunday
    return new Date(year, month - 1, 1).getDay();
  }

  private getLabelId(): string {
    return `${this.localName}-label`;
  }

  private getHelperOrErrorId(): string {
    return `${this.localName}-help`;
  }

  private getHasError(): boolean {
    return this.isEditing && !!this.error;
  }

  private getMinParts(): LocalParts | null {
    const v = (this.minDatetime || '').trim();
    return v ? this.parseIsoLocal(v) : null;
  }

  private getMaxParts(): LocalParts | null {
    const v = (this.maxDatetime || '').trim();
    return v ? this.parseIsoLocal(v) : null;
  }

  private compareLocal(a: LocalParts, b: LocalParts): number {
    // Compare lexicographically by components
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    if (a.day !== b.day) return a.day - b.day;
    if (a.hour !== b.hour) return a.hour - b.hour;
    if (a.minute !== b.minute) return a.minute - b.minute;
    return a.second - b.second;
  }

  private isDayDisabled(date: DateParts): boolean {
    const min = this.getMinParts();
    const max = this.getMaxParts();

    if (!min && !max) return false;

    // Compare at day granularity
    const dayStart: LocalParts = { ...date, hour: 0, minute: 0, second: 0 };
    const dayEnd: LocalParts = { ...date, hour: 23, minute: 59, second: 59 };

    if (min && this.compareLocal(dayEnd, min) < 0) return true;
    if (max && this.compareLocal(dayStart, max) > 0) return true;

    return false;
  }

  private isTimeDisabledForDate(date: DateParts, time: TimeParts): boolean {
    const min = this.getMinParts();
    const max = this.getMaxParts();
    if (!min && !max) return false;

    const candidate: LocalParts = { ...date, ...time, second: 0 };

    if (min && this.compareLocal(candidate, min) < 0) return true;
    if (max && this.compareLocal(candidate, max) > 0) return true;

    return false;
  }

  private getMinuteOptions(): number[] {
    const step = this.normalizeMinuteStep(this.minuteStep);
    const options: number[] = [];
    for (let m = 0; m <= 59; m += step) options.push(m);
    return options;
  }

  private getTriggerAriaLabel(): string {
    const formatted = this.formatForDisplay(this.value);
    if (formatted) return formatted;
    return (this.placeholder || '').trim() || this.msg.placeholder;
  }

  // ===========================================================================
  // EVENTS
  // ===========================================================================
  private emitChange() {
    this.dispatchEvent(
      new CustomEvent('change', {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
      })
    );
  }

  private emitFocus() {
    this.dispatchEvent(
      new CustomEvent('focus', {
        bubbles: true,
        composed: true,
        detail: {},
      })
    );
  }

  private emitBlur() {
    this.dispatchEvent(
      new CustomEvent('blur', {
        bubbles: true,
        composed: true,
        detail: {},
      })
    );
  }

  // ===========================================================================
  // UI HANDLERS
  // ===========================================================================
  private handleTriggerClick() {
    if (!this.isEditing) return;
    if (this.disabled || this.readonly) return;
    if (this.loading) return;

    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.syncDraftFromValue();
    }
  }

  private handleTriggerFocus() {
    if (!this.isEditing) return;
    if (this.disabled) return;
    this.isFocused = true;
    this.emitFocus();
  }

  private handleTriggerBlur() {
    if (!this.isEditing) return;
    this.isFocused = false;
    this.emitBlur();
  }

  private handlePrevMonth() {
    const next = this.clampViewMonth(this.viewYear, this.viewMonth - 1);
    this.viewYear = next.year;
    this.viewMonth = next.month;
  }

  private handleNextMonth() {
    const next = this.clampViewMonth(this.viewYear, this.viewMonth + 1);
    this.viewYear = next.year;
    this.viewMonth = next.month;
  }

  private handlePickDay(day: number) {
    const date: DateParts = { year: this.viewYear, month: this.viewMonth, day };
    if (this.isDayDisabled(date)) return;
    this.draftDate = date;

    // If time is missing, initialize to nearest minute step at current hour
    if (!this.draftTime) {
      const now = new Date();
      const step = this.normalizeMinuteStep(this.minuteStep);
      const m = Math.floor(now.getMinutes() / step) * step;
      this.draftTime = { hour: now.getHours(), minute: m };
    }

    // If selected time is outside range for boundary day, adjust by clearing time
    if (this.draftTime && this.isTimeDisabledForDate(date, this.draftTime)) {
      this.draftTime = null;
    }
  }

  private handlePickHour(hour: number) {
    if (!this.draftDate) {
      // require date first
      return;
    }

    const nextTime: TimeParts = { hour, minute: this.draftTime?.minute ?? 0 };
    if (this.isTimeDisabledForDate(this.draftDate, nextTime)) {
      // keep selection, but do nothing (disabled)
      return;
    }
    this.draftTime = nextTime;
  }

  private handlePickMinute(minute: number) {
    if (!this.draftDate) return;
    const hour = this.draftTime?.hour ?? 0;
    const nextTime: TimeParts = { hour, minute };
    if (this.isTimeDisabledForDate(this.draftDate, nextTime)) return;
    this.draftTime = nextTime;
  }

  private handleClear() {
    if (this.disabled || this.readonly) return;
    this.value = null;
    this.displayValue = this.formatForDisplay(this.value);
    this.isOpen = false;
    this.draftDate = null;
    this.draftTime = null;
    this.emitChange();
  }

  private handleConfirm() {
    if (this.disabled || this.readonly) return;
    if (!this.draftDate || !this.draftTime) return;
    if (this.isTimeDisabledForDate(this.draftDate, this.draftTime)) return;

    this.value = this.toIsoLocal({
      ...this.draftDate,
      ...this.draftTime,
    });
    this.displayValue = this.formatForDisplay(this.value);
    this.isOpen = false;
    this.emitChange();
  }

  // ===========================================================================
  // RENDER HELPERS
  // ===========================================================================
  private renderLabel(): TemplateResult {
    if (!this.hasSlot('Label')) return html``;

    const requiredMark = this.required && this.isEditing ? html`<span class="text-rose-600">*</span>` : nothing;

    return html`
      <div class="mb-1 flex items-center justify-between">
        <div id=${this.getLabelId()} class="text-sm font-medium text-slate-700">
          <span>${this.getSlotContent('Label')}</span>
          ${requiredMark}
        </div>
      </div>
    `;
  }

  private renderViewMode(): TemplateResult {
    const formatted = this.formatForDisplay(this.value);
    const toShow = formatted ? formatted : this.msg.viewEmpty;

    return html`
      <div class="w-full">
        ${this.renderLabel()}
        <div class="text-sm text-slate-900">${toShow}</div>
      </div>
    `;
  }

  private getTriggerClasses(): string {
    const hasError = this.getHasError();

    return [
      'w-full rounded-md border px-3 py-2 text-sm transition flex items-center justify-between gap-2',
      'bg-white',
      this.disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
      this.readonly ? 'bg-slate-50' : '',
      hasError ? 'border-rose-500' : 'border-slate-300',
      this.isFocused ? 'ring-2 ring-sky-500 ring-offset-1' : 'hover:border-slate-400',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private renderTrigger(): TemplateResult {
    const placeholder = (this.placeholder || '').trim() || this.msg.placeholder;
    const formatted = this.formatForDisplay(this.value);
    const text = formatted || placeholder;
    const isPlaceholder = !formatted;

    const describedById = this.getHelperOrErrorId();
    const labelId = this.hasSlot('Label') ? this.getLabelId() : undefined;

    return html`
      <button
        type="button"
        class=${this.getTriggerClasses()}
        ?disabled=${this.disabled}
        aria-label=${this.getTriggerAriaLabel()}
        aria-labelledby=${labelId || nothing}
        aria-describedby=${this.isEditing && (this.getHasError() || this.hasSlot('Helper')) ? describedById : nothing}
        aria-invalid=${this.getHasError() ? 'true' : 'false'}
        aria-required=${this.required ? 'true' : 'false'}
        @click=${this.handleTriggerClick}
        @focus=${this.handleTriggerFocus}
        @blur=${this.handleTriggerBlur}
      >
        <span class=${['truncate', isPlaceholder ? 'text-slate-400' : 'text-slate-900'].join(' ')}>${text}</span>
        <span class="flex items-center gap-2">
          ${this.loading
            ? html`<span class="text-xs text-slate-500">${this.msg.loading}</span>`
            : nothing}
          <span class="text-slate-500" aria-hidden="true">📅</span>
          <span class="text-slate-500" aria-hidden="true">🕒</span>
        </span>
      </button>
    `;
  }

  private renderBelow(): TemplateResult {
    if (!this.isEditing) return html``;

    const id = this.getHelperOrErrorId();

    if (this.getHasError()) {
      return html`<div id=${id} class="mt-1 text-sm text-rose-600">${this.error}</div>`;
    }

    if (this.hasSlot('Helper')) {
      return html`<div id=${id} class="mt-1 text-sm text-slate-500">${this.getSlotContent('Helper')}</div>`;
    }

    return html``;
  }

  private getDayCellClasses(isSelected: boolean, disabled: boolean): string {
    return [
      'h-9 w-9 rounded-md text-sm flex items-center justify-center border transition',
      disabled ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400' : 'cursor-pointer border-slate-200 hover:bg-slate-50',
      isSelected ? 'bg-sky-50 border-sky-400 text-sky-900' : 'bg-white text-slate-900',
      !disabled ? 'focus:outline-none focus:ring-2 focus:ring-sky-500' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private renderCalendar(): TemplateResult {
    const year = this.viewYear;
    const month = this.viewMonth;
    const daysInMonth = this.getDaysInMonth(year, month);
    const firstWeekday = this.getFirstWeekday(year, month);

    const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const selected = this.draftDate;

    // Build 6 weeks grid
    const cells: Array<{ day: number | null; date?: DateParts; disabled?: boolean; selected?: boolean }> = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const date: DateParts = { year, month, day: d };
      const dis = this.isDayDisabled(date);
      const sel = !!selected && selected.year === year && selected.month === month && selected.day === d;
      cells.push({ day: d, date, disabled: dis, selected: sel });
    }
    while (cells.length < 42) cells.push({ day: null });

    const monthLabel = new Intl.DateTimeFormat((this.locale || '').trim() || undefined, {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, month - 1, 1));

    return html`
      <div class="w-full">
        <div class="flex items-center justify-between mb-2">
          <button
            type="button"
            class="rounded-md px-2 py-1 text-sm border border-slate-200 hover:bg-slate-50"
            @click=${this.handlePrevMonth}
            aria-label=${this.msg.prevMonth}
          >
            ‹
          </button>
          <div class="text-sm font-medium text-slate-800">${monthLabel}</div>
          <button
            type="button"
            class="rounded-md px-2 py-1 text-sm border border-slate-200 hover:bg-slate-50"
            @click=${this.handleNextMonth}
            aria-label=${this.msg.nextMonth}
          >
            ›
          </button>
        </div>

        <div class="grid grid-cols-7 gap-1 mb-1">
          ${weekdayLabels.map(
            w => html`<div class="text-[11px] uppercase tracking-wide text-slate-500 text-center">${w}</div>`
          )}
        </div>

        <div class="grid grid-cols-7 gap-1" role="grid">
          ${cells.map(cell => {
            if (!cell.day || !cell.date) {
              return html`<div class="h-9 w-9"></div>`;
            }
            const disabled = !!cell.disabled;
            const selectedCell = !!cell.selected;
            const cls = this.getDayCellClasses(selectedCell, disabled);
            return html`
              <button
                type="button"
                class=${cls}
                role="gridcell"
                aria-selected=${selectedCell ? 'true' : 'false'}
                aria-disabled=${disabled ? 'true' : 'false'}
                ?disabled=${disabled}
                @click=${() => this.handlePickDay(cell.day as number)}
              >
                ${cell.day}
              </button>
            `;
          })}
        </div>
      </div>
    `;
  }

  private getOptionClasses(selected: boolean, disabled: boolean): string {
    return [
      'w-full text-left px-2 py-1 rounded-md text-sm border transition',
      disabled ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400' : 'cursor-pointer border-slate-200 hover:bg-slate-50',
      selected ? 'bg-sky-50 border-sky-400 text-sky-900' : 'bg-white text-slate-900',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private renderTimePickers(): TemplateResult {
    const date = this.draftDate;
    const time = this.draftTime;

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = this.getMinuteOptions();

    const canPickTime = !!date;

    return html`
      <div class="grid grid-cols-2 gap-3">
        <div>
          <div class="text-xs font-medium text-slate-600 mb-1">${this.msg.hours}</div>
          <div class="max-h-56 overflow-auto rounded-md border border-slate-200 p-1 bg-white">
            ${hours.map(h => {
              const selected = !!time && time.hour === h;
              const disabled = !canPickTime || (date ? this.isTimeDisabledForDate(date, { hour: h, minute: time?.minute ?? 0 }) : true);
              return html`
                <button
                  type="button"
                  class=${this.getOptionClasses(selected, disabled)}
                  ?disabled=${disabled}
                  @click=${() => this.handlePickHour(h)}
                >
                  ${this.pad2(h)}
                </button>
              `;
            })}
          </div>
        </div>

        <div>
          <div class="text-xs font-medium text-slate-600 mb-1">${this.msg.minutes}</div>
          <div class="max-h-56 overflow-auto rounded-md border border-slate-200 p-1 bg-white">
            ${minutes.map(m => {
              const selected = !!time && time.minute === m;
              const hour = time?.hour ?? 0;
              const disabled = !canPickTime || (date ? this.isTimeDisabledForDate(date, { hour, minute: m }) : true);
              return html`
                <button
                  type="button"
                  class=${this.getOptionClasses(selected, disabled)}
                  ?disabled=${disabled}
                  @click=${() => this.handlePickMinute(m)}
                >
                  ${this.pad2(m)}
                </button>
              `;
            })}
          </div>
        </div>
      </div>
    `;
  }

  private renderActions(): TemplateResult {
    const canConfirm =
      !!this.draftDate &&
      !!this.draftTime &&
      !this.isTimeDisabledForDate(this.draftDate, this.draftTime) &&
      !this.disabled &&
      !this.readonly;

    const clearDisabled = this.disabled || this.readonly;

    return html`
      <div class="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          class=${[
            'rounded-md px-3 py-2 text-sm border transition',
            clearDisabled ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800',
          ].join(' ')}
          ?disabled=${clearDisabled}
          @click=${this.handleClear}
        >
          ${this.msg.clear}
        </button>
        <button
          type="button"
          class=${[
            'rounded-md px-3 py-2 text-sm border transition',
            canConfirm ? 'border-sky-600 bg-sky-600 text-white hover:bg-sky-700' : 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500',
          ].join(' ')}
          ?disabled=${!canConfirm}
          @click=${this.handleConfirm}
        >
          ${this.msg.confirm}
        </button>
      </div>
    `;
  }

  private renderPanel(): TemplateResult {
    if (!this.isOpen) return html``;

    return html`
      <div
        class="absolute z-20 mt-2 w-full rounded-md border border-slate-200 bg-white shadow-lg p-3"
        role="dialog"
        aria-modal="true"
        aria-label=${this.msg.dialogLabel}
      >
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          ${this.renderCalendar()}
          ${this.renderTimePickers()}
        </div>
        ${this.renderActions()}
      </div>
    `;
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================
  render() {
    this.msg = messages[this.getMessageKey(messages)];

    if (!this.isEditing) {
      return this.renderViewMode();
    }

    const containerClasses = [
      'relative w-full',
      this.disabled ? 'select-none' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return html`
      <div class=${containerClasses}>
        ${this.renderLabel()}

        <input type="hidden" name=${this.name || nothing} .value=${this.value ?? ''} />

        ${this.renderTrigger()}
        ${this.renderPanel()}
        ${this.renderBelow()}
      </div>
    `;
  }
}
