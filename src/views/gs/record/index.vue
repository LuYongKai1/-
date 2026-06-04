<script setup lang="tsx">
import {
  fetchGetGsGrantRecordsList,
} from "@/service/api/game-manage";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { NButton, NTag } from "naive-ui";
import {
  grantTargetTypeRecord,
  grantTypeRecord
} from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { ref } from "vue";
import { useAuth } from "@/hooks/business/auth";
import { format } from "date-fns";
import GrantRecordSearch from "./modules/grant-record-search.vue";


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
  apiFn: fetchGetGsGrantRecordsList,
  showTotal: true,
  apiParams: {
    current: 1,
    size: 10,
  },
  columns: () => [
    {
      key: "id",
      title: $t("page.manage.grantRecord.id"),
      align: "center",
      width: 80,
    },
    {
      key: "roleId",
      title: $t("page.manage.grantRecord.roleId"),
      align: "center",
      width: 180,
      ellipsis: { tooltip: true },
    },
    {
      key: "targetType",
      title: $t("page.manage.grantRecord.targetTypeLabel"),
      align: "center",
      width: 120,
      render: (row: any) => {
        if (row.targetType === null || row.targetType === undefined) {
          return null;
        }

        const tagMap: Record<number, NaiveUI.ThemeColor> = {
          1: "info",     // 物品 → 蓝色
          2: "success",  // 商品 → 绿色
        };

        const label = $t(grantTargetTypeRecord[String(row.targetType)]);

        return <NTag type={tagMap[row.targetType]}>{label}</NTag>;
      },
    },
    {
      key: "itemIds",
      title: $t("page.manage.grantRecord.itemIds"),
      align: "center",
      width: 150,
      ellipsis: { tooltip: true },
    },
    {
      key: "itemCounts",
      title: $t("page.manage.grantRecord.itemCounts"),
      align: "center",
      width: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "grantType",
      title: $t("page.manage.grantRecord.grantTypeLabel"),
      align: "center",
      width: 120,
      render: (row: any) => {
        if (row.grantType === null || row.grantType === undefined) {
          return null;
        }

        const tagMap: Record<number, NaiveUI.ThemeColor> = {
          1: "success",  // 发放 → 绿色
          2: "error",    // 删除 → 红色
        };

        const label = $t(grantTypeRecord[String(row.grantType)]);

        return <NTag type={tagMap[row.grantType]}>{label}</NTag>;
      },
    },
    {
      key: "operator",
      title: $t("page.manage.grantRecord.operator"),
      align: "center",
      width: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "remark",
      title: $t("page.manage.grantRecord.remark"),
      align: "center",
      width: 150,
      ellipsis: { tooltip: true },
    },
    {
      key: "createdAt",
      title: $t("page.manage.grantRecord.createdAt"),
      align: "center",
      width: 180,
      render: (row: any) => {
        if (!row.createdAt) {
          return '-';
        }
        return format(new Date(row.createdAt), "yyyy-MM-dd HH:mm:ss");
      },
    },
  ],
  defaultHiddenKeys: ['']
});

const {
  checkedRowKeys,
} = useTableOperate(data, getData);


function handleSearch(roleId: number, targetType: number, grantType: number, operator: string) {
  const params: any = {
    roleId,
    targetType,
    grantType,
    operator,
  };
  updateSearchParams(params);
  getData();
}

</script>

<template>
  <div class="flex-col gap-16px lt-sm:overflow-auto">
    <GrantRecordSearch
      :model="searchModel"
      @search="handleSearch"
      @reset="handleReset"
    />

    <NCard
      :title="$t('page.manage.grantRecord.title')"
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
    </NCard>
  </div>
</template>

<style scoped>
/* 页面标题样式 */

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: rgb(var(--base-text-color)) !important;
  line-height: 1.2;
}

.page-description {
  font-size: 14px;
  margin: 0;
  color: rgb(var(--base-text-color)) !important;
  opacity: 0.7;
}

/* 统计卡片网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.stats-card {
  position: relative;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.stats-card :deep(.n-card-body) {
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stats-content {
  flex: 1;
}

.stats-number {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-color);
  line-height: 1;
  margin-bottom: 8px;
}

.stats-label {
  font-size: 14px;
  color: var(--text-color-2);
}

.stats-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  margin-top: 4px;
}

.stats-trend.positive {
  color: #52c41a;
}

.trend-icon {
  font-weight: bold;
}

.stats-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stats-icon-blue {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stats-icon-green {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stats-icon-orange {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    flex-direction: column;
    gap: 16px;
  }

  .table-header-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
}
</style>


