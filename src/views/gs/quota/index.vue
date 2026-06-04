<script setup lang="tsx">
import { ref } from "vue";
import { NButton, NTag, NPopconfirm } from "naive-ui";
import { format } from "date-fns";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import {
  fetchGetGsQuotaTaskList,
  fetchDeleteGsQuotaTask,
} from "@/service/api";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { useAuth } from "@/hooks/business/auth";
import GiftActivityOperateDrawer from "./modules/quota-activity-operate-drawer.vue";
import QuotaSelect from "./modules/quota-select.vue";
import { gsQuotaCycleTypeRecord } from "@/constants/business";


const { hasAuth } = useAuth();
const appStore = useAppStore();

const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  scrollX,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetGsQuotaTaskList,
  showTotal: true,
  apiParams: {
    current: 1,
    size: 10,
  },
  columns: () => [
    {
      type: "selection",
      align: "center",
      width: 50,
    },
    {
      key: "id",
      title: "ID",
      align: "center",
      minWidth: 80,
      ellipsis: { tooltip: true },
    },
    {
      key: "roleId",
      title: $t("page.manage.gsQuota.roleId"),
      align: "center",
      minWidth: 150,
      ellipsis: { tooltip: true },
    },
    {
      key: "amount",
      title: $t("page.manage.gsQuota.amount"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "cycleType",
      title: $t("page.manage.gsQuota.cycleType"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        if (!row.cycleType) {
          return "-";
        }
        const cycleTypeTagMap: Record<string, NaiveUI.ThemeColor> = {
          ONCE: "default",
          DAILY: "info",
          WEEKLY: "success",
          MONTHLY: "warning",
        };
        const cycleTypeKey = row.cycleType as keyof typeof gsQuotaCycleTypeRecord;
        const labelKey = gsQuotaCycleTypeRecord[cycleTypeKey];
        if (!labelKey) {
          return <NTag type="default">{row.cycleType}</NTag>;
        }
        const label = $t(labelKey);
        const tagType = cycleTypeTagMap[row.cycleType] || "default";
        return <NTag type={tagType}>{label}</NTag>;
      },
    },
    {
      key: "startTime",
      title: $t("page.manage.gsQuota.startTime"),
      align: "center",
      minWidth: 160,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        if (!row.startTime) {
          return "-";
        }
        try {
          return format(new Date(row.startTime), "yyyy-MM-dd HH:mm:ss");
        } catch (error) {
          return row.startTime;
        }
      },
    },
    {
      key: "nextExecTime",
      title: $t("page.manage.gsQuota.nextExecTime"),
      align: "center",
      minWidth: 160,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        if (!row.nextExecTime) {
          return "-";
        }
        try {
          return format(new Date(row.nextExecTime), "yyyy-MM-dd HH:mm:ss");
        } catch (error) {
          return row.nextExecTime;
        }
      },
    },
    {
      key: "status",
      title: $t("page.manage.gsQuota.taskStatus"),
      align: "center",
      minWidth: 100,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        if (row.status === null || row.status === undefined) {
          return "-";
        }
        // 1-进行中, 0-已停止/已完成
        const isActive = row.status === 1;
        const label = isActive ? $t("page.manage.gsQuota.running") : $t("page.manage.gsQuota.stopped");
        const tagType = isActive ? "success" : "error";
        return <NTag type={tagType}>{label}</NTag>;
      },
    },
    {
      key: "remark",
      title: $t("page.manage.gsQuota.taskRemark"),
      align: "center",
      minWidth: 200,
      ellipsis: { tooltip: true },
    },
    {
      key: "operator",
      title: $t("page.manage.gsQuota.operator"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return row.operator || "-";
      },
    },
    {
      key: "createdAt",
      title: $t("page.manage.gsQuota.createdAt"),
      align: "center",
      minWidth: 160,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        if (!row.createdAt) {
          return "-";
        }
        try {
          return format(new Date(row.createdAt), "yyyy-MM-dd HH:mm:ss");
        } catch (error) {
          return row.createdAt;
        }
      },
    },
    {
      key: "updatedAt",
      title: $t("page.manage.gsQuota.updatedAt"),
      align: "center",
      minWidth: 160,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        if (!row.updatedAt) {
          return "-";
        }
        try {
          return format(new Date(row.updatedAt), "yyyy-MM-dd HH:mm:ss");
        } catch (error) {
          return row.updatedAt;
        }
      },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 130,
      render: (row: any) => (
        <div class="flex-center gap-8px">
          {hasAuth('operate:gsGrantTask:edit') && (
            <NButton type="primary" ghost size="small" onClick={() => edit(row.id, row)}>
              {$t("common.edit")}
            </NButton>
          )}
          {hasAuth('operate:gsGrantTask:remove') && (
            <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
              {{
                default: () => $t("common.confirmDelete"),
                trigger: () => (
                  <NButton type="error" ghost size="small">
                    {$t("common.delete")}
            </NButton>
                ),
              }}
            </NPopconfirm>
          )}
        </div>
      ),
    },
  ] as any,
  defaultHiddenKeys: ['createdAt','updatedAt']
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
  // closeDrawer
} = useTableOperate(data, getData);

async function handleBatchDelete() {
  try {
    const deletePromises = checkedRowKeys.value.map((id: string | number) => {
      return fetchDeleteGsQuotaTask({ id: Number(id) });
    });
    const responses = await Promise.all(deletePromises);

    onBatchDeleted(responses);
  } catch (error: any) {
    onBatchDeleted(error);
  }
}

function edit(id: number, row: any) {
  const editData = {
    ...row,
  };
  handleEdit(id, editData);
}

const currentServerId = ref("");

// 搜索处理函数
function handleSearch(params: any) {
  updateSearchParams(params);
  getData();
}

// 删除单个任务
async function handleDelete(id: number) {
  try {
    const response = await fetchDeleteGsQuotaTask({ id });
    onDeleted(response);
  } catch (error: any) {
    onDeleted(error);
  }
}
</script>

<template>
  <div class="flex-col gap-16px lt-sm:overflow-auto">
    <QuotaSelect
      :model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />

    <NCard
      :title="$t('page.manage.gsQuota.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @refresh="getData"
          :show-add="hasAuth('operate:gsGrantTask:add')"
          :show-batch-delete="hasAuth('operate:gsGrantTask:remove')"
        />
      </template>

      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="scrollX"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />

      <GiftActivityOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        :server-id="currentServerId"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped>
</style>

