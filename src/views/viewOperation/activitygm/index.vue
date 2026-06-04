<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from "naive-ui";
import {
  fetchGetActivityGMList,
  fetchDeleteActivityGM,
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { serverStatusWhite } from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { ref, onMounted } from "vue";
import ActivityOperateDrawer from "./modules/activitygm-operate-drawer.vue";
import { format } from "date-fns";
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
  apiFn: fetchGetActivityGMList,
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
      title: $t("page.manage.activitygm.ID"),
      align: "center",
      width: 64,
    },
    {
      key: "name",
      title: $t("page.manage.activitygm.name"),
      align: "center",
      minWidth: 120,
    },
    {
      key: "description",
      title: $t("page.manage.activitygm.description"),
      align: "center",
      minWidth: 120,
    },
    {
      key: "createTime",
      title: $t("page.manage.activitygm.createTime"),
      align: "center",
      minWidth: 120,
      render: (row) => {
         return format(new Date(row.createTime), 'yyyy-MM-dd HH:mm:ss');
       },
    },
    {
      key: "updateTime",
      title: $t("page.manage.activitygm.updateTime"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row) => {
         return format(new Date(row.updateTime), 'yyyy-MM-dd HH:mm:ss');
       },
    },
    {
      key: "status",
      title: $t("page.manage.activitygm.status"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true }
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 130,
      render: (row) => (
        <div class="flex-center gap-8px">
          {hasAuth('operate:activityGM:edit') && (
            <NButton
            type="primary"
            ghost
            size="small"
            onClick={() => edit(row.id, row)}
          >
            {$t("common.edit")}
          </NButton>
          )}
          {hasAuth('operate:activityGM:remove') && (
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
  const response = await fetchDeleteActivityGM({
    id: checkedRowKeys.value,
  });
  onBatchDeleted();
}

async function handleDelete(id: number) {
  await fetchDeleteActivityGM({ id });
  onDeleted();
}

function edit(id: number, row: any) {
  const editData = {
    ...row,
  };
  handleEdit(id, editData);
}
function handleSearch(channelId: string) {
  updateSearchParams({
    channelId,
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
    <NCard
      :title="$t('page.manage.activitygm.title')"
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
          :show-add="hasAuth('operate:activityGM:add')"
          :show-batch-delete="hasAuth('operate:activityGM:remove')"
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
      <ActivityOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>


<style scoped></style>
