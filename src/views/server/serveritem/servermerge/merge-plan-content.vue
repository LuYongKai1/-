<script setup lang="tsx">
import { ref, onMounted } from "vue";
import { NButton, NPopconfirm, NTag, NDataTable, NSpin } from "naive-ui";
import { format } from 'date-fns';
import { fetchGetMergePlanList, fetchExecuteMergePlan, fetchDeleteMergePlan, fetchSyncMergePlan } from "@/service/api/game-manage";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useTable } from "@/hooks/common/table";
import { useAuth } from '@/hooks/business/auth';
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';
import MergePlanOperateDrawer, { type MergePlanOperateType } from './modules/merge-plan-operate-drawer.vue';
import ParamsTemplateModal from './modules/params-template-modal.vue';

defineOptions({
  name: "MergePlanContent",
});

const { hasAuth } = useAuth();
const appStore = useAppStore();

const drawerVisible = ref(false);
const operateType = ref<MergePlanOperateType>("add");
const editingData = ref<any>(null);
const paramsTemplateVisible = ref(false);
const currentViewData = ref<any>(null);

const {
  columns,
  columnChecks,
  data,
  getData,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetMergePlanList as any,
  showTotal: true,
  immediate: false,
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
      title: "计划ID",
      align: "center",
      minWidth: 80,
    },
    {
      key: "originalServerName",
      title: "源服务器(被合)",
      align: "center",
      minWidth: 120,
      render: (row: any) => <NTag type="info" size="small">{row.originalServerName}</NTag>
    },
    {
      key: "targetServerName",
      title: "目标服务器(主服)",
      align: "center",
      minWidth: 120,
      render: (row: any) => <NTag type="success" size="small">{row.targetServerName}</NTag>
    },
    {
      key: "mergeStatus",
      title: "合服状态",
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        const statusMap: Record<number, { type: string; label: string }> = {
          0: { type: "default", label: "准备中" },
          1: { type: "warning", label: "执行中" },
          2: { type: "success", label: "已完成" },
          3: { type: "error", label: "失败" },
          4: { type: "info", label: "已回滚" },
          5: { type: "warning", label: "待同步" },
        };
        const status = statusMap[row.mergeStatus] || statusMap[0];
        return (
          <NTag type={status.type as any} size="small">
            {status.label}
          </NTag>
        );
      },
    },
    {
      key: "progress",
      title: "进度",
      align: "center",
      minWidth: 120,
      render: (row: any) => {
        if (row.progress !== null && row.progress !== undefined) {
          const percentage = Math.max(0, Math.min(100, Number(row.progress) || 0));
          // 执行中使用 loading 展示，其他状态用标签展示百分比
          if (row.mergeStatus === 1) {
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <NSpin size="small" />
                <span>{percentage}%</span>
              </div>
            );
          }

          const type =
            row.mergeStatus === 2
              ? "success"
              : row.mergeStatus === 3
              ? "error"
              : "info";

          return (
            <NTag type={type as any} size="small">
              {percentage}%
            </NTag>
          );
        }

        // 没有进度值但处于执行中，也显示 loading
        if (row.mergeStatus === 1) {
          return <NSpin size="small" />;
        }
        return <span class="text-gray-400">-</span>;
      },
    },
    {
      key: "planTime",
      title: "计划时间",
      align: "center",
      minWidth: 180,
      render: (row: any) => {
        if (row.planTime) {
          try {
            const date = new Date(row.planTime);
            return <span style={{ whiteSpace: 'nowrap' }}>{format(date, 'yyyy-MM-dd HH:mm:ss')}</span>;
          } catch (error) {
            return row.planTime;
          }
        }
        return null;
      },
    },
    {
      key: "executeTime",
      title: "执行时间",
      align: "center",
      minWidth: 180,
      render: (row: any) => {
        if (row.executeTime) {
          try {
            const date = new Date(row.executeTime);
            return <span style={{ whiteSpace: 'nowrap' }}>{format(date, 'yyyy-MM-dd HH:mm:ss')}</span>;
          } catch (error) {
            return row.executeTime;
          }
        }
        return <span class="text-gray-400">-</span>;
      },
    },
    {
      key: "finishTime",
      title: "完成时间",
      align: "center",
      minWidth: 180,
      render: (row: any) => {
        if (row.finishTime) {
          try {
            const date = new Date(row.finishTime);
            return <span style={{ whiteSpace: 'nowrap' }}>{format(date, 'yyyy-MM-dd HH:mm:ss')}</span>;
          } catch (error) {
            return row.finishTime;
          }
        }
        return <span class="text-gray-400">-</span>;
      },
    },
    {
      key: "operator",
      title: "操作人",
      align: "center",
      minWidth: 100,
    },
    {
      key: "createTime",
      title: "创建时间",
      align: "center",
      minWidth: 180,
      render: (row: any) => {
        if (row.createTime) {
          try {
            const date = new Date(row.createTime);
            return <span style={{ whiteSpace: 'nowrap' }}>{format(date, 'yyyy-MM-dd HH:mm:ss')}</span>;
          } catch (error) {
            return row.createTime;
          }
        }
        return null;
      },
    },
    {
      key: "resultData",
      title: "合服参数",
      align: "center",
      minWidth: 120,
      render: (row: any) => {
        if (row.resultData) {
          return (
            <NButton
              text
              type="primary"
              size="small"
              onClick={() => handleViewParams(row)}
            >
              {{
                icon: () => <icon-mdi-eye-outline class="text-icon" />,
              }}
            </NButton>
          );
        }
        return <span class="text-gray-400">-</span>;
      },
    },
    {
      key: "errorLog",
      title: "合服日志",
      align: "center",
      minWidth: 150,
      render: (row: any) => {
        if (row.errorLog) {
          return (
            <NButton
              text
              type="warning"
              size="small"
              onClick={() => window.$message?.info(row.errorLog, { duration: 5000 })}
            >
              查看日志
            </NButton>
          );
        }
        return <span class="text-gray-400">-</span>;
      },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 200,
      render: (row) => (
        <div class="flex items-center justify-center gap-8px">
          <div class="operate-slot-first">
            {row.mergeStatus === 0 ? (
              <NPopconfirm onPositiveClick={() => handleExecute(row.id)}>
                {{
                  default: () => "确认执行该合服计划？",
                  trigger: () => (
                    <NButton
                      type="success"
                      ghost
                      size="small"
                    >
                      执行
                    </NButton>
                  ),
                }}
              </NPopconfirm>
            ) : null}
            {row.mergeStatus === 5 ? (
              <NPopconfirm onPositiveClick={() => handleSync(row)}>
                {{
                  default: () => "确认同步该合服数据？",
                  trigger: () => (
                    <NButton
                      type="primary"
                      ghost
                      size="small"
                    >
                      同步
                    </NButton>
                  ),
                }}
              </NPopconfirm>
            ) : null}
          </div>
          {row.mergeStatus === 2 ? (
            <NButton type="primary" ghost size="small" onClick={() => handleView(row)}>
              {$t("common.view")}
            </NButton>
          ) : (
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

const checkedRowKeys = ref<string[]>([]);

// 默认隐藏部分列
const defaultHiddenKeys = ['executeTime', 'finishTime', 'createTime'];
columnChecks.value.forEach((columnCheck) => {
  if (defaultHiddenKeys.includes(columnCheck.key as string)) {
    columnCheck.checked = false;
  }
});

// 查看单个参数
function handleViewParams(row: any) {
  currentViewData.value = row;
  paramsTemplateVisible.value = true;
}

// 新增合服计划
function handleAdd() {
  operateType.value = 'add';
  editingData.value = null;
  drawerVisible.value = true;
}

// 编辑合服计划
function handleEdit(row: any) {
  operateType.value = 'edit';
  editingData.value = row;
  drawerVisible.value = true;
}

// 查看合服计划（已完成状态，只读）
function handleView(row: any) {
  operateType.value = 'view';
  editingData.value = row;
  drawerVisible.value = true;
}

// 提交成功回调
function handleSubmitted() {
  getData();
}

// 执行合服计划
async function handleExecute(id: number) {
  try {
    const response = await fetchExecuteMergePlan(id);
    if (!handleApiResponseError(response, '执行合服计划')) {
      window.$message?.success('执行成功');
      getData();
    }
  } catch (error) {
    handleApiCatchError(error, '执行合服计划');
  }
}

// 同步合服数据
async function handleSync(row: any) {
  try {
    const serverId = row.targetServerId || row.serverId;
    const mergeTaskId = row.id;

    if (!serverId) {
      window.$message?.error('无法获取目标服务器ID');
      return;
    }

    if (!mergeTaskId) {
      window.$message?.error('无法获取合服计划ID');
      return;
    }

    const response = await fetchSyncMergePlan(serverId, mergeTaskId);
    if (!handleApiResponseError(response, '同步合服数据')) {
      window.$message?.success('同步成功');
      getData();
    }
  } catch (error) {
    handleApiCatchError(error, '同步合服数据');
  }
}

// 删除合服计划
async function handleDelete(id: number) {
  try {
    const response = await fetchDeleteMergePlan([id]);
    if (!handleApiResponseError(response, '删除合服计划')) {
      window.$message?.success($t('common.deleteSuccess'));
      getData();
    }
  } catch (error) {
    handleApiCatchError(error, '删除合服计划');
  }
}

// 批量删除
async function handleBatchDelete() {
  if (checkedRowKeys.value.length === 0) {
    window.$message?.warning($t('common.pleaseSelectData'));
    return;
  }

  try {
    const ids = checkedRowKeys.value.map(key => Number(key));
    const response = await fetchDeleteMergePlan(ids);
    if (!handleApiResponseError(response, '批量删除合服计划')) {
      window.$message?.success($t('common.deleteSuccess'));
      checkedRowKeys.value = [];
      getData();
    }
  } catch (error) {
    handleApiCatchError(error, '批量删除合服计划');
  }
}

onMounted(() => {
  getData();
});

defineExpose({
  columnChecks,
  checkedRowKeys,
  loading,
  getData,
  handleBatchDelete,
  handleAdd,
});
</script>

<template>
  <div class="h-full">
    <NDataTable
      v-model:checked-row-keys="checkedRowKeys"
      :columns="columns"
      :data="data"
      size="small"
      :flex-height="!appStore.isMobile"
      :scroll-x="1200"
      :loading="loading"
      remote
      :row-key="(row) => row.id"
      :pagination="mobilePagination"
      class="sm:h-full"
    />

    <!-- 合服计划操作抽屉 -->
    <MergePlanOperateDrawer
      v-model:visible="drawerVisible"
      :operate-type="operateType"
      :row-data="editingData"
      @submitted="handleSubmitted"
    />

    <!-- 参数查看器 -->
    <ParamsTemplateModal
      v-model:visible="paramsTemplateVisible"
      :single-data="currentViewData"
    />
  </div>
</template>
