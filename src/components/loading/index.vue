<template>
    <div class="loading-overlay" v-if="isLoading">
      <div class="loading-spinner">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
        <p v-if="displayMessage" class="m-3 text-primary">{{ displayMessage }}</p>
    </div>
  </template>
  
  <script setup lang="ts">
  import { useI18n } from 'vue-i18n';
  import { computed } from 'vue';
  
  const { t } = useI18n();
  
  const props = defineProps({
    isLoading: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: ''
    }
  });
  
  const displayMessage = computed(() => props.message || t('common.loading'));
  </script>
  
  <style scoped>
  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.3);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1050;
  }
  
  .loading-spinner {
    text-align: center;
  }
  </style>  