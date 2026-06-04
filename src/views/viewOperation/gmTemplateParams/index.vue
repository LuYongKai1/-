<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from "naive-ui";
import {
  fetchGetActivityGMParamsList,
  fetchDeleteActivityGMParams,
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { serverStatusWhite } from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { ref, onMounted, onActivated } from "vue";
import ActivityOperateDrawer from "./modules/activity-operate-drawer.vue";
import FilterSelect from "./modules/filter-select.vue";
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
  apiFn: fetchGetActivityGMParamsList,
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
      title: $t("page.manage.gmTemplateParams.ID"),
      align: "center",
      width: 64,
    },
    {
      key: "paramName",
      title: $t("page.manage.gmTemplateParams.paramName"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true }
    },
    {
      key: "gmName",
      title: $t("page.manage.gmTemplateParams.gmName"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true }
    },
    {
      key: "paramIndex",
      title: $t("page.manage.gmTemplateParams.paramIndex"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true }
    },

    {
      key: "status",
      title: $t("page.manage.gmTemplateParams.status"),
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
          {hasAuth('operate:activityGMParam:edit') && (
            <NButton
            type="primary"
            ghost
            size="small"
            onClick={() => edit(row.id, row)}
          >
            {$t("common.edit")}
          </NButton>
          )}
          {hasAuth('operate:activityGMParam:remove') && (
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
  const response = await fetchDeleteActivityGMParams({
    id: checkedRowKeys.value,
  });
  onBatchDeleted(response);
}

async function handleDelete(id: number) {
  const response = await fetchDeleteActivityGMParams({ id });
  onDeleted(response);
}

function edit(id: number, row: any) {
  const editData = {
    ...row,
  };
  handleEdit(id, editData);
}

function handleSearch(activeGmId: string) {
  updateSearchParams({
    activeGmId: activeGmId,
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
    <FilterSelect
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />
    <NCard
      :title="$t('page.manage.gmTemplateParams.title')"
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
          :show-add="hasAuth('operate:activityGMParam:add')"
          :show-batch-delete="hasAuth('operate:activityGMParam:remove')"
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
