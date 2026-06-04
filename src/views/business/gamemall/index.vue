<script setup lang="tsx">
import { NTag } from "naive-ui";
import { fetchGetMallTabList,fetchExportMallTab} from "@/service/api";
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
  apiFn: fetchGetMallTabList,
  showTotal: true,
  // immediate: false/,
  apiParams: {
    current: 1,
    size: 15,
  },
  columns: () => [
    {
      key: "id",
      title: "ID",
      align: "center",
      minWidth: 80,
    },
    {
      key: "serverId",
      title: "服务器ID",
      align: "center",
      minWidth: 100,
    },
    {
      key: "sellCategoryId",
      title: "目录ID",
      align: "center",
      minWidth: 120,
    },
    {
      key: "submenuSort",
      title: "页签排序ID",
      align: "center",
      minWidth: 100,
    },
    {
      key: "submenuHide",
      title: "页签是否隐藏",
      align: "center",
      minWidth: 100,
      render: (row) => {
        return h(
          NTag,
          { type: row.submenuHide ? "error" : "success" },
          { default: () => row.submenuHide ? "隐藏" : "显示" }
        );
      },
    },
    {
      key: "categoryName",
      title: "名称",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "shopCategory",
      title: "目录分类",
      align: "center",
      minWidth: 100,
    },
    {
      key: "name",
      title: "名称",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "layoutType",
      title: "类型",
      align: "center",
      minWidth: 100,
    },
    {
      key: "viewType",
      title: "view_type",
      align: "center",
      minWidth: 100,
      render: (row) => {
        return h(
          NTag,
          { type: row.viewType ? "success" : "default" },
          { default: () => row.viewType ? "启用" : "禁用" }
        );
      },
    },
    {
      key: "resetType",
      title: "reset_type",
      align: "center",
      minWidth: 100,
      render: (row) => {
        return h(
          NTag,
          { type: row.resetType ? "success" : "default" },
          { default: () => row.resetType ? "启用" : "禁用" }
        );
      },
    },
    {
      key: "sellCategoryString",
      title: "销售分类字符串",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "shopCategoryString",
      title: "商店页签名称ID",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "viewStartTime",
      title: "开始显示时间",
      align: "center",
      minWidth: 150,
      render: (row) => {
        if (!row.viewStartTime || row.viewStartTime === 0) return "-";
        const timeStr = String(row.viewStartTime);
        if (timeStr.length === 10) {
          return `${timeStr.slice(0, 4)}-${timeStr.slice(4, 6)}-${timeStr.slice(6, 8)} ${timeStr.slice(8, 10)}:00`;
        }
        return timeStr;
      },
    },
    {
      key: "viewEndTime",
      title: "结束显示时间",
      align: "center",
      minWidth: 150,
      render: (row) => {
        if (!row.viewEndTime || row.viewEndTime === 0) return "-";
        const timeStr = String(row.viewEndTime);
        if (timeStr.length === 10) {
          return `${timeStr.slice(0, 4)}-${timeStr.slice(4, 6)}-${timeStr.slice(6, 8)} ${timeStr.slice(8, 10)}:00`;
        }
        return timeStr;
      },
    },
    {
      key: "sellCategoryImage",
      title: "sell_category_image",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row) => row.sellCategoryImage || "-",
    },
    {
      key: "categoryLayoutBg",
      title: "分类布局背景",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row) => row.categoryLayoutBg || "-",
    },
    {
      key: "mpayView",
      title: "mpayview",
      align: "center",
      minWidth: 100,
      render: (row) => {
        return h(
          NTag,
          { type: row.mpayView ? "success" : "default" },
          { default: () => row.mpayView ? "是" : "否" }
        );
      },
    },
    {
      key: "bannerId",
      title: "banner_id",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "bannerFirst",
      title: "banner_first",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "bannerSecond",
      title: "banner_second",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "showAd",
      title: "是否显示广告",
      align: "center",
      minWidth: 100,
      render: (row) => {
        return h(
          NTag,
          { type: row.showAd ? "success" : "default" },
          { default: () => row.showAd ? "是" : "否" }
        );
      },
    },
    {
      key: "imageAd",
      title: "广告图片地址",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row) => row.imageAd || "-",
    },
    {
      key: "titleAd",
      title: "title_ad",
      align: "center",
      minWidth: 100,
    },
    {
      key: "subtitleAd",
      title: "副标题",
      align: "center",
      minWidth: 100,
    },
    {
      key: "textAd",
      title: "内容",
      align: "center",
      minWidth: 100,
    },
    {
      key: "btntextAd",
      title: "按钮文本",
      align: "center",
      minWidth: 120,
    },
    {
      key: "btnimgAd",
      title: "按钮图片地址",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row) => row.btnimgAd || "-",
    },
    {
      key: "hotType",
      title: "热卖",
      align: "center",
      minWidth: 100,
      render: (row) => {
        return h(
          NTag,
          { type: row.hotType ? "error" : "default" },
          { default: () => row.hotType ? "热门" : "普通" }
        );
      },
    },
    {
      key: "recommendType",
      title: "推荐",
      align: "center",
      minWidth: 100,
      render: (row) => {
        return h(
          NTag,
          { type: row.recommendType ? "warning" : "default" },
          { default: () => row.recommendType ? "推荐" : "普通" }
        );
      },
    },
    {
      key: "newType",
      title: "新品",
      align: "center",
      minWidth: 100,
      render: (row) => {
        return h(
          NTag,
          { type: row.newType ? "info" : "default" },
          { default: () => row.newType ? "新品" : "普通" }
        );
      },
    },
    {
      key: "eventType",
      title: "活动类型",
      align: "center",
      minWidth: 100,
      render: (row) => {
        return h(
          NTag,
          { type: row.eventType ? "success" : "default" },
          { default: () => row.eventType ? "活动" : "普通" }
        );
      },
    },
    {
      key: "steptagType",
      title: "阶段",
      align: "center",
      minWidth: 120,
      render: (row) => {
        return h(
          NTag,
          { type: row.steptagType ? "success" : "default" },
          { default: () => row.steptagType ? "是" : "否" }
        );
      },
    },
    {
      key: "discountType",
      title: "折扣",
      align: "center",
      minWidth: 100,
      render: (row) => {
        return h(
          NTag,
          { type: row.discountType ? "error" : "default" },
          { default: () => row.discountType ? "折扣" : "普通" }
        );
      },
    },
  ],
  defaultHiddenKeys: [
    "sellCategoryString",
    "shopCategoryString",
    "sellCategoryImage",
    "categoryLayoutBg",
    "bannerId",
    "bannerFirst",
    "bannerSecond",
    "imageAd",
    "titleAd",
    "subtitleAd",
    "textAd",
    "btntextAd",
    "btnimgAd",
  ],
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
    const response = await fetchExportMallTab({
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
          handleApiResponseError({ data: errorData } as any, "导出商城页签");
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
    link.download = `商城页签_${currentServerId.value}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // @ts-ignore
    window.$message?.success($t("common.exportSuccess"));
  } catch (error) {
    // 使用通用异常处理函数
    handleApiCatchError(error, '导出商城页签');
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
      title="商城页签"
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
          :show-import="true"
          :show-export="true"
          :show-sync="true"
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
