import { Contact, ContactField, requestPermissionsAsync } from 'expo-contacts';

import { normalizePhone } from '@/lib/phone';

export const USE_DEVICE_CONTACTS_KEY = 'useDeviceContacts';

export async function ensureContactsPermission(): Promise<boolean> {
  const { granted } = await requestPermissionsAsync();
  return granted;
}

export async function findDeviceContactByPhone(phoneDigits: string): Promise<{ id: string; name: string } | null> {
  const target = normalizePhone(phoneDigits);
  if (target.length < 10) return null;

  try {
    const contacts = await Contact.getAllDetails([ContactField.FULL_NAME, ContactField.PHONES]);
    for (const contact of contacts) {
      const match = (contact.phones ?? []).some((p) => normalizePhone(p.number ?? '').endsWith(target));
      if (match && contact.fullName) {
        return { id: contact.id, name: contact.fullName };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function syncCustomerToContacts(params: {
  nativeContactId: string | null;
  name: string;
  primaryMobile: string;
  additionalNumbers: { phoneNumber: string; label: string }[];
}): Promise<string | null> {
  const phones = [
    { label: 'mobile', number: params.primaryMobile },
    ...params.additionalNumbers.map((n) => ({ label: n.label, number: n.phoneNumber })),
  ];

  try {
    if (params.nativeContactId) {
      const contact = new Contact(params.nativeContactId);
      await contact.patch({ givenName: params.name, phones });
      return params.nativeContactId;
    }
    const created = await Contact.create({ givenName: params.name, phones });
    return created.id;
  } catch {
    return params.nativeContactId;
  }
}
