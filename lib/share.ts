import { Share } from 'react-native';

import { formatPhoneDisplay } from '@/lib/phone';
import type { CustomerDetail } from '@/lib/queries';
import { tagTranslationKey, type TranslationKey } from '@/lib/translations';

type Translate = (key: TranslationKey, vars?: Record<string, string>) => string;

function tagLabel(tagName: string, customLabel: string | null, t: Translate): string {
  if (tagName === 'Other' && customLabel) return customLabel;
  const key = tagTranslationKey(tagName);
  return key ? t(key) : tagName;
}

export function buildShareMessage(customersList: CustomerDetail[], t: Translate): string {
  return customersList
    .map((customer) => {
      const lines = [
        `${customer.name} - ${customer.areaName}`,
        `${t('primary')}: ${formatPhoneDisplay(customer.primaryMobile)}`,
        ...customer.additionalContacts.map(
          (c) => `${tagLabel(c.tagName, c.customLabel, t)}: ${formatPhoneDisplay(c.phoneNumber)}`
        ),
      ];
      return lines.join('\n');
    })
    .join('\n\n');
}

export async function shareCustomers(customersList: CustomerDetail[], t: Translate): Promise<void> {
  const message = buildShareMessage(customersList, t);
  await Share.share({ message }, { dialogTitle: t('shareDialogTitle') });
}
