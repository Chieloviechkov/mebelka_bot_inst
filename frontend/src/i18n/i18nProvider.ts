import polyglotI18nProvider from 'ra-i18n-polyglot';
import { ukMessages } from './uk';

export const i18nProvider = polyglotI18nProvider(() => ukMessages as any, 'uk', [
  { locale: 'uk', name: 'Українська' },
]);
