<template>
    <div class="modal fade" :id="modalId" ref="modalContainer" tabindex="-1" aria-labelledby="modalLabel">
        <div class="modal-dialog modal-dialog-centered" :class="{'modal-fullscreen': isFullScreen, 'modal-dialog-auto': isAutoSize}" :style="dynamicStyle">
            <div class="modal-content" :class="contentClass" style=" margin: auto;">
                <div class="modal-header" :class="headerClass">
                    <h5 class="modal-title d-flex align-items-center" id="modalLabel">
                        <i v-if="typeIcon" :class="typeIcon" class="me-2"></i>
                        {{dynamicTitle || props.title}}
                    </h5>
                    <button type="button" class="btn-close" aria-label="Close" @click="cancel">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="modal-body text-wrap" v-if="modalShow">
                    <slot v-if="$slots.default"></slot>
                    <div v-else>
                        <div class="d-flex align-items-center" :class="shouldShowDetails() ? 'mb-2' : 'mb-0'">
                            <i v-if="typeIcon" :class="typeIcon" class="me-3 modal-type-icon"></i>
                            <div class="flex-grow-1 text-wrap">{{dynamicContent}}</div>
                        </div>
                        <div v-if="shouldShowDetails()" class="error-details-toggle mt-2">
                            <button class="btn btn-sm btn-outline-secondary" @click="toggleDetails">
                                {{detailsExpanded ? $t('common.hide') : $t('common.details')}}
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
                            {{dynamicCancelText || props.closeButton.text || $t('common.close')}}
                        </button>
                        <button type="button" 
                                v-if="props.confirmButton.show" 
                                class="btn" 
                                :class="confirmButtonClass"
                                @click="confirm">
                            {{dynamicConfirmText || props.confirmButton.text || $t('common.confirm')}}
                        </button>
                    </template>
                </div>
                <Loading :isLoading="props.isLoading" :message="props.loadingMessage || t('common.processing')"></Loading>
            </div>
        </div>

    </div>
</template>

<script lang="ts" setup>
    import { ref, onMounted, onUnmounted, watch, computed, nextTick, useSlots } from 'vue';
    import { useI18n } from 'vue-i18n';
    import * as bootstrap from 'bootstrap';
    import Loading from '@/components/loading/index.vue';
    
    const { t } = useI18n();

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
                text: '',
                show: false
            }
        },
        confirmButton: {
            type: Object,
            default: {
                text: '',
                show: true
            }
        },
        isLoading: {
            type: Boolean,
            default: false
        },
        loadingMessage: {
            type: String,
            default: ''
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
            default: true // true表示传送到body，也可传具体选择器如"#app"
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
    
    // 无自定义内容（纯文案提示）且非全屏时，弹窗按信息量自适应大小
    const slots = useSlots();
    const isAutoSize = computed(() => !slots.default && !props.isFullScreen);

    const dynamicStyle = computed(() => {        
        return {
            // 自适应模式下宽度完全交给 .modal-dialog-auto 样式处理；
            // 带自定义内容（表单等）的弹窗保持原有宽度行为
            ...(isAutoSize.value ? {} : { width: 'auto', minWidth: '300px' }),
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            zIndex: '1060', // 设置一个比backdrop(1055)更高的z-index
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
            backdrop: 'static',
            keyboard: false,
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
        
        // 延迟一下，确保backdrop已经被添加到DOM中
        setTimeout(() => {
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop && modalContainer.value) {
                // 将backdrop移动到与模态框相同的容器中
                const parentContainer = modalContainer.value.parentElement;
                if (parentContainer) {
                    parentContainer.appendChild(backdrop);
                }
                // 设置backdrop的z-index为1050，比模态框的z-index(1060)低
                backdrop.style.zIndex = '1050';
            }
        }, 100);
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

    /**
     * 强制收起弹窗（兜底）。
     * Bootstrap 的 hide() 依赖自身 _isShown / 过渡回调，在个别宿主环境（VSCode webview）
     * 里可能出现「点了关闭但状态没翻转」的情况，此时直接摘掉 show 类并移除遮罩，
     * 保证关闭按钮一定生效。
     */
    function forceHide() {
        const el = modalContainer.value;
        if (!el) return false;
        const stillVisible = el.classList.contains('show') || getComputedStyle(el).display !== 'none';
        if (!stillVisible) return false;
        el.classList.remove('show', 'fade');
        el.style.display = 'none';
        document.querySelectorAll('.modal-backdrop').forEach((b) => b.remove());
        ModalHide();
        return true;
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
                // 兜底：800ms 仍未隐藏则强制收起，避免「点了关闭没反应」
                setTimeout(() => {
                    if (forceHide()) resolve();
                }, 800);
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
    max-width: none;
}

/* 纯文案提示弹窗：宽高跟随内容，短消息不再撑成大弹窗 */
.modal-dialog.modal-dialog-auto {
    width: fit-content;
    min-width: min(280px, 92vw);
    max-width: min(80vw, 420px);
    margin: auto;
}

/* ---------------- 弹窗自身的紧凑密度 ----------------
 * database.css 的 .modal-header/.modal-body/.modal-footer 面向「网页大屏」，
 * 而桌面端靠 body.platform-desktop 覆盖成紧凑值，webview（VSCode）没有该类，
 * 于是同一套弹窗在 webview 里标题 24px、内边距 32px，显得又空又大。
 * 这里把密度收进组件自身（与 platform-desktop 的取值一致），
 * 两个宿主下观感统一，不再依赖全局样式差异。
 */
.modal-header {
    padding: 0.625rem 0.875rem;
}

.modal-header::before {
    display: none; /* 去掉标题栏顶部 4px 品牌色条 */
}

.modal-title {
    font-size: 0.875rem;
    font-weight: 600;
}

.modal-body {
    padding: 0.875rem;
    display: flex;
    flex-direction: column;
    align-items: stretch;
}

.modal-footer {
    padding: 0.5rem 0.875rem;
    gap: 0.5rem;
}

.modal-footer .btn {
    padding: 0.25rem 0.75rem;
    font-size: 0.8125rem;
}

/* 关闭按钮：不用 .btn-close 的 svg data-uri 背景（webview CSP 下不渲染，
 * 会退化成一个无图标的灰色方块），改用 bootstrap-icons 字形画叉 */
.btn-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background-color: transparent;
    background-image: none;
    box-shadow: none;
    opacity: 0.85;
    font-size: 13px;
    color: inherit;
}

.btn-close:hover,
.btn-close:focus {
    background-color: rgba(128, 128, 128, 0.28);
    opacity: 1;
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

.error-details {
    width: 100%;
    margin-top: 1rem;
}

.error-content {
    background-color: var(--db-bg-soft2);
    border: 1px solid var(--db-gray-medium);
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
    background-color: var(--db-bg-soft2);
    border: 1px solid var(--db-gray-medium);
    border-radius: 0.375rem;
    padding: 1rem;
    margin-top: 0.5rem;
}

.error-json {
    background-color: var(--db-text-body);
    color: var(--db-bg-soft2);
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
    border-bottom: 1px solid var(--db-gray-medium);
    padding-bottom: 0.5rem;
    margin-bottom: 0.5rem;
}

/* 提示类型图标：随内容紧凑展示（不用 Bootstrap 的 fs-1，避免 2.5rem 撑高弹窗） */
.modal-type-icon {
  font-size: 1.25rem;
  line-height: 1;
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
