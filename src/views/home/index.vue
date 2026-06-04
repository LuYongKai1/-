<script setup lang="ts">
import { computed, ref, provide, onMounted, onUnmounted, watch, type Ref } from 'vue';
import { useAppStore } from '@/store/modules/app';
import { fetchGetHomeData, fetchGetRevenueRankingData, fetchGet24HourTrendData } from '@/service/api/system-manage';
import CardData from './modules/card-data.vue';
import ChannelTrafficChart from './modules/channel-traffic-chart.vue';
import LineChart from './modules/line-chart.vue';
import TopRankings from './modules/top-rankings.vue';
import AllServersStatus from './modules/all-servers-status.vue';

defineOptions({
  name: 'HomePage'
});

// ==================== 常量定义 ====================
const REFRESH_INTERVAL = {
  CHART_1H: 60000,      // 1小时图表：1分钟
  CHART_24H: 300000,    // 24小时图表：5分钟
  OTHER_DATA: 60000     // 其他数据：1分钟
} as const;

// ==================== 类型定义 ====================
type TimeRange = '1h' | '24h';

interface ChartData {
  channelTrend: any[];
  serverTrend: any[];
  xaxis: string[];
}

// ==================== 响应式状态 ====================
const appStore = useAppStore();
const gap = computed(() => (appStore.isMobile ? 0 : 16));

// 时间范围
const timeRange = ref<TimeRange>('1h');
const timeRangeOptions = [
  { label: '1小时', value: '1h' as TimeRange },
  { label: '24小时', value: '24h' as TimeRange }
];

// 数据状态
const homeData = ref<any>(null);
const revenueData = ref<any>(null);

// 加载状态
const isLoadingChart = ref(false);
const isLoadingOther = ref(false);

// 批量更新标志 - 用于避免多次渲染
const isBatchUpdating = ref(false);

// 定时器
const chartTimer = ref<NodeJS.Timeout | null>(null);
const otherDataTimer = ref<NodeJS.Timeout | null>(null);

// 刷新间隔
const chartUpdateInterval = computed(() =>
  timeRange.value === '24h' ? REFRESH_INTERVAL.CHART_24H : REFRESH_INTERVAL.CHART_1H
);

// ==================== Provide 数据 ====================
provide('timeRange', timeRange);
provide('homeData', homeData);
provide('revenueData', revenueData);

// ==================== 工具函数 ====================
/**
 * 验证图表数据结构
 */
function validateChartData(data: any): data is ChartData {
  if (!data?.channelTrend || !data?.serverTrend || !data?.xaxis) {
    return false;
  }

  if (!Array.isArray(data.channelTrend) || !Array.isArray(data.serverTrend)) {
    return false;
  }

  return true;
}

/**
 * 处理API响应
 */
function handleApiResponse<T>(result: any): T | null {
  if (result?.code === 200 && result.data) {
    return result.data;
  }
  if (result?.data) {
    return result.data;
  }
  return null;
}

// ==================== API 调用函数 ====================
/**
 * 获取1小时完整数据（包含卡片、服务器状态、图表等）
 * @param preserveChartData - 是否保留现有图表数据（24小时模式下使用）
 * @param skipUpdate - 是否跳过立即更新（批量更新时使用）
 */
async function fetchHomeDataApi(preserveChartData = false, skipUpdate = false) {
  if (isLoadingChart.value && !skipUpdate) return;

  if (!skipUpdate) isLoadingChart.value = true;

  try {
    const result = await fetchGetHomeData({});
    const data = handleApiResponse(result);

    if (data) {
      if (skipUpdate) {
        // 批量更新模式：返回数据，不立即更新
        return data;
      }

      if (preserveChartData && homeData.value) {
        // 24小时模式下，只更新非图表数据，保留24小时图表数据
        homeData.value = {
          ...data,
          channelTrend: homeData.value.channelTrend,
          serverTrend: homeData.value.serverTrend,
          xaxis: homeData.value.xaxis
        };
      } else {
        // 1小时模式下，直接更新所有数据
        homeData.value = data;
      }
    }
    return data;
  } catch (error) {
    // 静默处理错误
    return null;
  } finally {
    if (!skipUpdate) isLoadingChart.value = false;
  }
}

/**
 * 获取24小时图表数据（仅更新图表部分，保留卡片等其他数据）
 */
async function fetch24HourChartDataApi() {
  if (isLoadingChart.value) return;

  isLoadingChart.value = true;
  try {
    const result = await fetchGet24HourTrendData({});
    const data = handleApiResponse(result);

    if (!data) return;

    // 验证图表数据结构
    if (!validateChartData(data)) return;

    // 只更新图表相关的数据，保留卡片、服务器状态等其他数据
    if (homeData.value) {
      homeData.value = {
        ...homeData.value,
        channelTrend: data.channelTrend,
        serverTrend: data.serverTrend,
        xaxis: data.xaxis
      };
    } else {
      // 如果 homeData 为空（首次加载），则直接赋值
      homeData.value = data;
    }
  } catch (error) {
    // 静默处理错误
  } finally {
    isLoadingChart.value = false;
  }
}

/**
 * 获取营收排行数据
 * @param skipUpdate - 是否跳过立即更新（批量更新时使用）
 */
async function fetchRevenueDataApi(skipUpdate = false) {
  if (isLoadingOther.value && !skipUpdate) return;

  if (!skipUpdate) isLoadingOther.value = true;

  try {
    const result = await fetchGetRevenueRankingData({});
    const data = handleApiResponse(result);

    if (data) {
      if (skipUpdate) {
        // 批量更新模式：返回数据，不立即更新
        return data;
      }
      revenueData.value = data;
    }
    return data;
  } catch (error) {
    // 静默处理错误
    return null;
  } finally {
    if (!skipUpdate) isLoadingOther.value = false;
  }
}

/**
 * 批量刷新所有数据（避免多次渲染）
 */
async function refreshAllData() {
  isBatchUpdating.value = true;

  try {
    // 并行请求两个接口
    const [homeResult, revenueResult] = await Promise.all([
      fetchHomeDataApi(false, true),
      fetchRevenueDataApi(true)
    ]);

    // 等两个接口都完成后，一次性更新数据
    if (homeResult) {
      homeData.value = homeResult;
    }
    if (revenueResult) {
      revenueData.value = revenueResult;
    }
  } finally {
    isBatchUpdating.value = false;
  }
}

// ==================== 定时器管理 ====================
/**
 * 停止指定定时器
 */
function clearTimer(timer: Ref<NodeJS.Timeout | null>) {
  if (timer.value) {
    clearInterval(timer.value);
    timer.value = null;
  }
}

/**
 * 启动图表数据定时器
 */
function startChartTimer() {
  clearTimer(chartTimer);

  // 根据时间范围选择对应的刷新函数
  const fetchFunction = timeRange.value === '24h'
    ? fetch24HourChartDataApi
    : () => fetchHomeDataApi(false); // 1小时模式：更新所有数据
  const interval = chartUpdateInterval.value;

  chartTimer.value = setInterval(fetchFunction, interval);
}

/**
 * 启动其他数据定时器（1小时完整数据 + 营收数据）
 */
function startOtherDataTimer() {
  clearTimer(otherDataTimer);

  otherDataTimer.value = setInterval(async () => {
    const preserveChart = timeRange.value === '24h';

    // 批量更新，避免卡片闪烁
    isBatchUpdating.value = true;
    try {
      const [homeResult, revenueResult] = await Promise.all([
        fetchHomeDataApi(preserveChart, true),
        fetchRevenueDataApi(true)
      ]);

      // 一次性更新数据
      if (homeResult) {
        if (preserveChart && homeData.value) {
          homeData.value = {
            ...homeResult,
            channelTrend: homeData.value.channelTrend,
            serverTrend: homeData.value.serverTrend,
            xaxis: homeData.value.xaxis
          };
        } else {
          homeData.value = homeResult;
        }
      }
      if (revenueResult) {
        revenueData.value = revenueResult;
      }
    } finally {
      isBatchUpdating.value = false;
    }
  }, REFRESH_INTERVAL.OTHER_DATA);
}

/**
 * 停止所有定时器
 */
function stopAllTimers() {
  clearTimer(chartTimer);
  clearTimer(otherDataTimer);
}

// ==================== 生命周期和监听 ====================
/**
 * 监听时间范围切换
 */
watch(timeRange, async (newValue, oldValue) => {
  if (newValue === oldValue || oldValue === undefined) return;

  // 停止所有定时器
  stopAllTimers();

  // 根据时间范围加载对应数据
  if (newValue === '24h') {
    // 24小时模式：只加载24小时图表数据，保持卡片数据不变（避免重复渲染）
    // 卡片数据会在定时器中更新
    await fetch24HourChartDataApi();
  } else {
    // 1小时模式：批量加载数据，避免卡片闪烁
    await refreshAllData();
  }

  // 重启定时器
  startChartTimer();
  startOtherDataTimer();
}, { flush: 'post' });

/**
 * 组件挂载
 */
onMounted(async () => {
  // 初始加载数据（批量更新，避免卡片闪烁）
  await refreshAllData();

  // 启动定时刷新
  startChartTimer();
  startOtherDataTimer();
});

/**
 * 组件卸载
 */
onUnmounted(() => {
  stopAllTimers();
});
</script>

<template>
  <NSpace vertical :size="16">
    <!-- 顶部统计卡片 -->
    <CardData />

    <!-- 时间范围切换按钮 -->
    <NCard :bordered="false" class="card-wrapper">
      <div class="time-range-selector">
        <span class="time-range-label">数据时间范围：</span>
        <NRadioGroup v-model:value="timeRange">
          <NRadioButton
            v-for="option in timeRangeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </NRadioButton>
        </NRadioGroup>
      </div>
    </NCard>

    <!-- 第二行：左侧图表 + 右侧排行榜 -->
    <NGrid :x-gap="gap" :y-gap="16" cols="1 s:1 m:1 l:4" responsive="screen" item-responsive>
      <!-- 左侧：渠道流量图 + 区服趋势图（垂直排列） -->
      <NGi span="1 s:1 m:1 l:3">
        <NSpace vertical :size="16">
          <!-- 渠道流量图 -->
          <NCard :bordered="false" class="card-wrapper">
            <ChannelTrafficChart />
          </NCard>

          <!-- 区服趋势图 -->
          <NCard :bordered="false" class="card-wrapper">
            <LineChart />
          </NCard>
        </NSpace>
      </NGi>

      <!-- 右侧：Top排行榜 -->
      <NGi span="1 s:1 m:1 l:1">
        <TopRankings />
      </NGi>
    </NGrid>

    <!-- 第三行：全部服务器状态 -->
    <AllServersStatus />
  </NSpace>
</template>

<style scoped>
.time-range-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.time-range-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}
</style>
