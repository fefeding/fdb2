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
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.3s ease;
  user-select: none;
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.8);
}

.language-switcher:hover {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  border-color: #667eea;
  transform: translateY(-1px);
}

.lang-label {
  letter-spacing: 0.05em;
}
</style>
