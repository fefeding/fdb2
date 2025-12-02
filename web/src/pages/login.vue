<template>
  <div class="login-page min-vh-100 min-vw-100 d-flex align-items-center justify-content-center p-3 position-fixed top-0 start-0 skin-default">
    <!-- 背景装饰元素 -->
    <div class="background-decoration">
      <div class="floating-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
        <div class="shape shape-4"></div>
      </div>
    </div>
    
    <!-- 登录卡片 - 桌面应用风格 -->
    <div class="login-card shadow-xxl mx-4 my-8 position-relative z-10 transition-all duration-500">
      <!-- 玻璃态背景效果 -->
      <div class="glass-overlay"></div>
      
      <!-- 卡片头部 - 现代设计 -->
      <div class="login-header p-8 position-relative overflow-hidden">
        <div class="login-header-decoration position-absolute top-0 start-0 w-100 h-100"></div>
        <div class="text-center position-relative z-10">
          <div class="mb-4 d-inline-block header-icon-wrapper p-4 rounded-4">
            <div class="header-icon p-4 rounded-circle d-inline-flex align-items-center justify-content-center">
              <i class="bi bi-shield-lock fs-2"></i>
            </div>
          </div>
          <h1 class="h2 mb-3 fw-bold">{{sysConfig.title}} 管理中心</h1>
          <p class="header-subtitle mb-0">专业的数据库管理平台</p>
          <div class="mt-3">
            <span class="badge bg-white text-primary bg-opacity-25 px-3 py-2">
              <i class="bi bi-patch-check-fill me-1"></i> 安全登录
            </span>
          </div>
        </div>
      </div>
      
      <!-- 卡片主体 - 现代表单设计 -->
      <div class="login-body p-8">
        <!-- 错误提示 - 现代设计 -->
        <div v-if="errorMessage" class="alert alert-danger alert-modern mb-6" role="alert">
          <div class="d-flex align-items-center">
            <div class="alert-icon me-3">
              <i class="bi bi-exclamation-triangle-fill fs-5"></i>
            </div>
            <div class="flex-grow-1">
              <strong>登录失败</strong>
              <div class="small">{{ errorMessage }}</div>
            </div>
          </div>
        </div>
        
        <form @submit.prevent="handleLogin" class="gap-6 d-flex flex-column">
          <!-- 用户名输入 - 现代输入框设计 -->
          <div class="form-group-modern">
            <label for="username" class="form-label-modern mb-3 d-block">
              <i class="bi bi-person-circle me-2 text-primary"></i>
              <span class="fw-semibold">用户账号</span>
            </label>
            <div class="input-group-modern">
              <div class="input-icon-wrapper">
                <i class="bi bi-person fs-5"></i>
              </div>
              <input 
                type="text" 
                id="username" 
                v-model="form.username"
                class="form-control-modern" 
                placeholder="请输入用户名或邮箱"
                required
                autocomplete="username"
                :disabled="isLoading"
                @focus="updateStatus('正在输入账号...')"
                @blur="updateStatus('等待输入...')"
              >
              <div class="input-border"></div>
            </div>
          </div>
          
          <!-- 密码输入 - 现代输入框设计 -->
          <div class="form-group-modern">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <label for="password" class="form-label-modern mb-0">
                <i class="bi bi-shield-check me-2 text-primary"></i>
                <span class="fw-semibold">登录密码</span>
              </label>
              <a href="#" class="text-decoration-none small text-primary fw-medium">
                <i class="bi bi-question-circle me-1"></i>忘记密码？
              </a>
            </div>
            <div class="input-group-modern">
              <div class="input-icon-wrapper">
                <i class="bi bi-lock fs-5"></i>
              </div>
              <input 
                :type="showPassword ? 'text' : 'password'" 
                id="password" 
                v-model="form.password"
                class="form-control-modern" 
                placeholder="请输入密码"
                required
                autocomplete="current-password"
                :disabled="isLoading"
                @focus="updateStatus('正在输入密码...')"
                @blur="updateStatus('等待输入...')"
              >
              <button 
                type="button" 
                class="password-toggle-btn"
                @click="showPassword = !showPassword"
                aria-label="显示/隐藏密码"
                :disabled="isLoading"
              >
                <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
              <div class="input-border"></div>
            </div>
          </div>
          
          <!-- 登录按钮 - 现代按钮设计 -->
          <button 
            type="submit" 
            class="btn-login-modern w-100 py-4 position-relative overflow-hidden"
            :disabled="isLoading"
          >
            <span class="btn-content">
              <i class="bi bi-box-arrow-in-right me-2"></i>
              <span v-if="isLoading">
                <span class="spinner-border spinner-border-sm me-2"></span>
                正在登录...
              </span>
              <span v-else>安全登录</span>
            </span>
            <div class="btn-ripple"></div>
          </button>
          
          <!-- 记住账号选项 -->
          <div class="form-check mt-4">
            <input class="form-check-input" type="checkbox" v-model="form.remember" id="remember">
            <label class="form-check-label text-muted" for="remember">
              <i class="bi bi-bookmark me-1"></i>记住我的账号
            </label>
          </div>
        </form>
        
        <!-- 状态信息区域 - 现代状态显示 -->
        <div class="status-bar mt-6 p-3 rounded-3">
          <div class="d-flex align-items-center">
            <div class="status-indicator me-3">
              <div class="status-dot" :class="statusDotClass"></div>
            </div>
            <div class="flex-grow-1">
              <small class="status-text" :class="statusClass">
                {{ statusMessage }}<span v-if="isLoading" class="terminal-cursor">|</span>
              </small>
            </div>
            <div class="status-icon">
              <i :class="statusIconClass"></i>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 卡片底部 - 现代底部设计 -->
      <div class="login-footer p-6 text-center">
        <div class="footer-links mb-3">
          <a href="#" class="footer-link">
            <i class="bi bi-shield-check me-1"></i>安全协议
          </a>
          <span class="mx-2 text-muted">·</span>
          <a href="#" class="footer-link">
            <i class="bi bi-question-circle me-1"></i>帮助中心
          </a>
        </div>
        <p class="footer-copyright mb-0">
          <i class="bi bi-c-circle me-1"></i>
          {{ new Date().getFullYear() }} 数据库管理平台 - 版本 1.0.0
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
/* 背景装饰 - 桌面应用风格 */
.login-page {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: background-color 0.5s ease, color 0.5s ease;
  position: relative;
  overflow: hidden;
}

.background-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.floating-shapes {
  position: absolute;
  width: 100%;
  height: 100%;
}

.shape {
  position: absolute;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  animation: float 6s ease-in-out infinite;
}

.shape-1 {
  width: 200px;
  height: 200px;
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.shape-2 {
  width: 150px;
  height: 150px;
  top: 70%;
  right: 10%;
  animation-delay: 2s;
}

.shape-3 {
  width: 100px;
  height: 100px;
  top: 50%;
  left: 80%;
  animation-delay: 4s;
}

.shape-4 {
  width: 80px;
  height: 80px;
  bottom: 20%;
  left: 30%;
  animation-delay: 1s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

/* 登录卡片 - 桌面应用风格 */
.login-card {
  width: 480px;
  max-width: 95vw;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;
  position: relative;
}

.login-card:hover {
  transform: translateY(-8px);
  box-shadow: 
    0 32px 64px -12px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.2);
}

/* 玻璃态叠加层 */
.glass-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1) 0%, 
    rgba(255, 255, 255, 0.05) 100%);
  pointer-events: none;
  z-index: 1;
}

/* 头部样式 - 现代设计 */
.login-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: relative;
}

.login-header-decoration {
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
  opacity: 0.3;
}

.header-icon-wrapper {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.header-icon-wrapper:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.header-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.1));
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.header-subtitle {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 300;
  letter-spacing: 0.5px;
}

/* 主体样式 */
.login-body {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 2;
}

/* 现代表单组样式 */
.form-group-modern {
  position: relative;
}

.form-label-modern {
  color: #374151;
  font-weight: 500;
  letter-spacing: 0.025em;
}

.input-group-modern {
  position: relative;
}

.input-icon-wrapper {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  z-index: 3;
  transition: color 0.3s ease;
}

.form-control-modern {
  background: #ffffff;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  padding: 16px 20px 16px 60px;
  font-size: 16px;
  font-weight: 400;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.form-control-modern:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1), 0 4px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.form-control-modern:focus + .input-border {
  transform: scaleX(1);
}

.input-border {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transform: scaleX(0);
  transition: transform 0.3s ease;
  border-radius: 2px;
}

.password-toggle-btn {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 18px;
  cursor: pointer;
  transition: color 0.3s ease;
  z-index: 3;
}

.password-toggle-btn:hover {
  color: #667eea;
}

/* 现代按钮样式 */
.btn-login-modern {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 16px;
  color: white;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
  position: relative;
  overflow: hidden;
}

.btn-login-modern:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(102, 126, 234, 0.4);
}

.btn-login-modern:active {
  transform: translateY(0);
}

.btn-login-modern:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.btn-login-modern:active .btn-ripple {
  width: 300px;
  height: 300px;
}

/* 现代警告框样式 */
.alert-modern {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border: 1px solid #fca5a5;
  border-radius: 12px;
  padding: 16px 20px;
  color: #dc2626;
  box-shadow: 0 4px 6px rgba(220, 38, 38, 0.1);
}

.alert-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(220, 38, 38, 0.1);
  border-radius: 10px;
  flex-shrink: 0;
}

/* 现代状态栏样式 */
.status-bar {
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.status-indicator {
  display: flex;
  align-items: center;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9ca3af;
  transition: all 0.3s ease;
}

.status-dot.active {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

.status-dot.loading {
  background: #f59e0b;
  animation: pulse 1.5s ease-in-out infinite;
}

.status-text {
  color: #6b7280;
  font-weight: 500;
}

.status-icon {
  color: #9ca3af;
  font-size: 18px;
}

/* 底部样式 */
.login-footer {
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-top: 1px solid #e5e7eb;
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.footer-link {
  color: #6b7280;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.3s ease;
}

.footer-link:hover {
  color: #667eea;
}

.footer-copyright {
  color: #9ca3af;
  font-size: 13px;
  font-weight: 400;
}

/* 终端光标动画 */
.terminal-cursor {
  animation: blink 1s step-end infinite;
  color: #667eea;
}

/* 通用动画 */
@keyframes blink {
  from, to { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .login-card {
    width: 100%;
    max-width: 400px;
    border-radius: 16px;
  }
  
  .login-header {
    padding: 2rem !important;
  }
  
  .login-body {
    padding: 2rem !important;
  }
  
  .form-control-modern {
    padding: 14px 18px 14px 54px;
    font-size: 16px;
  }
  
  .btn-login-modern {
    padding: 16px;
    font-size: 16px;
  }
  
  .shape {
    display: none;
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .login-page {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  }
  
  .login-card {
    background: rgba(30, 41, 59, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .login-body {
    background: rgba(30, 41, 59, 0.8);
  }
  
  .form-control-modern {
    background: rgba(51, 65, 85, 0.8);
    border-color: rgba(255, 255, 255, 0.1);
    color: white;
  }
  
  .form-label-modern {
    color: #e2e8f0;
  }
  
  .status-bar {
    background: rgba(30, 41, 59, 0.8);
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  .status-text {
    color: #94a3b8;
  }
}
</style>
