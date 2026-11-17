export interface OutsideSaveInput { recordId: string; note?: string; }
export interface OutsideDropInput { recordId: string; label?: string; }
export const outside = { "operations": [
  { "operationId": "saveOutside", "direction": "call", "inputType": "OutsideSaveInput", "expectsVersion": true },
  { "operationId": "dropOutside", "direction": "call", "inputType": "OutsideDropInput" }
] };
