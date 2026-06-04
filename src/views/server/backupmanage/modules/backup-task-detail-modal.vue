<script setup lang="ts">
import { NAlert, NButton, NModal, NCard, NDescriptions, NDescriptionsItem, NTag, NProgress, NText } from 'naive-ui';

interface BackupTask {
  task_id: string;
  zone_id?: number;
  zone_name?: string;
  db_name?: string;
  rds_instance?: string;
  backup_job_id?: string;
  backup_status?: string;
  backup_id?: string;
  status: string;
  progress?: number;
  message?: string;
  error?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
}

interface Props {
  tasks: BackupTask[];
}

interface Emits {
  (e: 'viewTaskList'): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false,
});

// 任务状态标签颜色
function getTaskStatusType(status: string) {
  const statusMap: Record<string, any> = {
    'running': 'info',
    'success': 'success',
    'completed': 'success',
    'failed': 'error',
    'error': 'error',
    'pending': 'warning',
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
  };
  return statusMap[status] || status;
}

function handleClose() {
  visible.value = false;
}

function handleViewTaskList() {
  visible.value = false;
  emit('viewTaskList');
}
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="card"
    title="备份任务已创建"
    :style="{ width: '700px' }"
    :segmented="{ content: 'soft', footer: 'soft' }"
  >
    <NAlert type="success" class="mb-16px">
      成功创建 {{ tasks.length }} 个备份任务，任务已开始执行
    </NAlert>

    <div class="flex flex-col gap-12px" style="max-height: 60vh; overflow-y: auto;">
      <NCard
        v-for="(task, index) in tasks"
        :key="task.task_id"
        size="small"
        :bordered="true"
      >
        <template #header>
          <div class="flex items-center gap-8px">
            <NTag round>{{ index + 1 }}</NTag>
            <span class="font-medium">{{ task.zone_name || task.rds_instance || '备份任务' }}</span>
            <NTag :type="getTaskStatusType(task.status)" size="small">
              {{ getTaskStatusText(task.status) }}
            </NTag>
          </div>
        </template>

        <NDescriptions :column="1" size="small" label-placement="left" :label-style="{ width: '80px' }">
          <NDescriptionsItem label="大区ID" v-if="task.zone_id">
            {{ task.zone_id }}
          </NDescriptionsItem>
          <NDescriptionsItem label="数据库" v-if="task.db_name">
            <NText code>{{ task.db_name }}</NText>
          </NDescriptionsItem>
          <NDescriptionsItem label="RDS实例" v-if="task.rds_instance">
            <NText code>{{ task.rds_instance }}</NText>
          </NDescriptionsItem>
          <NDescriptionsItem label="进度">
            <NProgress
              type="line"
              :percentage="task.progress || 0"
              :show-indicator="true"
              :height="6"
            />
          </NDescriptionsItem>
          <NDescriptionsItem label="消息" v-if="task.message">
            {{ task.message }}
          </NDescriptionsItem>
          <NDescriptionsItem label="创建时间">
            {{ task.created_at ? new Date(task.created_at).toLocaleString('zh-CN') : '-' }}
          </NDescriptionsItem>
        </NDescriptions>
      </NCard>
    </div>

    <template #footer>
      <div class="flex justify-end gap-12px">
        <NButton @click="handleClose">关闭</NButton>
        <NButton type="primary" @click="handleViewTaskList">
          查看任务列表
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped></style>
