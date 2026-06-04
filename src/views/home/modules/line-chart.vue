<script setup lang="ts">
import { ref, computed, inject, watch, type Ref, nextTick } from 'vue';
import { useEcharts } from '@/hooks/common/echarts';

defineOptions({
  name: 'LineChart'
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

// 存储所有区服数据
const allServerData = ref<Map<string, TrendData>>(new Map());

// 用户选择的区服列表
const selectedServers = ref<string[]>([]);

// 是否选中"全服总在线"
const isTotalOnlineSelected = ref(false);

// 存储历史数据
const chartData = ref<{
  xaxis: string[];
  series: Map<string, number[]>;
}>({
  xaxis: [],
  series: new Map()
});

// 注入时间范围和共享数据
type TimeRange = '1h' | '24h';
const timeRange = inject<Ref<TimeRange>>('timeRange', ref('1h'));
const homeData = inject<Ref<any>>('homeData', ref(null));

// 服务器颜色配置
const serverColors = [
  '#5B8FF9', '#5AD8A6', '#5D7092', '#F6BD16', '#6F5EF9',
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'
];

function getServerColor(index: number): string {
  return serverColors[index % serverColors.length];
}

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

      params.forEach((param: any) => {
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
}));

// 更新图表显示数据
function updateChartDisplay() {
  if (allServerData.value.size === 0) {
    return; // 数据还未加载
  }

  // 显示所有区服数据，让ECharts的图例功能自动控制显示/隐藏
  chartData.value.series.clear();

  allServerData.value.forEach((server, name) => {
    if (server?.data) {
      chartData.value.series.set(name, [...server.data]);
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
    allServerData.value.clear();
    return;
  }

  // 初始化时间轴
  chartData.value.xaxis = data.xaxis || [];

  // 重置"全服总在线"选中状态
  isTotalOnlineSelected.value = false;

  // 保存所有区服数据到allServerData
  allServerData.value.clear();
  if (data.serverTrend && Array.isArray(data.serverTrend)) {
    data.serverTrend.forEach((trend) => {
      if (trend?.name && trend.data && Array.isArray(trend.data)) {
        allServerData.value.set(trend.name, {
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
  const color = getServerColor(index);
  // 将颜色转换为RGB格式用于渐变
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 91, g: 143, b: 249 };
  };
  const rgb = hexToRgb(color);
  const gradientFrom = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
  const gradientTo = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`;

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
        borderColor: color,
        borderWidth: 2
      }
    },
    lineStyle: {
      width: 2,
      color: color
    },
    itemStyle: {
      color: color,
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
          { offset: 0, color: gradientFrom },
          { offset: 1, color: gradientTo }
        ]
      }
    },
    data,
    z: 1
  };
}

/**
 * 生成系列配置（包含所有区服，但通过 legend.selected 控制显示）
 */
function generateSeries() {
  if (!allServerData.value || !chartData.value.series) {
    return [];
  }

  const allServerNames = Array.from(allServerData.value.keys());
  const seriesNames = Array.from(chartData.value.series.keys());

  return allServerNames.map((name, index) => {
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
  if (!allServerData.value || !chartData.value.series) {
    return;
  }

  updateOptions(opts => {
    const seriesNames = Array.from(chartData.value.series.keys());
    const series = generateSeries();

    // 获取所有区服名称
    const allServerNames = Array.from(allServerData.value.keys());

    // 设置图例数据为所有区服，默认全部选中（让用户可以自由点击控制）
    const legendSelected: Record<string, boolean> = {};
    allServerNames.forEach(name => {
      legendSelected[name] = true; // 默认全部选中
    });

    // @ts-ignore - ECharts 选项类型
    opts.xAxis.data = chartData.value.xaxis;
    // @ts-ignore - ECharts 选项类型
    opts.legend.data = allServerNames;
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
  if (!newData || !newData.serverTrend || !Array.isArray(newData.serverTrend) || !newData.xaxis) {
    return;
  }

  processApiData(newData);
  nextTick(() => {
    updateChartDisplay();
  });
}, { immediate: true });
</script>

<template>
  <div class="card-wrapper">
    <div class="chart-header">
      <div class="chart-title">区服在线人数趋势 Top 10 </div>
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
