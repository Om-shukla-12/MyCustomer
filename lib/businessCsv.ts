import Papa from 'papaparse';

import { normalizePhone } from '@/lib/phone';
import type { BusinessContactDetail } from '@/lib/businessQueries';
import type { TranslationKey } from '@/lib/translations';

const CSV_COLUMNS = ['Name', 'Category', 'PrimaryNumber', 'Notes', 'AdditionalNumbers'] as const;

type CsvRow = Record<(typeof CSV_COLUMNS)[number], string>;

function encodeAdditionalNumbers(numbers: BusinessContactDetail['numbers']): string {
  return numbers.map((n) => `${n.label}:${n.phoneNumber}`).join('|');
}

export function businessContactsToCsv(contacts: BusinessContactDetail[]): string {
  const rows: CsvRow[] = contacts.map((c) => ({
    Name: c.name,
    Category: c.categoryName,
    PrimaryNumber: c.primaryNumber,
    Notes: c.notes ?? '',
    AdditionalNumbers: encodeAdditionalNumbers(c.numbers),
  }));
  return Papa.unparse(rows, { columns: [...CSV_COLUMNS] });
}

export type ParsedNumber = { label: string; phoneNumber: string };

export type ParsedBusinessRow = {
  rowNumber: number;
  name: string;
  categoryName: string;
  primaryNumber: string;
  notes: string;
  numbers: ParsedNumber[];
  error?: TranslationKey;
};

function parseAdditionalNumbers(raw: string): ParsedNumber[] {
  return raw
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const [label, phoneNumber] = pair.split(':');
      return { label: (label ?? '').trim(), phoneNumber: normalizePhone(phoneNumber ?? '') };
    })
    .filter((n) => n.label && n.phoneNumber.length >= 10);
}

export function parseBusinessContactsCsv(text: string): ParsedBusinessRow[] {
  const result = Papa.parse<Partial<CsvRow>>(text, { header: true, skipEmptyLines: true });

  return result.data.map((raw, i) => {
    const name = (raw.Name ?? '').trim();
    const categoryName = (raw.Category ?? '').trim();
    const primaryNumber = normalizePhone(raw.PrimaryNumber ?? '');

    let error: TranslationKey | undefined;
    if (!name) error = 'errorEnterName';
    else if (primaryNumber.length < 10) error = 'errorValidNumber';
    else if (!categoryName) error = 'errorSelectCategory';

    return {
      rowNumber: i + 2,
      name,
      categoryName,
      primaryNumber,
      notes: (raw.Notes ?? '').trim(),
      numbers: parseAdditionalNumbers(raw.AdditionalNumbers ?? ''),
      error,
    };
  });
}
