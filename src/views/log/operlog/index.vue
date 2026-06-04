<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NModal, NCard } from "naive-ui";
import { fetchGetOperLogList } from "@/service/api";
import { useAppStore } from "@/store/modules/app";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { $t } from "@/locales";
import { h, ref } from "vue";
import {
  enableStatusRecord,
  operatorTypeRecord,
  operlogStatusRecord,
} from "@/constants/business";

const appStore = useAppStore();

// 弹窗状态
const showContentModal = ref(false);
const modalTitle = ref("");
const modalContent = ref("");

// 打开内容弹窗
function openContentModal(title: string, content: string) {
  try {
    // 尝试格式化JSON
    const json = JSON.parse(content);
    modalContent.value = JSON.stringify(json, null, 2);
  } catch (e) {
    // 非JSON内容直接显示
    modalContent.value = content;
  }

  modalTitle.value = title;
  showContentModal.value = true;
}

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
} = useTable({
  apiFn: fetchGetOperLogList,
  apiParams: {
    current: 1,
    size: 20,
  },
  columns: () => [
    {
      key: "operId",
      title: $t("page.manage.operlog.operId"),
      minWidth: 120,
      align: "center",
    },
    {
      key: "title",
      title: $t("page.manage.operlog.title"),
      align: "center",
      minWidth: 120,
    },
    {
      key: "method",
      title: $t("page.manage.operlog.method"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "requestMethod",
      title: $t("page.manage.operlog.requestMethod"),
      align: "center",
      minWidth: 120,
    },

    {
      key: "operName",
      title: $t("page.manage.operlog.operName"),
      align: "center",
      minWidth: 120,
    },
    {
      key: "operUrl",
      title: $t("page.manage.operlog.operUrl"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "operIp",
      title: $t("page.manage.operlog.operIp"),
      align: "center",
      minWidth: 120,
    },
    {
      key: "operTime",
      title: $t("page.manage.operlog.operTime"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "operParam",
      title: $t("page.manage.operlog.operParam"),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
      className: "param-cell",
      render: (row) => {
        if (!row.operParam) return null;

        return h(
          "div",
          {
            class: "param-content",
            onClick: () => openContentModal("操作参数", row.operParam),
          },
          row.operParam.length > 50
            ? row.operParam.substring(0, 50) + "..."
            : row.operParam
        );
      },
    },
    {
      key: "jsonResult",
      title: $t("page.manage.operlog.jsonResult"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },

    {
      key: "operatorType",
      title: $t("page.manage.operlog.operatorType"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row) => {
        if (row.businessType === null || row.businessType === undefined) {
          return null;
        }
        const businessType = String(row.businessType);
        return h(
          "span",
          {},
          $t(
            operatorTypeRecord[businessType] ||
              "page.manage.operlog.operatorType.other"
          )
        );
      },
    },
    {
      key: "status",
      title: $t("page.manage.operlog.status"),
      align: "center",
      minWidth: 120,
      render: (row) => {
        if (row.status === null || row.status === undefined) {
          return null;
        }

        const typeMap: Record<string, string> = {
          0: "success",
          1: "error",
        };

        const status = String(row.status);
        const label = $t(
          operlogStatusRecord[status] ||
            "page.manage.operlog.statusTypes.normal"
        );

        return <NTag type={typeMap[status] || "default"}>{label}</NTag>;
      },
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
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <NCard
      :title="$t('page.manage.operlog.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @refresh="getData"
        />
      </template>

      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="702"
        :loading="loading"
        remote
        :row-key="(row) => row.roleId"
        :pagination="mobilePagination"
        class="sm:h-full operlog-table"
      />
    </NCard>

    <!-- 内容查看对话框 -->
    <NModal
      v-model:show="showContentModal"
      :title="$t('page.manage.operlog.operParam')"
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

/* :deep(.param-cell:hover) {
  background-color: rgba(0, 0, 0, 0.04);
} */

:deep(.json-result-cell) {
  cursor: pointer;
  max-width: 150px;
  word-break: break-all;
  transition: background-color 0.2s;
}

:deep(.json-result-cell:hover) {
  background-color: rgba(0, 0, 0, 0.04);
}

/* 优化tooltip样式 */
:deep(.n-tooltip) {
  max-width: 800px !important;
  white-space: pre-wrap !important;
  font-size: 13px !important;
}

:deep(.n-tooltip-content) {
  max-height: 600px !important;
  overflow-y: auto !important;
  padding: 12px !important;
}

/* 美化JSON内容显示 */
:deep(.n-tooltip-content) pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 表格单元格文本样式 */
:deep(.operlog-table .n-data-table-td) {
  padding: 8px 12px !important;
  position: relative;
}

/* 添加提示效果 */
:deep(.param-cell),
:deep(.json-result-cell) {
  position: relative;
}

:deep(.param-cell)::after,
:deep(.json-result-cell)::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: transparent;
  transition: background-color 0.2s;
}

:deep(.param-cell:hover)::after,
:deep(.json-result-cell:hover)::after {
  background-color: var(--primary-color, #18a058);
}

/* 内容样式 */
:deep(.param-content),
:deep(.json-content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  display: inline-block;
  cursor: pointer;
}

/* 鼠标滑过效果 */
:deep(.param-content:hover),
:deep(.json-content:hover) {
  text-decoration: underline;
  color: var(--primary-color, #18a058);
}

/* 悬浮提示框（fallback） */
:deep([title]) {
  position: relative;
}

/* 自定义滚动条 */
:deep(.n-tooltip-content::-webkit-scrollbar),
.content-preview::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

:deep(.n-tooltip-content::-webkit-scrollbar-thumb),
.content-preview::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

:deep(.n-tooltip-content::-webkit-scrollbar-track),
.content-preview::-webkit-scrollbar-track {
  background-color: transparent;
}

/* 模态框内容包装器 */
.modal-content-wrapper {
  padding: 0;
  border-radius: 4px;
  overflow: hidden;
}

/* 模态框脚注 */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* 优化模态框样式 */
:deep(.n-modal) {
  border-radius: 8px;
}

:deep(.n-card-header) {
  padding: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.09);
}

:deep(.n-card-header__main) {
  font-weight: bold;
  font-size: 16px;
}

:deep(.n-card__content) {
  padding: 0;
}

:deep(.n-card__footer) {
  padding: 12px 16px;
  background-color: rgba(0, 0, 0, 0.02);
  border-top: 1px solid rgba(0, 0, 0, 0.09);
}

/* 黑暗模式下模态框样式 */
:deep(.n-modal.n-modal--card-style.dark-theme) {
  background-color: #333;
}
</style>
