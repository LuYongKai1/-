<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NSpace, NDataTable } from "naive-ui";
import {
  fetchGetServerCrossList,
  fetchSyncServerCross,
  fetchGetServeritemDelete,
  fetchSyncCloudServerStatus,
  fetchSetNormalMode,
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import {
  serverStatusShow,
  serverRunStateRecord,
  clusterStatusRecord,
} from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { ref, onMounted, computed, onBeforeUnmount, watch } from "vue";
import { format } from 'date-fns';
import ConfigOperateDrawer from './config-operate-drawer.vue';
import ServerConfigModal from '../modules/server-config-modal.vue';
import { useAuth } from '@/hooks/business/auth';
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';

const { hasAuth } = useAuth();
const appStore = useAppStore();

// 接收父组件传递的方法
interface Props {
  onSyncCloudServer?: () => void | Promise<void>;
  onReleaseServer?: () => void | Promise<void>;
  onStartServer?: () => void | Promise<void>;
  onStopServer?: () => void | Promise<void>;
  onRestartServer?: () => void | Promise<void>;
  onUpdateServer?: () => void | Promise<void>;
}

const props = defineProps<Props>();

const groupDrawerVisible = ref(false);
const groupRowData = ref<any>(null);

/** 服务器是否已部署完成 */
const isServerDeployed = ref(false);

/** 数据自动刷新间隔(毫秒) */
const DATA_REFRESH_INTERVAL = 5000;

/** 定时刷新计时器 */
const refreshTimer = ref<number | null>(null);

/** 是否需要自动刷新（当有部署中的服务器时才需要） */
const needAutoRefresh = ref<boolean>(false);

/** 轮询刷新时隐藏表格 loading */
const suppressLoading = ref<boolean>(false);

/** 检查选中的服务器是否可以释放（只有运行中状态才能释放） */
const canReleaseServer = ref(false);

/** 检查选中的服务器是否可以更新（只有运行中状态才能更新） */
const canUpdateServer = ref(false);

/** 检查选中的服务器是否可以启动（只有已停止状态才能启动） */
const canStartServer = ref(false);

/** 检查选中的服务器是否可以停止（只有运行中状态才能停止） */
const canStopServer = ref(false);

/** 检查选中的服务器是否可以重启（只有运行中状态才能重启） */
const canRestartServer = ref(false);

// 查看服务器配置
const showConfigModal = ref(false);
const configData = ref<any>(null);

// 定义 emits
const emit = defineEmits<{
  (e: 'viewDeploymentStatus', taskId: string, clusterStatus?: string | number, taskType?: 'deploy' | 'release'): void;
  (e: 'edit', id: number, rowData: any): void;
}>();

const {
  columns,
  columnChecks,
  data,
  getData,
  loading,
  searchParams,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetServerCrossList as any,
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
      disabled: (row: any) => row.nodeType === 'normal'
    },
    {
      key: "serverId",
      title: $t("page.manage.serveritem.serverId"),
      align: "center",
      minWidth: 100,
      render: (row: any) => row.serverId || row.id
    },
    {
      key: "serverName",
      title: $t("page.manage.serveritem.serverName"),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        const isCross = row.nodeType === 'cross';
        const isNormal = row.nodeType === 'normal';
        return (
          <div class="flex-center">
            {isCross && (
              <NTag type="info" size="small" class="mr-2">{$t("page.manage.servercross.cross")}</NTag>
            )}
            {isNormal && (
              <NTag type="default" size="small" class="mr-2">{$t("page.manage.servercross.normal")}</NTag>
            )}
            <span>{row.serverName}</span>
          </div>
        );
      }
    },
    {
      key: "runState" as any,
      title: $t("page.manage.serveritem.runState"),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        // 强制使用当前行数据，避免缓存
        const currentRow = data.value.find((item: any) => item.id === row.id) || row;

        if (currentRow.runState === null || currentRow.runState === undefined) {
          return null;
        }

        const stateColors: Record<number, string> = {
          0: '#00FF00', // 绿色
          1: '#FFA500', // 黄色
          2: '#FF0000', // 红色
          3: '#86909c', // 灰色
        };

        const state = Number(currentRow.runState);
        const color = stateColors[state] || '#86909c';
        const stateText = $t(serverRunStateRecord[String(state) as Api.SystemManage.serverRunState]);

        return (
          <div class="flex-center">
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: color
            }}></div>
            <span class="ml-2">{stateText}</span>
          </div>
        );
      }
    },
    {
      key: "onlineUser" as any,
      title: $t("page.manage.serveritem.onlineUser"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "serverOpenDate",
      title: $t("page.manage.serveritem.serverOpenDate"),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        if (row.serverOpenDate) {
          try {
            const date = new Date(row.serverOpenDate);
            return format(date, 'yyyy-MM-dd HH:mm:ss');
          } catch (error) {
            console.error("Error formatting date:", error);
            return row.serverOpenDate;
          }
        }
        return null;
      },
    },
    {
      key: "serverOpenDays" as any,
      title: $t("page.manage.serveritem.serverOpenDays"),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        if (row.serverOpenDate) {
          try {
            const openDate = new Date(row.serverOpenDate);
            const now = new Date();

            // 按照自然日计算：将时间归零到当天的00:00:00
            const openDateOnly = new Date(openDate.getFullYear(), openDate.getMonth(), openDate.getDate());
            const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // 计算自然日差值，开服当天算第1天
            const diffTime = nowDateOnly.getTime() - openDateOnly.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

            if (diffDays < 1) {
              return <span class="text-gray-400" style={{ whiteSpace: 'nowrap' }}>{$t("page.manage.serveritem.notOpenYet")}</span>;
            } else if (diffDays === 1) {
              return <span class="text-success" style={{ whiteSpace: 'nowrap' }}>{$t("page.manage.serveritem.today")}</span>;
            } else {
              return <span style={{ whiteSpace: 'nowrap' }}>{diffDays} {$t("page.manage.serveritem.days")}</span>;
            }
          } catch (error) {
            console.error("Error calculating days:", error);
            return null;
          }
        }
        return null;
      },
    },
    {
      key: "serverStatus",
      title: $t("page.manage.serveritem.serverStatus"),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        if (row.serverStatus === null) return null;

        const typeMap: Record<number, "success" | "warning" | "error" | "default" | "info"> = {
          0: "success",
          1: "warning",
          2: "error",
          3: "default",
          4: "info",
          5: "default",
        };

        const label = $t(serverStatusShow[row.serverStatus as keyof typeof serverStatusShow]);
        return (
          <NTag type={typeMap[row.serverStatus] || "default"}>
            {label}
          </NTag>
        );
      },
    },
    {
      key: "deploymentStatus" as any,
      title: $t("page.manage.serveritem.deployment.deploymentStatus"),
      align: "center",
      minWidth: 150,
      render: (row: any) => {
        // 强制使用当前行数据，避免缓存
        const currentRow = data.value.find((item: any) => item.id === row.id) || row;

        // 显示集群状态
        if (currentRow.clusterStatus !== null && currentRow.clusterStatus !== undefined) {
          const statusColors: Record<string, string> = {
            '-1': '#86909c', // 初始化 - 灰色
            '0': '#1890ff', // 创建中 - 蓝色
            '1': '#52c41a', // 创建成功 - 绿色
            '2': '#ff4d4f', // 创建失败 - 红色
            '3': '#faad14', // 部署中 - 橙色
            '4': '#52c41a', // 运行中 - 绿色
            '5': '#ff4d4f', // 已停止 - 橙黄色
            '6': '#ff4d4f', // 删除中 - 红色
            '7': '#d9d9d9', // 已删除 - 浅灰色
            '8': '#1890ff', // 更新中 - 蓝色
            '9': '#722ed1', // 已回滚 - 紫色
          };

          const status = String(currentRow.clusterStatus) as Api.SystemManage.clusterStatus;
          const color = statusColors[status] || '#86909c';
          const statusText = $t(clusterStatusRecord[status]);

          return (
            <div class="flex-center gap-8px">
              <div class="flex-center">
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: color
                }}></div>
                <span class="ml-2">{statusText}</span>
              </div>
              {currentRow.taskId && hasAuth(['server:task:view', 'server:progress:summary', 'server:progress:delete', 'server:task:history']) && (
                <NButton
                  text
                  type="primary"
                  size="small"
                  onClick={() => handleViewDeploymentStatus(currentRow.taskId, currentRow.clusterStatus)}
                  class="hover:bg-primary-50"
                >
                  {{
                    icon: () => <icon-mdi-eye-outline class="text-lg" />
                  }}
                </NButton>
              )}
            </div>
          );
        }

        // 如果没有集群状态，只显示查看按钮
        if (currentRow.taskId && hasAuth(['server:task:view', 'server:progress:summary', 'server:progress:delete', 'server:task:history'])) {
          return (
            <NButton
              text
              type="primary"
              size="small"
              onClick={() => handleViewDeploymentStatus(currentRow.taskId, currentRow.clusterStatus)}
              class="hover:bg-primary-50"
            >
              {{
                icon: () => <icon-mdi-eye-outline class="text-lg" />
              }}
            </NButton>
          );
        }

        return <span class="text-gray-300">-</span>;
      },
    },
    {
      key: "serverVersion" as any,
      title: $t("page.manage.serveritem.serverVersion"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "serverConfig" as any,
      // title: $t("page.manage.serveritem.serverConfig"),
      align: "center",
      width: 100,
      render: (row: any) => {
        // 只有跨服节点才显示配置按钮
        if (row.nodeType !== 'cross') return null;

        return (
          <NButton
            text
            type="info"
            size="small"
            onClick={() => handleViewConfig(row.id, row)}
            class="hover:bg-primary-50"
          >
            {{
              icon: () => <icon-mdi-cog-outline class="text-lg" />
            }}
          </NButton>
        );
      },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 200,
      render: (row: any) => (
        <div class="flex-center gap-8px">
          {row.nodeType === 'cross' && hasAuth('game:crossRelation:add') && (
            <NButton
              type="info"
              ghost
              size="small"
              onClick={() => handleAssign(row)}
            >
              {$t("page.manage.servercross.assign")}
            </NButton>
          )}

          {row.nodeType === 'cross' && hasAuth('game:item:edit') && (
            <NButton
            type="primary"
            ghost
            size="small"
            onClick={() => edit(row.id, row)}
          >
            {$t("common.edit")}
          </NButton>
          )}

          {row.nodeType === 'cross' && hasAuth('game:item:remove') && (
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
  ] as any,
});

const {
  checkedRowKeys,
  onBatchDeleted,
  onDeleted,
} = useTableOperate(data as any, getData);

// 处理子服务器数据的函数
function processChildServers(children: any[] = [], parentId: string | number) {
  return children.map((child: any) => ({
    ...child,
    nodeType: 'normal',
    id: `${parentId}_${child.normalServerId || child.id}`,
    serverId: child.normalServerId || child.id,
    serverName: child.serverName || `服务器${child.normalServerId}`,
    serverOpenDate: child.startTime || null,
    serverStatus: child.status || 0
  }));
}

const treeData = computed(() => {
  return (data.value as any[]).map(server => {
    const children = processChildServers(server.children || [], server.id);
    return {
      ...server,
      nodeType: 'cross',
      id: server.id,
      children: children
    };
  });
});

/**
 * 查看部署状态
 */
function handleViewDeploymentStatus(taskId: string, clusterStatus?: string | number) {
  // 判断任务类型
  const status = clusterStatus !== undefined && clusterStatus !== null ? String(clusterStatus) : '';
  const isReleaseStatus = status === '5' || status === '6' || status === '7';

  emit('viewDeploymentStatus', taskId, clusterStatus, isReleaseStatus ? 'release' : 'deploy');
}

/**
 * 检查是否有需要监控的服务器状态
 */
function checkNeedAutoRefresh(): boolean {
  return treeData.value.some((server: any) => {
    if (server.nodeType !== 'cross') return false;

    const clusterStatus = server.clusterStatus !== undefined && server.clusterStatus !== null
      ? String(server.clusterStatus)
      : '';

    // 需要监控的状态：创建中(0)、部署中(3)、删除中(6)
    return ['0', '3', '6'].includes(clusterStatus);
  });
}

/**
 * 开始数据自动刷新
 */
function startDataRefresh(): void {
  // 防止重复启动
  if (refreshTimer.value) return;

  refreshTimer.value = window.setInterval(async () => {
    try {
      // 检查是否需要继续刷新
      needAutoRefresh.value = checkNeedAutoRefresh();

      if (needAutoRefresh.value) {
        suppressLoading.value = true;
        await getData();
      } else {
        // 如果没有需要监控的状态，停止自动刷新
        stopDataRefresh();
      }
    } catch (error) {
      console.error('自动刷新数据失败:', error);
    } finally {
      suppressLoading.value = false;
    }
  }, DATA_REFRESH_INTERVAL);
}

/**
 * 停止数据自动刷新
 */
function stopDataRefresh(): void {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
    refreshTimer.value = null;
  }
}

onMounted(async () => {
  await getData();

  // 检查是否需要自动刷新
  needAutoRefresh.value = checkNeedAutoRefresh();

  // 只有在需要时才启动自动刷新功能
  if (needAutoRefresh.value) {
    startDataRefresh();
  }
});

/**
 * 检查服务器是否可以删除

 */
function checkDeletePermission(servers: any[]) {
  // 允许删除的状态：-1(初始化)、2(创建失败)、7(已删除)、9(已回滚)
  const allowedStatuses = ['-1', '2', '7', '9'];

  return servers.filter((server: any) => {
    // 如果没有 clusterStatus，允许删除
    if (server.clusterStatus === null || server.clusterStatus === undefined) {
      return false;
    }
    const status = String(server.clusterStatus);
    return !allowedStatuses.includes(status);
  });
}

async function handleBatchDelete() {
  try {
    const selectedKeys = [...checkedRowKeys.value];

    if (selectedKeys.length === 0) {
      window.$message?.warning($t('common.pleaseSelectData'));
      return;
    }

    // 获取选中的跨服服务器
    const selectedKeysAsNumbers = selectedKeys.map(key => Number(key));
    const selectedServers = treeData.value.filter((item: any) =>
      selectedKeysAsNumbers.includes(Number(item.id)) && item.nodeType === 'cross'
    );

    // 检查删除权限
    const invalidServers = checkDeletePermission(selectedServers);

    if (invalidServers.length > 0) {
      const statusNames = invalidServers.map((server: any) => {
        const status = String(server.clusterStatus) as Api.SystemManage.clusterStatus;
        return `${server.serverName}(${$t(clusterStatusRecord[status])})`;
      }).join('、');

      window.$message?.error(
        $t('page.manage.serveritem.onlyDeleteAllowedStatus') + ': ' + statusNames
      );
      return;
    }

    // 批量删除，遍历选中的每个ID
    for (const id of selectedKeys) {
      await fetchGetServeritemDelete({ id: Number(id) });
    }
    onBatchDeleted();
    checkedRowKeys.value = [];
  } catch (error) {
    handleApiCatchError(error, '批量删除');
  }
}

async function handleDelete(id: number) {
  try {
    const server = treeData.value.find((item: any) => Number(item.id) === Number(id) && item.nodeType === 'cross');

    if (!server) {
      window.$message?.warning($t('common.pleaseSelectData'));
      return;
    }

    // 检查删除权限
    const invalidServers = checkDeletePermission([server]);

    if (invalidServers.length > 0) {
      const status = String(server.clusterStatus) as Api.SystemManage.clusterStatus;
      const statusText = $t(clusterStatusRecord[status]);
      window.$message?.error(
        $t('page.manage.serveritem.cannotDeleteInStatus') + ': ' + statusText
      );
      return;
    }

    await fetchGetServeritemDelete({ id });
    onDeleted();
  } catch (error) {
    handleApiCatchError(error, '删除');
  }
}

function edit(id: number, row: any) {
  const editData = {
    ...row,
  };
  emit('edit', id, editData);
}

// 查看服务器配置
function handleViewConfig(id: number, row: any) {
  configData.value = row;
  showConfigModal.value = true;
}

function handleAssign(row: any) {
  groupRowData.value = row;
  groupDrawerVisible.value = true;
}

async function handleGroupSubmitted() {
  await getData();
}

/**
 * 根据选中的行更新部署状态、释放状态和更新状态
 * 逻辑与普通服务器列表保持一致
 */
async function updateDeploymentStatus(selectedKeys: (string | number)[]): Promise<void> {
  // 重置状态
  const resetStates = () => {
    isServerDeployed.value = true;
    canReleaseServer.value = false;
    canUpdateServer.value = false;
    canStartServer.value = false;
    canStopServer.value = false;
    canRestartServer.value = false;
  };

  // 未选中任何服务器时，重置所有状态
  if (selectedKeys.length === 0) {
    resetStates();
    return;
  }

  // 获取所有选中的跨服服务器（只选择 nodeType === 'cross' 的节点）
  const selectedServers = selectedKeys
    .map(id => treeData.value.find((item: any) => String(item.id) === String(id) && item.nodeType === 'cross'))
    .filter(Boolean);

  if (selectedServers.length === 0) {
    resetStates();
    return;
  }

  // 检查所有选中服务器的状态
  const allRunning = selectedServers.every((server: any) => {
    const status = server?.clusterStatus !== undefined && server?.clusterStatus !== null
      ? String(server.clusterStatus)
      : '';
    return status === '4'; // 运行中
  });

  const allStopped = selectedServers.every((server: any) => {
    const status = server?.clusterStatus !== undefined && server?.clusterStatus !== null
      ? String(server.clusterStatus)
      : '';
    return status === '5'; // 已停止
  });

  // 检查是否所有服务器都是运行中或已停止状态
  const allRunningOrStopped = selectedServers.every((server: any) => {
    const status = server?.clusterStatus !== undefined && server?.clusterStatus !== null
      ? String(server.clusterStatus)
      : '';
    return status === '4' || status === '5'; // 运行中或已停止
  });

  // 检查是否有处于过渡状态的服务器（创建中、部署中等不可操作的状态）
  const hasTransitioning = selectedServers.some((server: any) => {
    const status = server?.clusterStatus !== undefined && server?.clusterStatus !== null
      ? String(server.clusterStatus)
      : '';
    // '0': 创建中, '3': 部署中, '6': 删除中, '8': 更新中
    return ['0', '3', '6', '8'].includes(status);
  });

  // 批量操作权限判断
  // 释放、停止、更新：所有服务器都必须是运行中或已停止状态，且没有处于过渡状态的
  canReleaseServer.value = selectedServers.length > 0 && allRunningOrStopped && !hasTransitioning;
  canStopServer.value = selectedServers.length > 0 && allRunningOrStopped && !hasTransitioning;
  // 重启：只有运行中状态才能重启
  canRestartServer.value = selectedServers.length > 0 && allRunning && !hasTransitioning;

  // 启动：只有状态为 '5'（已停止/停服中）的服务器才能启动
  // 后端限制：服务器状态不允许恢复，只有停服中状态才能恢复
  canStartServer.value = selectedServers.length > 0 && allStopped && !hasTransitioning;

  // 更新服务器：支持批量操作，所有服务器都必须是运行中或已停止状态，且没有处于过渡状态
  canUpdateServer.value = selectedServers.length > 0 && allRunningOrStopped && !hasTransitioning;

  // 同步云服务器：支持批量操作
  // 检查所有选中服务器是否都可以同步
  const ALLOWED_SYNC_STATUSES = ['-1', '7'];
  const allCanSync = selectedServers.every((server: any) => {
    const clusterStatus = server?.clusterStatus !== undefined && server?.clusterStatus !== null
      ? String(server.clusterStatus)
      : '';

    // ALLOWED_SYNC_STATUSES = ['-1', '7'] 表示初始化和已删除状态可以同步
    if (ALLOWED_SYNC_STATUSES.includes(clusterStatus)) {
      return true;
    }

    // 创建失败(2) - 允许重新同步
    if (clusterStatus === '2') {
      return true;
    }

    // 过渡状态：创建中、部署中、删除中、更新中 - 不允许同步
    if (['0', '3', '6', '8'].includes(clusterStatus)) {
      return false;
    }

    // 其他状态（如运行中'4'、已停止'5'、创建成功'1'）- 已部署，不允许同步
    return false;
  });

  // 是否所有服务器都已部署（用于禁用同步按钮）
  isServerDeployed.value = selectedServers.length > 0 && !allCanSync;
}

watch(checkedRowKeys, updateDeploymentStatus, { immediate: false });

/**
 * 同步云服务器 - 调用父组件方法
 */
async function handleSyncCloudServer() {
  if (props.onSyncCloudServer) {
    await props.onSyncCloudServer();
    // 刷新本地数据
    await getData();

    // 检查并启动自动刷新
    needAutoRefresh.value = checkNeedAutoRefresh();
    if (needAutoRefresh.value && !refreshTimer.value) {
      startDataRefresh();
    }
  }
}

// 开启服务器 - 调用父组件方法
async function handleStartServer() {
  if (props.onStartServer) {
    await props.onStartServer();
    await getData();
  }
}

// 停止服务器 - 调用父组件方法
async function handleStopServer() {
  if (props.onStopServer) {
    await props.onStopServer();
    await getData();
  }
}

// 重启服务器 - 调用父组件方法
async function handleRestartServer() {
  if (props.onRestartServer) {
    await props.onRestartServer();
    await getData();
  }
}

// 释放服务器 - 调用父组件方法
async function handleReleaseServer() {
  if (props.onReleaseServer) {
    await props.onReleaseServer();
    // 刷新本地数据
    await getData();
    // 检查并启动自动刷新
    needAutoRefresh.value = checkNeedAutoRefresh();
    if (needAutoRefresh.value && !refreshTimer.value) {
      startDataRefresh();
    }
  }
}

// 更新服务器 - 调用父组件方法
async function handleUpdateServer() {
  if (props.onUpdateServer) {
    await props.onUpdateServer();
    // 刷新本地数据
    await getData();
    // 检查并启动自动刷新
    needAutoRefresh.value = checkNeedAutoRefresh();
    if (needAutoRefresh.value && !refreshTimer.value) {
      startDataRefresh();
    }
  }
}

// 处理同步功能
function buildSyncParams(crossServer: any) {
  const serverIds = (crossServer.children || [])
    .map((child: any) => Number(child.normalServerId || child.serverId || child.id))
    .filter((id: number) => !isNaN(id));

  const crossServerId = Number(crossServer.serverId || crossServer.id);

  return {
    gameId: 101,
    crossServerId,
    serverIds
  };
}

// 设置正常模式
async function handleNormal() {
  if (checkedRowKeys.value.length === 0) {
    window.$message?.warning($t('common.noServerSelected'));
    return;
  }

  // 获取选中的服务器ID
  const selectedServerIds: number[] = [];

  for (const id of checkedRowKeys.value) {
    for (const cross of treeData.value) {
      if (cross.id === id && cross.nodeType === "cross") {
        selectedServerIds.push(Number(cross.serverId || cross.id));
      } else if (cross.children) {
        const normalServer = cross.children.find((c: any) => c.id === id && c.nodeType === "normal");
        if (normalServer) {
          selectedServerIds.push(Number(normalServer.serverId || normalServer.id));
        }
      }
    }
  }

  if (selectedServerIds.length === 0) {
    window.$message?.warning($t('common.noValidServerSelected'));
    return;
  }

  try {
    const response = await fetchSetNormalMode(selectedServerIds);

    if (!handleApiResponseError(response, '设置正常模式')) {
      window.$message?.success($t('common.operationSuccess'));
      await getData();
      checkedRowKeys.value = [];
    }
  } catch (error) {
    handleApiCatchError(error, '设置正常模式');
  }
}

async function handleSync() {
  if (checkedRowKeys.value.length === 0) {
    window.$message?.warning($t("page.manage.servercross.form.crossServer"));
    return;
  }

  try {
    const crossServerMap = new Map<number, any>();

    for (const id of checkedRowKeys.value) {
      for (const cross of treeData.value) {
        if (cross.id === id && cross.nodeType === "cross") {
          crossServerMap.set(Number(cross.serverId || cross.id), cross);
        } else if (cross.children?.some((c: any) => c.id === id && c.nodeType === "normal")) {
          crossServerMap.set(Number(cross.serverId || cross.id), cross);
        }
      }
    }

    for (const crossServer of crossServerMap.values()) {
      const syncParams = buildSyncParams(crossServer);
      const response = await fetchSyncServerCross(syncParams);

      if (response.error) {
        const responseData = response.response?.data;
        if (responseData) {
          const { code, msg } = responseData;
          if (code === 0) {
            window.$message?.success(
              `${crossServer.serverName} ${$t("common.syncSuccess")}`
            );
          } else {
            window.$message?.error(msg || $t("common.syncFailed"));
          }
        } else {
          window.$message?.error($t("common.syncFailed"));
        }
      } else if (response.data) {
        const { code, msg } = response.data;
        if (code === 0) {
          window.$message?.success(
            `${crossServer.serverName} ${$t("common.syncSuccess")}`
          );
        } else {
          window.$message?.error(msg || $t("common.syncFailed"));
        }
      }
    }

    await getData();
  } catch (error) {
    handleApiCatchError(error, $t("page.manage.servercross.sync"));
  }
}

onBeforeUnmount(() => {
  stopDataRefresh();
});

// 暴露方法和状态给父组件
defineExpose({
  getData,
  handleBatchDelete,
  handleSync,
  handleNormal,
  handleStartServer,
  handleStopServer,
  handleRestartServer,
  handleSyncCloudServer,
  handleReleaseServer,
  handleUpdateServer,
  checkedRowKeys,
  columnChecks,
  loading,
  isServerDeployed,
  canReleaseServer,
  canUpdateServer,
  canStartServer,
  canStopServer,
  canRestartServer,
  treeData
});
</script>

<template>
  <div class="flex-col-stretch h-full">
    <NDataTable
      v-model:checked-row-keys="checkedRowKeys"
      :columns="columns"
      :data="treeData"
      size="small"
      :flex-height="!appStore.isMobile"
      :scroll-x="962"
      :loading="!suppressLoading && loading"
      :row-key="(row) => row.id"
      :pagination="false"
      children-key="children"
      :default-expand-all="true"
      class="sm:h-full"
    />

    <ConfigOperateDrawer
      v-model:visible="groupDrawerVisible"
      :row-data="groupRowData"
      @submitted="handleGroupSubmitted"
    />

    <!-- 服务器配置查看弹框 -->
    <ServerConfigModal
      v-model:visible="showConfigModal"
      :config-data="configData"
    />
  </div>
</template>

<style scoped></style>

