<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { NModal, NSpin, NEmpty, NInput, NButton } from 'naive-ui';
import { fetchServerConfigMaps, fetchServerConfigMapContent, fetchUpdateServerConfigMapContent } from '@/service/api';

defineOptions({
  name: 'ServerConfigModal'
});

interface Props {
  visible: boolean;
  configData?: {
    serverId: number | string;
    serverName?: string;
  } | null;
}

const props = withDefaults(defineProps<Props>(), {
  configData: null
});

interface Emits {
  (e: 'update:visible', visible: boolean): void;
}

const emit = defineEmits<Emits>();

const configMapList = ref<string[]>([]);
const error = ref<string>('');
const searchKeyword = ref<string>('');
const selectedConfigMap = ref<string | null>(null);

const configMapContent = ref<string>('');
const loadingContent = ref(false);
const contentError = ref<string>('');
const isEditing = ref(false);
const editedContent = ref<string>('');
const actualConfigFileName = ref<string>('');

const filteredConfigMaps = computed(() => {
  if (!searchKeyword.value) return configMapList.value;
  return configMapList.value.filter(item =>
    item.toLowerCase().includes(searchKeyword.value.toLowerCase())
  );
});

const hasUnsavedChanges = computed(() => {
  return isEditing.value && editedContent.value !== configMapContent.value;
});

watch(
  () => props.visible,
  (newValue) => {
    if (newValue && props.configData?.serverId) {
      loadConfigMaps();
    } else {
      resetState();
    }
  }
);

async function loadConfigMaps() {
  if (!props.configData?.serverId) {
    error.value = '未找到服务器信息';
    return;
  }

  error.value = '';
  configMapList.value = [];
  selectedConfigMap.value = null;

  try {
    const response = await fetchServerConfigMaps(Number(props.configData.serverId));
    const responseData = response?.data || response?.response?.data || response;

    if (Array.isArray(responseData)) {
      configMapList.value = responseData;
    } else if (responseData?.data && Array.isArray(responseData.data)) {
      configMapList.value = responseData.data;
    } else {
      configMapList.value = [];
    }

    if (configMapList.value.length === 0) {
      error.value = '暂无ConfigMap数据';
    }
  } catch (err) {
    console.error('获取ConfigMap列表失败:', err);
    error.value = '获取ConfigMap列表失败';
  }
}

async function loadConfigMapContent(configMapName: string) {
  if (!props.configData?.serverId || !configMapName) {
    return;
  }

  loadingContent.value = true;
  contentError.value = '';
  configMapContent.value = '';

  try {
    const response = await fetchServerConfigMapContent({
      serverId: props.configData.serverId,
      configmapName: configMapName
    });

    const responseData = response?.data || response?.response?.data || response;

    if (responseData?.code === 0 || responseData?.code === 200) {
      const data = responseData.data;

      // 数据是对象，key 是 ConfigMap 名称，value 是内容
      if (data && typeof data === 'object') {
        let content = data[configMapName];
        let fileName = configMapName;

        // 如果直接匹配不到，使用第一个可用的 key
        if (!content) {
          const keys = Object.keys(data);
          if (keys.length > 0) {
            fileName = keys[0];
            content = data[keys[0]];
          }
        }

        if (content) {
          // 保存实际的配置文件名
          actualConfigFileName.value = fileName;

          // 格式化内容
          if (typeof content === 'string') {
            configMapContent.value = content;
          } else {
            configMapContent.value = JSON.stringify(content, null, 2);
          }
        } else {
          contentError.value = '未找到该 ConfigMap 的内容';
        }
      } else if (typeof data === 'string') {
        configMapContent.value = data;
        actualConfigFileName.value = configMapName;
      } else {
        contentError.value = '数据格式不正确';
      }
    } else {
      contentError.value = responseData?.msg || '获取ConfigMap内容失败';
    }
  } catch (err) {
    console.error('获取ConfigMap内容失败:', err);
    contentError.value = '获取ConfigMap内容失败';
  } finally {
    loadingContent.value = false;
  }
}

async function handleSelectConfigMap(configMap: string) {
  // 如果有未保存的修改，提示用户
  if (hasUnsavedChanges.value) {
    const confirmed = await new Promise<boolean>((resolve) => {
      window.$dialog?.info({
        title: '确认切换',
        content: '当前有未保存的编辑内容，切换配置将丢失修改。是否继续？',
        positiveText: '继续切换',
        negativeText: '取消',
        onPositiveClick: () => resolve(true),
        onNegativeClick: () => resolve(false),
        onClose: () => resolve(false)
      });
    });

    if (!confirmed) {
      return;
    }
  }

  // 切换时重置编辑状态
  isEditing.value = false;
  editedContent.value = '';

  selectedConfigMap.value = configMap;
  await loadConfigMapContent(configMap);
}

function handleEdit() {
  isEditing.value = true;
  editedContent.value = configMapContent.value;
}

function handleCancelEdit() {
  isEditing.value = false;
  editedContent.value = '';
}

async function handleSaveEdit() {
  if (!props.configData?.serverId || !selectedConfigMap.value || !actualConfigFileName.value) {
    window.$message?.error('缺少必要参数');
    return;
  }

  loadingContent.value = true;

  try {
    await fetchUpdateServerConfigMapContent({
      serverId: props.configData.serverId,
      configmap_name: selectedConfigMap.value,
      data: {
        [actualConfigFileName.value]: editedContent.value
      }
    });

    // 保存成功后更新本地内容
    configMapContent.value = editedContent.value;
    isEditing.value = false;
    editedContent.value = '';
    window.$message?.success('配置保存成功');
  } catch (err) {
    console.error('保存ConfigMap失败:', err);
    window.$message?.error('保存配置失败，请重试');
  } finally {
    loadingContent.value = false;
  }
}

function resetState() {
  configMapList.value = [];
  selectedConfigMap.value = null;
  searchKeyword.value = '';
  error.value = '';
  configMapContent.value = '';
  contentError.value = '';
  actualConfigFileName.value = '';
  isEditing.value = false;
  editedContent.value = '';
}

async function handleUpdateVisible(visible: boolean) {
  if (!visible && hasUnsavedChanges.value) {
    const confirmed = await new Promise<boolean>((resolve) => {
      window.$dialog?.info({
        title: '确认关闭',
        content: '当前有未保存的编辑内容，关闭弹窗将丢失修改。是否继续？',
        positiveText: '继续关闭',
        negativeText: '取消',
        onPositiveClick: () => resolve(true),
        onNegativeClick: () => resolve(false),
        onClose: () => resolve(false)
      });
    });

    if (!confirmed) {
      return;
    }
  }

  emit('update:visible', visible);
}
</script>

<template>
  <NModal
    :show="visible"
    preset="card"
    :title="`服务器配置 - ${configData?.serverName || ''}`"
    :bordered="false"
    :segmented="false"
    style="width: 1400px; max-width: 90vw;"
    @update:show="handleUpdateVisible"
  >
    <!-- 固定大小的布局容器 -->
    <div class="modal-content-wrapper">
      <div class="flex gap-4" style="height: 650px;">
        <!-- 左侧：ConfigMap 列表 -->
        <div class="flex-1 flex flex-col border-r pr-4" style="border-color: var(--n-divider-color);">
          <div class="mb-4">
            <h3 class="text-base font-semibold mb-3" style="color: var(--n-text-color);">
              ConfigMap 配置列表
            </h3>
            <NInput
              v-model:value="searchKeyword"
              placeholder="搜索 ConfigMap..."
              clearable
              class="mb-3"
            >
              <template #prefix>
                <icon-mdi-magnify class="text-lg" />
              </template>
            </NInput>
            <p class="text-xs mb-2" style="color: var(--n-text-color-2);">
              共 {{ filteredConfigMaps.length }} 个配置项
            </p>
          </div>

          <!-- 错误状态 -->
          <div v-if="error" class="flex-1 flex flex-col justify-center items-center">
            <icon-mdi-alert-circle class="text-4xl mb-2" style="color: var(--n-error-color);" />
            <p style="color: var(--n-error-color);">{{ error }}</p>
          </div>

          <!-- 空状态 -->
          <div v-else-if="configMapList.length === 0" class="flex-1 flex flex-col justify-center items-center">
            <NEmpty description="暂无 ConfigMap 配置" />
          </div>

          <!-- 列表 -->
          <div v-else class="configmap-list flex-1 overflow-y-auto">
            <div
              v-for="(configMap, index) in filteredConfigMaps"
              :key="index"
              class="configmap-item flex items-center justify-between p-4 mb-3 rounded-lg border hover:shadow-md transition-all cursor-pointer"
              :style="{
                borderColor: selectedConfigMap === configMap ? 'var(--n-primary-color)' : 'var(--n-border-color)',
                backgroundColor: selectedConfigMap === configMap ? 'var(--n-primary-color-pressed)' : 'transparent'
              }"
              :class="{ 'shadow-md': selectedConfigMap === configMap }"
              @click="handleSelectConfigMap(configMap)"
            >
              <div class="flex items-center space-x-3 flex-1 min-w-0">
                <div class="flex-shrink-0">
                  <icon-mdi-file-document-outline class="text-2xl" style="color: var(--n-primary-color);" />
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-medium text-sm truncate" style="color: var(--n-text-color);">
                    {{ configMap }}
                  </h4>
                </div>
              </div>
              <div class="flex-shrink-0 ml-3">
                <icon-mdi-check-circle
                  v-if="selectedConfigMap === configMap"
                  class="text-xl"
                  style="color: var(--n-primary-color);"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：ConfigMap 详情内容 -->
        <div class="flex-1 flex flex-col pl-4">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h3 class="text-base font-semibold mb-1" style="color: var(--n-text-color);">
                {{ selectedConfigMap ? `配置内容 - ${selectedConfigMap}` : '配置内容' }}
              </h3>
              <p class="text-xs" style="color: var(--n-text-color-2);">
                {{ selectedConfigMap ? '点击左侧列表查看其他配置' : '请从左侧选择一个 ConfigMap 查看详情' }}
              </p>
            </div>
            <!-- 编辑按钮 -->
            <div v-if="configMapContent && !loadingContent && !contentError" class="flex gap-2 items-center">
              <NButton v-if="!isEditing" size="small" type="primary" @click="handleEdit">
                <template #icon>
                  <icon-mdi-pencil />
                </template>
                编辑
              </NButton>
              <template v-else>
                <span v-if="hasUnsavedChanges" class="text-xs mr-2" style="color: var(--n-warning-color);">
                  <icon-mdi-alert-circle-outline class="inline-block mr-1" />
                  有未保存的修改
                </span>
                <NButton size="small" @click="handleCancelEdit">取消</NButton>
                <NButton size="small" type="primary" :disabled="!hasUnsavedChanges" @click="handleSaveEdit">
                  保存
                </NButton>
              </template>
            </div>
          </div>

          <div class="content-area flex-1 overflow-y-auto border rounded-lg" style="border-color: var(--n-border-color); background-color: var(--n-color);">
            <!-- 加载中 -->
            <div v-if="loadingContent" class="flex justify-center items-center h-full">
              <NSpin size="medium" />
              <span class="ml-3" style="color: var(--n-text-color-2);">加载配置内容...</span>
            </div>

            <!-- 错误状态 -->
            <div v-else-if="contentError" class="flex flex-col justify-center items-center h-full">
              <icon-mdi-alert-circle class="text-4xl mb-2" style="color: var(--n-error-color);" />
              <p style="color: var(--n-error-color);">{{ contentError }}</p>
            </div>

            <!-- 编辑模式 -->
            <div v-else-if="isEditing" class="h-full p-4">
              <textarea
                v-model="editedContent"
                class="config-textarea"
                placeholder="请输入配置内容..."
              />
            </div>

            <!-- 显示内容 -->
            <div v-else-if="configMapContent" class="h-full p-4">
              <pre class="config-content">{{ configMapContent }}</pre>
            </div>

            <!-- 空状态 -->
            <div v-else class="flex flex-col justify-center items-center h-full">
              <icon-mdi-file-document-outline class="text-6xl mb-3" style="color: var(--n-text-color-3);" />
              <p style="color: var(--n-text-color-2);">请从左侧选择一个 ConfigMap</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </NModal>
</template>

<style scoped>
.modal-content-wrapper {
  min-height: 400px;
}

.configmap-list {
  padding-right: 8px;
}

.configmap-item {
  transition: all 0.2s ease;
}

.configmap-item:hover {
  transform: translateY(-2px);
}

.config-content {
  margin: 0;
  padding: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: var(--n-text-color);
}

.config-textarea {
  width: 100%;
  height: 100%;
  padding: 12px;
  border: none;
  outline: none;
  resize: none;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  background-color: transparent;
  color: var(--n-text-color);
}

.config-textarea:focus {
  outline: 2px solid var(--n-primary-color);
  outline-offset: -2px;
  border-radius: 4px;
}
</style>
