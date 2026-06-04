<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from "naive-ui";
import { fetchGetServer,fetchDeleteServerregion, fetchGetChannelList, fetchGetWhiteList } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { serverStatusRecord} from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import regionOperateDrawer from "./modules/region-operate-drawer.vue";
import { onMounted, ref, computed } from "vue";
import { useAuth } from '@/hooks/business/auth';

const { hasAuth } = useAuth();

const appStore = useAppStore();

const maxregionIndex = computed(() => {
  if (!data.value || data.value.length === 0) return 0;
  const max = Math.max(...data.value.map(item => Number(item.regionIndex) || 0));
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
  apiFn: fetchGetServer,
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
      title: $t("page.manage.serverregion.id"),
      align: "center",
      width: 64,
    },
    {
      key: "regionName",
      title: $t("page.manage.serverregion.regionName"),
      align: "center",
      minWidth: 50,
    },
    {
      key: "regionIndex",
      title: $t("page.manage.serverregion.regionIndex"),
      align: "center",
      minWidth: 50,
    },
    {
      key: "clientVersionMax",
      title: $t("page.manage.serverregion.clientVersionMax"),
      align: "center",
      minWidth: 50,
    },
    {
      key: "updateDate",
      title: $t("page.manage.serverregion.updateDate"),
      align: "center",
      minWidth: 200,
    },
    {
      key: "maintenance",
      title: $t("page.manage.serverregion.maintenance"),
      align: "center",
      width: 100,
      render: (row) => {
        if (row.enable === null) {
          return null;
        }

        const tagMap: Record<Api.SystemManage.serverType, NaiveUI.ThemeColor> =
          {
            0: "success",
            1: "warning",
          };

        const label = $t(serverStatusRecord[row.maintenance]);

        return <NTag type={tagMap[row.maintenance]}>{label}</NTag>;
      },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 130,
      render: (row) => (
        <div class="flex-center gap-8px">
          {hasAuth('game:region:edit') && (
            <NButton
            type="primary"
            ghost
            size="small"
            onClick={() => edit(row.id, row)}
          >
            {$t("common.edit")}
          </NButton>
          )}

          {hasAuth('game:region:remove') && (
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

const channelNameMap = ref<Record<string, string>>({});
const whiteListNameMap = ref<Record<string, string>>({});

async function getChannelNameMap() {
  try {
    const data = await fetchGetChannelList();
    if (data?.response?.data?.data) {
      channelNameMap.value = data.response.data.data.reduce((acc, item) => {
        acc[item.channelId] = item.channelName;
        return acc;
      }, {});
    }
  } catch (err) {
    console.error("获取渠道列表失败:", err);
  }
}


function handleAdd() {
  const newMaxIndex = maxregionIndex.value + 1;
  const defaultData = {
    regionIndex: newMaxIndex,
  };

  originalHandleAdd(defaultData);
}


onMounted(() => {
  getChannelNameMap();
});

async function handleBatchDelete() {
  const response = await fetchDeleteServerregion({ id: checkedRowKeys.value });
  onBatchDeleted();
}

async function handleDelete(id : number) {

  await fetchDeleteServerregion({ id });
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
      :title="$t('page.manage.serverregion.title')"
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
          :show-add="hasAuth('game:region:add')"
          :show-batch-delete="hasAuth('game:region:remove')"
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
      <regionOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
        :max-region-index="maxregionIndex"
      />
    </NCard>

  </div>
</template>

<style scoped>

</style>
