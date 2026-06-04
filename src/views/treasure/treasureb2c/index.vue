<script setup lang="tsx">
import { ref, h } from "vue";
import { NTag, NCard, NDataTable, NModal } from "naive-ui";
import { fetchGetB2cOrderList } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useTable } from "@/hooks/common/table";
import TreasureSearch from "./modules/treasure-search.vue";
import { format } from "date-fns";

const appStore = useAppStore();

// 弹窗状态
const showContentModal = ref(false);
const modalTitle = ref("");
const modalContent = ref("");

// 打开内容弹窗
function openContentModal(title: string, content: any) {
  try {
    // 格式化JSON
    modalContent.value = JSON.stringify(content, null, 2);
  } catch (e) {
    // 非JSON内容直接显示
    modalContent.value = String(content);
  }

  modalTitle.value = title;
  showContentModal.value = true;
}

const {
  columns,
  columnChecks,
  data,
  getData,
  loading,
  mobilePagination,
  scrollX,
  searchParams,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetB2cOrderList,
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
      title: "ID",
      align: "center",
      width: 100,
    },
    {
      key: "orderNo",
      title: $t('page.manage.treasure.orderNo'),
      align: "center",
      minWidth: 200,
      ellipsis: { tooltip: true },
    },
    {
      key: "openId",
      title: $t('page.manage.treasure.userId'),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
    },
    {
      key: "roleId",
      title: $t('page.manage.treasure.roleId'),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
    },
    {
      key: "serverName",
      title: $t('page.manage.treasure.serverName'),
      align: "center",
      minWidth: 100,
    },
    {
      key: "productId",
      title: $t('page.manage.treasure.productId'),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
    },
    {
      key: "amount",
      title: $t('page.manage.treasure.paymentAmount'),
      align: "center",
      minWidth: 150,
    },
    {
      key: "mailTitle",
      title: $t('page.manage.treasure.mailTitle'),
      align: "center",
      minWidth: 150,
      ellipsis: { tooltip: true },
    },
    {
      key: "mailContent",
      title: $t('page.manage.treasure.mailContent'),
      align: "center",
      minWidth: 200,
      ellipsis: { tooltip: true },
    },
    {
      key: "status",
      title: $t('page.manage.treasure.deliveryStatus'),
      align: "center",
      minWidth: 120,
      render: (row: any) => {
        if (row.status === null || row.status === undefined) {
          return null;
        }

        const statusTagMap: Record<string, NaiveUI.ThemeColor> = {
          'PENDING': 'warning',  // 待发货
          'DELIVERED': 'success',  // 已发货
          'FAILED': 'error',  // 发货失败
        };

        const statusKey = String(row.status);
        const tagType = statusTagMap[statusKey] || 'default';

        return <NTag type={tagType}>{statusKey}</NTag>;
      }
    },
    {
      key: "message",
      title: $t('page.manage.treasure.failureMessage'),
      align: "center",
      minWidth: 200,
      ellipsis: { tooltip: true },
    },
    {
      key: "deliveredAt",
      title: $t('page.manage.treasure.deliveryTime'),
      align: "center",
      minWidth: 200,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return row.deliveredAt ? format(new Date(row.deliveredAt), 'yyyy-MM-dd HH:mm:ss') : '';
      },
    },
    {
      key: "requestPayload",
      title: $t('page.manage.treasure.originalRequestContent'),
      align: "center",
      minWidth: 200,
      ellipsis: { tooltip: true },
      className: "param-cell",
      render: (row: any) => {
        if (!row.requestPayload) return null;

        const content = typeof row.requestPayload === 'string'
          ? row.requestPayload
          : JSON.stringify(row.requestPayload);

        return h(
          "div",
          {
            class: "param-content",
            onClick: () => openContentModal($t('page.manage.treasure.originalRequestContent'), row.requestPayload),
          },
          content.length > 50
            ? content.substring(0, 50) + "..."
            : content
        );
      },
    },
    {
      key: "ipAddress",
      title: $t('page.manage.treasure.clientIpAddress'),
      align: "center",
      minWidth: 150,
    },
    {
      key: "createdAt",
      title: $t('page.manage.treasure.createTime'),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return row.createdAt ? format(new Date(row.createdAt), 'yyyy-MM-dd HH:mm:ss') : '';
      },
    },
    {
      key: "updatedAt",
      title: $t('page.manage.treasure.updateTime'),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return row.updatedAt ? format(new Date(row.updatedAt), 'yyyy-MM-dd HH:mm:ss') : '';
      },
    },
    {
      key: "retryCount",
      title: $t('page.manage.treasure.deliveryRetryCount'),
      align: "center",
      minWidth: 120,
    },
    {
      key: "lastRetryAt",
      title: $t('page.manage.treasure.deliveryAttemptTime'),
      align: "center",
      minWidth: 250,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return row.lastRetryAt ? format(new Date(row.lastRetryAt), 'yyyy-MM-dd HH:mm:ss') : '';
      },
    },
  ],
  defaultHiddenKeys: ['message','requestPayload','ipAddress','updatedAt','retryCount','lastRetryAt','createdAt','mailTitle','mailContent',],
});

function handleSearch(params: any) {
  updateSearchParams(params);
  getData();
}

</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <TreasureSearch
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />
    <NCard
      :title="$t('page.manage.orders.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :loading="loading"
          @refresh="getData"
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
        :row-key="(row: any) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
    </NCard>

    <!-- 内容查看对话框 -->
    <NModal
      v-model:show="showContentModal"
      :title="modalTitle"
      preset="card"
      style="width: 80%; max-width: 800px"
    >
      <pre class="content-preview">{{ modalContent }}</pre>
    </NModal>
  </div>
</template>

<style scoped>
/* 内容预览区域样式 */
.content-preview {
  max-height: 70vh;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  padding: 12px;
  margin: 0;
  background-color: transparent;
  border-radius: 4px;
  font-family: "Consolas", "Courier New", monospace;
  font-size: 14px;
  line-height: 1.6;
}

/* 黑暗模式支持 */
:deep(.dark .content-preview) {
  background-color: transparent;
  color: #eee;
}

/* 样式优化 */
:deep(.param-cell) {
  cursor: pointer;
  max-width: 180px;
  word-break: break-all;
  transition: background-color 0.2s;
}

/* 内容样式 */
:deep(.param-content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  display: inline-block;
  cursor: pointer;
}

/* 鼠标滑过效果 */
:deep(.param-content:hover) {
  text-decoration: underline;
  color: var(--primary-color, #18a058);
}

/* 自定义滚动条 */
.content-preview::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.content-preview::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.content-preview::-webkit-scrollbar-track {
  background-color: transparent;
}
</style>
