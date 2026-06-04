<script setup lang="tsx">
import {
  fetchGetGsRoleTagsList,
} from "@/service/api/game-manage";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { NButton, NTag } from "naive-ui";
import { gsRoleTagStatusRecord, gsRoleTagTypeRecord } from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import WhiteSelect from "./modules/role-select.vue";
import SendItemsModal from "./modules/send-items-modal.vue";
import DeleteItemsModal from "./modules/delete-items-modal.vue";
import { ref } from "vue";
import { useAuth } from "@/hooks/business/auth";


const { hasAuth } = useAuth();
const appStore = useAppStore();


const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  scrollX,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetGsRoleTagsList,
  showTotal: true,
  apiParams: {
    current: 1,
    size: 10,
  },
  columns: () => [
    {
      key: "roleId",
      title: $t("page.manage.gsRole.roleId"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "tagType",
      title: $t("page.manage.gsRole.tagType"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        if (row.tagType === null || row.tagType === undefined) {
          return "-";
        }
        const typeKey = `${row.tagType}` as keyof typeof gsRoleTagTypeRecord;
        const label = $t(gsRoleTagTypeRecord[typeKey]);
        return <NTag type="info">{label}</NTag>;
      },
    },
    {
      key: "userName",
      title: $t("page.manage.gsRole.userName"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "quota",
      title: $t("page.manage.gsRole.quota"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "reason",
      title: $t("page.manage.gsRole.reason"),
      align: "center",
      minWidth: 200,
      ellipsis: { tooltip: true },
    },
    {
      key: "status",
      title: $t("page.manage.gsRole.status"),
      align: "center",
      minWidth: 100,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        if (row.status === null || row.status === undefined) {
          return "-";
        }
        const statusKey = `${row.status}` as keyof typeof gsRoleTagStatusRecord;
        const label = $t(gsRoleTagStatusRecord[statusKey]);
        // 状态为 0 时显示红色"已失效"，状态为 1 时显示绿色"生效"
        const tagType = statusKey === "0" ? "error" : "success";
        return <NTag type={tagType}>{label}</NTag>;
      },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 240,
      fixed: "right",
      render: (row: any) => (
        <div class="flex items-center justify-center gap-4px flex-wrap">
          {hasAuth('operate:gsGrantRecords:grant:item') ? (
            <NButton type="success" ghost size="small" onClick={() => handleSendItems(row)}>
              {$t('page.manage.gsRole.sendItems')}
            </NButton>
          ) : null}
          {hasAuth('operate:gsGrantRecords:delete:item') ? (
            <NButton type="error" ghost size="small" onClick={() => handleDeleteItems(row)}>
              {$t('page.manage.gsRole.deleteItems')}
            </NButton>
          ) : null}
        </div>
      ),
    },
  ] as any,
  defaultHiddenKeys: []
});

const {
  checkedRowKeys,
} = useTableOperate(data, getData);

function handleSearch(roleId: string, tagType: string, userName: string, status: string | number | null | undefined) {
  const params: any = {
    roleId,
    tagType,
    userName,
    status,
  };
  updateSearchParams(params);
  getData();
}

// 发放物品相关状态
const sendItemsModalVisible = ref(false);
const currentRoleData = ref<any>(null);

// 删除物品相关状态
const deleteItemsModalVisible = ref(false);
const currentDeleteRoleData = ref<any>(null);

// 发放物品
function handleSendItems(row: any) {
  currentRoleData.value = row;
  sendItemsModalVisible.value = true;
}

// 删除物品
function handleDeleteItems(row: any) {
  currentDeleteRoleData.value = row;
  deleteItemsModalVisible.value = true;
}

</script>

<template>
  <div class="flex-col gap-16px lt-sm:overflow-auto">
    <whiteSelect
      :model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />

    <NCard
      title="道具发放列表"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :loading="loading"
          @refresh="getData"
          :show-add="false"
          :show-batch-delete="false"
        />
      </template>

      <NDataTable
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="scrollX"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />

      <!-- 发放物品弹窗 -->
      <SendItemsModal
        v-model:visible="sendItemsModalVisible"
        :row-data="currentRoleData"
        @submitted="getData"
      />

      <!-- 删除物品弹窗 -->
      <DeleteItemsModal
        v-model:visible="deleteItemsModalVisible"
        :row-data="currentDeleteRoleData"
        @submitted="getData"
      />
    </NCard>
  </div>
</template>

<style scoped>
</style>
