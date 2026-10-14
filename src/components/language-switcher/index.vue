<template>
  <div class="language-switcher" @click="toggle" :title="$t('common.language')">
    <i class="bi bi-translate"></i>
    <span class="lang-label">{{ localeStore.isZhCN ? 'EN' : '中' }}</span>
  </div>
</template>

<script lang="ts" setup>
import { watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLocaleStore } from '@/stores/locale';

const { locale: i18nLocale } = useI18n();
const localeStore = useLocaleStore();

// 初始化同步
i18nLocale.value = localeStore.locale;

watch(() => localeStore.locale, (newLocale) => {
  i18nLocale.value = newLocale;
}, { immediate: true });

function toggle() {
  localeStore.toggleLocale();
  i18nLocale.value = localeStore.locale;
}
</script>

<style scoped>
.language-switcher {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  color: var(--db-text-muted, #64748b);
  font-size: 0.75rem;
  font-weight: 500;
  transition: color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
  user-select: none;
  border: 1px solid var(--db-border, #cbd5e1);
  background: transparent;
}

.language-switcher:hover {
  background: var(--db-bg-soft, rgba(102, 126, 234, 0.1));
  color: var(--db-dark-color, #667eea);
  border-color: var(--db-border-light, #667eea);
}

.lang-label {
  letter-spacing: 0.05em;
}
</style>
