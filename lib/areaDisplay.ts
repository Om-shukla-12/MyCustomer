import type { LanguageCode } from '@/lib/settings';

export function getAreaDisplayName(
  area: { name: string; nameGu: string | null },
  lang: LanguageCode
): string {
  if (lang === 'gu' && area.nameGu) return area.nameGu;
  return area.name;
}
