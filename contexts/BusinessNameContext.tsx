import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { getSetting, setSetting } from '@/lib/settings';

const SETTINGS_KEY = 'businessName';

type BusinessNameContextValue = {
  businessName: string;
  setBusinessName: (name: string) => void;
};

const BusinessNameContext = createContext<BusinessNameContextValue | null>(null);

export function BusinessNameProvider({ children }: { children: ReactNode }) {
  const [businessName, setBusinessNameState] = useState('');

  useEffect(() => {
    getSetting(SETTINGS_KEY).then((value) => {
      if (value) setBusinessNameState(value);
    });
  }, []);

  const setBusinessName = (name: string) => {
    const trimmed = name.trim();
    setBusinessNameState(trimmed);
    setSetting(SETTINGS_KEY, trimmed);
  };

  return (
    <BusinessNameContext.Provider value={{ businessName, setBusinessName }}>{children}</BusinessNameContext.Provider>
  );
}

export function useBusinessName(): BusinessNameContextValue {
  const ctx = useContext(BusinessNameContext);
  if (!ctx) throw new Error('useBusinessName must be used within BusinessNameProvider');
  return ctx;
}
