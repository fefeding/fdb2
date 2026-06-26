<template>
  <!-- 更新提示条幅 - 顶部 -->
  <div v-if="updateState.showBanner" class="update-banner">
    <div class="update-banner-content" @click="handleDownload">
      <i class="bi bi-cloud-arrow-down"></i>
      <span class="update-banner-text">{{ t('update.available', { version: updateState.version }) }}</span>
      <button class="update-btn" @click.stop="handleDownload">
        {{ t('update.downloadNow') }}
      </button>
    </div>
    <button class="update-banner-close" @click="handleDismiss">
      <i class="bi bi-x"></i>
    </button>
  </div>

  <router-view />
</template>

<script lang="ts" setup>
import { reactive, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// 下载页地址（GitHub Releases 最新版）
const DOWNLOAD_URL = 'https://github.com/fefeding/fdb2/releases/latest';

// 更新状态
const updateState = reactive({
  showBanner: false,
  version: '',
});

let unsubscribeUpdate: (() => void) | null = null;
let unsubscribeMenu: (() => void) | null = null;

/** 跳转到下载页（在 Electron 中会通过外部浏览器打开） */
function handleDownload() {
  window.open(DOWNLOAD_URL, '_blank');
}

function handleDismiss() {
  updateState.showBanner = false;
}

onMounted(() => {
  // 仅在 Electron 环境中监听更新事件
  const electronAPI = (window as any).electronAPI;
  if (!electronAPI?.updater) return;

  unsubscribeUpdate = electronAPI.updater.onEvent((msg: any) => {
    const { event, data } = msg;
    // 仅在有新版本时显示条幅，其他状态（包括错误）一律忽略
    if (event === 'available') {
      updateState.version = data?.version || '';
      updateState.showBanner = true;
    }
  });

  // 监听菜单 "Check for Updates" 操作
  unsubscribeMenu = electronAPI.updater.onMenuAction((action: string) => {
    if (action === 'check-update') {
      electronAPI?.updater?.checkForUpdates();
    }
  });
});

onBeforeUnmount(() => {
  unsubscribeUpdate?.();
  unsubscribeMenu?.();
});
</script>

<style>
/* 更新通知栏 */
.update-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  font-size: 13px;
  color: #cdd6f4;
  background: linear-gradient(90deg, #1e1e2e 0%, #313244 100%);
  border-bottom: 1px solid rgba(137, 180, 250, 0.3);
  animation: slideDown 0.3s ease;
}

.update-banner-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  cursor: pointer;
}

.update-banner i { font-size: 14px; color: #89b4fa; }
.update-banner-text { flex: 1; }

.update-btn {
  padding: 3px 12px;
  font-size: 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  background: #89b4fa;
  color: #1e1e2e;
  transition: opacity 0.15s;
}
.update-btn:hover { opacity: 0.85; }

.update-banner-close {
  background: none;
  border: none;
  color: #6c7086;
  cursor: pointer;
  padding: 2px 6px;
  font-size: 14px;
  border-radius: 4px;
}
.update-banner-close:hover { color: #cdd6f4; background: rgba(255,255,255,0.1); }

@keyframes slideDown {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}
</style>
