import { Share } from 'react-native';

import { formatPhoneDisplay } from '@/lib/phone';
import type { BusinessContactDetail } from '@/lib/businessQueries';
import type { TranslationKey } from '@/lib/translations';

type Translate = (key: TranslationKey, vars?: Record<string, string>) => string;

export function buildBusinessShareMessage(contact: BusinessContactDetail, t: Translate): string {
  const lines = [
    `${contact.name} - ${contact.categoryName}`,
    `${t('primary')}: ${formatPhoneDisplay(contact.primaryNumber)}`,
    ...contact.numbers.map((n) => `${n.label}: ${formatPhoneDisplay(n.phoneNumber)}`),
  ];
  return lines.join('\n');
}

export async function shareBusinessContact(contact: BusinessContactDetail, t: Translate): Promise<void> {
  const message = buildBusinessShareMessage(contact, t);
  await Share.share({ message }, { dialogTitle: t('shareDialogTitle') });
}
