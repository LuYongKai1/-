<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NPopover, NModal } from "naive-ui";
import { fetchGetGsOperateLogsList } from "@/service/api";
import { useAppStore } from "@/store/modules/app";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { $t } from "@/locales";
import { gsOperateTypeRecord } from "@/constants/business";
import { format } from "date-fns";
import { ref } from "vue";
import OperateLogSearch from "./modules/operatelog-search.vue";

const appStore = useAppStore();

// 查看详情的模态框
const detailModalVisible = ref(false);
const currentDetail = ref<any>(null);

const {
  columns,
  columnChecks,
  data,
  loading,
  getData,
  getDataByPage,
  mobilePagination,
  searchParams,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetGsOperateLogsList as any,
  showTotal: true,
  immediate: false,
  apiParams: {
    current: 1,
    size: 10,
  },
  columns: () => [
    {
      key: "id",
      title: $t("page.manage.operateLog.id"),
      align: "center",
      width: 80,
    },
    {
      key: "operator",
      title: $t("page.manage.operateLog.operator"),
      align: "center",
      width: 120,
      render: (row: any) => {
        return row.operator || '-';
      },
    },
    {
      key: "operationType",
      title: $t("page.manage.operateLog.operationType"),
      align: "center",
      width: 120,
      render: (row: any) => {
        if (row.operationType === null || row.operationType === undefined) {
          return '-';
        }

        const typeMap: Record<string, 'success' | 'warning' | 'info' | 'error' | 'default'> = {
          '1': 'success',  // 添加标签
          '2': 'warning',  // 移除标签
          '3': 'info',     // 发放物品
          '4': 'error',    // 回收物品
          '5': 'info',     // 发放商品
          '6': 'error',    // 回收商品
          '7': 'info',     // 发放金额
          '8': 'success',  // 审核通过
          '9': 'error',    // 审核拒绝
          '10': 'info',    // 修改标签
        };

        const typeKey = String(row.operationType);
        const label = $t(gsOperateTypeRecord[typeKey]);
        const tagType = typeMap[typeKey] || "default";
        return <NTag type={tagType}>{label}</NTag>;
      },
    },
    {
      key: "roleId",
      title: $t("page.manage.operateLog.roleId"),
      align: "center",
      width: 180,
      ellipsis: { tooltip: true },
    },
    {
      key: "ipAddress",
      title: $t("page.manage.operateLog.ipAddress"),
      align: "center",
      width: 140,
    },
    {
      key: "createdAt",
      title: $t("page.manage.operateLog.createdAt"),
      align: "center",
      width: 180,
      render: (row: any) => {
        if (!row.createdAt) {
          return '-';
        }
        return format(new Date(row.createdAt), "yyyy-MM-dd HH:mm:ss");
      },
    },
    {
      key: "operate",
      title: $t("page.manage.operateLog.operationDetail"),
      align: "center",
      width: 80,
      fixed: "right",
      render: (row: any) => (
        <NButton
          size="small"
          text
          type="primary"
          onClick={() => handleViewDetail(row)}
        >
          {{
            icon: () => <icon-mdi-eye-outline class="text-lg" />
          }}
        </NButton>
      ),
    },
  ] as any,
});

const {
  checkedRowKeys,
} = useTableOperate(data, getData);

// 处理搜索
function handleSearch() {
  getData();
}

// 查看详情
function handleViewDetail(row: any) {
  currentDetail.value = row;
  detailModalVisible.value = true;
}

// 格式化详情显示为格式化的JSON
function formatDetailForDisplay(operationDetail: string) {
  if (!operationDetail) return '';

  try {
    const detail = JSON.parse(operationDetail);
    return JSON.stringify(detail, null, 2);
  } catch (e) {
    return operationDetail;
  }
}
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <OperateLogSearch
      :model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />

    <NCard
      :title="$t('page.manage.operateLog.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="true"
          :loading="loading"
          @refresh="getData"
        />
      </template>

      <NDataTable
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="920"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
    </NCard>

    <!-- 详情模态框 -->
    <NModal
      v-model:show="detailModalVisible"
      preset="card"
      :title="$t('page.manage.operateLog.operationDetail')"
      style="width: 600px"
    >
      <div v-if="currentDetail" class="detail-content">
        <pre class="detail-json">{{ formatDetailForDisplay(currentDetail.operationDetail) }}</pre>
      </div>
    </NModal>
  </div>
</template>

<style scoped>
.detail-content {
  max-height: 500px;
  overflow-y: auto;
}

.detail-json {
  background-color: rgb(var(--card-color));
  padding: 16px;
  border-radius: 4px;
  white-space: pre-wrap;
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
  overflow-x: auto;
}
</style>
