

<script setup lang="tsx">
import { computed, ref } from 'vue';
import { NModal, NButton } from 'naive-ui';
import { Icon } from '@iconify/vue';
import { $t } from '@/locales';

interface RewardItem {
  itemId: number;
  count: number;
}

interface RewardData {
  mailTitle?: string;
  mailContent?: string;
  itemIds?: number[];
  itemCounts?: number[];
  [key: string]: any;
}

interface Props {
  show: boolean;
  rewardSnapshot: string;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  rewardSnapshot: ''
});

const emit = defineEmits<Emits>();

const visible = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value)
});

// 解析奖励数据
const rewardData = computed<RewardData | null>(() => {
  if (!props.rewardSnapshot || props.rewardSnapshot === '{}') {
    return null;
  }

  try {
    return JSON.parse(props.rewardSnapshot);
  } catch (e) {
    console.error('解析奖励数据失败:', e);
    return null;
  }
});

// 提取奖励物品
const rewardItems = computed<RewardItem[]>(() => {
  if (!rewardData.value?.itemIds || !rewardData.value?.itemCounts) {
    return [];
  }

  const itemIds = Array.isArray(rewardData.value.itemIds)
    ? rewardData.value.itemIds
    : [rewardData.value.itemIds];
  const itemCounts = Array.isArray(rewardData.value.itemCounts)
    ? rewardData.value.itemCounts
    : [rewardData.value.itemCounts];

  return itemIds.map((itemId: number, index: number) => ({
    itemId,
    count: itemCounts[index] || 0
  }));
});

// 提取其他数据（排除已处理的字段）
const otherData = computed(() => {
  if (!rewardData.value) return {};

  const excludeKeys = ['mailTitle', 'mailContent', 'itemIds', 'itemCounts'];
  const result: Record<string, any> = {};

  Object.entries(rewardData.value).forEach(([key, value]) => {
    if (!excludeKeys.includes(key) && value !== null && value !== undefined) {
      result[key] = value;
    }
  });

  return result;
});

// 格式化数字
function formatNumber(num: number): string {
  return num.toLocaleString();
}

// 格式化值
function formatValue(value: any): string {
  if (typeof value === 'number') {
    return formatNumber(value);
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
</script>

<template>
  <NModal v-model:show="visible" preset="dialog" :title="$t('page.manage.redeemrecord.rewardSnapshot')">
    <div class="reward-detail-container">
      <div v-if="!rewardData" class="text-center">
        {{ $t('common.noData') }}
      </div>

      <div v-else class="space-y-4">
        <!-- 邮件信息 -->
        <div v-if="rewardData.mailTitle || rewardData.mailContent" class="mail-section">
          <h3 class="text-lg font-semibold mb-3">
            <Icon icon="mdi:email" class="mr-2" />
            {{ $t('page.manage.redeemrecord.rewardDetail') }}
          </h3>

          <div v-if="rewardData.mailTitle" class="mb-3">
            <label class="block text-sm font-medium mb-1">{{ $t('page.manage.mailGuildController.mailTitle') }}</label>
            <div class="p-3 rounded border">
              {{ rewardData.mailTitle }}
            </div>
          </div>

          <div v-if="rewardData.mailContent" class="mb-3">
            <label class="block text-sm font-medium mb-1">{{ $t('page.manage.mailGuildController.mailContent') }}</label>
            <div class="p-3 rounded border max-h-40 overflow-y-auto whitespace-pre-wrap">
              {{ rewardData.mailContent }}
            </div>
          </div>
        </div>

        <!-- 奖励物品 -->
        <div v-if="rewardItems && rewardItems.length > 0" class="rewards-section">
          <h3 class="text-lg font-semibold mb-4">
            <Icon icon="mdi:gift" class="mr-2" />
            {{ $t('page.manage.redeemrecord.rewardItems') }}
          </h3>

          <div class="space-y-3">
            <div
              v-for="(item, index) in rewardItems"
              :key="index"
              class="reward-item-card"
            >
              <div class="reward-item-row">
                <div class="reward-item-left">
                  <div class="reward-icon">
                    <Icon icon="mdi:package-variant" size="20" />
                  </div>
                  <span class="reward-id-label">{{ $t('page.manage.operateserver.goods') }}ID:</span>
                  <span class="reward-id-value">{{ item.itemId }}</span>
                </div>
                <div class="reward-item-right">
                  <span class="reward-count-label">{{ $t('page.manage.questionnaire.form.count') }}:</span>
                  <span class="reward-count-value">{{ formatNumber(item.count) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 其他信息 -->
        <div v-if="otherData && Object.keys(otherData).length > 0" class="other-section">
          <h3 class="text-lg font-semibold mb-3">
            <Icon icon="mdi:information" class="mr-2" />
            其他信息
          </h3>

          <div class="p-4 rounded border">
            <div
              v-for="[key, value] in Object.entries(otherData)"
              :key="key"
              class="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0"
            >
              <span class="font-medium">{{ key }}:</span>
              <span>{{ formatValue(value) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #action>
      <div class="flex justify-end">
        <NButton @click="visible = false">
          {{ $t('common.close') }}
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
.reward-detail-container {
  max-height: 70vh;
  overflow-y: auto;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

/* 奖励物品卡片样式 */
.reward-item-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px 20px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.reward-item-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.reward-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reward-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reward-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  flex-shrink: 0;
}

.reward-id-label {
  font-size: 14px;
  font-weight: 500;
}

.reward-id-value {
  font-size: 16px;
  font-weight: 600;
}

.reward-item-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.reward-count-label {
  font-size: 14px;
  font-weight: 500;
}

.reward-count-value {
  font-size: 18px;
  font-weight: 700;
}

.reward-unit {
  font-size: 14px;
  font-weight: 500;
}

@media (max-width: 640px) {
  .reward-item-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .reward-item-right {
    align-self: flex-end;
  }
}



.border-gray-200 {
  border-color: #e5e7eb;
}

.max-h-40 {
  max-height: 10rem;
}

.overflow-y-auto {
  overflow-y: auto;
}

.whitespace-pre-wrap {
  white-space: pre-wrap;
}
</style>
