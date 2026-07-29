import * as cheerio from 'cheerio';

export interface ParsedLink {
  label: string;
  url: string;
  extension: string | null;
}

export function parseHtmlTables(html: string): Array<Record<string, string>> {
  const $ = cheerio.load(html);
  const rows: Array<Record<string, string>> = [];
  $('table').each((_tableIndex, table) => {
    const headers = $(table).find('thead th').map((_i, th) => $(th).text().trim()).get();
    $(table).find('tbody tr').each((_rowIndex, tr) => {
      const cells = $(tr).find('th,td').map((_i, cell) => $(cell).text().replace(/\s+/g, ' ').trim()).get();
      if (!cells.some(Boolean)) return;
      const record: Record<string, string> = {};
      cells.forEach((value, index) => {
        record[headers[index] || `column_${index + 1}`] = value;
      });
      rows.push(record);
    });
  });
  return rows;
}

export function discoverLinks(html: string, baseUrl: string): ParsedLink[] {
  const $ = cheerio.load(html);
  const found = new Map<string, ParsedLink>();
  $('a[href]').each((_i, anchor) => {
    const href = $(anchor).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    try {
      const absolute = new URL(href, baseUrl).toString();
      const pathname = new URL(absolute).pathname.toLowerCase();
      const extension = pathname.match(/\.(csv|xlsx?|pdf|json|zip)$/)?.[1] ?? null;
      const label = $(anchor).text().replace(/\s+/g, ' ').trim() || absolute;
      found.set(absolute, { label, url: absolute, extension });
    } catch {
      // Lien non HTTP ignoré.
    }
  });
  return [...found.values()];
}
