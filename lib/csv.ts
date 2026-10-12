import Papa from 'papaparse';

import { normalizePhone } from '@/lib/phone';
import type { CustomerDetail } from '@/lib/queries';
import type { TranslationKey } from '@/lib/translations';

const CSV_COLUMNS = [
  'Name',
  'PrimaryMobile',
  'Area',
  'AreaNameGu',
  'CustomerSince',
  'Address',
  'Notes',
  'AdditionalContacts',
] as const;

type CsvRow = Record<(typeof CSV_COLUMNS)[number], string>;

function encodeAdditionalContacts(contacts: CustomerDetail['additionalContacts']): string {
  return contacts
    .map((c) => {
      const base = `${c.tagName}:${c.phoneNumber}`;
      return c.tagName === 'Other' && c.customLabel ? `${base}:${c.customLabel}` : base;
    })
    .join('|');
}

export function customersToCsv(customers: CustomerDetail[]): string {
  const rows: CsvRow[] = customers.map((c) => ({
    Name: c.name,
    PrimaryMobile: c.primaryMobile,
    Area: c.areaName,
    AreaNameGu: c.areaNameGu ?? '',
    CustomerSince: c.customerSince ?? '',
    Address: c.address ?? '',
    Notes: c.notes ?? '',
    AdditionalContacts: encodeAdditionalContacts(c.additionalContacts),
  }));
  return Papa.unparse(rows, { columns: [...CSV_COLUMNS] });
}

export type ParsedContact = { tagName: string; phoneNumber: string; customLabel?: string };

export type ParsedCsvRow = {
  rowNumber: number;
  name: string;
  primaryMobile: string;
  areaName: string;
  areaNameGu: string;
  customerSince: string;
  address: string;
  notes: string;
  additionalContacts: ParsedContact[];
  error?: TranslationKey;
};

function parseAdditionalContacts(raw: string): ParsedContact[] {
  return raw
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const [tagName, phoneNumber, customLabel] = pair.split(':');
      return {
        tagName: (tagName ?? '').trim(),
        phoneNumber: normalizePhone(phoneNumber ?? ''),
        customLabel: customLabel?.trim() || undefined,
      };
    })
    .filter((c) => c.tagName && c.phoneNumber.length >= 10);
}

export function parseCustomersCsv(text: string): ParsedCsvRow[] {
  const result = Papa.parse<Partial<CsvRow>>(text, { header: true, skipEmptyLines: true });

  return result.data.map((raw, i) => {
    const name = (raw.Name ?? '').trim();
    const primaryMobile = normalizePhone(raw.PrimaryMobile ?? '');
    const areaName = (raw.Area ?? '').trim();

    let error: TranslationKey | undefined;
    if (!name) error = 'errorEnterName';
    else if (primaryMobile.length < 10) error = 'errorValidMobile';
    else if (!areaName) error = 'errorSelectArea';

    return {
      rowNumber: i + 2,
      name,
      primaryMobile,
      areaName,
      areaNameGu: (raw.AreaNameGu ?? '').trim(),
      customerSince: (raw.CustomerSince ?? '').trim(),
      address: (raw.Address ?? '').trim(),
      notes: (raw.Notes ?? '').trim(),
      additionalContacts: parseAdditionalContacts(raw.AdditionalContacts ?? ''),
      error,
    };
  });
}
