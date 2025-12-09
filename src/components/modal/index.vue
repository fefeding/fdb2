<template>
    <div class="modal fade" :id="modalId" ref="modalContainer" tabindex="-1" aria-labelledby="modalLabel">
        <div class="modal-dialog modal-dialog-centered" :class="{'modal-fullscreen': isFullScreen}" :style="dynamicStyle">
            <div class="modal-content" :class="contentClass" style="width:max-content; margin: auto;">
                <div class="modal-header" :class="headerClass" style="padding: 1rem 1.5rem;">
                    <h5 class="modal-title d-flex align-items-center" id="modalLabel">
                        <i v-if="typeIcon" :class="typeIcon" class="me-2"></i>
                        {{dynamicTitle || props.title}}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body" v-if="modalShow">
                    <slot v-if="$slots.default"></slot>
                    <div v-else>
                        <div class="d-flex align-items-center mb-3">
                            <i v-if="typeIcon" :class="typeIcon" class="me-3 fs-1"></i>
                            <div class="flex-grow-1">{{dynamicContent}}</div>
                        </div>
                        <div v-if="shouldShowDetails()" class="error-details-toggle mt-2">
                            <button class="btn btn-sm btn-outline-secondary" @click="toggleDetails">
                                {{detailsExpanded ? '隐藏' : '详情'}}
                                <i class="bi bi-chevron-{{detailsExpanded ? 'up' : 'down'}} ms-1"></i>
                            </button>
                            <div v-if="detailsExpanded" class="error-details-content mt-2">
                                <pre class="error-json">{{formatErrorDetails()}}</pre>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <slot name="footer" v-if="$slots.footer"></slot>
                    <template v-else>
                        <button type="button" 
                                v-if="dynamicShowCancel || props.closeButton.show" 
                                class="btn btn-secondary" 
                                @click="cancel">
                            {{dynamicCancelText || props.closeButton.text}}
                        </button>
                        <button type="button" 
                                v-if="props.confirmButton.show" 
                                class="btn" 
                                :class="confirmButtonClass"
                                @click="confirm">
                            {{dynamicConfirmText || props.confirmButton.text}}
                        </button>
                    </template>
                </div>
                <Loading :isLoading="props.isLoading" :message="props.loadingMessage"></Loading>
            </div>
        </div>
    <div class="modal-backdrop fade show" v-if="modalShow"></div>
    </div>
</template>

<script lang="ts" setup>
    import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue';
    import * as bootstrap from 'bootstrap';
    import Loading from '@/components/loading/index.vue';

    // 生成唯一ID，用于区分不同的modal实例
    const modalId = `modal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const props = defineProps({
        title: {
            type: String,
            default: ''
        },
        closeButton: {
            type: Object,
            default: {
                text: '关闭',
                show: false
            }
        },
        confirmButton: {
            type: Object,
            default: {
                text: '确定',
                show: true
            }
        },
        isLoading: {
            type: Boolean,
            default: false
        },
        loadingMessage: {
            type: String,
            default: '处理中...'
        },
        style: {
            type: Object,
            default: {}
        },
        visible: {
            type: Boolean,
            default: false,
        },
        isFullScreen: {
            type: Boolean,
            default: false
        },
        teleport: {
            type: [Boolean, String],
            default: false // true表示传送到body，也可传具体选择器如"#app"
        },
    });

    // 动态属性 - 用于全局modal服务
    const dynamicOptions = ref<any>({});
    const dynamicTitle = ref('');
    const dynamicContent = ref('');
    const dynamicType = ref<'success' | 'error' | 'warning' | 'info' | ''>('');
    const dynamicConfirmText = ref('');
    const dynamicCancelText = ref('');
    const dynamicShowCancel = ref(false);
    const detailsExpanded = ref(false);
    const dynamicErrorDetails = ref<any>(null);
    const dynamicStyle = computed(() => {        
        return {
            ...(Object.keys(props.style).length ? props.style : {}),
            ...(dynamicOptions.value?.style || {}),
        };
    });

    // 判断是否应该显示详情按钮
    const shouldShowDetails = () => {
        return dynamicType.value === 'error' && dynamicErrorDetails.value;
    };

    // 切换详情展开状态
    const toggleDetails = () => {
        detailsExpanded.value = !detailsExpanded.value;
    };

    // 格式化错误详情
    const formatErrorDetails = () => {
        if (!dynamicErrorDetails.value) return '';
        try {
            return JSON.stringify(dynamicErrorDetails.value, null, 2);
        } catch {
            return String(dynamicErrorDetails.value);
        }
    };

    // 类型相关的计算属性
    const typeIcon = computed(() => {
        const iconMap = {
            success: 'bi bi-check-circle-fill text-success',
            error: 'bi bi-x-circle-fill text-danger', 
            warning: 'bi bi-exclamation-triangle-fill text-warning',
            info: 'bi bi-info-circle-fill text-info'
        };
        return iconMap[dynamicType.value as keyof typeof iconMap] || '';
    });

    const headerClass = computed(() => {
        const classMap = {
            success: 'bg-success text-white',
            error: 'bg-danger text-white',
            warning: 'bg-warning text-dark',
            info: 'bg-info text-white'
        };
        return classMap[dynamicType.value as keyof typeof classMap] || '';
    });

    const contentClass = computed(() => {
        if (!dynamicType.value) return '';
        return `modal-${dynamicType.value}`;
    });

    const confirmButtonClass = computed(() => {
        const classMap = {
            success: 'btn-success',
            error: 'btn-danger',
            warning: 'btn-warning',
            info: 'btn-info'
        };
        return classMap[dynamicType.value as keyof typeof classMap] || 'btn-primary';
    });
    
    const originalParent = ref<Node | null>(null); // 保存原始父节点

    // 计算传送目标容器
    const getTargetContainer = () => {
    if (!props.teleport) return null; // 不启用传送
    
    if (typeof props.teleport === 'string') {
        // 传送目标为指定选择器（如"#app"）
        return document.querySelector<HTMLElement>(props.teleport) || null;
    } else {
        // 默认为body
        return document.body;
    }
    };
    // 核心：根据teleport属性传送模态框
    const teleportModal = () => {
        if (!modalContainer.value) return;
        
        // 获取目标容器
        const target = getTargetContainer();
        if (!target) return;
        
        // 保存原始父节点（仅第一次传送时保存）
        if (!originalParent.value) {
            originalParent.value = modalContainer.value.parentNode;
        }
        
        // 如果不在目标容器中，则移动过去
        if (modalContainer.value.parentNode !== target) {
            target.appendChild(modalContainer.value);
        }
        };

        // 恢复模态框到原始位置（组件卸载时）
        const restoreModal = () => {
        if (modalContainer.value && originalParent.value && props.teleport) {
            // 避免重复添加（如果已经在原始父节点则不操作）
            if (!originalParent.value.contains(modalContainer.value)) {
            originalParent.value.appendChild(modalContainer.value);
            }
        }
    };

    // 强制重置Bootstrap Modal状态
    const resetModalState = () => {
        if (modalContainer.value) {
            // 移除Bootstrap的类
            modalContainer.value.classList.remove('show', 'fade');
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
        }
    };

    const emits = defineEmits(['onConfirm', 'onClose', 'onCancel', 'onHidden']);
  
    const modalShow = ref(false);
    const isShowing = ref(false); // 防止重复显示的标志
    const isHiding = ref(false); // 防止隐藏过程中的冲突
    const modalContainer = ref<HTMLElement>(null as any);
    let modal: bootstrap.Modal | null = null;

    // 初始化modal
    function getModal() {
        if(modal) return modal;
        if(!modalContainer.value) return null;
        
        // 使用更可靠的事件处理方式
        const handleModalHide = (e: any) => {
            // 确保事件源是当前modal元素，并且不是在隐藏过程中
            if (e.target === modalContainer.value && !isHiding.value) {
                console.log(`Modal ${modalId} hidden event triggered`);
                ModalHide();
            }
        };
        
        const handleModalShow = (e: any) => {
            if (e.target === modalContainer.value) {
                console.log(`Modal ${modalId} show event triggered`);
                ModalShow();
            }
        };

        // 使用Bootstrap Modal的实例方法来监听事件，而不是DOM事件
        const m = new bootstrap.Modal(modalContainer.value, {
            backdrop: false,
        });

        // 直接绑定到Bootstrap Modal实例
        modalContainer.value.addEventListener('hidden.bs.modal', handleModalHide);
        modalContainer.value.addEventListener('show.bs.modal', handleModalShow);
        
        // 存储事件处理函数以便卸载时移除
        (modalContainer.value as any).handleModalHide = handleModalHide;
        (modalContainer.value as any).handleModalShow = handleModalShow;
        
        return m;
    }

    function ModalShow(){
        console.log(`Modal ${modalId} shown function called`);
        if (props.teleport) {
            teleportModal(); // 启用传送时才执行
        }
        modalShow.value = true;
        isShowing.value = true;
        isHiding.value = false;
    }
    
    function ModalHide(){
        console.log(`Modal ${modalId} hidden function called`);
        modalShow.value = false;
        isShowing.value = false;
        isHiding.value = false;
        emits('onHidden');
    }

    function show() {
        // 防止重复显示
        if (isShowing.value && !isHiding.value) {
            console.log('Modal already showing, skipping');
            return Promise.resolve();
        }
        
        console.log(`Attempting to show modal ${modalId}`);
        
        // 强制重置状态
        resetModalState();
        
        const modalInstance = getModal();
        if (modalInstance) {
            // 重置状态
            isHiding.value = false;
            
            return new Promise<void>((resolve) => {
                // 使用双重nextTick确保DOM完全更新
                nextTick(() => {
                    nextTick(() => {
                        modalInstance.show();
                        resolve();
                    });
                });
            });
        }
        return Promise.resolve();
    }

    function hide() {
        if (isHiding.value) {
            console.log('Modal already hiding, skipping');
            return Promise.resolve();
        }
        
        console.log(`Attempting to hide modal ${modalId}`);
        const modalInstance = getModal();
        if (modalInstance) {
            isHiding.value = true;
            isShowing.value = false;
            
            return new Promise<void>((resolve) => {
                // 监听实际隐藏完成
                const checkHidden = () => {
                    if (!modalContainer.value?.classList.contains('show')) {
                        resolve();
                    } else {
                        setTimeout(checkHidden, 50);
                    }
                };
                
                modalInstance.hide();
                setTimeout(checkHidden, 100); // 给一些时间开始隐藏动画
            });
        }
        return Promise.resolve();
    }

    function confirm() {
        emits('onConfirm');
        dynamicOptions.value?.onConfirm?.();
    }

    function cancel() {
        hide();
        emits('onCancel');
        dynamicOptions.value?.onCancel?.();
    }

    watch(()=>props.visible, (visible) => {
        if(modalShow.value === visible) return;
        if(visible) {
            show();
        }
        else {
            hide();
        }
    });

    onMounted(()=>{
        modal = getModal();
    });
    
    onUnmounted(()=>{
        if (modalContainer.value) {
            // 移除对应的事件监听器
            modalContainer.value.removeEventListener('hidden.bs.modal', 
                (modalContainer.value as any).handleModalHide);
            modalContainer.value.removeEventListener('show.bs.modal', 
                (modalContainer.value as any).handleModalShow);
        }
        // 销毁modal实例
        if (modal) {
            modal.dispose();
        }
        restoreModal();
    });
  
    // 暴露方法供全局调用
    defineExpose({ 
        show, 
        open: show,
        hide, 
        close: hide,
        modalId,
        // 动态属性设置方法
        setTitle: (title: string) => dynamicTitle.value = title,
        setContent: (content: string) => dynamicContent.value = content,
        setType: (type: 'success' | 'error' | 'warning' | 'info') => dynamicType.value = type,
        setConfirmText: (text: string) => dynamicConfirmText.value = text,
        setCancelText: (text: string) => dynamicCancelText.value = text,
        setShowCancel: (show: boolean) => dynamicShowCancel.value = show,
        // 批量设置方法
        setOptions: (options: any) => {
            if (options.title) dynamicTitle.value = options.title;
            if (options.content) dynamicContent.value = options.content;
            if (options.type) dynamicType.value = options.type;
            if (options.confirmText) dynamicConfirmText.value = options.confirmText;
            if (options.cancelText) dynamicCancelText.value = options.cancelText;
            if (options.showCancel !== undefined) dynamicShowCancel.value = options.showCancel;
            if (options.details !== undefined) dynamicErrorDetails.value = options.details;
            dynamicOptions.value = options;
        }
    });
</script>

<style scoped>
.modal-dialog {
    z-index: var(--bs-modal-zindex);
    max-width:none !important;
}

.modal-success .modal-header {
  background-color: var(--bs-success);
  color: white;
}

.modal-error .modal-header {
  background-color: var(--bs-danger);
  color: white;
}

.modal-warning .modal-header {
  background-color: var(--bs-warning);
  color: var(--bs-dark);
}

.modal-info .modal-header {
  background-color: var(--bs-info);
  color: white;
}

.modal-body {
  min-height: 80px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.error-details {
    width: 100%;
    margin-top: 1rem;
}

.error-content {
    background-color: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 0.375rem;
    padding: 1rem;
    margin: 0;
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.875rem;
    line-height: 1.5;
}

.error-details-toggle {
    width: 100%;
}

.error-details-content {
    background-color: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 0.375rem;
    padding: 1rem;
    margin-top: 0.5rem;
}

.error-json {
    background-color: #212529;
    color: #f8f9fa;
    border-radius: 0.25rem;
    padding: 0.75rem;
    font-size: 0.8rem;
    line-height: 1.4;
    max-height: 300px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
}

.error-meta {
    border-bottom: 1px solid #dee2e6;
    padding-bottom: 0.5rem;
    margin-bottom: 0.5rem;
}

.modal-body .fs-1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

/* 响应式调整 */
@media (max-width: 576px) {
    .error-content,
    .error-json {
        font-size: 0.75rem;
        max-height: 150px;
    }
}
</style>
