<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from "naive-ui";
import {
  fetchGetSeasonBlackList,
  fetchDeleteSeasonBlacklist,
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useTable, useTableOperate } from "@/hooks/common/table";
import activityOperateDrawer from "./modules/activityimg-operate-drawer.vue";
import { onMounted } from "vue";
import { useAuth } from '@/hooks/business/auth';

const { hasAuth } = useAuth();

const appStore = useAppStore();

const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  loading,
  mobilePagination,
} = useTable({
  apiFn: fetchGetSeasonBlackList,
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
      minWidth: 80,
    },
    {
      key: "seasonType",
      title: "活动类型",
      align: "center",
      minWidth: 120,
      render: (row: any) => {
        const typeMap: Record<string, string> = {
          'SINGLE': 'SINGLE-单服',
          'ALL': 'ALL-全服',
          '1': 'SINGLE-单服',
          '2': 'ALL-全服'
        };
        return typeMap[row.seasonType] || row.seasonType;
      }
    },
    {
      key: "seasonNo",
      title: "赛季编号",
      align: "center",
      minWidth: 100,
    },
    {
      key: "banUntil",
      title: "封禁时长",
      align: "center",
      minWidth: 120,
      render: (row: any) => {
        if (row.banUntil === -1) {
          return '永久';
        }
        return row.banUntil || '-';
      }
    },
    {
      key: "reason",
      title: "原因",
      align: "center",
      minWidth: 150,
      ellipsis: { tooltip: true },
    },
    {
      key: "roleName",
      title: "角色名称",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "roleId",
      title: "角色ID",
      align: "center",
      minWidth: 150,
    },
    {
      key: "serverId",
      title: "服务器ID",
      align: "center",
      minWidth: 100,
    },
    {
      key: "status",
      title: "状态",
      align: "center",
      minWidth: 100,
      render: (row: any) => (
        <NTag type={row.status === 1 ? 'success' : 'default'}>
          {row.status === 1 ? '启用' : '禁用'}
        </NTag>
      )
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 130,
      render: (row: any) => (
        <div class="flex-center gap-8px">
          {hasAuth('operate:social:edit') && (
            <NButton
            type="primary"
            ghost
            size="small"
            onClick={() => edit(row.id, row)}
          >
            {$t("common.edit")}
          </NButton>
          )}

          {hasAuth('operate:social:remove') && (
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
  ],
});

const {
  drawerVisible,
  operateType,
  editingData,
  openDrawer,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted,
} = useTableOperate(data as any, getData);

function handleAdd() {
  drawerVisible.value = true;
  operateType.value = 'add';
}

async function handleBatchDelete() {
  const response = await fetchDeleteSeasonBlacklist({
    id: checkedRowKeys.value as any,
  });
  onBatchDeleted();
}

async function handleDelete(id: number) {
  await fetchDeleteSeasonBlacklist({ id });
  onDeleted();
}

function edit(id: number, row: any) {
  const editData = {
    ...row,
  };
  handleEdit(id, editData);
}

onMounted(() => {
  getData();
});
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <NCard
      title="赛季二维码活动管理"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          :show-add="hasAuth('operate:social:add')"
          :show-batch-delete="hasAuth('operate:social:remove')"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @refresh="getData"
        />
      </template>

      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="1400"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />

      <activityOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped>
</style>
