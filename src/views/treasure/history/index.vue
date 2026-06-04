<script setup lang="tsx">
import { ref, h } from "vue";
import { NTag, NCard, NDataTable, NModal, NButton } from "naive-ui";
import { fetchGetHistoryOrderList } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useTable } from "@/hooks/common/table";
import TreasureSearch from "./modules/treasure-search.vue";
import DetailModal from "./modules/detail-modal.vue";
import { format } from "date-fns";

const appStore = useAppStore();

// 弹窗状态
const showContentModal = ref(false);
const modalTitle = ref("");
const modalContent = ref("");

// 详情弹窗状态
const showDetailModal = ref(false);
const detailData = ref<any>(null);

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

// 打开详情弹窗
function openDetailModal(row: any) {
  detailData.value = row;
  showDetailModal.value = true;
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
  apiFn: fetchGetHistoryOrderList,
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
      key: "logId",
      title: $t('page.manage.treasure.logId'),
      align: "center",
      width: 100,
    },
    {
      key: "consignmentId",
      title: $t('page.manage.treasure.consignmentRecordId'),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
    },
    {
      key: "serverId",
      title: $t('page.manage.treasure.serverId'),
      align: "center",
      width: 100,
    },
    {
      key: "serverName",
      title: $t('page.manage.treasure.serverName'),
      align: "center",
      minWidth: 120,
    },
    {
      key: "sourceOpenId",
      title: $t('page.manage.treasure.sourceOpenId'),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
    },
    {
      key: "sourceRoleId",
      title: $t('page.manage.treasure.sourceRoleId'),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
    },
    {
      key: "targetOpenId",
      title: $t('page.manage.treasure.targetOpenId'),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
    },
    {
      key: "targetRoleId",
      title: $t('page.manage.treasure.targetRoleId'),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
    },
    {
      key: "iuid",
      title: $t('page.manage.treasure.iuid'),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
    },
    {
      key: "itemId",
      title: $t('page.manage.treasure.itemId'),
      align: "center",
      minWidth: 120,
    },
    {
      key: "itemCount",
      title: $t('page.manage.treasure.itemCount'),
      align: "center",
      minWidth: 100,
    },
    {
      key: "itemData",
      title: $t('page.manage.treasure.itemData'),
      align: "center",
      minWidth: 200,
      ellipsis: { tooltip: true },
      className: "param-cell",
      render: (row: any) => {
        if (!row.itemData) return null;

        const content = typeof row.itemData === 'string'
          ? row.itemData
          : JSON.stringify(row.itemData);

        return h(
          "div",
          {
            class: "param-content",
            onClick: () => {
              try {
                const parsed = typeof row.itemData === 'string' ? JSON.parse(row.itemData) : row.itemData;
                openContentModal($t('page.manage.treasure.itemData'), parsed);
              } catch {
                openContentModal($t('page.manage.treasure.itemData'), row.itemData);
              }
            },
          },
          content.length > 50
            ? content.substring(0, 50) + "..."
            : content
        );
      },
    },
    {
      key: "operationType",
      title: $t('page.manage.treasure.operationType'),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        const typeMap: Record<number, string> = {
          1: $t('page.manage.treasure.operationTypeConsignment'),
          2: $t('page.manage.treasure.operationTypeRetrieve'),
          3: $t('page.manage.treasure.operationTypeTransfer'),
        };
        const typeText = typeMap[row.operationType] || `${$t('page.manage.treasure.unknown')}(${row.operationType})`;
        const typeColor: Record<number, NaiveUI.ThemeColor> = {
          1: 'info',
          2: 'warning',
          3: 'success',
        };
        return <NTag type={typeColor[row.operationType] || 'default'}>{typeText}</NTag>;
      }
    },
    {
      key: "extrasParams",
      title: $t('page.manage.treasure.extrasParams'),
      align: "center",
      minWidth: 200,
      ellipsis: { tooltip: true },
      className: "param-cell",
      render: (row: any) => {
        if (!row.extrasParams) return null;

        const content = typeof row.extrasParams === 'string'
          ? row.extrasParams
          : JSON.stringify(row.extrasParams);

        return h(
          "div",
          {
            class: "param-content",
            onClick: () => {
              try {
                const parsed = typeof row.extrasParams === 'string' ? JSON.parse(row.extrasParams) : row.extrasParams;
                openContentModal($t('page.manage.treasure.extrasParams'), parsed);
              } catch {
                openContentModal($t('page.manage.treasure.extrasParams'), row.extrasParams);
              }
            },
          },
          content.length > 50
            ? content.substring(0, 50) + "..."
            : content
        );
      },
    },
    {
      key: "status",
      title: $t('page.manage.treasure.operationStatus'),
      align: "center",
      minWidth: 120,
      render: (row: any) => {
        if (row.status === null || row.status === undefined) {
          return null;
        }

        const statusTagMap: Record<string, NaiveUI.ThemeColor> = {
          'SUCCESS': 'success',
          'FAILURE': 'error',
        };

        const statusKey = String(row.status);
        const tagType = statusTagMap[statusKey] || 'default';

        return <NTag type={tagType}>{statusKey}</NTag>;
      }
    },
    {
      key: "failReason",
      title: $t('page.manage.treasure.failReason'),
      align: "center",
      minWidth: 200,
      ellipsis: { tooltip: true },
    },
    {
      key: "createTime",
      title: $t('page.manage.treasure.consignmentTime'),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        if (!row.createTime) return '';
        // 如果已经是格式化字符串，直接返回；否则格式化
        if (typeof row.createTime === 'string' && row.createTime.includes(' ')) {
          return row.createTime;
        }
        return format(new Date(row.createTime), 'yyyy-MM-dd HH:mm:ss');
      },
    },
    {
      key: "operateTime",
      title: $t('page.manage.treasure.operateTime'),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        if (!row.operateTime) return '';
        // 如果已经是格式化字符串，直接返回；否则格式化
        if (typeof row.operateTime === 'string' && row.operateTime.includes(' ')) {
          return row.operateTime;
        }
        return format(new Date(row.operateTime), 'yyyy-MM-dd HH:mm:ss');
      },
    },
    {
      key: "operator",
      title: $t('page.manage.treasure.operator'),
      align: "center",
      minWidth: 120,
    },
    {
      key: "remark",
      title: $t('page.manage.treasure.remark'),
      align: "center",
      minWidth: 200,
      ellipsis: { tooltip: true },
    },
    {
      key: "operate",
      title: $t('common.operate'),
      align: "center",
      width: 80,
      fixed: "right",
      render: (row: any) => (
        <NButton
          size="small"
          text
          type="primary"
          onClick={() => openDetailModal(row)}
        >
          {{
            icon: () => <icon-mdi-eye-outline class="text-lg" />
          }}
        </NButton>
      ),
    },
  ],
  defaultHiddenKeys: ['logId','sourceOpenId', 'targetOpenId', 'itemData', 'extrasParams', 'failReason',  'operator', 'remark','itemCount','itemId'],
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
        :row-key="(row: any) => row.logId"
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

    <!-- 详情查看对话框 -->
    <DetailModal
      v-model:show="showDetailModal"
      :data="detailData"
      @open-content-modal="openContentModal"
    />
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
