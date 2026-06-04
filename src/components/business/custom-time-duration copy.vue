<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface Props {
  /** 是否禁用 */
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});

interface Emits {
  /** 当总秒数变化时触发 */
  (e: 'update:seconds', value: number): void;
  /** 当选项变化时触发 */
  (e: 'update:option', value: string): void;
}

const emit = defineEmits<Emits>();

// 相对时间设置
const relativeTime = ref({
  years: 0,
  months: 0,
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
});

// 有效期限选项
const timeOptions = [
  { label: '自定义时长', value: 'custom' },
  { label: '1 天', value: 'day_1' },
  { label: '3 天', value: 'day_3' },
  { label: '7 天', value: 'day_7' },
  { label: '15 天', value: 'day_15' },
  { label: '30 天', value: 'day_30' },
  { label: '3 个月', value: 'month_3' },
];

// 添加选择的预设选项
const selectedTimeOption = ref<string>('day_1');

// 处理预设时间选项变更
function handleTimeOptionChange(option: string) {
  emit('update:option', option);

  if (option === 'custom') {
    // 自定义选项不需要应用预设值，保持当前的 relativeTime
    return;
  }

  // 根据选项设置相应的时间
  if (option === 'day_1') {
    relativeTime.value = { years: 0, months: 0, days: 1, hours: 0, minutes: 0, seconds: 0 };
  } else if (option === 'day_3') {
    relativeTime.value = { years: 0, months: 0, days: 3, hours: 0, minutes: 0, seconds: 0 };
  } else if (option === 'day_7') {
    relativeTime.value = { years: 0, months: 0, days: 7, hours: 0, minutes: 0, seconds: 0 };
  } else if (option === 'day_15') {
    relativeTime.value = { years: 0, months: 0, days: 15, hours: 0, minutes: 0, seconds: 0 };
  } else if (option === 'day_30') {
    relativeTime.value = { years: 0, months: 0, days: 30, hours: 0, minutes: 0, seconds: 0 };
  } else if (option === 'month_3') {
    relativeTime.value = { years: 0, months: 3, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
}

// 计算总秒数
const totalSeconds = computed(() => {
  let seconds = 0;
  seconds += (relativeTime.value.years || 0) * 365 * 24 * 60 * 60;
  seconds += (relativeTime.value.months || 0) * 30 * 24 * 60 * 60;
  seconds += (relativeTime.value.days || 0) * 24 * 60 * 60;
  seconds += (relativeTime.value.hours || 0) * 60 * 60;
  seconds += (relativeTime.value.minutes || 0) * 60;
  seconds += relativeTime.value.seconds || 0;
  return seconds;
});

// 监听相对时间变化
watch(
  relativeTime,
  () => {
    emit('update:seconds', totalSeconds.value);
  },
  { deep: true }
);

// 监听选项变化
watch(selectedTimeOption, (newVal) => {
  handleTimeOptionChange(newVal);
});

/**
 * 从秒数设置时间
 * @param seconds 总秒数
 */
function setFromSeconds(seconds: number) {
  // 根据秒数匹配预设时间选项
  if (seconds === 24 * 60 * 60) {
    selectedTimeOption.value = 'day_1';
    relativeTime.value = { years: 0, months: 0, days: 1, hours: 0, minutes: 0, seconds: 0 };
  } else if (seconds === 3 * 24 * 60 * 60) {
    selectedTimeOption.value = 'day_3';
    relativeTime.value = { years: 0, months: 0, days: 3, hours: 0, minutes: 0, seconds: 0 };
  } else if (seconds === 7 * 24 * 60 * 60) {
    selectedTimeOption.value = 'day_7';
    relativeTime.value = { years: 0, months: 0, days: 7, hours: 0, minutes: 0, seconds: 0 };
  } else if (seconds === 15 * 24 * 60 * 60) {
    selectedTimeOption.value = 'day_15';
    relativeTime.value = { years: 0, months: 0, days: 15, hours: 0, minutes: 0, seconds: 0 };
  } else if (seconds === 30 * 24 * 60 * 60) {
    selectedTimeOption.value = 'day_30';
    relativeTime.value = { years: 0, months: 0, days: 30, hours: 0, minutes: 0, seconds: 0 };
  } else if (seconds === 90 * 24 * 60 * 60) {
    selectedTimeOption.value = 'month_3';
    relativeTime.value = { years: 0, months: 3, days: 0, hours: 0, minutes: 0, seconds: 0 };
  } else {
    // 自定义时间
    selectedTimeOption.value = 'custom';

    // 计算各个时间单位
    const days = Math.floor(seconds / (24 * 60 * 60));
    const remainingSeconds = seconds % (24 * 60 * 60);
    const hours = Math.floor(remainingSeconds / (60 * 60));
    const remainingMinutes = remainingSeconds % (60 * 60);
    const minutes = Math.floor(remainingMinutes / 60);
    const secs = remainingMinutes % 60;

    // 直接设置天数，不自动转换为月份
    relativeTime.value = {
      years: 0,
      months: 0,
      days: days,
      hours: hours,
      minutes: minutes,
      seconds: secs,
    };
  }
}

/**
 * 重置为默认值（1天）
 */
function reset() {
  selectedTimeOption.value = 'day_1';
  relativeTime.value = {
    years: 0,
    months: 0,
    days: 1,
    hours: 0,
    minutes: 0,
    seconds: 0,
  };
}

/**
 * 获取当前总秒数
 */
function getSeconds(): number {
  return totalSeconds.value;
}

/**
 * 获取当前选项
 */
function getOption(): string {
  return selectedTimeOption.value;
}

// 暴露方法给父组件
defineExpose({
  setFromSeconds,
  reset,
  getSeconds,
  getOption,
});
</script>

<template>
  <div class="custom-time-duration">
    <NFormItem label="有效期限" span="24 m:12">
      <NSelect
        v-model:value="selectedTimeOption"
        :options="timeOptions"
        placeholder="请选择有效期限"
        clearable
        filterable
        :disabled="disabled"
      />
    </NFormItem>

    <NFormItem v-if="selectedTimeOption === 'custom'" label="自定义时长" span="24">
      <div
        class="grid grid-cols-6 gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-2"
      >
        <div>
          <NInputNumber
            v-model:value="relativeTime.years"
            :min="0"
            :max="100"
            class="w-full"
            :show-button="false"
            size="small"
            :disabled="selectedTimeOption !== 'custom' || disabled"
          >
            <template #suffix>年</template>
          </NInputNumber>
        </div>

        <div>
          <NInputNumber
            v-model:value="relativeTime.months"
            :min="0"
            :max="11"
            class="w-full"
            :show-button="false"
            size="small"
            :disabled="selectedTimeOption !== 'custom' || disabled"
          >
            <template #suffix>月</template>
          </NInputNumber>
        </div>

        <div>
          <NInputNumber
            v-model:value="relativeTime.days"
            :min="0"
            :max="999"
            class="w-full"
            :show-button="false"
            size="small"
            :disabled="selectedTimeOption !== 'custom' || disabled"
          >
            <template #suffix>天</template>
          </NInputNumber>
        </div>

        <div>
          <NInputNumber
            v-model:value="relativeTime.hours"
            :min="0"
            :max="23"
            class="w-full"
            :show-button="false"
            size="small"
            :disabled="selectedTimeOption !== 'custom' || disabled"
          >
            <template #suffix>时</template>
          </NInputNumber>
        </div>

        <div>
          <NInputNumber
            v-model:value="relativeTime.minutes"
            :min="0"
            :max="59"
            class="w-full"
            :show-button="false"
            size="small"
            :disabled="selectedTimeOption !== 'custom' || disabled"
          >
            <template #suffix>分</template>
          </NInputNumber>
        </div>

        <div>
          <NInputNumber
            v-model:value="relativeTime.seconds"
            :min="0"
            :max="59"
            class="w-full"
            :show-button="false"
            size="small"
            :disabled="selectedTimeOption !== 'custom' || disabled"
          >
            <template #suffix>秒</template>
          </NInputNumber>
        </div>
      </div>
    </NFormItem>
  </div>
</template>

<style scoped>
.custom-time-duration {
  width: 100%;
}
</style>
