import { Alert, Linking } from 'react-native';

export function normalizePhone(input: string): string {
  return input.replace(/\D/g, '');
}

export function isValidMobile(input: string): boolean {
  return normalizePhone(input).length >= 10;
}

export function formatPhoneDisplay(digits: string): string {
  const clean = normalizePhone(digits);
  if (clean.length === 10) return `${clean.slice(0, 5)} ${clean.slice(5)}`;
  return clean;
}

export async function callNumber(digits: string): Promise<void> {
  const url = `tel:${normalizePhone(digits)}`;
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    Alert.alert("Can't place call", 'This device cannot open the phone dialer.');
    return;
  }
  Linking.openURL(url);
}

const DEFAULT_COUNTRY_CODE = '91';

export function toWhatsAppNumber(rawNumber: string): string {
  let digits = normalizePhone(rawNumber);
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    digits = `${DEFAULT_COUNTRY_CODE}${digits}`;
  }
  return digits;
}

export function openWhatsApp(rawNumber: string): void {
  Linking.openURL(`https://wa.me/${toWhatsAppNumber(rawNumber)}`);
}
