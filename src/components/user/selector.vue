<template>
  <div class="user-permission-selector">
    <div class="dropdown" :class="{ show: isOpen }">
      <button 
        class="btn btn-light w-100 text-start border rounded-md d-flex align-items-center justify-content-between"
        type="button" 
        @click="toggleDropdown"
        :aria-expanded="isOpen"
      >
        <div class="d-flex align-items-center flex-grow-1 overflow-hidden">
          <i class="bi bi-search me-2 text-muted"></i>
          
          <!-- 选中的用户或占位文本 -->
          <div class="flex-grow-1 overflow-hidden">
            <span 
              v-if="selectedUser" 
              class="text-body"
            >
              {{ selectedUser.account }}
            </span>
            
            <!-- 占位文本 -->
            <span 
              v-else
              class="text-muted flex-grow-1"
            >
              {{ placeholder || '选择用户' }}
            </span>
          </div>
        </div>
        
        <!-- 下拉箭头 -->
        <i class="bi" :class="isOpen ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
      </button>
      
      <!-- 下拉菜单 -->
      <div 
        class="dropdown-menu w-100 p-2 shadow-lg border rounded-md" 
        :class="{ show: isOpen }"
        @click.stop
      >
        <!-- 搜索框 -->
        <div class="mb-2">
          <input
            type="text"
            class="form-control"
            ref="searchInput"
            :placeholder="searchPlaceholder || '搜索用户...'"
            v-model="searchQuery"
            @input="handleSearchInput"
            @keydown="handleKeydown"
          >
        </div>
        
        <!-- 搜索结果组 -->
        <div class="mb-1">
          <div class="dropdown-header d-flex justify-content-between align-items-center">
            <span>搜索结果</span>
            <div v-if="loading" class="w-20">
              <div class="progress" style="height: 2px;">
                <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 100%"></div>
              </div>
            </div>
          </div>
          
          <!-- 结果列表 -->
          <div class="mt-1">
            <button
              v-for="user in userList"
              :key="user.userId"
              class="dropdown-item d-block w-100 text-start mb-1 rounded"
              :class="{ 'active': selectedUser?.userId === user.userId }"
              @click.prevent.stop="handleSelectUser(user)"
            >
              {{ user.account }}
            </button>
            
            <div 
              v-if="!loading && userList.length === 0" 
              class="text-center text-muted py-2"
            >
              没有找到匹配的用户
            </div>
          </div>
        </div>
        
        <!-- 清除按钮 -->
        <button 
          type="button" 
          class="btn btn-link text-danger w-100 mt-1"
          @click="handleClear"
          :disabled="!selectedUser"
        >
          <i class="bi bi-trash me-1"></i> 清除选择
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import * as userService from '@/service/account';
import { modal } from '@/utils/modal';

interface User {
  userId: number;  // 用户ID，number类型
  account: string; // 账号，用于显示
  [key: string]: any;
}

interface ApiResponse<T> {
  ret: number;
  msg: string;
  data?: T;
}

interface UserListResponseData {
  data: User[];
  total: number;
  page: number;
}

const props = defineProps<{
  modelValue?: number;  // 现在绑定的是number类型的userId
  placeholder?: string;
  searchPlaceholder?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | undefined): void;
  (e: 'clear'): void;
}>();

// 组件引用
const searchInput = ref<HTMLInputElement | null>(null);

// 下拉框状态
const isOpen = ref(false);

// 搜索相关
const searchQuery = ref('');
const loading = ref(false);
const userList = ref<User[]>([]);
const page = ref(1);
const pageSize = ref(20);
const totalUsers = ref(0);

// 内部维护的选中用户对象（包含userId和account）
const selectedUser = ref<User | undefined>(undefined);
const isUpdating = ref(false);

// 防抖函数
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | null = null;
  return function(...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      // @ts-ignore
      fn.apply(this, args);
    }, delay);
  };
}

// 处理搜索输入
const handleSearchInput = debounce(async (e: Event) => {
  if (isUpdating.value) return;
  
  const input = e.target as HTMLInputElement;
  const value = input.value.trim();
  
  searchQuery.value = value;
  page.value = 1;
  
  if (value) {
    await fetchUsers(value);
  } else {
    userList.value = [];
  }
}, 150);

// 处理选择用户
const handleSelectUser = async (user: User) => {
  if (isUpdating.value || selectedUser.value?.userId === user.userId) return;
  
  //isUpdating.value = true;
  try {
    selectedUser.value = user;
    searchQuery.value = '';
    await nextTick();
    if (searchInput.value) {
      searchInput.value.focus();
    }
    // 选择后关闭下拉框
    closeDropdown();
  } finally {
    //isUpdating.value = false;
  }
};

// 清除输入框内容
const clearInput = async () => {
  searchQuery.value = '';
  userList.value = [];
  await nextTick();
  if (searchInput.value) {
    searchInput.value.focus();
  }
};

// 处理选择变化事件 - 向外传递userId
watch(
  () => selectedUser.value,
  (newVal) => {
    const id = newVal?.userId || 0;
    if (props.modelValue !== id) {
      emit('update:modelValue', id);
    }
  }
);

// 处理键盘事件
const handleKeydown = async (e: KeyboardEvent) => {
  if (isUpdating.value) return;
  
  // 处理删除键
  if (e.key === 'Backspace' && searchQuery.value === '' && selectedUser.value) {
    e.preventDefault();
    handleClear();
    return;
  }
  
  // 处理回车选中第一个
  if (e.key === 'Enter' && userList.value.length > 0) {
    e.preventDefault();
    
    const firstUser = userList.value[0];
    if (firstUser) {
      await handleSelectUser(firstUser);
    }
  }
  
  // 处理ESC关闭下拉框
  if (e.key === 'Escape') {
    closeDropdown();
  }
};

// 切换下拉框显示状态
const toggleDropdown = async (e: MouseEvent) => {
  
  isOpen.value = !isOpen.value;
  
  e.stopPropagation?.();
  e.preventDefault?.();

  if (isOpen.value) {
    await nextTick();
    if (searchInput.value) {
      searchInput.value.focus();
    }
    
    if (searchQuery.value.trim()) {
      await fetchUsers(searchQuery.value.trim());
    }
  }
};

// 关闭下拉框
const closeDropdown = () => {
  isOpen.value = false;
};

// 处理清除选中
const handleClear = async () => {
  if (isUpdating.value || !selectedUser.value) return;
  
  isUpdating.value = true;
  try {
    selectedUser.value = undefined;
    //await clearInput();
    emit('clear');
  } finally {
    isUpdating.value = false;
  }
};

// 获取用户列表
const fetchUsers = async (filter: string) => {
  try {
    loading.value = true;
    const response: ApiResponse<UserListResponseData> = await userService.queryUser({
      query: { filter: filter || '' },
      page: page.value,
      size: pageSize.value
    });
    
    if (response.ret !== 0) {
      await modal.error(`获取用户失败: ${response.msg || '未知错误'}`);
      userList.value = [];
      totalUsers.value = 0;
      return;
    }
    
    userList.value = response.data || [];
    totalUsers.value = response.total || 0;
  } catch (error) {
    console.error('获取用户列表失败:', error);
    await modal.error('获取用户列表时发生错误');
    userList.value = [];
    totalUsers.value = 0;
  } finally {
    loading.value = false;
  }
};

// 同步外部传入的userId到内部状态
const syncWithExternalValue = (userId?: number) => {
  if (isUpdating.value) return;
  
  isUpdating.value = true;
  try {
    if (userId === undefined) {
      selectedUser.value = undefined;
    } else if (!selectedUser.value || selectedUser.value.userId !== userId) {
      // 如果当前列表中没有该用户，可能需要重新获取或保持ID
      const existingUser = userList.value.find(u => u.userId === userId);
      selectedUser.value = existingUser;
      // 注意：如果用户不在当前列表中，这里只会设置userId，不会显示用户名
      // 实际应用中可能需要额外处理这种情况
    }
  } finally {
    setTimeout(() => {
      isUpdating.value = false;
    }, 0);
  }
};

// 监听外部传入的modelValue变化
watch(
  () => props.modelValue,
  (newVal) => {
    syncWithExternalValue(newVal);
  },
  { immediate: true }
);

// 点击外部关闭下拉框
const handleClickOutside = (e: MouseEvent) => {
  const dropdown = document.querySelector('.user-permission-selector .dropdown');
  if (dropdown && !dropdown.contains(e.target as Node) && isOpen.value) {
    closeDropdown();
  }
};

onMounted(() => {
  syncWithExternalValue(props.modelValue);
  fetchUsers('');
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

defineExpose({
  selectedUser,
  totalUsers
});
</script>

<style scoped>
.user-permission-selector {
  width: 100%;
}

.dropdown-item.active {
  background-color: #0d6efd;
  color: white;
}

.dropdown-menu.show {
  display: block;
}

/* 自定义滚动条 */
.dropdown-menu {
  max-height: 300px;
  overflow-y: auto;
}

.dropdown-menu::-webkit-scrollbar {
  width: 6px;
}

.dropdown-menu::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.dropdown-menu::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.dropdown-menu::-webkit-scrollbar-thumb:hover {
  background: #aaa;
}
</style>
