<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NSpace, NModal, NCard, NCode, NSpin } from "naive-ui";
import {
  fetchGetServeritemList,
  fetchGetServeritemDelete,
  fetchKickServer,
  fetchGetMaintenanceSetting,
  fetchStartServer,
  fetchSyncCloudServer,
  fetchSyncCloudServerStatus,
  fetchSyncCloudServerLog
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import {
  serverStatusVisible,
  serverStatusShow,
  serverStatusRecommend,
  serverStatusNew,
  serverRunStateRecord,
} from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import ItemOperateDrawer from "./modules/item-operate-drawer.vue";
import ItemSelect from "./modules/item-select.vue";
import DeploymentStatus from "./modules/deployment-status.vue";
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { format } from 'date-fns';
import { useRouterPush } from '@/hooks/common/router';
import GroupOperateDrawer from './modules/group-operate-drawer.vue';
import { useAuth } from '@/hooks/business/auth';

const { hasAuth } = useAuth();

const appStore = useAppStore();

const groupDrawerVisible = ref(false);
const groupOperateType = ref<NaiveUI.TableOperateType>('add');
const groupRowData = ref<Api.SystemManage.servergroup | null>(null);

const showRewardDetail = ref(false);
const currentRewardSnapshot = ref('');
const showSyncStatusModal = ref(false);
const syncStatusData = ref<any>(null);
const syncStatusLoading = ref(false);
const syncStatusTimer = ref<number | null>(null);
const currentTaskId = ref<string>('');
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

/**
 * 清理同步状态相关资源
 */
function cleanupSyncStatusResources(): void {
  // 清除定时器
  if (syncStatusTimer.value) {
    clearInterval(syncStatusTimer.value);
    syncStatusTimer.value = null;
  }

  // 停止SSE连接
  stopSSEConnection();

  // 清空日志和消息记录
  realTimeLogs.value = [];
  processedMessages.value.clear();
}

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
 * 查看同步状态详情
 * @param taskId 任务ID
 */
async function handleViewReward(taskId: string) {
  if (!taskId) {
    window.$message?.warning($t('page.manage.serveritem.deployment.taskIdEmpty'));
    return;
  }

  // 初始化弹窗和清理资源
  initializeSyncStatusModal(taskId);
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

  // 建立SSE连接获取日志
  await startSSEConnection();
}

/**
 * 获取同步状态数据
 */
async function fetchSyncStatus(): Promise<void> {
  if (!currentTaskId.value) return;

  try {
    const response = await fetchSyncCloudServerStatus(currentTaskId.value);
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

/** 轮询间隔时间(毫秒) */
const POLLING_INTERVAL = 3000;

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

/** SSE连接超时时间(毫秒) */
const SSE_CONNECTION_TIMEOUT = 10000;

/** 最大日志保留数量 */
const MAX_LOG_ENTRIES = 200;

/** SSE连接实例 */
const eventSource = ref<EventSource | null>(null);

/** 已处理消息的追踪集合 */
const processedMessages = ref<Set<string>>(new Set());

// 开始SSE连接
async function startSSEConnection() {
  if (!currentTaskId.value) return;

  try {
    sseConnectionStatus.value = 'connecting';
    sseConnection.value = true;
    sseErrorMessage.value = '';

    // 清空已处理消息记录
    processedMessages.value.clear();

    // 方法1: 先尝试使用fetchSyncCloudServerLog获取完整数据
    try {
      const response = await fetchSyncCloudServerLog(currentTaskId.value);
      let sseData = '';

      // 提取SSE数据
      if (typeof response === 'string') {
        sseData = response;
      } else if (response && typeof response === 'object') {
        if (response.response && response.response.data && typeof response.response.data === 'string') {
          sseData = response.response.data;
        } else if (response.data && typeof response.data === 'string') {
          sseData = response.data;
        } else if (response.response && typeof response.response === 'string') {
          sseData = response.response;
        } else if (response.error) {
          throw new Error(`API调用失败: ${response.error.message || 'Unknown error'}`);
        } else {
          throw new Error('响应格式不正确，未找到SSE数据');
        }
      } else {
        throw new Error('响应格式不正确');
      }

      // 如果获取到SSE数据，检查是否为已完成的部署
      if (sseData && sseData.includes('data:')) {
        sseConnectionStatus.value = 'connected';
        sseErrorMessage.value = '';
        stopPolling();

        // 检查是否为已完成的部署（包含最终完成消息）
        const isCompleted = sseData.includes('"progress":100') ||
                           sseData.includes('部署完成') ||
                           sseData.includes('创建完成') ||
                           sseData.includes('Helm Chart 安装成功');

        if (isCompleted) {
          // 已完成的部署，直接显示最终状态，不进行流式渲染
          await displayCompletedDeployment(sseData);
        } else {
          // 进行中的部署，进行流式渲染
          await streamRenderSSEData(sseData);
        }
        return;
      } else {
        // 如果没有获取到有效的SSE数据,可能是端点不存在或已过期
        throw new Error('未获取到有效的日志数据');
      }
    } catch (fetchError) {
      // fetchSyncCloudServerLog失败，尝试使用EventSource
      console.warn('获取历史日志失败，尝试建立SSE实时连接:', fetchError);
    }

    // 方法2: 使用EventSource建立实时连接（参考HTML示例）
    const sseUrl = `${window.location.protocol}//${window.location.host}/proxy-default/platform-game/api/server/progress/${currentTaskId.value}`;

    try {
      eventSource.value = new EventSource(sseUrl);

      // 添加连接超时检测
      const connectionTimeout = setTimeout(() => {
        if (sseConnectionStatus.value === 'connecting') {
        sseConnectionStatus.value = 'error';
        sseErrorMessage.value = $t('page.manage.serveritem.deployment.sseConnectionTimeout');

        handleSSEMessage({
          message: $t('page.manage.serveritem.deployment.sseTimeoutMessage'),
          timestamp: new Date().toISOString(),
          type: 'warning',
          stage: 'connection_timeout',
          progress: 0,
          status: 'warning'
        });

          if (eventSource.value) {
            eventSource.value.close();
            eventSource.value = null;
          }
          sseConnection.value = false;
        }
      }, SSE_CONNECTION_TIMEOUT);

      eventSource.value.onopen = function() {
        clearTimeout(connectionTimeout);
        sseConnectionStatus.value = 'connected';
        sseErrorMessage.value = '';

        // 添加连接成功消息
        handleSSEMessage({
          message: $t('page.manage.serveritem.deployment.sseConnected'),
          timestamp: new Date().toISOString(),
          type: 'success',
          stage: 'connection',
          progress: 0,
          status: 'success'
        });
      };

      eventSource.value.onmessage = function(event) {
        try {
          // 尝试解析JSON数据
          const data = JSON.parse(event.data);
          handleSSEMessage(data);
        } catch (error) {
          // 如果不是JSON，作为文本消息处理
          handleSSEMessage({
            message: event.data,
            timestamp: new Date().toISOString(),
            type: 'info',
            stage: 'message',
            progress: 0,
            status: 'info'
          });
        }
      };

      eventSource.value.onerror = function(error) {
        clearTimeout(connectionTimeout);
        sseConnectionStatus.value = 'error';

        // 检查是否是404错误或连接被拒绝
        const errorMsg = eventSource.value?.readyState === EventSource.CLOSED
          ? $t('page.manage.serveritem.deployment.sseConnectionFailed')
          : $t('page.manage.serveritem.deployment.sseDisconnected');

        sseErrorMessage.value = errorMsg;

        // 添加错误消息
        handleSSEMessage({
          message: `❌ ${errorMsg}`,
          timestamp: new Date().toISOString(),
          type: 'error',
          stage: 'connection_error',
          progress: 0,
          status: 'error'
        });

        // 清理连接
        if (eventSource.value) {
          eventSource.value.close();
          eventSource.value = null;
        }
        sseConnection.value = false;
      };

    } catch (eventSourceError) {
      throw new Error(`创建EventSource失败: ${(eventSourceError as Error).message}`);
    }

  } catch (error) {
    sseConnectionStatus.value = 'error';
    sseErrorMessage.value = $t('page.manage.serveritem.deployment.createSSEFailed') + ': ' + (error as Error).message;
    sseConnection.value = false;

    // 添加错误消息到日志中
    handleSSEMessage({
      message: `❌ ${$t('page.manage.serveritem.deployment.createSSEFailed')}: ${(error as Error).message}`,
      timestamp: new Date().toISOString(),
      type: 'error',
      stage: 'connection_failed',
      progress: 0,
      status: 'error'
    });
  }
}

// 显示已完成的部署状态
async function displayCompletedDeployment(sseString: string) {
  // 添加开始消息
  handleSSEMessage({
    message: $t('page.manage.serveritem.deployment.loadingCompletedLogs'),
    timestamp: new Date().toISOString(),
    type: 'info',
    stage: 'loading',
    progress: 0,
    status: 'info'
  });

  // 解析所有日志条目
  const lines = sseString.split('\n');
  const dataLines = lines.filter(line => line.trim().startsWith('data:'));

  // 只显示关键的里程碑消息，而不是所有消息
  const milestones = [];
  let processedCount = 0;

  for (const line of dataLines) {
    let data = line.replace(/^data:\s*/, '').trim();

    if (data) {
      try {
        // 清理和解析数据
        data = data.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
        data = data.replace(/\\"/g, '"');
        if (data.endsWith('\\')) {
          data = data.slice(0, -1);
        }

        const parsedData = JSON.parse(data);

        // 只保留重要的里程碑消息
        const isImportant = parsedData.type === 'success' ||
                           parsedData.status === 'success' ||
                           parsedData.message?.includes('✅') ||
                           parsedData.message?.includes('已就绪') ||
                           parsedData.message?.includes('已完成') ||
                           parsedData.message?.includes('安装成功') ||
                           parsedData.message?.includes('创建完成') ||
                           (parsedData.progress && parsedData.progress >= 90);

        if (isImportant) {
          milestones.push(parsedData);
        }

        processedCount++;
      } catch (error) {
        // 忽略解析错误的条目
      }
    }
  }

  // 快速显示所有里程碑消息（无延迟）
  for (const milestone of milestones) {
    // 确保数据有message字段
    if (!milestone.message && milestone.data) {
      milestone.message = milestone.data;
    }
    if (!milestone.message) {
      milestone.message = `阶段: ${milestone.stage || 'unknown'} - 状态: ${milestone.status || 'unknown'}`;
    }

    handleSSEMessage(milestone);
  }

  // 添加完成消息
  handleSSEMessage({
    message: `${$t('page.manage.serveritem.deployment.deploymentAlreadyComplete')} (${$t('common.total')} ${milestones.length} ${$t('page.manage.serveritem.deployment.keySteps')})`,
    timestamp: new Date().toISOString(),
    type: 'success',
    stage: 'completed',
    progress: 100,
    status: 'success'
  });
}

// 流式渲染SSE数据
async function streamRenderSSEData(sseString: string) {

  // 添加开始消息
  handleSSEMessage({
    message: $t('page.manage.serveritem.deployment.startLoadingLogs'),
    timestamp: new Date().toISOString(),
    type: 'info',
    stage: 'loading',
    progress: 0,
    status: 'info'
  });

  // 按行分割SSE数据，处理两种格式：
  // 1. 标准格式: data:{...}
  // 2. event:progress 格式: event:progress\ndata:{...}
  const lines = sseString.split('\n');
  const dataLines = lines.filter(line => line.trim().startsWith('data:'));

  let processedCount = 0;

  // 逐条渲染数据，模拟流式效果
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    let data = line.replace(/^data:\s*/, '').trim();

    if (data) {
      try {
        // 清理可能的控制字符和转义序列
        data = data.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');

        // 修复转义的引号问题
        data = data.replace(/\\"/g, '"');

        // 尝试修复可能的JSON格式问题
        if (data.endsWith('\\')) {
          data = data.slice(0, -1);
        }

        const parsedData = JSON.parse(data);

        // 确保数据有message字段，如果没有就创建一个
        if (!parsedData.message && parsedData.data) {
          parsedData.message = parsedData.data;
        }
        if (!parsedData.message) {
          parsedData.message = `阶段: ${parsedData.stage || 'unknown'} - 状态: ${parsedData.status || 'unknown'}`;
        }

        handleSSEMessage(parsedData);
        processedCount++;

        // 添加延迟模拟流式效果 (可以根据需要调整延迟时间)
        if (i < dataLines.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 150)); // 150ms延迟，可以调整速度
        }
      } catch (error) {
        console.error('🎬 流式渲染JSON解析失败:', error, '原始数据:', data);
        // 如果解析失败，作为文本消息处理
        handleSSEMessage({
          message: data,
          timestamp: new Date().toISOString(),
          type: 'error',
          stage: 'parse_error',
          progress: 0,
          status: 'error'
        });
        processedCount++;

        // 即使出错也要延迟
        if (i < dataLines.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }
    }
  }

  // 添加完成消息
  handleSSEMessage({
    message: `${$t('page.manage.serveritem.deployment.logsLoadComplete')} (${$t('common.total')} ${processedCount} ${$t('page.manage.serveritem.deployment.totalLogs')})`,
    timestamp: new Date().toISOString(),
    type: 'success',
    stage: 'completed',
    progress: 100,
    status: 'success'
  });

}

// 处理SSE响应数据
function processSSEResponse(sseString: string) {

  let processedCount = 0;

  // 方法1: 尝试按照标准SSE格式解析 (data: 开头的行)
  const dataLines = sseString.split('\n').filter(line => line.trim().startsWith('data:'));

  if (dataLines.length > 0) {
    for (const line of dataLines) {
      let data = line.replace(/^data:\s*/, '').trim();
      if (data) {
        try {
          // 清理可能的控制字符和转义序列
          data = data.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');

          // 修复转义的引号问题
          data = data.replace(/\\"/g, '"');

          // 尝试修复可能的JSON格式问题
          if (data.endsWith('\\')) {
            data = data.slice(0, -1);
          }

          const parsedData = JSON.parse(data);
          handleSSEMessage(parsedData);
          processedCount++;
        } catch (error) {
          console.error('❌ JSON解析失败 (方法1):', error, '原始数据:', data);

          // 如果JSON解析失败，尝试作为文本消息处理
          handleSSEMessage({
            message: data,
            timestamp: new Date().toISOString(),
            type: 'error',
            stage: 'parse_error',
            progress: 0,
            status: 'error'
          });
          processedCount++;
        }
      }
    }
  } else {
    // 方法2: 如果没有找到标准格式，尝试按双换行符分割
    const messageBlocks = sseString.split('\n\n');

    for (let i = 0; i < messageBlocks.length; i++) {
      const block = messageBlocks[i].trim();
      if (!block) continue;


      const lines = block.split('\n');
      let eventType = '';
      let data = '';

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('event:')) {
          eventType = trimmedLine.slice(6).trim();
        } else if (trimmedLine.startsWith('data:')) {
          data = trimmedLine.slice(5).trim();
        }
      }

      // 处理数据
      if (data) {
        try {
          // 清理可能的控制字符和转义序列
          data = data.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');

          // 修复转义的引号问题
          data = data.replace(/\\"/g, '"');

          // 尝试修复可能的JSON格式问题
          if (data.endsWith('\\')) {
            data = data.slice(0, -1);
          }

          const parsedData = JSON.parse(data);
          handleSSEMessage(parsedData);
          processedCount++;
        } catch (error) {
          console.error('❌ JSON解析失败 (方法2):', error, '原始数据:', data);
          // 如果解析失败，作为文本消息处理
          handleSSEMessage({
            message: data,
            timestamp: new Date().toISOString(),
            type: 'error',
            stage: 'parse_error',
            progress: 0,
            status: 'error'
          });
          processedCount++;
        }
      }
    }
  }

  // 方法3: 如果前面都没有处理到数据，尝试直接解析整个字符串中的JSON对象
  if (processedCount === 0) {

    // 方法3a: 使用更精确的正则表达式查找JSON对象
    const jsonRegex = /\{(?:[^{}]|{[^{}]*})*\}/g;
    const matches = sseString.match(jsonRegex);

    if (matches) {
      for (const match of matches) {
        try {
          let cleanMatch = match;
          // 清理可能的控制字符和转义序列
          cleanMatch = cleanMatch.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');

          // 修复转义的引号问题
          cleanMatch = cleanMatch.replace(/\\"/g, '"');

          // 尝试修复可能的JSON格式问题
          if (cleanMatch.endsWith('\\')) {
            cleanMatch = cleanMatch.slice(0, -1);
          }

          const parsedData = JSON.parse(cleanMatch);
          handleSSEMessage(parsedData);
          processedCount++;
        } catch (error) {
          console.error('❌ JSON解析失败 (方法3a):', error, '原始数据:', match);
          // 如果解析失败，作为文本消息处理
          handleSSEMessage({
            message: match,
            timestamp: new Date().toISOString(),
            type: 'error',
            stage: 'parse_error',
            progress: 0,
            status: 'error'
          });
          processedCount++;
        }
      }
    }

    // 方法3b: 如果还是没有数据，尝试逐字符解析JSON
    if (processedCount === 0) {
      let braceCount = 0;
      let currentJson = '';
      let inString = false;
      let escapeNext = false;

      for (let i = 0; i < sseString.length; i++) {
        const char = sseString[i];

        if (escapeNext) {
          currentJson += char;
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          currentJson += char;
          continue;
        }

        if (char === '"' && !escapeNext) {
          inString = !inString;
        }

        if (!inString) {
          if (char === '{') {
            if (braceCount === 0) {
              currentJson = '';
            }
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0 && currentJson) {
              currentJson += char;
              try {
                let cleanJson = currentJson;
                // 清理可能的控制字符和转义序列
                cleanJson = cleanJson.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');

                // 修复转义的引号问题
                cleanJson = cleanJson.replace(/\\"/g, '"');

                // 尝试修复可能的JSON格式问题
                if (cleanJson.endsWith('\\')) {
                  cleanJson = cleanJson.slice(0, -1);
                }

                const parsedData = JSON.parse(cleanJson);
                handleSSEMessage(parsedData);
                processedCount++;
              } catch (error) {
                console.error('❌ JSON解析失败 (方法3b):', error, '原始数据:', currentJson);
                // 如果解析失败，作为文本消息处理
                handleSSEMessage({
                  message: currentJson,
                  timestamp: new Date().toISOString(),
                  type: 'error',
                  stage: 'parse_error',
                  progress: 0,
                  status: 'error'
                });
                processedCount++;
              }
              currentJson = '';
              continue;
            }
          }
        }

        if (braceCount > 0) {
          currentJson += char;
        }
      }
    }
  }

}

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

    } else {
    }
  } catch (error) {
    console.error('处理SSE消息失败:', error);
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
/** 数据自动刷新间隔(毫秒) */
const DATA_REFRESH_INTERVAL = 3000;

/** 定时刷新计时器 */
const refreshTimer = ref<number | null>(null);

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
  apiFn: fetchGetServeritemList,
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
      key: "serverId",
      title: $t("page.manage.serveritem.serverId"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "serverName",
      title: $t("page.manage.serveritem.serverName"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "runState",
      title: $t("page.manage.serveritem.runState"),
      align: "center",
      minWidth: 100,
      render: (row) => {
        if (row.runState === null || row.runState === undefined) {
          return null;
        }

        const stateColors = {
          0: '#00FF00', // 绿色
          1: '#FFA500', // 黄色
          2: '#FF0000', // 红色
          3: '#86909c', // 灰色
        };

        const state = Number(row.runState);
        const color = stateColors[state] || '#86909c';
        const stateText = $t(serverRunStateRecord[state]);

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
      key: "onlineUser",
      title: $t("page.manage.serveritem.onlineUser"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "serverIp",
      title: $t("page.manage.serveritem.serverIp"),
      align: "center",
    },
    {
      key: "serverPort",
      title: $t("page.manage.serveritem.serverPort"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "intranetIp",
      title: $t("page.manage.serveritem.intranetIp"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "serverOpenDate",
      title: $t("page.manage.serveritem.serverOpenDate"),
      align: "center",
      minWidth: 100,
      render: (row) => {
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
      key: "serverTags",
      title: $t("page.manage.serveritem.serverTags"),
      align: "center",
      minWidth: 180,
      render: (row) => {
        if (row.serverNew === null || row.serverNew === undefined) {
          return null;
        }

        const serverNew = Number(row.serverNew);
        const tags = [];
        if (serverNew & 1) {
          tags.push(<NTag  type="success" >{$t("page.manage.serveritem.new")}</NTag>);
        }
        if (serverNew & 2) {
          tags.push(<NTag  type="info">{$t("page.manage.serveritem.recommend")}</NTag>);
        }
        if (serverNew & 4) {
          tags.push(<NTag  type="warning" >{$t("page.manage.serveritem.hot")}</NTag>);
        }
        if (serverNew & 8) {
          tags.push(<NTag type="error">{$t("page.manage.serveritem.noCreateRole")}</NTag>);
        }
        return tags.length > 0 ? <div class="flex-center flex-wrap gap-1">{tags}</div> : null;
      },
    },
    {
      key: "serverStatus",
      title: $t("page.manage.serveritem.serverStatus"),
      align: "center",
      minWidth: 100,
      render: (row) => {
        if (row.serverStatus === null) {
          return null;
        }
        const typeMap: Record<Api.SystemManage.serverStatus, string> = {
          0: "success",
          1: "warning",
          2: "error",
          3: "default",
          4: "info",
        };

        const label = $t(serverStatusShow[row.serverStatus]);
        return (
          <NTag  type={typeMap[row.serverStatus] || "default"}>
            {label}
          </NTag>
        );
      },
    },
    {
      key: "deploymentStatus",
      title: $t("page.manage.serveritem.deployment.deploymentStatus"),
      align: "center",
      width: 80,
      render: (row) => {
        if (row.taskId) {
          return (
            <NButton
              text
              type="primary"
              size="small"
              onClick={() => handleViewReward(row.taskId)}
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
      width: 130,
      render: (row) => (
        <div class="flex-center gap-8px">
          {hasAuth('game:item:edit') && (
            <NButton
              type="primary"
              ghost
              size="small"
              onClick={() => edit(row.id, row)}
            >
              {$t("common.edit")}
            </NButton>
          )}

          {hasAuth('game:item:remove') && (
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

const defaultHiddenKeys = [, 'serverPort', 'intranetIp'];
columnChecks.value.forEach((columnCheck) => {
  if (defaultHiddenKeys.includes(columnCheck.key as string)) {
    columnCheck.checked = false;
  }
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

async function handleBatchDelete() {
  const response = await fetchGetServeritemDelete({
    id: checkedRowKeys.value,
  });
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

async function handleKickAll() {
  const selectedIds = checkedRowKeys.value;

  interface KickResult {
    id: string | number;
    name: string;
    reason?: string;
  }

  const results: { success: KickResult[]; failed: KickResult[] } = { success: [], failed: [] };

  for (const selectedId of selectedIds) {
    const selectedRow = data.value.find(row => String(row.id) === String(selectedId));

    if (!selectedRow || !selectedRow.serverId) {
      const serverIdentifier = selectedRow?.serverName || selectedId;
      results.failed.push({ id: selectedId, name: serverIdentifier, reason: $t('common.noServerInfo') });
      continue;
    }

    try {
      await fetchKickServer({ serverId: selectedRow.serverId });
      results.success.push({ id: selectedId, name: selectedRow.serverName || selectedRow.serverId });
    } catch (error) {
      const serverIdentifier = selectedRow.serverName || selectedRow.serverId;
      results.failed.push({ id: selectedId, name: serverIdentifier, reason: $t('common.apiCallFailed') });
    }
  }

  if (results.failed.length > 0) {
    let failedServers = results.failed.map(f => f.name).join(', ');
    if (results.success.length > 0) {
      let successServers = results.success.map(s => s.name).join(', ');
      window.$message?.warning($t('common.kickPartialSuccess', { success: successServers, failed: failedServers }));
    } else {
      window.$message?.error($t('common.kickAllFailed', { servers: failedServers }));
    }
  } else if (results.success.length > 0) {
    let successServers = results.success.map(s => s.name).join(', ');
    window.$message?.success($t('common.kickAllSuccess', { servers: successServers }));
  }

  checkedRowKeys.value = [];
  await getData();
}

// 添加维护
async function handleMaintenance() {
  const selectedIds = checkedRowKeys.value;
  if (selectedIds.length === 0) {
    window.$message?.warning($t('common.noServerSelected'));
    return;
  }

  const selectedServerIds = selectedIds.map(id => {
    const server = data.value.find(item => String(item.id) === String(id));
    return server?.serverId ? parseInt(server.serverId) : null;
  }).filter(Boolean);

  if (selectedServerIds.length === 0) {
    window.$message?.warning($t('common.noValidServerSelected'));
    return;
  }

  try {
    await fetchGetMaintenanceSetting(selectedServerIds);
    const serverNames = selectedIds.map(id => {
      const server = data.value.find(item => String(item.id) === String(id));
      return server?.serverName || server?.serverId || id;
    }).join(', ');
    window.$message?.success($t('common.maintenanceSuccess', { servers: serverNames }));
    checkedRowKeys.value = [];
    await getData(); // 刷新数据列表
  } catch (error) {
    console.error("设置维护模式失败:", error);
    window.$message?.error($t('common.maintenanceFailed'));
  }
}

function handleQueue() {
  const selectedIds = checkedRowKeys.value;
  if (selectedIds.length === 0) {
    window.$message?.warning($t('common.noServerSelected'));
    return;
  }

  // 获取选中服务器的serverId
  const selectedServerIds = selectedIds.map(id => {
    const server = data.value.find(item => String(item.id) === String(id));
    return server?.serverId;
  }).filter(Boolean);

  if (selectedServerIds.length === 0) {

    window.$message?.warning($t('common.noValidServerSelected'));
    return;
  }

  groupOperateType.value = 'add';
  groupRowData.value = {
    gameId: "101",
    setto: "",
    serverList: selectedServerIds.join(',')
  };
  groupDrawerVisible.value = true;
}

async function handleStartServer() {
  const selectedIds = checkedRowKeys.value;
  if (selectedIds.length === 0) {
    window.$message?.warning($t('common.noServerSelected'));
    return;
  }

  const selectedServerIds = selectedIds.map(id => {
    const server = data.value.find(item => String(item.id) === String(id));
    return server?.serverId ? parseInt(server.serverId) : null;
  }).filter(Boolean);

  if (selectedServerIds.length === 0) {
    window.$message?.warning($t('common.noValidServerSelected'));
    return;
  }

  try {
    await fetchStartServer(selectedServerIds);
    const serverNames = selectedIds.map(id => {
      const server = data.value.find(item => String(item.id) === String(id));
      return server?.serverName || server?.serverId || id;
    }).join(', ');
    window.$message?.success($t('common.startServerAllSuccess'));
    checkedRowKeys.value = [];
    await getData();
  } catch (error) {
    console.error("开启服务器失败:", error);
    window.$message?.error($t('common.startServerAllFailed'));
  }
}

// 检查选中的服务器是否已部署完成
const isServerDeployed = ref(false);

/**
 * 提取服务状态数据
 * @param response API响应
 * @returns 服务状态对象
 */
function extractServicesFromResponse(response: any): Record<string, any> {
  return response?.response?.data?.data?.services || response?.data?.services || {};
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
 * 根据选中的行更新部署状态
 */
async function updateDeploymentStatus(selectedKeys: (string | number)[]): Promise<void> {
  // 只有选中单个服务器时才检查部署状态
  if (selectedKeys.length !== 1) {
    isServerDeployed.value = false;
    return;
  }

  const selectedId = selectedKeys[0];
  const server: any = data.value.find((item: any) => String(item.id) === String(selectedId));

  // 如果服务器有 taskId，检查部署状态；否则允许同步
  if (server?.taskId) {
    isServerDeployed.value = await checkServerDeploymentStatus(server.taskId);
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
  const server: any = data.value.find((item: any) => String(item.id) === String(selectedId));

  if (!server?.serverId) {
    return { valid: false, message: $t('common.noValidServerSelected') };
  }

  // 检查是否已部署完成
  if (isServerDeployed.value) {
    return { valid: false, message: $t('common.serverAlreadyDeployed') };
  }

  return { valid: true, server };
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

  try {
    // 执行同步操作
    const syncResponse = await fetchSyncCloudServer(serverId, specId);
    window.$message?.success($t('common.syncSuccess'));

    // 提取返回的 taskId
    const taskId = syncResponse?.data?.taskId || syncResponse?.response?.data?.taskId;

    // 刷新列表数据
    await getData();

    // 如果有 taskId，自动打开部署状态弹窗
    if (taskId) {
      // 等待一小段时间确保后端已准备好
      await new Promise(resolve => setTimeout(resolve, 500));
      await handleViewReward(taskId);
    } else {
      // 如果没有返回 taskId，尝试从刚刚同步的服务器获取
      const updatedServer: any = data.value.find((item: any) => String(item.id) === String(selectedIds[0]));
      if (updatedServer?.taskId) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await handleViewReward(updatedServer.taskId);
      }
    }

    // 清空选中状态
    checkedRowKeys.value = [];
  } catch (error) {
    console.error('同步云服务器失败:', error);
    window.$message?.error($t('common.syncFailed'));
  }
}


/**
 * 自动刷新服务器列表数据
 */
async function autoRefreshServerList(): Promise<void> {
  try {
    const response = await fetchGetServeritemList({
      ...searchParams.value,
      current: mobilePagination.value.page,
      size: mobilePagination.value.pageSize
    });

    if (response.data) {
      data.value = response.data.records || [];
    }
  } catch (error) {
    console.error($t('common.autoRefreshFailed'), error);
  }
}

/**
 * 启动定时刷新
 */
function startDataRefresh(): void {
  refreshTimer.value = window.setInterval(autoRefreshServerList, DATA_REFRESH_INTERVAL);
}

/**
 * 停止定时刷新
 */
function stopDataRefresh(): void {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
    refreshTimer.value = null;
  }
}

onMounted(() => {
  data.value = [];
  startDataRefresh();
});



// 监听弹框关闭，清理定时器和SSE连接
watch(showSyncStatusModal, (newValue) => {
  if (!newValue) {
    stopPolling();
    stopSSEConnection();
    currentTaskId.value = '';
    realTimeLogs.value = [];
  }
});

/**
 * 组件卸载前清理所有资源
 */
onBeforeUnmount(() => {
  stopDataRefresh();
  stopPolling();
  stopSSEConnection();
});
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <ItemSelect
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />

    <NCard
      :title="$t('page.manage.serveritem.title')"
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
            @kick-all="handleKickAll"
            @maintenance="handleMaintenance"
            @queue="handleQueue"
            @start-server="handleStartServer"
            @sync-cloud-server="handleSyncCloudServer"
            :show-add="hasAuth('game:item:add')"
            :show-batch-delete="hasAuth('game:item:edit')"
            :show-start-server="hasAuth('game:item:normalstate')"
            :show-maintenance="hasAuth('game:item:maintenance')"
            :show-queue="hasAuth('game:item:queue')"
            :show-kick-all="hasAuth('game:item:kickAll')"
            :show-sync-cloud-server="hasAuth('game:item:edit')"
            :disabled-sync-cloud-server="checkedRowKeys.length !== 1 || isServerDeployed"
          />
        </NSpace>
      </template>

      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="1080"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />

      <ItemOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />

      <GroupOperateDrawer
        v-model:visible="groupDrawerVisible"
        :operate-type="groupOperateType"
        :row-data="groupRowData"
        @submitted="getData"
        @clearSelection="checkedRowKeys = []"
      />
    </NCard>

    <!-- 同步状态详情弹框 -->
    <NModal
      v-model:show="showSyncStatusModal"
      preset="card"
      :title="$t('page.manage.serveritem.deployment.cloudServerDeploymentStatus')"
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


