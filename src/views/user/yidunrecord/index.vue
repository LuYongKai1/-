<script setup lang="tsx">
import { NButton, NTag, NBadge } from "naive-ui";
import {
  fetchGetYidunRecordList
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useTable, useTableOperate } from "@/hooks/common/table";
import YidunRecordDetailDrawer from "./modules/yidun-record-detail-drawer.vue";
import YidunRecordSearch from "./modules/yidun-record-search.vue";
import { ref, onMounted, computed } from "vue";
import { useAuth } from '@/hooks/business/auth';
import { format } from 'date-fns';

const { hasAuth } = useAuth();
const appStore = useAppStore();

// 处理类型选项
const handleTypeOptions = [
  { label: '封禁用户', value: 'ban_user' },
  { label: '放行用户', value: 'unBan_user' },
  { label: '无动作', value: 'none' }
];

// 处理状态选项
const processStatusOptions = [
  { label: '待处理', value: 0 },
  { label: '处理成功', value: 1 },
  { label: '处理失败', value: 2 }
];

// 验证状态选项
const verifyStatusOptions = [
  { label: '验证失败', value: 0 },
  { label: '验证成功', value: 1 }
];

// 是否触发封禁选项
const banTriggerOptions = [
  { label: '否', value: 0 },
  { label: '是', value: 1 }
];

// 渲染处理类型标签
const renderHandleType = (type: string) => {
  const typeMap: Record<string, { label: string; type: string }> = {
    'ban_user': { label: '封禁用户', type: 'error' },
    'unBan_user': { label: '放行用户', type: 'success' },
    'none': { label: '无动作', type: 'default' }
  };
  const info = typeMap[type] || { label: type, type: 'default' };
  return <NTag type={info.type as any}>{info.label}</NTag>;
};

// 渲染处理状态标签
const renderProcessStatus = (status: number) => {
  const statusMap: Record<number, { label: string; type: string }> = {
    0: { label: '待处理', type: 'warning' },
    1: { label: '处理成功', type: 'success' },
    2: { label: '处理失败', type: 'error' }
  };
  const info = statusMap[status] || { label: '未知', type: 'default' };
  return <NTag type={info.type as any}>{info.label}</NTag>;
};

// 渲染验证状态标签
const renderVerifyStatus = (status: number) => {
  const statusMap: Record<number, { label: string; type: string }> = {
    0: { label: '验证失败', type: 'error' },
    1: { label: '验证成功', type: 'success' }
  };
  const info = statusMap[status] || { label: '未知', type: 'default' };
  return <NTag type={info.type as any}>{info.label}</NTag>;
};

// 渲染是否触发封禁标签
const renderBanTrigger = (trigger: number) => {
  const triggerMap: Record<number, { label: string; type: string }> = {
    0: { label: '否', type: 'default' },
    1: { label: '是', type: 'error' }
  };
  const info = triggerMap[trigger] || { label: '未知', type: 'default' };
  return <NTag type={info.type as any}>{info.label}</NTag>;
};

// 渲染处置时长
const renderHandleDuration = (row: any) => {
  if (!row.handleTime || row.handleTime === 0) {
    return <span>-</span>;
  }

  const unitMap: Record<number, string> = {
    0: '分钟',
    1: '小时',
    2: '天',
    3: '月',
    4: '年'
  };
  const unitText = unitMap[row.handleTimeUnit] || '分钟';
  return <span>{row.handleTime} {unitText}</span>;
};

// 渲染时间
const renderTime = (time: string) => {
  if (!time) return <span>-</span>;
  return <span>{format(new Date(time), 'yyyy-MM-dd HH:mm:ss')}</span>;
};

// 截断长文本
const truncateText = (text: string, maxLength: number = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const {
  columns,
  columnChecks,
  data,
  getData,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetYidunRecordList,
  showTotal: true,
  apiParams: {
    current: 1,
    size: 10,
  },
  columns: () => [
    {
      type: "selection",
      align: "center",
      width: 48,
    },
    {
      key: "id",
      title: "ID",
      align: "center",
      width: 80,
    },
    {
      key: "taskId",
      title: "任务ID",
      align: "center",
      width: 150,
      ellipsis: { tooltip: true }
    },
    {
      key: "account",
      title: "用户平台ID",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true }
    },
    {
      key: "handleType",
      title: "处置类型",
      align: "center",
      width: 100,
      render: (row: any) => renderHandleType(row.handleType)
    },
    {
      key: "handleDuration",
      title: "处置时长",
      align: "center",
      width: 150,
      render: (row: any) => renderHandleDuration(row)
    },
    {
      key: "handleReason",
      title: "处置原因",
      align: "center",
      minWidth: 150,
      ellipsis: { tooltip: true },
      render: (row: any) => <span title={row.handleReason}>{truncateText(row.handleReason, 30)}</span>
    },
    {
      key: "processStatus",
      title: "处理状态",
      align: "center",
      width: 100,
      render: (row: any) => renderProcessStatus(row.processStatus)
    },
    {
      key: "isBanTrigger",
      title: "触发封禁",
      align: "center",
      width: 100,
      render: (row: any) => renderBanTrigger(row.isBanTrigger)
    },
    {
      key: "receiveTime",
      title: "接收时间",
      align: "center",
      minWidth: 150,
      render: (row: any) => renderTime(row.receiveTime)
    },
    {
      key: "processTime",
      title: "处理时间",
      align: "center",
      minWidth: 150,
      render: (row: any) => renderTime(row.processTime)
    }
  ],
});

const {
  drawerVisible,
  operateType,
  editingData,
  handleEdit,
} = useTableOperate(data, getData);

// 查看详情
async function handleView(id: number, row: any) {
  try {
    // 如果需要从后端获取详情，可以调用接口
    // const response = await fetchGetYidunRecordDetail(id);
    // if (response && response.code === 200) {
    //   handleEdit(id, response.data);
    // }

    // 或者直接使用当前行的数据
    handleEdit(id, row);
  } catch (error) {
    console.error('获取详情失败:', error);
  }
}

// 搜索记录
function handleSearch() {
  getData();
}

onMounted(() => {
  getData();
});
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <YidunRecordSearch
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />

    <NCard
      title="易盾回调记录"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :loading="loading"
          @refresh="getData"
          :show-add="false"
          :show-batch-delete="false"
        />
      </template>

      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="962"
        :loading="loading"
        remote
        :row-key="(row: any) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />

      <YidunRecordDetailDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
