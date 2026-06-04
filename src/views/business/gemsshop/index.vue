<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NModal, NSelect, NCard, NDataTable } from "naive-ui";
import { fetchGemsShopList, fetchDeleteGemsShop, fetchExportGemsShop, fetchSyncGemsShop, fetchGetServerList } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { limitTypeRecord, saleTypeRecord,productSaleStatusRecord,discountRateRecord } from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';
import GemsShopOperateDrawer from "./modules/gemsshop-operate-drawer.vue";
import GemsImportModal from "./modules/gemsshop-import-modal.vue";
import GemsshopSearch from "./modules/gemsshop-search.vue";
import { ref, onMounted, h } from "vue";
import { useAuth } from "@/hooks/business/auth";
import { format } from 'date-fns';

const { hasAuth } = useAuth();
const appStore = useAppStore();

const importModalVisible = ref(false);
const syncModalVisible = ref(false);
const selectedServerIds = ref<string[]>([]);
const serverOptions = ref<any[]>([]);
const gemsshopSearchRef = ref();
const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  loading,
  mobilePagination,
  scrollX,
  searchParams,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGemsShopList,
  showTotal: true,
  // immediate: false
  apiParams: {
    current: 1,
    size: 10,
    discountPrice: "",
    operator: "",
  },
  columns: () => [
    {
      type: "selection",
      align: "center",
      width: 48,
    },
    {
      key: "serverId",
      title: $t("page.manage.Gems.serverId"),
      align: "center",
      minWidth: 120,
    },
    {
      key: "serverName",
      title: $t("page.manage.Gems.serverName"),
      align: "center",
      minWidth: 150,
    },
    {
      key: "id",
      title: $t("page.manage.Gems.id"),
      align: "center",
      minWidth: 120,
    },

    {
      key: "nameId",
      title: $t("page.manage.Gems.nameId"),
      align: "center",
      minWidth: 120,
    },

    {
      key: "price",
      title: $t("page.manage.Gems.price"),
      align: "center",
      minWidth: 60,
    },

      {
      key: "discountPrice",
      title: $t("page.manage.Gems.discountPrice"),
      align: "center",
      minWidth: 60,
      ellipsis: { tooltip: true },
      },

    {
      key: "limitCount",
      title: $t("page.manage.Gems.limitCount"),
      align: "center",
      minWidth: 60,
      ellipsis: { tooltip: true },
    },
    {
      key: "requireLevel",
      title: $t("page.manage.Gems.requireLevel"),
      align: "center",
      minWidth: 60,
    },
    {
      key: "saleType",
      title: $t("page.manage.Gems.saleType"),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        if (row.saleType === null || row.saleType === undefined) {
          return null;
        }
        const saleType = String(row.saleType);
        return h(
          "span",
          {},
          $t(
            saleTypeRecord[saleType] ||
              "page.manage.Gems.saletype.none"
          )
        );
      },
    },
    {
      key: "limitType",
      title: $t("page.manage.Gems.limitType"),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
      render: (row: any) => {
      const i18nKey = limitTypeRecord[row.limitType] ||  "page.manage.Gems.limittype.none";
      return $t(i18nKey);
    },
    },
    {
      key: "saleWeekType",
      title: $t("page.manage.Gems.saleWeekType"),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
            render: (row: any) => {
        // 收集所有开放的日期
        const activeDays: string[] = [];
        const dayMap = {
          saleMonday: "monday",
          saleTuesday: "tuesday",
          saleWednesday: "wednesday",
          saleThursday: "thursday",
          saleFriday: "friday",
          saleSaturday: "saturday",
          saleSunday: "sunday"
        };

        Object.entries(dayMap).forEach(([key, i18nKey]) => {
          if (row[key] === true) {
            activeDays.push($t(`page.manage.Gems.weekdays.${i18nKey}` as any));
          }
        });

        if (activeDays.length === 0) {
          return $t("page.manage.Gems.weekdays.notSet");
        }

        if (activeDays.length === 7) {
          return $t("page.manage.Gems.weekdays.allWeek");
        }

        return activeDays.join(", ");
      },
    },
    {
      key: "hideInClient",
      title: $t("page.manage.Gems.hideinclient"),
      align: "center",
      minWidth: 120,
      render: (row:any) => {
        if (row.hideInClient === null) {
          return null;
        }

        const tagMap: Record<Api.SystemManage.HideInClient, NaiveUI.ThemeColor> = {
          'true': "error",
          'false': "success",
        };

        const label = $t(productSaleStatusRecord[row.hideInClient]);

        return <NTag type={tagMap[row.hideInClient]}>{label}</NTag>;
      },
      ellipsis: { tooltip: true },
    },
    {
      key: "discountRate",
      title: $t("page.manage.Gems.discountRate"),
      align: "center",
      minWidth: 120,
      render: (row:any) => {
        if (row.discountRate === null) {
          return null;
        }

        const tagMap: Record<Api.SystemManage.HideInClient, NaiveUI.ThemeColor> = {
          '1': "success",
          '0': "error",
        };

        const label = $t(discountRateRecord[row.discountRate]);

        return <NTag type={tagMap[row.discountRate]}>{label}</NTag>;
      },
    },
    {
      key: "sellCategoryOrder",
      title: $t("page.manage.Gems.sellCategoryOrder"),
      align: "center",
      minWidth: 120,
    },
    {
      key: "operator",
      title: $t("page.manage.Gems.operator"),
      align: "center",
      minWidth: 120,
    },
    {
      key: "saleStartData",
      title: $t("page.manage.Gems.saleStartData"),
      align: "center",
      minWidth: 130,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return row.saleStartData
        ? format(new Date(row.saleStartData * 1000), 'yyyy-MM-dd HH:mm:ss')
        : '';
      },
    },
    {
      key: "saleCloseData",
      title: $t("page.manage.Gems.saleCloseData"),
      align: "center",
      minWidth: 130,
      ellipsis: { tooltip: true },
      render: (row: any) => {
      return row.saleCloseData
      ? format(new Date(row.saleCloseData * 1000), 'yyyy-MM-dd HH:mm:ss')
      : '-';
      },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 130,
      render: (row: any) => (
        <div class="flex-center gap-8px">
          {hasAuth('game:gemsShop:edit') && (
          <NButton
            type="primary"
            ghost
            size="small"
            onClick={() => edit(row.id, row)}
          >
            {$t("common.edit")}
          </NButton>
          )}

          {hasAuth('game:gemsShop:remove') && (
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
  // closeDrawer
} = useTableOperate(data, getData);

function handleSearch(serverId: string, discountPrice: string, operator: string, searchTime: string) {
  currentServerId.value = serverId;
  const params: any = {
    serverId,
    discountPrice,
    operator,
    searchTime,
  };
  updateSearchParams(params);
  getData();
}

async function handleBatchDelete() {
  const deletePromises = checkedRowKeys.value.map((id: string) => {
    return fetchDeleteGemsShop({ id: Number(id) });
  });
  await Promise.all(deletePromises);
  onBatchDeleted();
}

async function handleDelete(id: number) {
  await fetchDeleteGemsShop({ id });
  onDeleted();
}

function edit(id: number, row: any) {
  const editData = {
    ...row,
  };

  handleEdit(id, editData);
}

const currentServerId = ref("");

// 获取服务器列表
async function loadServerData() {
  try {
    const responseWrapper = await fetchGetServerList();
    let formattedOptions: any[] = [];

    if (
      responseWrapper &&
      responseWrapper.response &&
      responseWrapper.response.data
    ) {
      const serverListData = responseWrapper.response.data;
      if (Array.isArray(serverListData)) {
        const serverGroups = serverListData.map(
          (group: any) => ({
            type: "group",
            label: group.groupName || `Group ${group.id}`,
            key: group.id,
            children: Array.isArray(group.serverItems)
              ? group.serverItems.map((server: any) => ({
                  value: server.serverId,
                  label: `${server.serverId}-${
                    server.serverName || "Unknown Server"
                  }`,
                }))
              : [],
          })
        );
        formattedOptions = formattedOptions.concat(serverGroups);
      }
    }
    serverOptions.value = formattedOptions;
  } catch (error) {
    serverOptions.value = [];
    console.error("Error during fetch server list API call:", error);
  }
}

// 处理同步 - 打开弹框
async function handleSync() {
  // 加载服务器列表
  await loadServerData();

  // 打开弹框
  syncModalVisible.value = true;
}

// 确认同步
async function confirmSync() {
  // 检查是否选择了区服
  if (!selectedServerIds.value || selectedServerIds.value.length === 0) {
    // @ts-ignore
    window.$message?.warning("请选择需要同步的区服");
    return;
  }

  try {
    window.$message?.info($t("common.exporting"));

    const serverIds = selectedServerIds.value.map(id => Number(id));

    const response = await fetchSyncGemsShop(serverIds);

    if (handleApiResponseError(response)) {
      return;
    }

    window.$message?.success($t("common.syncSuccess"));

    getData();

    syncModalVisible.value = false;
    selectedServerIds.value = [];
  } catch (error) {
    handleApiCatchError(error, '同步服务器数据');
  }
}

// 初始化时加载服务器列表
onMounted(() => {
  loadServerData();
});

function handleAddWithChannel() {
  if (!currentServerId.value) {
    window.$message?.warning($t("page.manage.Gems.pleaseSelectServer"));
    return;
  }
  handleAdd({ serverId: currentServerId.value });
}

// 处理导入文件
function handleImport() {
  importModalVisible.value = true;
}

// 处理导出
async function handleExport() {
  try {
    // @ts-ignore
    window.$message?.info($t("common.exportingData"));

    // 调用导出API - 如果没有选择服务器则传空值导出全部
    const response = await fetchExportGemsShop({
      serverId: currentServerId.value || undefined
    });

    // 对于文件下载，直接处理blob响应，不使用通用错误处理
    const blob = (response as any)?.data || (response as any)?.response?.data || response;

    // 检查是否获取到有效的blob数据
    if (!blob || (blob instanceof Blob && blob.size === 0)) {
      // @ts-ignore
      window.$message?.error($t("common.exportFailed") + ": 没有数据");
      return;
    }

    // 如果响应不是blob，尝试创建blob
    let fileBlob;
    if (blob instanceof Blob) {
      fileBlob = blob;
    } else {
      // 创建blob对象
      fileBlob = new Blob([blob], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    }

    // 检查文件大小
    if (fileBlob.size === 0) {
      // @ts-ignore
      window.$message?.warning($t("common.exportFailed") + ": 没有数据");
      return;
    }

    // 创建下载链接
    const url = window.URL.createObjectURL(fileBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `元宝商城列表_${currentServerId.value || 'all'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // @ts-ignore
    window.$message?.success($t("common.exportSuccess"));
  } catch (error) {
    // 使用通用异常处理函数
    handleApiCatchError(error, '导出商品');
  }
}
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <GemsshopSearch
      ref="gemsshopSearchRef"
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />
    <NCard
      :title="$t('page.manage.Gems.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @add="handleAddWithChannel"
          @delete="handleBatchDelete"
          @refresh="getData"
          @import="handleImport"
          @export="handleExport"
          @sync="handleSync"
          :show-add="hasAuth('game:gemsShop:add')"
          :show-batch-delete="hasAuth('game:gemsShop:remove')"
          :show-import="hasAuth('game:gemsShop:import')"
          :show-export="hasAuth('game:gemsShop:export')"
          :show-export-confirm="true"
          :showsynv="hasAuth('game:gemsShop:sync')"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="2400"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <GemsImportModal
        v-model:visible="importModalVisible"
        :server-id="currentServerId || undefined"
        @success="getData"
      />

      <GemsShopOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        :server-id="currentServerId"
        @submitted="getDataByPage"
      />

      <NModal
        v-model:show="syncModalVisible"
        preset="dialog"
        :title="$t('page.manage.Gems.selectServer')"
        style="width: 600px"
        class="sync-modal"
      >
        <div class="p-6">
          <div class="info-section p-4 mb-6">
            <div class="flex items-center mb-2">
              <icon-mdi-information class="mr-2 text-blue-600 text-lg" />
              <span class="font-medium text-gray-800"
                >{{ $t('page.manage.Gems.selectServer') }}</span
              >
            </div>
            <div class="text-sm text-gray-600 ml-6">
              {{ $t('page.manage.Gems.selectServerDesc') }}
            </div>
          </div>

          <NSelect
            v-model:value="selectedServerIds"
            multiple
            filterable
            :placeholder="$t('page.manage.Gems.selectServerTips')"
            :options="serverOptions"
            :max-tag-count="3"
            clearable
            size="large"
            class="w-full"
          />
        </div>

        <template #action>
          <div class="flex gap-2">
            <NButton @click="syncModalVisible = false" size="medium">
              {{ $t('common.cancel') }}
            </NButton>
            <NButton
              type="primary"
              @click="confirmSync"
              :disabled="selectedServerIds.length === 0"
              size="medium"
            >
              <template #icon>
                <icon-mdi-sync />
              </template>
              {{ $t('common.confirm') }}
            </NButton>
          </div>
        </template>
      </NModal>
    </NCard>
  </div>
</template>

<style scoped>
.sync-modal :deep(.n-dialog) {
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.sync-modal :deep(.n-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.sync-modal :deep(.n-select) {
  border-radius: 8px;
}

.sync-modal :deep(.n-select .n-base-selection) {
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  transition: all 0.2s ease;
}

.sync-modal :deep(.n-select .n-base-selection:hover) {
  border-color: #3b82f6;
}

.sync-modal :deep(.n-select .n-base-selection.n-base-selection--focused) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.sync-modal :deep(.n-button) {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.sync-modal :deep(.n-button--primary) {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border: none;
}

.sync-modal :deep(.n-button--primary:hover) {
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.info-section {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
}
</style>
