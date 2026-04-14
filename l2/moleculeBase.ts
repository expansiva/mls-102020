/// <mls fileReference="_102020_/l2/moleculeBase.ts" enhancement="_102027_/l2/enhancementLit" />

import { StateLitElement } from '/_100554_/l2/stateLitElement.js';

// =============================================================================
// TYPES
// =============================================================================

export interface ParsedItem {
  value: string;
  label: string;
  disabled: boolean;
}

export interface ParsedGroup {
  label: string;
  items: ParsedItem[];
}

// =============================================================================
// BASE CLASS
// =============================================================================

export class MoleculeAuraElement extends StateLitElement {

  // ===========================================================================
  // SLOT TAGS DEFINITION
  // Override in child component
  // ===========================================================================

  protected slotTags: string[] = [];

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  connectedCallback() {
    super.connectedCallback();
    this.hideSlotTags();
  }

  // ===========================================================================
  // SLOT TAG VISIBILITY
  // ===========================================================================

  /**
   * Hides all slot tags defined in slotTags array
   */
  private hideSlotTags(): void {
    this.slotTags.forEach(tag => {
      this.querySelectorAll(tag).forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });
    });
  }

  // ===========================================================================
  // SLOT TAG READERS
  // ===========================================================================

  /**
   * Returns a single slot tag element by name
   */
  protected getSlot(tag: string): Element | null {
    return this.querySelector(tag);
  }

  /**
   * Returns all elements of a slot tag
   */
  protected getSlots(tag: string): Element[] {
    return Array.from(this.querySelectorAll(tag));
  }

  /**
   * Returns an attribute value from a slot tag
   */
  protected getSlotAttr(tag: string, attr: string): string | null {
    return this.querySelector(tag)?.getAttribute(attr) || null;
  }

  /**
   * Returns the innerHTML of a slot tag
   */
  protected getSlotContent(tag: string): string {
    return this.querySelector(tag)?.innerHTML || '';
  }

  /**
   * Checks if a slot tag exists
   */
  protected hasSlot(tag: string): boolean {
    return this.querySelector(tag) !== null;
  }

  // ===========================================================================
  // ITEM PARSING (Common for select, radio, checkbox, etc.)
  // ===========================================================================

  /**
   * Returns parsed items from slot tags
   */
  protected getItems(selector: string = 'Content > Item, Content > Group > Item'): ParsedItem[] {
    return Array.from(this.querySelectorAll(selector)).map(el => ({
      value: el.getAttribute('value') || '',
      label: el.innerHTML,
      disabled: el.hasAttribute('disabled'),
    }));
  }

  /**
   * Returns parsed groups with their items
   */
  protected getGroups(selector: string = 'Content > Group'): ParsedGroup[] {
    return Array.from(this.querySelectorAll(selector)).map(group => ({
      label: group.getAttribute('label') || '',
      items: Array.from(group.querySelectorAll('Item')).map(el => ({
        value: el.getAttribute('value') || '',
        label: el.innerHTML,
        disabled: el.hasAttribute('disabled'),
      })),
    }));
  }

  /**
   * Returns standalone items (not inside groups)
   */
  protected getStandaloneItems(selector: string = 'Content > Item'): ParsedItem[] {
    return Array.from(this.querySelectorAll(selector)).map(el => ({
      value: el.getAttribute('value') || '',
      label: el.innerHTML,
      disabled: el.hasAttribute('disabled'),
    }));
  }

  /**
   * Finds an item by value
   */
  protected findItem(value: string | null): ParsedItem | undefined {
    if (!value) return undefined;
    return this.getItems().find(item => item.value === value);
  }

}
