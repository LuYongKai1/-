
<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from "naive-ui";
import { fetchGetServerlog, fetchGetServerDelete } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import {
  serverStatusLog,
  serverStatusLogsaveEnble,
} from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import LogOperateDrawer from "./modules/log-operate-drawer.vue";

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
} = useTable({
  apiFn: fetchGetServerlog,
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
      key: "gameId",
      title: $t("page.manage.log.gameId"),
      align: "center",
      width: 64,
    },
    {
      key: "logName",
      title: $t("page.manage.log.logName"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "logIp",
      title: $t("page.manage.log.logIp"),
      align: "center",
      width: 100,
    },
    {
      key: "logPort",
      title: $t("page.manage.log.logPort"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "saveEnable",
      title: $t("page.manage.log.saveEnable"),
      align: "center",
      width: 120,
      render: (row) => {
        if (row.saveEnable === null) {
          return null;
        }

        const tagMap: Record<
          Api.SystemManage.serversaveEnble,
          NaiveUI.ThemeColor
        > = {
          0: "error",
          1: "success",
        };
        const label = $t(serverStatusLogsaveEnble[row.saveEnable]);
        return <NTag type={tagMap[row.saveEnable]}>{label}</NTag>;
      },
    },
    {
      key: "groupList",
      title: $t("page.manage.log.groupList"),
      align: "center",
      minWidth: 100,
      // render: (row) => {
      //   if (!row.groupList || !Array.isArray(row.groupList)) return null;

      //   const groupNames = row.groupList
      //     .map((groupId: number) => serverGroupMap.value[groupId])
      //     .filter((name) => name)
      //     .join(", ");

      //   return <span>{groupNames}</span>;
      // },
    },
    {
      key: "enable",
      title: $t("page.manage.log.enable"),
      align: "center",
      minWidth: 100,
      render: (row) => {
        if (row.enable === null) {
          return null;
        }

        const tagMap: Record<
          Api.SystemManage.serverenable,
          NaiveUI.ThemeColor
        > = {
          0: "error",
          1: "success",
        };

        const label = $t(serverStatusLog[row.enable]);

        return <NTag type={tagMap[row.enable]}>{label}</NTag>;
      },
    },
    {
      key: "updateDate",
      title: $t("page.manage.log.updateDate"),
      align: "center",
      minWidth: 200,
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 130,
      render: (row) => (
        <div class="flex-center gap-8px">
          <NButton
            type="primary"
            ghost
            size="small"
            onClick={() => edit(row.id, row)}
          >
            {$t("common.edit")}
          </NButton>
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
  // closeDrawer
} = useTableOperate(data, getData);

async function handleBatchDelete() {
  const response = await fetchGetServerDelete({ id: checkedRowKeys.value });
  onBatchDeleted();
}

async function handleDelete(id: number) {
  await fetchGetServerDelete({ id });
  onDeleted();
}

function edit(id: number, row: any) {
  const editData = {
    ...row,
  };

  handleEdit(id, editData);
}
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <!-- <GameSearch
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="getDataByPage"
    /> -->
    <NCard
      :title="$t('page.manage.log.title')"
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
      <LogOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped></style>

