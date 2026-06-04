<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from "vue";
import { useThemeStore } from '@/store/modules/theme';
import wangEditor from "wangeditor";

defineOptions({
  name: "WangEditor",
});

interface Props {
  /** 编辑器内容 */
  modelValue?: string;
  /** 占位符文本 */
  placeholder?: string;
  /** 编辑器高度 */
  height?: string | number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 工具栏配置 */
  menus?: string[];
  /** 字体配置 */
  fontNames?: string[];
  /** 是否显示工具栏 */
  showToolbar?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  placeholder: "请输入内容...",
  height: "300px",
  disabled: false,
  menus: () => [
    'head',
    'bold',
    'fontSize',
    'fontName',
    'italic',
    'underline',
    'strikeThrough',
    'indent',
    'lineHeight',
    'foreColor',
    'backColor',
    'link',
    'list',
    'todo',
    'justify',
    'quote',
    'emoticon',
    'image',
    'video',
    'table',
    'code',
    'splitLine',
    'undo',
    'redo'
  ],
  fontNames: () => [
    '黑体',
    '仿宋',
    '楷体',
    '标楷体',
    '华文仿宋',
    '华文楷体',
    '宋体',
    '微软雅黑',
    'Arial',
    'Tahoma',
    'Verdana',
    'Times New Roman',
    'Courier New'
  ],
  showToolbar: true,
});

interface Emits {
  (e: "update:modelValue", value: string): void;
  (e: "change", value: string): void;
  (e: "focus"): void;
  (e: "blur"): void;
}

const emit = defineEmits<Emits>();

// 主题store
const themeStore = useThemeStore();

// 编辑器实例和DOM引用
let editor: any = null;
const editorRef = ref<HTMLElement>();

// 编辑器高度样式
const editorHeight = computed(() => {
  if (typeof props.height === 'number') {
    return `${props.height}px`;
  }
  return props.height;
});

// 初始化富文本编辑器
function initEditor() {
  if (!editorRef.value) return;

  editor = new wangEditor(editorRef.value);

  // 基础配置
  editor.config.placeholder = props.placeholder;
  editor.config.zIndex = 1000;
  editor.config.lang = 'zh-CN';
  editor.config.showMenuTooltips = true;

  // 菜单配置
  editor.config.menus = props.menus;

  // 字体配置
  editor.config.fontNames = props.fontNames;

  // 禁用配置
  if (props.disabled) {
    editor.config.readOnly = true;
  }

  // 内容变化回调
  editor.config.onchange = (html: string) => {
    emit("update:modelValue", html);
    emit("change", html);
  };

  // 焦点事件
  editor.config.onfocus = () => {
    emit("focus");
  };

  editor.config.onblur = () => {
    emit("blur");
  };

  // 创建编辑器
  editor.create();

  // 设置初始内容
  if (props.modelValue) {
    editor.txt.html(props.modelValue);
  }

  // 立即应用主题样式，避免初始化时的闪烁
  setTimeout(() => {
    applyThemeStyles();
  }, 0);

  // 添加工具栏提示
  setTimeout(() => {
    addToolbarTooltips();
  }, 100);
}

// 应用主题样式
function applyThemeStyles() {
  if (!editorRef.value || !editor) return;

  const isDark = themeStore.darkMode;
  const editorContainer = editorRef.value;

  // 使用类名切换，而不是直接设置样式
  if (isDark) {
    editorContainer.classList.add('wang-editor-dark');
    editorContainer.classList.remove('wang-editor-light');
  } else {
    editorContainer.classList.add('wang-editor-light');
    editorContainer.classList.remove('wang-editor-dark');
  }

  // 更新工具栏按钮样式
  updateToolbarButtonStyles(isDark);
}

// 更新工具栏按钮样式 - 现在主要由CSS处理，这里只做必要的动态调整
function updateToolbarButtonStyles(isDark: boolean) {
  // CSS已经处理了大部分样式，这里可以添加额外的动态样式调整
  // 目前暂时保留空函数，以备将来需要
}

// 添加工具栏按钮提示
function addToolbarTooltips() {
  if (!editorRef.value) return;

  const toolbarContainer = editorRef.value.querySelector('.w-e-toolbar');
  if (!toolbarContainer) return;

  // 工具栏按钮提示配置
  const tooltips: Record<string, string> = {
    'w-e-menu-head': '标题',
    'w-e-menu-bold': '加粗 (Ctrl+B)',
    'w-e-menu-fontSize': '字号',
    'w-e-menu-fontName': '字体',
    'w-e-menu-italic': '斜体 (Ctrl+I)',
    'w-e-menu-underline': '下划线 (Ctrl+U)',
    'w-e-menu-strikeThrough': '删除线',
    'w-e-menu-indent': '缩进',
    'w-e-menu-lineHeight': '行高',
    'w-e-menu-foreColor': '文字颜色',
    'w-e-menu-backColor': '背景色',
    'w-e-menu-link': '插入链接',
    'w-e-menu-list': '列表',
    'w-e-menu-todo': '待办事项',
    'w-e-menu-justify': '对齐',
    'w-e-menu-quote': '引用',
    'w-e-menu-emoticon': '表情',
    'w-e-menu-image': '插入图片',
    'w-e-menu-video': '插入视频',
    'w-e-menu-table': '插入表格',
    'w-e-menu-code': '代码',
    'w-e-menu-splitLine': '分割线',
    'w-e-menu-undo': '撤销 (Ctrl+Z)',
    'w-e-menu-redo': '重做 (Ctrl+Y)'
  };

  // 为每个工具栏按钮添加 title 属性
  Object.keys(tooltips).forEach(className => {
    const elements = toolbarContainer.querySelectorAll(`.${className}`);
    elements.forEach((element) => {
      const elementHtml = element as HTMLElement;
      elementHtml.title = tooltips[className];
    });
  });
}

// 销毁编辑器
function destroyEditor() {
  if (editor) {
    editor.destroy();
    editor = null;
  }
}

// 获取编辑器内容
function getHtml(): string {
  return editor ? editor.txt.html() : '';
}

// 获取纯文本内容
function getText(): string {
  return editor ? editor.txt.text() : '';
}

// 设置编辑器内容
function setHtml(html: string) {
  if (editor) {
    editor.txt.html(html);
  }
}

// 清空编辑器内容
function clear() {
  if (editor) {
    editor.txt.clear();
  }
}

// 监听外部内容变化
watch(() => props.modelValue, (newValue) => {
  if (editor && newValue !== getHtml()) {
    setHtml(newValue || '');
  }
});

// 监听禁用状态变化
watch(() => props.disabled, (disabled) => {
  if (editor) {
    editor.config.readOnly = disabled;
  }
});

// 监听主题变化
watch(() => themeStore.darkMode, () => {
  // 立即应用样式，避免闪烁
  applyThemeStyles();
}, { immediate: true });

onMounted(() => {
  // 立即设置初始主题类名，避免闪烁
  if (editorRef.value) {
    const isDark = themeStore.darkMode;
    if (isDark) {
      editorRef.value.classList.add('wang-editor-dark');
    } else {
      editorRef.value.classList.add('wang-editor-light');
    }
  }

  setTimeout(() => {
    initEditor();
  }, 100);
});

onBeforeUnmount(() => {
  destroyEditor();
});

// 暴露方法给父组件
defineExpose({
  getHtml,
  getText,
  setHtml,
  clear,
  editor: () => editor
});
</script>

<template>
  <div class="wang-editor-container">
    <div
      ref="editorRef"
      class="wang-editor bg-container"
      :style="{ height: editorHeight }"
    ></div>
  </div>
</template>

<style scoped>
.wang-editor-container {
  @apply w-full;
}

.wang-editor {
  @apply transition-all duration-300;
}

/* 明亮模式样式 */
.wang-editor.wang-editor-light :deep(.w-e-toolbar) {
  background-color: rgb(255, 255, 255) !important;
  border-color: rgb(229, 231, 235) !important;
  color: rgb(31, 31, 31) !important;
  transition: all 0.3s ease;
}

.wang-editor.wang-editor-light :deep(.w-e-text-container) {
  background-color: rgb(255, 255, 255) !important;
  border-color: rgb(229, 231, 235) !important;
  transition: all 0.3s ease;
}

.wang-editor.wang-editor-light :deep(.w-e-text) {
  background-color: rgb(255, 255, 255) !important;
  color: rgb(31, 31, 31) !important;
  transition: all 0.3s ease;
}

/* 暗黑模式样式 */
.wang-editor.wang-editor-dark :deep(.w-e-toolbar) {
  background-color: rgb(28, 28, 28) !important;
  border-color: rgb(64, 64, 64) !important;
  color: rgb(224, 224, 224) !important;
  transition: all 0.3s ease;
}

.wang-editor.wang-editor-dark :deep(.w-e-text-container) {
  background-color: rgb(28, 28, 28) !important;
  border-color: rgb(64, 64, 64) !important;
  transition: all 0.3s ease;
}

.wang-editor.wang-editor-dark :deep(.w-e-text) {
  background-color: rgb(28, 28, 28) !important;
  color: rgb(224, 224, 224) !important;
  transition: all 0.3s ease;
}


/* 确保初始状态也有正确的背景色 */
.wang-editor :deep(.w-e-toolbar),
.wang-editor :deep(.w-e-text-container),
.wang-editor :deep(.w-e-text) {
  transition: all 0.3s ease;
}
</style>
