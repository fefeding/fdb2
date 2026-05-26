import { createI18n } from 'vue-i18n';
import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';

export type AppLocale = 'zh-CN' | 'en-US';

const LOCALE_KEY = 'app-locale';

function getSavedLocale(): AppLocale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved === 'zh-CN' || saved === 'en-US') return saved;
  } catch {
    // ignore
  }
  // 默认英文
  return 'en-US';
}

const i18n = createI18n({
  legacy: false,
  locale: getSavedLocale(),
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
});

export default i18n;

// 导出供非 Vue 环境使用的翻译函数
export function getT(): (key: string, params?: Record<string, any>) => string {
  return (i18n.global as any).t;
}
