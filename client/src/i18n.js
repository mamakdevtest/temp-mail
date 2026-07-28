import { createContext, createElement, useContext, useMemo } from 'react';
// ponytail: CSV-based i18n. Translations live in src/locales/<lang>.csv as
// flat "key.path,value" rows. Vite ?raw imports the file as a string at build
// time; parseCSV turns it into a flat { "key.path": "value" } dict. To add a
// language: drop src/locales/<lang>.csv and add it to LANGS below.
import trCSV from './locales/tr.csv?raw';
import enCSV from './locales/en.csv?raw';
import esCSV from './locales/es.csv?raw';
import frCSV from './locales/fr.csv?raw';
import deCSV from './locales/de.csv?raw';
import ruCSV from './locales/ru.csv?raw';
import ptCSV from './locales/pt.csv?raw';

// ponytail: add a language by dropping src/locales/<lang>.csv, importing it
// here with ?raw, and adding the code to LANGS. No other code changes.
export const LANGS = ['tr', 'en', 'es', 'fr', 'de', 'ru', 'pt'];

function parseCSV(raw) {
  const out = {};
  const lines = raw.split(/\r?\n/);
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line || line === 'key,tr' || line === 'key,en') continue;
    // Parse: first field is the key, rest is the value. Fields may be quoted,
    // embedded quotes are doubled (""). A quoted field may span newlines, so
    // we accumulate until the quoted field closes.
    let key = '';
    let val = '';
    let inQuotes = false;
    let field = 0; // 0 = key, 1 = value
    let buf = '';
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (inQuotes) {
        if (c === '"') {
          if (line[j + 1] === '"') { buf += '"'; j++; }
          else inQuotes = false;
        } else buf += c;
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',' && field === 0) {
        key = buf; buf = ''; field = 1;
      } else buf += c;
    }
    val = buf;
    if (key) out[key] = val;
  }
  return out;
}

const TRANSLATIONS = {
  tr: parseCSV(trCSV),
  en: parseCSV(enCSV),
  es: parseCSV(esCSV),
  fr: parseCSV(frCSV),
  de: parseCSV(deCSV),
  ru: parseCSV(ruCSV),
  pt: parseCSV(ptCSV),
};

export function normalizeLanguage(language) {
  return LANGS.includes(language) ? language : 'tr';
}

export function createTranslator(language) {
  const lang = normalizeLanguage(language);
  return (key, vars = {}) => {
    const value = TRANSLATIONS[lang][key] ?? TRANSLATIONS.tr[key] ?? key;
    if (typeof value !== 'string') return key;
    return value.replace(/\{(\w+)\}/g, (_, token) => (vars[token] ?? ''));
  };
}

const LocaleContext = createContext({
  language: 'tr',
  t: (key) => key,
});

export function LocaleProvider({ language, children }) {
  const value = useMemo(() => {
    const normalized = normalizeLanguage(language);
    return {
      language: normalized,
      t: createTranslator(normalized),
    };
  }, [language]);

  return createElement(LocaleContext.Provider, { value }, children);
}

export function useLocale() {
  return useContext(LocaleContext);
}
