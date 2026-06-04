<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { $t } from '@/locales';
import { useEcharts } from '@/hooks/common/echarts';
// import { fetchGetChannelLineChartData } from '@/service/api/system-manage';
import { fetchGetServerList } from '@/service/api';
import { NSelect, NSpin } from 'naive-ui';
import type { SelectOption, SelectGroupOption } from "naive-ui";


defineOptions({ name: 'LineChart' });

interface TrendPoint {
  online: number;
  time: string;
  day: string;
}

interface ChannelData {
  trend: TrendPoint[];
  channelId: string;
  channelName: string;
}

interface ServerResponse {
  channels: ChannelData[];
  serverId: number;
  serverName: string;
}

// 状态管理
const hasError = ref(false);
const loading = ref(false);
const serverOptions = ref<(SelectOption | SelectGroupOption)[]>([]);
const selectedServerId = ref<string | number | null>("");
const loadingServerList = ref(false);
const timeRange = ref<'1h' | '24h'>('1h');
const fullData = ref<ServerResponse | null>(null);

// 定时器
let refreshTimer: number | null = null;

// 验证频道数据结构
const validateChannelData = (data: any): boolean => {
  if (!data) {
    return false;
  }

  if (!data.channels || !Array.isArray(data.channels)) {
    return false;
  }

  if (data.channels.length === 0) {
    return false;
  }

  // 检查每个频道的数据
  const validChannels = data.channels.filter((channel: any, index: number) => {
    if (!channel) {
      return false;
    }

    if (!Array.isArray(channel.trend)) {
      return false;
    }

    if (channel.trend.length === 0) {
      return false;
    }

    return true;
  });

  return validChannels.length > 0;
};

// 过滤最近一小时数据
const filterLastHourData = (data: ServerResponse | null): ServerResponse | null => {
  if (!data?.channels?.length) {
    return data;
  }

  const filtered = {
    ...data,
    channels: data.channels.map(channel => {
      const filteredTrend = channel.trend.slice(-60); // 最多保留60个数据点

      return {
        ...channel,
        trend: filteredTrend
      };
    })
  };

  return filtered;
};

// 处理数据中的异常0值和缺失数据
const processDataPoints = (trend: TrendPoint[]): TrendPoint[] => {
  if (!trend || trend.length === 0) return trend;

  const processed = trend.map((point, index) => {
    const currentOnline = point.online;

    // 如果当前值为0，尝试用前后值进行处理
    if (currentOnline === 0 && index > 0 && index < trend.length - 1) {
      const prevOnline = trend[index - 1]?.online || 0;

      // 如果前一个值不为0，而当前为0，检查是否是数据断点
      if (prevOnline > 0) {
        // 查找下一个非0值
        let nextNonZeroIndex = -1;
        let nextNonZeroValue = 0;

        for (let i = index + 1; i < trend.length; i++) {
          if (trend[i].online > 0) {
            nextNonZeroIndex = i;
            nextNonZeroValue = trend[i].online;
            break;
          }
        }

        // 如果找到了下一个非0值，且距离不太远（小于5个点），进行插值
        if (nextNonZeroIndex !== -1 && (nextNonZeroIndex - index) <= 5) {
          const interpolatedValue = Math.round((prevOnline + nextNonZeroValue) / 2);

          return {
            ...point,
            online: interpolatedValue
          };
        }

        // 如果没有找到后续非0值，保持前一个值的一半（模拟逐渐下降）
        if (nextNonZeroIndex === -1) {
          const maintainedValue = Math.max(1, Math.round(prevOnline * 0.8));

          return {
            ...point,
            online: maintainedValue
          };
        }
      }
    }

    return point;
  });

  // 检查最后几个数据点是否突然变为0
  const lastFewPoints = 3;
  const endIndex = processed.length - 1;

  if (processed.length >= lastFewPoints) {
    let hasRecentZeros = false;
    let lastNonZeroValue = 0;
    let lastNonZeroIndex = -1;

    // 找到最后一个非0值
    for (let i = endIndex; i >= 0; i--) {
      if (processed[i].online > 0) {
        lastNonZeroValue = processed[i].online;
        lastNonZeroIndex = i;
        break;
      }
    }

    // 检查最后几个点是否都是0
    for (let i = Math.max(0, endIndex - lastFewPoints + 1); i <= endIndex; i++) {
      if (processed[i].online === 0) {
        hasRecentZeros = true;
        break;
      }
    }

    // 如果最后几个点都是0，且之前有正常数据，可能是数据延迟问题
    if (hasRecentZeros && lastNonZeroValue > 0 && lastNonZeroIndex < endIndex - 1) {
      // 对于最后的0值点，使用最后一个有效值的递减序列
      for (let i = lastNonZeroIndex + 1; i <= endIndex; i++) {
        if (processed[i].online === 0) {
          const decayFactor = 0.9 - (i - lastNonZeroIndex) * 0.1;
          const maintainedValue = Math.max(1, Math.round(lastNonZeroValue * Math.max(0.1, decayFactor)));

          processed[i] = {
            ...processed[i],
            online: maintainedValue
          };
        }
      }
    }
  }

  return processed;
};

// 频道颜色配置
const channelColors = [
  { dark: 'rgb(24, 144, 255)', gradientFrom: 'rgba(24, 144, 255, 0.3)', gradientTo: 'rgba(24, 144, 255, 0)' },
  { dark: 'rgb(250, 84, 28)', gradientFrom: 'rgba(250, 84, 28, 0.3)', gradientTo: 'rgba(250, 84, 28, 0)' },
  { dark: 'rgb(250, 173, 20)', gradientFrom: 'rgba(250, 173, 20, 0.3)', gradientTo: 'rgba(250, 173, 20, 0)' },
  { dark: 'rgb(82, 196, 26)', gradientFrom: 'rgba(82, 196, 26, 0.3)', gradientTo: 'rgba(82, 196, 26, 0)' },
  { dark: 'rgb(114, 46, 209)', gradientFrom: 'rgba(114, 46, 209, 0.3)', gradientTo: 'rgba(114, 46, 209, 0)' }
];

// ECharts 配置
const { domRef, updateOptions } = useEcharts(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'line', lineStyle: { color: 'rgba(0, 0, 0, 0.2)', width: 1, type: 'dashed' } },
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    padding: [10, 15],
    textStyle: { color: '#333' },
    extraCssText: 'box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);',
    formatter(params: any) {
      if (!params?.length) return '';

      let result = `<div style="color:#666;font-size:12px;">${params[0].axisValue}</div><div style="height:8px"></div>`;
      params.sort((a: any, b: any) => b.value - a.value);

      params.forEach((param: any) => {
        // 显示所有频道数据，包括值为0的频道
        if (param.value >= 0) {
          result += `<div style="display:flex;justify-content:space-between;margin:6px 0;">
            <span style="width:8px;height:8px;border-radius:50%;background-color:${param.color};margin-right:6px;"></span>
            <span style="flex:1;text-align:left;font-size:13px;">${param.seriesName}:</span>
            <span style="margin-left:15px;font-weight:bold;">${param.value}</span>
          </div>`;
        }
      });
      return result;
    }
  },
  legend: {
    data: [],
    right: '5%',
    top: 0,
    textStyle: { fontSize: 12, color: '#666' },
    icon: 'circle',
    itemWidth: 8,
    itemHeight: 8,
    itemGap: 20
  },
  grid: { top: 50, left: '3%', right: '3%', bottom: '3%', containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: [],
    axisLabel: { formatter: (value: string) => value.split(' ').pop() ?? value, fontSize: 10, color: '#999' },
    axisLine: { lineStyle: { color: '#eee' } },
    axisTick: { show: false },
    splitLine: { show: false }
  },
  yAxis: {
    type: 'value',
    minInterval: 1,
    splitNumber: 5,
    nameTextStyle: { fontSize: 12, color: '#999' },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { fontSize: 10, color: '#999' },
    splitLine: { lineStyle: { color: '#f5f5f5', type: 'dashed' } },
    max: undefined,
    min: 0
  },
  series: []
}));

// 请求数据
const fetchData = async () => {
  hasError.value = false;
  loading.value = true;

  try {
    // const res = await fetchGetChannelLineChartData(selectedServerId.value || undefined);

    // 尝试解析响应数据
    const responseData = res?.data || res?.response?.data || res?.response || res;

    if (validateChannelData(responseData)) {
      fullData.value = responseData;

      // 检查数据中是否所有值都为0
      const allZero = responseData.channels.every((channel: any) =>
        channel.trend.every((point: any) => point.online === 0)
      );

      await nextTick();
      processChartData();
    } else {
      hasError.value = true;
    }
  } catch (error) {
    hasError.value = true;
  } finally {
    loading.value = false;
  }
};

// 修改处理图表数据函数，使用数据处理
const processChartData = () => {
  const data = timeRange.value === '1h' ? filterLastHourData(fullData.value) : fullData.value;

  if (!data?.channels?.length) {
    hasError.value = true;
    return;
  }

  setTimeout(() => {
    updateOptions(opts => {
      try {
        const firstChannel = data.channels[0];
        if (!firstChannel?.trend?.length) {
          hasError.value = true;
          return opts;
        }

        const timePoints = firstChannel.trend.map(t => t.time);

        // 创建系列数据，应用数据处理
        const series = data.channels.map((channel, index) => {
          const color = channelColors[index % channelColors.length];
          const channelName = channel.channelName || channel.channelId || `频道${index + 1}`;

          // 应用数据处理
          const processedTrend = processDataPoints(channel.trend);
          const onlineData = processedTrend.map(p => p.online);

          return {
            name: `${channelName}`,
            type: 'line',
            smooth: true,
            showSymbol: timeRange.value === '1h',
            symbolSize: 4,
            sampling: timeRange.value === '24h' ? 'average' : undefined,
            emphasis: {
              focus: 'series',
              lineStyle: { width: 3 },
              itemStyle: { borderColor: color.dark, borderWidth: 2 }
            },
            lineStyle: { width: 2, color: color.dark },
            itemStyle: { color: color.dark, borderColor: '#fff', borderWidth: 2 },
            areaStyle: {
              opacity: timeRange.value === '1h' ? 0.12 : 0.05,
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: color.gradientFrom },
                  { offset: 1, color: color.gradientTo }
                ]
              }
            },
            data: onlineData,
            z: 1
          };
        });

        // 更新配置
        (opts.xAxis as any).data = timePoints;
        (opts.xAxis as any).axisLabel.interval = Math.floor(timePoints.length / (timeRange.value === '1h' ? 6 : 8));
        (opts.legend as any).data = data.channels.map((c, index) => {
          const channelName = c.channelName || c.channelId || `频道${index + 1}`;
          return `${channelName}`;
        });

        const allValues = series.flatMap(s => s.data.filter(v => typeof v === 'number' && !isNaN(v) && v > 0));
        const maxY = allValues.length > 0 ? Math.max(...allValues, 10) : 10;

        (opts.yAxis as any).max = Math.ceil(maxY * 1.25 / 10) * 10;
        (opts.yAxis as any).min = 0;
        (opts.series as any) = series;

        return opts;
      } catch (err) {
        hasError.value = true;
        return opts;
      }
    });
  }, 200);
};

// 加载服务器列表
const loadServerData = async () => {
  loadingServerList.value = true;
  try {
    const responseWrapper = await fetchGetServerList();
    const allOption = { value: "", label: "全部服务器" };
    let formattedOptions: (SelectOption | SelectGroupOption)[] = [allOption];

    if (responseWrapper?.response?.data && Array.isArray(responseWrapper.response.data)) {
      const serverGroups = responseWrapper.response.data.map((group: any) => ({
        type: "group" as const,
        label: group.groupName || `Group ${group.id}`,
        key: group.id,
        children: group.serverItems?.map((server: any) => ({
          value: server.serverId,
          label: `${server.serverId}-${server.serverName || 'Unknown'}`
        })) || []
      }));
      formattedOptions = [...formattedOptions, ...serverGroups];
    }
    serverOptions.value = formattedOptions;

    // 自动选择第一个有数据的服务器
    await autoSelectServerWithData();
  } catch (err) {
    serverOptions.value = [{ value: "", label: "全部服务器" }];
  } finally {
    loadingServerList.value = false;
  }
};

// 自动选择有数据的服务器
const autoSelectServerWithData = async () => {
  if (selectedServerId.value && selectedServerId.value !== "") {
    // 如果已经选择了服务器，先尝试当前选择的服务器
    return;
  }

  // 优化：不再遍历所有服务器查找有数据的服务器
  // 直接使用默认值（空字符串，表示"全部服务器"）
  selectedServerId.value = "";
  // 手动调用一次数据获取
  await fetchData();
};

// 初始化
const init = async () => {
  try {
    await loadServerData();
    // loadServerData 中已经包含了自动选择服务器和获取数据的逻辑
    // 所以不需要再次调用 fetchData()
  } catch (error) {
    hasError.value = true;
  }
};

// 生命周期
onMounted(() => {
  init();
  refreshTimer = window.setInterval(() => {
    if (!loading.value) fetchData();
  }, 60000);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
});

// 监听器 - 用户手动选择服务器时重新获取数据
watch(selectedServerId, (newServerId, oldServerId) => {
  // 避免初始化时的重复请求
  if (oldServerId !== undefined) {
    fetchData();
  }
});

// 导出方法
const toggleTimeRange = (range: '1h' | '24h') => {
  timeRange.value = range;
  processChartData();
};

const refreshData = () => fetchData();
</script>

<template>
  <div class="card-wrapper">
    <div class="chart-header">
      <div class="header-controls-left">
        <div class="server-selector-container">
          <NSelect
            v-model:value="selectedServerId"
            :options="serverOptions"
            :loading="loadingServerList"
            placeholder="选择服务器"
            size="small"
            style="width: 160px;"
            filterable
          />
        </div>

        <div class="time-selector">
          <div class="tabs">
            <div
              class="tab-item"
              :class="{ active: timeRange === '1h' }"
              @click="toggleTimeRange('1h')"
            >
              {{ $t('common.realTime') }}
            </div>
            <div
              class="tab-item"
              :class="{ active: timeRange === '24h' }"
              @click="toggleTimeRange('24h')"
            >
              {{ $t('common.history') }}
            </div>
            <div class="refresh-icon" @click="refreshData">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 0 1-9 9"></path>
                <path d="M3 12a9 9 0 0 1 9-9"></path>
                <path d="M21 12a9 9 0 0 0-9 9"></path>
                <path d="M3 12a9 9 0 0 0 9-9"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div class="chart-title">{{ $t('page.home.channelOnline') }}</div>
    </div>

    <!-- <NSpin :show="loading"> -->
      <div ref="domRef" class="chart-container"></div>
      <!-- <template #description>
        <span v-if="hasError" class="error-text">数据加载失败，请检查网络连接或重试</span>
        <span v-else>正在加载图表数据...</span>
      </template> -->
    <!-- </NSpin> -->
  </div>
</template>

<style scoped>
.card-wrapper {
  background-color: var(--n-card-color);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 16px;
  position: relative;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  position: relative;
  padding-top: 10px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: -5px;
  z-index: 1;
}

.header-controls-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.time-selector {
  display: flex;
  align-items: center;
}

.tabs {
  display: flex;
  position: relative;
  align-items: center;
  height: 32px;
}

.tab-item {
  padding: 0 12px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  margin-right: 16px;
  transition: all 0.3s;
  border-radius: 16px;
  line-height: 26px;
}

.tab-item:hover {
  color: #1890ff;
  background-color: rgba(24, 144, 255, 0.05);
}

.tab-item.active {
  color: #1890ff;
  font-weight: 500;
  background-color: rgba(24, 144, 255, 0.1);
}

.refresh-icon {
  cursor: pointer;
  color: #8c8c8c;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
}

.refresh-icon:hover {
  color: #1890ff;
  background-color: rgba(24, 144, 255, 0.1);
}

.chart-container {
  height: 320px;
  overflow: hidden;
}

.server-selector-container {
  display: flex;
  align-items: center;
}

.error-text {
  color: #f5222d;
}
</style>
