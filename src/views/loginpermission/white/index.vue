<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NSwitch } from "naive-ui";
import {
  fetchGetUserWhiteList,
  fetchDeleteUserWhiteList,
  fetchUpdateUserWhiteList,
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { serverStatusWhite } from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import WhiteOperateDrawer from "./modules/white-operate-drawer.vue";
import WhiteSelect from "./modules/white-select.vue";
import { ref, onMounted } from "vue";
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
  searchParams,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetUserWhiteList,
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
      title: $t("page.manage.serverwhite.id"),
      align: "center",
      width: 64,
    },
    {
      key: "type",
      title: $t("page.manage.serverwhite.type"),
      align: "center",
      minWidth: 100,
      render: (row) => {
        if (row.type === null) {
          return null;
        }

        const tagMap: Record<Api.SystemManage.whiteTypeIp, NaiveUI.ThemeColor> =
          {
            0: "info",
            1: "info",
            2: "error",
            3: "warning",
            4: "warning",
          };

        const label = $t(serverStatusWhite[row.type]);

        return <NTag
          type={tagMap[row.type as Api.SystemManage.whiteTypeIp]}
          class={`white-tag white-tag-${row.type}`}
        >
          {label}
        </NTag>;
      },
    },
    {
      key: "param",
      title: $t("page.manage.serverwhite.param"),
      align: "center",
      minWidth: 200,
      ellipsis: { tooltip: true }
    },
    {
      key: "description",
      title: $t("page.manage.serverwhite.description"),
      align: "center",
      minWidth: 150,
      ellipsis: { tooltip: true }
    },
    {
      key: "operateUser",
      title: $t("page.manage.serverwhite.operateUser"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "operateTime",
      title: $t("page.manage.serverwhite.operateTime"),
      align: "center",
      minWidth: 200,
    },
    {
      key: "status",
      title: $t("page.manage.serverwhite.status"),
      align: "center",
      width: 120,
      render: (row) => {
        // 如果status为null或undefined，默认为'1'（禁用状态）
        const currentStatus = row.status === null || row.status === undefined ? '1' : String(row.status);
        return (
          <div class="flex-center">
            <NSwitch
              value={currentStatus === '0'}
              checkedValue={true}
              uncheckedValue={false}
              onUpdateValue={(value: boolean) => {
                const newStatus = value ? '0' : '1';
                handleStatusChange(row.id, newStatus, row);
              }}
            />
          </div>
        );
      },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 130,
      render: (row) => (
        <div class="flex-center gap-8px">
          {hasAuth('user:white:edit') && (
            <NButton
            type="primary"
            ghost
            size="small"
            onClick={() => edit(row.id, row)}
          >
            {$t("common.edit")}
          </NButton>
          )}

          {hasAuth('user:white:remove') && (
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
  handleAdd,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted,
} = useTableOperate(data, getData);

async function handleBatchDelete() {
  const response = await fetchDeleteUserWhiteList({
    id: checkedRowKeys.value,
  });
  onBatchDeleted();
}

async function handleDelete(id: number) {
  await fetchDeleteUserWhiteList({ id });
  onDeleted();
}

function edit(id: number, row: any) {
  const editData = {
    ...row,
  };
  handleEdit(id, editData);
}

async function handleStatusChange(id: number, newStatus: string, row: any) {
  try {
    const updateData = {
      id,
      type: row.type,
      channel: row.channel,
      param: row.param,
      description: row.description,
      status: newStatus
    };

    await fetchUpdateUserWhiteList(updateData);
    window.$message?.success($t("common.updateSuccess"));
    getData();
  } catch (error) {
    window.$message?.error($t("common.updateFailed"));
    getData();
  }
}

function handleSearch(params: { type: string; param: string }) {
  updateSearchParams({
    type: params.type,
    param: params.param,
  });
  getData();
}

onMounted(() => {
  data.value = [];
});
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <WhiteSelect
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />
    <NCard
      :title="$t('page.manage.serverwhite.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          :show-add="hasAuth('user:white:add')"
          :show-batch-delete="hasAuth('user:white:remove')"
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
        :scroll-x="962"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />

      <WhiteOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>


<style scoped></style>
