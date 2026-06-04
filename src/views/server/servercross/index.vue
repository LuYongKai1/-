<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NSpace, NModal, NCard, NCode, NSpin, useDialog } from "naive-ui";
import {
  fetchGetServerCrossList,
  fetchSyncServerCross,
  fetchGetServeritemDelete,
  fetchSyncCloudServerStatus,
  fetchSyncCloudServerLog,
  fetchStartServer,
  fetchSyncCloudServer,
  fetchReleaseServer,
  fetchReleaseServerStatus
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
import CrossOperateDrawer from "./modules/cross-operate-drawer.vue";
import ConfigOperateDrawer from './modules/config-operate-drawer.vue';
import DeploymentStatus from './modules/deployment-status.vue';
import { useAuth } from '@/hooks/business/auth';
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';

const { hasAuth } = useAuth();
const appStore = useAppStore();
const dialog = useDialog();

const groupDrawerVisible = ref(false);
const groupRowData = ref<any>(null);

/**
 * 判断是否为删除/释放状态
 * 状态 5, 6, 7 为删除相关状态
 */
const isReleaseStatus = computed(() => {
  const status = currentClusterStatus.value;
  return status === '5' || status === '6' || status === '7';
});

// 计算弹窗标题
const modalTitle = computed(() => {
  return currentTaskType.value === 'release'
    ? $t('page.manage.serveritem.deployment.cloudServerReleaseStatus')
    : $t('page.manage.serveritem.deployment.cloudServerDeploymentStatus');
});

// 部署状态相关变量
const showSyncStatusModal = ref(false);
const syncStatusData = ref<any>(null);
const syncStatusLoading = ref(false);
const syncStatusTimer = ref<number | null>(null);
const currentTaskId = ref<string>('');
const currentTaskType = ref<'deploy' | 'release'>('deploy'); // 任务类型：部署或释放
const currentClusterStatus = ref<string>(''); // 添加当前集群状态
const sseConnection = ref<boolean>(false);
const sseConnectionStatus = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
const sseErrorMessage = ref<string>('');
const realTimeLogs = ref<Array<{
  message: string,
  timestamp: string,
  type?: string,
  stage?: string,
  progress?: number,
  status?: string
}>>([]);

/** 轮询间隔时间(毫秒) */
const POLLING_INTERVAL = 3000;

/** SSE连接超时时间(毫秒) */
const SSE_CONNECTION_TIMEOUT = 10000;

/** 最大日志保留数量 */
const MAX_LOG_ENTRIES = 200;

/** SSE连接实例 */
const eventSource = ref<EventSource | null>(null);

/** 已处理消息的追踪集合 */
const processedMessages = ref<Set<string>>(new Set());

/** 日志轮询定时器 */
const logPollingTimer = ref<number | null>(null);

/** 日志轮询间隔(毫秒) */
const LOG_POLLING_INTERVAL = 2000;

/** 最后处理的日志ID */
const lastProcessedLogId = ref<number>(0);

/** 服务器是否已部署完成 */
const isServerDeployed = ref(false);

/** 数据自动刷新间隔(毫秒) */
const DATA_REFRESH_INTERVAL = 5000; // 改为10秒刷新一次，减少频率

/** 定时刷新计时器 */
const refreshTimer = ref<number | null>(null);

/** 是否需要自动刷新（当有部署中的服务器时才需要） */
const needAutoRefresh = ref<boolean>(false);


/** 检查选中的服务器是否可以释放（只有运行中状态才能释放） */
const canReleaseServer = ref(false);

const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
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
        // 只有跨服节点才显示部署状态
        if (row.nodeType !== 'cross') return <span class="text-gray-300">-</span>;

        // 强制使用当前行数据，避免缓存
        const currentRow = treeData.value.find((item: any) => item.id === row.id) || row;

        // 显示集群状态
        if (currentRow.clusterStatus !== null && currentRow.clusterStatus !== undefined) {
          const statusColors: Record<string, string> = {
            '-1': '#86909c', // 初始化 - 灰色
            '0': '#1890ff', // 创建中 - 蓝色
            '1': '#52c41a', // 创建成功 - 绿色
            '2': '#ff4d4f', // 创建失败 - 红色
            '3': '#faad14', // 部署中 - 橙色
            '4': '#52c41a', // 运行中 - 绿色
            '5': '#ff9800', // 已停止 - 橙黄色
            '6': '#ff4d4f', // 删除中 - 红色
            '7': '#d9d9d9', // 已删除 - 浅灰色
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
              {currentRow.taskId && (
                <NButton
                  text
                  type="primary"
                  size="small"
                  onClick={() => handleViewReward(currentRow.taskId, currentRow.clusterStatus)}
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
        if (currentRow.taskId) {
          return (
            <NButton
              text
              type="primary"
              size="small"
              onClick={() => handleViewReward(currentRow.taskId, currentRow.clusterStatus)}
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
  drawerVisible,
  operateType,
  editingData,
  handleAdd,
  handleEdit,
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
        await getData();
      } else {
        // 如果没有需要监控的状态，停止自动刷新
        stopDataRefresh();
      }
    } catch (error) {
      console.error('自动刷新数据失败:', error);
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

async function handleBatchDelete() {
  // 批量删除，遍历选中的每个ID
  for (const id of checkedRowKeys.value) {
    await fetchGetServeritemDelete({ id: Number(id) });
  }
  onBatchDeleted();
  checkedRowKeys.value = [];
}

async function handleDelete(id: number) {
  await fetchGetServeritemDelete({ id });
  onDeleted();
}

function edit(id: number, row: any) {
  const editData = {
    ...row,
  };
  handleEdit(id, editData);
}

function handleSearch(groupId: string) {
  updateSearchParams({
    groupId,
  });
  getData();
}

function handleAssign(row: any) {
  groupRowData.value = row;
  groupDrawerVisible.value = true;
}

async function handleGroupSubmitted() {
  await getData();
}

/**
 * 检查服务器部署状态
 * @param taskId 任务ID
 * @returns 是否已部署完成
 */
async function checkServerDeploymentStatus(taskId: string): Promise<boolean> {
  try {
    const response = await fetchSyncCloudServerStatus(taskId);
    const services = extractServicesFromResponse(response);
    return isAllServicesReady(services);
  } catch (error) {
    console.error('获取部署状态失败:', error);
    // 如果获取失败，允许同步(保守策略)
    return false;
  }
}

/**
 * 根据选中的行更新部署状态和释放状态
 */
async function updateDeploymentStatus(selectedKeys: (string | number)[]): Promise<void> {
  // 只有选中单个服务器时才检查部署状态
  if (selectedKeys.length !== 1) {
    isServerDeployed.value = true; // 未选中或多选时禁用
    canReleaseServer.value = false; // 未选中或多选时禁用释放
    return;
  }

  const selectedId = selectedKeys[0];
  const crossServer: any = treeData.value.find((item: any) => String(item.id) === String(selectedId) && item.nodeType === 'cross');

  // 检查 clusterStatus
  const clusterStatus = crossServer?.clusterStatus !== undefined && crossServer?.clusterStatus !== null
    ? String(crossServer.clusterStatus)
    : '';

  // 检查是否可以释放服务器（只有运行中状态 4 才能释放）
  canReleaseServer.value = clusterStatus === '4';

  // 检查是否允许同步云服务器（只有 -1(初始化)、7(已删除) 时才允许同步）
  const allowedSyncStatuses = ['-1', '7'];

  if (clusterStatus && !allowedSyncStatuses.includes(clusterStatus)) {
    // 不在允许的状态列表中，禁用同步按钮
    isServerDeployed.value = true;
    return;
  }

  // 如果服务器有 taskId，检查部署状态；否则允许同步
  if (crossServer?.taskId) {
    isServerDeployed.value = await checkServerDeploymentStatus(crossServer.taskId);
  } else {
    isServerDeployed.value = false;
  }
}

// 监听选中行的变化，检查部署状态
watch(checkedRowKeys, updateDeploymentStatus, { immediate: false });

/**
 * 验证同步云服务器的前置条件
 * @param selectedIds 选中的服务器ID列表
 * @returns 验证结果及服务器信息
 */
function validateSyncCloudServer(selectedIds: (string | number)[]): { valid: boolean; server?: any; message?: string } {
  // 检查是否选择了服务器
  if (selectedIds.length === 0) {
    return { valid: false, message: $t('common.selectOneServerToSync') };
  }

  // 只支持单个服务器同步
  if (selectedIds.length > 1) {
    return { valid: false, message: $t('common.onlyOneSyncAllowed') };
  }

  const selectedId = selectedIds[0];
  const crossServer: any = treeData.value.find((item: any) => String(item.id) === String(selectedId) && item.nodeType === 'cross');

  if (!crossServer?.serverId) {
    return { valid: false, message: $t('common.noValidServerSelected') };
  }

  // 检查是否已部署完成
  if (isServerDeployed.value) {
    return { valid: false, message: $t('common.serverAlreadyDeployed') };
  }

  return { valid: true, server: crossServer };
}

/**
 * 同步云服务器
 */
async function handleSyncCloudServer() {
  const selectedIds = checkedRowKeys.value;

  const validation = validateSyncCloudServer(selectedIds);

  if (!validation.valid) {
    window.$message?.warning(validation.message!);
    return;
  }

  const { server } = validation;

  const serverId = parseInt(server.serverId);
  const specId = server.specId;

  // 检查 specId 是否存在
  if (!specId || specId === null || specId === undefined) {
    window.$message?.warning($t('缺少模板Id'));
    return;
  }

  // 直接执行同步操作（弹框确认由 TableHeaderOperation 组件处理）
  await executeSyncCloudServer(serverId, specId);
}

/**
 * 执行同步云服务器操作
 */
async function executeSyncCloudServer(serverId: number, specId: string) {

  try {
    // 执行同步操作
    const syncResponse = await fetchSyncCloudServer(serverId, parseInt(specId));

    console.log('同步云服务器完整响应:', syncResponse);
    const hasError = handleApiResponseError(syncResponse, '同步云服务器');
    console.log('API 错误检查结果:', hasError);

    if (!hasError) {
      window.$message?.success($t('common.syncSuccess'));

      // 提取返回的 taskId
      const taskId = syncResponse?.data?.taskId || syncResponse?.response?.data?.taskId;
      console.log('从响应中提取的 taskId:', taskId);
      console.log('syncResponse.data:', syncResponse?.data);
      console.log('syncResponse.response?.data:', syncResponse?.response?.data);

      // 刷新列表数据
      await getData();

      // 如果有 taskId，自动打开部署状态弹窗
      if (taskId) {
        console.log('准备打开同步状态弹窗，taskId:', taskId);
        // 等待一小段时间确保后端已准备好
        await new Promise(resolve => setTimeout(resolve, 500));
        await handleViewReward(taskId);
      } else {
        console.log('API 响应中没有 taskId，尝试从服务器数据获取');
        // 如果没有返回 taskId，尝试从刚刚同步的服务器获取
        const updatedServer: any = treeData.value.find((item: any) => item.serverId === serverId);
        console.log('更新后的服务器数据:', updatedServer);
        if (updatedServer?.taskId) {
          console.log('从服务器数据中找到 taskId:', updatedServer.taskId);
          await new Promise(resolve => setTimeout(resolve, 500));
          await handleViewReward(updatedServer.taskId);
        } else {
          console.warn('无法找到 taskId，无法打开状态弹窗');
        }
      }

      // 清空选中状态
      checkedRowKeys.value = [];

      // 同步操作完成后，检查是否需要启动自动刷新
      needAutoRefresh.value = checkNeedAutoRefresh();
      if (needAutoRefresh.value && !refreshTimer.value) {
        startDataRefresh();
      }
    }
  } catch (error) {
    handleApiCatchError(error, '同步云服务器');
  }
}

// 开启服务器
async function handleStartServer() {
  const selectedIds = checkedRowKeys.value;
  if (selectedIds.length === 0) {
    window.$message?.warning($t('common.noServerSelected'));
    return;
  }

  // 只处理跨服节点
  const selectedServerIds = selectedIds
    .map(id => {
      const crossNode = treeData.value.find((item: any) => String(item.id) === String(id) && item.nodeType === 'cross');
      return crossNode?.serverId ? parseInt(crossNode.serverId) : null;
    })
    .filter(Boolean);

  if (selectedServerIds.length === 0) {
    window.$message?.warning($t('common.noValidServerSelected'));
    return;
  }

  try {
    await fetchStartServer(selectedServerIds as number[]);
    window.$message?.success($t('common.startServerAllSuccess'));
    checkedRowKeys.value = [];
    await getData();
  } catch (error) {
    console.error("开启服务器失败:", error);
    window.$message?.error($t('common.startServerAllFailed'));
  }
}

// 停止服务器
async function handleStopServer() {
  const selectedIds = checkedRowKeys.value;
  if (selectedIds.length === 0) {
    window.$message?.warning($t('common.noServerSelected'));
    return;
  }

  // 只处理跨服节点
  const selectedServerIds = selectedIds
    .map(id => {
      const crossNode = treeData.value.find((item: any) => String(item.id) === String(id) && item.nodeType === 'cross');
      return crossNode?.serverId ? parseInt(crossNode.serverId) : null;
    })
    .filter(Boolean);

  if (selectedServerIds.length === 0) {
    window.$message?.warning($t('common.noValidServerSelected'));
    return;
  }

  try {
    // TODO: 这里需要添加实际的停止服务器API调用
    // await fetchStopServer(selectedServerIds);
    window.$message?.success($t('common.stopServerSuccess'));
    checkedRowKeys.value = [];
    await getData();
  } catch (error) {
    console.error("停止服务器失败:", error);
    window.$message?.error($t('common.stopServerFailed'));
  }
}

// 重启服务器
async function handleRestartServer() {
  const selectedIds = checkedRowKeys.value;
  if (selectedIds.length === 0) {
    window.$message?.warning($t('common.noServerSelected'));
    return;
  }

  // 只处理跨服节点
  const selectedServerIds = selectedIds
    .map(id => {
      const crossNode = treeData.value.find((item: any) => String(item.id) === String(id) && item.nodeType === 'cross');
      return crossNode?.serverId ? parseInt(crossNode.serverId) : null;
    })
    .filter(Boolean);

  if (selectedServerIds.length === 0) {
    window.$message?.warning($t('common.noValidServerSelected'));
    return;
  }

  try {
    // TODO: 这里需要添加实际的重启服务器API调用
    // await fetchRestartServer(selectedServerIds);
    window.$message?.success($t('common.restartServerSuccess'));
    checkedRowKeys.value = [];
    await getData();
  } catch (error) {
    console.error("重启服务器失败:", error);
    window.$message?.error($t('common.restartServerFailed'));
  }
}

// 释放服务器
async function handleReleaseServer() {
  const selectedIds = checkedRowKeys.value;
  if (selectedIds.length === 0) {
    window.$message?.warning($t('common.noServerSelected'));
    return;
  }

  interface ReleaseResult {
    id: string | number;
    name: string;
    reason?: string;
    taskId?: string;
    clusterStatus?: string | number;
  }

  const results: { success: ReleaseResult[]; failed: ReleaseResult[] } = { success: [], failed: [] };

  for (const selectedId of selectedIds) {
    const crossNode = treeData.value.find((item: any) => String(item.id) === String(selectedId) && item.nodeType === 'cross');

    if (!crossNode?.serverId) {
      const serverIdentifier = crossNode?.serverName || selectedId;
      results.failed.push({ id: selectedId, name: serverIdentifier, reason: $t('common.noServerInfo') });
      continue;
    }

    // 检查集群状态，只有运行中（状态 4）才能释放
    const clusterStatus = crossNode?.clusterStatus !== undefined && crossNode?.clusterStatus !== null
      ? String(crossNode.clusterStatus)
      : '';

    if (clusterStatus !== '4') {
      const serverIdentifier = crossNode.serverName || crossNode.serverId;
      results.failed.push({
        id: selectedId,
        name: serverIdentifier,
        reason: $t('common.serverNotRunning') || '服务器未处于运行中状态，无法释放'
      });
      continue;
    }

    try {
      const response = await fetchReleaseServer(parseInt(String(crossNode.serverId)));

      console.log('释放服务器完整响应:', response);
      const hasError = handleApiResponseError(response, '释放服务器');
      console.log('API 错误检查结果:', hasError);

      if (!hasError) {
        const taskId = response?.data?.taskId || response?.response?.data?.taskId;

        results.success.push({
          id: selectedId,
          name: crossNode.serverName || String(crossNode.serverId),
          taskId: taskId // 保存 taskId 到结果中
        });
      } else {
        const serverIdentifier = crossNode.serverName || crossNode.serverId;
        results.failed.push({ id: selectedId, name: serverIdentifier, reason: $t('common.apiCallFailed') });
      }
    } catch (error) {
      handleApiCatchError(error, '释放服务器');
      const serverIdentifier = crossNode.serverName || crossNode.serverId;
      results.failed.push({ id: selectedId, name: serverIdentifier, reason: $t('common.apiCallFailed') });
    }
  }

  if (results.failed.length > 0) {
    const failedServers = results.failed.map(f => f.name).join(', ');
    if (results.success.length > 0) {
      const successServers = results.success.map(s => s.name).join(', ');
      window.$message?.warning(`${$t('common.releaseServerSuccess')}: ${successServers}; ${$t('common.releaseServerFailed')}: ${failedServers}`);
    } else {
      window.$message?.error($t('common.releaseServerFailed') + `: ${failedServers}`);
    }
  } else if (results.success.length > 0) {
    const successServers = results.success.map(s => s.name).join(', ');
    window.$message?.success($t('common.releaseServerSuccess') + `: ${successServers}`);
  }

  checkedRowKeys.value = [];

  // 第一次刷新数据
  await getData();

  // 如果只有一个服务器且释放成功，自动打开状态弹窗
  if (results.success.length === 1 && results.failed.length === 0) {
    const successResult = results.success[0] as any;

    // 如果有 taskId，立即打开状态弹窗
    if (successResult.taskId) {
      console.log('准备打开释放状态弹窗，taskId:', successResult.taskId);
      await handleViewReleaseStatus(successResult.taskId);
    } else {
      console.log('释放结果中没有 taskId，等待后端状态更新');
      // 等待后端状态更新
      await new Promise(resolve => setTimeout(resolve, 1500));
      await getData();

      // 获取最新的服务器信息
      const updatedServer: any = treeData.value.find((item: any) => String(item.id) === String(selectedIds[0]) && item.nodeType === 'cross');
      console.log('更新后的服务器数据:', updatedServer);

      if (updatedServer?.taskId) {
        console.log('从服务器数据中找到 taskId:', updatedServer.taskId);
        // 使用更新后的 clusterStatus（应该是 6 或 7）
        await handleViewReleaseStatus(updatedServer.taskId);
      } else {
        console.warn('未找到 taskId，无法打开状态弹窗');
      }
    }
  }

  // 释放操作完成后，检查是否需要启动自动刷新
  needAutoRefresh.value = checkNeedAutoRefresh();
  if (needAutoRefresh.value && !refreshTimer.value) {
    startDataRefresh();
  }
}

/**
 * 提取服务状态数据
 * @param response API响应
 * @returns 服务状态对象
 */
function extractServicesFromResponse(response: any): Record<string, any> {
  // 优先从 response.data.data.services 提取（释放服务器）
  // 然后从 response.response.data.data.services 提取（部署服务器）
  // 最后从 response.data.services 提取
  return response?.data?.data?.services ||
         response?.response?.data?.data?.services ||
         response?.data?.services ||
         {};
}

/**
 * 检查所有服务是否都已完成部署
 * @param services 服务状态对象
 * @returns 是否全部完成
 */
function isAllServicesReady(services: Record<string, any>): boolean {
  if (!services || Object.keys(services).length === 0) {
    return false;
  }
  return Object.values(services).every((service: any) => service.status === 'ready');
}

/**
 * 清理同步状态相关资源
 */
function cleanupSyncStatusResources(): void {
  // 清除状态轮询定时器
  if (syncStatusTimer.value) {
    clearInterval(syncStatusTimer.value);
    syncStatusTimer.value = null;
  }

  // 停止日志轮询
  stopLogPolling();

  // 停止SSE连接（如果有）
  stopSSEConnection();

  // 清空日志和消息记录
  realTimeLogs.value = [];
  processedMessages.value.clear();

  // 重置最后处理的日志ID
  lastProcessedLogId.value = 0;
}

/**
 * 初始化同步状态数据
 */
function initializeSyncStatusModal(taskId: string, taskType: 'deploy' | 'release' = 'deploy'): void {
  currentTaskId.value = taskId;
  currentTaskType.value = taskType;
  syncStatusLoading.value = true;
  showSyncStatusModal.value = true;
  syncStatusData.value = null;
}

/**
 * 查看同步状态详情
 * @param taskId 任务ID
 * @param clusterStatus 集群状态
 */
async function handleViewReward(taskId: string, clusterStatus?: string | number) {
  console.log('handleViewReward 被调用，taskId:', taskId, 'clusterStatus:', clusterStatus);

  if (!taskId) {
    window.$message?.warning($t('page.manage.serveritem.deployment.taskIdEmpty'));
    return;
  }

  // 保存当前集群状态（确保转换为字符串）
  currentClusterStatus.value = clusterStatus !== undefined && clusterStatus !== null ? String(clusterStatus) : '';

  // 判断是否为删除/释放状态
  const status = currentClusterStatus.value;
  const isReleaseStatusValue = status === '5' || status === '6' || status === '7';

  // 初始化弹窗和清理资源
  initializeSyncStatusModal(taskId, isReleaseStatusValue ? 'release' : 'deploy');
  cleanupSyncStatusResources();

  // 首次获取数据
  await fetchSyncStatus();

  // 检查部署状态,决定是否需要轮询
  const services = extractServicesFromResponse(syncStatusData.value);
  const allReady = isAllServicesReady(services);

  if (!allReady) {
    // 部署进行中,开始轮询
    startPolling();
  }

  // 加载历史日志数据
  await loadHistoryLogs();
}

/**
 * 查看释放状态详情
 * @param taskId 任务ID
 */
async function handleViewReleaseStatus(taskId: string) {
  console.log('handleViewReleaseStatus 被调用，taskId:', taskId);

  if (!taskId) {
    window.$message?.warning($t('page.manage.serveritem.deployment.taskIdEmpty'));
    return;
  }

  // 初始化弹窗和清理资源
  initializeSyncStatusModal(taskId, 'release');
  cleanupSyncStatusResources();


  // 首次获取数据
  await fetchSyncStatus();

  // 检查释放状态,决定是否需要轮询
  const services = extractServicesFromResponse(syncStatusData.value);
  const allReady = isAllServicesReady(services);

  if (!allReady) {
    // 释放进行中,开始轮询
    startPolling();
  }

  // 加载历史日志数据
  await loadHistoryLogs();
}

/**
 * 获取同步状态数据
 */
async function fetchSyncStatus(): Promise<void> {
  if (!currentTaskId.value) return;

  try {
    // 根据集群状态选择不同的API
    let response;
    if (isReleaseStatus.value) {
      response = await fetchReleaseServerStatus(currentTaskId.value);
    } else {
      // 其他状态使用部署状态API
      response = await fetchSyncCloudServerStatus(currentTaskId.value);
    }

    syncStatusData.value = response;

    // 检查是否所有服务都已完成
    const services = extractServicesFromResponse(response);
    const allReady = isAllServicesReady(services);

    if (allReady) {
      // 所有服务都已完成，停止轮询
      stopPolling();
    }
  } catch (error) {
    console.error('获取同步状态失败:', error);
    window.$message?.error($t('page.manage.serveritem.deployment.fetchStatusFailed'));
    syncStatusData.value = { error: $t('page.manage.serveritem.deployment.fetchDataFailed'), details: error };
    stopPolling();
  } finally {
    syncStatusLoading.value = false;
  }
}

/**
 * 开始轮询同步状态
 */
function startPolling(): void {
  // 防止重复启动
  if (syncStatusTimer.value) return;

  syncStatusTimer.value = window.setInterval(async () => {
    await fetchSyncStatus();
  }, POLLING_INTERVAL);
}

/**
 * 停止轮询
 */
function stopPolling(): void {
  if (syncStatusTimer.value) {
    clearInterval(syncStatusTimer.value);
    syncStatusTimer.value = null;
  }
}

/**
 * 加载历史日志数据（实时轮询）
 */
async function loadHistoryLogs(): Promise<void> {
  if (!currentTaskId.value) return;

  try {
    // 直接设置为已连接状态，不显示"连接中"
    sseConnectionStatus.value = 'connected';
    sseConnection.value = true;
    sseErrorMessage.value = '';

    // 调用API获取历史日志
    const response = await fetchSyncCloudServerLog(currentTaskId.value);

    // 提取日志数据数组
    let historyLogs = [];

    if (response?.response?.data?.data && Array.isArray(response.response.data.data)) {
      historyLogs = response.response.data.data;
    } else if (response?.data?.data && Array.isArray(response.data.data)) {
      historyLogs = response.data.data;
    } else if (response?.data && Array.isArray(response.data)) {
      historyLogs = response.data;
    }

    if (historyLogs.length > 0) {
      // 只处理新增的日志（基于ID或索引）
      const newLogs = historyLogs.filter((log: any) => {
        const logId = log.id || 0;
        return logId > lastProcessedLogId.value;
      });

      // 更新最后处理的日志ID
      if (historyLogs.length > 0) {
        const lastLog = historyLogs[historyLogs.length - 1];
        lastProcessedLogId.value = lastLog.id || historyLogs.length;
      }

      // 添加新日志到显示列表
      for (const log of newLogs) {
        handleSSEMessage({
          message: log.message || `阶段: ${log.stage || 'unknown'} - 状态: ${log.status || 'unknown'}`,
          timestamp: log.timestamp || log.createTime || new Date().toISOString(),
          type: log.status === 'failed' ? 'error' : (log.status === 'success' ? 'success' : 'info'),
          stage: log.stage || '',
          progress: log.progress || 0,
          status: log.status || 'info'
        });
      }

      // 检查是否部署完成
      const isCompleted = historyLogs.some((log: any) =>
        log.status === 'failed' && log.stage?.includes('failed') ||
        log.message?.includes('失败') ||
        log.message?.includes('Namespace') && log.message?.includes('已存在')
      );

      if (!isCompleted) {
        // 部署还在进行中，继续轮询
        startLogPolling();
      } else {
        // 部署已完成（成功或失败），停止轮询
        stopLogPolling();
      }
    } else {
      sseConnectionStatus.value = 'error';
      sseErrorMessage.value = $t('page.manage.serveritem.deployment.noLogsFound');

      handleSSEMessage({
        message: $t('page.manage.serveritem.deployment.noLogsFound'),
        timestamp: new Date().toISOString(),
        type: 'warning',
        stage: 'no_logs',
        progress: 0,
        status: 'warning'
      });

      // 即使没有日志，也继续尝试轮询
      startLogPolling();
    }
  } catch (error) {
    console.error('加载历史日志失败:', error);
    sseConnectionStatus.value = 'error';
    sseErrorMessage.value = $t('page.manage.serveritem.deployment.fetchLogsFailed');

    handleSSEMessage({
      message: `❌ ${$t('page.manage.serveritem.deployment.fetchLogsFailed')}: ${(error as Error).message}`,
      timestamp: new Date().toISOString(),
      type: 'error',
      stage: 'load_failed',
      progress: 0,
      status: 'error'
    });

    // 错误后也继续轮询，给予重试机会
    startLogPolling();
  }
}

/**
 * 开始日志轮询
 */
function startLogPolling(): void {
  // 防止重复启动
  if (logPollingTimer.value) return;

  logPollingTimer.value = window.setInterval(async () => {
    await loadHistoryLogs();
  }, LOG_POLLING_INTERVAL);
}

/**
 * 停止日志轮询
 */
function stopLogPolling(): void {
  if (logPollingTimer.value) {
    clearInterval(logPollingTimer.value);
    logPollingTimer.value = null;
  }
}

/**
 * 停止SSE连接并清理相关状态
 */
function stopSSEConnection(): void {
  if (eventSource.value) {
    eventSource.value.close();
    eventSource.value = null;
  }

  sseConnection.value = false;
  sseConnectionStatus.value = 'disconnected';
  sseErrorMessage.value = '';

  // 清空已处理消息记录
  processedMessages.value.clear();
}

/**
 * 开始SSE连接（已废弃，保留以防需要回退）
 * 现在使用 loadHistoryLogs 替代
 */
// async function startSSEConnection() {
//   // 此函数已被 loadHistoryLogs 替代
// }

// 不再需要这些函数，因为使用实时轮询方式

// 处理SSE消息
function handleSSEMessage(data: any) {
  try {
    if (data) {
      let logEntry;

      // 处理实际的SSE数据格式
      if (data.message) {
        // 格式化时间戳
        let formattedTimestamp = new Date().toISOString();
        if (data.timestamp) {
          // 如果是数字时间戳（毫秒）
          if (typeof data.timestamp === 'number') {
            formattedTimestamp = new Date(data.timestamp).toISOString();
          }
          // 如果是字符串时间戳
          else if (typeof data.timestamp === 'string') {
            formattedTimestamp = data.timestamp;
          }
        }

        logEntry = {
          message: data.message,
          timestamp: formattedTimestamp,
          type: data.type || 'info',
          stage: data.stage || '',
          progress: data.progress || 0,
          status: data.status || data.type || 'info'
        };
      }
      // 如果没有message字段但有其他信息，构造消息
      else {
        logEntry = {
          message: JSON.stringify(data),
          timestamp: new Date().toISOString(),
          type: data.type || 'info',
          stage: data.stage || '',
          progress: data.progress || 0,
          status: data.status || data.type || 'info'
        };
      }

      // 创建消息的唯一标识符
      const messageId = `${logEntry.timestamp}-${logEntry.stage}-${logEntry.message}`;

      // 检查是否已经处理过这条消息
      if (processedMessages.value.has(messageId)) {
        return;
      }

      // 标记消息为已处理
      processedMessages.value.add(messageId);

      // 添加到日志数组
      realTimeLogs.value.push(logEntry);

      // 限制日志数量，保留最新的条目
      if (realTimeLogs.value.length > MAX_LOG_ENTRIES) {
        realTimeLogs.value = realTimeLogs.value.slice(-MAX_LOG_ENTRIES);

        // 同时清理已处理消息记录，保持与日志数组同步
        const maxProcessedMessages = Math.floor(MAX_LOG_ENTRIES * 1.5);
        if (processedMessages.value.size > maxProcessedMessages) {
          const newProcessedMessages = new Set<string>();
          realTimeLogs.value.forEach(log => {
            const id = `${log.timestamp}-${log.stage}-${log.message}`;
            newProcessedMessages.add(id);
          });
          processedMessages.value = newProcessedMessages;
        }
      }

      // 强制触发响应式更新
      realTimeLogs.value = [...realTimeLogs.value];
    }
  } catch (error) {
    console.error('处理SSE消息失败:', error);
  }
}

// 处理同步功能
function buildSyncParams(crossServer: any) {
  const serverIds = (crossServer.children || [])
    .map((child: any) => Number(child.normalServerId || child.serverId || child.id))
    .filter((id: number) => !isNaN(id));

  const crossServerId = Number(crossServer.serverId || crossServer.id);

  return {
    gameId: 101, // 默认游戏ID
    crossServerId,
    serverIds
  };
}

async function handleSync() {
  if (checkedRowKeys.value.length === 0) {
    window.$message?.warning($t("page.manage.servercross.form.crossServer"));
    return;
  }

  try {
    // 用 Map 保证唯一性 (key: crossServerId)
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

    // 执行同步
    for (const crossServer of crossServerMap.values()) {
      const syncParams = buildSyncParams(crossServer);
      const response = await fetchSyncServerCross(syncParams);

      // 根据响应结构判断同步结果
      if (response.error) {
        // 检查是否有实际的响应数据
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
          // 真正的请求失败
          window.$message?.error($t("common.syncFailed"));
        }
      } else if (response.data) {
        // 请求成功，检查业务状态码
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

// 监听弹框关闭，清理定时器和SSE连接
watch(showSyncStatusModal, (newValue) => {
  if (!newValue) {
    stopPolling();
    stopSSEConnection();
    currentTaskId.value = '';
    currentClusterStatus.value = '';
    realTimeLogs.value = [];
  }
});

/**
 * 组件卸载前清理所有资源
 */
onBeforeUnmount(() => {
  stopPolling();
  stopLogPolling();
  stopSSEConnection();
  stopDataRefresh();
});

</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <NCard
      :title="$t('page.manage.servercross.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <NSpace>
          <TableHeaderOperation
            v-model:columns="columnChecks"
            :disabled-delete="checkedRowKeys.length === 0"
            :loading="loading"
            @add="handleAdd"
            @delete="handleBatchDelete"
            @refresh="getData"
            @sync="handleSync"
            @start-server="handleStartServer"
            @stop-server="handleStopServer"
            @restart-server="handleRestartServer"
            @sync-cloud-server="handleSyncCloudServer"
            @release-server="handleReleaseServer"
            :show-add="hasAuth('game:item:add')"
            :show-batch-delete="hasAuth('game:item:edit')"
            :showsynv="hasAuth('game:gm:syncCrossServer')"
            :show-start-server="hasAuth('game:item:normalstate')"
            :show-stop-server="hasAuth('game:item:stop')"
            :show-restart-server="hasAuth('game:item:restart')"
            :show-sync-cloud-server="hasAuth('game:item:syncCloudServer')"
            :disabled-sync-cloud-server="checkedRowKeys.length !== 1 || isServerDeployed"
            :show-release-server="hasAuth('game:item:releaseServer')"
            :disabled-release-server="checkedRowKeys.length === 0 || !canReleaseServer"
            :show-server-operations="true"
          />
        </NSpace>
      </template>

      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="treeData"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="962"
        :loading="loading"
        :row-key="(row) => row.id"
        :pagination="false"
        :children-key="'children'"
        :default-expand-all="true"
        class="sm:h-full"
      />

      <CrossOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />

      <ConfigOperateDrawer
        v-model:visible="groupDrawerVisible"
        :row-data="groupRowData"
        @submitted="handleGroupSubmitted"
      />
    </NCard>

    <!-- 同步状态详情弹框 -->
    <NModal
      v-model:show="showSyncStatusModal"
      preset="card"
      :title="modalTitle"
      size="medium"
      :bordered="false"
      :segmented="false"
      style="width: 70%; max-width: 700px;"
    >
      <div v-if="syncStatusLoading" class="flex justify-center items-center py-12">
        <NSpin size="large" />
        <span class="ml-4 text-lg">{{ $t('page.manage.serveritem.deployment.fetchingDeploymentStatus') }}</span>
      </div>

      <div v-else-if="syncStatusData" class="min-h-96">
        <DeploymentStatus
          :data="syncStatusData"
          :realTimeLogs="realTimeLogs"
          :connectionStatus="sseConnectionStatus"
          :errorMessage="sseErrorMessage"
          :taskType="currentTaskType"
        />
      </div>

      <div v-else class="text-center py-12">
        <div class="text-gray-400 mb-4">
          <svg class="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
          </svg>
        </div>
        <p class="text-gray-500 text-lg">{{ $t('page.manage.serveritem.deployment.noDeploymentData') }}</p>
        <p class="text-gray-400 text-sm mt-2">{{ $t('page.manage.serveritem.deployment.confirmTaskId') }}</p>
      </div>
    </NModal>
  </div>
</template>

<style scoped></style>
