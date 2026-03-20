// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../locales/en.json';
import es from '../locales/es.json';

type Locale = 'en' | 'es';

interface LocalizationContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string) => string;
}

const translations: Record<Locale, any> = { en, es };

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('en');

    useEffect(() => {
        const savedLocale = localStorage.getItem('app-locale') as Locale;
        if (savedLocale && (savedLocale === 'en' || savedLocale === 'es')) {
            setLocaleState(savedLocale);
        }
    }, []);

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem('app-locale', newLocale);
    };

    const t = (key: string): string => {
        const keys = key.split('.');
        let value: any = translations[locale];

        for (const k of keys) {
            value = value?.[k];
        }

        return typeof value === 'string' ? value : key;
    };

    const contextValue = { locale, setLocale, t };

    return (
        <LocalizationContext.Provider value= { contextValue } >
        { children }
        </LocalizationContext.Provider>
    );
}

export const useTranslation = () => {
    const context = useContext(LocalizationContext);
    if (!context) {
        throw new Error('useTranslation must be used within a LocalizationProvider');
    }
    return context;
};
