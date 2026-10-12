import Papa from 'papaparse';

import { normalizePhone } from '@/lib/phone';
import type { LicCustomerDetail } from '@/lib/licQueries';
import type { TranslationKey } from '@/lib/translations';

const CSV_COLUMNS = [
  'PolicyNo',
  'AssuredName',
  'PhoneNumber',
  'Area',
  'AreaNameGu',
  'DateOfCommencement',
  'PlanTerm',
  'Mode',
  'FupDate',
  'Flag',
  'InstallmentPremium',
  'InstallmentsDue',
  'Notes',
] as const;

type CsvRow = Record<(typeof CSV_COLUMNS)[number], string>;

export function licCustomersToCsv(items: LicCustomerDetail[]): string {
  const rows: CsvRow[] = items.map((item) => ({
    PolicyNo: item.policyNo,
    AssuredName: item.assuredName,
    PhoneNumber: item.phoneNumber ?? '',
    Area: item.areaName ?? '',
    AreaNameGu: item.areaNameGu ?? '',
    DateOfCommencement: item.dateOfCommencement ?? '',
    PlanTerm: item.planTerm ?? '',
    Mode: item.mode ?? '',
    FupDate: item.fupDate ?? '',
    Flag: item.flag ?? '',
    InstallmentPremium: item.installmentPremium != null ? String(item.installmentPremium) : '',
    InstallmentsDue: item.installmentsDue != null ? String(item.installmentsDue) : '',
    Notes: item.notes ?? '',
  }));
  return Papa.unparse(rows, { columns: [...CSV_COLUMNS] });
}

export type ParsedLicRow = {
  rowNumber: number;
  policyNo: string;
  assuredName: string;
  phoneNumber: string;
  areaName: string;
  areaNameGu: string;
  dateOfCommencement: string;
  planTerm: string;
  mode: string;
  fupDate: string;
  flag: string;
  installmentPremium: number | undefined;
  installmentsDue: number | undefined;
  notes: string;
  error?: TranslationKey;
};

function parseNumber(raw: string | undefined): number | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

export function parseLicCustomersCsv(text: string): ParsedLicRow[] {
  const result = Papa.parse<Partial<CsvRow>>(text, { header: true, skipEmptyLines: true });

  return result.data.map((raw, i) => {
    const policyNo = (raw.PolicyNo ?? '').trim();
    const assuredName = (raw.AssuredName ?? '').trim();
    const phoneNumber = raw.PhoneNumber?.trim() ? normalizePhone(raw.PhoneNumber) : '';
    const installmentsDue = parseNumber(raw.InstallmentsDue);

    let error: TranslationKey | undefined;
    if (!policyNo) error = 'errorEnterPolicyNo';
    else if (!assuredName) error = 'errorEnterAssuredName';

    return {
      rowNumber: i + 2,
      policyNo,
      assuredName,
      phoneNumber,
      areaName: (raw.Area ?? '').trim(),
      areaNameGu: (raw.AreaNameGu ?? '').trim(),
      dateOfCommencement: (raw.DateOfCommencement ?? '').trim(),
      planTerm: (raw.PlanTerm ?? '').trim(),
      mode: (raw.Mode ?? '').trim(),
      fupDate: (raw.FupDate ?? '').trim(),
      flag: (raw.Flag ?? '').trim(),
      installmentPremium: parseNumber(raw.InstallmentPremium),
      installmentsDue: installmentsDue != null ? Math.round(installmentsDue) : undefined,
      notes: (raw.Notes ?? '').trim(),
      error,
    };
  });
}
