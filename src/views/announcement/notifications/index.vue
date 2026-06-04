<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from "naive-ui";
import {
  fetchGetMarquee,
  fetchDeleteMarquee,
  fetchSendMarquee,
  fetchStopMarquee,
  fetchGetMailTemplateList,
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import {
  serverStatusVisible,
  serverStatusShow,
  serverStatusRecommend,
  serverStatusNew,
} from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import MailOperateDrawer from "./modules/mail-operate-drawer.vue";
import ViewStatusModal from "./modules/view-status-modal.vue";
import ServerDetailDrawer from "./modules/server-detail-drawer.vue";
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAuth } from '@/hooks/business/auth';
import { format } from 'date-fns';

const { hasAuth } = useAuth();

const appStore = useAppStore();

// 添加轮询间隔时间（毫秒）
const POLL_INTERVAL = 5000; // 5秒
// 存储轮询定时器
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null);

const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetMarquee,
  showTotal: true,
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
      title: $t("page.manage.serveritem.id"),
      align: "center",
      width: 64,
    },
    {
      key: "marqueeName",
      title: $t("page.manage.notifications.marqueeName"),
      align: "center",
      minWidth: 80,
      ellipsis: { tooltip: true }
    },
    {
      key: "marqueeStatus",
      title: $t("page.manage.notifications.marqueeStatus"),
      align: "center",
      minWidth: 80,

      render: (row: any) => {
        const statusMap: Record<number, { type: 'default' | 'success' | 'error' | 'warning' | 'info' | 'primary'; label: string }> = {
          0: { type: 'default', label: '初始化' },
          1: { type: 'warning', label: '待发送' },
          2: { type: 'info', label: '发送中' },
          3: { type: 'success', label: '已完成' },
          4: { type: 'error', label: '撤销中' },
          5: { type: 'error', label: '已撤销' },
        };
        const status = statusMap[row.marqueeStatus] ;
        return <NTag type={status.type}>{status.label}</NTag>;
      }
    },
    {
      key: "marqueeContent",
      title: $t("page.manage.notifications.marqueeContent"),
      align: "center",
      minWidth: 80,
      ellipsis: { tooltip: true }

    },
    {
      key: "serverIds",
      title: $t("page.manage.notifications.serverIds"),
      align: "center",
      ellipsis: { tooltip: true },
      render: (row) => {
        try {
          const serverInfo = JSON.parse(row.serverIds);
          if (Array.isArray(serverInfo)) {
            return serverInfo.map(item => item.serverName).join(', ');
          }
          return row.serverIds;
        } catch {
          return row.serverIds;
        }
      }
    },

    {
      key: "roundTimes",
      title: $t("page.manage.notifications.roundTimes"),
      align: "center",
      minWidth: 80,
      ellipsis: { tooltip: true }
    },
        {
      key: "roundDelay",
      title: $t("page.manage.notifications.roundDelay"),
      align: "center",
      minWidth: 80,
    },
    {
      key: "startTime",
      title: $t("page.manage.notifications.startTime"),
      align: "center",
      minWidth: 80,
      render: (row) => {
        return format(row.startTime, 'yyyy-MM-dd HH:mm:ss');
      }
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 280,
      render: (row) => (
        <div class="flex-center gap-8px">
          {hasAuth('operate:marquee:start') && (
            <NPopconfirm onPositiveClick={() => handleSendMail(row.id)}>
            {{
              default: () => $t("common.confirmSend"),
              trigger: () => (
                <NButton type="success" ghost size="small" disabled={row.marqueeStatus === 3}>
                  {$t("common.send")}
                </NButton>
              ),
            }}
          </NPopconfirm>
          )}

          <NButton
            type="info"
            ghost
            size="small"
            onClick={() => handleView(row)}
          >
            {$t("common.view")}
          </NButton>

          {hasAuth('operate:marquee:edit') && (
            <NButton
            type="primary"
            ghost
            size="small"
            onClick={() => edit(row.id, row, row.marqueeStatus === 1 || row.marqueeStatus === 2 || row.marqueeStatus === 3 || row.marqueeStatus === 4)}
            >
              {$t("common.edit")}
            </NButton>
          )}

          {hasAuth('operate:marquee:remove') && (
          <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
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

const {
  drawerVisible,
  operateType,
  editingData,
  handleAdd,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted,
} = useTableOperate(data, getData);

// 计算撤销通知按钮的禁用状态
const disabledRevokeNotice = computed(() => {
  // 必须只选中一个
  if (checkedRowKeys.value.length !== 1) {
    return true;
  }

  // 检查选中的通知是否是已完成状态（状态3）
  const selectedRows = data.value.filter((row: any) =>
    checkedRowKeys.value.includes(row.id)
  );

  // 只有已完成状态才能撤销
  return selectedRows.some((row: any) => row.marqueeStatus !== 3);
});


const viewModalVisible = ref(false);
interface ServerData {
  serverId: number;
  serverName: string;
  ok?: boolean;
  msg?: string;
}
const currentViewData = ref<ServerData[] | null>(null);


// 添加轮询函数
function startPolling() {
  // 清除已存在的定时器
  if (pollTimer.value) {
    clearInterval(pollTimer.value);
  }

  // 设置新的定时器
  pollTimer.value = setInterval(() => {

    const hasInProgressMarquee = data.value.some(
      (item: any) => item.marqueeStatus === 1 || item.marqueeStatus === 2
    );

    // 如果有正在处理的公告，则刷新数据
    if (hasInProgressMarquee) {
      getData();
    } else {
      // 如果没有正在处理的公告，停止轮询
      stopPolling();
    }
  }, POLL_INTERVAL);
}

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value);
    pollTimer.value = null;
  }
}

onUnmounted(() => {
  stopPolling();
});


async function handleSendMail(id: number) {
  if (typeof id !== 'number' || isNaN(id)) {
    window.$message?.error('ID 不合法，无法发送');
    return;
  }
  const response = await fetchSendMarquee({ id });

  if (response && response.response && response.response.data) {
    const { code } = response.response.data;
    if (code === 200) {
      window.$message?.success($t("common.sendSuccess"));
      getData();
      startPolling();
    } else {
      window.$message?.error(response.response.data.msg || $t("common.sendFailed"));
    }
  } else {
    window.$message?.error($t("common.sendFailed"));
  }
}


async function handleBatchDelete() {
  await fetchDeleteMarquee({
    id: checkedRowKeys.value as any,
  });
  onBatchDeleted();
}

async function handleDelete(id: number) {
  await fetchDeleteMarquee({ id });
  onDeleted();
}

async function handleRevokeNotice() {
  if (checkedRowKeys.value.length === 0) {
    window.$message?.error($t("common.selectMailFirst"));
    return;
  }

  // 每次只能撤销一个
  if (checkedRowKeys.value.length !== 1) {
    window.$message?.error("每次只能撤销一个通知");
    return;
  }

  // 检查选中的通知是否是已完成状态（状态3）
  const selectedRows = data.value.filter((row: any) =>
    checkedRowKeys.value.includes(row.id)
  );

  const hasNonCompletedStatus = selectedRows.some((row: any) =>
    row.marqueeStatus !== 3
  );

  if (hasNonCompletedStatus) {
    window.$message?.error("只能撤销已完成的通知");
    return;
  }

  try {
    const id = checkedRowKeys.value[0] as number;
    const response = await fetchStopMarquee({ id });

    if (response && response.response && response.response.data) {
      const { code } = response.response.data;
      if (code === 200) {
        window.$message?.success($t("common.revokeNoticeSuccess"));
        getData();
        checkedRowKeys.value = [];
      } else {
        window.$message?.error(
          response.response.data.msg || $t("common.revokeNoticeFailed")
        );
      }
    } else {
      window.$message?.error($t("common.revokeNoticeFailed"));
    }
  } catch (error) {
    console.error("撤销通知失败:", error);
    window.$message?.error($t("common.revokeNoticeFailed"));
  }
}

function handleView(row: any) {
  try {
    let serverData;
    if (typeof row.serverIds === "string") {
      try {
        serverData = JSON.parse(row.serverIds);
      } catch (parseError) {
        console.error("解析服务器数据失败:", parseError);
        return;
      }
    } else if (Array.isArray(row.serverIds)) {
      serverData = row.serverIds;
    } else {
      window.$message?.error("服务器数据格式不正确");
      return;
    }

    if (Array.isArray(serverData)) {
      currentViewData.value = serverData.map((server) => ({
        serverId: server.serverId || server.id,
        serverName: server.serverName || server.name,
        ok: server.hasOwnProperty('ok') ? server.ok === true : undefined,
        msg: server.msg || "-",
      }));
      viewModalVisible.value = true;
    } else {
      window.$message?.error("服务器数据格式不正确");
    }
  } catch (error) {
    console.error("处理服务器数据失败:", error);
    window.$message?.error("处理服务器数据失败");
  }
}

function edit(id: number, row: any, isReadonly = false) {
  const editData = {
    ...row,
    isReadonly
  };
  handleEdit(id, editData);
}

</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <NCard
      :title="$t('page.manage.notifications.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          :show-add="hasAuth('operate:marquee:add')"
          :show-batch-delete="hasAuth('operate:marquee:remove')"
          :show-revoke-notice="hasAuth('operate:marquee:stop')"
          :disabled-revoke-notice="disabledRevokeNotice"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @revoke-notice="handleRevokeNotice"
          @refresh="getData"
        />
      </template>

      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="962"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />

      <MailOperateDrawer
        v-model:visible="drawerVisible"
        @submitted="getDataByPage"
        :operate-type="operateType"
        :row-data="editingData"
        :readonly="editingData?.isReadonly"
      />
      <ViewStatusModal
        v-model:visible="viewModalVisible"
        :server-data="currentViewData"
      />
    </NCard>
  </div>
</template>


<style scoped></style>
