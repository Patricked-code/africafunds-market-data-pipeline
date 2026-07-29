import * as XLSX from 'xlsx';

export interface WorkbookRecordSet {
  sheetName: string;
  rows: Array<Record<string, unknown>>;
}

export function parseWorkbook(body: Uint8Array): WorkbookRecordSet[] {
  const workbook = XLSX.read(body, { type: 'array', cellDates: true, raw: true });
  return workbook.SheetNames.map((sheetName) => ({
    sheetName,
    rows: XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName]!, { defval: null }),
  }));
}
