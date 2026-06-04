<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from "naive-ui";
import { fetchGetServerGroup,fetchDeleteServerGroup } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { serverStatusgroupTest} from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import GroupOperateDrawer from './modules/group-operate-drawer.vue';
import { ref, computed } from 'vue';
import { useAuth } from '@/hooks/business/auth';

const { hasAuth } = useAuth();

const appStore = useAppStore();

const maxGroupIndex = computed(() => {
  if (!data.value || data.value.length === 0) return 0;
  const max = Math.max(...data.value.map(item => Number(item.groupIndex) || 0));
  return max;
});

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
  apiFn: fetchGetServerGroup,
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
      title: $t("page.manage.servergroup.gameId"),
      align: "center",
      width: 64,
    },
    {
      key: "groupIndex",
      title: $t("page.manage.servergroup.groupIndex"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "groupName",
      title: $t("page.manage.servergroup.groupName"),
      align: "center",
      width: 100,
    },
    {
      key: "groupTag",
      title: $t("page.manage.servergroup.groupTag"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "groupTest",
      title: $t("page.manage.servergroup.groupTest"),
      align: "center",
      width: 120,
      render: (row) => {
        if (row.groupTest === null) {
          return null;
        }

        const tagMap: Record<Api.SystemManage.servergroupTest, NaiveUI.ThemeColor> =
          {
            0: "success",
            1: "error",
          };

        const label = $t(serverStatusgroupTest[row.groupTest]);

        return <NTag type={tagMap[row.groupTest]}>{label}</NTag>;
      },
    },
    {
      key: "createDate",
      title: $t("page.manage.servergroup.createDate"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "updateDate",
      title: $t("page.manage.servergroup.updateDate"),
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
          {hasAuth('game:group:edit') && (
            <NButton
            type="primary"
            ghost
            size="small"
            onClick={() => edit(row.id, row)}
          >
            {$t("common.edit")}
          </NButton>
          )}
          {hasAuth('game:group:remove') && (
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
  handleAdd: originalHandleAdd,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted,
  // closeDrawer
} = useTableOperate(data, getData);

function handleAdd() {
  const newMaxIndex = maxGroupIndex.value + 1;
  const defaultData = {
    groupIndex: newMaxIndex,
  };

  originalHandleAdd(defaultData);
}

async function handleBatchDelete() {
  const response = await fetchDeleteServerGroup({ id: checkedRowKeys.value });
  onBatchDeleted();
}

async function handleDelete(id : number) {
  await fetchDeleteServerGroup({ id });
  onDeleted();
}

function edit(id: number, row: Api.channel["game"]) {
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
    <NCard
      :title="$t('page.manage.servergroup.title')"
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
          :show-add="hasAuth('game:group:add')"
          :show-batch-delete="hasAuth('game:group:remove')"
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
      <GroupOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        :max-index="maxGroupIndex"
        @submitted="getDataByPage"
      />

    </NCard>
  </div>
</template>

<style scoped></style>
