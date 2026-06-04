<script setup lang="ts">
import { ref, computed, nextTick, inject, watch, type Ref } from 'vue';
import { useEcharts } from '@/hooks/common/echarts';

defineOptions({
  name: 'ChannelTrafficChart'
});

interface TrendData {
  name: string;
  data: number[];
}

interface HomeDataResponse {
  totalOnline: number;
  channelData: { [key: string]: number };
  topServers: any[];
  serverTrend: TrendData[];
  channelTrend: TrendData[];
  allServerStatus: any[];
  xaxis: string[];
}

interface ApiResponse {
  code: number;
  msg: string | null;
  data: HomeDataResponse;
}

// 存储所有渠道数据
const allChannelData = ref<Map<string, TrendData>>(new Map());

// 存储历史数据（只存储要显示的渠道）
const chartData = ref<{
  xaxis: string[];
  series: Map<string, number[]>;
}>({
  xaxis: [],
  series: new Map()
});

// 常量配置
const MAX_DISPLAY_CHANNELS = 10; // 每次显示的渠道数量
const INIT_DELAY = 200; // 初始化延迟（毫秒）
const TOOLTIP_MAX_DISPLAY = 20; // 提示框最多显示的渠道数

// 注入时间范围和共享数据
type TimeRange = '1h' | '24h';
const timeRange = inject<Ref<TimeRange>>('timeRange', ref('1h'));
const homeData = inject<Ref<any>>('homeData', ref(null));

// 是否选中"全服总在线"
const isTotalOnlineSelected = ref(false);

// 所有渠道的排序列表（按最新值排序）
const sortedChannels = computed(() => {
  if (!allChannelData.value || allChannelData.value.size === 0) {
    return [];
  }

  const allChannels = Array.from(allChannelData.value.values());
  return allChannels
    .filter(channel => channel && channel.data && Array.isArray(channel.data))
    .map(channel => ({
      name: channel.name,
      latestValue: channel.data[channel.data.length - 1] ?? 0,
      data: channel.data
    }))
    .sort((a, b) => b.latestValue - a.latestValue);
});

// 基础颜色配置（参考项目风格）
const baseColors = [
  { r: 24, g: 144, b: 255 },
  { r: 250, g: 84, b: 28 },
  { r: 250, g: 173, b: 20 },
  { r: 82, g: 196, b: 26 },
  { r: 114, g: 46, b: 209 },
  { r: 236, g: 72, b: 153 },
  { r: 0, g: 184, b: 148 },
  { r: 253, g: 126, b: 20 },
  { r: 99, g: 102, b: 241 },
  { r: 239, g: 68, b: 68 },
  { r: 14, g: 165, b: 233 },
  { r: 168, g: 85, b: 247 }
];

// 为每个渠道分配颜色（支持大量渠道）
const channelColorMap = new Map<string, { dark: string; gradientFrom: string; gradientTo: string }>();

// 生成颜色（使用HSL算法，确保颜色区分度）
function generateColor(index: number): { dark: string; gradientFrom: string; gradientTo: string } {
  // 如果索引小于基础颜色数量，使用基础颜色
  if (index < baseColors.length) {
    const base = baseColors[index];
    const dark = `rgb(${base.r}, ${base.g}, ${base.b})`;
    const gradientFrom = `rgba(${base.r}, ${base.g}, ${base.b}, 0.2)`;
    const gradientTo = `rgba(${base.r}, ${base.g}, ${base.b}, 0)`;
    return { dark, gradientFrom, gradientTo };
  }

  // 超出基础颜色数量，使用HSL生成
  const hue = (index * 137.508) % 360; // 使用黄金角度分割
  const saturation = 60 + (index % 3) * 10; // 60-80%
  const lightness = 45 + (index % 4) * 5; // 45-60%

  // HSL转RGB
  const h = hue / 360;
  const s = saturation / 100;
  const l = lightness / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 1/6) {
    r = c; g = x; b = 0;
  } else if (h < 2/6) {
    r = x; g = c; b = 0;
  } else if (h < 3/6) {
    r = 0; g = c; b = x;
  } else if (h < 4/6) {
    r = 0; g = x; b = c;
  } else if (h < 5/6) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  const dark = `rgb(${r}, ${g}, ${b})`;
  const gradientFrom = `rgba(${r}, ${g}, ${b}, 0.2)`;
  const gradientTo = `rgba(${r}, ${g}, ${b}, 0)`;

  return { dark, gradientFrom, gradientTo };
}

function getChannelColor(channelName: string, index: number) {
  if (!channelColorMap.has(channelName)) {
    const color = generateColor(index);
    channelColorMap.set(channelName, color);
  }
  return channelColorMap.get(channelName)!;
}

// 存储 chart 实例引用
let chartInstance: any = null;

const { domRef, updateOptions } = useEcharts(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    triggerOn: 'mousemove',
    enterable: true,
    hideDelay: 100,
    confine: true,
    axisPointer: {
      type: 'line',
      lineStyle: {
        color: 'rgba(0, 0, 0, 0.2)',
        width: 1,
        type: 'dashed'
      }
    },
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    padding: [10, 15],
    textStyle: {
      color: '#333',
      fontSize: 12
    },
    extraCssText: 'box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);',
    formatter(params: any) {
      if (!params?.length) return '';
      let result = `<div style="color:#666;font-size:12px;">${params[0].axisValue}</div><div style="height:8px"></div>`;

      // 按值排序
      params.sort((a: any, b: any) => b.value - a.value);

      // 如果渠道太多，只显示前N个，其他合并显示
      const displayParams = params.slice(0, TOOLTIP_MAX_DISPLAY);
      const hasMore = params.length > TOOLTIP_MAX_DISPLAY;

      displayParams.forEach((param: any) => {
        if (param.value >= 0) {
          result += `<div style="display:flex;justify-content:space-between;margin:6px 0;">
            <span style="width:8px;height:8px;border-radius:50%;background-color:${param.color};margin-right:6px;"></span>
            <span style="flex:1;text-align:left;font-size:13px;">${param.seriesName}:</span>
            <span style="margin-left:15px;font-weight:bold;">${param.value}</span>
          </div>`;
        }
      });

      if (hasMore) {
        const othersCount = params.length - TOOLTIP_MAX_DISPLAY;
        result += `<div style="color:#999;font-size:11px;margin-top:8px;padding-top:8px;border-top:1px solid #eee;">
          还有 ${othersCount} 个渠道未显示
        </div>`;
      }

      return result;
    }
  },
  legend: {
    data: [],
    right: '5%',
    top: 0,
    textStyle: {
      fontSize: 12,
      color: '#666'
    },
    icon: 'circle',
    itemWidth: 8,
    itemHeight: 8,
    itemGap: 15,
    type: 'scroll',
    pageButtonItemGap: 5,
    pageButtonGap: 10,
    pageButtonPosition: 'end',
    pageIconColor: '#666',
    pageIconInactiveColor: '#ccc',
    pageIconSize: 12,
    pageTextStyle: {
      color: '#666',
      fontSize: 11
    }
  },
  grid: {
    top: 50,
    left: '3%',
    right: '3%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: [],
    axisLabel: {
      fontSize: 11,
      color: '#999',
      interval: 'auto'
    },
    axisLine: {
      lineStyle: {
        color: '#eee'
      }
    },
    axisTick: {
      show: false
    },
    splitLine: {
      show: false
    }
  },
  yAxis: {
    type: 'value',
    minInterval: 1,
    splitNumber: 5,
    axisLine: {
      show: false
    },
    axisTick: {
      show: false
    },
    axisLabel: {
      fontSize: 11,
      color: '#999'
    },
    splitLine: {
      lineStyle: {
        color: '#f5f5f5',
        type: 'dashed'
      }
    },
    min: 0
  },
  series: []
}), {
  onRender: (chart) => {
    chartInstance = chart;
  }
});

/**
 * 更新图表显示数据（显示所有渠道数据，由图例控制显示/隐藏）
 */
function updateChartDisplay() {
  if (!allChannelData.value || allChannelData.value.size === 0) {
    return; // 数据还未加载
  }

  // 显示所有渠道数据，让ECharts的图例功能自动控制显示/隐藏
  chartData.value.series.clear();

  allChannelData.value.forEach((channel, name) => {
    if (channel?.data) {
      chartData.value.series.set(name, [...channel.data]);
    }
  });

  renderChart();
}

/**
 * 处理API返回的数据
 */
function processApiData(data: HomeDataResponse | null) {
  if (!data) {
    // Clear data when null
    chartData.value.xaxis = [];
    chartData.value.series.clear();
    allChannelData.value.clear();
    return;
  }

  // 初始化时间轴
  chartData.value.xaxis = data.xaxis || [];

  // 重置"全服总在线"选中状态
  isTotalOnlineSelected.value = false;

  // 保存所有渠道数据到allChannelData
  allChannelData.value.clear();
  if (data.channelTrend && Array.isArray(data.channelTrend)) {
    data.channelTrend.forEach((trend) => {
      if (trend?.name && trend.data && Array.isArray(trend.data)) {
        allChannelData.value.set(trend.name, {
          name: trend.name,
          data: [...trend.data]
        });
      }
    });
  }
}

/**
 * 生成单个系列的配置
 */
function createSeriesConfig(name: string, data: number[], index: number) {
  const color = getChannelColor(name, index);

  return {
    name,
    type: 'line' as const,
    smooth: true,
    showSymbol: false,
    symbol: 'circle' as const,
    symbolSize: 4,
    sampling: 'average' as const,
    emphasis: {
      focus: 'series' as const,
      lineStyle: {
        width: 3
      },
      itemStyle: {
        borderColor: color.dark,
        borderWidth: 2
      }
    },
    lineStyle: {
      width: 2,
      color: color.dark
    },
    itemStyle: {
      color: color.dark,
      borderColor: '#fff',
      borderWidth: 2
    },
    areaStyle: {
      opacity: 0.15,
      color: {
        type: 'linear' as const,
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: color.gradientFrom },
          { offset: 1, color: color.gradientTo }
        ]
      }
    },
    data,
    z: 1
  };
}

/**
 * 生成系列配置（包含所有渠道，但通过 legend.selected 控制显示）
 */
function generateSeries() {
  if (!allChannelData.value || !chartData.value.series) {
    return [];
  }

  const allChannelNames = Array.from(allChannelData.value.keys());
  const seriesNames = Array.from(chartData.value.series.keys());

  return allChannelNames.map((name, index) => {
    const data = seriesNames.includes(name)
      ? (chartData.value.series.get(name) ?? [])
      : [];
    return createSeriesConfig(name, data, index);
  });
}

/**
 * 渲染图表
 * @param withAnimation 是否使用动画
 */
function renderChart(withAnimation = false) {
  if (!allChannelData.value || !chartData.value.series) {
    return;
  }

  updateOptions(opts => {
    const seriesNames = Array.from(chartData.value.series.keys());
    const series = generateSeries();

    // 获取所有渠道名称
    const allChannelNames = Array.from(allChannelData.value.keys());

    // 设置图例数据为所有渠道，默认全部选中（让用户可以自由点击控制）
    const legendSelected: Record<string, boolean> = {};
    allChannelNames.forEach(name => {
      legendSelected[name] = true; // 默认全部选中
    });

    // @ts-ignore - ECharts 选项类型
    opts.xAxis.data = chartData.value.xaxis;
    // @ts-ignore - ECharts 选项类型
    opts.legend.data = allChannelNames;
    // @ts-ignore - ECharts 选项类型
    opts.legend.selected = legendSelected;
    // @ts-ignore - ECharts 选项类型
    opts.series = series;

    if (withAnimation) {
      // @ts-ignore - ECharts 动画选项类型
      opts.animation = true;
      // @ts-ignore - ECharts 动画选项类型
      opts.animationDuration = 1000;
      // @ts-ignore - ECharts 动画选项类型
      opts.animationEasing = 'cubicOut';
    }

    return opts;
  });
}

// 监听父组件提供的数据变化
watch(homeData, (newData) => {
  if (!newData || !newData.channelTrend || !Array.isArray(newData.channelTrend) || !newData.xaxis) {
    return;
  }

  processApiData(newData);
  nextTick(() => {
    setTimeout(() => {
      updateChartDisplay();
    }, INIT_DELAY);
  });
}, { immediate: true });
</script>

<template>
  <div class="card-wrapper">
    <div class="chart-header">
      <div class="chart-title">渠道在线人数趋势 Top 10</div>
    </div>
    <div class="chart-container-wrapper">
      <div ref="domRef" class="chart-container"></div>
    </div>
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
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--n-text-color);
  text-align: center;
}

.chart-container {
  height: 320px;
  overflow: hidden;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .card-wrapper {
    padding: 16px;
  }

  .chart-header {
    margin-bottom: 16px;
  }

  .chart-container {
    height: 280px;
  }
}
</style>

