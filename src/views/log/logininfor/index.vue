<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from "naive-ui";
import { fetchGetLoginLogList } from "@/service/api";
import { useAppStore } from "@/store/modules/app";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { $t } from "@/locales";
import { enableStatusRecord, loginlogStatusRecord } from "@/constants/business";

const appStore = useAppStore();

const {
  columns,
  columnChecks,
  data,
  loading,
  getData,
  getDataByPage,
  mobilePagination,
  searchParams,
  resetSearchParams,
} = useTable({
  apiFn: fetchGetLoginLogList,
  apiParams: {
    current: 1,
    size: 20,
  },
  columns: () => [
    {
      key: "infoId",
      title: $t("page.manage.logininfor.infoId"),
      minWidth: 120,
      align: "center",
    },
    {
      key: "userName",
      title: $t("page.manage.logininfor.userName"),
      align: "center",
      minWidth: 80,
    },
    {
      key: "ipaddr",
      title: $t("page.manage.logininfor.ipaddr"),
      align: "center",
      minWidth: 80,
    },
    {
      key: "msg",
      title: $t("page.manage.logininfor.msg"),
      align: "center",
      minWidth: 120,
    },
    {
      key: "accessTime",
      title: $t("page.manage.logininfor.accessTime"),
      align: "center",
      minWidth: 120,
    },
    {
      key: "status",
      title: $t("page.manage.logininfor.status"),
      align: "center",
      minWidth: 120,
      render: (row) => {
        if (row.status === null || row.status === undefined) {
          return null;
        }

        const typeMap: Record<string, string> = {
          0: "success",
          1: "error",
        };

        const status = String(row.status);
        const label = $t(
          loginlogStatusRecord[status] ||
            "page.manage.logininfor.statusTypes.normal"
        );

        return <NTag type={typeMap[status] || "default"}>{label}</NTag>;
      },
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
  // closeDrawer
} = useTableOperate(data, getData);
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <NCard
      :title="$t('page.manage.logininfor.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @refresh="getData"
        />
      </template>

      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="702"
        :loading="loading"
        remote
        :row-key="(row) => row.roleId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
