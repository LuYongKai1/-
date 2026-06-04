<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from "naive-ui";
import {
  fetchPostTemplateList,
  fetchDeleteTemplate,
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { serverStatusWhite } from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import templateOperateDrawer from "./modules/template-operate-drawer.vue";
import { ref, onMounted } from "vue";
import { format } from 'date-fns';
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
  apiFn: fetchPostTemplateList,
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
      title: $t("page.manage.template.id"),
      align: "center",
      width: 64,
    },
    {
      key: "templateName",
      title: $t("page.manage.template.templateName"),
      align: "center",
      minWidth: 120,
    },
    {
      key: "createTime",
      title: $t("page.manage.template.createTime"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row) => {
         return format(new Date(row.createTime), 'yyyy-MM-dd HH:mm:ss');
       },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 130,
      render: (row) => (
        <div class="flex-center gap-8px">
          {hasAuth('operate:activityTemplate:edit') && (
          <NButton
            type="primary"
            ghost
            size="small"
            onClick={() => edit(row.id, row)}
          >
            {$t("common.edit")}
          </NButton>
          )}
          {hasAuth('operate:activityTemplate:remove') && (
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
  const response = await fetchDeleteTemplate({
    id: checkedRowKeys.value,
  });
  onBatchDeleted(response);
}

async function handleDelete(id: number) {
  const response = await fetchDeleteTemplate({ id });
  onDeleted(response);
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
    <!-- <WhiteSelect
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    /> -->
    <NCard
      :title="$t('page.manage.template.title')"
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
          :show-add="hasAuth('operate:activityTemplate:add')"
          :show-batch-delete="hasAuth('operate:activityTemplate:edit')"
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

      <templateOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>


<style scoped></style>
