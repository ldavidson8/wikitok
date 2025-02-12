import { I18n } from 'i18n-js';
import { translations } from './translations';
import * as Localization from 'expo-localization';

const i18n = new I18n(translations);
i18n.locale = Localization.getLocales()[0].languageCode!;
i18n.enableFallback = true;

export default i18n;
