<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from "naive-ui";
import { fetchGetNoticeList, fetchDeleteNotice } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import {
  serverStatusNotice,
  serverStatusNoticeLabel,
  serverStatusNoticeStatus,
  serverNoticeExpiredStatus,
} from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import noticeOperateDrawer from "./modules/notice-operate-drawer.vue";
import noticeSearch from "./modules/notice-search.vue";
import { ref, onMounted } from "vue";
import { format } from "date-fns";
import { useAuth } from "@/hooks/business/auth";

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
  updateSearchParams,
  resetSearchParams,
} = useTable({
  apiFn: fetchGetNoticeList,
  showTotal: true,
  apiParams: {
    current: 1,
    size: 10,
    filterParam: 'channel'
  },
  columns: () => [
    {
      type: "selection",
      align: "center",
      width: 48,
    },
    {
      key: "noticeIndex",
      title: $t("page.manage.norice.noticeIndex"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "noticeName",
      title: $t("page.manage.norice.noticeName"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "noticeType",
      title: $t("page.manage.norice.noticeTypeLabel"),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        // 根据 channelCode 和 serverId 判断公告类型
        if (row.channelCode) {
          return <NTag type="info">{$t('page.manage.norice.noticeTypeOptions.channel')}</NTag>;
        } else if (row.serverId) {
          return <NTag type="success">{$t('page.manage.norice.noticeTypeOptions.server')}</NTag>;
        }
        return '-';
      },
    },
    {
      key: "channelName",
      title: $t("page.manage.norice.channelOrServer"),
      align: "center",
      minWidth: 150,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        // 显示渠道名称或区服名称
        if (row.channelCode) {
          return row.channelName || row.channelCode || '-';
        } else if (row.serverId) {
          return row.serverName || row.serverId || '-';
        }
        return '-';
      },
    },
    {
      key: "startDate",
      title: $t("page.manage.norice.createDate"),
      align: "center",
      minWidth: 100,
      render: (row) => {
        return format(new Date(row.startDate), "yyyy-MM-dd HH:mm:ss");
      },
    },
    {
      key: "endDate",
      title: $t("page.manage.norice.updateDate"),
      align: "center",
      minWidth: 100,
      render: (row) => {
        return format(new Date(row.endDate), "yyyy-MM-dd HH:mm:ss");
      },
    },
    {
      key: "enable",
      title: $t("page.manage.norice.enable"),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        if (row.enable === null || row.enable === undefined) {
          return null;
        }

        // 处理布尔值，转换为对应的字符串键
        const enableKey = row.enable === true ? '1' : '0';  // true -> '1'(启用), false -> '0'(停用)

        const tagMap: Record<string, NaiveUI.ThemeColor> = {
          '0': "error",   // 停用 → 红色
          '1': "success", // 启用 → 绿色
        };

        const label = $t(serverStatusNoticeStatus[enableKey]);

        return <NTag type={tagMap[enableKey]}>{label}</NTag>;
      },
    },
    {
      key: "expired",
      title: $t("page.manage.norice.expired"),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        if (row.expired === null || row.expired === undefined) {
          return null;
        }

        // 处理布尔值，转换为对应的字符串键
        const expiredKey = String(row.expired); // true -> 'true'(已过期), false -> 'false'(有效)

        const tagMap: Record<string, NaiveUI.ThemeColor> = {
          'true': "error",   // 已过期 → 红色
          'false': "success", // 有效 → 绿色
        };

        const label = $t(serverNoticeExpiredStatus[expiredKey]);

        return <NTag type={tagMap[expiredKey]}>{label}</NTag>;
      },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 130,
      render: (row) => (
        <div class="flex-center gap-8px">
          {hasAuth("operate:notice:edit") && (
            <NButton
              type="primary"
              ghost
              size="small"
              onClick={() => edit(row.id, row)}
            >
              {$t("common.edit")}
            </NButton>
          )}

          {hasAuth("operate:notice:remove") && (
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
  openDrawer,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted,
} = useTableOperate(data, getData);

function handleAdd() {
  drawerVisible.value = true;
  operateType.value = "add";
}

async function handleBatchDelete() {
  const response = await fetchDeleteNotice({
    id: checkedRowKeys.value,
  });
  onBatchDeleted();
}

async function handleDelete(id: number) {
  await fetchDeleteNotice({ id });
  onDeleted();
}

function edit(id: number, row: any) {
  const editData = {
    ...row,
  };
  handleEdit(id, editData);
}

onMounted(() => {
  data.value = [];
});
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <noticeSearch v-model:model="searchParams" @search="getDataByPage" />

    <NCard
      :title="$t('page.manage.norice.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          :show-add="hasAuth('operate:notice:add')"
          :show-batch-delete="hasAuth('operate:notice:remove')"
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

      <noticeOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        :notice-list="data"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>


<style scoped></style>
