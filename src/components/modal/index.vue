<template>
    <div class="modal fade" :id="modalId" ref="modalContainer" tabindex="-1" aria-labelledby="modalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered" :class="{'modal-fullscreen': isFullScreen}" :style="style">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="modalLabel">{{props.title}}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body" v-if="modalShow">
                    <slot></slot>
                </div>
                <div class="modal-footer">
                    <slot name="footer">
                        <button type="button" v-if="props.closeButton.show" class="btn btn-secondary" data-bs-dismiss="modal">{{props.closeButton.text}}</button>
                        <button type="button" v-if="props.confirmButton.show" class="btn btn-primary" @click="confirm">{{props.confirmButton.text}}</button>
                    </slot>
                </div>
                <Loading :isLoading="props.isLoading" :message="props.loadingMessage"></Loading>
            </div>
        </div>
    <div class="modal-backdrop fade show" v-if="modalShow"></div>
    </div>
</template>

<script lang="ts" setup>
    import { ref, onMounted, onUnmounted, watch } from 'vue';
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
                show: true
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
    
    const originalParent = ref<Node | null>(null); // 保存原始父节点
    const targetContainer = ref<HTMLElement | null>(null); // 目标容器（传送目的地）

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

    const emits = defineEmits(['onConfirm', 'onClose', 'onCancel', 'hidden']);
  
    const modalShow = ref(false);
    const modalContainer = ref<HTMLElement>(null as any);
    let modal: bootstrap.Modal | null = null;

    // 初始化modal
    function getModal() {
        if(modal) return modal;
        if(!modalContainer.value) return null;
        
        // 在事件处理中检查事件源是否为当前modal
        const handleModalHide = (e: Event) => {
            // 确保事件源是当前modal元素
            if (e.target === modalContainer.value) {
                ModalHide();
            }
        };
        
        const handleModalShow = (e: Event) => {
            if (e.target === modalContainer.value) {
                ModalShow();
            }
        };
        
        modalContainer.value.addEventListener('hidden.bs.modal', handleModalHide);
        modalContainer.value.addEventListener('show.bs.modal', handleModalShow);
        
        // 存储事件处理函数以便卸载时移除
        (modalContainer.value as any).handleModalHide = handleModalHide;
        (modalContainer.value as any).handleModalShow = handleModalShow;
        
        const m = new bootstrap.Modal(modalContainer.value, {
                backdrop: false,
            });
        return m;
    }

    function ModalShow(){
        console.log(`Modal ${modalId} shown`);
        if (props.teleport) {
            teleportModal(); // 启用传送时才执行
        }
        modalShow.value = true;
    }
    
    function ModalHide(){
        console.log(`Modal ${modalId} hidden`);
        modalShow.value = false;
        emits('onClose');
        emits('onCancel');
        emits('hidden');
    }

    function show() {
        const modal = getModal();
        modal?.show();
    }

    function hide() {
        const m = bootstrap.Modal.getInstance(modalContainer.value);
        return m?.hide();
    }

    function confirm() {
        emits('onConfirm');
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
        modalId });
</script>

<style scoped>
.modal-dialog {
    z-index: var(--bs-modal-zindex);
    max-width:none !important;
}
</style>
