<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NModal, NTabs, NTabPane, NSpace } from "naive-ui";
import {
  fetchGetActivityImages,
  fetchDeleteActivityImages,
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useTable, useTableOperate } from "@/hooks/common/table";
import ActivityOperateDrawer from "./modules/activityimg-operate-drawer.vue";
import GraphicGuideOperateDrawer from "./modules/graphicguide-operate-drawer.vue";
import { ref, onMounted, watch, computed } from "vue";
import { format } from "date-fns";
import { useAuth } from "@/hooks/business/auth";

const { hasAuth } = useAuth();
const appStore = useAppStore();

// Tab 页签控制
const activeTab = ref('activity');

const previewVisible = ref(false);
const previewImageUrl = ref("");

function handleImageClick(url: string) {
  previewImageUrl.value = url;
  previewVisible.value = true;
}

// ========== 独立定义 checkedRowKeys ==========
const activityCheckedRowKeys = ref<(string | number)[]>([]);
const graphicCheckedRowKeys = ref<(string | number)[]>([]);

// ========== 活动公告列表 ==========
const {
  columns: activityColumns,
  columnChecks: activityColumnChecks,
  data: activityData,
  getData: getActivityData,
  getDataByPage: getActivityDataByPage,
  loading: activityLoading,
  mobilePagination: activityPagination,
  searchParams: activitySearchParams,
  updateSearchParams: updateActivitySearchParams,
} = useTable({
  apiFn: fetchGetActivityImages,
  showTotal: true,
  apiParams: { current: 1, size: 10, imageType: 1 },
  columns: () => [
    {
      type: "selection",
      align: "center",
      width: 48,
    },
    {
      key: "sorter",
      title: "排序",
      align: "center",
      minWidth: 80
    },
    {
      key: "name",
      title: $t("page.manage.activityimages.name"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "url",
      title: $t("page.manage.activityimages.url"),
      align: "center",
      minWidth: 120,
      render: (row) => (
        <div class="flex-center">
          <img
            src={row.url}
            alt={row.name}
            style="max-width: 100px; max-height: 60px; object-fit: contain; cursor: pointer;"
            onClick={() => handleImageClick(row.url)}
          />
        </div>
      ),
    },
    {
      key: "serverNames",
      title: $t("page.manage.activityimages.serverNames"),
      align: "center",
      minWidth: 100,
      ellipsis: { tooltip: true },
      render: (row) => {
        if (!row.serverNames) return null;
        let servers: string[] = [];
        if (Array.isArray(row.serverNames)) {
          servers = row.serverNames;
        } else if (typeof row.serverNames === "string") {
          servers = row.serverNames.split(/[\s,\n]+/).filter(Boolean);
        }
        return servers.join(", ");
      },
    },
    {
      key: "startTime",
      title: $t("page.manage.activityimages.startTime"),
      align: "center",
      minWidth: 100,
      render: (row) => {
        return format(new Date(row.startTime), "yyyy-MM-dd HH:mm:ss");
      },
    },
    {
      key: "endTime",
      title: $t("page.manage.activityimages.endTime"),
      align: "center",
      minWidth: 100,
      render: (row) => {
        return format(new Date(row.endTime), "yyyy-MM-dd HH:mm:ss");
      },
    },
    {
      key: "expired",
      title: "过期状态",
      align: "center",
      minWidth: 100,
      render: (row) => {
        const isExpired = row.expired;
        return (
          <NTag
            type={isExpired ? "error" : "success"}
            size="small"
          >
            {isExpired ? "已过期" : "未过期"}
          </NTag>
        );
      },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 130,
      render: (row) => (
        <div class="flex-center gap-8px">
          {hasAuth("operate:activityImage:edit") && (
            <NButton
              type="primary"
              ghost
              size="small"
              onClick={() => handleActivityEdit(row.id, row)}
            >
              {$t("common.edit")}
            </NButton>
          )}

          {hasAuth("operate:activityImage:remove") && (
            <NPopconfirm onPositiveClick={() => handleActivityDelete(row.id)}>
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

// 活动公告的操作状态
const {
  drawerVisible: activityDrawerVisible,
  operateType: activityOperateType,
  editingData: activityEditingData,
  handleEdit: handleActivityEdit,
  onBatchDeleted: onActivityBatchDeleted,
  onDeleted: onActivityDeleted,
} = useTableOperate(activityData, getActivityData);

// ========== 图文引导列表 ==========
const {
  columns: graphicColumns,
  columnChecks: graphicColumnChecks,
  data: graphicData,
  getData: getGraphicData,
  getDataByPage: getGraphicDataByPage,
  loading: graphicLoading,
  mobilePagination: graphicPagination,
  searchParams: graphicSearchParams,
  updateSearchParams: updateGraphicSearchParams,
} = useTable({
  apiFn: fetchGetActivityImages,
  showTotal: true,
  apiParams: { current: 1, size: 10, imageType: 2 },
  columns: () => [
    {
      type: "selection",
      align: "center",
      width: 48,
    },
    {
      key: "sorter",
      title: "排序",
      align: "center",
      minWidth: 80
    },
    {
      key: "name",
      title: $t("page.manage.activityimages.name"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "url",
      title: $t("page.manage.activityimages.url"),
      align: "center",
      minWidth: 120,
      render: (row) => (
        <div class="flex-center">
          <img
            src={row.url}
            alt={row.name}
            style="max-width: 100px; max-height: 60px; object-fit: contain; cursor: pointer;"
            onClick={() => handleImageClick(row.url)}
          />
        </div>
      ),
    },
    {
      key: "action",
      title: "行为配置",
      align: "center",
      minWidth: 80,
      render: (row) => {
        return <span>{row.action ?? '-'}</span>;
      },
    },
    {
      key: "serverNames",
      title: $t("page.manage.activityimages.serverNames"),
      align: "center",
      minWidth: 100,
      ellipsis: { tooltip: true },
      render: (row) => {
        if (!row.serverNames) return null;
        let servers: string[] = [];
        if (Array.isArray(row.serverNames)) {
          servers = row.serverNames;
        } else if (typeof row.serverNames === "string") {
          servers = row.serverNames.split(/[\s,\n]+/).filter(Boolean);
        }
        return servers.join(", ");
      },
    },
    {
      key: "startTime",
      title: $t("page.manage.activityimages.startTime"),
      align: "center",
      minWidth: 100,
      render: (row) => {
        return format(new Date(row.startTime), "yyyy-MM-dd HH:mm:ss");
      },
    },
    {
      key: "endTime",
      title: $t("page.manage.activityimages.endTime"),
      align: "center",
      minWidth: 100,
      render: (row) => {
        return format(new Date(row.endTime), "yyyy-MM-dd HH:mm:ss");
      },
    },
    {
      key: "expired",
      title: "过期状态",
      align: "center",
      minWidth: 100,
      render: (row) => {
        const isExpired = row.expired;
        return (
          <NTag
            type={isExpired ? "error" : "success"}
            size="small"
          >
            {isExpired ? "已过期" : "未过期"}
          </NTag>
        );
      },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 130,
      render: (row) => (
        <div class="flex-center gap-8px">
          {hasAuth("operate:activityImage:edit") && (
            <NButton
              type="primary"
              ghost
              size="small"
              onClick={() => handleGraphicEdit(row.id, row)}
            >
              {$t("common.edit")}
            </NButton>
          )}

          {hasAuth("operate:activityImage:remove") && (
            <NPopconfirm onPositiveClick={() => handleGraphicDelete(row.id)}>
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

// 图文引导的操作状态
const {
  drawerVisible: graphicDrawerVisible,
  operateType: graphicOperateType,
  editingData: graphicEditingData,
  handleEdit: handleGraphicEdit,
  onBatchDeleted: onGraphicBatchDeleted,
  onDeleted: onGraphicDeleted,
} = useTableOperate(graphicData, getGraphicData);

// ========== 各列表独立的方法 ==========
// 活动公告操作方法
function handleActivityAdd() {
  activityDrawerVisible.value = true;
  activityOperateType.value = "add";
}

async function handleActivityBatchDelete() {
  const response = await fetchDeleteActivityImages({
    id: activityCheckedRowKeys.value,
  });
  onActivityBatchDeleted();
}

async function handleActivityDelete(id: number) {
  await fetchDeleteActivityImages({ id });
  onActivityDeleted();
}

// 图文引导操作方法
function handleGraphicAdd() {
  graphicDrawerVisible.value = true;
  graphicOperateType.value = "add";
}

async function handleGraphicBatchDelete() {
  const response = await fetchDeleteActivityImages({
    id: graphicCheckedRowKeys.value,
  });
  onGraphicBatchDeleted();
}

async function handleGraphicDelete(id: number) {
  await fetchDeleteActivityImages({ id });
  onGraphicDeleted();
}

// 修复 currentTableConfig 计算属性
const currentTableConfig = computed(() => {
  if (activeTab.value === 'activity') {
    return {
      columns: activityColumns,
      columnChecks: activityColumnChecks.value,
      data: activityData,
      loading: activityLoading.value,
      pagination: activityPagination,
      checkedRowKeys: activityCheckedRowKeys.value || [],
      handleAdd: handleActivityAdd,
      handleBatchDelete: handleActivityBatchDelete,
      handleRefresh: getActivityData,
      scrollX: 962
    };
  } else {
    return {
      columns: graphicColumns,
      columnChecks: graphicColumnChecks.value,
      data: graphicData,
      loading: graphicLoading.value,
      pagination: graphicPagination,
      checkedRowKeys: graphicCheckedRowKeys.value || [],
      handleAdd: handleGraphicAdd,
      handleBatchDelete: handleGraphicBatchDelete,
      handleRefresh: getGraphicData,
      scrollX: 1050
    };
  }
});

// 监听 Tab 切换，重新加载对应数据
watch(activeTab, (newTab) => {
  if (newTab === 'activity') {
    activityCheckedRowKeys.value = [];
    getActivityData();
  } else {
    graphicCheckedRowKeys.value = [];
    getGraphicData();
  }
});

onMounted(() => {
  getActivityData();
});
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard :bordered="false" size="small" class="sm:flex-1-hidden card-wrapper">
      <template #header>
        <div class="flex items-center gap-16px">
          <NTabs v-model:value="activeTab" type="line" size="small">
            <NTabPane name="activity" :tab="$t('page.manage.activityimages.announceTitle')" />
            <NTabPane name="graphic" :tab="$t('page.manage.activityimages.graphicGuideTitle')" />
          </NTabs>
        </div>
      </template>

      <template #header-extra>
        <NSpace>
          <TableHeaderOperation
            v-model:columns="currentTableConfig.columnChecks"
            :disabled-delete="(currentTableConfig.checkedRowKeys && currentTableConfig.checkedRowKeys.length === 0) || false"
            :loading="currentTableConfig.loading"
            :show-add="hasAuth('operate:activityImage:add')"
            :show-batch-delete="hasAuth('operate:activityImage:remove')"
            @add="currentTableConfig.handleAdd"
            @delete="currentTableConfig.handleBatchDelete"
            @refresh="currentTableConfig.handleRefresh"
          />
        </NSpace>
      </template>

      <!-- 修复：恢复原有的表格容器结构 -->
      <div class="h-full flex-1-hidden">
        <!-- 活动公告表格 -->
        <div v-if="activeTab === 'activity'" class="h-full">
          <NDataTable
            v-model:checked-row-keys="activityCheckedRowKeys"
            :columns="activityColumns"
            :data="activityData"
            size="small"
            :flex-height="!appStore.isMobile"
            :scroll-x="currentTableConfig.scrollX"
            :loading="activityLoading"
            remote
            :row-key="(row) => row.id"
            :pagination="activityPagination"
            class="h-full"
          />
        </div>

        <!-- 图文引导表格 -->
        <div v-else-if="activeTab === 'graphic'" class="h-full">
          <NDataTable
            v-model:checked-row-keys="graphicCheckedRowKeys"
            :columns="graphicColumns"
            :data="graphicData"
            size="small"
            :flex-height="!appStore.isMobile"
            :scroll-x="currentTableConfig.scrollX"
            :loading="graphicLoading"
            remote
            :row-key="(row) => row.id"
            :pagination="graphicPagination"
            class="h-full"
          />
        </div>
      </div>

      <!-- 操作抽屉和预览模态框 -->
      <ActivityOperateDrawer
        v-model:visible="activityDrawerVisible"
        :operate-type="activityOperateType"
        :row-data="activityEditingData"
        image-type="1"
        @submitted="getActivityDataByPage"
      />

      <GraphicGuideOperateDrawer
        v-model:visible="graphicDrawerVisible"
        :operate-type="graphicOperateType"
        :row-data="graphicEditingData"
        image-type="2"
        @submitted="getGraphicDataByPage"
      />

      <NModal
        v-model:show="previewVisible"
        preset="card"
        style="width: auto; max-width: 95vw; max-height: 95vh"
        :mask-closable="true"
        :bordered="false"
        :title="$t('common.preview')"
        class="image-preview-modal"
      >
        <div class="flex justify-center items-center p-2">
          <img
            :src="previewImageUrl"
            class="preview-image rounded shadow-lg transition-all"
            style="max-width: 90vw; max-height: 80vh; object-fit: contain"
          />
        </div>
      </NModal>
    </NCard>
  </div>
</template>

<style scoped>
.preview-image {
  transition: transform 0.3s ease;
}
.preview-image:hover {
  transform: scale(1.02);
}
.image-preview-modal :deep(.n-card) {
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}

/* 修复表格布局问题 */
:deep(.n-data-table) {
  height: 100%;
}

:deep(.n-data-table-base-table) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.n-data-table-wrapper) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

:deep(.n-data-table-table) {
  flex: 1;
}

:deep(.n-pagination) {
  margin-top: auto;
}
</style>
