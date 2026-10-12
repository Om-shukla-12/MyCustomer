import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { getSetting, setSetting, type LanguageCode } from '@/lib/settings';
import { translations, type TranslationKey } from '@/lib/translations';

type LanguageContextValue = {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: (key: TranslationKey, vars?: Record<string, string>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>('en');

  useEffect(() => {
    getSetting('language').then((value) => {
      if (value === 'en' || value === 'gu') setLangState(value);
    });
  }, []);

  const setLang = (value: LanguageCode) => {
    setLangState(value);
    setSetting('language', value);
  };

  const t = (key: TranslationKey, vars?: Record<string, string>): string => {
    let str = translations[lang][key] ?? translations.en[key] ?? key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        str = str.replace(new RegExp(`{{${name}}}`, 'g'), value);
      }
    }
    return str;
  };

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
