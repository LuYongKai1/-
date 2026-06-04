<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { NModal, NSpin, NEmpty, NTree, NButton, NSpace, NInputNumber, NForm, NGrid, NFormItemGi, NRadioGroup, NRadio } from 'naive-ui';
import { $t } from '@/locales';
import { fetchBatchUpdateServerConfig } from '@/service/api';
import type { TreeOption } from 'naive-ui';
import { useServerStore } from '@/store/modules/server';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';

defineOptions({
  name: 'VersionManagementModal'
});

interface Props {
  visible: boolean;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'update:visible', visible: boolean): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();
const serverStore = useServerStore();

const serverLoading = ref(false);
const error = ref<string>('');
const selectedServerIds = ref<string[]>([]);

interface VersionForm {
  app_major_version_min: number | null;
  app_major_version_max: number | null;
  app_minor_version_min: number | null;
  app_minor_version_max: number | null;
  res_version: number | null;
  svn_version: number | null;
  needHotUpdate: boolean;
}

const versionForm = ref<VersionForm>({
  app_major_version_min: null,
  app_major_version_max: null,
  app_minor_version_min: null,
  app_minor_version_max: null,
  res_version: null,
  svn_version: null,
  needHotUpdate: false,
});

const rules = {
  app_major_version_min: [defaultRequiredRule],
  app_major_version_max: [defaultRequiredRule],
  app_minor_version_min: [defaultRequiredRule],
  app_minor_version_max: [defaultRequiredRule],
  res_version: [defaultRequiredRule],
  svn_version: [defaultRequiredRule],
};

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

watch(() => props.visible, async (newValue) => {
  if (newValue) {
    await loadServerData();
    resetState();
  }
});

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

function handleTreeCheck(keys: Array<string | number>) {
  selectedServerIds.value = keys
    .filter(key => !String(key).startsWith('region_'))
    .map(String);
}

function selectAll() {
  const allServerIds: string[] = [];
  serverStore.regionList.forEach(region => {
    region.children?.forEach(server => {
      allServerIds.push(String(server.serverId));
    });
  });
  selectedServerIds.value = allServerIds;
}

function clearAll() {
  selectedServerIds.value = [];
}

function resetState() {
  error.value = '';
  selectedServerIds.value = [];
  versionForm.value = {
    app_major_version_min: null,
    app_major_version_max: null,
    app_minor_version_min: null,
    app_minor_version_max: null,
    res_version: null,
    svn_version: null,
    needHotUpdate: false,
  };
  formRef.value?.restoreValidation();
}

async function handleSubmit() {
  if (selectedServerIds.value.length === 0) {
    window.$message?.warning('请至少选择一个服务器');
    return;
  }

  try {
    await validate();
    const form = versionForm.value;
    const submitData = {
      serverIds: selectedServerIds.value.map(id => Number(id)),
      serverConfig: JSON.stringify({
        app_major_version_min: form.app_major_version_min,
        app_major_version_max: form.app_major_version_max,
        app_minor_version_min: form.app_minor_version_min,
        app_minor_version_max: form.app_minor_version_max,
        res_version: form.res_version,
        svn_version: form.svn_version,
      }),
      needHotUpdate: form.needHotUpdate,
    };

    const response = await fetchBatchUpdateServerConfig(submitData);
    if (!handleApiResponseError(response, '批量更新服务器配置')) {
      window.$message?.success('批量更新服务器配置成功');
      emit('update:visible', false);
    }
  } catch (err) {
    handleApiCatchError(err, '批量更新服务器配置');
  }
}

function handleUpdateVisible(visible: boolean) {
  emit('update:visible', visible);
}
</script>

<template>
  <NModal
    :show="visible"
    preset="card"
    :title="$t('common.versionManagement')"
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
            <NForm ref="formRef" :model="versionForm" :rules="rules" label-placement="left" label-width="120" require-mark-placement="right-hanging">
              <NGrid :cols="2" :x-gap="16" responsive="screen" item-responsive>
                <NFormItemGi span="24 m:12" label="最小主版本号" path="app_major_version_min" required>
                  <NInputNumber v-model:value="versionForm.app_major_version_min" placeholder="请输入最小主版本号" :min="0" style="width: 100%;" clearable />
                </NFormItemGi>
                <NFormItemGi span="24 m:12" label="最大主版本号" path="app_major_version_max" required>
                  <NInputNumber v-model:value="versionForm.app_major_version_max" placeholder="请输入最大主版本号" :min="0" style="width: 100%;" clearable />
                </NFormItemGi>
                <NFormItemGi span="24 m:12" label="最小次版本号" path="app_minor_version_min" required>
                  <NInputNumber v-model:value="versionForm.app_minor_version_min" placeholder="请输入最小次版本号" :min="0" style="width: 100%;" clearable />
                </NFormItemGi>
                <NFormItemGi span="24 m:12" label="最大次版本号" path="app_minor_version_max" required>
                  <NInputNumber v-model:value="versionForm.app_minor_version_max" placeholder="请输入最大次版本号" :min="0" style="width: 100%;" clearable />
                </NFormItemGi>
                <NFormItemGi span="24 m:12" label="资源版本号" path="res_version" required>
                  <NInputNumber v-model:value="versionForm.res_version" placeholder="请输入资源版本号" :min="0" style="width: 100%;" clearable />
                </NFormItemGi>
                <NFormItemGi span="24 m:12" label="SVN 版本号" path="svn_version" required>
                  <NInputNumber v-model:value="versionForm.svn_version" placeholder="请输入SVN版本号" :min="0" style="width: 100%;" clearable />
                </NFormItemGi>
                <NFormItemGi span="24 m:12" label="是否热更" path="needHotUpdate">
                  <NRadioGroup v-model:value="versionForm.needHotUpdate">
                    <NRadio :value="true">是</NRadio>
                    <NRadio :value="false">否</NRadio>
                  </NRadioGroup>
                </NFormItemGi>
              </NGrid>
            </NForm>
          </div>
        </div>
      </div>
      <NEmpty v-else description="暂无服务器数据" />
    </div>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="handleUpdateVisible(false)">取消</NButton>
        <NButton type="primary" @click="handleSubmit">确定</NButton>
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
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--n-border-color);
  border-radius: 0.5rem;
  overflow: hidden;
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
