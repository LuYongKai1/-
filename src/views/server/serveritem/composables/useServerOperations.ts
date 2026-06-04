import { ref, computed, watch } from 'vue';
import type { Ref } from 'vue';
import {
  fetchKickServer,
  fetchGetMaintenanceSetting,
  fetchSetNormalMode,
  fetchStartServer,
  fetchStopServer,
  fetchRestartServer,
  fetchSyncCloudServer,
  fetchSyncCloudServerStatus,
  fetchSyncCloudServerLog,
  fetchUpdateServer,
  fetchReleaseServer
} from '@/service/api';
import { $t } from '@/locales';
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';

// ==================== 类型定义 ====================
type TaskType = 'deploy' | 'release' | 'update';
type ModalMode = 'update' | 'sync';
type SSEStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface LogEntry {
  message: string;
  timestamp: string;
  type?: string;
  stage?: string;
  progress?: number;
  status?: string;
}

interface OperationResult {
  id: string | number;
  name: string;
  reason?: string;
  taskId?: string;
  clusterStatus?: string | number;
}

// ==================== 常量定义 ====================
const POLLING_INTERVAL = 5000;
const LOG_POLLING_INTERVAL = 2000;
const MAX_LOG_ENTRIES = 200;
const RUNNING_STATUS = '4';
const ALLOWED_SYNC_STATUSES = ['-1', '7'];

/**
 * 服务器操作相关的组合式函数
 */
export function useServerOperations(
  data: Ref<any[]>,
  checkedRowKeys: Ref<(string | number)[]>,
  getData: () => Promise<void>,
  activeTab?: Ref<string>,
  crossListRef?: Ref<any>
) {
  // ==================== 状态管理 ====================
  // 弹窗状态
  const showSyncStatusModal = ref(false);
  const syncStatusData = ref<any>(null);
  const syncStatusLoading = ref(false);
  const syncStatusTimer = ref<number | null>(null);
  const currentTaskId = ref<string>('');
  const currentClusterStatus = ref<string>('');
  const currentTaskType = ref<TaskType>('deploy');
  const currentServerId = ref<number | null>(null);

  // SSE 连接状态
  const sseConnection = ref(false);
  const sseConnectionStatus = ref<SSEStatus>('disconnected');
  const sseErrorMessage = ref<string>('');
  const realTimeLogs = ref<LogEntry[]>([]);

  // 日志相关
  const processedMessages = ref<Set<string>>(new Set());
  const logPollingTimer = ref<number | null>(null);
  const lastProcessedLogId = ref<number>(0);

  // 服务器状态
  const isServerDeployed = ref(false);
  const canReleaseServer = ref(false);
  const canUpdateServer = ref(false);
  const canStartServer = ref(false);
  const canStopServer = ref(false);
  const canRestartServer = ref(false);

  // 更新服务器弹框状态
  const showUpdateServerModal = ref(false);
  const updateServerId = ref<number | undefined>(undefined);
  const syncServerModalMode = ref<ModalMode>('update');

  // ==================== 计算属性 ====================
  const isReleaseStatus = computed(() => {
    const status = currentClusterStatus.value;
    return ['5', '6', '7'].includes(status);
  });

  const modalTitle = computed(() => {
    // 根据当前任务类型显示不同的标题
    if (currentTaskType.value === 'release') {
      return $t('page.manage.serveritem.deployment.cloudServerReleaseStatus');
    } else if (currentTaskType.value === 'update') {
      return $t('page.manage.serveritem.deployment.cloudServerUpdateStatus');
    } else {
      return $t('page.manage.serveritem.deployment.cloudServerDeploymentStatus');
    }
  });

  // ==================== 工具函数 ====================

  /**
   * 获取当前选中的行键和数据
   */
  function getCurrentSelection() {
    const isTab1 = activeTab?.value === 'tab1';
    const currentCheckedRowKeys = isTab1 ? checkedRowKeys.value : crossListRef?.value?.checkedRowKeys || [];
    const rawData = isTab1 ? data.value : crossListRef?.value?.treeData || [];
    // 展开树形数据，确保子菜单也能被 findById 命中
    const currentData = flattenTreeRows(rawData);
    return { currentCheckedRowKeys, currentData, isTab1 };
  }

  /**
   * 清空选中项
   */
  function clearSelection() {
    const { isTab1 } = getCurrentSelection();
    if (isTab1) {
      checkedRowKeys.value = [];
    } else if (crossListRef?.value) {
      crossListRef.value.checkedRowKeys = [];
    }
  }

  /**
   * 刷新数据
   */
  async function refreshData() {
    const { isTab1 } = getCurrentSelection();
    if (isTab1) {
      await getData();
    } else {
      await crossListRef?.value?.getData();
    }
  }

  /**
   * 提取服务器ID列表
   */
  function extractServerIds(selectedIds: (string | number)[], dataSource: any[]): number[] {
    return selectedIds
      .map((id) => {
        const server = dataSource.find((item: any) => String(item.id) === String(id));
        return server?.serverId ? parseInt(String(server.serverId)) : null;
      })
      .filter((id): id is number => id !== null);
  }

  /**
   * 将树形数据(包含 children)展开为一维数组。
   */
  function flattenTreeRows(items: any[]): any[] {
    const result: any[] = [];
    const walk = (arr: any[]) => {
      if (!Array.isArray(arr)) return;
      for (const item of arr) {
        if (!item) continue;
        result.push(item);
        if (Array.isArray(item.children) && item.children.length > 0) {
          walk(item.children);
        }
      }
    };
    walk(items);
    return result;
  }

  /**
   * 提取服务状态数据
   */
  function extractServicesFromResponse(response: any): Record<string, any> {
    return response?.response?.data?.data?.services || response?.data?.services || {};
  }

  /**
   * 检查所有服务是否都已完成部署
   */
  function isAllServicesReady(services: Record<string, any>): boolean {
    if (!services || Object.keys(services).length === 0) {
      return false;
    }
    return Object.values(services).every((service: any) => service.status === 'ready');
  }

  // ==================== 状态轮询管理 ====================
  /**
   * 开始轮询同步状态
   */
  function startPolling(): void {
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
   * 开始日志轮询
   */
  function startLogPolling(): void {
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
   * 停止SSE连接
   */
  function stopSSEConnection(): void {
    sseConnection.value = false;
    sseConnectionStatus.value = 'disconnected';
    sseErrorMessage.value = '';
    processedMessages.value.clear();
  }

  /**
   * 清理同步状态相关资源
   */
  function cleanupSyncStatusResources(): void {
    if (syncStatusTimer.value) {
      clearInterval(syncStatusTimer.value);
      syncStatusTimer.value = null;
    }
    stopLogPolling();
    stopSSEConnection();
    realTimeLogs.value = [];
    processedMessages.value.clear();
    lastProcessedLogId.value = 0;
  }

  /**
   * 清理所有资源
   */
  function cleanup() {
    stopPolling();
    stopLogPolling();
    stopSSEConnection();
  }

  // ==================== 状态管理函数 ====================
  /**
   * 初始化同步状态数据
   */
  function initializeSyncStatusModal(taskId: string): void {
    currentTaskId.value = taskId;
    syncStatusLoading.value = true;
    showSyncStatusModal.value = true;
    syncStatusData.value = null;
  }

  /**
   * 获取同步状态数据
   */
  async function fetchSyncStatus(): Promise<void> {
    if (!currentTaskId.value) return;

    try {
      // 统一使用 fetchSyncCloudServerStatus 获取所有类型的部署状态
      const response = await fetchSyncCloudServerStatus(currentTaskId.value);

      syncStatusData.value = response;

      const services = extractServicesFromResponse(response);
      const allReady = isAllServicesReady(services);

      if (allReady) {
        stopPolling();
      }
    } catch (error) {
      handleApiCatchError(error, '获取状态');
      syncStatusData.value = {
        error: $t('page.manage.serveritem.deployment.fetchDataFailed'),
        details: error
      };
      stopPolling();
    } finally {
      syncStatusLoading.value = false;
    }
  }

  /**
   * 根据选中的行更新部署状态和操作权限
   */
  async function updateDeploymentStatus(selectedKeys: (string | number)[]): Promise<void> {
    const { currentData } = getCurrentSelection();

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

    // 获取所有选中的服务器
    const selectedServers = selectedKeys
      .map(id => currentData.find((item: any) => String(item.id) === String(id)))
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
      return status === '4' || status === '9'; // 运行中或已回滚
    });

    const allStopped = selectedServers.every((server: any) => {
      const status = server?.clusterStatus !== undefined && server?.clusterStatus !== null
        ? String(server.clusterStatus)
        : '';
      return status === '5' || status === '9'; // 已停止或已回滚
    });

    // 检查是否所有服务器都是运行中或已停止状态
    const allRunningOrStopped = selectedServers.every((server: any) => {
      const status = server?.clusterStatus !== undefined && server?.clusterStatus !== null
        ? String(server.clusterStatus)
        : '';
      return status === '4' || status === '5' || status === '9'; // 运行中、已停止或已回滚
    });

    // 检查是否有任何服务器处于运行状态（用于允许部分批量操作）
    const hasRunning = selectedServers.some((server: any) => {
      const status = server?.clusterStatus !== undefined && server?.clusterStatus !== null
        ? String(server.clusterStatus)
        : '';
      return status === '4' || status === '9';
    });

    // 检查是否有任何服务器处于已停止状态
    const hasStopped = selectedServers.some((server: any) => {
      const status = server?.clusterStatus !== undefined && server?.clusterStatus !== null
        ? String(server.clusterStatus)
        : '';
      return status === '5' || status === '9';
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

    // 启动：只有状态为 '5'（已停止/停服中）或 '9'（已回滚）的服务器才能启动
    // 后端限制：服务器状态不允许恢复，只有停服中状态才能恢复
    canStartServer.value = selectedServers.length > 0 && allStopped && !hasTransitioning;

    // 更新服务器：支持批量操作，所有服务器都必须是运行中或已停止状态，且没有处于过渡状态
    canUpdateServer.value = selectedServers.length > 0 && allRunningOrStopped && !hasTransitioning;

    // 同步云服务器：支持批量操作
    // 检查所有选中服务器是否都可以同步
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

      // 已回滚(9) - 允许重新同步
      if (clusterStatus === '9') {
        return true;
      }

      // 其他状态（如运行中'4'、已停止'5'、创建成功'1'）- 已部署，不允许同步
      return false;
    });

    // 是否所有服务器都已部署（用于禁用同步按钮）
    isServerDeployed.value = selectedServers.length > 0 && !allCanSync;
  }

  // ==================== 日志处理函数 ====================
  /**
   * 处理SSE消息
   */
  function handleSSEMessage(data: any) {
    try {
      if (!data) return;

      const formattedTimestamp = data.timestamp
        ? (typeof data.timestamp === 'number'
            ? new Date(data.timestamp).toISOString()
            : data.timestamp)
        : new Date().toISOString();

      const logEntry: LogEntry = data.message
        ? {
            message: data.message,
            timestamp: formattedTimestamp,
            type: data.type || 'info',
            stage: data.stage || '',
            progress: data.progress || 0,
            status: data.status || data.type || 'info'
          }
        : {
            message: JSON.stringify(data),
            timestamp: new Date().toISOString(),
            type: data.type || 'info',
            stage: data.stage || '',
            progress: data.progress || 0,
            status: data.status || data.type || 'info'
          };

      const messageId = `${logEntry.timestamp}-${logEntry.stage}-${logEntry.message}`;

      if (processedMessages.value.has(messageId)) {
        return;
      }

      processedMessages.value.add(messageId);
      realTimeLogs.value.push(logEntry);

      // 限制日志条目数量
      if (realTimeLogs.value.length > MAX_LOG_ENTRIES) {
        realTimeLogs.value = realTimeLogs.value.slice(-MAX_LOG_ENTRIES);

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

      realTimeLogs.value = [...realTimeLogs.value];
    } catch (error) {
      console.error('处理SSE消息失败:', error);
    }
  }

  /**
   * 加载历史日志数据
   */
  async function loadHistoryLogs(): Promise<void> {
    if (!currentTaskId.value) return;

    try {
      sseConnectionStatus.value = 'connected';
      sseConnection.value = true;
      sseErrorMessage.value = '';

      const response = await fetchSyncCloudServerLog(currentTaskId.value);

      // 提取日志数据
      let historyLogs = [];
      if (response?.response?.data?.data && Array.isArray(response.response.data.data)) {
        historyLogs = response.response.data.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        historyLogs = response.data.data;
      } else if (response?.data && Array.isArray(response.data)) {
        historyLogs = response.data;
      }

      if (historyLogs.length > 0) {
        // 过滤新日志
        const newLogs = historyLogs.filter((log: any) => {
          const logId = log.id || 0;
          return logId > lastProcessedLogId.value;
        });

        // 更新最后处理的日志ID
        if (historyLogs.length > 0) {
          const lastLog = historyLogs[historyLogs.length - 1];
          lastProcessedLogId.value = lastLog.id || historyLogs.length;
        }

        // 处理新日志
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

        // 检查是否完成
        const isCompleted = historyLogs.some((log: any) =>
          log.status === 'failed' && log.stage?.includes('failed') ||
          log.message?.includes('失败') ||
          log.message?.includes('Namespace') && log.message?.includes('已存在')
        );

        if (!isCompleted) {
          startLogPolling();
        } else {
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

        startLogPolling();
      }
    } catch (error) {
      handleApiCatchError(error, '加载历史日志');
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

      startLogPolling();
    }
  }

  /**
   * 查看部署/更新/释放状态详情
   */
  async function handleViewReward(
    taskId: string,
    clusterStatus?: string | number,
    taskType?: TaskType,
    serverId?: number
  ) {
    if (!taskId) {
      window.$message?.warning($t('page.manage.serveritem.deployment.taskIdEmpty'));
      return;
    }

    currentClusterStatus.value = clusterStatus !== undefined && clusterStatus !== null
      ? String(clusterStatus)
      : '';

    // 保存 serverId
    if (serverId) {
      currentServerId.value = serverId;
    }

    // 如果没有传入 taskType，根据 clusterStatus 自动判断
    if (!taskType) {
      const status = String(clusterStatus || '');
      if (status === '6') {
        // clusterStatus 为 6 表示删除中（释放中）
        currentTaskType.value = 'release';
      } else if (status === '8') {
        // clusterStatus 为 8 表示更新中
        currentTaskType.value = 'update';
      } else {
        // 其他状态（包括 3-部署中）默认为部署
        currentTaskType.value = 'deploy';
      }
    } else {
      currentTaskType.value = taskType;
    }

    initializeSyncStatusModal(taskId);
    cleanupSyncStatusResources();

    await fetchSyncStatus();

    const services = extractServicesFromResponse(syncStatusData.value);
    const allReady = isAllServicesReady(services);

    if (!allReady) {
      startPolling();
    }

    await loadHistoryLogs();
  }

  // ==================== 服务器操作函数 ====================
  /**
   * 踢出所有玩家
   */
  async function handleKickAll() {
    const selectedIds = checkedRowKeys.value;
    const results: { success: OperationResult[]; failed: OperationResult[] } = {
      success: [],
      failed: []
    };

    const { currentData } = getCurrentSelection();

    for (const selectedId of selectedIds) {
      const selectedRow = currentData.find((row: any) => String(row.id) === String(selectedId));

      if (!selectedRow || !selectedRow.serverId) {
        const serverIdentifier = selectedRow?.serverName || selectedId;
        results.failed.push({
          id: selectedId,
          name: serverIdentifier,
          reason: $t('common.noServerInfo')
        });
        continue;
      }

      try {
        const response = await fetchKickServer({ serverId: selectedRow.serverId });

        if (!handleApiResponseError(response, '踢出玩家')) {
          results.success.push({
            id: selectedId,
            name: selectedRow.serverName || selectedRow.serverId
          });
        } else {
          const serverIdentifier = selectedRow.serverName || selectedRow.serverId;
          results.failed.push({
            id: selectedId,
            name: serverIdentifier,
            reason: $t('common.apiCallFailed')
          });
        }
      } catch (error) {
        handleApiCatchError(error, '踢出玩家');
        const serverIdentifier = selectedRow.serverName || selectedRow.serverId;
        results.failed.push({
          id: selectedId,
          name: serverIdentifier,
          reason: $t('common.apiCallFailed')
        });
      }
    }

    // 显示结果消息
    if (results.failed.length > 0) {
      const failedServers = results.failed.map(f => f.name).join(', ');
      if (results.success.length > 0) {
        const successServers = results.success.map(s => s.name).join(', ');
        window.$message?.warning($t('common.kickPartialSuccess', {
          success: successServers,
          failed: failedServers
        }));
      } else {
        window.$message?.error($t('common.kickAllFailed', { servers: failedServers }));
      }
    } else if (results.success.length > 0) {
      const successServers = results.success.map(s => s.name).join(', ');
      window.$message?.success($t('common.kickAllSuccess', { servers: successServers }));
    }

    checkedRowKeys.value = [];
    await getData();
  }

  /**
   * 设置维护模式
   */
  async function handleMaintenance() {
    const selectedIds = checkedRowKeys.value;
    if (selectedIds.length === 0) {
      window.$message?.warning($t('common.noServerSelected'));
      return;
    }

    const { currentData } = getCurrentSelection();
    const selectedServerIds = extractServerIds(selectedIds, currentData);

    if (selectedServerIds.length === 0) {
      window.$message?.warning($t('common.noValidServerSelected'));
      return;
    }

    try {
      const response = await fetchGetMaintenanceSetting(selectedServerIds);

      if (!handleApiResponseError(response, '设置维护模式')) {
        const serverNames = selectedIds.map(id => {
          const server = currentData.find((item: any) => String(item.id) === String(id));
          return server?.serverName || server?.serverId || id;
        }).join(', ');
        window.$message?.success($t('common.maintenanceSuccess', { servers: serverNames }));
        checkedRowKeys.value = [];
        await getData();
      }
    } catch (error) {
      handleApiCatchError(error, '设置维护模式');
    }
  }

  /**
   * 设置正常模式
   */
  async function handleNormal() {
    const selectedIds = checkedRowKeys.value;
    if (selectedIds.length === 0) {
      window.$message?.warning($t('common.noServerSelected'));
      return;
    }

    const { currentData } = getCurrentSelection();
    const selectedServerIds = extractServerIds(selectedIds, currentData);

    if (selectedServerIds.length === 0) {
      window.$message?.warning($t('common.noValidServerSelected'));
      return;
    }

    try {
      const response = await fetchSetNormalMode(selectedServerIds);

      if (!handleApiResponseError(response, '设置正常模式')) {
        window.$message?.success($t('common.operationSuccess'));
        checkedRowKeys.value = [];
        await getData();
      }
    } catch (error) {
      handleApiCatchError(error, '设置正常模式');
    }
  }

  /**
   * 启动服务器
   */
  async function handleStartServer() {
    const { currentCheckedRowKeys, currentData } = getCurrentSelection();

    if (currentCheckedRowKeys.length === 0) {
      window.$message?.warning($t('common.noServerSelected'));
      return;
    }

    const results: { success: OperationResult[]; failed: OperationResult[] } = {
      success: [],
      failed: []
    };

    // 显示加载提示
    const loadingMessage = window.$message?.loading('正在开启服务器，请稍候...', { duration: 0 });

    for (const selectedId of currentCheckedRowKeys) {
      const server = currentData.find((item: any) => String(item.id) === String(selectedId));

      if (!server?.serverId) {
        const serverIdentifier = server?.serverName || selectedId;
        results.failed.push({
          id: selectedId,
          name: serverIdentifier,
          reason: $t('common.noServerInfo')
        });
        continue;
      }

      try {
        const response = await fetchStartServer(parseInt(String(server.serverId)));

        if (!handleApiResponseError(response, '开启服务器')) {
          results.success.push({
            id: selectedId,
            name: server.serverName || String(server.serverId)
          });
        } else {
          const serverIdentifier = server.serverName || server.serverId;
          results.failed.push({
            id: selectedId,
            name: serverIdentifier,
            reason: $t('common.apiCallFailed')
          });
        }
      } catch (error) {
        handleApiCatchError(error, '开启服务器');
        const serverIdentifier = server.serverName || server.serverId;
        results.failed.push({
          id: selectedId,
          name: serverIdentifier,
          reason: $t('common.apiCallFailed')
        });
      }
    }

    // 关闭加载提示
    loadingMessage?.destroy();

    // 显示结果消息
    if (results.failed.length > 0) {
      const failedServers = results.failed.map(f => f.name).join(', ');
      if (results.success.length > 0) {
        const successServers = results.success.map(s => s.name).join(', ');
        window.$message?.warning(
          `${$t('common.startServerSuccess')}: ${successServers}; ${$t('common.startServerFailed')}: ${failedServers}`
        );
      } else {
        window.$message?.error($t('common.startServerFailed') + `: ${failedServers}`);
      }
    } else if (results.success.length > 0) {
      const successServers = results.success.map(s => s.name).join(', ');
      window.$message?.success($t('common.startServerSuccess') + `: ${successServers}`);
    }

    clearSelection();
    await refreshData();
  }

  /**
   * 停止服务器
   */
  async function handleStopServer() {
    const { currentCheckedRowKeys, currentData } = getCurrentSelection();

    if (currentCheckedRowKeys.length === 0) {
      window.$message?.warning($t('common.noServerSelected'));
      return;
    }

    const results: { success: OperationResult[]; failed: OperationResult[] } = {
      success: [],
      failed: []
    };

    // 显示加载提示
    const loadingMessage = window.$message?.loading('正在停止服务器，请稍候...', { duration: 0 });

    for (const selectedId of currentCheckedRowKeys) {
      const server = currentData.find((item: any) => String(item.id) === String(selectedId));

      if (!server?.serverId) {
        const serverIdentifier = server?.serverName || selectedId;
        results.failed.push({
          id: selectedId,
          name: serverIdentifier,
          reason: $t('common.noServerInfo')
        });
        continue;
      }

      try {
        const response = await fetchStopServer(parseInt(String(server.serverId)));

        if (!handleApiResponseError(response, '停止服务器')) {
          results.success.push({
            id: selectedId,
            name: server.serverName || String(server.serverId)
          });
        } else {
          const serverIdentifier = server.serverName || server.serverId;
          results.failed.push({
            id: selectedId,
            name: serverIdentifier,
            reason: $t('common.apiCallFailed')
          });
        }
      } catch (error) {
        handleApiCatchError(error, '停止服务器');
        const serverIdentifier = server.serverName || server.serverId;
        results.failed.push({
          id: selectedId,
          name: serverIdentifier,
          reason: $t('common.apiCallFailed')
        });
      }
    }

    // 关闭加载提示
    loadingMessage?.destroy();

    // 显示结果消息
    if (results.failed.length > 0) {
      const failedServers = results.failed.map(f => f.name).join(', ');
      if (results.success.length > 0) {
        const successServers = results.success.map(s => s.name).join(', ');
        window.$message?.warning(
          `${$t('common.stopServerSuccess')}: ${successServers}; ${$t('common.stopServerFailed')}: ${failedServers}`
        );
      } else {
        window.$message?.error($t('common.stopServerFailed') + `: ${failedServers}`);
      }
    } else if (results.success.length > 0) {
      const successServers = results.success.map(s => s.name).join(', ');
      window.$message?.success($t('common.stopServerSuccess') + `: ${successServers}`);
    }

    clearSelection();
    await refreshData();
  }

  /**
   * 重启服务器
   */
  async function handleRestartServer() {
    const { currentCheckedRowKeys, currentData } = getCurrentSelection();

    if (currentCheckedRowKeys.length === 0) {
      window.$message?.warning($t('common.noServerSelected'));
      return;
    }

    const results: { success: OperationResult[]; failed: OperationResult[] } = {
      success: [],
      failed: []
    };

    // 显示加载提示
    const loadingMessage = window.$message?.loading('正在重启服务器，请稍候...', { duration: 0 });

    for (const selectedId of currentCheckedRowKeys) {
      const server = currentData.find((item: any) => String(item.id) === String(selectedId));

      if (!server?.serverId) {
        const serverIdentifier = server?.serverName || selectedId;
        results.failed.push({
          id: selectedId,
          name: serverIdentifier,
          reason: $t('common.noServerInfo')
        });
        continue;
      }

      try {
        const response = await fetchRestartServer(parseInt(String(server.serverId)));

        if (!handleApiResponseError(response, '重启服务器')) {
          results.success.push({
            id: selectedId,
            name: server.serverName || String(server.serverId)
          });
        } else {
          const serverIdentifier = server.serverName || server.serverId;
          results.failed.push({
            id: selectedId,
            name: serverIdentifier,
            reason: $t('common.apiCallFailed')
          });
        }
      } catch (error) {
        handleApiCatchError(error, '重启服务器');
        const serverIdentifier = server.serverName || server.serverId;
        results.failed.push({
          id: selectedId,
          name: serverIdentifier,
          reason: $t('common.apiCallFailed')
        });
      }
    }

    // 关闭加载提示
    loadingMessage?.destroy();

    // 显示结果消息
    if (results.failed.length > 0) {
      const failedServers = results.failed.map(f => f.name).join(', ');
      if (results.success.length > 0) {
        const successServers = results.success.map(s => s.name).join(', ');
        window.$message?.warning(
          `${$t('common.restartServerSuccess')}: ${successServers}; ${$t('common.restartServerFailed')}: ${failedServers}`
        );
      } else {
        window.$message?.error($t('common.restartServerFailed') + `: ${failedServers}`);
      }
    } else if (results.success.length > 0) {
      const successServers = results.success.map(s => s.name).join(', ');
      window.$message?.success($t('common.restartServerSuccess') + `: ${successServers}`);
    }

    clearSelection();
    await refreshData();
  }

  /**
   * 释放服务器
   */
  async function handleReleaseServer() {
    const { currentCheckedRowKeys, currentData } = getCurrentSelection();

    if (currentCheckedRowKeys.length === 0) {
      window.$message?.warning($t('common.noServerSelected'));
      return;
    }

    const results: { success: OperationResult[]; failed: OperationResult[] } = {
      success: [],
      failed: []
    };

    for (const selectedId of currentCheckedRowKeys) {
      const server = currentData.find((item: any) => String(item.id) === String(selectedId));

      if (!server?.serverId) {
        const serverIdentifier = server?.serverName || selectedId;
        results.failed.push({
          id: selectedId,
          name: serverIdentifier,
          reason: $t('common.noServerInfo')
        });
        continue;
      }

      const clusterStatus = server?.clusterStatus !== undefined && server?.clusterStatus !== null
        ? String(server.clusterStatus)
        : '';

      // 允许运行中(4)、已停止(5)或已回滚(9)状态的服务器进行释放
      if (clusterStatus !== RUNNING_STATUS && clusterStatus !== '5' && clusterStatus !== '9') {
        const serverIdentifier = server.serverName || server.serverId;
        results.failed.push({
          id: selectedId,
          name: serverIdentifier,
          reason: $t('common.serverNotRunning') || '服务器未处于运行中、已停止或已回滚状态，无法释放'
        });
        continue;
      }

      try {
        const response = await fetchReleaseServer(parseInt(String(server.serverId)));

        if (!handleApiResponseError(response, '释放服务器')) {
          const taskId = response?.data?.taskId || response?.response?.data?.taskId;
          results.success.push({
            id: selectedId,
            name: server.serverName || String(server.serverId),
            taskId: taskId
          });
        } else {
          const serverIdentifier = server.serverName || server.serverId;
          results.failed.push({
            id: selectedId,
            name: serverIdentifier,
            reason: $t('common.apiCallFailed')
          });
        }
      } catch (error) {
        handleApiCatchError(error, '释放服务器');
        const serverIdentifier = server.serverName || server.serverId;
        results.failed.push({
          id: selectedId,
          name: serverIdentifier,
          reason: $t('common.apiCallFailed')
        });
      }
    }

    // 显示结果消息
    if (results.failed.length > 0) {
      const failedServers = results.failed.map(f => f.name).join(', ');
      if (results.success.length > 0) {
        const successServers = results.success.map(s => s.name).join(', ');
        window.$message?.warning(
          `${$t('common.releaseServerSuccess')}: ${successServers}; ${$t('common.releaseServerFailed')}: ${failedServers}`
        );
      } else {
        window.$message?.error($t('common.releaseServerFailed') + `: ${failedServers}`);
      }
    } else if (results.success.length > 0) {
      const successServers = results.success.map(s => s.name).join(', ');
      window.$message?.success($t('common.releaseServerSuccess') + `: ${successServers}`);
    }

    clearSelection();
    await refreshData();

    // 单个服务器释放成功后自动打开状态弹窗
    if (results.success.length === 1 && results.failed.length === 0) {
      const successResult = results.success[0] as any;
      await new Promise(resolve => setTimeout(resolve, 1500));
      await refreshData();

      const { currentData: updatedData } = getCurrentSelection();
      const updatedServer: any = updatedData.find(
        (item: any) => String(item.id) === String(currentCheckedRowKeys[0])
      );

      if (updatedServer?.taskId) {
        await handleViewReward(updatedServer.taskId, updatedServer.clusterStatus);
      } else if (successResult.taskId) {
        await handleViewReward(successResult.taskId, '6');
      } else {
        console.warn('未找到 taskId，无法打开状态弹窗');
      }
    }
  }

  // ==================== 同步/更新操作函数 ====================
  /**
   * 打开服务器版本选择弹框
   */
  function openServerModal(mode: ModalMode) {
    const { currentCheckedRowKeys, currentData } = getCurrentSelection();

    if (currentCheckedRowKeys.length === 0) {
      window.$message?.warning($t('common.noServerSelected'));
      return;
    }

    // 支持批量操作，不再限制只能选择一个
    const selectedServers = currentCheckedRowKeys
      .map((id: string | number) => currentData.find((item: any) => String(item.id) === String(id)))
      .filter(Boolean);

    if (selectedServers.length === 0 || !selectedServers[0]?.serverId) {
      window.$message?.warning($t('common.noValidServerSelected'));
      return;
    }

    // 对于批量操作，使用第一个服务器的ID打开弹框（实际操作会对所有选中的服务器生效）
    updateServerId.value = parseInt(String(selectedServers[0].serverId));
    syncServerModalMode.value = mode;
    showUpdateServerModal.value = true;
  }

  /**
   * 同步云服务器 - 打开选择版本弹框
   */
  async function handleSyncCloudServer() {
    openServerModal('sync');
  }

  /**
   * 打开更新服务器弹框
   */
  async function handleUpdateServer() {
    openServerModal('update');
  }

  /**
   * 确认更新服务器（支持批量操作）
   */
  async function handleConfirmUpdateServer(selectedData: { repo: any; chart: any }) {
    const { currentCheckedRowKeys, currentData } = getCurrentSelection();

    if (currentCheckedRowKeys.length === 0) {
      window.$message?.warning($t('common.noServerSelected'));
      return;
    }

    if (!selectedData?.repo || !selectedData?.chart) {
      window.$message?.warning('请选择仓库和包');
      return;
    }

    const chartName = selectedData.repo.repo_name || selectedData.repo.name;
    const chartVersion = selectedData.chart.tag || selectedData.chart.version;

    if (!chartName || !chartVersion) {
      window.$message?.warning('缺少必要参数: chart_name 或 chart_version');
      console.error('Repo data:', selectedData.repo, 'Chart data:', selectedData.chart);
      return;
    }

    const results: { success: OperationResult[]; failed: OperationResult[] } = {
      success: [],
      failed: []
    };

    // 显示加载提示
    const loadingMessage = window.$message?.loading('正在更新服务器，请稍候...', { duration: 0 });

    for (const selectedId of currentCheckedRowKeys) {
      const server = currentData.find((item: any) => String(item.id) === String(selectedId));

      if (!server?.serverId) {
        const serverIdentifier = server?.serverName || selectedId;
        results.failed.push({
          id: selectedId,
          name: serverIdentifier,
          reason: $t('common.noServerInfo')
        });
        continue;
      }

      try {
        const updateResponse = await fetchUpdateServer(
          parseInt(String(server.serverId)),
          chartName,
          chartVersion
        );

        if (!handleApiResponseError(updateResponse, '更新服务器')) {
          const taskId = updateResponse?.data?.taskId || updateResponse?.response?.data?.taskId;
          results.success.push({
            id: selectedId,
            name: server.serverName || String(server.serverId),
            taskId: taskId,
            clusterStatus: server.clusterStatus
          });
        } else {
          const serverIdentifier = server.serverName || server.serverId;
          results.failed.push({
            id: selectedId,
            name: serverIdentifier,
            reason: $t('common.apiCallFailed')
          });
        }
      } catch (error) {
        handleApiCatchError(error, '更新服务器');
        const serverIdentifier = server.serverName || server.serverId;
        results.failed.push({
          id: selectedId,
          name: serverIdentifier,
          reason: $t('common.apiCallFailed')
        });
      }
    }

    // 关闭加载提示
    loadingMessage?.destroy();

    // 关闭弹框
    showUpdateServerModal.value = false;
    updateServerId.value = undefined;

    // 显示结果消息
    if (results.failed.length > 0) {
      const failedServers = results.failed.map(f => f.name).join(', ');
      if (results.success.length > 0) {
        const successServers = results.success.map(s => s.name).join(', ');
        window.$message?.warning(
          `${$t('common.updateSuccess')}: ${successServers}; 更新失败: ${failedServers}`
        );
      } else {
        window.$message?.error('更新失败: ' + failedServers);
      }
    } else if (results.success.length > 0) {
      const successServers = results.success.map(s => s.name).join(', ');
      window.$message?.success($t('common.updateSuccess') + `: ${successServers}`);
    }

    // 刷新数据
    await refreshData();

    // 单个服务器更新成功后自动打开状态弹窗
    if (results.success.length === 1 && results.failed.length === 0) {
      const successResult = results.success[0] as any;
      await new Promise(resolve => setTimeout(resolve, 500));

      if (successResult.taskId) {
        await handleViewReward(successResult.taskId, successResult.clusterStatus, 'update');
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
        await refreshData();

        const { currentData: updatedData } = getCurrentSelection();
        const updatedServer: any = updatedData.find(
          (item: any) => String(item.id) === String(currentCheckedRowKeys[0])
        );

        if (updatedServer?.taskId) {
          await handleViewReward(updatedServer.taskId, updatedServer.clusterStatus, 'update');
        } else {
          console.warn('更新服务器成功，但未找到 taskId');
        }
      }
    }

    clearSelection();
  }

  /**
   * 确认同步云服务器（支持批量操作）
   */
  async function handleConfirmSyncCloudServer(selectedData: { repo: any; chart: any }) {
    const { currentCheckedRowKeys, currentData } = getCurrentSelection();

    if (currentCheckedRowKeys.length === 0) {
      window.$message?.warning($t('common.noServerSelected'));
      return;
    }

    if (!selectedData?.repo || !selectedData?.chart) {
      window.$message?.warning('请选择仓库和包');
      return;
    }

    const chartName = selectedData.repo.repo_name || selectedData.repo.name;
    const chartVersion = selectedData.chart.tag || selectedData.chart.version;

    if (!chartName || !chartVersion) {
      window.$message?.warning('缺少必要参数: chart_name 或 chart_version');
      console.error('Repo data:', selectedData.repo, 'Chart data:', selectedData.chart);
      return;
    }

    const results: { success: OperationResult[]; failed: OperationResult[] } = {
      success: [],
      failed: []
    };

    // 显示加载提示
    const loadingMessage = window.$message?.loading('正在同步云服务器，请稍候...', { duration: 0 });

    for (const selectedId of currentCheckedRowKeys) {
      const server = currentData.find((item: any) => String(item.id) === String(selectedId));

      if (!server?.serverId) {
        const serverIdentifier = server?.serverName || selectedId;
        results.failed.push({
          id: selectedId,
          name: serverIdentifier,
          reason: $t('common.noServerInfo')
        });
        continue;
      }

      try {
        const syncResponse = await fetchSyncCloudServer(
          parseInt(String(server.serverId)),
          chartName,
          chartVersion
        );

        if (!handleApiResponseError(syncResponse, '同步云服务器')) {
          const taskId = syncResponse?.data?.taskId || syncResponse?.response?.data?.taskId;
          results.success.push({
            id: selectedId,
            name: server.serverName || String(server.serverId),
            taskId: taskId,
            clusterStatus: server.clusterStatus
          });
        } else {
          const serverIdentifier = server.serverName || server.serverId;
          results.failed.push({
            id: selectedId,
            name: serverIdentifier,
            reason: $t('common.apiCallFailed')
          });
        }
      } catch (error) {
        handleApiCatchError(error, '同步云服务器');
        const serverIdentifier = server.serverName || server.serverId;
        results.failed.push({
          id: selectedId,
          name: serverIdentifier,
          reason: $t('common.apiCallFailed')
        });
      }
    }

    // 关闭加载提示
    loadingMessage?.destroy();

    // 关闭弹框
    showUpdateServerModal.value = false;
    updateServerId.value = undefined;

    // 显示结果消息
    if (results.failed.length > 0) {
      const failedServers = results.failed.map(f => f.name).join(', ');
      if (results.success.length > 0) {
        const successServers = results.success.map(s => s.name).join(', ');
        window.$message?.warning(
          `${$t('common.syncSuccess')}: ${successServers}; 同步失败: ${failedServers}`
        );
      } else {
        window.$message?.error('同步失败: ' + failedServers);
      }
    } else if (results.success.length > 0) {
      const successServers = results.success.map(s => s.name).join(', ');
      window.$message?.success($t('common.syncSuccess') + `: ${successServers}`);
    }

    // 刷新数据
    await refreshData();

    // 单个服务器同步成功后自动打开状态弹窗
    if (results.success.length === 1 && results.failed.length === 0) {
      const successResult = results.success[0] as any;
      await new Promise(resolve => setTimeout(resolve, 500));

      if (successResult.taskId) {
        await handleViewReward(successResult.taskId, successResult.clusterStatus, 'deploy');
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
        await refreshData();

        const { currentData: updatedData, currentCheckedRowKeys: updatedKeys } = getCurrentSelection();
        const updatedServer: any = updatedData.find(
          (item: any) => String(item.id) === String(successResult.id)
        );

        if (updatedServer?.taskId) {
          await handleViewReward(updatedServer.taskId, updatedServer.clusterStatus, 'deploy');
        } else {
          console.warn('同步云服务器成功，但未找到 taskId');
        }
      }
    }

    clearSelection();
  }

  // ==================== 监听器 ====================
  watch(showSyncStatusModal, (newValue) => {
    if (!newValue) {
      stopPolling();
      stopSSEConnection();
      currentTaskId.value = '';
      currentClusterStatus.value = '';
      realTimeLogs.value = [];
    }
  });

  // ==================== 返回公共接口 ====================
  return {
    // 状态
    showSyncStatusModal,
    syncStatusData,
    currentServerId,
    syncStatusLoading,
    currentTaskId,
    currentClusterStatus,
    sseConnection,
    sseConnectionStatus,
    sseErrorMessage,
    realTimeLogs,
    isServerDeployed,
    canReleaseServer,
    canUpdateServer,
    canStartServer,
    canStopServer,
    canRestartServer,
    isReleaseStatus,
    modalTitle,
    showUpdateServerModal,
    updateServerId,

    // 方法
    handleViewReward,
    updateDeploymentStatus,
    handleKickAll,
    handleMaintenance,
    handleNormal,
    handleStartServer,
    handleStopServer,
    handleRestartServer,
    handleReleaseServer,
    handleSyncCloudServer,
    handleUpdateServer,
    handleConfirmUpdateServer,
    handleConfirmSyncCloudServer,
    syncServerModalMode,
    cleanup
  };
}
