import { Share } from 'react-native';

import { formatPhoneDisplay } from '@/lib/phone';
import type { LicCustomerDetail } from '@/lib/licQueries';
import type { TranslationKey } from '@/lib/translations';

type Translate = (key: TranslationKey, vars?: Record<string, string>) => string;

export function buildLicShareMessage(
  item: LicCustomerDetail,
  areaLabel: string | null,
  modeLabel: string | null,
  totalPremium: number | null,
  t: Translate
): string {
  const lines = [item.assuredName, `${t('policyNo')}: ${item.policyNo}`];
  if (areaLabel) lines.push(`${t('area')}: ${areaLabel}`);
  if (item.phoneNumber) lines.push(`${t('primary')}: ${formatPhoneDisplay(item.phoneNumber)}`);
  if (item.dateOfCommencement) lines.push(`${t('dateOfCommencement')}: ${item.dateOfCommencement}`);
  if (item.planTerm) lines.push(`${t('planTerm')}: ${item.planTerm}`);
  if (modeLabel) lines.push(`${t('mode')}: ${modeLabel}`);
  if (item.fupDate) lines.push(`${t('fupLabel')}: ${item.fupDate}`);
  if (item.flag) lines.push(`${t('flag')}: ${item.flag}`);
  if (item.installmentPremium != null) lines.push(`${t('installmentPremium')}: ₹${item.installmentPremium}`);
  if (item.installmentsDue != null) lines.push(`${t('installmentsDue')}: ${item.installmentsDue}`);
  if (totalPremium != null) lines.push(`${t('totalPremium')}: ₹${totalPremium}`);
  if (item.notes) lines.push(`${t('notes')}: ${item.notes}`);
  return lines.join('\n');
}

export async function shareLicCustomer(
  item: LicCustomerDetail,
  areaLabel: string | null,
  modeLabel: string | null,
  totalPremium: number | null,
  t: Translate
): Promise<void> {
  const message = buildLicShareMessage(item, areaLabel, modeLabel, totalPremium, t);
  await Share.share({ message }, { dialogTitle: t('shareDialogTitle') });
}
