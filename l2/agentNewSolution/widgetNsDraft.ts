/// <mls fileReference="_102020_/l2/agentNewSolution/widgetNsDraft.ts" enhancement="_102027_/l2/enhancementLit"/>
import { msgApplyIntents } from '/_102036_/l2/shared/api.js';

import { html, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import {
  nsPipelineArtifactFileInfo,
  readJsonArtifact,
  readStorText,
} from '/_102020_/l2/agentNewSolution/helpers/nsFs.js';
import {
  NsPipelineState,
  approveNsStep,
  createNsPipeline,
  readNsPipeline,
  writeNsPipeline,
} from '/_102020_/l2/agentNewSolution/helpers/nsPipeline.js';
import type { NsE1DraftArtifact } from '/_102020_/l2/agentNewSolution/steps/e1-draft/gate.js';

interface WidgetValue {
  taskId: string;
  moduleName: string;
  stepId: number;
  parentStepId: number;
  rerunParentStepId: number;
  hookSequential: number;
  senderId: string;
  threadId: string;
  messageId: string;
  uiLabels?: Partial<typeof message_en>;
}

const message_en = {
  title: 'Understanding draft',
  approve: 'Approve',
  adjust: 'Adjust',
  adjustmentPlaceholder: 'Describe the smallest change needed in this draft.',
  approving: 'Approving...',
  adjusting: 'Requesting adjustment...',
  approved: 'Approved. The next step can run.',
  loading: 'Loading...',
  noDraft: 'No E1 draft artifact found.',
  gateOk: 'Gate passed',
  gateFailed: 'Gate failed',
  adjustDraftStepTitle: 'Adjust draft',
};

@customElement('widget-ns-draft-102020')
export class WidgetNsDraft102020 extends StateLitElement {
  @property({ type: Object }) value: WidgetValue | null = null;

  @state() private _loading = true;
  @state() private _artifact: NsE1DraftArtifact | null = null;
  @state() private _markdown = '';
  @state() private _pipeline: NsPipelineState | null = null;
  @state() private _adjustment = '';
  @state() private _busy: 'approve' | 'adjust' | null = null;
  @state() private _done = false;
  @state() private _error = '';

  private _loadedFor = '';

  override async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await this._load();
  }

  override updated(changed: Map<PropertyKey, unknown>): void {
    super.updated(changed);
    if (changed.has('value') && this.value && this.value.moduleName !== this._loadedFor) void this._load();
  }

  private get _msg(): typeof message_en {
    return { ...message_en, ...(this.value?.uiLabels || {}) };
  }

  private async _load(): Promise<void> {
    if (!this.value?.moduleName) return;
    this._loadedFor = this.value.moduleName;
    this._loading = true;
    this._error = '';
    try {
      this._artifact = await readJsonArtifact<NsE1DraftArtifact>(nsPipelineArtifactFileInfo(this.value.moduleName, 'e1-draft', '.json'), false);
      this._markdown = await readStorText(nsPipelineArtifactFileInfo(this.value.moduleName, 'e1-draft', '.md'), false);
      this._pipeline = await readNsPipeline(this.value.moduleName);
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._loading = false;
    }
  }

  override render(): TemplateResult {
    const m = this._msg;
    if (this._loading) return html`<div class="ns-draft"><div class="ns-state">${m.loading}</div></div>`;
    if (this._error) return html`<div class="ns-draft"><div class="ns-state ns-error">${this._error}</div></div>`;
    if (!this._artifact) return html`<div class="ns-draft"><div class="ns-state">${m.noDraft}</div></div>`;
    return html`
      <section class="ns-draft">
        <header class="ns-head">
          <div>
            <h3>${m.title}</h3>
            <p>${this._artifact.moduleTitle} <span>${this._artifact.moduleName}</span></p>
          </div>
          ${this._renderGate()}
        </header>
        <pre class="ns-md">${this._markdown}</pre>
        ${this._done ? html`<div class="ns-done">${m.approved}</div>` : this._renderActions()}
      </section>
    `;
  }

  private _renderGate(): TemplateResult {
    const m = this._msg;
    const gate = this._pipeline?.steps['e1-draft']?.lastGate;
    if (!gate) return html``;
    return html`<span class="ns-gate ${gate.ok ? 'ns-gate--ok' : 'ns-gate--bad'}">${gate.ok ? m.gateOk : m.gateFailed}</span>`;
  }

  private _renderActions(): TemplateResult {
    const m = this._msg;
    return html`
      <div class="ns-actions">
        <textarea
          .value=${this._adjustment}
          placeholder=${m.adjustmentPlaceholder}
          @input=${(event: Event) => { this._adjustment = (event.target as HTMLTextAreaElement).value; }}
          ?disabled=${!!this._busy}
        ></textarea>
        <div class="ns-buttons">
          <button class="ns-secondary" ?disabled=${!!this._busy || !this._adjustment.trim()} @click=${() => this._onAdjust()}>
            ${this._busy === 'adjust' ? m.adjusting : m.adjust}
          </button>
          <button class="ns-primary" ?disabled=${!!this._busy} @click=${() => this._onApprove()}>
            ${this._busy === 'approve' ? m.approving : m.approve}
          </button>
        </div>
      </div>
    `;
  }

  private async _onApprove(): Promise<void> {
    if (!this.value || !this._artifact || this._busy) return;
    this._busy = 'approve';
    this._error = '';
    try {
      const pipeline = approveNsStep(this._pipeline || await readNsPipeline(this._artifact.moduleName) || this._newPipelineFallback(), 'e1-draft', 'human');
      await writeNsPipeline(pipeline);
      this._pipeline = pipeline;
      // Write the answer result (completes checkpoint-draft via children + unlocks e2-journeys),
      // then complete the review clarification. Order matters: the result is added while the parent
      // agent is still open.
      await this._applyIntents([this._checkpointAnswerStep(), this._checkpointStatus('completed', 'checkpoint-draft approved')]);
      this._done = true;
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._busy = null;
    }
  }

  private async _onAdjust(): Promise<void> {
    if (!this.value || !this._artifact || this._busy || !this._adjustment.trim()) return;
    this._busy = 'adjust';
    this._error = '';
    try {
      const addStep: mls.msg.AgentIntentAddStep = {
        type: 'add-step',
        messageId: this.value.messageId,
        threadId: this.value.threadId,
        taskId: this.value.taskId,
        parentStepId: this.value.rerunParentStepId,
        step: {
          type: 'agent',
          stepId: 0,
          interaction: null,
          stepTitle: this._msg.adjustDraftStepTitle,
          status: 'waiting_human_input',
          nextSteps: [],
          agentName: 'agentNsDraft',
          prompt: JSON.stringify({ planId: 'e1-draft', adjustment: this._adjustment.trim(), previousModuleName: this._artifact.moduleName }),
          rags: [],
          planning: { planId: `e1-draft-adjustment-${Date.now()}`, dependsOn: ['checkpoint-draft'], executionMode: 'sequential', executionHost: 'client' },
        } as mls.msg.AIAgentStep,
      };
      await this._applyIntents([addStep, this._checkpointStatus('completed', 'checkpoint-draft adjustment requested')]);
      this._done = true;
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._busy = null;
    }
  }

  private _checkpointAnswerStep(): mls.msg.AgentIntentAddStep {
    const v = this.value!;
    return {
      type: 'add-step',
      messageId: v.messageId,
      threadId: v.threadId,
      taskId: v.taskId,
      parentStepId: v.parentStepId,
      step: {
        type: 'result',
        stepId: 0,
        interaction: null,
        stepTitle: 'Draft approved',
        status: 'completed',
        nextSteps: [],
        result: JSON.stringify({ planId: 'checkpoint-draft-answer', moduleName: this._artifact?.moduleName ?? v.moduleName, approved: true }),
        planning: { planId: 'checkpoint-draft-answer', dependsOn: ['checkpoint-draft'], executionMode: 'manual_later', executionHost: 'client' },
      } as mls.msg.AIResultStep,
    };
  }

  private _checkpointStatus(status: mls.msg.AIStepStatus, traceMsg: string): mls.msg.AgentIntentUpdateStatus {
    const v = this.value!;
    return {
      type: 'update-status',
      hookSequential: v.hookSequential,
      messageId: v.messageId,
      threadId: v.threadId,
      taskId: v.taskId,
      parentStepId: v.parentStepId,
      stepId: v.stepId,
      status,
      traceMsg,
      cleaner: 'input_output',
    };
  }

  private async _applyIntents(intents: mls.msg.AgentIntent[]): Promise<void> {
    const response = await msgApplyIntents({ userId: this.value!.senderId, intents });
    if (!response || response.statusCode !== 200) {
      throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying checkpoint action');
    }
    const ret = response as mls.msg.ResponseApplyIntents;
    if (!ret.message) throw new Error('No message returned after checkpoint action');
    const context: mls.msg.ExecutionContext = { task: ret.task, message: ret.message, isTest: ret.task?.iaCompressed?.isTest || false };
    await continuePoolingTask(context);
  }

  private _newPipelineFallback(): NsPipelineState {
    return createNsPipeline(this._artifact?.moduleName || 'module');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'widget-ns-draft-102020': WidgetNsDraft102020;
  }
}
