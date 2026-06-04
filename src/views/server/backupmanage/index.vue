<script setup lang="tsx">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  NButton,
  NCard,
  NSpace,
  NAlert,
  NEmpty,
  NDataTable,
  NTag,
  NBadge,
  NModal,
  NStatistic,
  NGrid,
  NGridItem,
  NDescriptions,
  NDescriptionsItem,
  NText,
  NProgress,
} from 'naive-ui';
import {
  fetchBackupByZone,
  fetchBackupByInstance,
  fetchBackupAll,
  fetchRunningBackupTasks,
  fetchBackupStats,
  fetchBackupBatchStatus,
} from '@/service/api';
import { $t } from '@/locales';
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';
import { useAuth } from '@/hooks/business/auth';
import BackupOperateModal from './modules/backup-operate-modal.vue';
import BackupTaskDetailModal from './modules/backup-task-detail-modal.vue';

const { hasAuth } = useAuth();

type OperateType = 'zone' | 'instance' | 'all';

interface BackupTask {
  task_id: string;
  zone_name: string;
  status: string;
  progress: number;
  backup_status: string;
  message: string;
  created_at: string;
  [key: string]: any;
}

interface BackupStats {
  total_count: number;
  running_count: number;
  pending_count: number;
  success_count: number;
  failed_count: number;
  max_concurrent: number;
  available_slots: number;
}

// 状态管理
const backupModalVisible = ref(false);
const backupOperateType = ref<OperateType>('zone');
const tasksModalVisible = ref(false);
const recordsModalVisible = ref(false);

// 数据状态
const runningTasks = ref<BackupTask[]>([]);
const backupStats = ref<BackupStats | null>(null);

// 加载状态
const tasksLoading = ref(false);
const statsLoading = ref(false);

// 任务详情弹窗（从列表点击查看）
const taskDetailVisible = ref(false);
const currentTaskDetail = ref<BackupTask | null>(null);

// 备份任务详情弹窗（执行备份后自动显示）
const backupTaskDetailVisible = ref(false);
const backupTaskDetails = ref<BackupTask[]>([]);
const lastBackupBatchId = ref<string>('');
const backupRecords = ref<BackupRecord[]>([]);

// 轮询定时器
let pollingTimer: NodeJS.Timeout | null = null;

// 计算属性
const hasRunningTasks = computed(() => runningTasks.value.length > 0);
const runningTaskRowKey = (row: BackupTask) => row.task_id;
const recordRowKey = (row: BackupRecord) => row.batch_id;

type BackupRecord = {
  batch_id: string;
  operate_type: OperateType;
  message?: string;
  total?: number;
  pending?: number;
  running?: number;
  success?: number;
  failed?: number;
  progress?: number;
  created_at: string; // ISO
};

const RECORDS_STORAGE_KEY = 'backup:batchRecords';
const MAX_RECORDS = 50;

function loadBackupRecordsFromStorage() {
  try {
    const raw = localStorage.getItem(RECORDS_STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as BackupRecord[]) : [];
    backupRecords.value = Array.isArray(list) ? list : [];
  } catch {
    backupRecords.value = [];
  }
}

function saveBackupRecordsToStorage() {
  try {
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(backupRecords.value));
  } catch {
    // ignore
  }
}

function upsertBackupRecord(record: BackupRecord) {
  const idx = backupRecords.value.findIndex(r => r.batch_id === record.batch_id);
  if (idx >= 0) {
    backupRecords.value[idx] = { ...backupRecords.value[idx], ...record };
  } else {
    backupRecords.value = [record, ...backupRecords.value];
  }
  if (backupRecords.value.length > MAX_RECORDS) {
    backupRecords.value = backupRecords.value.slice(0, MAX_RECORDS);
  }
  saveBackupRecordsToStorage();
}

// 打开备份操作弹窗
function openBackupModal(type: OperateType) {
  backupOperateType.value = type;
  backupModalVisible.value = true;
}

const handleBackupByZone = () => openBackupModal('zone');
const handleBackupByInstance = () => openBackupModal('instance');
const handleBackupAll = () => openBackupModal('all');

// 执行备份请求
async function executeBackup(type: OperateType, data: any) {
  const apiMap = {
    zone: () => fetchBackupByZone({ gameZone: data.gameZone }),
    instance: () => fetchBackupByInstance({ singleRds: data.singleRds }),
    all: () => fetchBackupAll(),
  };
  return apiMap[type]();
}

// 解析备份响应中的task_ids
function parseBackupResponse(response: any): string[] {
  // 优先检查 response.response.data（实际API返回格式）
  if (response?.response?.data?.task_ids) {
    return response.response.data.task_ids;
  }

  // 备用：检查 response.data
  if (response?.data?.task_ids) {
    return response.data.task_ids;
  }

  // 备用：直接在 response
  if (response?.task_ids) {
    return response.task_ids;
  }

  return [];
}

function parseBackupBatchId(response: any): string {
  if (response?.response?.data?.batch_id) return response.response.data.batch_id;
  if (response?.data?.batch_id) return response.data.batch_id;
  if (response?.batch_id) return response.batch_id;
  return '';
}

function parseBatchStatusTasksData(response: any): BackupTask[] {
  const data = response?.response?.data ?? response?.data ?? response;
  if (!data) return [];

  // 推荐：后端返回 tasks（包含 zone/status/progress 等信息）
  if (Array.isArray(data.tasks)) return data.tasks as BackupTask[];

  // 兼容：返回 list/items 等字段
  if (Array.isArray(data.list)) return data.list as BackupTask[];
  if (Array.isArray(data.items)) return data.items as BackupTask[];

  // 最低兼容：只返回 task_ids（只能渲染 task_id）
  if (Array.isArray(data.task_ids)) {
    return data.task_ids.map((taskId: string) => ({
      task_id: taskId,
      status: data.status || 'accepted',
      progress: 0,
      backup_status: 'NoStart',
      message: data.message,
      created_at: '',
    }));
  }

  return [];
}

async function loadBatchTasks(batchId: string, showLoading = false) {
  if (!batchId) return;

  try {
    if (showLoading) tasksLoading.value = true;
    const response = await fetchBackupBatchStatus(batchId);
    const tasks = parseBatchStatusTasksData(response);

    // 批次状态接口至少应返回 task_ids；若为空则不覆盖现有列表
    if (tasks.length > 0) {
      runningTasks.value = tasks;
      backupTaskDetails.value = tasks;
    }

    // 同步更新本地记录（批次汇总字段）
    const data = response?.response?.data ?? response?.data ?? response;
    if (data?.batch_id) {
      upsertBackupRecord({
        batch_id: data.batch_id,
        operate_type: backupOperateType.value,
        message: data.message,
        total: data.total,
        pending: data.pending,
        running: data.running,
        success: data.success,
        failed: data.failed,
        progress: data.progress,
        created_at: backupRecords.value.find(r => r.batch_id === data.batch_id)?.created_at || new Date().toISOString(),
      });
    }
  } catch (error) {
    // 保持旧数据，避免弹窗空白
  } finally {
    if (showLoading) tasksLoading.value = false;
  }
}

// 处理备份提交
async function handleBackupSubmit(data: any) {
  try {
    const response = await executeBackup(backupOperateType.value, data);

    if (!handleApiResponseError(response, '备份')) {
      // 解析返回的task_ids
      const taskIds = parseBackupResponse(response);
      const taskCount = taskIds.length;
      const batchId = parseBackupBatchId(response);
      if (batchId) lastBackupBatchId.value = batchId;

      window.$message?.success(
        taskCount > 0
          ? `备份任务已创建，共 ${taskCount} 个任务`
          : $t('page.manage.backup.backupStarted')
      );

      backupModalVisible.value = false;

      // 用 batch_id 批量接口加载任务列表/详情（不再逐个 taskId 查询）
      if (batchId) {
        const responseAny = response as any;
        upsertBackupRecord({
          batch_id: batchId,
          operate_type: backupOperateType.value,
          message: responseAny?.response?.data?.message ?? responseAny?.data?.message ?? responseAny?.message,
          total: responseAny?.response?.data?.count ?? responseAny?.data?.count ?? responseAny?.count ?? taskCount,
          created_at: new Date().toISOString(),
        });
        await loadBatchTasks(batchId);
        if (backupTaskDetails.value.length > 0) {
          setTimeout(() => {
            backupTaskDetailVisible.value = true;
          }, 300);
        }
      } else if (taskIds.length > 0) {
        // 兜底：没有 batch_id 时仍展示最小信息
        const minimalTasks = taskIds.map(taskId => ({
          task_id: taskId,
          zone_name: '',
          status: 'accepted',
          progress: 0,
          backup_status: 'NoStart',
          message: '',
          created_at: '',
        })) as BackupTask[];
        backupTaskDetails.value = minimalTasks;
        setTimeout(() => {
          backupTaskDetailVisible.value = true;
        }, 300);
      }

      // 静默刷新统计数据
      await loadBackupStats(false);

      // 有运行中任务时启动轮询
      if (hasRunningTasks.value) {
        stopPolling();
        startPolling();
      }
    }
  } catch (error) {
    handleApiCatchError(error, '备份');
  }
}

// 解析任务数据
function parseTasksData(response: any): BackupTask[] {
  // 优先检查 response.response.data（实际API返回格式）
  if (response?.response?.data) {
    const data = response.response.data;

    // 如果有 tasks 字段
    if (data.tasks) {
      return Array.isArray(data.tasks) ? data.tasks : [];
    }
    // 如果 data 本身就是数组
    if (Array.isArray(data)) {
      return data;
    }
  }

  // 备用：检查 response.data
  if (response?.data) {
    const data = response.data;

    if (data.tasks) {
      return Array.isArray(data.tasks) ? data.tasks : [];
    }
    if (Array.isArray(data)) {
      return data;
    }
  }

  // 备用：直接检查 response.tasks
  if (response?.tasks) {
    return Array.isArray(response.tasks) ? response.tasks : [];
  }

  // 备用：response 本身是数组
  if (Array.isArray(response)) {
    return response;
  }

  return [];
}

// 加载运行中的任务
async function loadRunningTasks(showLoading = false) {
  try {
    if (showLoading) tasksLoading.value = true;

    // 优先使用最近一次备份的 batch_id，批量拿任务列表
    if (lastBackupBatchId.value) {
      await loadBatchTasks(lastBackupBatchId.value, false);
      return;
    }

    // 无 batch_id 兜底：仍使用“运行中任务”接口
    const response = await fetchRunningBackupTasks();
    runningTasks.value = parseTasksData(response);
  } catch (error) {
    runningTasks.value = [];
  } finally {
    if (showLoading) tasksLoading.value = false;
  }
}

// 解析统计数据
function parseStatsData(response: any): BackupStats | null {
  // 优先检查 response.response.data（实际API返回格式）
  if (response?.response?.data) {
    const data = response.response.data;
    // 检查是否包含统计字段
    if (data.total_count !== undefined) {
      return data;
    }
  }

  // 备用：检查 response.data.data
  if (response?.data?.data) {
    const data = response.data.data;
    if (data.total_count !== undefined) {
      return data;
    }
  }

  // 备用：检查 response.data
  if (response?.data) {
    const data = response.data;
    if (data.total_count !== undefined) {
      return data;
    }
  }

  // 备用：直接检查 response
  if (response?.total_count !== undefined) {
    return response;
  }

  return null;
}

// 加载备份统计信息
async function loadBackupStats(showLoading = false) {
  try {
    if (showLoading) statsLoading.value = true;

    const response = await fetchBackupStats();
    backupStats.value = parseStatsData(response);
  } catch (error) {
    console.error('加载统计信息失败:', error);
  } finally {
    if (showLoading) statsLoading.value = false;
  }
}

// 轮询管理
const POLLING_INTERVAL = 10000; // 10秒

function startPolling() {
  loadRunningTasks();
  loadBackupStats();

  pollingTimer = setInterval(async () => {
    await loadRunningTasks();

    if (runningTasks.value.length === 0) {
      stopPolling();
    } else {
      loadBackupStats();
    }
  }, POLLING_INTERVAL);
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

// 打开任务列表弹窗
function openRecordsModal() {
  recordsModalVisible.value = true;
  loadBackupRecordsFromStorage();
}

// 任务状态标签颜色
function getTaskStatusType(status: string) {
  const statusMap: Record<string, any> = {
    'running': 'info',
    'success': 'success',
    'completed': 'success',
    'failed': 'error',
    'error': 'error',
    'pending': 'warning',
    'NoStart': 'warning',
    'Checking': 'info',
    'Finished': 'success',
  };
  return statusMap[status] || 'default';
}

// 任务状态文本
function getTaskStatusText(status: string) {
  const statusMap: Record<string, string> = {
    'running': '运行中',
    'success': '成功',
    'completed': '已完成',
    'failed': '失败',
    'error': '错误',
    'pending': '等待中',
    'NoStart': '未开始',
    'Checking': '检查中',
    'Finished': '已完成',
  };
  return statusMap[status] || status;
}

// 查看任务详情（从列表）
function viewTaskDetail(task: BackupTask) {
  currentTaskDetail.value = task;
  taskDetailVisible.value = true;
}

// 重新打开备份任务详情弹窗
function reopenBackupTaskDetail() {
  if (backupTaskDetails.value.length > 0) {
    backupTaskDetailVisible.value = true;
  } else {
    window.$message?.info('暂无最近的备份任务记录');
  }
}

function formatOperateType(type: OperateType) {
  const map: Record<OperateType, string> = {
    zone: '按区备份',
    instance: '单实例备份',
    all: '全量备份',
  };
  return map[type] || type;
}

async function openBatchTasks(record: BackupRecord) {
  lastBackupBatchId.value = record.batch_id;
  recordsModalVisible.value = false;
  tasksModalVisible.value = true;
  await loadBatchTasks(record.batch_id, true);
}

const recordColumns = [
  {
    key: 'created_at',
    title: '创建时间',
    align: 'center' as const,
    width: 170,
    render: (row: BackupRecord) => {
      const d = row.created_at ? new Date(row.created_at) : null;
      return <span class="text-xs text-gray-600">{d ? d.toLocaleString('zh-CN') : '-'}</span>;
    },
  },

  {
    key: 'batch_id',
    title: '批次ID',
    align: 'center' as const,
    width: 220,
    ellipsis: { tooltip: true },
  },
  {
    key: 'progress',
    title: '进度',
    align: 'center' as const,
    width: 190,
    render: (row: BackupRecord) => (
      <div class="flex items-center gap-8px justify-center" style="white-space: nowrap;">
        <div style="width: 120px;">
          <NProgress type="line" percentage={row.progress || 0} height={6} showIndicator={false} />
        </div>
        <span class="text-xs text-gray-600 font-medium">{`${row.progress || 0}%`}</span>
      </div>
    ),
  },
  {
    key: 'running',
    title: '运行中',
    align: 'center' as const,
    width: 90,
    render: (row: BackupRecord) => <span class="text-info-600">{row.running ?? '-'}</span>,
  },
  {
    key: 'success',
    title: '成功',
    align: 'center' as const,
    width: 80,
    render: (row: BackupRecord) => <span class="text-green-600">{row.success ?? '-'}</span>,
  },
  {
    key: 'failed',
    title: '失败',
    align: 'center' as const,
    width: 80,
    render: (row: BackupRecord) => <span class="text-red-600">{row.failed ?? '-'}</span>,
  },
  {
    key: 'actions',
    title: '操作',
    align: 'center' as const,
    width: 110,
    render: (row: BackupRecord) => (
      <NButton text type="primary" size="small" onClick={() => openBatchTasks(row)}>
        查看任务
      </NButton>
    ),
  },
];

// 表格列定义
const columns = [
  {
    key: 'zone_name',
    title: '备份目标',
    align: 'center' as const,
    minWidth: 200,
    ellipsis: {
      tooltip: true
    },
    render: (row: any) => {
      return <span class="font-medium">{row.zone_name || row.rds_instance || '-'}</span>;
    },
  },
  {
    key: 'status',
    title: '任务状态',
    align: 'center' as const,
    width: 100,
    render: (row: any) => {
      return <NTag type={getTaskStatusType(row.status)}>{getTaskStatusText(row.status)}</NTag>;
    },
  },
  {
    key: 'progress',
    title: '进度',
    align: 'center' as const,
    width: 140,
    render: (row: any) => {
      return <NProgress type="line" percentage={row.progress || 0} height={6} />;
    },
  },
  {
    key: 'backup_status',
    title: '备份状态',
    align: 'center' as const,
    width: 110,
    render: (row: any) => {
      if (!row.backup_status) return <span class="text-gray-400">-</span>;
      return <NTag size="small" type={getTaskStatusType(row.backup_status)}>{row.backup_status}</NTag>;
    },
  },
  {
    key: 'message',
    title: '消息',
    align: 'center' as const,
    width: 250,
    ellipsis: {
      tooltip: true
    },
  },
  {
    key: 'created_at',
    title: '创建时间',
    align: 'center' as const,
    width: 160,
    render: (row: any) => {
      if (!row.created_at) return <span class="text-gray-400">-</span>;
      const date = new Date(row.created_at);
      return (
        <span class="text-xs text-gray-600">
          {date.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      );
    },
  },
  {
    key: 'task_id',
    title: '任务ID',
    align: 'center' as const,
    width: 100,
    render: (row: any) => {
      const shortId = row.task_id?.slice(0, 8) || '-';
      return <span class="text-gray-500 text-xs font-mono" title={row.task_id}>{shortId}...</span>;
    },
  },
  {
    key: 'actions',
    title: '操作',
    align: 'center' as const,
    width: 100,
    render: (row: any) => {
      return (
        <NButton
          text
          type="primary"
          size="small"
          onClick={() => viewTaskDetail(row)}
        >
          查看详情
        </NButton>
      );
    },
  },
];

// 组件挂载时开始轮询
onMounted(() => {
  loadBackupRecordsFromStorage();
  startPolling();
});

// 组件卸载时停止轮询
onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <div class="backup-container">
    <!-- 提示信息 -->
    <NAlert
      :title="$t('page.manage.backup.pageTitle')"
      type="info"
    >
      {{ $t('page.manage.backup.pageDescription') }}
    </NAlert>

    <!-- 备份操作和统计 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-16px">
        <!-- 按区备份 -->
        <NCard
          :bordered="true"
          class="backup-card hover:shadow-lg transition-shadow cursor-pointer"
          @click="handleBackupByZone"
        >
          <div class="flex flex-col items-center gap-16px py-24px">
            <div class="backup-icon bg-blue-50 text-blue-500">
              <icon-mdi-database-export class="text-48px" />
            </div>
            <div class="text-center">
              <div class="text-18px font-semibold mb-8px">
                {{ $t('page.manage.backup.backupByZone') }}
              </div>
              <div class="text-14px text-gray-500">
                {{ $t('page.manage.backup.zoneBackupDesc') }}
              </div>
            </div>
            <NButton
              type="info"
              size="large"
              block
              :disabled="!hasAuth('server:backup:create')"
            >
              {{ $t('page.manage.backup.executeBackup') }}
            </NButton>
          </div>
        </NCard>

        <!-- 单实例备份 -->
        <NCard
          :bordered="true"
          class="backup-card hover:shadow-lg transition-shadow cursor-pointer"
          @click="handleBackupByInstance"
        >
          <div class="flex flex-col items-center gap-16px py-24px">
            <div class="backup-icon bg-green-50 text-green-500">
              <icon-mdi-server class="text-48px" />
            </div>
            <div class="text-center">
              <div class="text-18px font-semibold mb-8px">
                {{ $t('page.manage.backup.backupByInstance') }}
              </div>
              <div class="text-14px text-gray-500">
                {{ $t('page.manage.backup.instanceBackupDesc') }}
              </div>
            </div>
            <NButton
              type="success"
              size="large"
              block
              :disabled="!hasAuth('server:backup:create')"
            >
              {{ $t('page.manage.backup.executeBackup') }}
            </NButton>
          </div>
        </NCard>

        <!-- 全量备份 -->
        <NCard
          :bordered="true"
          class="backup-card hover:shadow-lg transition-shadow cursor-pointer"
          @click="handleBackupAll"
        >
          <div class="flex flex-col items-center gap-16px py-24px">
            <div class="backup-icon bg-orange-50 text-orange-500">
              <icon-mdi-database-sync class="text-48px" />
            </div>
            <div class="text-center">
              <div class="text-18px font-semibold mb-8px">
                {{ $t('page.manage.backup.backupAll') }}
              </div>
              <div class="text-14px text-gray-500">
                {{ $t('page.manage.backup.allBackupDesc') }}
              </div>
            </div>
            <NButton
              type="warning"
              size="large"
              block
              :disabled="!hasAuth('server:backup:create')"
            >
              {{ $t('page.manage.backup.executeBackup') }}
            </NButton>
          </div>
        </NCard>
    </div>

    <!-- 备份统计信息 -->
    <NCard :bordered="true">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-8px">
            <icon-mdi-chart-bar class="text-20px text-primary" />
            <span class="font-semibold">备份统计</span>
          </div>
          <NSpace :size="8">
            <NButton
              quaternary
              circle
              @click="loadBackupStats(true)"
              :loading="statsLoading"
            >
              <template #icon>
                <icon-mdi-refresh class="text-18px" />
              </template>
            </NButton>
            <NButton
              type="success"
              secondary
              @click="reopenBackupTaskDetail"
              :disabled="backupTaskDetails.length === 0"
            >
              <template #icon>
                <icon-mdi-file-document-check />
              </template>
              备份详情 {{ backupTaskDetails.length > 0 ? backupTaskDetails.length : '' }}
            </NButton>
            <NButton
              type="primary"
              @click="openRecordsModal"
            >
              <template #icon>
                <icon-mdi-format-list-bulleted />
              </template>
              备份记录
            </NButton>
          </NSpace>
        </div>
      </template>
      <NGrid cols="2 s:3 m:4 l:7" responsive="screen" :x-gap="12" :y-gap="12">
        <NGridItem>
          <NStatistic label="总任务数" :value="backupStats?.total_count || 0">
            <template #prefix>
              <icon-mdi-database class="text-blue-500" />
            </template>
          </NStatistic>
        </NGridItem>
        <NGridItem>
          <NStatistic label="运行中" :value="backupStats?.running_count || 0">
            <template #prefix>
              <icon-mdi-progress-clock class="text-info-500" />
            </template>
          </NStatistic>
        </NGridItem>
        <NGridItem>
          <NStatistic label="等待中" :value="backupStats?.pending_count || 0">
            <template #prefix>
              <icon-mdi-clock-outline class="text-warning-500" />
            </template>
          </NStatistic>
        </NGridItem>
        <NGridItem>
          <NStatistic label="成功" :value="backupStats?.success_count || 0">
            <template #prefix>
              <icon-mdi-check-circle class="text-green-500" />
            </template>
          </NStatistic>
        </NGridItem>
        <NGridItem>
          <NStatistic label="失败" :value="backupStats?.failed_count || 0">
            <template #prefix>
              <icon-mdi-close-circle class="text-red-500" />
            </template>
          </NStatistic>
        </NGridItem>
        <NGridItem>
          <NStatistic label="最大并发" :value="backupStats?.max_concurrent || 0">
            <template #prefix>
              <icon-mdi-server-network class="text-purple-500" />
            </template>
          </NStatistic>
        </NGridItem>
        <NGridItem>
          <NStatistic label="可用槽位" :value="backupStats?.available_slots || 0">
            <template #prefix>
              <icon-mdi-checkbox-multiple-blank-outline class="text-gray-500" />
            </template>
          </NStatistic>
        </NGridItem>
      </NGrid>
    </NCard>

    <!-- 备份说明 -->
    <NCard :bordered="true">
      <template #header>
        <div class="flex items-center gap-8px">
          <icon-mdi-information-outline class="text-20px" />
          <span class="font-semibold">{{ $t('page.manage.backup.instructions') }}</span>
        </div>
      </template>
      <NSpace vertical :size="12">
        <NAlert type="info" :bordered="false">
          <template #header>
            {{ $t('page.manage.backup.backupByZone') }}
          </template>
          {{ $t('page.manage.backup.zoneBackupInstruction') }}
        </NAlert>
        <NAlert type="success" :bordered="false">
          <template #header>
            {{ $t('page.manage.backup.backupByInstance') }}
          </template>
          {{ $t('page.manage.backup.instanceBackupInstruction') }}
        </NAlert>
        <NAlert type="warning" :bordered="false">
          <template #header>
            {{ $t('page.manage.backup.backupAll') }}
          </template>
          {{ $t('page.manage.backup.allBackupInstruction') }}
        </NAlert>
      </NSpace>
    </NCard>

    <!-- 备份操作模态框 -->
    <BackupOperateModal
      v-model:visible="backupModalVisible"
      :operate-type="backupOperateType"
      @submit="handleBackupSubmit"
    />

    <!-- 备份记录弹窗 -->
    <NModal
      v-model:show="recordsModalVisible"
      preset="card"
      :style="{ width: '98%', maxWidth: '1600px' }"
      :segmented="{ content: 'soft', footer: false }"
    >
      <template #header>
        <div class="flex items-center gap-8px">
          <icon-mdi-history class="text-20px text-primary" />
          <span class="font-semibold">备份记录 ({{ backupRecords.length }})</span>
          <NBadge :value="backupRecords.length" :max="99" v-if="backupRecords.length > 0" />
        </div>
      </template>
      <template #header-extra>
        <NButton text @click="loadBackupRecordsFromStorage()">
          <template #icon>
            <icon-mdi-refresh />
          </template>
          刷新
        </NButton>
      </template>
      <div class="task-modal-content">
        <NDataTable
          v-if="backupRecords.length > 0"
          :columns="recordColumns"
          :data="backupRecords"
          :row-key="recordRowKey"
          :bordered="false"
          :single-line="false"
          size="small"
          :scroll-x="1400"
          :max-height="500"
        />
        <NEmpty v-else description="暂无备份记录" class="py-80px">
          <template #icon>
            <icon-mdi-database-clock class="text-60px text-info" />
          </template>
        </NEmpty>
      </div>
    </NModal>

    <!-- 运行中任务弹窗 -->
    <NModal
      v-model:show="tasksModalVisible"
      preset="card"
      :style="{ width: '95%', maxWidth: '1400px' }"
      :segmented="{ content: 'soft', footer: false }"
    >
      <template #header>
        <div class="flex items-center gap-8px">
          <icon-mdi-format-list-bulleted class="text-20px text-primary" />
          <span class="font-semibold">
            批次任务 ({{ runningTasks.length }})
            <span v-if="lastBackupBatchId" class="ml-8px text-xs text-gray-500 font-mono">
              {{ lastBackupBatchId.slice(0, 8) }}...
            </span>
          </span>
          <NBadge :value="runningTasks.length" :max="99" v-if="runningTasks.length > 0" />
        </div>
      </template>
      <template #header-extra>
        <NButton text @click="loadBatchTasks(lastBackupBatchId, true)" :loading="tasksLoading" :disabled="!lastBackupBatchId">
          <template #icon>
            <icon-mdi-refresh />
          </template>
          刷新
        </NButton>
      </template>
      <div class="task-modal-content">
        <NDataTable
          v-if="runningTasks.length > 0"
          :columns="columns"
          :data="runningTasks"
          :row-key="runningTaskRowKey"
          :bordered="false"
          :single-line="false"
          size="small"
          :scroll-x="1100"
          :max-height="500"
          :loading="tasksLoading"
        />
        <NEmpty v-else description="暂无批次任务" class="py-80px">
          <template #icon>
            <icon-mdi-checkbox-marked-circle-outline class="text-60px text-success" />
          </template>
        </NEmpty>
      </div>
    </NModal>

    <!-- 任务详情弹窗 -->
    <NModal
      v-model:show="taskDetailVisible"
      preset="card"
      title="备份任务详情"
      :style="{ width: '800px' }"
      :segmented="{ content: 'soft', footer: false }"
    >
      <div v-if="currentTaskDetail" class="task-detail-content">
        <NDescriptions bordered :column="2" label-placement="left">
          <NDescriptionsItem label="任务ID">
            <NText code>{{ currentTaskDetail.task_id }}</NText>
          </NDescriptionsItem>
          <NDescriptionsItem label="任务状态">
            <NTag :type="getTaskStatusType(currentTaskDetail.status)">
              {{ getTaskStatusText(currentTaskDetail.status) }}
            </NTag>
          </NDescriptionsItem>
          <NDescriptionsItem label="备份目标" :span="2">
            <NText strong>{{ currentTaskDetail.zone_name || currentTaskDetail.rds_instance || '-' }}</NText>
          </NDescriptionsItem>
          <NDescriptionsItem label="大区ID" v-if="currentTaskDetail.zone_id">
            {{ currentTaskDetail.zone_id }}
          </NDescriptionsItem>
          <NDescriptionsItem label="数据库名称" v-if="currentTaskDetail.db_name">
            {{ currentTaskDetail.db_name }}
          </NDescriptionsItem>
          <NDescriptionsItem label="RDS实例" :span="2" v-if="currentTaskDetail.rds_instance">
            <NText code>{{ currentTaskDetail.rds_instance }}</NText>
          </NDescriptionsItem>
          <NDescriptionsItem label="进度">
            <NProgress
              type="line"
              :percentage="currentTaskDetail.progress || 0"
              :height="8"
            />
          </NDescriptionsItem>
          <NDescriptionsItem label="备份状态" v-if="currentTaskDetail.backup_status">
            <NTag size="small" :type="getTaskStatusType(currentTaskDetail.backup_status)">
              {{ currentTaskDetail.backup_status }}
            </NTag>
          </NDescriptionsItem>
          <NDescriptionsItem label="备份任务ID" :span="2" v-if="currentTaskDetail.backup_job_id">
            <NText code>{{ currentTaskDetail.backup_job_id }}</NText>
          </NDescriptionsItem>
          <NDescriptionsItem label="备份ID" :span="2" v-if="currentTaskDetail.backup_id">
            <NText code>{{ currentTaskDetail.backup_id }}</NText>
          </NDescriptionsItem>
          <NDescriptionsItem label="消息" :span="2" v-if="currentTaskDetail.message">
            <NText>{{ currentTaskDetail.message }}</NText>
          </NDescriptionsItem>
          <NDescriptionsItem label="错误信息" :span="2" v-if="currentTaskDetail.error">
            <NText type="error">{{ currentTaskDetail.error }}</NText>
          </NDescriptionsItem>
          <NDescriptionsItem label="创建时间">
            {{ currentTaskDetail.created_at ? new Date(currentTaskDetail.created_at).toLocaleString('zh-CN') : '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="更新时间">
            {{ currentTaskDetail.updated_at ? new Date(currentTaskDetail.updated_at).toLocaleString('zh-CN') : '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="完成时间" :span="2" v-if="currentTaskDetail.completed_at">
            {{ new Date(currentTaskDetail.completed_at).toLocaleString('zh-CN') }}
          </NDescriptionsItem>
        </NDescriptions>
      </div>
    </NModal>

    <!-- 备份任务详情弹窗 -->
    <BackupTaskDetailModal
      v-model:visible="backupTaskDetailVisible"
      :tasks="backupTaskDetails"
      @view-task-list="openRecordsModal"
    />
  </div>
</template>

<style scoped>
.backup-container {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.backup-card {
  transition: all 0.3s ease;
  height: 100%;
}

.backup-card:hover {
  transform: translateY(-4px);
}

.backup-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-modal-content {
  min-height: 200px;
}

.task-detail-content {
  max-height: 70vh;
  overflow-y: auto;
}
</style>
