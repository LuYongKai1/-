<template>
  <div class="deployment-status">
    <!-- 总体状态 -->
    <div class="status-header">
      <div class="status-left">
        <h3 class="status-title">{{ $t('page.manage.serveritem.deployment.overallStatus') }}</h3>
        <button
          @click="handleCancelDeploy"
          class="refresh-btn"
          :disabled="isCancelling"
          title="取消部署"
        >
          <svg
            class="refresh-icon"
            :class="{ 'is-refreshing': isCancelling }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div class="status-right">
        <component :is="overallStatusIcon" />
        <span class="status-text" :class="overallStatusTextClass">
          {{ overallStatusText }}
        </span>
      </div>
    </div>

    <!-- 服务状态列表 -->
    <div class="services-section">
      <h4 class="section-title">{{ $t('page.manage.serveritem.deployment.deploymentStatus') }}</h4>
      <div class="services-grid">
        <div
          v-for="(service, key) in services"
          :key="key"
          class="service-item"
        >
          <div class="service-icon">
            <div :class="getServiceIconClass(service.status)">
              <component :is="getServiceIcon(service.status)" />
            </div>
          </div>
          <div class="service-content">
            <h4 class="service-name" :title="getServiceName(key)">{{ getServiceName(key) }}</h4>
          </div>
          <div class="service-status">
            <span :class="STATUS_BADGE_CLASSES[service.status]" class="status-badge">
              {{ getStatusText(service.status) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 部署日志 -->
    <div class="logs-section">
      <div class="logs-header">
        <h4 class="section-title">{{ $t('page.manage.serveritem.deployment.deploymentLogs') }}</h4>
        <div class="logs-meta">
          <div class="connection-info">
            <span :class="connectionStatusClass" class="connection-dot"></span>
            <span class="connection-text">{{ connectionStatusText }}</span>
          </div>
          <span class="log-count">{{ logCount }} {{ $t('page.manage.serveritem.deployment.logsCount') }}</span>
        </div>
      </div>

      <div class="log-container" ref="logContainer">
        <!-- 优先显示SSE实时日志 -->
        <div v-if="props.realTimeLogs && props.realTimeLogs.length > 0" class="space-y-1">
          <div v-for="(log, index) in displayedLogs" :key="`realtime-log-${index}-${log.timestamp}`"
               class="log-entry">
            <!-- 时间戳 -->
            <span class="log-timestamp">
              {{ formatLogTime(log.timestamp) }}
            </span>

            <!-- 阶段标签 -->
            <span v-if="log.stage"
                  class="log-stage">
              {{ log.stage }}
            </span>


            <!-- 消息内容 -->
            <span class="log-message" :class="getLogTypeClass(log.type, log.status)">
              {{ formatLogMessage(log.message) }}
            </span>
          </div>
        </div>

        <!-- 如果没有SSE日志，显示等待信息 -->
        <div v-else class="empty-log-state">
          <div class="empty-log-icon">
            <div v-if="props.connectionStatus === 'connecting'"
                 class="loading-spinner"></div>
            <div v-else-if="props.connectionStatus === 'error'"
                 class="error-dot"></div>
            <div v-else
                 class="idle-dot"></div>
            <span class="empty-log-text" :class="{
              'status-connecting': props.connectionStatus === 'connecting',
              'status-error': props.connectionStatus === 'error',
              'status-idle': props.connectionStatus === 'disconnected'
            }">
              {{ getConnectionMessage() }}
            </span>
          </div>
          <div class="empty-log-desc">{{ getConnectionDescription() }}</div>
          <div v-if="taskId" class="empty-log-task">
            {{ $t('page.manage.serveritem.deployment.taskId') }}: {{ taskId }}
          </div>
          <div v-if="props.connectionStatus === 'error' && props.errorMessage"
               class="empty-log-error">
            {{ $t('page.manage.serveritem.deployment.error') }}: {{ props.errorMessage }}
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, h } from 'vue';
import { $t } from '@/locales';
import { fetchCancelDeploy } from '@/service/api/game-manage';
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import { useMessage } from 'naive-ui';

// 类型定义
type ServiceStatusType = 'ready' | 'running' | 'waiting' | 'error';
type ConnectionStatusType = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ServiceStatus {
  lastMessage?: string;
  progress?: number;
  status: ServiceStatusType;
}

interface DeploymentData {
  allReady?: boolean;
  services?: Record<string, ServiceStatus>;
  taskId?: string;
}

interface LogItem {
  message: string;
  timestamp: string;
  type?: string;
  stage?: string;
  progress?: number;
  status?: string;
}

interface Props {
  data: any;
  realTimeLogs?: LogItem[];
  connectionStatus?: ConnectionStatusType;
  errorMessage?: string;
  serverId?: number;
}

// 常量定义 - 使用计算属性以支持动态语言切换
const SERVICE_NAMES = computed(() => ({
  nas: $t('page.manage.serveritem.deployment.serviceNames.nas'),
  rds: $t('page.manage.serveritem.deployment.serviceNames.rds'),
  slb: $t('page.manage.serveritem.deployment.serviceNames.slb'),
  redis: $t('page.manage.serveritem.deployment.serviceNames.redis'),
  helm: $t('page.manage.serveritem.deployment.serviceNames.helm'),
  k8s: $t('page.manage.serveritem.deployment.serviceNames.k8s'),
  config: $t('page.manage.serveritem.deployment.serviceNames.config'),
  health: $t('page.manage.serveritem.deployment.serviceNames.health'),
  cert: $t('page.manage.serveritem.deployment.serviceNames.cert')
}));

const STATUS_TEXTS = computed(() => ({
  ready: $t('page.manage.serveritem.deployment.status.ready'),
  running: $t('page.manage.serveritem.deployment.status.running'),
  waiting: $t('page.manage.serveritem.deployment.status.waiting'),
  error: $t('page.manage.serveritem.deployment.status.error')
}));

const STATUS_DISPLAY_TEXTS = computed(() => ({
  ready: $t('page.manage.serveritem.deployment.status.ready'),
  running: $t('page.manage.serveritem.deployment.status.waiting'),
  waiting: $t('page.manage.serveritem.deployment.status.waiting'),
  error: $t('page.manage.serveritem.deployment.status.error')
}));

const STATUS_BADGE_CLASSES: Record<ServiceStatusType, string> = {
  ready: 'bg-green-100 text-green-800',
  running: 'bg-blue-100 text-blue-800',
  waiting: 'bg-gray-100 text-gray-800',
  error: 'bg-red-100 text-red-800'
};

const STATUS_TEXT_CLASSES: Record<ServiceStatusType, string> = {
  ready: 'text-green-600',
  running: 'text-blue-600',
  waiting: 'text-gray-600',
  error: 'text-red-600'
};

const CONNECTION_STATUS_CLASSES: Record<ConnectionStatusType, string> = {
  connected: 'bg-green-400',
  connecting: 'bg-yellow-400 animate-pulse',
  error: 'bg-red-400',
  disconnected: 'bg-gray-400'
};

const CONNECTION_STATUS_TEXTS = computed(() => ({
  connected: $t('page.manage.serveritem.deployment.connection.connected'),
  connecting: $t('page.manage.serveritem.deployment.connection.connecting'),
  error: $t('page.manage.serveritem.deployment.connection.error'),
  disconnected: $t('page.manage.serveritem.deployment.connection.disconnected')
}));

const COMPLETION_KEYWORDS = computed(() => [
  $t('page.manage.serveritem.deployment.deploymentComplete'),
  '部署完成', '创建完成', '🎉'
]);

const props = defineProps<Props>();

const logContainer = ref<HTMLElement | null>(null);
const isCancelling = ref(false);
const message = useMessage();

// 计算属性
const deploymentData = computed<DeploymentData>(() =>
  props.data?.response?.data?.data || props.data?.data || {}
);

// 从 data 中提取 serverId，如果没有则使用 props.serverId
const serverId = computed(() => {
  if (props.serverId) return props.serverId;
  // 尝试从 data 中提取 serverId
  const data = props.data?.response?.data?.data || props.data?.data || props.data;
  return data?.serverId || data?.server_id || null;
});

const services = computed(() => {
  const servicesData = deploymentData.value.services || {};

  // 将服务转换为数组并按 progress 排序
  const servicesArray = Object.entries(servicesData).sort((a, b) => {
    const progressA = a[1].progress || 0;
    const progressB = b[1].progress || 0;
    return progressA - progressB; // 按 progress 升序排序
  });

  // 转换回对象
  const sortedServices: Record<string, ServiceStatus> = {};
  servicesArray.forEach(([key, value]) => {
    sortedServices[key] = value;
  });

  return sortedServices;
});
const taskId = computed(() => deploymentData.value.taskId);
const logCount = computed(() => props.realTimeLogs?.length || 0);

// 优化日志显示性能 - 只显示最新的50条日志
const displayedLogs = computed(() =>
  props.realTimeLogs?.slice(-50) || []
);

// 连接状态
const connectionStatusClass = computed(() =>
  CONNECTION_STATUS_CLASSES[props.connectionStatus || 'disconnected']
);

const connectionStatusText = computed(() =>
  props.errorMessage || CONNECTION_STATUS_TEXTS.value[props.connectionStatus || 'disconnected']
);

// 检查所有服务是否都已完成
const allServicesReady = computed(() => {
  const serviceList = Object.values(services.value);
  return serviceList.length > 0 && serviceList.every(service => service.status === 'ready');
});

// 检查部署是否完全完成（基于日志内容）
const isDeploymentCompleted = computed(() => {
  if (!props.realTimeLogs?.length) return false;

  return props.realTimeLogs.some(log =>
    COMPLETION_KEYWORDS.value.some(keyword => log.message?.includes(keyword)) ||
    (log.progress === 100 && log.status === 'success')
  );
});

// 总体状态
const overallStatusText = computed(() => {
  if (isDeploymentCompleted.value) return $t('page.manage.serveritem.deployment.deploymentComplete');
  if (allServicesReady.value) return $t('page.manage.serveritem.deployment.allComplete');
  return $t('page.manage.serveritem.deployment.deploying');
});

const overallStatusTextClass = computed(() => {
  if (isDeploymentCompleted.value || allServicesReady.value) return 'text-green-600';
  return 'text-blue-600';
});

const overallStatusIcon = computed(() => {
  if (isDeploymentCompleted.value || allServicesReady.value) {
    return () => h('svg', {
      class: 'w-5 h-5 text-green-600',
      fill: 'currentColor',
      viewBox: '0 0 20 20'
    }, [
      h('path', {
        'fill-rule': 'evenodd',
        d: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
        'clip-rule': 'evenodd'
      })
    ]);
  }
  return () => h('div', {
    class: 'w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin'
  });
});

// 辅助函数用于在模板中访问计算属性的值
function getServiceName(key: string): string {
  return SERVICE_NAMES.value[key as keyof typeof SERVICE_NAMES.value] || key.toUpperCase();
}

function getStatusText(status: ServiceStatusType): string {
  return STATUS_TEXTS.value[status];
}

function getStatusDisplayText(status: ServiceStatusType): string {
  return STATUS_DISPLAY_TEXTS.value[status];
}

// 服务图标相关函数
function getServiceIconClass(status: ServiceStatusType): string {
  const baseClass = 'w-6 h-6 rounded-full flex items-center justify-center';
  const statusClasses = {
    ready: 'bg-green-100',
    running: 'bg-blue-100',
    waiting: 'bg-gray-100',
    error: 'bg-red-100'
  };
  return `${baseClass} ${statusClasses[status] || statusClasses.waiting}`;
}

function getServiceIcon(status: ServiceStatusType) {
  // 已完成 - 绿色勾选
  if (status === 'ready') {
    return () => h('svg', {
      class: 'w-4 h-4 text-green-600',
      fill: 'currentColor',
      viewBox: '0 0 20 20'
    }, [
      h('path', {
        'fill-rule': 'evenodd',
        d: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
        'clip-rule': 'evenodd'
      })
    ]);
  }

  // 错误 - 红色X
  if (status === 'error') {
    return () => h('svg', {
      class: 'w-4 h-4 text-red-600',
      fill: 'currentColor',
      viewBox: '0 0 20 20'
    }, [
      h('path', {
        'fill-rule': 'evenodd',
        d: 'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z',
        'clip-rule': 'evenodd'
      })
    ]);
  }

  // 等待中 - 灰色圆点
  if (status === 'waiting') {
    return () => h('div', {
      class: 'w-3 h-3 bg-gray-400 rounded-full'
    });
  }

  // 进行中 - 蓝色旋转动画
  return () => h('div', {
    class: 'w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin'
  });
}

function getLogStatusIcon(status: string) {
  if (status === 'success') {
    return () => h('svg', {
      class: 'w-4 h-4 text-green-400',
      fill: 'currentColor',
      viewBox: '0 0 20 20'
    }, [
      h('path', {
        'fill-rule': 'evenodd',
        d: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
        'clip-rule': 'evenodd'
      })
    ]);
  }

  if (status === 'error') {
    return () => h('svg', {
      class: 'w-4 h-4 text-red-400',
      fill: 'currentColor',
      viewBox: '0 0 20 20'
    }, [
      h('path', {
        'fill-rule': 'evenodd',
        d: 'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z',
        'clip-rule': 'evenodd'
      })
    ]);
  }

  if (status === 'running') {
    return () => h('div', {
      class: 'w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin'
    });
  }

  return () => null;
}

// 工具函数
function formatLogTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString();
  } catch {
    return timestamp;
  }
}

function getLogTypeClass(type?: string, status?: string): string {
  if (status === 'success' || type === 'success') return 'text-green-400';
  if (status === 'error' || type === 'error') return 'text-red-400';
  if (type === 'info') return 'text-blue-400';
  if (type === 'warning') return 'text-yellow-400';
  return 'text-green-400';
}

function getConnectionMessage(): string {
  const messages: Record<ConnectionStatusType, string> = {
    connecting: $t('page.manage.serveritem.deployment.connection.connectingSSE'),
    connected: $t('page.manage.serveritem.deployment.connection.sseEstablished'),
    error: $t('page.manage.serveritem.deployment.connection.sseFailed'),
    disconnected: $t('page.manage.serveritem.deployment.connection.sseNotEstablished')
  };
  return messages[props.connectionStatus || 'disconnected'];
}

function getConnectionDescription(): string {
  const descriptions: Record<ConnectionStatusType, string> = {
    connecting: $t('page.manage.serveritem.deployment.connection.establishingConnection'),
    connected: $t('page.manage.serveritem.deployment.connection.connectionNormal'),
    error: $t('page.manage.serveritem.deployment.connection.connectionFailed'),
    disconnected: props.errorMessage?.includes('等待后端实现')
      ? $t('page.manage.serveritem.deployment.connection.featureInDevelopment')
      : $t('page.manage.serveritem.deployment.connection.waitingConnection')
  };
  return descriptions[props.connectionStatus || 'disconnected'];
}

function formatLogMessage(message: string): string {
  try {
    // 处理Proxy对象
    if (message.includes('Proxy(Object)')) {
      const messageMatch = message.match(/message['":\s]*['"]([^'"]+)['"]/);
      if (messageMatch?.[1]) return messageMatch[1];

      // 根据关键词返回友好描述
      if (message.includes('success')) return $t('page.manage.serveritem.deployment.messages.operationSuccess');
      if (message.includes('error')) return $t('page.manage.serveritem.deployment.messages.operationFailed');
      if (message.includes('running')) return $t('page.manage.serveritem.deployment.messages.operationRunning');
      return $t('page.manage.serveritem.deployment.messages.systemUpdate');
    }

    // 处理JSON字符串
    if (message.startsWith('{') && message.endsWith('}')) {
      try {
        const parsed = JSON.parse(message);
        if (parsed.message) return parsed.message;
      } catch {
        // 解析失败，继续处理
      }
    }

    // 清理技术术语
    const cleanMessage = message
      .replace(/Proxy\(Object\)/g, '')
      .replace(/\{[^}]*\}/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/timestamp['":\s]*['"][^'"]*['"]/g, '')
      .replace(/type['":\s]*['"][^'"]*['"]/g, '')
      .replace(/stage['":\s]*['"][^'"]*['"]/g, '')
      .replace(/progress['":\s]*\d+/g, '')
      .replace(/status['":\s]*['"][^'"]*['"]/g, '')
      .replace(/,\s*,/g, ',')
      .replace(/^\s*,\s*|\s*,\s*$/g, '')
      .trim();

    // 返回清理后的消息或截断的原始消息
    return cleanMessage.length >= 5
      ? cleanMessage
      : message.length > 100
        ? `${message.substring(0, 100)}...`
        : message;
  } catch {
    return message.length > 100 ? `${message.substring(0, 100)}...` : message;
  }
}

// 防抖滚动到底部
const scrollToBottom = (() => {
  let timeout: number | null = null;
  return () => {
    if (timeout) clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      nextTick(() => {
        if (logContainer.value) {
          logContainer.value.scrollTop = logContainer.value.scrollHeight;
        }
      });
    }, 100);
  };
})();

// 监听日志变化，自动滚动到底部
watch(() => props.realTimeLogs, scrollToBottom, { deep: true, immediate: true });

// 监听 taskId 变化，重置滚动位置
watch(() => taskId.value, (newTaskId, oldTaskId) => {
  if (newTaskId && newTaskId !== oldTaskId) {
    // taskId 改变时，重置滚动位置到顶部
    nextTick(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = 0;
      }
    });
  }
}, { immediate: false });

// 取消部署处理函数
async function handleCancelDeploy() {
  // 防止重复点击
  if (isCancelling.value) return;

  // 验证serverId
  if (!serverId.value) {
    message.warning('无法获取服务器ID，请重试');
    return;
  }

  // 确认对话框
  window.$dialog?.error({
    title: $t('common.tip'),
    content: '确定要取消部署吗？此操作将停止当前的部署任务。',
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    positiveButtonProps: {
      type: 'error',
      ghost: false
    },
    onPositiveClick: async () => {
      isCancelling.value = true;

      try {
        const response = await fetchCancelDeploy({ serverId: serverId.value });

        // 使用通用错误处理函数
        const hasError = handleApiResponseError(response, '取消部署');

        // 如果没有错误，显示成功消息
        if (!hasError) {
          const responseData = response?.data || response;
          const msg = responseData?.msg || '取消部署成功';
          message.success(msg);
        }
      } catch (error: any) {
        // 使用通用异常处理函数
        handleApiCatchError(error, '取消部署');
      } finally {
        // 延迟恢复按钮状态
        setTimeout(() => {
          isCancelling.value = false;
        }, 1000);
      }
    }
  });
}
</script>

<style scoped>
.deployment-status {
  padding: 0;
}

/* 状态头部 */
.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(64, 152, 252, 0.08);
  border-radius: 4px;
  margin-bottom: 16px;
  border: 1px solid rgba(64, 152, 252, 0.15);
}

.status-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-title {
  font-size: 14px;
  font-weight: 600;
  color: inherit;
  margin: 0;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-text {
  font-size: 14px;
  font-weight: 600;
}

/* 刷新按钮 */
.refresh-btn {
  padding: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.05);
}

.refresh-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.refresh-icon {
  width: 16px;
  height: 16px;
  color: #666;
  transition: transform 0.3s;
}

.refresh-icon.is-refreshing {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 章节标题 */
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: inherit;
  opacity: 0.7;
  margin: 0 0 12px 0;
}

/* 服务区域 */
.services-section {
  margin-bottom: 16px;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

/* 服务项 */
.service-item {
  background: rgba(0, 0, 0, 0.02);
  padding: 10px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.2s;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  min-height: 48px;
  height: 48px;
}

.service-item:hover {
  background: rgba(64, 152, 252, 0.05);
  border-color: #4098fc;
  box-shadow: 0 2px 4px rgba(64, 152, 252, 0.1);
}

.service-icon {
  display: flex;
  align-items: center;
}

.service-content {
  min-width: 0;
  display: flex;
  align-items: center;
}

.service-name {
  font-size: 13px;
  font-weight: 600;
  color: inherit;
  line-height: 1.4;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.service-status {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* 状态徽章 */
.status-badge {
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 2px;
  white-space: nowrap;
}

/* 日志区域 */
.logs-section {
  margin-top: 16px;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.logs-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 连接状态 */
.connection-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.connection-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.connection-text {
  font-size: 12px;
  color: #666;
}

/* 日志计数 */
.log-count {
  font-size: 12px;
  color: #999;
}

/* 日志容器 */
.log-container {
  background: #1e1e1e;
  padding: 12px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid #333;
  color: #d4d4d4;
}

/* 空日志状态 */
.empty-log-state {
  text-align: center;
  padding: 32px 16px;
}

.empty-log-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #4098fc;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-dot {
  width: 16px;
  height: 16px;
  background: #f56c6c;
  border-radius: 50%;
}

.idle-dot {
  width: 16px;
  height: 16px;
  background: #909399;
  border-radius: 50%;
}

.empty-log-text {
  font-size: 14px;
  font-weight: 500;
}

.empty-log-text.status-connecting {
  color: #4098fc;
}

.empty-log-text.status-error {
  color: #f56c6c;
}

.empty-log-text.status-idle {
  color: #909399;
}

.empty-log-desc {
  color: #909399;
  font-size: 13px;
  margin-top: 8px;
}

.empty-log-task {
  margin-top: 12px;
  color: #4098fc;
  font-size: 12px;
}

.empty-log-error {
  margin-top: 8px;
  color: #f56c6c;
  font-size: 11px;
}

.log-container::-webkit-scrollbar {
  width: 6px;
}

.log-container::-webkit-scrollbar-track {
  background: #2a2a2a;
}

.log-container::-webkit-scrollbar-thumb {
  background: #4a4a4a;
  border-radius: 3px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: #5a5a5a;
}

/* 日志条目 */
.log-entry {
  display: flex;
  align-items: start;
  gap: 8px;
  padding: 4px 0;
  animation: fadeIn 0.3s ease-in-out;
}

.log-timestamp {
  color: #888;
  font-size: 11px;
  flex-shrink: 0;
  width: 65px;
}

.log-stage {
  color: #4fc3f7;
  font-size: 11px;
  flex-shrink: 0;
  background: rgba(79, 195, 247, 0.1);
  padding: 2px 6px;
  border-radius: 2px;
  font-weight: 500;
}

.log-message {
  flex: 1;
  line-height: 1.4;
  word-break: break-word;
}

/* 动画 */
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .services-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .services-grid {
    grid-template-columns: 1fr;
  }

  .status-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .status-right {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
