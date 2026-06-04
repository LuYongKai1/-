<script setup lang="tsx">
import { ref, computed, h } from 'vue';
import { NDataTable, NButton, NInput, NForm, NFormItem, NSpin, NEmpty, NTag } from 'naive-ui';
import { Icon } from '@iconify/vue';
import { fetchCheckNotExistResource } from '@/service/api';
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';

interface Props {
  serverId: number | null;
}

interface ResourceItem {
  itemId: number;
  exists: boolean;
}

const props = defineProps<Props>();

const checkResourceData = ref<ResourceItem[]>([]);
const checkResourceLoading = ref(false);
const itemIds = ref<string>('');
const hasSearched = ref(false);

function parseItemIds(input: string): number[] {
  return input
    .split(',')
    .map(id => id.trim())
    .filter(id => id && !isNaN(Number(id)))
    .map(id => Number(id));
}

function extractDataFromResponse(response: any): any[] | null {
  if (!response?.response?.data) return null;

  const responseData = response.response.data;

  if (responseData.code === 200 && responseData.data) {
    return responseData.data;
  }

  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (responseData.data) {
    return responseData.data;
  }

  return null;
}

function getDataList(data: any): any[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (data?.data && Array.isArray(data.data)) {
    return data.data;
  }

  return [];
}

function isDataEmpty(data: any): boolean {
  if (!data) return true;

  const total = data.total || (Array.isArray(data) ? data.length : 0);
  const dataList = getDataList(data);

  return total === 0 || dataList.length === 0;
}

function isTimeoutError(error: any): boolean {
  return error?.code === 'ECONNABORTED' || error?.message?.includes('timeout');
}

async function checkInvalidResources() {
  if (!props.serverId) {
    window.$message?.warning('请先选择服务器');
    return;
  }

  if (!itemIds.value.trim()) {
    window.$message?.warning('请输入物品ID');
    return;
  }

  const ids = parseItemIds(itemIds.value);

  if (ids.length === 0) {
    window.$message?.warning('请输入有效的物品ID');
    return;
  }

  checkResourceLoading.value = true;
  hasSearched.value = false;

  const loadingMessage = window.$message?.loading('正在检查资源，请耐心等待...', { duration: 0 });

  try {
    const itemIdsStr = ids.join(',');

    const response = await fetchCheckNotExistResource({
      serverId: props.serverId,
      itemIds: itemIdsStr
    });

    loadingMessage?.destroy();

    const hasError = handleApiResponseError(response, '检查不存在的资源');

    if (!hasError) {
      const data = extractDataFromResponse(response);
      hasSearched.value = true;

      if (data && !isDataEmpty(data)) {
        checkResourceData.value = getDataList(data);
      } else {
        checkResourceData.value = [];
      }
    } else {
      hasSearched.value = true;
      checkResourceData.value = [];
    }
  } catch (error: any) {
    hasSearched.value = true;
    loadingMessage?.destroy();

    if (isTimeoutError(error)) {
      window.$message?.error('请求超时，请稍后重试或减少检查的物品ID数量');
    } else {
      handleApiCatchError(error, '检查不存在的资源');
    }

    checkResourceData.value = [];
  } finally {
    checkResourceLoading.value = false;
  }
}

const checkResourceColumns = computed(() => [
  {
    key: 'itemId',
    title: '物品ID',
    align: 'center' as const,
    minWidth: 120
  },
  {
    key: 'status',
    title: '状态',
    align: 'center' as const,
    minWidth: 120,
    render: (row: ResourceItem) => {
      const tagType = row.exists === false ? 'error' : 'success';
      const tagText = row.exists === false ? '不存在' : '存在';

      return h(NTag, { type: tagType }, { default: () => tagText });
    }
  }
]);
</script>

<template>
  <div class="tab-content">
    <NForm
      :model="{ itemIds }"
      label-placement="left"
      :label-width="100"
      class="search-form"
    >
      <NFormItem label="物品ID">
        <NInput
          v-model:value="itemIds"
          placeholder="请输入物品ID，多个ID用逗号分隔"
          type="textarea"
          :rows="3"
        />
        <template #feedback>
          <span class="input-hint">支持多个ID，用逗号分隔，例如：1001,1002,1003</span>
        </template>
      </NFormItem>
      <div class="action-bar">
        <NButton
          type="primary"
          :disabled="!props.serverId || !itemIds.trim()"
          :loading="checkResourceLoading"
          @click="checkInvalidResources"
        >
          <template #icon>
            <Icon icon="mdi:check-circle" />
          </template>
          检查
        </NButton>
      </div>
    </NForm>

    <NSpin :show="checkResourceLoading">
      <NDataTable
        v-if="checkResourceData.length > 0"
        :columns="checkResourceColumns"
        :data="checkResourceData"
        size="small"
        :bordered="true"
        class="resource-table"
      />
      <NEmpty
        v-else-if="!checkResourceLoading && hasSearched && checkResourceData.length === 0"
        description="服务器不存在该资源"
        class="empty-no-resource"
      />
      <NEmpty
        v-else
        description="暂无数据，请先选择服务器、输入物品ID并点击检查"
      />
    </NSpin>
  </div>
</template>

<style scoped>
.tab-content {
  padding: 16px;
}

.search-form {
  margin-bottom: 16px;
}

.input-hint {
  font-size: 12px;
  color: var(--text-color-2);
}

.action-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
  gap: 8px;
}

.resource-table {
  margin-top: 16px;
}

.empty-no-resource :deep(.n-empty__description) {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  letter-spacing: 0.5px;
}
</style>

