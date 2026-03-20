import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ptBR from './pt-BR.json';

const LANG_KEY = 'bb-lang';

i18n.use(initReactI18next).init({
  resources: {
    en:      { translation: en },
    'pt-BR': { translation: ptBR },
  },
  lng: localStorage.getItem(LANG_KEY) || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function setLanguage(lang) {
  localStorage.setItem(LANG_KEY, lang);
  i18n.changeLanguage(lang);
}

export function getLanguage() {
  return i18n.language;
}

export default i18n;
