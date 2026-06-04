<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { NButton, NButtonGroup, NDatePicker, NInputNumber, NSpace, NCard } from 'naive-ui';

interface Props {
  /** 开始时间 */
  startTime?: string | null;
  /** 结束时间 */
  endTime?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  startTime: null,
  endTime: null,
});

interface Emits {
  /** 当日期范围变化时触发 */
  (e: 'update:startTime', value: string | null): void;
  (e: 'update:endTime', value: string | null): void;
  (e: 'change', startTime: string | null, endTime: string | null): void;
  /** 取消按钮点击 */
  (e: 'cancel'): void;
  /** 应用按钮点击 */
  (e: 'apply'): void;
  /** 预设范围变化 */
  (e: 'presetChange', presetType: string | null): void;
}

const emit = defineEmits<Emits>();

// 日期范围值（时间戳）
const dateRange = ref<[number, number] | null>(null);

// 动态时间或静态时间（start和end分别控制）
const startTimeType = ref<'dynamic' | 'static'>('dynamic');
const endTimeType = ref<'dynamic' | 'static'>('dynamic');

// 动态时间的"几天前"
const startDaysAgo = ref(3);
const endDaysAgo = ref(0);

// 静态时间（日期）
const startStaticDate = ref<number | null>(null);
const endStaticDate = ref<number | null>(null);

// 计算动态时间模式下的日期显示值
const startDynamicDate = computed({
  get: () => {
    if (startTimeType.value === 'dynamic') {
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // 如果是动态时间，直接基于今天计算开始日期
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - startDaysAgo.value);
      startDate.setHours(0, 0, 0, 0);
      return startDate.getTime();
    }
    return startStaticDate.value;
  },
  set: (value: number | null) => {
    if (startTimeType.value === 'dynamic' && value) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const selectedDate = new Date(value);
      selectedDate.setHours(0, 0, 0, 0);
      const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const diffDays = Math.floor((today.getTime() - selectedDateOnly.getTime()) / (24 * 60 * 60 * 1000));
      startDaysAgo.value = Math.max(0, diffDays);
    } else {
      startStaticDate.value = value;
    }
  }
});

const endDynamicDate = computed({
  get: () => {
    if (endTimeType.value === 'dynamic') {
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() - endDaysAgo.value);
      endDate.setHours(23, 59, 59, 999);
      return endDate.getTime();
    }
    return endStaticDate.value;
  },
  set: (value: number | null) => {
    if (endTimeType.value === 'dynamic' && value) {
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      const selectedDate = new Date(value);
      selectedDate.setHours(23, 59, 59, 999);
      const diffDays = Math.floor((now.getTime() - selectedDate.getTime()) / (24 * 60 * 60 * 1000));
      endDaysAgo.value = Math.max(0, diffDays);
    } else {
      endStaticDate.value = value;
    }
  }
});

// 格式化日期为 yyyy-MM-dd HH:mm:ss
function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 解析日期字符串
function parseDateTime(dateStr: string): Date {
  return new Date(dateStr);
}

// 计算当前选择的日期范围
function calculateDateRange(): { start: string; end: string } {
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  let startDate: Date;
  let endDate: Date;

  // 计算结束日期
  if (endTimeType.value === 'dynamic') {
    endDate = new Date(now);
    endDate.setDate(endDate.getDate() - endDaysAgo.value);
    endDate.setHours(23, 59, 59, 999);
  } else {
    if (endStaticDate.value) {
      endDate = new Date(endStaticDate.value);
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    }
  }

  // 计算开始日期
  if (startTimeType.value === 'dynamic') {
    // 动态时间：基于今天计算开始日期，而不是基于结束日期
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() - startDaysAgo.value);
    startDate.setHours(0, 0, 0, 0);
  } else {
    if (startStaticDate.value) {
      startDate = new Date(startStaticDate.value);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(endDate);
      startDate.setHours(0, 0, 0, 0);
    }
  }

  return {
    start: formatDateTime(startDate),
    end: formatDateTime(endDate),
  };
}

// 更新日期范围并触发事件
function updateDateRange() {
  const range = calculateDateRange();
  emit('update:startTime', range.start);
  emit('update:endTime', range.end);
  emit('change', range.start, range.end);
}

// 处理预定义日期范围
function handlePresetRange(type: string) {
  isSettingPreset.value = true; // 标记正在设置预设范围
  activePresetRange.value = type;
  // 触发预设范围变化事件
  emit('presetChange', type);
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  let startDate: Date;
  let endDate: Date = new Date(now);

  switch (type) {
    case 'yesterday': // 昨日
      // 切换到动态时间模式：1天前到1天前
      startTimeType.value = 'dynamic';
      endTimeType.value = 'dynamic';
      startDaysAgo.value = 1;
      endDaysAgo.value = 1;
      // 计算日期用于显示
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      // 同时设置静态日期（用于日历显示）
      startStaticDate.value = startDate.getTime();
      endStaticDate.value = endDate.getTime();
      updateDateRange();
      // 延迟重置标志，确保 watch 和 syncFromProps 不会清除预设范围
      setTimeout(() => {
        isSettingPreset.value = false;
      }, 100);
      return; // 直接返回，不再执行后面的静态时间设置
    case 'today': // 今日
      // 切换到动态时间模式：0天前到0天前
      startTimeType.value = 'dynamic';
      endTimeType.value = 'dynamic';
      startDaysAgo.value = 0;
      endDaysAgo.value = 0;
      // 计算日期用于显示
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      // 同时设置静态日期（用于日历显示）
      startStaticDate.value = startDate.getTime();
      endStaticDate.value = endDate.getTime();
      updateDateRange();
      // 延迟重置标志，确保 watch 和 syncFromProps 不会清除预设范围
      setTimeout(() => {
        isSettingPreset.value = false;
      }, 100);
      return; // 直接返回，不再执行后面的静态时间设置
    case 'lastWeek': // 上周
      // 切换到动态时间模式
      // 上周：从上周一到上周日，需要计算对应的天数
      const todayForLastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const currentDayOfWeek = todayForLastWeek.getDay(); // 0=周日, 1=周一, ..., 6=周六

      // 计算上周一：先回到本周一，再减去7天
      const lastWeekStart = new Date(todayForLastWeek);
      // 如果今天是周日(0)，需要先回到上周一，即减去7天
      // 如果今天是周一(1)，需要减去8天才能到上周一
      // 如果今天是周二(2)，需要减去9天才能到上周一
      // 通用公式：减去 (currentDayOfWeek + 6) 天
      const daysToLastMonday = currentDayOfWeek === 0 ? 7 : currentDayOfWeek + 6;
      lastWeekStart.setDate(lastWeekStart.getDate() - daysToLastMonday);
      lastWeekStart.setHours(0, 0, 0, 0);

      // 上周日：上周一 + 6天
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
      lastWeekEnd.setHours(23, 59, 59, 999);

      // 计算距离今天的天数
      const lastWeekStartOnly = new Date(lastWeekStart.getFullYear(), lastWeekStart.getMonth(), lastWeekStart.getDate());
      const lastWeekEndOnly = new Date(lastWeekEnd.getFullYear(), lastWeekEnd.getMonth(), lastWeekEnd.getDate());

      const startDaysDiff = Math.floor((todayForLastWeek.getTime() - lastWeekStartOnly.getTime()) / (24 * 60 * 60 * 1000));
      const endDaysDiff = Math.floor((todayForLastWeek.getTime() - lastWeekEndOnly.getTime()) / (24 * 60 * 60 * 1000));

      startTimeType.value = 'dynamic';
      endTimeType.value = 'dynamic';
      startDaysAgo.value = startDaysDiff; // 上周一距离今天的天数
      endDaysAgo.value = endDaysDiff; // 上周日距离今天的天数

      // 同时设置静态日期（用于日历显示）
      startStaticDate.value = lastWeekStart.getTime();
      endStaticDate.value = lastWeekEnd.getTime();
      updateDateRange();
      // 延迟重置标志，确保 watch 不会清除预设范围
      setTimeout(() => {
        isSettingPreset.value = false;
      }, 0);
      return; // 直接返回，不再执行后面的静态时间设置
    case 'thisWeek': // 本周
      // 切换到动态时间模式
      // 本周：从本周一到本周日，需要计算对应的天数
      const todayForThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const currentDayOfWeekThisWeek = todayForThisWeek.getDay(); // 0=周日, 1=周一, ..., 6=周六

      // 计算本周一：回到本周一
      const thisWeekStart = new Date(todayForThisWeek);
      // 如果今天是周日(0)，本周一就是今天（周日作为本周的第一天）
      // 如果今天是周一(1)，本周一是0天前（今天）
      // 如果今天是周二(2)，本周一是1天前
      // 如果今天是周三(3)，本周一是2天前
      // 通用公式：如果今天是周日，本周一就是今天；否则减去 (currentDayOfWeek - 1) 天
      if (currentDayOfWeekThisWeek === 0) {
        // 周日：本周一就是今天
        thisWeekStart.setHours(0, 0, 0, 0);
      } else {
        // 其他天：回到本周一
        thisWeekStart.setDate(thisWeekStart.getDate() - (currentDayOfWeekThisWeek - 1));
      thisWeekStart.setHours(0, 0, 0, 0);
      }

      // 本周日：本周一 + 6天，或者如果今天是周日，就是今天
      const thisWeekEnd = new Date(thisWeekStart);
      thisWeekEnd.setDate(thisWeekEnd.getDate() + 6);
      thisWeekEnd.setHours(23, 59, 59, 999);

      // 如果本周日超过了今天，则使用今天作为结束日期
      if (thisWeekEnd.getTime() > now.getTime()) {
        thisWeekEnd.setTime(now.getTime());
        thisWeekEnd.setHours(23, 59, 59, 999);
      }

      // 计算距离今天的天数
      const thisWeekStartOnly = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate());
      const thisWeekEndOnly = new Date(thisWeekEnd.getFullYear(), thisWeekEnd.getMonth(), thisWeekEnd.getDate());

      const startDaysDiffThisWeek = Math.floor((todayForThisWeek.getTime() - thisWeekStartOnly.getTime()) / (24 * 60 * 60 * 1000));
      const endDaysDiffThisWeek = Math.floor((todayForThisWeek.getTime() - thisWeekEndOnly.getTime()) / (24 * 60 * 60 * 1000));

      startTimeType.value = 'dynamic';
      endTimeType.value = 'dynamic';
      startDaysAgo.value = startDaysDiffThisWeek; // 本周一距离今天的天数
      endDaysAgo.value = endDaysDiffThisWeek; // 本周日距离今天的天数

      // 同时设置静态日期（用于日历显示）
      startStaticDate.value = thisWeekStart.getTime();
      endStaticDate.value = thisWeekEnd.getTime();
      updateDateRange();
      // 延迟重置标志，确保 watch 和 syncFromProps 不会清除预设范围
      setTimeout(() => {
        isSettingPreset.value = false;
      }, 100);
      return; // 直接返回，不再执行后面的静态时间设置
    case 'lastMonth': // 上月
      // 切换到动态时间模式
      const todayForLastMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);

      // 计算距离今天的天数
      const lastMonthStartOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const lastMonthEndOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const startDaysDiffLastMonth = Math.floor((todayForLastMonth.getTime() - lastMonthStartOnly.getTime()) / (24 * 60 * 60 * 1000));
      const endDaysDiffLastMonth = Math.floor((todayForLastMonth.getTime() - lastMonthEndOnly.getTime()) / (24 * 60 * 60 * 1000));

      startTimeType.value = 'dynamic';
      endTimeType.value = 'dynamic';
      startDaysAgo.value = startDaysDiffLastMonth;
      endDaysAgo.value = endDaysDiffLastMonth;
      startStaticDate.value = startDate.getTime();
      endStaticDate.value = endDate.getTime();

      updateDateRange();
      // 延迟重置标志，确保 watch 不会清除预设范围
      setTimeout(() => {
        isSettingPreset.value = false;
      }, 0);
      return; // 直接返回，不再执行后面的静态时间设置
    case 'thisMonth': // 本月
      // 切换到动态时间模式
      const todayForThisMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);

      // 计算距离今天的天数
      const thisMonthStartOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const thisMonthEndOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const startDaysDiffThisMonth = Math.floor((todayForThisMonth.getTime() - thisMonthStartOnly.getTime()) / (24 * 60 * 60 * 1000));
      const endDaysDiffThisMonth = Math.floor((todayForThisMonth.getTime() - thisMonthEndOnly.getTime()) / (24 * 60 * 60 * 1000));

      startTimeType.value = 'dynamic';
      endTimeType.value = 'dynamic';
      startDaysAgo.value = startDaysDiffThisMonth;
      endDaysAgo.value = endDaysDiffThisMonth;
      startStaticDate.value = startDate.getTime();
      endStaticDate.value = endDate.getTime();

      updateDateRange();
      // 延迟重置标志，确保 watch 不会清除预设范围
      setTimeout(() => {
        isSettingPreset.value = false;
      }, 0);
      return; // 直接返回，不再执行后面的静态时间设置
    case 'past7days': // 过去7天
      // 切换到动态时间模式
      // 过去7天：从7天前到1天前（不包含今天）
      const todayForPast7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7); // 减去7天
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setDate(endDate.getDate() - 1); // 减去1天（昨天）
      endDate.setHours(23, 59, 59, 999);

      // 计算距离今天的天数
      const past7DaysStartOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const past7DaysEndOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const startDaysDiffPast7Days = Math.floor((todayForPast7Days.getTime() - past7DaysStartOnly.getTime()) / (24 * 60 * 60 * 1000));
      const endDaysDiffPast7Days = Math.floor((todayForPast7Days.getTime() - past7DaysEndOnly.getTime()) / (24 * 60 * 60 * 1000));

      startTimeType.value = 'dynamic';
      endTimeType.value = 'dynamic';
      startDaysAgo.value = startDaysDiffPast7Days;
      endDaysAgo.value = endDaysDiffPast7Days;
      startStaticDate.value = startDate.getTime();
      endStaticDate.value = endDate.getTime();

      updateDateRange();
      // 延迟重置标志，确保 watch 不会清除预设范围
      setTimeout(() => {
        isSettingPreset.value = false;
      }, 0);
      return; // 直接返回，不再执行后面的静态时间设置
    case 'last7days': // 最近7天
      // 切换到动态时间模式
      const todayForLast7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);

      // 计算距离今天的天数
      const last7DaysStartOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const last7DaysEndOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const startDaysDiffLast7Days = Math.floor((todayForLast7Days.getTime() - last7DaysStartOnly.getTime()) / (24 * 60 * 60 * 1000));
      const endDaysDiffLast7Days = Math.floor((todayForLast7Days.getTime() - last7DaysEndOnly.getTime()) / (24 * 60 * 60 * 1000));

      startTimeType.value = 'dynamic';
      endTimeType.value = 'dynamic';
      startDaysAgo.value = startDaysDiffLast7Days;
      endDaysAgo.value = endDaysDiffLast7Days;
      startStaticDate.value = startDate.getTime();
      endStaticDate.value = endDate.getTime();

      updateDateRange();
      // 延迟重置标志，确保 watch 不会清除预设范围
      setTimeout(() => {
        isSettingPreset.value = false;
      }, 0);
      return; // 直接返回，不再执行后面的静态时间设置
    case 'past30days': // 过去30天
      // 切换到动态时间模式
      // 过去30天：从30天前到1天前（不包含今天）
      const todayForPast30Days = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30); // 减去30天
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setDate(endDate.getDate() - 1); // 减去1天（昨天）
      endDate.setHours(23, 59, 59, 999);

      // 计算距离今天的天数
      const past30DaysStartOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const past30DaysEndOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const startDaysDiffPast30Days = Math.floor((todayForPast30Days.getTime() - past30DaysStartOnly.getTime()) / (24 * 60 * 60 * 1000));
      const endDaysDiffPast30Days = Math.floor((todayForPast30Days.getTime() - past30DaysEndOnly.getTime()) / (24 * 60 * 60 * 1000));

      startTimeType.value = 'dynamic';
      endTimeType.value = 'dynamic';
      startDaysAgo.value = startDaysDiffPast30Days;
      endDaysAgo.value = endDaysDiffPast30Days;
      startStaticDate.value = startDate.getTime();
      endStaticDate.value = endDate.getTime();

      updateDateRange();
      // 延迟重置标志，确保 watch 不会清除预设范围
      setTimeout(() => {
        isSettingPreset.value = false;
      }, 0);
      return; // 直接返回，不再执行后面的静态时间设置
    case 'last30days': // 最近30天
      // 切换到动态时间模式
      const todayForLast30Days = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);

      // 计算距离今天的天数
      const last30DaysStartOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const last30DaysEndOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const startDaysDiffLast30Days = Math.floor((todayForLast30Days.getTime() - last30DaysStartOnly.getTime()) / (24 * 60 * 60 * 1000));
      const endDaysDiffLast30Days = Math.floor((todayForLast30Days.getTime() - last30DaysEndOnly.getTime()) / (24 * 60 * 60 * 1000));

      startTimeType.value = 'dynamic';
      endTimeType.value = 'dynamic';
      startDaysAgo.value = startDaysDiffLast30Days;
      endDaysAgo.value = endDaysDiffLast30Days;
      startStaticDate.value = startDate.getTime();
      endStaticDate.value = endDate.getTime();

      updateDateRange();
      // 延迟重置标志，确保 watch 不会清除预设范围
      setTimeout(() => {
        isSettingPreset.value = false;
      }, 0);
      return; // 直接返回，不再执行后面的静态时间设置
    default:
      return;
  }

  // 转换为静态时间模式
  startTimeType.value = 'static';
  endTimeType.value = 'static';
  startStaticDate.value = startDate.getTime();
  endStaticDate.value = endDate.getTime();

  updateDateRange();
}

// 监听动态时间变化
watch([startTimeType, endTimeType, startDaysAgo, endDaysAgo], () => {
  if (startTimeType.value === 'dynamic' || endTimeType.value === 'dynamic') {
    // 只有在不是设置预设范围时才清除预设范围
    if (activePresetRange.value && !isSettingPreset.value) {
    activePresetRange.value = null; // 清除预设范围高亮
      emit('presetChange', null);
    }
    updateDateRange();
  }
}, { deep: true });

// 监听静态时间变化
watch([startStaticDate, endStaticDate], () => {
  if (startTimeType.value === 'static' || endTimeType.value === 'static') {
    // 只有在不是设置预设范围时才清除预设范围
    if (activePresetRange.value && !isSettingPreset.value) {
      activePresetRange.value = null; // 清除预设范围高亮
      emit('presetChange', null);
    }
    // 在静态时间模式下选择日期时，设置标志防止 syncFromProps 识别预设范围
    isSettingPreset.value = true;
    updateDateRange();
    setTimeout(() => {
      isSettingPreset.value = false;
    }, 0);
  }
}, { deep: true });

// 监听开始时间类型变化，切换时同步日期值
watch(startTimeType, (newType, oldType) => {
  if (newType === 'static' && oldType === 'dynamic') {
    // 如果从动态时间切换到静态时间，立即同步日期值
    // 清除预设范围，因为这是手动切换，不应该保持预设范围
    isSettingPreset.value = true;
    activePresetRange.value = null;
    emit('presetChange', null);

    const currentStartDate = getStartDateValue();
    if (currentStartDate) {
      // 强制更新静态日期值，确保显示正确的日期
      startStaticDate.value = currentStartDate;
    }

    setTimeout(() => {
      isSettingPreset.value = false;
    }, 0);
  } else if (newType === 'dynamic' && oldType === 'static') {
    // 如果从静态时间切换到动态时间，计算对应的天数
    // 清除预设范围，因为这是手动切换
    isSettingPreset.value = true;
    activePresetRange.value = null;
    emit('presetChange', null);

    if (startStaticDate.value) {
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const selectedDate = new Date(startStaticDate.value);
      const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const daysAgo = Math.floor((today.getTime() - selectedDateOnly.getTime()) / (24 * 60 * 60 * 1000));
      startDaysAgo.value = Math.max(0, daysAgo);
    }

    setTimeout(() => {
      isSettingPreset.value = false;
    }, 0);
  }
}, { immediate: false });

// 监听结束时间类型变化，如果选择静态时间，左侧自动切换到静态时间
watch(endTimeType, (newType, oldType) => {
  if (newType === 'static') {
    // 如果从动态时间切换到静态时间，立即同步日期值
    // 清除预设范围，因为这是手动切换，不应该保持预设范围
    isSettingPreset.value = true;
    activePresetRange.value = null;
    emit('presetChange', null);

    if (oldType === 'dynamic') {
      const currentEndDate = getEndDateValue();
      if (currentEndDate) {
        // 强制更新静态日期值，确保显示正确的日期
        endStaticDate.value = currentEndDate;
      }
    }

    // 如果右侧选择了静态时间，左侧自动切换到静态时间
    if (startTimeType.value === 'dynamic') {
      // 计算当前动态时间对应的静态日期
      const currentStartDate = getStartDateValue();
      if (currentStartDate) {
        startTimeType.value = 'static';
        startStaticDate.value = currentStartDate;
      }
    }

    setTimeout(() => {
      isSettingPreset.value = false;
    }, 0);
  } else if (newType === 'dynamic' && oldType === 'static') {
    // 如果从静态时间切换到动态时间，计算对应的天数
    // 清除预设范围，因为这是手动切换
    isSettingPreset.value = true;
    activePresetRange.value = null;
    emit('presetChange', null);

    if (endStaticDate.value) {
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const selectedDate = new Date(endStaticDate.value);
      const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const daysAgo = Math.floor((today.getTime() - selectedDateOnly.getTime()) / (24 * 60 * 60 * 1000));
      endDaysAgo.value = Math.max(0, daysAgo);
    }

    setTimeout(() => {
      isSettingPreset.value = false;
    }, 0);
  }
}, { immediate: false });

// 计算显示的日期范围文本
const displayedRange = computed(() => {
  const range = calculateDateRange();
  const start = range.start.split(' ')[0].replace(/-/g, '/');
  const end = range.end.split(' ')[0].replace(/-/g, '/');

  // 判断结束日期是否是今天
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const endDate = new Date(range.end);
  endDate.setHours(0, 0, 0, 0);
  const isToday = endDate.getTime() === now.getTime();

  const endDisplay = isToday ? '今日' : end;

  return `${start} → ${endDisplay}`;
});

// 预设范围名称映射
const presetRangeNames: Record<string, string> = {
  'yesterday': '昨日',
  'today': '今日',
  'lastWeek': '上周',
  'thisWeek': '本周',
  'lastMonth': '上月',
  'thisMonth': '本月',
  'past7days': '过去7天',
  'last7days': '最近7天',
  'past30days': '过去30天',
  'last30days': '最近30天'
};

// 计算详细日期范围显示
const displayedDetailRange = computed(() => {
  const range = calculateDateRange();
  const start = range.start.split(' ')[0].replace(/-/g, '/');
  const end = range.end.split(' ')[0].replace(/-/g, '/');

  // 如果有预设范围选中，显示预设范围名称
  if (activePresetRange.value && presetRangeNames[activePresetRange.value]) {
    const presetName = presetRangeNames[activePresetRange.value];
    // 如果开始和结束日期相同，只显示一个日期
    if (start === end) {
      return `${presetName} (${start})`;
    }
    return `${presetName} (${start} ~ ${end})`;
  }

  // 构建显示文本
  let startDisplay = start;
  let endDisplay = end;

  // 如果是动态时间模式，显示"X天前"格式（根据输入框的值）
  if (startTimeType.value === 'dynamic') {
    if (startDaysAgo.value === 0) {
      startDisplay = '今日';
    } else {
      startDisplay = `${startDaysAgo.value}天前`;
    }
  }

  if (endTimeType.value === 'dynamic') {
    if (endDaysAgo.value === 0) {
      endDisplay = '今日';
    } else {
      endDisplay = `${endDaysAgo.value}天前`;
    }
  } else {
    // 静态时间模式，检查是否是今天
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const endDate = new Date(range.end);
    endDate.setHours(0, 0, 0, 0);
    const isToday = endDate.getTime() === now.getTime();
    endDisplay = isToday ? '今日' : end;
  }

  // 如果开始和结束显示相同且日期相同，显示格式：12天前 2025/12/18)
  if (startDisplay === endDisplay && start === end) {
    return `${startDisplay} ${start})`;
  }

  // 如果开始和结束显示相同但日期不同，显示完整范围
  if (startDisplay === endDisplay) {
    return `${startDisplay} ${start} ~ ${end})`;
  }

  // 开始和结束不同，显示完整格式
  return `${startDisplay} → ${endDisplay} (${start} ~ ${end})`;
});

// 当前选中的预设范围（用于高亮显示）
const activePresetRange = ref<string | null>(null);

// 标志：是否正在设置预设范围（用于避免 watch 清除预设范围）
const isSettingPreset = ref(false);

// 控制自定义日期选择区域的显示/隐藏
const showCustomDatePicker = ref(true);

// 根据外部传入的时间同步内部状态
function syncFromProps() {
  if (!props.startTime || !props.endTime) {
    return;
  }

  // 如果正在设置预设范围，则不重新识别预设范围
  // 这样可以避免在用户选择预设范围时被覆盖
  if (isSettingPreset.value) {
    return;
  }

  // 如果当前是静态时间模式，则不自动识别预设范围
  // 这样可以避免在静态时间模式下选择日期时被误识别为预设范围并切换模式
  if (startTimeType.value === 'static' || endTimeType.value === 'static') {
    // 在静态时间模式下，只同步日期值，不识别预设范围
    const startDate = parseDateTime(props.startTime);
    const endDate = parseDateTime(props.endTime);

    if (startTimeType.value === 'static') {
      startStaticDate.value = startDate.getTime();
    }
    if (endTimeType.value === 'static') {
      endStaticDate.value = endDate.getTime();
    }
    return;
  }

  const startDate = parseDateTime(props.startTime);
  const endDate = parseDateTime(props.endTime);

  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // 计算距离今天的天数
  const startDaysDiff = Math.floor((todayOnly.getTime() - startDateOnly.getTime()) / (24 * 60 * 60 * 1000));
  const endDaysDiff = Math.floor((todayOnly.getTime() - endDateOnly.getTime()) / (24 * 60 * 60 * 1000));
  const daysDiff = Math.floor((endDateOnly.getTime() - startDateOnly.getTime()) / (24 * 60 * 60 * 1000));

  // 如果当前已经有"本周"预设范围，且日期范围是今天到今天的0天（即今天是周一），则保持"本周"
  // 这样可以避免在周一时将"本周"误识别为"今日"
  if (activePresetRange.value === 'thisWeek' && startDaysDiff === 0 && endDaysDiff === 0 && daysDiff === 0) {
    // 计算本周的开始日期（本周一）
    const thisWeekStart = new Date(todayOnly);
    if (todayOnly.getDay() === 0) {
      // 如果今天是周日，本周开始就是今天
    } else {
      // 否则，本周开始是本周一
      thisWeekStart.setDate(todayOnly.getDate() - (todayOnly.getDay() - 1));
    }
    thisWeekStart.setHours(0, 0, 0, 0);
    const thisWeekStartOnly = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate());

    // 如果开始日期是本周一（即今天是周一），则保持"本周"
    if (startDateOnly.getTime() === thisWeekStartOnly.getTime() &&
        endDateOnly.getTime() === todayOnly.getTime()) {
      // 计算本周一距离今天的天数（应该是0）
      const thisWeekStartDaysDiff = Math.floor((todayOnly.getTime() - thisWeekStartOnly.getTime()) / (24 * 60 * 60 * 1000));

      isSettingPreset.value = true;
      startTimeType.value = 'dynamic';
      endTimeType.value = 'dynamic';
      startDaysAgo.value = thisWeekStartDaysDiff;
      endDaysAgo.value = 0;
      activePresetRange.value = 'thisWeek';
      startStaticDate.value = startDate.getTime();
      endStaticDate.value = endDate.getTime();
      setTimeout(() => {
        isSettingPreset.value = false;
      }, 0);
      emit('presetChange', 'thisWeek');
      return;
    }
  }

  // 先检查是否是"今日"（优先级最高）
  // "今日"：开始日期和结束日期都是今天，且日期范围是0天
  // 如果当前已经有"本周"预设范围，则不识别为"今日"（已经在上面处理了）
  if (startDaysDiff === 0 && endDaysDiff === 0 && daysDiff === 0) {
    isSettingPreset.value = true;
    startTimeType.value = 'dynamic';
    endTimeType.value = 'dynamic';
    startDaysAgo.value = 0;
    endDaysAgo.value = 0;
    activePresetRange.value = 'today';
    startStaticDate.value = startDate.getTime();
    endStaticDate.value = endDate.getTime();
    setTimeout(() => {
      isSettingPreset.value = false;
    }, 0);
    emit('presetChange', 'today');
    return;
  }

  // 再检查是否是"本周"：本周一到今天
  // 如果当前已经有"本周"预设范围，且日期匹配，则保持"本周"
  // 但是，如果开始日期和结束日期都是今天（即"今日"），则不保持"本周"，应该识别为"今日"
  if (activePresetRange.value === 'thisWeek' && daysDiff > 0) {
    // 计算本周的开始日期（本周一）
    const thisWeekStart = new Date(todayOnly);
    if (todayOnly.getDay() === 0) {
      // 如果今天是周日，本周开始就是今天
    } else {
      // 否则，本周开始是本周一
      thisWeekStart.setDate(todayOnly.getDate() - (todayOnly.getDay() - 1));
    }
    thisWeekStart.setHours(0, 0, 0, 0);
    const thisWeekStartOnly = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate());

    // 如果日期范围匹配"本周"（开始日期是本周一，结束日期是今天），且开始日期不是今天，则保持"本周"
    if (startDateOnly.getTime() === thisWeekStartOnly.getTime() &&
        endDateOnly.getTime() === todayOnly.getTime() &&
        startDateOnly.getTime() < todayOnly.getTime()) {
      // 计算本周一距离今天的天数
      const thisWeekStartDaysDiff = Math.floor((todayOnly.getTime() - thisWeekStartOnly.getTime()) / (24 * 60 * 60 * 1000));

      isSettingPreset.value = true;
      startTimeType.value = 'dynamic';
      endTimeType.value = 'dynamic';
      startDaysAgo.value = thisWeekStartDaysDiff;
      endDaysAgo.value = 0;
      activePresetRange.value = 'thisWeek';
      startStaticDate.value = startDate.getTime();
      endStaticDate.value = endDate.getTime();
      setTimeout(() => {
        isSettingPreset.value = false;
      }, 0);
      emit('presetChange', 'thisWeek');
      return;
    }
  }

  // 检查是否是"本周"：本周一到今天，且开始日期是本周一（不是今天）
  // 必须满足 daysDiff > 0，确保日期范围大于0天，避免将"今日"误识别为"本周"
  if (daysDiff > 0 && daysDiff <= 6 && startDaysDiff >= 0 && startDaysDiff <= 6 && endDaysDiff === 0) {
    // 计算本周的开始日期（本周一）
    const thisWeekStart = new Date(todayOnly);
    if (todayOnly.getDay() === 0) {
      // 如果今天是周日，本周开始就是今天
    } else {
      // 否则，本周开始是本周一
      thisWeekStart.setDate(todayOnly.getDate() - (todayOnly.getDay() - 1));
    }
    thisWeekStart.setHours(0, 0, 0, 0);
    const thisWeekStartOnly = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate());

    // 如果开始日期是本周一，且结束日期是今天，且开始日期不是今天（即日期范围大于0天），则识别为"本周"
    // 这样可以避免在周一时将"今日"误识别为"本周"
    if (startDateOnly.getTime() === thisWeekStartOnly.getTime() &&
        endDateOnly.getTime() === todayOnly.getTime() &&
        startDateOnly.getTime() < todayOnly.getTime()) {
      // 计算本周一距离今天的天数
      const thisWeekStartDaysDiff = Math.floor((todayOnly.getTime() - thisWeekStartOnly.getTime()) / (24 * 60 * 60 * 1000));

      isSettingPreset.value = true;
      startTimeType.value = 'dynamic';
      endTimeType.value = 'dynamic';
      startDaysAgo.value = thisWeekStartDaysDiff;
      endDaysAgo.value = 0;
      activePresetRange.value = 'thisWeek';
      startStaticDate.value = startDate.getTime();
      endStaticDate.value = endDate.getTime();
      setTimeout(() => {
        isSettingPreset.value = false;
      }, 0);
      emit('presetChange', 'thisWeek');
      return;
    }
  }

  // 如果开始和结束都是昨天（startDaysDiff === 1 && endDaysDiff === 1），设置为"昨日"预设
  if (startDaysDiff === 1 && endDaysDiff === 1) {
    isSettingPreset.value = true;
    startTimeType.value = 'dynamic';
    endTimeType.value = 'dynamic';
    startDaysAgo.value = 1;
    endDaysAgo.value = 1;
    activePresetRange.value = 'yesterday';
    startStaticDate.value = startDate.getTime();
    endStaticDate.value = endDate.getTime();
    setTimeout(() => {
      isSettingPreset.value = false;
    }, 0);
    emit('presetChange', 'yesterday');
    return;
  }

  // 如果开始和结束都是昨天（startDaysDiff === 1 && endDaysDiff === 1），设置为"昨日"预设
  if (startDaysDiff === 1 && endDaysDiff === 1) {
    isSettingPreset.value = true;
    startTimeType.value = 'dynamic';
    endTimeType.value = 'dynamic';
    startDaysAgo.value = 1;
    endDaysAgo.value = 1;
    activePresetRange.value = 'yesterday';
    startStaticDate.value = startDate.getTime();
    endStaticDate.value = endDate.getTime();
    setTimeout(() => {
      isSettingPreset.value = false;
    }, 0);
    emit('presetChange', 'yesterday');
    return;
  }

  // 尝试识别其他预设范围
  // 这里可以根据日期范围识别"上周"、"本月"、"上月"、"过去7天"、"最近7天"、"过去30天"、"最近30天"等
  // 为了简化，我们只识别基本的日期状态，其他预设范围由用户手动选择

  // 否则，根据日期设置动态时间或静态时间
  if (startDaysDiff >= 0 && startDaysDiff <= 365) {
    // 在合理范围内，使用动态时间
    startTimeType.value = 'dynamic';
    startDaysAgo.value = Math.max(0, startDaysDiff);
  } else {
    startTimeType.value = 'static';
    startStaticDate.value = startDate.getTime();
  }

  if (endDaysDiff >= 0 && endDaysDiff <= 365) {
    endTimeType.value = 'dynamic';
    endDaysAgo.value = Math.max(0, endDaysDiff);
  } else {
    endTimeType.value = 'static';
    endStaticDate.value = endDate.getTime();
  }

  // 尝试识别其他预设范围（通过日期范围）
  // 这里可以调用父组件的 detectPresetRange 函数，但为了解耦，我们只设置基本的日期状态
  // 预设范围的识别由父组件通过 detectPresetRange 完成
}

// 初始化默认值（昨日）
function initDefaultRange() {
  // 如果外部传入了时间，同步内部状态
  if (props.startTime && props.endTime) {
    syncFromProps();
    return;
  }

  const now = new Date();
  now.setHours(23, 59, 59, 999);

  // 默认设置为昨日
  startTimeType.value = 'dynamic';
  endTimeType.value = 'dynamic';
  startDaysAgo.value = 1;
  endDaysAgo.value = 1;

  // 计算昨日日期用于显示
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 1);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setHours(23, 59, 59, 999);

  // 设置静态日期（用于日历显示）
  startStaticDate.value = startDate.getTime();
  endStaticDate.value = endDate.getTime();

  // 设置预设范围为昨日
  activePresetRange.value = 'yesterday';

  // 延迟更新，确保组件已完全初始化
  setTimeout(() => {
    updateDateRange();
    emit('presetChange', 'yesterday');
  }, 0);
}

// 监听 props 变化，同步内部状态（不立即执行，因为 initDefaultRange 会处理初始化）
watch([() => props.startTime, () => props.endTime], () => {
  if (props.startTime && props.endTime) {
    syncFromProps();
  }
});

// 处理取消按钮
function handleCancel() {
  emit('cancel');
}

// 处理应用按钮
function handleApply() {
  updateDateRange();
  emit('apply');
}

// 处理开始日期输入框点击（已移除自动切换逻辑，只在用户主动选择动态时间时切换）
function handleStartDateClick() {
  // 不再自动切换到动态时间模式，保持静态时间模式
}

// 处理结束日期输入框点击（已移除自动切换逻辑，只在用户主动选择动态时间时切换）
function handleEndDateClick() {
  // 不再自动切换到动态时间模式，保持静态时间模式
}

// 获取开始日期（用于验证）
function getStartDateValue(): number | null {
  if (startTimeType.value === 'dynamic') {
    return startDynamicDate.value;
  } else {
    return startStaticDate.value;
  }
}

// 获取结束日期（用于验证）
function getEndDateValue(): number | null {
  if (endTimeType.value === 'dynamic') {
    return endDynamicDate.value;
  } else {
    return endStaticDate.value;
  }
}

// 检查开始日期是否应该被禁用（不能晚于结束日期）
function isStartDateDisabled(timestamp: number): boolean {
  const endDate = getEndDateValue();
  if (!endDate) return false;

  const startDateOnly = new Date(timestamp);
  startDateOnly.setHours(0, 0, 0, 0);
  const endDateOnly = new Date(endDate);
  endDateOnly.setHours(0, 0, 0, 0);

  return startDateOnly.getTime() > endDateOnly.getTime();
}

// 检查结束日期是否应该被禁用（不能早于开始日期）
function isEndDateDisabled(timestamp: number): boolean {
  const startDate = getStartDateValue();
  if (!startDate) return false;

  const startDateOnly = new Date(startDate);
  startDateOnly.setHours(0, 0, 0, 0);
  const endDateOnly = new Date(timestamp);
  endDateOnly.setHours(0, 0, 0, 0);

  return endDateOnly.getTime() < startDateOnly.getTime();
}

// 处理开始日期变化，确保结束日期不早于开始日期
function handleStartDateChange(value: number | null) {
  if (value === null) return;

  const endDate = getEndDateValue();
  if (endDate) {
    const startDateOnly = new Date(value);
    startDateOnly.setHours(0, 0, 0, 0);
    const endDateOnly = new Date(endDate);
    endDateOnly.setHours(0, 0, 0, 0);

    // 如果结束日期早于开始日期，自动调整结束日期为开始日期
    if (endDateOnly.getTime() < startDateOnly.getTime()) {
      if (endTimeType.value === 'dynamic') {
        // 计算新的天数
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const newEndDateOnly = new Date(startDateOnly);
        const diffDays = Math.floor((today.getTime() - newEndDateOnly.getTime()) / (24 * 60 * 60 * 1000));
        endDaysAgo.value = Math.max(0, diffDays);
        endStaticDate.value = startDateOnly.getTime();
      } else {
        endStaticDate.value = startDateOnly.getTime();
      }
    }
  }
}

// 处理结束日期变化，确保结束日期不早于开始日期
function handleEndDateChange(value: number | null) {
  if (value === null) return;

  const startDate = getStartDateValue();
  if (startDate) {
    const startDateOnly = new Date(startDate);
    startDateOnly.setHours(0, 0, 0, 0);
    const endDateOnly = new Date(value);
    endDateOnly.setHours(0, 0, 0, 0);

    // 如果结束日期早于开始日期，自动调整结束日期为开始日期
    if (endDateOnly.getTime() < startDateOnly.getTime()) {
      if (endTimeType.value === 'dynamic') {
        // 计算新的天数
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffDays = Math.floor((today.getTime() - startDateOnly.getTime()) / (24 * 60 * 60 * 1000));
        endDaysAgo.value = Math.max(0, diffDays);
        endStaticDate.value = startDateOnly.getTime();
      } else {
        endStaticDate.value = startDateOnly.getTime();
      }
    }
  }
}

// 计算日期范围（用于显示区间阴影）
const dateRangeForHighlight = computed<Record<string, [number, number]> | undefined>(() => {
  const startDate = getStartDateValue();
  const endDate = getEndDateValue();

  if (!startDate || !endDate) {
    return undefined;
  }

  const startDateOnly = new Date(startDate);
  startDateOnly.setHours(0, 0, 0, 0);
  const endDateOnly = new Date(endDate);
  endDateOnly.setHours(0, 0, 0, 0);

  // 如果开始日期晚于结束日期，不显示范围
  if (startDateOnly.getTime() > endDateOnly.getTime()) {
    return undefined;
  }

  // 返回日期范围，用于高亮显示
  const range: Record<string, [number, number]> = {
    '选中区间': [startDateOnly.getTime(), endDateOnly.getTime()]
  };
  return range;
});

// 检查日期是否在范围内
function isDateInRange(timestamp: number): { inRange: boolean; isStart: boolean; isEnd: boolean } {
  const startDate = getStartDateValue();
  const endDate = getEndDateValue();

  if (!startDate || !endDate) {
    return { inRange: false, isStart: false, isEnd: false };
  }

  const dateOnly = new Date(timestamp);
  dateOnly.setHours(0, 0, 0, 0);
  const startDateOnly = new Date(startDate);
  startDateOnly.setHours(0, 0, 0, 0);
  const endDateOnly = new Date(endDate);
  endDateOnly.setHours(0, 0, 0, 0);

  const dateTime = dateOnly.getTime();
  const startTime = startDateOnly.getTime();
  const endTime = endDateOnly.getTime();

  if (dateTime < startTime || dateTime > endTime) {
    return { inRange: false, isStart: false, isEnd: false };
  }

  return {
    inRange: true,
    isStart: dateTime === startTime,
    isEnd: dateTime === endTime
  };
}

// 渲染日期单元格（用于显示区间阴影）
function renderDateCell(timestamp: number) {
  const rangeInfo = isDateInRange(timestamp);

  if (!rangeInfo.inRange) {
    return null;
  }

  const classes: string[] = ['date-range-cell'];
  if (rangeInfo.isStart) {
    classes.push('date-range-start');
  }
  if (rangeInfo.isEnd) {
    classes.push('date-range-end');
  }
  if (rangeInfo.inRange && !rangeInfo.isStart && !rangeInfo.isEnd) {
    classes.push('date-range-middle');
  }

  return {
    class: classes.join(' ')
  };
}

// 初始化
initDefaultRange();
</script>

<template>
  <NCard :bordered="false" size="small" style="min-width: 900px;">
    <template #header>
      <div style="font-weight: 500;">日期范围</div>
      <div style="font-size: 14px; color: var(--n-text-color-2); margin-top: 4px;">
        {{ displayedDetailRange }}
      </div>
    </template>

    <div style="display: flex; gap: 24px; align-items: flex-start;">
      <!-- 左侧：预定义日期范围按钮（垂直列表） -->
      <div style="width: 200px; flex-shrink: 0; position: relative; z-index: 1;">
        <NSpace vertical :size="4">
          <NButton
            size="small"
            block
            :type="activePresetRange === 'yesterday' ? 'primary' : 'default'"
            @click="handlePresetRange('yesterday')"
            style="position: relative; z-index: 10;"
          >
            昨日
          </NButton>
          <NButton
            size="small"
            block
            :type="activePresetRange === 'today' ? 'primary' : 'default'"
            @click="handlePresetRange('today')"
          >
            今日
          </NButton>
          <NButton
            size="small"
            block
            :type="activePresetRange === 'lastWeek' ? 'primary' : 'default'"
            @click="handlePresetRange('lastWeek')"
          >
            上周
          </NButton>
          <NButton
            size="small"
            block
            :type="activePresetRange === 'thisWeek' ? 'primary' : 'default'"
            @click="handlePresetRange('thisWeek')"
          >
            本周
          </NButton>
          <NButton
            size="small"
            block
            :type="activePresetRange === 'lastMonth' ? 'primary' : 'default'"
            @click="handlePresetRange('lastMonth')"
          >
            上月
          </NButton>
          <NButton
            size="small"
            block
            :type="activePresetRange === 'thisMonth' ? 'primary' : 'default'"
            @click="handlePresetRange('thisMonth')"
          >
            本月
          </NButton>
          <NButton
            size="small"
            block
            :type="activePresetRange === 'past7days' ? 'primary' : 'default'"
            @click="handlePresetRange('past7days')"
          >
            过去7天
          </NButton>
          <NButton
            size="small"
            block
            :type="activePresetRange === 'last7days' ? 'primary' : 'default'"
            @click="handlePresetRange('last7days')"
          >
            最近7天
          </NButton>
          <NButton
            size="small"
            block
            :type="activePresetRange === 'past30days' ? 'primary' : 'default'"
            @click="handlePresetRange('past30days')"
          >
            过去30天
          </NButton>
          <NButton
            size="small"
            block
            :type="activePresetRange === 'last30days' ? 'primary' : 'default'"
            @click="handlePresetRange('last30days')"
          >
            最近30天
          </NButton>
        </NSpace>
      </div>

      <!-- 右侧：自定义日期选择 -->
      <div v-if="showCustomDatePicker" style="flex: 1; display: flex; gap: 24px; align-items: flex-start; min-width: 0;">
        <!-- 开始日期 -->
        <div style="flex: 1; min-height: 0;">
          <NSpace vertical :size="12" style="width: 100%;">
            <NButtonGroup v-if="endTimeType !== 'static'" size="small" style="width: 100%;">
              <NButton
                :type="startTimeType === 'dynamic' ? 'default' : 'default'"
                :class="{ 'segmented-active': startTimeType === 'dynamic' }"
                style="flex: 1;"
                @click="startTimeType = 'dynamic'"
              >
                动态时间
              </NButton>
              <NButton
                :type="startTimeType === 'static' ? 'default' : 'default'"
                :class="{ 'segmented-active': startTimeType === 'static' }"
                style="flex: 1;"
                @click="startTimeType = 'static'"
              >
                静态时间
              </NButton>
            </NButtonGroup>
            <NButtonGroup v-else size="small" style="width: 100%;">
              <NButton type="default" disabled style="flex: 1; width: 100%;">
                静态时间
              </NButton>
            </NButtonGroup>

            <!-- 动态时间模式 -->
            <div v-if="startTimeType === 'dynamic'" style="width: 100%;">
              <div style="width: 100%; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <NInputNumber
                  v-model:value="startDaysAgo"
                  :min="0"
                  :max="365"
                  size="small"
                  style="flex: 1;"
                />
                <span style="flex-shrink: 0; white-space: nowrap; color: var(--n-text-color);">天前</span>
              </div>
              <div style="width: 100%; display: inline-block;">
                <NDatePicker
                  v-model:value="startDynamicDate"
                  type="date"
                  :panel="true"
                  clearable
                  format="yyyy-MM-dd"
                  :is-date-disabled="isStartDateDisabled"
                  :ranges="dateRangeForHighlight"
                  :render-cell="renderDateCell"
                  @update:value="handleStartDateChange"
                />
              </div>
            </div>

            <!-- 静态时间模式 -->
            <div v-if="startTimeType === 'static'" style="width: 100%;">
              <div style="width: 100%; margin-bottom: 12px; height: 32px;">
            <NDatePicker
              v-model:value="startStaticDate"
              type="date"
              size="small"
              style="width: 100%;"
              clearable
              format="yyyy-MM-dd"
              :is-date-disabled="isStartDateDisabled"
              @update:value="handleStartDateChange"
            />
              </div>
              <div style="width: 100%; display: inline-block;">
                <NDatePicker
                  v-model:value="startStaticDate"
                  type="date"
                  :panel="true"
                  clearable
                  format="yyyy-MM-dd"
                  :is-date-disabled="isStartDateDisabled"
                  :ranges="dateRangeForHighlight"
                  :render-cell="renderDateCell"
                  @update:value="handleStartDateChange"
                />
              </div>
            </div>
          </NSpace>
        </div>

        <!-- 箭头 -->
        <div style="display: flex; align-items: flex-start; padding-top: 28px; flex-shrink: 0;">
          <span style="font-size: 18px; color: var(--n-text-color-3);">→</span>
        </div>

        <!-- 结束日期 -->
        <div style="flex: 1; min-height: 0;">
          <NSpace vertical :size="12" style="width: 100%;">
            <NButtonGroup size="small" style="width: 100%;">
              <NButton
                :type="endTimeType === 'dynamic' ? 'default' : 'default'"
                :class="{ 'segmented-active': endTimeType === 'dynamic' }"
                style="flex: 1;"
                @click="endTimeType = 'dynamic'"
              >
                动态时间
              </NButton>
              <NButton
                :type="endTimeType === 'static' ? 'default' : 'default'"
                :class="{ 'segmented-active': endTimeType === 'static' }"
                style="flex: 1;"
                @click="endTimeType = 'static'"
              >
                静态时间
              </NButton>
            </NButtonGroup>

            <!-- 动态时间模式 -->
            <div v-if="endTimeType === 'dynamic'" style="width: 100%;">
              <div style="width: 100%; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <NInputNumber
                  v-model:value="endDaysAgo"
                  :min="0"
                  :max="365"
                  size="small"
                  style="flex: 1;"
                />
                <span style="flex-shrink: 0; white-space: nowrap; color: var(--n-text-color);">天前</span>
              </div>
              <div style="width: 100%; display: inline-block;">
                <NDatePicker
                  v-model:value="endDynamicDate"
                  type="date"
                  :panel="true"
                  clearable
                  format="yyyy-MM-dd"
                  :is-date-disabled="isEndDateDisabled"
                  :ranges="dateRangeForHighlight"
                  :render-cell="renderDateCell"
                  @update:value="handleEndDateChange"
                />
              </div>
            </div>

            <!-- 静态时间模式 -->
            <div v-if="endTimeType === 'static'" style="width: 100%;">
              <div style="width: 100%; margin-bottom: 12px; height: 32px;">
            <NDatePicker
              v-model:value="endStaticDate"
              type="date"
              size="small"
              style="width: 100%;"
              clearable
              format="yyyy-MM-dd"
              :is-date-disabled="isEndDateDisabled"
              @update:value="handleEndDateChange"
            />
              </div>
              <div style="width: 100%; display: inline-block;">
                <NDatePicker
                  v-model:value="endStaticDate"
                  type="date"
                  :panel="true"
                  clearable
                  format="yyyy-MM-dd"
                  :is-date-disabled="isEndDateDisabled"
                  :ranges="dateRangeForHighlight"
                  :render-cell="renderDateCell"
                  @update:value="handleEndDateChange"
                />
              </div>
            </div>
          </NSpace>
        </div>
      </div>
    </div>

    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="handleCancel">取消</NButton>
        <NButton type="primary" @click="handleApply">应用</NButton>
      </NSpace>
    </template>
  </NCard>
</template>

<style scoped>
/* 确保按钮可以点击 */
:deep(.n-button) {
  pointer-events: auto !important;
  cursor: pointer !important;
}

/* 分段控件样式 */
:deep(.n-button-group .n-button) {
  background-color: var(--n-color);
  color: var(--n-text-color);
  border-color: var(--n-border-color);
}

:deep(.n-button-group .n-button.segmented-active) {
  background-color: var(--n-color-hover) !important;
  color: var(--n-text-color) !important;
  border-color: var(--n-border-color) !important;
}

/* 区间阴影样式 */
:deep(.n-date-picker-calendar .n-calendar-date.date-range-cell) {
  position: relative;
}

:deep(.n-date-picker-calendar .n-calendar-date.date-range-middle) {
  background-color: rgba(18, 128, 235, 0.1) !important;
}

:deep(.n-date-picker-calendar .n-calendar-date.date-range-start) {
  background-color: #18a058 !important;
  color: #fff !important;
  border-radius: 4px 0 0 4px !important;
}

:deep(.n-date-picker-calendar .n-calendar-date.date-range-end) {
  background-color: #18a058 !important;
  color: #fff !important;
  border-radius: 0 4px 4px 0 !important;
}

:deep(.n-date-picker-calendar .n-calendar-date.date-range-middle:hover) {
  background-color: rgba(18, 128, 235, 0.15) !important;
}

/* 使用 ranges 属性时的样式 */
:deep(.n-date-picker-calendar .n-calendar-date--in-range) {
  background-color: rgba(18, 128, 235, 0.1) !important;
}

:deep(.n-date-picker-calendar .n-calendar-date--range-start) {
  background-color: #18a058 !important;
  color: #fff !important;
  border-radius: 4px 0 0 4px !important;
}

:deep(.n-date-picker-calendar .n-calendar-date--range-end) {
  background-color: #18a058 !important;
  color: #fff !important;
  border-radius: 0 4px 4px 0 !important;
}
</style>
