<template>
  <div class="login-page min-vh-100 min-vw-100 d-flex align-items-center justify-content-center p-3 position-fixed top-0 start-0 skin-default">
    <!-- 登录卡片 - 调整宽度和最大宽度，添加适当边距 -->
    <div class="login-card w-full max-w-md mx-4 my-8 position-relative z-10 transition-all duration-500">
      <!-- 卡片头部 -->
      <div class="login-header p-6 position-relative overflow-hidden">
        <div class="login-header-decoration position-absolute top-0 start-0 w-100 h-100 opacity-20"></div>
        <div class="text-center position-relative z-10">
          <div class="mb-4 d-inline-block header-icon p-4 rounded-full">
            <i class="bi bi-shield-lock fs-4"></i>
          </div>
          <h2 class="h3 mb-2">{{sysConfig.title}} 后台</h2>
          <p class="header-subtitle text-sm">请登录以继续</p>
        </div>
      </div>
      
      <!-- 卡片主体 -->
      <div class="login-body p-6">
        <!-- 错误提示 -->
        <div v-if="errorMessage" class="alert alert-danger alert-sm mb-4 p-3" role="alert">
          <i class="bi bi-exclamation-circle me-1"></i> {{ errorMessage }}
        </div>
        
        <form @submit.prevent="handleLogin" class="gap-4 d-flex flex-column">
          <!-- 用户名输入 -->
          <div>
            <label for="username" class="form-label mb-2 d-block text-sm font-medium">
              <span>用户名</span>
            </label>
            <div class="input-group">
              <span class="input-group-text input-icon px-3">
                <i class="bi bi-person fs-5"></i>
              </span>
              <input 
                type="text" 
                id="username" 
                v-model="form.username"
                class="form-control focus-ring focus-ring-primary focus-border-primary transition-all" 
                placeholder="输入用户帐号或手机号"
                required
                autocomplete="username"
                :disabled="isLoading"
                @focus="updateStatus('输入帐号中')"
                @blur="updateStatus('等待输入...')"
                style="padding: 0.75rem 1rem; font-size: 1rem;"
              >
            </div>
          </div>
          
          <!-- 密码输入 -->
          <div>
            <div class="d-flex justify-content-between mb-2">
              <label for="password" class="form-label text-sm font-medium">
                <span>密码</span>
              </label>
              <a href="#" class="text-xs text-primary-hover transition-colors">
                <span>忘记密码？</span>
              </a>
            </div>
            <div class="input-group">
              <span class="input-group-text input-icon px-3">
                <i class="bi bi-lock fs-5"></i>
              </span>
              <input 
                :type="showPassword ? 'text' : 'password'" 
                id="password" 
                v-model="form.password"
                class="form-control focus-ring focus-ring-primary focus-border-primary transition-all" 
                placeholder="输入密码"
                required
                autocomplete="current-password"
                :disabled="isLoading"
                @focus="updateStatus('输入密码中')"
                @blur="updateStatus('等待输入...')"
                style="padding: 0.75rem 1rem; font-size: 1rem;"
              >
              <button 
                type="button" 
                class="btn btn-outline-extra px-3"
                @click="showPassword = !showPassword"
                aria-label="显示/隐藏密码"
                :disabled="isLoading"
              >
                <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>
          </div>
          
          <!-- 登录按钮 -->
          <button 
            type="submit" 
            class="btn login-btn w-100 py-3 transition-all duration-300 text-base mt-2"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
            <span>登录系统</span>
          </button>
        </form>
        
        <!-- 状态信息区域 -->
        <div class="mt-4 text-xs" :class="statusClass">
            <p>状态: {{ statusMessage }}<span v-if="isLoading" class="terminal-cursor">|</span></p>
        </div>
      </div>
      
      <!-- 卡片底部 -->
      <div class="login-footer p-4 text-center">
        <p class="text-xs mb-0">
          &copy; {{ new Date().getFullYear() }} 管理系统
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '@/service/login';
import { sysConfig } from '@/domain/SysConfig';

// 表单数据类型定义
interface LoginForm {
  username: string;
  password: string;
  remember: boolean;
}

const router = useRouter();

// 表单数据
const form = ref<LoginForm>({
  username: '',
  password: '',
  remember: true
});

// 状态管理
const showPassword = ref<boolean>(false);
const isLoading = ref<boolean>(false);
const errorMessage = ref<string>('');

// 状态信息
const statusMessage = ref<string>('等待输入...');
const statusColor = ref<string>('text-gray-500');

const statusClass = computed(() => `text-center ${statusColor.value}`);

// 更新状态信息
const updateStatus = (message: string, color: string = 'text-gray-500') => {
  statusMessage.value = message;
  statusColor.value = color;
};

// 登录处理函数
const handleLogin = async () => {
  // 清除之前的错误信息
  errorMessage.value = '';
  
  try {
    isLoading.value = true;
    // 默认皮肤状态颜色
    updateStatus('认证中...', 'text-gray-500');
    
    // 调用登录接口
    const res = await login(form.value.username, form.value.password);
    
    if(res.ret !== 0) {
      throw Error(res.msg || '登录失败');
    }
    
    // 记住密码处理
    if (form.value.remember) {
      localStorage.setItem('rememberedUsername', form.value.username);
    } else {
      localStorage.removeItem('rememberedUsername');
    }
    
    // 登录成功状态提示
    updateStatus(`用户 '${form.value.username}' 认证成功`, 'text-green-600');
    
    // 跳转处理
    setTimeout(() => {
      updateStatus('正在跳转到控制台...', 'text-blue-600');
      let url = router.currentRoute.value.query.url as string;
      if(!url || !/^\/[^\/]+/.test(url) || !url.startsWith(location.origin)) {
        url = sysConfig.rootUrl + '/admin/index';
      }
      location.replace(url);
    }, 1000);
    
  } catch (error) {
    console.error('登录失败:', error);
    const errorText = error instanceof Error 
      ? error.message 
      : '登录失败，请检查您的凭据';
      
    errorMessage.value = errorText;
    updateStatus(`认证失败 - ${errorText.toLowerCase()}`, 'text-red-500');
  } finally {
    if (!errorMessage.value) {
      setTimeout(() => {
        isLoading.value = false;
      }, 1000);
    } else {
      isLoading.value = false;
    }
  }
};

// 初始化表单
const initForm = () => {
  const rememberedUsername = localStorage.getItem('rememberedUsername');
  if (rememberedUsername) {
    form.value.username = rememberedUsername;
  }
};

onMounted(async ()=>{
  // 初始化表单
  initForm();
  
  // 默认皮肤初始化信息
  setTimeout(() => {
    updateStatus('请输入您的凭据', 'text-gray-600');
  }, 500);
});

</script>

<style scoped>
/* 基础样式 - 默认皮肤 */
.login-page {
  transition: background-color 0.5s ease, color 0.5s ease;
}

.login-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease, background-color 0.5s ease, border-radius 0.5s ease;
  background-color: white;
  border-radius: 0.75rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1);
  /* 确保卡片不会过大 */
  max-width: 600px;
  width: 100%;
}

.login-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 0.75rem 1.5rem rgba(0, 0, 0, 0.15);
}

.form-check .form-check-input {
    margin-left: 0!important;
}

/* 默认皮肤样式 */
.skin-default .login-header {
  padding: 1.5rem !important;
  background: linear-gradient(135deg, #165DFF 0%, #0A4BDB 100%);
  color: white;
}

.skin-default .login-body {
  padding: 1.5rem !important;
  background-color: white;
}

.skin-default .login-footer {
  padding: 1rem !important;
  background-color: #f9fafb;
  color: #94a3b8;
}

.skin-default .form-label {
  margin-bottom: 0.5rem !important;
  font-size: 0.875rem !important;
}

.skin-default .input-group .input-icon {
  padding: 0.5rem 0.75rem !important;
}

.skin-default .form-control {
  padding: 0.75rem 1rem !important;
  font-size: 1rem !important;
  margin-bottom: 0 !important;
}

.skin-default form {
  gap: 1rem !important;
}

.skin-default .alert-danger {
  margin-bottom: 1rem !important;
  padding: 0.75rem !important;
}

.skin-default .login-btn {
  padding: 0.75rem !important;
  margin-top: 0.25rem !important;
}

/* 其他基础样式 */
.login-header {
  transition: all 0.5s ease;
}

.login-header-decoration {
  transition: all 0.5s ease;
}

.header-icon {
  transition: all 0.5s ease;
  background-color: rgba(255, 255, 255, 0.2);
}

.header-subtitle {
  transition: all 0.5s ease;
  color: rgba(255, 255, 255, 0.8);
}

.login-body {
  transition: background-color 0.5s ease;
}

.login-footer {
  transition: all 0.5s ease;
}

.login-btn {
  transition: all 0.3s ease;
  background-color: #165DFF;
  color: white;
  font-weight: 500;
  border: none;
}

.login-btn:hover {
  background-color: #0A4BDB;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(22, 93, 255, 0.3);
}

.input-icon {
  transition: all 0.5s ease;
  background-color: rgba(22, 93, 255, 0.05);
  color: #165DFF;
  border-color: #dbeafe;
}

.form-control {
  transition: all 0.3s ease;
  border-color: #e2e8f0;
}

.form-control:focus {
  border-color: #165DFF;
  box-shadow: 0 0 0 0.25rem rgba(22, 93, 255, 0.25);
}

.form-label, .form-check-label, a {
  transition: all 0.5s ease;
  color: #475569;
}

a {
  color: #165DFF;
  text-decoration: none;
}

a:hover {
  color: #0A4BDB;
  text-decoration: underline;
}

.alert-sm {
  font-size: 0.875rem;
}

.btn-outline-extra {
  transition: all 0.3s ease;
  border-color: #e2e8f0;
  color: #64748b;
}

.btn-outline-extra:hover {
  background-color: rgba(22, 93, 255, 0.05);
  border-color: #dbeafe;
  color: #165DFF;
}

/* 终端光标动画 */
.terminal-cursor {
  animation: blink 1s step-end infinite;
}

/* 通用动画 */
@keyframes blink {
  from, to { opacity: 1; }
  50% { opacity: 0; }
}

/* 工具类 */
.transition-all {
  transition: all 0.3s ease;
}

.duration-300 {
  transition-duration: 300ms;
}

.duration-500 {
  transition-duration: 500ms;
}

.gap-5 {
  gap: 1.25rem;
}

.flex-column {
  flex-direction: column;
}

.text-primary-hover:hover {
  color: #165DFF !important;
}

.hover-underline:hover {
  text-decoration: underline;
}

.focus-ring:focus {
  box-shadow: 0 0 0 0.25rem rgba(22, 93, 255, 0.25);
}

.focus-border-primary:focus {
  border-color: #165DFF;
}

.blur-sm {
  filter: blur(2px);
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
