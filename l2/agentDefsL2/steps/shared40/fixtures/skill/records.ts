import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { execBff } from '/_102029_/l2/bffClient.js';
import { getState, setState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';
import { runBlockingUiAction } from '/_102029_/l2/interactionRuntime.js';
import { deleteRecordRoute, listRecordsRoute } from '/_102020_/l2/agentDefsL2/steps/shared40/fixtures/skill/records.defs.js';
import type { DeleteRecordInput, DeleteRecordOutput, ListRecordsInput, ListRecordsOutput } from '/_102020_/l2/agentDefsL2/steps/shared40/fixtures/skill/records.defs.js';

export class RecordsShared extends StateLitElement {
  pageStatus: 'idle' | 'loading' | 'empty' | 'success' | 'error' = 'idle';
  scenary: 'base' | 'deleteRecord' = 'base';
  selectedRecordId: string | null = null;
  listRecordsResult: ListRecordsOutput = [];
  listRecordsStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  listRecordsError: string | null = null;
  deleteRecordStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  deleteRecordError: string | null = null;

  async listRecords(): Promise<void> {
    this.listRecordsStatus = 'loading';
    const params: ListRecordsInput = {};
    const response = await execBff<ListRecordsOutput>(listRecordsRoute, params, { mode: 'silent' });
    if (!response.ok) { this.listRecordsError = response.error?.message || 'Request failed.'; this.listRecordsStatus = 'error'; return; }
    this.listRecordsResult = response.data ?? [];
    setState('ui.records.listRecords.result', this.listRecordsResult);
    this.listRecordsStatus = 'success';
  }

  enterDeleteRecordScenario(): void {
    if (!this.selectedRecordId) { this.deleteRecordError = 'Select a record first.'; return; }
    this.scenary = 'deleteRecord'; setState('ui.records.scenary', this.scenary);
  }

  async deleteRecord(): Promise<void> {
    const id = this.selectedRecordId; if (!id) { this.deleteRecordError = 'Select a record first.'; return; }
    await runBlockingUiAction(async signal => {
      this.deleteRecordStatus = 'loading'; const params: DeleteRecordInput = { id };
      const response = await execBff<DeleteRecordOutput>(deleteRecordRoute, params, { mode: 'blocking', signal });
      if (!response.ok) { this.deleteRecordError = response.error?.message || 'Request failed.'; this.deleteRecordStatus = 'error'; return; }
      this.deleteRecordStatus = 'success'; await this.listRecords();
    }, { mode: 'blocking' });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.selectedRecordId = (getState('ui.records.deleteRecord.input.id') as string | null) ?? null;
    subscribe(['ui.records.deleteRecord.input.id'], this); void this.listRecords();
  }
  override disconnectedCallback(): void { unsubscribe(['ui.records.deleteRecord.input.id'], this); super.disconnectedCallback(); }
  override handleIcaStateChange(key: string, value: unknown): void {
    if (key === 'ui.records.deleteRecord.input.id') this.selectedRecordId = typeof value === 'string' ? value : null;
    this.requestUpdate();
  }
}
