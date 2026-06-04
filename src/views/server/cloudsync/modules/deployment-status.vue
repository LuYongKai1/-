<template>
  <div class="deployment-status">
    <!-- 总体状态 -->
    <div class="overall-status mb-4">
      <div class="flex justify-between items-center">
        <h3 class="text-base font-semibold text-gray-800">{{ $t('page.manage.serveritem.deployment.overallStatus') }}</h3>
        <div class="flex items-center space-x-2">
          <div class="flex items-center space-x-1">
            <component :is="overallStatusIcon" />
            <span class="text-lg font-bold" :class="overallStatusTextClass">
              {{ overallStatusText }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 服务状态列表 -->
    <div class="services-status mb-4">
      <h3 class="text-base font-semibold text-gray-800 mb-3">{{ $t('page.manage.serveritem.deployment.deploymentStatus') }}</h3>
      <div class="space-y-3">
        <div
          v-for="(service, key) in services"
          :key="key"
          class="service-item flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div class="flex items-center space-x-3">
            <!-- 状态图标 -->
            <div class="flex-shrink-0">
              <div :class="getServiceIconClass(service.status)">
                <component :is="getServiceIcon(service.status)" />
              </div>
            </div>

            <!-- 服务信息 -->
            <div class="flex-1">
              <div class="flex items-center space-x-2 mb-1">
                <h4 class="font-medium text-gray-900 text-sm">{{ getServiceName(key) }}</h4>
                <span :class="STATUS_BADGE_CLASSES[service.status]" class="px-2 py-0.5 text-xs rounded-full">
                  {{ getStatusText(service.status) }}
                </span>
              </div>
              <p class="text-xs text-gray-600">{{ service.lastMessage || $t('page.manage.serveritem.deployment.waitingExecution') }}</p>
            </div>
          </div>

          <!-- 状态 -->
          <div class="flex-shrink-0 text-right">
            <div class="text-sm font-medium" :class="STATUS_TEXT_CLASSES[service.status]">
              {{ getStatusDisplayText(service.status) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 部署日志 -->
    <div class="deployment-logs">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-base font-semibold text-gray-800">{{ $t('page.manage.serveritem.deployment.deploymentLogs') }}</h3>
        <div class="flex items-center space-x-2">
          <!-- 连接状态指示器 -->
          <div class="flex items-center space-x-1">
            <div :class="connectionStatusClass" class="w-2 h-2 rounded-full"></div>
            <span class="text-xs text-gray-600">{{ connectionStatusText }}</span>
          </div>
          <!-- 日志数量 -->
          <span class="text-xs text-gray-500">{{ logCount }} {{ $t('page.manage.serveritem.deployment.logsCount') }}</span>
        </div>
      </div>

      <div class="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-40 overflow-y-auto" ref="logContainer">
        <!-- 优先显示SSE实时日志 -->
        <div v-if="props.realTimeLogs && props.realTimeLogs.length > 0" class="space-y-1">
          <div v-for="(log, index) in displayedLogs" :key="`realtime-log-${index}-${log.timestamp}`"
               class="flex items-start space-x-2 py-1 hover:bg-gray-800 rounded px-2 -mx-2 transition-colors animate-fade-in">
            <!-- 时间戳 -->
            <span class="text-gray-500 text-xs flex-shrink-0 w-20">
              {{ formatLogTime(log.timestamp) }}
            </span>

            <!-- 阶段标签 -->
            <span v-if="log.stage"
                  class="text-blue-400 text-xs flex-shrink-0 bg-blue-900 bg-opacity-30 px-2 py-0.5 rounded">
              {{ log.stage }}
            </span>


            <!-- 消息内容 -->
            <span class="flex-1" :class="getLogTypeClass(log.type, log.status)">
              {{ formatLogMessage(log.message) }}
            </span>
          </div>
        </div>

        <!-- 如果没有SSE日志，显示等待信息 -->
        <div v-else class="text-center py-8">
          <div class="flex items-center justify-center space-x-2 mb-2">
            <div v-if="props.connectionStatus === 'connecting'"
                 class="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <div v-else-if="props.connectionStatus === 'error'"
                 class="w-4 h-4 bg-red-400 rounded-full"></div>
            <div v-else
                 class="w-4 h-4 bg-gray-400 rounded-full"></div>
            <span :class="{
              'text-blue-400': props.connectionStatus === 'connecting',
              'text-red-400': props.connectionStatus === 'error',
              'text-gray-400': props.connectionStatus === 'disconnected'
            }">
              {{ getConnectionMessage() }}
            </span>
          </div>
          <div class="text-gray-400 text-sm">{{ getConnectionDescription() }}</div>
          <div v-if="taskId" class="mt-2 text-blue-400 text-sm">
            {{ $t('page.manage.serveritem.deployment.taskId') }}: {{ taskId }}
          </div>
          <div v-if="props.connectionStatus === 'error' && props.errorMessage"
               class="mt-2 text-red-400 text-xs">
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

// 计算属性
const deploymentData = computed<DeploymentData>(() =>
  props.data?.response?.data?.data || props.data?.data || {}
);

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

  const spinnerColor = status === 'running' ? 'border-blue-600' : 'border-gray-400';
  return () => h('div', {
    class: `w-3 h-3 border-2 ${spinnerColor} border-t-transparent rounded-full animate-spin`
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
</script>

<style scoped>
.deployment-status {
  max-width: 100%;
}

.service-item {
  transition: all 0.2s ease-in-out;
}

.service-item:hover {
  transform: translateY(-1px);
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
