<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from "naive-ui";
import {
  fetchGetUserList,
  fetchDeleteGameList,
  fetchGetGameList,
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { gameStatusRecord, gameUsermergeRecord } from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import UserOperateDrawer from "./modules/game-operate-drawer.vue";
import GameSearch from "./modules/game-search.vue";
import { useAuth } from '@/hooks/business/auth';
import { format } from 'date-fns';

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
} = useTable({
  apiFn: fetchGetGameList,
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
      title: $t("page.manage.game.gameId"),
      align: "center",
      width: 64,
    },
    {
      key: "gameName",
      title: $t("page.manage.game.gameName"),
      align: "center",
      minWidth: 100,
    },
    // {
    //   key: "userMerge",
    //   title: $t("page.manage.game.userMerge"),
    //   align: "center",
    //   width: 100,
    //   render: (row) => {
    //     if (row.userMerge === null) {
    //       return null;
    //     }

    //     const tagMap: Record<Api.SystemManage.Usermerge, NaiveUI.ThemeColor> = {
    //       0: "error",
    //       1: "success",
    //     };

    //     const label = $t(gameUsermergeRecord[row.userMerge]);

    //     return <NTag type={tagMap[row.userMerge]}>{label}</NTag>;
    //   },
    // },
    // {
    //   key: "gameKey",
    //   title: $t("page.manage.game.gameKey"),
    //   align: "center",
    //   minWidth: 100,
    // },
    {
      key: "gameAlias",
      title: $t("page.manage.game.gameAlias"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "biAlias",
      title: $t("page.manage.game.biAlias"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "createDate",
      title: $t("page.manage.game.createDate"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "updateDate",
      title: $t("page.manage.game.updateDate"),
      align: "center",
      minWidth: 200,
    },
    {
      key: "pioneerEnableDate" as any,
      title: $t("page.manage.game.pioneerEnableDate"),
      align: "center",
      minWidth: 200,
      render: (row: any) => {
        if (!row.pioneerEnableDate) {
          return null;
        }
        try {
          const date = new Date(row.pioneerEnableDate);
          if (isNaN(date.getTime())) {
            return row.pioneerEnableDate;
          }
          return format(date, 'yyyy-MM-dd HH:mm:ss');
        } catch (error) {
          return row.pioneerEnableDate;
        }
      },
    },
    {
      key: "enable",
      title: $t("page.manage.game.enable"),
      align: "center",
      width: 100,
      render: (row) => {
        if (row.enable === null) {
          return null;
        }

        const tagMap: Record<Api.SystemManage.GameStatus, NaiveUI.ThemeColor> = {
          1: "success",
          0: "warning",
        };

        const label = $t(gameStatusRecord[row.enable]);

        return <NTag type={tagMap[row.enable]}>{label}</NTag>;
      },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 130,
      render: (row) => (
        <div class="flex-center gap-8px">
          {hasAuth('system:game:edit') && (
            <NButton
            type="primary"
            ghost
            size="small"
            onClick={() => edit(row.id, row)}
          >
            {$t("common.edit")}
          </NButton>
          )}

          {hasAuth('system:game:remove') && (
            <NPopconfirm onPositiveClick={() => handleDelete(row.gameId)}>
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
  // closeDrawer
} = useTableOperate(data, getData);

async function handleBatchDelete() {
  const response = await fetchDeleteGameList({ gameId: checkedRowKeys.value });
  onBatchDeleted();
}

async function handleDelete(gameId: number) {
  await fetchDeleteGameList({ gameId });
  onDeleted();
}

function edit(id: number, row: Api.Game["game"]) {
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
    <GameSearch
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="getDataByPage"
    />
    <NCard
      :title="$t('page.manage.game.title')"
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
          :show-add="hasAuth('system:game:add')"
          :show-batch-delete="hasAuth('system:game:edit')"
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
        :row-key="(row) => row.gameId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <UserOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
