<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { NModal, NSpin, NEmpty, NTree, NButton, NSpace, NInput, NForm, NFormItem } from 'naive-ui';
import { $t } from '@/locales';
import { fetchBatchUpdateServerVersion } from '@/service/api';
import type { TreeOption } from 'naive-ui';
import { useServerStore } from '@/store/modules/server';
import { useNaiveForm } from '@/hooks/common/form';
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';

defineOptions({
  name: 'ModifyVersionModal'
});

interface Props {
  visible: boolean;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'update:visible', visible: boolean): void;
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

// 类型定义
interface UpdateItem {
  section: string;
  key: string;
  value: string;
}

interface ConfigData {
  configmap_name: string;
  config_key: string;
  updates: UpdateItem[];
}

interface VersionForm {
  configData: string;
}

// Store 和 Form
const { formRef } = useNaiveForm();
const serverStore = useServerStore();

// 状态管理
const serverLoading = ref(false);
const error = ref<string>('');
const selectedServerIds = ref<string[]>([]);
const versionForm = ref<VersionForm>({
  configData: ''
});

// 计算属性
const treeData = computed<TreeOption[]>(() => {
  if (!serverStore.regionList?.length) return [];
  return serverStore.regionList.map(region => ({
    label: region.regionName,
    key: `region_${region.id}`,
    isLeaf: false,
    checkable: false,
    children: (region.children || []).map(server => ({
      label: server.serverName,
      key: String(server.serverId),
      isLeaf: true
    }))
  }));
});

const allServerIds = computed<string[]>(() => {
  const ids: string[] = [];
  serverStore.regionList.forEach(region => {
    region.children?.forEach(server => {
      ids.push(String(server.serverId));
    });
  });
  return ids;
});

// 监听器
watch(() => props.visible, async (newValue) => {
  if (newValue) {
    await loadServerData();
    resetState();
  }
});

// 数据加载
async function loadServerData() {
  serverLoading.value = true;
  error.value = '';
  try {
    if (!serverStore.regionList?.length) {
      await serverStore.fetchServerList();
    }
  } catch (err) {
    console.error('获取服务器数据失败:', err);
    error.value = '获取服务器数据失败';
  } finally {
    serverLoading.value = false;
  }
}

// 服务器选择处理
function handleTreeCheck(keys: Array<string | number>) {
  selectedServerIds.value = keys
    .filter(key => !String(key).startsWith('region_'))
    .map(String);
}

function selectAll() {
  selectedServerIds.value = [...allServerIds.value];
}

function clearAll() {
  selectedServerIds.value = [];
}

// 状态重置
function resetState() {
  error.value = '';
  selectedServerIds.value = [];
  versionForm.value = {
    configData: ''
  };
}

// 配置验证
function validateConfigData(configData: unknown): configData is ConfigData {
  if (!configData || typeof configData !== 'object' || Array.isArray(configData)) {
    window.$message?.error('配置必须是 JSON 对象格式！');
    return false;
  }

  const config = configData as Record<string, unknown>;

  if (!config.configmap_name || typeof config.configmap_name !== 'string') {
    window.$message?.error('配置中缺少 configmap_name 字段或格式不正确');
    return false;
  }

  if (!config.config_key || typeof config.config_key !== 'string') {
    window.$message?.error('配置中缺少 config_key 字段或格式不正确');
    return false;
  }

  if (!Array.isArray(config.updates)) {
    window.$message?.error('配置中缺少 updates 字段或格式不正确（必须是数组）');
    return false;
  }

  for (let i = 0; i < config.updates.length; i++) {
    const item = config.updates[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      window.$message?.error(`updates 数组第 ${i + 1} 个元素必须是对象格式`);
      return false;
    }

    const updateItem = item as Record<string, unknown>;
    if (!updateItem.section || typeof updateItem.section !== 'string') {
      window.$message?.error(`updates 数组第 ${i + 1} 个对象缺少 section 字段或格式不正确`);
      return false;
    }

    if (!updateItem.key || typeof updateItem.key !== 'string') {
      window.$message?.error(`updates 数组第 ${i + 1} 个对象缺少 key 字段或格式不正确`);
      return false;
    }

    if (updateItem.value === undefined || updateItem.value === null) {
      window.$message?.error(`updates 数组第 ${i + 1} 个对象缺少 value 字段`);
      return false;
    }

    // 确保 value 是字符串类型
    if (typeof updateItem.value !== 'string' && typeof updateItem.value !== 'number') {
      window.$message?.error(`updates 数组第 ${i + 1} 个对象的 value 字段必须是字符串或数字`);
      return false;
    }
  }

  return true;
}

function parseConfigData(configText: string): ConfigData | null {
  try {
    const configData = JSON.parse(configText);
    if (validateConfigData(configData)) {
      return configData;
    }
    return null;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'JSON 解析失败';
    window.$message?.error(`JSON 格式错误：${errorMsg}\n请确保输入的是有效的 JSON 格式`);
    return null;
  }
}

// 表单提交
async function handleSubmit() {
  if (selectedServerIds.value.length === 0) {
    window.$message?.warning($t('common.pleaseSelectData'));
    return;
  }

  const configText = versionForm.value.configData?.trim();
  if (!configText) {
    window.$message?.warning('请填写配置 JSON');
    return;
  }

  const configData = parseConfigData(configText);
  if (!configData) {
    return;
  }

  try {
    // 确保 updates 中的 value 都是字符串类型
    const normalizedConfig: ConfigData = {
      ...configData,
      updates: configData.updates.map(item => ({
        ...item,
        value: String(item.value)
      }))
    };

    const submitData = {
      serverIds: selectedServerIds.value.map(id => String(id)),
      ...normalizedConfig
    };

    const response = await fetchBatchUpdateServerVersion(submitData);
    if (!handleApiResponseError(response, $t('common.modifyVersion'))) {
      window.$message?.success($t('common.modifySuccess'));
      emit('update:visible', false);
      emit('submitted');
    }
  } catch (err) {
    handleApiCatchError(err, $t('common.modifyVersion'));
  }
}

// 模态框控制
function handleUpdateVisible(visible: boolean) {
  emit('update:visible', visible);
}
</script>

<template>
  <NModal
    :show="visible"
    preset="card"
    :title="$t('common.modifyVersion')"
    :bordered="false"
    style="width: 900px; max-width: 90vw;"
    @update:show="handleUpdateVisible"
  >
    <div v-if="serverLoading" class="flex justify-center items-center py-12">
      <NSpin size="large" />
      <span class="ml-4 text-lg">加载中...</span>
    </div>

    <div v-else-if="error" class="text-center py-12">
      <div class="mb-4" style="color: var(--n-error-color);">
        <icon-mdi-alert-circle class="w-16 h-16 mx-auto" />
      </div>
      <p class="text-lg" style="color: var(--n-error-color);">{{ error }}</p>
    </div>

    <div v-else class="modal-content-wrapper">
      <div v-if="treeData.length > 0" class="transfer-layout">
        <!-- 左侧：可选服务器树 -->
        <div class="transfer-panel">
          <div class="panel-header">
            <span class="panel-title">共 {{ serverStore.serverList.length }} 项</span>
            <NButton text size="small" @click="selectAll">全选</NButton>
          </div>
          <div class="panel-body">
            <NTree
              :data="treeData"
              :checked-keys="selectedServerIds"
              checkable
              cascade
              expand-on-click
              @update:checked-keys="handleTreeCheck"
            />
          </div>
        </div>

        <!-- 右侧：版本号配置 -->
        <div class="transfer-panel">
          <div class="panel-header">
            <span class="panel-title">版本号配置</span>
          </div>
          <div class="panel-body">
            <NForm ref="formRef" :model="versionForm" label-placement="top">
              <NFormItem label="版本配置 JSON">
                <NInput
                  v-model:value="versionForm.configData"
                  type="textarea"
                  placeholder='请输入完整的配置 JSON（serverIds 将自动添加）&#10;示例：&#10;{&#10;  "configmap_name": "group-cfg-ini",&#10;  "config_key": "group_cfg.ini",&#10;  "updates": [&#10;    {&#10;      "section": "client_version",&#10;      "key": "app_major_version_min",&#10;      "value": "1"&#10;    },&#10;    {&#10;      "section": "client_version",&#10;      "key": "app_minor_version_min",&#10;      "value": "1"&#10;    }&#10;  ]&#10;}'
                  :autosize="{ minRows: 12, maxRows: 16 }"
                  clearable
                />
              </NFormItem>
            </NForm>
          </div>
        </div>
      </div>
      <NEmpty v-else description="暂无服务器数据" />
    </div>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="handleUpdateVisible(false)">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
.modal-content-wrapper {
  min-height: 500px;
}

.transfer-layout {
  display: flex;
  gap: 1rem;
  height: 500px;
}

.transfer-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--n-border-color);
  border-radius: 0.5rem;
  overflow: hidden;
}

.transfer-panel:first-child {
  flex: 0 0 35%;
}

.transfer-panel:last-child {
  flex: 1;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--n-divider-color);
}

.panel-title {
  font-size: 0.875rem;
  font-weight: 500;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
}
</style>
