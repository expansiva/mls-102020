/// <mls fileReference="_102020_/l2/agentNewSolution3/widgetNs3Draft.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102027_/l2/stateLitElement.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import {
  ns3PipelineArtifactFileInfo,
  readJsonArtifact,
  readStorText,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Fs.js';
import {
  Ns3PipelineState,
  approveNs3Step,
  createNs3Pipeline,
  readNs3Pipeline,
  writeNs3Pipeline,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Pipeline.js';
import type { Ns3E1DraftArtifact } from '/_102020_/l2/agentNewSolution3/steps/e1-draft/gate.js';

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

@customElement('widget-ns3-draft-102020')
export class WidgetNs3Draft102020 extends StateLitElement {
  @property({ type: Object }) value: WidgetValue | null = null;

  @state() private _loading = true;
  @state() private _artifact: Ns3E1DraftArtifact | null = null;
  @state() private _markdown = '';
  @state() private _pipeline: Ns3PipelineState | null = null;
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
      this._artifact = await readJsonArtifact<Ns3E1DraftArtifact>(ns3PipelineArtifactFileInfo(this.value.moduleName, 'e1-draft', '.json'), false);
      this._markdown = await readStorText(ns3PipelineArtifactFileInfo(this.value.moduleName, 'e1-draft', '.md'), false);
      this._pipeline = await readNs3Pipeline(this.value.moduleName);
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._loading = false;
    }
  }

  override render(): TemplateResult {
    const m = this._msg;
    if (this._loading) return html`<div class="ns3-draft"><div class="ns3-state">${m.loading}</div></div>`;
    if (this._error) return html`<div class="ns3-draft"><div class="ns3-state ns3-error">${this._error}</div></div>`;
    if (!this._artifact) return html`<div class="ns3-draft"><div class="ns3-state">${m.noDraft}</div></div>`;
    return html`
      <section class="ns3-draft">
        <header class="ns3-head">
          <div>
            <h3>${m.title}</h3>
            <p>${this._artifact.moduleTitle} <span>${this._artifact.moduleName}</span></p>
          </div>
          ${this._renderGate()}
        </header>
        <pre class="ns3-md">${this._markdown}</pre>
        ${this._done ? html`<div class="ns3-done">${m.approved}</div>` : this._renderActions()}
      </section>
    `;
  }

  private _renderGate(): TemplateResult {
    const m = this._msg;
    const gate = this._pipeline?.steps['e1-draft']?.lastGate;
    if (!gate) return html``;
    return html`<span class="ns3-gate ${gate.ok ? 'ns3-gate--ok' : 'ns3-gate--bad'}">${gate.ok ? m.gateOk : m.gateFailed}</span>`;
  }

  private _renderActions(): TemplateResult {
    const m = this._msg;
    return html`
      <div class="ns3-actions">
        <textarea
          .value=${this._adjustment}
          placeholder=${m.adjustmentPlaceholder}
          @input=${(event: Event) => { this._adjustment = (event.target as HTMLTextAreaElement).value; }}
          ?disabled=${!!this._busy}
        ></textarea>
        <div class="ns3-buttons">
          <button class="ns3-secondary" ?disabled=${!!this._busy || !this._adjustment.trim()} @click=${() => this._onAdjust()}>
            ${this._busy === 'adjust' ? m.adjusting : m.adjust}
          </button>
          <button class="ns3-primary" ?disabled=${!!this._busy} @click=${() => this._onApprove()}>
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
      const pipeline = approveNs3Step(this._pipeline || await readNs3Pipeline(this._artifact.moduleName) || this._newPipelineFallback(), 'e1-draft', 'human');
      await writeNs3Pipeline(pipeline);
      this._pipeline = pipeline;
      await this._completeCheckpoint('completed', 'checkpoint-draft approved');
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
          status: 'pending',
          nextSteps: [],
          agentName: 'agentNs3Draft',
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

  private async _completeCheckpoint(status: mls.msg.AIStepStatus, traceMsg: string): Promise<void> {
    await this._applyIntents([this._checkpointStatus(status, traceMsg)]);
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
    const response = await mls.api.msgApplyIntents({ userId: this.value!.senderId, intents });
    if (!response || response.statusCode !== 200) {
      throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying checkpoint action');
    }
    const ret = response as mls.msg.ResponseApplyIntents;
    if (!ret.message) throw new Error('No message returned after checkpoint action');
    const context: mls.msg.ExecutionContext = { task: ret.task, message: ret.message, isTest: ret.task?.iaCompressed?.isTest || false };
    await continuePoolingTask(context);
  }

  private _newPipelineFallback(): Ns3PipelineState {
    return createNs3Pipeline(this._artifact?.moduleName || 'module');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'widget-ns3-draft-102020': WidgetNs3Draft102020;
  }
}
