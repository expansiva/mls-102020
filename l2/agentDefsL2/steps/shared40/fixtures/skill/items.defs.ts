export const listItemsRoute = 'fixture.catalog.qryListItems' as const;
export const deleteItemRoute = 'fixture.catalog.cmdDeleteItem' as const;
export interface ListItemsInput { details?: { name?: string }; }
export interface ItemRow { id: string; name: string; revision: number; }
export type ListItemsOutput = ItemRow[];
export interface DeleteItemInput { id: string; }
export interface DeleteItemOutput { deleted: boolean; }
export const updateItemRoute = 'fixture.catalog.cmdUpdateItem' as const;
export interface UpdateItemInput { id: string; revision: number; details: { name: string; mode?: 'short' | 'full' }; }
export type UpdateItemOutput = ItemRow;
