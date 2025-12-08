<template>
    <!-- 分页组件 -->
    <nav aria-label="Page navigation" class="px-3">
        <ul class="pagination">
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <a class="page-link" href="#" @click.prevent="prevPage">上一页</a>
            </li>
            
            <!-- 生成页码列表 -->
            <li v-for="page in visiblePages" 
                :key="page" 
                class="page-item" 
                :class="{ disabled: page==='...', active: currentPage===page }">
                <a class="page-link" 
                    href="#" 
                    @click.prevent="goToPage(page)"
                    :tabindex="page==='...'? -1 : 0">
                    {{ page }}
                </a>
            </li>
            
            <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <a class="page-link" href="#" @click.prevent="nextPage">下一页</a>
            </li>
        </ul>
    </nav>
</template>
    
<script setup lang="ts">
import { computed } from 'vue';
    
const props = defineProps({
    // 总页数
    totalPages: {
        type: Number,
        default: 1
    },
    currentPage: {
        type: Number,
        default: 1,
    },
});

const emits = defineEmits(['pageChanged']);

// 可见的页码列表（包括省略号）
const visiblePages = computed(() => {
    const pages = [] as Array<any>;
    const maxVisiblePages = 5; // 最大可见页码数（不包括省略号）
    const current = props.currentPage;
    
    // 总页数较少时，显示所有页码
    if (props.totalPages <= maxVisiblePages) {
        for (let i = 1; i <= props.totalPages; i++) {
            pages.push(i);
        }
        return pages;
    }
    
    // 总页数较多时，智能显示部分页码
    if (current <= 3) {
        // 当前页在前3页，显示前5页
        pages.push(1, 2, 3, 4, 5);
        pages.push('...');
        pages.push(props.totalPages);
    } else if (current >= props.totalPages - 2) {
        // 当前页在后3页，显示后5页
        pages.push(1);
        pages.push('...');
        pages.push(props.totalPages - 4, props.totalPages - 3, props.totalPages - 2, props.totalPages - 1, props.totalPages);
    } else {
        // 当前页在中间，显示当前页及其前后2页
        pages.push(1);
        pages.push('...');
        pages.push(current - 2, current - 1, current, current + 1, current + 2);
        pages.push('...');
        pages.push(props.totalPages);
    }
    return pages;
});

// 上一页
const prevPage = () => {
    if (props.currentPage > 1) {
        emits('pageChanged', props.currentPage - 1);
    }
};

// 下一页
const nextPage = () => {
    if (props.currentPage < props.totalPages) {
        emits('pageChanged', props.currentPage + 1);
    }
};

// 跳转到指定页
const goToPage = (page: number|string) => {
    if (typeof page === 'number' && page >= 1 && page <= props.totalPages) {
        emits('pageChanged', page);
    }
};
</script>
    
<style scoped>
    
</style>  