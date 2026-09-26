import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { execBff } from '/_102029_/l2/bffClient.js';
import { getState, setState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';
import { runBlockingUiAction } from '/_102029_/l2/interactionRuntime.js';
import { deleteItemRoute, listItemsRoute, updateItemRoute } from '/_102020_/l2/agentDefsL2/steps/shared40/fixtures/skill/items.defs.js';
import type { DeleteItemInput, DeleteItemOutput, ListItemsInput, ListItemsOutput, UpdateItemInput, UpdateItemOutput } from '/_102020_/l2/agentDefsL2/steps/shared40/fixtures/skill/items.defs.js';

const messages = { en: { selectionRequired: 'Select an item first.' } };

export class ItemsShared extends StateLitElement {
  pageStatus: 'idle' | 'loading' | 'empty' | 'success' | 'error' = 'idle';
  scenary: 'base' | 'deleteItem' | 'updateItem' = 'base';
  selectedItemId: string | null = null;
  stateListItemsResult: ListItemsOutput = [];
  stateListItemsStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  stateListItemsError: unknown = null;
  stateDeleteItemStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  stateDeleteItemError: unknown = null;
  stateListItemsDetailsName: string | null = null;
  stateUpdateItemDetailsName: string | null = null;
  stateUpdateItemDetailsMode: 'short' | 'full' | null = null;
  stateUpdateItemRevision: number | null = null;
  stateUpdateItemStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  stateUpdateItemError: unknown = null;

  setScenario(value: ItemsShared['scenary']): void {
    if (value !== 'base' && !this.selectedItemId) {
      const error = { code: 'SELECTION_REQUIRED', message: messages.en.selectionRequired };
      if (value === 'deleteItem') { this.stateDeleteItemError = error; this.stateDeleteItemStatus = 'error'; }
      else { this.stateUpdateItemError = error; this.stateUpdateItemStatus = 'error'; }
      setState(`ui.items.${value}.error`, error); setState(`ui.items.${value}.status`, 'error');
      return;
    }
    this.scenary = value; setState('ui.items.scenary', value);
  }

  selectUpdateItemId(id: string | null): void {
    if (id === this.selectedItemId) return;
    this.selectedItemId = null; this.stateUpdateItemRevision = null;
    const row = this.stateListItemsResult.find(item => item.id === id);
    if (row && typeof row.revision === 'number') { this.selectedItemId = row.id; this.stateUpdateItemRevision = row.revision; }
    setState('ui.items.updateItem.input.id', this.selectedItemId);
    setState('ui.items.updateItem.input.revision', this.stateUpdateItemRevision);
  }

  setUpdateItemDetailsName(value: string | null): void {
    this.stateUpdateItemDetailsName = value; setState('ui.items.updateItem.input.details.name', value);
  }

  setUpdateItemDetailsMode(value: 'short' | 'full' | null): void {
    this.stateUpdateItemDetailsMode = value; setState('ui.items.updateItem.input.details.mode', value);
  }

  async runUpdateItem(): Promise<void> {
    if (this.stateUpdateItemStatus === 'loading') return;
    const id = this.selectedItemId; const revision = this.stateUpdateItemRevision; const name = this.stateUpdateItemDetailsName;
    if (!id || revision === null || !name?.trim()) { this.stateUpdateItemError = { code: 'INPUT_REQUIRED', message: 'Select an item and enter its name.' }; this.stateUpdateItemStatus = 'error'; return; }
    this.stateUpdateItemStatus = 'loading'; this.stateUpdateItemError = null;
    try {
      await runBlockingUiAction(async signal => {
        const params: UpdateItemInput = { id, revision, details: { name, ...(this.stateUpdateItemDetailsMode ? { mode: this.stateUpdateItemDetailsMode } : {}) } };
        const response = await execBff<UpdateItemOutput>(updateItemRoute, params, { mode: 'blocking', signal });
        if (!response.ok) { this.stateUpdateItemError = response.error; this.stateUpdateItemStatus = 'error'; return; }
        this.stateUpdateItemStatus = 'success'; this.setScenario('base'); await this.runListItems();
      }, { mode: 'blocking' });
    } catch (error) { this.stateUpdateItemError = error; this.stateUpdateItemStatus = 'error'; }
  }

  setListItemsDetailsName(value: string | null): void {
    this.stateListItemsDetailsName = value;
    setState('ui.items.listItems.input.details.name', value);
  }

  async runListItems(): Promise<void> {
    this.stateListItemsStatus = 'loading'; this.stateListItemsError = null; this.pageStatus = 'loading';
    const params: ListItemsInput = {};
    if (this.stateListItemsDetailsName?.trim()) params.details = { name: this.stateListItemsDetailsName };
    const response = await execBff<ListItemsOutput>(listItemsRoute, params, { mode: 'silent' });
    if (!response.ok) {
      this.stateListItemsError = response.error; this.stateListItemsStatus = 'error'; this.pageStatus = 'error';
      setState('ui.items.listItems.error', response.error); setState('ui.items.listItems.status', 'error'); setState('ui.items.pageStatus', 'error');
      return;
    }
    this.stateListItemsResult = response.data ?? [];
    setState('ui.items.listItems.result', this.stateListItemsResult);
    this.stateListItemsStatus = 'success';
    this.pageStatus = this.stateListItemsResult.length ? 'success' : 'empty';
  }

  enterDeleteItemScenario(): void {
    this.setScenario('deleteItem');
  }

  async runDeleteItem(): Promise<void> {
    if (this.stateDeleteItemStatus === 'loading') return;
    const id = this.selectedItemId; if (!id) { this.setScenario('deleteItem'); return; }
    this.stateDeleteItemStatus = 'loading'; this.stateDeleteItemError = null;
    setState('ui.items.deleteItem.status', 'loading'); setState('ui.items.deleteItem.error', null);
    try { await runBlockingUiAction(async signal => {
      const params: DeleteItemInput = { id };
      const response = await execBff<DeleteItemOutput>(deleteItemRoute, params, { mode: 'blocking', signal });
      if (!response.ok) {
        this.stateDeleteItemError = response.error; this.stateDeleteItemStatus = 'error';
        setState('ui.items.deleteItem.error', response.error); setState('ui.items.deleteItem.status', 'error');
        return;
      }
      this.stateDeleteItemStatus = 'success'; setState('ui.items.deleteItem.status', 'success'); await this.runListItems();
    }, { mode: 'blocking' });
    } catch (error) {
      this.stateDeleteItemError = error; this.stateDeleteItemStatus = 'error';
      setState('ui.items.deleteItem.error', error); setState('ui.items.deleteItem.status', 'error');
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.selectedItemId = (getState('ui.items.deleteItem.input.id') as string | null) ?? null;
    subscribe(['ui.items.deleteItem.input.id'], this); void this.runListItems();
  }
  override disconnectedCallback(): void { unsubscribe(['ui.items.deleteItem.input.id'], this); super.disconnectedCallback(); }
  override handleIcaStateChange(key: string, value: unknown): void {
    if (key === 'ui.items.deleteItem.input.id') this.selectedItemId = typeof value === 'string' ? value : null;
    this.requestUpdate();
  }
}
