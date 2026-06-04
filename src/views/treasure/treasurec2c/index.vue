<script setup lang="tsx">
import { ref, h, computed, watch } from "vue";
import { NTag, NCard, NDataTable, NModal } from "naive-ui";
import { fetchGetC2cOrderList, fetchCheckC2cOrderStatus } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useTable } from "@/hooks/common/table";
import TreasureSearch from "./modules/treasure-search.vue";
import StatusCheckModal from "./modules/status-check-modal.vue";
import { format } from "date-fns";
import { useMessage } from "naive-ui";
import { useAuth } from '@/hooks/business/auth';

const { hasAuth } = useAuth();
const appStore = useAppStore();
const message = useMessage();

// 弹窗状态
const showContentModal = ref(false);
const modalTitle = ref("");
const modalContent = ref("");

// 选中的行
const checkedRowKeys = ref<Array<string | number>>([]);

// 状态检查加载状态
const statusCheckLoading = ref(false);

// 状态检查弹框状态
const showStatusCheckModal = ref(false);
const currentOrderData = ref<any>(null);
const currentCheckResult = ref<any>(null);

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
  apiFn: fetchGetC2cOrderList,
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
      key: "consignmentId",
      title: $t('page.manage.treasure.consignmentId'),
      align: "center",
      minWidth: 100,
    },
    {
      key: "serverName",
      title: $t('page.manage.treasure.serverName'),
      align: "center",
      minWidth: 100,
    },
    {
      key: "openId",
      title: $t('page.manage.treasure.platformId'),
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
      key: "iuid",
      title: $t('page.manage.treasure.itemUniqueId'),
      align: "center",
      minWidth: 150,
      ellipsis: { tooltip: true },
    },
    {
      key: "itemId",
      title: $t('page.manage.treasure.itemId'),
      align: "center",
      minWidth: 100,
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
            onClick: () => openContentModal($t('page.manage.treasure.itemData'), row.itemData),
          },
          content.length > 50
            ? content.substring(0, 50) + "..."
            : content
        );
      },
    },
    {
      key: "plaintext",
      title: $t('page.manage.treasure.plaintext'),
      align: "center",
      minWidth: 200,
      ellipsis: { tooltip: true },
      className: "param-cell",
      render: (row: any) => {
        if (!row.plaintext) return null;

        const content = typeof row.plaintext === 'string'
          ? row.plaintext
          : JSON.stringify(row.plaintext);

        return h(
          "div",
          {
            class: "param-content",
            onClick: () => openContentModal($t('page.manage.treasure.plaintext'), row.plaintext),
          },
          content.length > 50
            ? content.substring(0, 50) + "..."
            : content
        );
      },
    },
    {
      key: "status",
      title: $t('page.manage.treasure.status'),
      align: "center",
      minWidth: 120,
      render: (row: any) => {
        if (row.status === null || row.status === undefined) {
          return null;
        }

        const statusTagMap: Record<string, NaiveUI.ThemeColor> = {
          'AVAILABLE': 'success',  // 可用
          'PROCESSING': 'warning',  // 处理中
        };

        const statusKey = String(row.status);
        const tagType = statusTagMap[statusKey] || 'default';

        return <NTag type={tagType}>{statusKey}</NTag>;
      }
    },
    {
      key: "createTime",
      title: $t('page.manage.treasure.createTime'),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return row.createTime ? format(new Date(row.createTime), 'yyyy-MM-dd HH:mm:ss') : '';
      },
    },
    {
      key: "updateTime",
      title: $t('page.manage.treasure.updateTime'),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return row.updateTime ? format(new Date(row.updateTime), 'yyyy-MM-dd HH:mm:ss') : '';
      },
    },
  ],
  defaultHiddenKeys: ['itemData','plaintext','updateTime','createTime'],
});

function handleSearch(params: any) {
  updateSearchParams(params);
  getData();
}

const disabledStatusCheck = computed(() => checkedRowKeys.value.length === 0 || statusCheckLoading.value);

// 等待弹框关闭的 Promise
let modalCloseResolver: (() => void) | null = null;

function waitForModalClose(): Promise<void> {
  return new Promise<void>((resolve) => {
    modalCloseResolver = resolve;
  });
}

// 监听弹框关闭
watch(showStatusCheckModal, (newVal) => {
  if (!newVal && modalCloseResolver) {
    modalCloseResolver();
    modalCloseResolver = null;
  }
});

async function handleStatusCheck() {
  if (checkedRowKeys.value.length === 0) {
    return message.warning($t('page.manage.treasure.selectOrderFirst'));
  }

  const selectedRows = data.value.filter((row: any) =>
    checkedRowKeys.value.includes(row.consignmentId)
  );

  statusCheckLoading.value = true;

  // 逐个检查并显示弹框
  for (const row of selectedRows) {
    try {
      const response = await fetchCheckC2cOrderStatus({
        consignmentId: row.consignmentId,
        serverId: row.serverId,
        status: row.status
      });

      // 获取响应数据
      const responseData = response?.data || response?.response?.data || response;

      // 设置当前订单数据和检查结果
      currentOrderData.value = row;
      currentCheckResult.value = {
        msg: responseData?.msg,
        code: responseData?.code,
        data: responseData?.data
      };

      // 显示弹框
      showStatusCheckModal.value = true;

      // 等待用户关闭弹框后再继续下一个
      await waitForModalClose();
    } catch (err: any) {
      // 即使出错也显示弹框
      currentOrderData.value = row;
      currentCheckResult.value = {
        msg: err?.message || '检查失败',
        code: -1,
        data: null
      };
      showStatusCheckModal.value = true;

      // 等待用户关闭弹框
      await waitForModalClose();
    }
  }

  await getData();
  checkedRowKeys.value = [];
  statusCheckLoading.value = false;
}

// 处理操作成功
function handleActionSuccess() {
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
          :show-status-check="hasAuth('treasure:transaction:status')"
          :disabled-status-check="disabledStatusCheck"
          @refresh="getData"
          @status-check="handleStatusCheck"
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
        :row-key="(row: any) => row.consignmentId || row.id"
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

    <!-- 状态检查弹框 -->
    <StatusCheckModal
      v-model:visible="showStatusCheckModal"
      :order-data="currentOrderData"
      :check-result="currentCheckResult"
      @action-success="handleActionSuccess"
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
