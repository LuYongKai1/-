<script setup lang="tsx">
import { NTag } from "naive-ui";
import { fetchGetStoreList, fetchImportReward, fetchExportReward, fetchSyncReward } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';
import { ref, onMounted, h } from "vue";
import ProductsSearch from "./modules/products-search.vue";
import ProductsImportModal from "./modules/products-import-modal.vue";
import RewardSyncModal from "./modules/reward-sync-modal.vue";
import { useAuth } from "@/hooks/business/auth";
import { format } from 'date-fns';
const { hasAuth } = useAuth();
const appStore = useAppStore();

const importModalVisible = ref(false);
const syncModalVisible = ref(false);
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
  apiFn: fetchGetStoreList,
  showTotal: true,
  // immediate: false/,
  apiParams: {
    current: 1,
    size: 15,
  },
  columns: () => [
    {
      key: "id",
      title: $t("page.manage.cashshop.id"),
      align: "center",
      minWidth: 80,
    },
    {
      key: "serverId",
      title: $t("page.manage.cashshop.serverId"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "cashshopgroupId",
      title: $t("page.manage.cashshop.cashshopgroupId"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "name",
      title: $t("page.manage.cashshop.name"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "itemMaintype",
      title: $t("page.manage.cashshop.itemMaintype"),
      align: "center",
      minWidth: 120,
    },
    {
      key: "itemType",
      title: $t("page.manage.cashshop.itemType"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "itemId",
      title: $t("page.manage.cashshop.itemId"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "count",
      title: $t("page.manage.cashshop.count"),
      align: "center",
      minWidth: 100,
    },
  ],
  defaultHiddenKeys: [],
});

const {
  checkedRowKeys,
} = useTableOperate(data, getData);

function handleSearch(serverId: string) {
  currentServerId.value = serverId;
  const params: any = {
    serverId,
  };
  updateSearchParams(params);
  getData();
}

// 当前选中的服务器ID
const currentServerId = ref("");

// 处理导入文件
function handleImport() {
  importModalVisible.value = true;
}

// 处理同步
function handleSync() {
  syncModalVisible.value = true;
}

// 处理导出
async function handleExport() {
  // 验证是否选择了服务器
  if (!currentServerId.value) {
    // @ts-ignore
    window.$message?.error("请先选择服务器");
    return;
  }

  try {
    // @ts-ignore
    window.$message?.info($t("common.exportingData"));

    // 调用导出API
    const response = await fetchExportReward({
      serverId: currentServerId.value
    });

    // 对于文件下载，直接处理blob响应
    const blob = (response as any)?.data || (response as any)?.response?.data || response;

    // 检查是否获取到有效的blob数据
    if (!blob) {
      // @ts-ignore
      window.$message?.error($t("common.exportFailed") + ": 没有数据");
      return;
    }

    // 如果blob是JSON类型，说明是错误响应
    if (blob instanceof Blob) {
      // 检查blob类型，如果是JSON说明是错误
      if (blob.type === 'application/json' || blob.type.includes('json')) {
        const text = await blob.text();
        try {
          const errorData = JSON.parse(text);
          // 使用通用错误处理
          handleApiResponseError({ data: errorData } as any, "导出发放商城");
          return;
        } catch (e) {
          // 如果解析失败，显示原始文本
          // @ts-ignore
          window.$message?.error("导出失败: " + text);
          return;
        }
      }

      // 检查文件大小
      if (blob.size === 0) {
        // @ts-ignore
        window.$message?.warning($t("common.exportFailed") + ": 没有数据");
        return;
      }
    }

    // 如果响应不是blob，尝试创建blob
    let fileBlob;
    if (blob instanceof Blob) {
      fileBlob = blob;
    } else {
      // 创建CSV blob对象
      fileBlob = new Blob([blob], {
        type: 'text/csv;charset=utf-8;'
      });
    }

    // 创建下载链接
    const url = window.URL.createObjectURL(fileBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `发放商城_${currentServerId.value}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // @ts-ignore
    window.$message?.success($t("common.exportSuccess"));
  } catch (error) {
    // 使用通用异常处理函数
    handleApiCatchError(error, '导出发放商城');
  }
}

</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <ProductsSearch
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />
    <NCard
      :title="$t('page.manage.cashshop.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :loading="loading"
          @refresh="getData"
          @sync="handleSync"
          @import="handleImport"
          @export="handleExport"
          :show-import="hasAuth('game:reward:import')"
          :show-export="hasAuth('game:reward:export')"
          :show-sync="hasAuth('game:reward:sync')"
          :show-export-confirm="true"
          :show-add="false"
          :show-delete="false"
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
        :row-key="(row) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <ProductsImportModal
        v-model:visible="importModalVisible"
        @success="getData"
      />
      <RewardSyncModal
        :visible="syncModalVisible"
        @update:visible="syncModalVisible = $event"
        @success="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
