<script setup lang="ts">
import { computed, ref } from 'vue';
import { NModal, NDescriptions, NDescriptionsItem, NTag, NAlert, NButton, NSpace, useMessage, useDialog } from 'naive-ui';
import { format } from 'date-fns';
import { $t } from '@/locales';
import { fetchC2cReship, fetchC2cRetry } from '@/service/api';
import { useAuth } from '@/hooks/business/auth';

interface Props {
  visible: boolean;
  orderData: any;
  checkResult?: {
    msg?: string;
    code?: number;
    data?: any;
  };
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'action-success': [];
}>();

const { hasAuth } = useAuth();
const message = useMessage();
const dialog = useDialog();
const reshipLoading = ref(false);
const retryLoading = ref(false);

const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

function handleClose() {
  visible.value = false;
}

// 获取状态显示文本
function getStatusText(code?: number): string {
  if (code === -1 || code === 0) {
    return '关闭';
  }
  if (code === -2) {
    return '重新发货';
  }
  if (code === -3) {
    return '补单';
  }
  return '';
}

// 判断是否显示关闭状态
function isClosedStatus(code?: number): boolean {
  return code === -1 || code === 0;
}

// 判断是否显示重新发货按钮
function showReshipButton(code?: number): boolean {
  return code === -2;
}

// 判断是否显示补单按钮
function showRetryButton(code?: number): boolean {
  return code === -3;
}

// 处理重新发货
async function handleReship() {
  if (!hasAuth('treasure:transaction:reship')) {
    message.error('暂无重新发货权限');
    return;
  }
  if (!props.orderData?.consignmentId || !props.orderData?.serverId) {
    message.error('订单信息不完整');
    return;
  }

  dialog.warning({
    title: '确认重新发货',
    content: '确定要重新发货吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      reshipLoading.value = true;
      try {
        await fetchC2cReship({
          consignmentId: props.orderData.consignmentId,
          serverId: props.orderData.serverId,
          plaintext: props.orderData?.plaintext
        });
        message.success('重新发货成功');
        emit('action-success');
        handleClose();
      } catch (error: any) {
        message.error(error?.message || '重新发货失败');
      } finally {
        reshipLoading.value = false;
      }
    }
  });
}

// 处理补单
async function handleRetry() {
  if (!hasAuth('treasure:transaction:retry')) {
    message.error('暂无补单权限');
    return;
  }
  if (!props.orderData?.consignmentId || !props.orderData?.serverId) {
    message.error('订单信息不完整');
    return;
  }

  dialog.warning({
    title: '确认补单',
    content: '确定要补单吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      retryLoading.value = true;
      try {
        await fetchC2cRetry({
          consignmentId: props.orderData.consignmentId,
          serverId: props.orderData.serverId,
          plaintext: props.orderData?.plaintext
        });
        message.success('补单成功');
        emit('action-success');
        handleClose();
      } catch (error: any) {
        message.error(error?.message || '补单失败');
      } finally {
        retryLoading.value = false;
      }
    }
  });
}

// 格式化状态标签
function getStatusTag(status: any) {
  if (status === null || status === undefined) {
    return null;
  }

  const statusTagMap: Record<string, { type: 'success' | 'warning' | 'error' | 'info' | 'default'; text: string }> = {
    'AVAILABLE': { type: 'success', text: 'AVAILABLE' },
    'PROCESSING': { type: 'warning', text: 'PROCESSING' },
  };

  const statusKey = String(status);
  const tagInfo = statusTagMap[statusKey] || { type: 'default', text: statusKey };

  return tagInfo;
}

// 格式化内容显示
function formatContent(content: any): string {
  if (!content) return '';

  if (typeof content === 'string') {
    return content;
  }

  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return String(content);
  }
}
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="$t('page.manage.treasure.statusCheck')"
    style="width: 90%; max-width: 800px"
    @close="handleClose"
  >
    <div class="status-check-modal-content">
      <!-- 订单信息 -->
      <div class="mb-6">
        <h3 class="text-base font-semibold mb-4">{{ $t('page.manage.treasure.orderInfo') }}</h3>
        <NDescriptions :column="2" bordered>
          <NDescriptionsItem :label="$t('page.manage.treasure.consignmentId')">
            {{ orderData?.consignmentId || '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem :label="$t('page.manage.treasure.serverName')">
            {{ orderData?.serverName || '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem :label="$t('page.manage.treasure.platformId')">
            {{ orderData?.openId || '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem :label="$t('page.manage.treasure.roleId')">
            {{ orderData?.roleId || '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem :label="$t('page.manage.treasure.itemUniqueId')">
            {{ orderData?.iuid || '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem :label="$t('page.manage.treasure.itemId')">
            {{ orderData?.itemId || '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem :label="$t('page.manage.treasure.itemCount')">
            {{ orderData?.itemCount || '-' }}
          </NDescriptionsItem>
              <!-- <NDescriptionsItem :label="$t('page.manage.treasure.createTime')" :span="2">
            {{ orderData?.createTime ? format(new Date(orderData.createTime), 'yyyy-MM-dd HH:mm:ss') : '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem :label="$t('page.manage.treasure.updateTime')" :span="2">
            {{ orderData?.updateTime ? format(new Date(orderData.updateTime), 'yyyy-MM-dd HH:mm:ss') : '-' }}
          </NDescriptionsItem> -->
          <NDescriptionsItem :label="$t('page.manage.treasure.status')">
            <NTag v-if="getStatusTag(orderData?.status)" :type="getStatusTag(orderData?.status)?.type">
              {{ getStatusTag(orderData?.status)?.text }}
            </NTag>
            <span v-else>-</span>
          </NDescriptionsItem>
          <NDescriptionsItem :label="$t('page.manage.treasure.itemData')" :span="2">
            <pre class="content-text">{{ formatContent(orderData?.itemData) }}</pre>
          </NDescriptionsItem>
          <NDescriptionsItem :label="$t('page.manage.treasure.plaintext')" :span="2">
            <pre class="content-text">{{ formatContent(orderData?.plaintext) }}</pre>
          </NDescriptionsItem>
        </NDescriptions>
      </div>

      <!-- 状态检查结果 -->
      <div v-if="checkResult" class="mt-6">
        <h3 class="text-base font-semibold mb-4">{{ $t('page.manage.treasure.checkResult') }}</h3>
        <NAlert
          :type="isClosedStatus(checkResult.code) ? 'info' : (checkResult.code === 200 ? 'success' : 'warning')"
          :show-icon="true"
        >
          <div class="check-result-content">
            <div v-if="checkResult.msg" class="mb-2">
              <strong>{{ $t('page.manage.treasure.message') }}:</strong>
              <div class="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                {{ checkResult.msg }}
              </div>
            </div>
            <div v-if="checkResult.code !== undefined" class="mt-2">
              <strong>{{ $t('page.manage.treasure.code') }}:</strong> {{ checkResult.code }}
              <span v-if="getStatusText(checkResult.code)" class="ml-2 text-gray-600 dark:text-gray-400">
                ({{ getStatusText(checkResult.code) }})
              </span>
            </div>
            <div v-if="checkResult.data !== undefined && checkResult.data !== null" class="mt-2">
              <strong>{{ $t('page.manage.treasure.data') }}:</strong> {{ checkResult.data }}
            </div>
          </div>
        </NAlert>
      </div>
    </div>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="handleClose">{{ $t('common.cancel') }}</NButton>
        <NButton
          v-if="showReshipButton(checkResult?.code) && hasAuth('treasure:transaction:reship')"
          type="primary"
          :loading="reshipLoading"
          @click="handleReship"
        >
          重新发货
        </NButton>
        <NButton
          v-if="showRetryButton(checkResult?.code) && hasAuth('treasure:transaction:retry')"
          type="primary"
          :loading="retryLoading"
          @click="handleRetry"
        >
          补单
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
.status-check-modal-content {
  max-height: 70vh;
  overflow-y: auto;
}

.content-text {
  max-height: 150px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  padding: 8px;
  margin: 0;
  background-color: var(--n-code-color);
  border-radius: 4px;
  font-family: "Consolas", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.5;
}

.check-result-content {
  line-height: 1.8;
}

/* 自定义滚动条 */
.status-check-modal-content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.status-check-modal-content::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.status-check-modal-content::-webkit-scrollbar-track {
  background-color: transparent;
}
</style>

