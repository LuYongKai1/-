<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { $t } from '@/locales';

defineOptions({
  name: 'YidunRecordSearch'
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

// 定义易盾回调记录搜索参数接口
interface YidunRecordSearchParams {
  current?: number;
  size?: number;
  account?: string;
  handleType?: string;
  processStatus?: number | null;
  isBanTrigger?: number | null;
  receiveTimeStart?: string;
  receiveTimeEnd?: string;
  handleTime?: number | null;
  handleTimeUnit?: number | null;
  handleReason?: string;
}

const model = defineModel<YidunRecordSearchParams>('model', { required: true });

// 是否允许触发搜索（避免初始化时误触发）
const shouldTriggerSearch = ref(false);

// 接收时间范围
const receiveTimeRange = ref<[number, number] | null>(null);

// 处置类型选项
const handleTypeOptions = [
  { label: '全部', value: '' },
  { label: '封禁用户', value: 'ban_user' },
  { label: '放行用户', value: 'unBan_user' },
  { label: '无动作', value: 'none' }
];

// 处理状态选项
const processStatusOptions = [
  { label: '全部', value: '' },
  { label: '待处理', value: 0 },
  { label: '处理成功', value: 1 },
  { label: '处理失败', value: 2 }
];

// 是否触发封禁选项
const banTriggerOptions = [
  { label: '全部', value: '' },
  { label: '否', value: 0 },
  { label: '是', value: 1 }
];

// 处置时长单位选项
const handleTimeUnitOptions = [
  { label: '全部', value: '' },
  { label: '分钟', value: 0 },
  { label: '小时', value: 1 },
  { label: '天', value: 2 },
  { label: '月', value: 3 },
  { label: '年', value: 4 }
];

// 格式化时间为后端期望的格式
function formatDateForBackend(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().slice(0, 19).replace('T', ' '); // 格式: YYYY-MM-DD HH:mm:ss
}

// 监听接收时间范围变化
watch(receiveTimeRange, (newRange) => {
  if (newRange && newRange.length === 2) {
    // 开始时间设置为当天的 00:00:00
    const startDate = new Date(newRange[0]);
    startDate.setHours(0, 0, 0, 0);
    model.value.receiveTimeStart = formatDateForBackend(startDate.getTime());

    // 结束时间设置为当天的 23:59:59
    const endDate = new Date(newRange[1]);
    endDate.setHours(23, 59, 59, 999);
    model.value.receiveTimeEnd = formatDateForBackend(endDate.getTime());
  } else {
    model.value.receiveTimeStart = '';
    model.value.receiveTimeEnd = '';
  }
}, { deep: true });

// 初始化日期范围（如果模型中已有值）
function initReceiveTimeRange() {
  if (model.value.receiveTimeStart && model.value.receiveTimeEnd) {
    try {
      const startTime = new Date(model.value.receiveTimeStart).getTime();
      const endTime = new Date(model.value.receiveTimeEnd).getTime();
      receiveTimeRange.value = [startTime, endTime];
    } catch (error) {
      console.error('初始化时间范围失败:', error);
    }
  }
}

// 重置
function reset() {
  // 清空所有搜索字段，保留分页参数
  model.value.account = '';
  model.value.handleType = '';
  model.value.processStatus = null;
  model.value.isBanTrigger = null;
  model.value.receiveTimeStart = '';
  model.value.receiveTimeEnd = '';
  model.value.handleTime = null;
  model.value.handleTimeUnit = null;
  model.value.handleReason = '';

  receiveTimeRange.value = null;

  search(); // 重置后立即搜索
  emit('reset');
}

// 搜索
function search() {
  if (!shouldTriggerSearch.value) return;
  emit('search');
}

// 防抖搜索函数（500ms）
const debouncedSearch = useDebounceFn(search, 500);

// 监听表单字段变化，自动触发搜索
watch(
  () => [
    model.value.account,
    model.value.handleType,
    model.value.processStatus,
    model.value.isBanTrigger,
    model.value.receiveTimeStart,
    model.value.receiveTimeEnd,
    model.value.handleTime,
    model.value.handleTimeUnit,
    model.value.handleReason
  ],
  () => {
    if (shouldTriggerSearch.value) {
      debouncedSearch();
    }
  },
  { deep: true }
);

// 初始化
function initializeSearch() {
  initReceiveTimeRange();
  shouldTriggerSearch.value = true;
  search();
}

// 组件挂载后初始化
initializeSearch();
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper" :title="$t('common.search')">
    <NForm :model="model" label-placement="left" :label-width="100" @keyup.enter="search">
      <NGrid responsive="screen" item-responsive>
        <!-- 用户平台ID（缩短了宽度） -->
        <NFormItemGi span="24 s:12 m:6" label="用户平台ID" path="account" class="pr-24px">
          <NInput
            v-model:value="model.account"
            placeholder="请输入用户平台ID"
            clearable
            style="width: 100%"
          />
        </NFormItemGi>

        <!-- 处置类型 -->
        <NFormItemGi span="24 s:12 m:6" label="处置类型" path="handleType" class="pr-24px">
          <NSelect
            v-model:value="model.handleType"
            :options="handleTypeOptions"
            placeholder="请选择处置类型"
            clearable
            style="width: 100%"
          />
        </NFormItemGi>

        <!-- 处理状态 -->
        <NFormItemGi span="24 s:12 m:6" label="处理状态" path="processStatus" class="pr-24px">
          <NSelect
            v-model:value="model.processStatus"
            :options="processStatusOptions"
            placeholder="请选择处理状态"
          clearable
          style="width: 100%"
          />
        </NFormItemGi>

        <!-- 是否触发封禁 -->
        <NFormItemGi span="24 s:12 m:6" label="触发封禁" path="isBanTrigger" class="pr-24px">
          <NSelect
            v-model:value="model.isBanTrigger"
            :options="banTriggerOptions"
            placeholder="请选择是否触发封禁"
          clearable
          style="width: 100%"
          />
        </NFormItemGi>

        <!-- 处置时长 -->
        <NFormItemGi span="24 s:12 m:6" label="处置时长" path="handleTime" class="pr-24px">
          <NInputNumber
            v-model:value="model.handleTime"
            placeholder="请输入处置时长"
            :min="0"
            clearable
            style="width: 100%"
            :show-button="false"
          />
        </NFormItemGi>

        <!-- 处置时长单位 -->
        <NFormItemGi span="24 s:12 m:6" label="时长单位" path="handleTimeUnit" class="pr-24px">
          <NSelect
            v-model:value="model.handleTimeUnit"
            :options="handleTimeUnitOptions"
            placeholder="请选择时长单位"
          clearable
          style="width: 100%"
          />
        </NFormItemGi>

        <!-- 接收时间范围 -->
        <NFormItemGi span="24 s:12 m:8" label="接收时间" path="receiveTimeRange" class="pr-24px">
          <NDatePicker
            v-model:value="receiveTimeRange"
            type="daterange"
          clearable
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          format="yyyy-MM-dd"
          style="width: 100%"
          />
        </NFormItemGi>
      </NGrid>
    </NForm>
  </NCard>
</template>

<style scoped>
/* 保持原有样式 */
.card-wrapper {
  margin-bottom: 16px;
}
</style>
