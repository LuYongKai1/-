<script setup lang="tsx">
// import { NButton, NPopconfirm /*, NTag*/ } from "naive-ui";
import {
  fetchGetActivityLog,
  // fetchDeleteTemplate,
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useTable, useTableOperate } from "@/hooks/common/table";
const appStore = useAppStore();

const { columns, columnChecks, data, getData, loading, mobilePagination } =
  useTable({
    apiFn: fetchGetActivityLog,
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
        title: $t("page.manage.activitylog.ID"),
        align: "center",
        width: 64,
      },
      {
        key: "activityName",
        title: $t("page.manage.activitylog.activityName"),
        align: "center",
        minWidth: 120,
      },
      {
        key: "operateUser",
        title: $t("page.manage.activitylog.auditUser"),
        align: "center",
        minWidth: 120,
      },
      {
        key: "operateTime",
        title: $t("page.manage.activitylog.auditTime"),
        align: "center",
        minWidth: 120,
        ellipsis: { tooltip: true },
      },
      {
        key: "operate",
        title: $t("page.manage.activitylog.operate"),
        align: "center",
        minWidth: 120,
        ellipsis: { tooltip: true },
      },
      {
        key: "status",
        title: $t("page.manage.activitylog.status"),
        align: "center",
        minWidth: 120,
        ellipsis: { tooltip: true },
      },
    ],
  });

const { checkedRowKeys } = useTableOperate(data, getData);
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <NCard
      :title="$t('page.manage.activitylog.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
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
    </NCard>
  </div>
</template>


<style scoped></style>
