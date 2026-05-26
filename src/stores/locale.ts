import { defineStore } from 'pinia';
import type { AppLocale } from '@/i18n';

const LOCALE_KEY = 'app-locale';

export const useLocaleStore = defineStore('locale', {
  state: () => ({
    locale: (localStorage.getItem(LOCALE_KEY) || 'en-US') as AppLocale,
  }),

  getters: {
    isZhCN: (state) => state.locale === 'zh-CN',
    isEnUS: (state) => state.locale === 'en-US',
    localeLabel: (state) => {
      const labels: Record<AppLocale, string> = {
        'zh-CN': '中文',
        'en-US': 'English',
      };
      return labels[state.locale];
    },
  },

  actions: {
    setLocale(locale: AppLocale) {
      this.locale = locale;
      try {
        localStorage.setItem(LOCALE_KEY, locale);
      } catch {
        // ignore
      }
      document.documentElement.lang = locale === 'zh-CN' ? 'zh' : 'en';
    },

    toggleLocale() {
      this.setLocale(this.locale === 'zh-CN' ? 'en-US' : 'zh-CN');
    },
  },
});
