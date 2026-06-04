<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NSelect, NInputNumber } from "naive-ui";
import {
  fetchGetBanRuleList,
  fetchDeleteBanRule,
  fetchAddBanRule,
  fetchUpdateBanRule
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useTable, useTableOperate } from "@/hooks/common/table";
import BanRuleOperateDrawer from "./modules/ban-rule-operate-drawer.vue";
import BanRuleSearch from "./modules/ban-rule-search.vue";
import { ref, onMounted, computed } from "vue";
import { useAuth } from '@/hooks/business/auth';
import { format } from 'date-fns';

const { hasAuth } = useAuth();
const appStore = useAppStore();

// 配置类型选项
const configTypeOptions = [
  { label: '时间窗口', value: 'TIME_WINDOW' },
  { label: '惩罚规则', value: 'PENALTY_RULE' }
];

// 时间单位选项
const timeUnitOptions = [
  { label: '分钟', value: 'MINUTE' },
  { label: '小时', value: 'HOUR' },
  { label: '天', value: 'DAY' },
  { label: '月', value: 'MONTH' }
];

// 启用状态选项
const enabledOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 }
];

// 渲染配置类型标签
const renderConfigType = (type: string) => {
  const typeMap: Record<string, { label: string; type: string }> = {
    'TIME_WINDOW': { label: '时间窗口', type: 'primary' },
    'PENALTY_RULE': { label: '惩罚规则', type: 'success' }
  };
  const info = typeMap[type] || { label: type, type: 'default' };
  return <NTag type={info.type as any}>{info.label}</NTag>;
};

// 渲染启用状态标签
const renderEnabledStatus = (enabled: number) => {
  const statusMap: Record<number, { label: string; type: string }> = {
    1: { label: '启用', type: 'success' },
    0: { label: '禁用', type: 'error' }
  };
  const info = statusMap[enabled] || { label: '未知', type: 'default' };
  return <NTag type={info.type as any}>{info.label}</NTag>;
};

// 渲染时间单位
const renderTimeUnit = (unit: string) => {
  const unitMap: Record<string, string> = {
    'MINUTE': '分钟',
    'HOUR': '小时',
    'DAY': '天',
    'MONTH': '月'
  };
  return <span>{unitMap[unit] || unit}</span>;
};

// 渲染有效期
const renderExpire = (value: number, unit: string) => {
  const unitMap: Record<string, string> = {
    'MINUTE': '分钟',
    'HOUR': '小时',
    'DAY': '天',
    'MONTH': '月'
  };
  return <span>{value} {unitMap[unit] || unit}</span>;
};

// 渲染违规次数
const renderBanCount = (row: any) => {
  if (row.configType === 'TIME_WINDOW') {
    return <span>-</span>;
  }
  return <span>{row.banCount}次</span>;
};

// 渲染创建时间
const renderCreateTime = (time: string) => {
  if (!time) return <span>-</span>;
  return <span>{format(new Date(time), 'yyyy-MM-dd HH:mm:ss')}</span>;
};

// 渲染更新时间
const renderUpdateTime = (time: string) => {
  if (!time) return <span>-</span>;
  return <span>{format(new Date(time), 'yyyy-MM-dd HH:mm:ss')}</span>;
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
  apiFn: fetchGetBanRuleList,
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
      key: "configType",
      title: "配置类型",
      align: "center",
      width: 100,
      render: (row: any) => renderConfigType(row.configType)
    },
    {
      key: "description",
      title: "描述",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true }
    },
    {
      key: "banCount",
      title: "违规次数",
      align: "center",
      width: 150,
      render: (row: any) => renderBanCount(row)
    },
    {
      key: "configValue",
      title: "配置数值",
      align: "center",
      width: 150,
      render: (row: any) => <span>{row.configValue}</span>
    },
    {
      key: "timeUnit",
      title: "时间单位",
      align: "center",
      width: 150,
      render: (row: any) => renderTimeUnit(row.timeUnit)
    },
    {
      key: "operateUser",
      title: "操作人",
      align: "center",
      minWidth: 150,
      ellipsis: { tooltip: true }
    },
    {
      key: "createTime",
      title: "创建时间",
      align: "center",
      minWidth: 150,
      render: (row: any) => renderCreateTime(row.createTime)
    },
    {
      key: "updateTime",
      title: "更新时间",
      align: "center",
      minWidth: 150,
      render: (row: any) => renderUpdateTime(row.updateTime)
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 280,
      render: (row: any) => (
        <div class="flex-center gap-8px">
          {hasAuth('user:banRule:edit') && (
            <NButton
              type="primary"
              ghost
              size="small"
              onClick={() => edit(row.id, row)}
            >
              {$t("common.edit")}
            </NButton>
          )}

          {hasAuth('user:banRule:remove') && (
            <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
              {{
                default: () => $t("common.confirmDelete"),
                trigger: () => (
                  <NButton type="error" ghost size="small" >
                    {$t("common.delete")}
                  </NButton>
                ),
              }}
            </NPopconfirm>
          )}
        </div>
      ),
    },
  ],
});

const {
  drawerVisible,
  operateType,
  editingData,
  handleAdd,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted,
} = useTableOperate(data, getData);

// 批量删除
async function handleBatchDelete() {
  try {
    const deletePromises = checkedRowKeys.value.map((id: number) => {
      return fetchDeleteBanRule(id);
    });
    const responses = await Promise.all(deletePromises);

    onBatchDeleted(responses);
  } catch (error: any) {
    onBatchDeleted(error);
  }
}

// 删除规则
async function handleDelete(id: number) {
  try {
    const response = await fetchDeleteBanRule(id);
    onDeleted(response);
  } catch (error: any) {
    onDeleted(error);
  }
}


// 复制规则
function handleCopy(row: any) {
  const copyData = {
    ...row,
    id: undefined, // 清除ID，让系统生成新的
    description: `${row.description} (副本)`
  };
  handleAdd(copyData);
}

// 编辑规则
function edit(id: number, row: any) {
  handleEdit(id, row);
}

// 搜索规则
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
    <BanRuleSearch
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />

    <NCard
      title="封禁规则管理"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @add="() => handleAdd()"
          @delete="handleBatchDelete"
          @refresh="getData"
          :show-add="hasAuth('user:banRule:add')"
          :show-batch-delete="hasAuth('user:banRule:remove')"
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

      <BanRuleOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
