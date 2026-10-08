import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppLanguage, isAppLanguage } from '../data/languages';
import { translate } from '../i18n/translations';

const LANGUAGE_KEY = 'halovat.expo.language.v1';
type LanguageValue = { language: AppLanguage; setLanguage: (value: AppLanguage) => Promise<void>; t: (text: string) => string };
const LanguageContext = createContext<LanguageValue>({ language: 'uz', setLanguage: async () => undefined, t: text => text });

export function LanguageProvider({ children }: React.PropsWithChildren) {
  const [language, setCurrent] = useState<AppLanguage>('uz');
  const [loaded, setLoaded] = useState(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(LANGUAGE_KEY).then(value => { if (active && isAppLanguage(value)) setCurrent(value); })
      .catch(() => undefined).finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  const setLanguage = useCallback(async (value: AppLanguage) => {
    if (!isAppLanguage(value)) return;
    setCurrent(value);
    saveQueue.current = saveQueue.current.catch(() => undefined).then(() => AsyncStorage.setItem(LANGUAGE_KEY, value));
    // Storage may be unavailable; language selection must still allow entry into the app.
    await saveQueue.current.catch(() => undefined);
  }, []);
  const t = useCallback((text: string) => translate(text, language), [language]);
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return loaded ? <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider> : null;
}

export const useLanguage = () => useContext(LanguageContext);
