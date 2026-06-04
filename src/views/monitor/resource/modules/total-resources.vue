<script setup lang="tsx">
import { ref, computed, h } from 'vue';
import { NDataTable, NButton, NSpin, NEmpty } from 'naive-ui';
import type { DataTableColumn } from 'naive-ui';
import { Icon } from '@iconify/vue';
import { fetchGetResourceMonitorList } from '@/service/api';
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';

interface Props {
  serverId: number | null;
}

interface ResourceItem {
  resourceName: string;
  totalAmount: number;
  key: string;
  icon: string;
  color: string;
}

interface ResourceConfig {
  name: string;
  icon: string;
  color: string;
}

const props = defineProps<Props>();

const totalResourcesData = ref<ResourceItem[]>([]);
const totalResourcesLoading = ref(false);

const resourceConfig: Record<string, ResourceConfig> = {
  jinbi: { name: '金币', icon: 'mdi:currency-usd', color: '#FFD700' },
  tongtianyupo: { name: '通天玉珀', icon: 'mdi:diamond-stone', color: '#9370DB' },
  yuanbao: { name: '元宝', icon: 'mdi:coin', color: '#FFA500' },
  jieqiezhiye: { name: '结锲之叶', icon: 'mdi:leaf', color: '#32CD32' },
  dianquan: { name: '点券', icon: 'mdi:ticket', color: '#1E90FF' }
};

const resourceOrder = ['jinbi', 'dianquan', 'yuanbao', 'jieqiezhiye', 'tongtianyupo'] as const;

function extractDataFromResponse(response: any): any[] | null {
  if (!response?.response?.data) return null;

  const responseData = response.response.data;

  if (responseData.code === 200 && responseData.data) {
    return responseData.data;
  }

  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (typeof responseData === 'object' && responseData.data) {
    return responseData.data;
  }

  return null;
}

function transformResourceData(data: any[]): ResourceItem[] {
  if (!Array.isArray(data) || data.length === 0) return [];

  const resourceObj = data[0];
  const defaultConfig: ResourceConfig = { name: '', icon: 'mdi:help-circle', color: '#999' };

  return Object.entries(resourceObj)
    .map(([key, value]) => {
      const config = resourceConfig[key] || { ...defaultConfig, name: key };
      return {
        resourceName: config.name,
        totalAmount: Number(value) || 0,
        key,
        icon: config.icon,
        color: config.color
      };
    })
    .sort((a, b) => {
      const indexA = resourceOrder.indexOf(a.key as typeof resourceOrder[number]);
      const indexB = resourceOrder.indexOf(b.key as typeof resourceOrder[number]);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });
}

async function fetchTotalResources() {
  if (!props.serverId) {
    window.$message?.warning('请先选择服务器');
    return;
  }

  totalResourcesLoading.value = true;
  try {
    const response = await fetchGetResourceMonitorList({
      serverId: props.serverId
    });

    const hasError = handleApiResponseError(response, '获取资源总量统计');

    if (!hasError) {
      const data = extractDataFromResponse(response);
      totalResourcesData.value = data ? transformResourceData(data) : [];
    } else {
      totalResourcesData.value = [];
    }
  } catch (error) {
    handleApiCatchError(error, '获取资源总量统计');
    totalResourcesData.value = [];
  } finally {
    totalResourcesLoading.value = false;
  }
}

function formatNumber(num: number): string {
  if (num >= 100000000) {
    return `${(num / 100000000).toFixed(2)}亿`;
  }
  if (num >= 10000) {
    return `${(num / 10000).toFixed(2)}万`;
  }
  return num.toLocaleString();
}

const totalResourcesColumns = computed(() => [
  {
    key: 'resourceName',
    title: '资源名称',
    align: 'center' as const,
    minWidth: 150,
    render: (row: ResourceItem) => {
      return h('div', { class: 'flex items-center justify-center gap-8px' }, [
        h(Icon, {
          icon: row.icon,
          class: 'text-18px',
          style: { color: row.color }
        }),
        h('span', {}, row.resourceName)
      ]);
    }
  },
  {
    key: 'totalAmount',
    title: '总量',
    align: 'center' as const,
    minWidth: 200,
    render: (row: ResourceItem) => {
      const amount = Number(row.totalAmount || 0);
      const formatted = formatNumber(amount);
      return h('div', { class: 'amount-cell' }, [
        h('span', { class: 'amount-value' }, `${formatted}(${amount.toLocaleString()})`)
      ]);
    }
  }
]);
</script>

<template>
  <div class="tab-content">
    <div class="action-bar">
      <NButton
        type="primary"
        :disabled="!props.serverId"
        :loading="totalResourcesLoading"
        @click="fetchTotalResources"
      >
        <template #icon>
          <Icon icon="mdi:refresh" />
        </template>
        查询
      </NButton>
    </div>

    <NSpin :show="totalResourcesLoading">
      <template v-if="totalResourcesLoading">
        <div class="loading-placeholder">
          <span>正在加载数据...</span>
        </div>
      </template>
      <template v-else-if="totalResourcesData.length > 0">
        <NDataTable
          :columns="totalResourcesColumns"
          :data="totalResourcesData"
          size="small"
          :bordered="true"
          class="resource-table"
        />
      </template>
      <template v-else>
        <NEmpty description="暂无数据，请先选择服务器并点击查询" />
      </template>
    </NSpin>
  </div>
</template>

<style scoped>
.tab-content {
  padding: 16px;
}

.action-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
  gap: 8px;
}

.loading-placeholder {
  text-align: center;
  padding: 40px;
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
  color: var(--text-color);
}

.amount-original {
  font-size: 12px;
  color: var(--text-color-2);
  opacity: 0.7;
}

:deep(.resource-table .n-data-table-th) {
  background-color: var(--n-th-color);
  font-weight: 600;
}

:deep(.resource-table .n-data-table-td) {
  padding: 12px;
}

:deep(.resource-table .n-data-table-tbody tr:hover) {
  background-color: var(--n-td-color-hover);
}
</style>

