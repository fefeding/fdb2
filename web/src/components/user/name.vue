<template>
    <span v-if="loading" class="text-muted">
      <i class="bi bi-hourglass-split"></i> 加载中...
    </span>
    <span v-else-if="error" class="text-danger">
      <i class="bi bi-exclamation-circle"></i> 加载失败
    </span>
    <span v-else-if="userInfo" class="user-info" :title="userInfo.id">
      <span class="user-name">{{ userInfo.name }}</span>
      <span class="user-phone ms-2 text-secondary" v-if="userInfo.mobile">({{ formatPhone(userInfo.mobile) }})</span>
    </span>
    <span v-else class="text-secondary">未知用户</span>
  </template>
  
  <script setup lang="ts">
  import { ref, watch, onMounted } from 'vue';
  import * as userServer from '@/service/account'; // 假设用户服务路径
  
  // 接收父组件传入的用户ID
  const props = defineProps<{
    userId?: number | null
  }>();
  
  // 组件内部状态
  const userInfo = ref<any>(null);
  const loading = ref(false);
  const error = ref(false);
  
  // 缓存已查询过的用户信息，避免重复请求
  const userCache = new Map<number, any>();
  
  // 格式化手机号（13800138000 -> 138****8000）
  const formatPhone = (phone: string) => {
    // if (phone.length === 11) {
    //   return `${phone.slice(0, 3)}****${phone.slice(7)}`;
    // }
    return phone;
  };
  
  // 根据用户ID获取用户信息
  const fetchUserInfo = async (userId: number | null | undefined) => {
    // 如果没有用户ID，直接清空显示
    if (!userId || userId <= 0) {
      userInfo.value = null;
      return;
    }
  
    // 检查缓存，如果有直接使用
    if (userCache.has(userId)) {
      userInfo.value = userCache.get(userId) || null;
      return;
    }
  
    // 发起请求获取用户信息
    loading.value = true;
    error.value = false;
    
    try {
      const res = await userServer.getUserDetail(userId);
      if (res.ret === 0 && res.data) {
        const user = res.data;
        userInfo.value = user;
        userCache.set(userId, user); // 存入缓存
      } else {
        throw new Error(res.msg || '获取用户信息失败');
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
      error.value = true;
      userInfo.value = null;
    } finally {
      loading.value = false;
    }
  };
  
  // 当用户ID变化时重新获取信息
  watch(
    () => props.userId,
    (newUserId) => {
      fetchUserInfo(newUserId);
    },
    { immediate: true } // 组件初始化时立即执行
  );
  
  // 组件挂载时执行一次
  onMounted(() => {
    fetchUserInfo(props.userId);
  });
  </script>
  
  <style scoped>
  .user-name {
    color: var(--bs-primary);
  }
  
  .user-name:hover {
    text-decoration: underline;
    cursor: pointer;
  }
  
  .user-phone {
    font-size: 0.875rem;
  }
  </style>