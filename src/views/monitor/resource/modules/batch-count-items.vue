<script setup lang="tsx">
import { ref, computed, h } from 'vue';
import { NDataTable, NButton, NInput, NForm, NFormItem, NSpin, NEmpty } from 'naive-ui';
import type { DataTableColumn } from 'naive-ui';
import { Icon } from '@iconify/vue';
import { fetchBatchCountItems } from '@/service/api';
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';

interface Props {
  serverId: number | null;
}

interface BatchCountItem {
  itemId: number;
  count: number;
  [key: string]: any;
}

const props = defineProps<Props>();

const batchCountData = ref<BatchCountItem[]>([]);
const batchCountLoading = ref(false);
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
    // 如果 data.data 是数组，返回它
    if (Array.isArray(responseData.data.data)) {
      return responseData.data.data;
    }
    // 如果 data 本身就是数组，返回它
    if (Array.isArray(responseData.data)) {
      return responseData.data;
    }
    return responseData.data;
  }

  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (responseData.data) {
    // 如果 data.data 是数组，返回它
    if (Array.isArray(responseData.data.data)) {
      return responseData.data.data;
    }
    if (Array.isArray(responseData.data)) {
      return responseData.data;
    }
  }

  return null;
}

function formatNumber(num: number): string {
  if (num >= 100000000) return `${(num / 100000000).toFixed(2)}亿`;
  if (num >= 10000) return `${(num / 10000).toFixed(2)}万`;
  return num.toLocaleString();
}

async function batchCountItems() {
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

  batchCountLoading.value = true;
  hasSearched.value = false;

  const loadingMessage = window.$message?.loading('正在统计物品，请耐心等待...', { duration: 0 });

  try {
    const response = await fetchBatchCountItems(
      { serverId: props.serverId },
      ids
    );

    loadingMessage?.destroy();

    const hasError = handleApiResponseError(response, '批量统计物品');

    if (!hasError) {
      const data = extractDataFromResponse(response);
      hasSearched.value = true;

      if (data && Array.isArray(data) && data.length > 0) {
        // 映射字段名：item_id -> itemId, total_count -> count
        batchCountData.value = data.map((item: any) => ({
          itemId: item.item_id !== undefined ? item.item_id : item.itemId,
          count: item.total_count !== undefined ? item.total_count : item.count,
          ...item // 保留其他字段
        }));
      } else {
        batchCountData.value = [];
      }
    } else {
      hasSearched.value = true;
      batchCountData.value = [];
    }
  } catch (error: any) {
    hasSearched.value = true;
    loadingMessage?.destroy();
    handleApiCatchError(error, '批量统计物品');
    batchCountData.value = [];
  } finally {
    batchCountLoading.value = false;
  }
}

const batchCountColumns = computed<DataTableColumn<BatchCountItem>[]>(() => [
  {
    key: 'itemId',
    title: '物品ID',
    align: 'center' as const,
    minWidth: 120
  },
  {
    key: 'count',
    title: '数量',
    align: 'center' as const,
    minWidth: 200,
    render: (row: BatchCountItem) => {
      const count = Number(row.count || 0);
      return h('div', { class: 'amount-cell' }, [
        h('span', { class: 'amount-value' }, formatNumber(count)),
        h('span', { class: 'amount-original' }, `(${count.toLocaleString()})`)
      ]);
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
          :loading="batchCountLoading"
          @click="batchCountItems"
        >
          <template #icon>
            <Icon icon="mdi:calculator" />
          </template>
          统计
        </NButton>
      </div>
    </NForm>

    <NSpin :show="batchCountLoading">
      <NDataTable
        v-if="batchCountData.length > 0"
        :columns="batchCountColumns"
        :data="batchCountData"
        size="small"
        :bordered="true"
        class="resource-table"
      />
      <NEmpty
        v-else-if="!batchCountLoading && hasSearched && batchCountData.length === 0"
        description="暂无统计数据"
        class="empty-no-data"
      />
      <NEmpty
        v-else
        description="暂无数据，请先选择服务器、输入物品ID并点击统计"
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

.amount-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.amount-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.amount-original {
  font-size: 12px;
  color: var(--text-color-2);
  opacity: 0.7;
}

.empty-no-data :deep(.n-empty__description) {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-color-2);
}
</style>

