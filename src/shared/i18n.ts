import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/shared/locales/en.json'
import zhTW from '@/shared/locales/zh-TW.json'
import zhCN from '@/shared/locales/zh-CN.json'
import es from '@/shared/locales/es.json'
import ar from '@/shared/locales/ar.json'
import ptBR from '@/shared/locales/pt-BR.json'
import fr from '@/shared/locales/fr.json'
import ja from '@/shared/locales/ja.json'
import de from '@/shared/locales/de.json'
import ru from '@/shared/locales/ru.json'

const detectLanguage = () => {
  if (typeof window === 'undefined') return 'zh-TW'
  const stored = window.localStorage.getItem('i18nextLng')
  if (stored) return stored
  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('zh-cn') || browserLang.startsWith('zh-hans')) return 'zh-CN'
  if (browserLang.startsWith('zh-tw') || browserLang.startsWith('zh-hant')) return 'zh-TW'
  if (browserLang.startsWith('pt-br')) return 'pt-BR'
  const short = browserLang.split('-')[0]
  const supported = ['en', 'zh-TW', 'zh-CN', 'es', 'ar', 'pt-BR', 'fr', 'ja', 'de', 'ru']
  return supported.includes(short) ? short : 'en'
}

i18n.use(initReactI18next).init({
  // Silence i18next sponsor/info banner in production console.
  showSupportNotice: false,
  resources: {
    en: { translation: en },
    'zh-TW': { translation: zhTW },
    'zh-CN': { translation: zhCN },
    es: { translation: es },
    ar: { translation: ar },
    'pt-BR': { translation: ptBR },
    fr: { translation: fr },
    ja: { translation: ja },
    de: { translation: de },
    ru: { translation: ru }
  },
  lng: detectLanguage(),
  supportedLngs: ['en', 'zh-TW', 'zh-CN', 'es', 'ar', 'pt-BR', 'fr', 'ja', 'de', 'ru'],
  nonExplicitSupportedLngs: false,
  load: 'currentOnly',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
})

export default i18n
