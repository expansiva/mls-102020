export const listRecordsRoute = 'fixture.records.qryListRecords' as const;
export const deleteRecordRoute = 'fixture.records.cmdDeleteRecord' as const;
export interface ListRecordsInput {}
export interface RecordRow { id: string; name: string; }
export type ListRecordsOutput = RecordRow[];
export interface DeleteRecordInput { id: string; }
export interface DeleteRecordOutput { deleted: boolean; }
