<script setup lang="tsx">
import { ref, computed, h, onMounted } from 'vue';
import { NCard, NDataTable, NTag, NSpin } from 'naive-ui';
import { fetchsummary } from '@/service/api';

interface SummaryServerData {
  full_user: number;
  gid: number;
  flag?: boolean;
  busy_user?: number;
  max_user?: number;
  mgid?: number;
  name: string;
  host?: string;
  region?: number;
  status2?: number;
  status: number;
  user?: number;
  in_queue?: number;
  account_logging_in?: number;
  character_creating?: number;
}

const props = defineProps<{
  language: string;
}>();

// 添加 emit 定义
const emit = defineEmits<{
  'row-click': [serverId: number];
}>();

const summaryData = ref<SummaryServerData[]>([]);
const summaryLoading = ref(false);
const summaryDataFetchTime = ref(new Date());

// 获取 summary 数据
const fetchSummaryData = async () => {
  summaryLoading.value = true;
  try {
    const response = await fetchsummary(Number(props.language));
    if (response?.response?.data) {
      summaryData.value = response.response.data as unknown as SummaryServerData[];
      summaryDataFetchTime.value = new Date();
    } else {
      console.error("No summary data returned");
    }
  } catch (error) {
    console.error("Error fetching summary data:", error);
  } finally {
    summaryLoading.value = false;
  }
};

// 修改为使用 row-props 的方式处理行点击
const rowProps = (row: any) => {
  return {
    style: 'cursor: pointer;',
    onClick: () => {
      emit('row-click', row.serverId);
    }
  };
};

// 修改 summary 数据处理函数
const getSummaryData = computed(() => {
  if (!Array.isArray(summaryData.value)) return [];

  const dataRows = summaryData.value.map((serverData) => ({
    region: serverData.region || '-',
    serverId: serverData.gid,
    serverName: serverData.name || '-',
    user: serverData.full_user || 0,
    busyUser: serverData.busy_user || 0,
    maxUser: serverData.max_user || 0,
    host: serverData.host || '-',
    status: h(NTag, {
      type: serverData.status === 1 ? 'success' : 'error',
      style: serverData.status === 1
        ? {
          backgroundColor: 'rgba(84, 214, 44, 0.16)',
          color: 'rgb(34, 197, 94)'
        }
        : {
          backgroundColor: 'rgba(255, 77, 79, 0.16)',
          color: 'rgb(208, 48, 80)'
        }
    }, { default: () => serverData.status === 1 ? 'Running' : 'Error' })
  }));

  // 返回处理后的服务器数据行，不再包含 Total 行
  return dataRows;
});

// 表格列定义
const summaryColumns = [
  { title: 'Region', key: 'region', align: 'center' as const },
  { title: 'Server ID', key: 'serverId', align: 'center' as const },
  { title: 'Server Name', key: 'serverName', align: 'center' as const },
  { title: 'Host', key: 'host', align: 'center' as const },
  { title: 'Users', key: 'user', align: 'center' as const },
  { title: 'Busy Users', key: 'busyUser', align: 'center' as const },
  { title: 'Max Users', key: 'maxUser', align: 'center' as const },
  { title: 'Status', key: 'status', align: 'center' as const }
];

onMounted(() => {
  fetchSummaryData();
});
</script>

<template>
  <NCard :bordered="false" class="summary-card">
    <div class="summary-container">
      <div class="summary-header">
        <span class="text-xl font-semibold overview-title">概览</span>
        <span class="text-sm fetch-label">
          Data fetched at Local Time
          <strong class="fetch-time">
            {{ summaryDataFetchTime.toLocaleString('en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
              second: 'numeric',
              hour12: true,
              timeZoneName: 'short'
            }) }}
          </strong>
        </span>
      </div>

      <div v-if="summaryLoading" >
        <NSpin size="large" />
      </div>
      <div v-else>
        <NDataTable
          :columns="summaryColumns"
          :data="getSummaryData"
          size="small"
          :bordered="false"
          :single-line="false"
          class="summary-table"
          :row-props="rowProps"
        />
      </div>
    </div>
  </NCard>
</template>

<style scoped>
.summary-container {
  /* 移除固定黑色文本颜色，让其继承主题颜色 */
  /* color: rgb(0, 0, 0); */
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 16px;
  margin-bottom: 10px;
}

.overview-title {
  color: rgb(41, 121, 255);
  font-weight: 600;
}

.fetch-label {
  /* color: rgb(220, 220, 220); */
  font-weight: 500;
  color: var(--text-color);
}

.fetch-time {
  color: rgb(255, 171, 0);
}

/* Add hover effect to table rows */
:deep(.n-data-table-tbody tr:hover) {
  background-color: rgba(128, 128, 128, 0.08);
}

/* Style the status tags */
:deep(.n-tag) {
  border-radius: 6px; /* Softer corners */
  padding: 2px 8px; /* Add vertical and horizontal padding */
  font-weight: 500; /* Slightly bolder text */
  min-width: 70px; /* Ensure a minimum width for alignment */
  /* Use Flexbox for centering */
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Add more padding to the card content */
.summary-card > :deep(.n-card__content) {
  padding: 20px;
}

:root {
  --text-color: rgba(0, 0, 0, 0.85);
}

:root.dark {
  --text-color: rgba(255, 255, 255, 0.85);
}
</style>
