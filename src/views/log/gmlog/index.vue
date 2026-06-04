<script setup lang="tsx">
import { ref, defineAsyncComponent, h } from "vue";
import { NButton, NPopconfirm, NTag, NCard, NDataTable, NModal } from "naive-ui";
import { fetchGetGmLogList } from "@/service/api";
import { useAppStore } from "@/store/modules/app";
import { useTable } from "@/hooks/common/table";
import { $t } from "@/locales";
import { enableStatusRecord, loginlogStatusRecord } from "@/constants/business";
import TableHeaderOperation from "@/components/advanced/table-header-operation.vue";
import GmSearch from "./modules/gm-search.vue";

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
  updateSearchParams,
} = useTable({
  apiFn: fetchGetGmLogList,
  apiParams: {
    current: 1,
    size: 20,
  },
  columns: () => [

    {
      key: "id",
      title: "ID",
      minWidth: 30,
      align: "center",
    },
    {
      key: "serverId",
      title: $t('page.manage.gmlog.serverId'),
      align: "center",
      width: 75,
    },
    {
      key: "operator",
      title: $t('page.manage.gmlog.operate'),
      align: "center",
      minWidth: 100,
    },
    {
      key: "gmCode",
      title: $t('page.manage.gmlog.gmCode'),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "gmName",
      title: $t('page.manage.gmlog.gmName'),
      align: "center",
      minWidth: 123,
      ellipsis: { tooltip: true },
    },
    {
      key: "paramJson",
      title: $t('page.manage.gmlog.paramJson'),
      align: "center",
      minWidth: 123,
      ellipsis: { tooltip: true },
      className: "param-cell",
      render: (row: any) => {
        if (!row.paramJson) return null;

        return h(
          "div",
          {
            class: "param-content",
            onClick: () => openContentModal("参数 JSON", row.paramJson),
          },
          row.paramJson.length > 50
            ? row.paramJson.substring(0, 50) + "..."
            : row.paramJson
        );
      },
    },
    {
      key: "gmStatus",
      title: $t('page.manage.gmlog.status'),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        const status = row.gmStatus;
        if (status === null || status === undefined) {
          return null;
        }

        const typeMap: Record<number, "success" | "error" | "warning" | "default" | "primary" | "info"> = {
          0: "success",
          1: "error",
        };

        const labelMap: Record<number, string> = {
          0: "成功",
          1: "失败",
        };

        return (
          <NTag type={typeMap[status] || "default"}>
            {labelMap[status] || "未知"}
          </NTag>
        );
      },
    },
    {
      key: "gmUrl",
      title: $t('page.manage.gmlog.gmUrl'),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "roleId",
      title: $t('page.manage.gmlog.roleId'),
      align: "center",
      minWidth: 180,
    },
    {
      key: "userId",
      title: $t('page.manage.gmlog.userId'),
      align: "center",
      minWidth: 180,
    },
    {
      key: "msg",
      title: $t('page.manage.gmlog.msg'),
      align: "center",
      minWidth: 300,
      ellipsis: { tooltip: true },
      className: "msg-cell",
      render: (row: any) => {
        if (!row.msg) return null;

        return h(
          "div",
          {
            class: "msg-content",
            onClick: () => openContentModal("消息内容", row.msg),
          },
          row.msg.length > 50
            ? row.msg.substring(0, 50) + "..."
            : row.msg
        );
      },
    },
    {
      key: "createDate",
      title: $t('page.manage.gmlog.createDate'),
      align: "center",
      minWidth: 180,
    },
  ],
});

// 搜索处理函数
function handleSearch() {
  getData();
}

const checkedRowKeys = ref<string[]>([]);
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
  <GmSearch
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />
    <NCard
      :title="$t('page.manage.gmlog.title')"
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
        :scroll-x="2100"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
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
:deep(.param-cell),
:deep(.msg-cell) {
  cursor: pointer;
  max-width: 300px;
  word-break: break-all;
  transition: background-color 0.2s;
}

/* 内容样式 */
:deep(.param-content),
:deep(.msg-content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  display: inline-block;
  cursor: pointer;
}

/* 鼠标滑过效果 */
:deep(.param-content:hover),
:deep(.msg-content:hover) {
  text-decoration: underline;
  color: var(--primary-color, #18a058);
}

/* 添加提示效果 */
:deep(.param-cell),
:deep(.msg-cell) {
  position: relative;
}

:deep(.param-cell)::after,
:deep(.msg-cell)::after {
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
:deep(.msg-cell:hover)::after {
  background-color: var(--primary-color, #18a058);
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

/* 黑暗模式下模态框样式 */
:deep(.n-modal.n-modal--card-style.dark-theme) {
  background-color: #333;
}
</style>
