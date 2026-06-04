<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from "naive-ui";
import { fetchGetUserLTV, fetchDeleteWhiteListManage } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { serverStatusWhite } from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import WhiteSelect from "./modules/ltvuser-select.vue";
import { ref, onMounted, h } from "vue";

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
  scrollX,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetUserLTV,
  showTotal: true,
  apiParams: {
    current: 1,
    size: 30,
  },
  columns: () => [
    {
      key: "targetDay",
      title: $t("page.manage.ltvuser.DateTime"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "channelId",
      title: $t("page.manage.ltvuser.channelID"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "channelName",
      title: $t("page.manage.ltvuser.channelName"),
      align: "center",
      Width: 130,
      ellipsis: { tooltip: true },
      render: (row) => {
        return row.channelName || "-";
      }
    },
    {
      key: "addNum",
      title: $t("page.manage.ltvuser.New"),
      align: "center",
      minWidth: 100,
    },
    ...Array.from({ length: 120 }, (_, i) => ({
      key: `day${i + 1}`,
      title: $t(`page.manage.ltvuser.LTV${i + 1}`),
      align: "left",
      minWidth: 180,
    } as any)),
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

function handleSearch(
  channelId: string,
  retentionGroupType: string,
  targetDay?: string | null,
  beginTime?: string,
  endTime?: string
) {
  const params: any = {
    channelId,
    retentionGroupType,
    gameId: 101,
  };

  columnChecks.value.forEach((columnCheck) => {
    if (columnCheck.key === "channelId") {
      columnCheck.checked =
        retentionGroupType === "channel" || retentionGroupType === "combo";
    }
    if (columnCheck.key === "channelName") {
      columnCheck.checked =
        retentionGroupType === "channel" || retentionGroupType === "combo";
    }
    // if (columnCheck.key === "targetDay") {
    //   columnCheck.checked =
    //     retentionGroupType === "date" || retentionGroupType === "combo";
    // }
  });

  if (targetDay) {
    params.targetDay = targetDay;
  }
  if (beginTime) {
    params.beginTime = beginTime;
  }
  if (endTime) {
    params.endTime = endTime;
  }

  updateSearchParams(params);
  getData();
}

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
      :title="$t('page.manage.ltvuser.title')"
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
        :scroll-x="scrollX"
        :loading="loading"
        remote
        :row-key="(row: any) => row.orderId || row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
