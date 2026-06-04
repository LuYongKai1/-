<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { $t } from '@/locales';
import { useEcharts } from '@/hooks/common/echarts';
import { fetchGetLevelDistributionChartData } from '@/service/api/system-manage';
import { fetchGetServerList } from '@/service/api';
import { NSelect, NSpin } from 'naive-ui';
import type { SelectOption, SelectGroupOption } from "naive-ui";

defineOptions({ name: 'Levelstatschart' });

interface TrendPoint {
  count: number;
  time: string;
  day: string;
}

interface LevelData {
  level: number;
  trend: TrendPoint[];
}

interface ServerResponse {
  levels: LevelData[];
  serverId: number;
  serverName: string;
}

// 状态管理
const hasError = ref(false);
const loading = ref(false);
const serverOptions = ref<(SelectOption | SelectGroupOption)[]>([]);
const selectedServerId = ref<string | number | null>("");
const loadingServerList = ref(false);
const fullData = ref<ServerResponse | null>(null);

// 添加时间范围状态
const timeRange = ref<'1h' | '24h'>('1h');

// 添加时间区间选择相关状态
const startTimeIndex = ref<number>(0);
const endTimeIndex = ref<number>(0);
const availableTimePoints = ref<string[]>([]);
const currentSelectedTime = ref<string>('');

// 计算滑动条进度百分比
const startSliderProgress = computed(() => {
  if (availableTimePoints.value.length <= 1) return 0;
  return (startTimeIndex.value / (availableTimePoints.value.length - 1)) * 100;
});

const endSliderProgress = computed(() => {
  if (availableTimePoints.value.length <= 1) return 100;
  return (endTimeIndex.value / (availableTimePoints.value.length - 1)) * 100;
});

// 计算选中的时间区间文本
const selectedTimeRange = computed(() => {
  if (availableTimePoints.value.length === 0) return '';
  const startTime = availableTimePoints.value[startTimeIndex.value]?.split(' ').pop() || '';
  const endTime = availableTimePoints.value[endTimeIndex.value]?.split(' ').pop() || '';
  return startTime === endTime ? startTime : `${startTime} - ${endTime}`;
});

// 定时器
let refreshTimer: number | null = null;

// 频道颜色配置
const levelColors = [
  { color: 'rgb(24, 144, 255)', gradientFrom: 'rgba(24, 144, 255, 0.3)', gradientTo: 'rgba(24, 144, 255, 0)' },
  { color: 'rgb(250, 84, 28)', gradientFrom: 'rgba(250, 84, 28, 0.3)', gradientTo: 'rgba(250, 84, 28, 0)' },
  { color: 'rgb(250, 173, 20)', gradientFrom: 'rgba(250, 173, 20, 0.3)', gradientTo: 'rgba(250, 173, 20, 0)' },
  { color: 'rgb(82, 196, 26)', gradientFrom: 'rgba(82, 196, 26, 0.3)', gradientTo: 'rgba(82, 196, 26, 0)' },
  { color: 'rgb(114, 46, 209)', gradientFrom: 'rgba(114, 46, 209, 0.3)', gradientTo: 'rgba(114, 46, 209, 0)' },
  { color: 'rgb(235, 47, 150)', gradientFrom: 'rgba(235, 47, 150, 0.3)', gradientTo: 'rgba(235, 47, 150, 0)' },
  { color: 'rgb(64, 169, 255)', gradientFrom: 'rgba(64, 169, 255, 0.3)', gradientTo: 'rgba(64, 169, 255, 0)' },
  { color: 'rgb(87, 96, 111)', gradientFrom: 'rgba(87, 96, 111, 0.3)', gradientTo: 'rgba(87, 96, 111, 0)' }
];

// 验证等级数据结构 - 确保有有效数据
const validateLevelData = (data: any): boolean => {
  return data &&
         data.levels &&
         Array.isArray(data.levels) &&
         data.levels.length > 0;
};

// ECharts 配置
const { domRef, updateOptions } = useEcharts(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    show: true,
    confine: true,
    axisPointer: {
      type: 'line',
      lineStyle: {
        color: 'rgba(0, 0, 0, 0.2)',
        width: 1,
        type: 'dashed'
      }
    },
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: '#e8e8e8',
    borderWidth: 1,
    borderRadius: 8,
    padding: [12, 16],
    textStyle: {
      color: '#333',
      fontSize: 13
    },
    extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); max-width: 400px; min-width: 250px;',
    formatter(params: any) {
      try {
        if (!params || !Array.isArray(params) || params.length === 0) {
          return '<div style="color:#666;font-size:12px;">暂无数据</div>';
        }

        const levelValue = params[0]?.axisValue || '未知等级';
        const count = params[0]?.value || 0;

        let result = `<div style="color:#666;font-size:12px;margin-bottom:8px;font-weight:500;">时间: ${currentSelectedTime.value}</div>`;

        const dataType = startTimeIndex.value === endTimeIndex.value ? '时点人数' : '平均人数';

        result += `<div style="display:flex;align-items:center;justify-content:space-between;margin:4px 0;min-height:20px;">
          <div style="display:flex;align-items:center;">
            <span style="width:8px;height:8px;border-radius:50%;background-color:#1890ff;margin-right:8px;flex-shrink:0;"></span>
            <span style="font-size:13px;color:#333;font-weight:500;">${levelValue}</span>
          </div>
          <span style="margin-left:20px;font-weight:bold;color:#1890ff;font-size:14px;">${count} 人</span>
        </div>`;

        result += `<div style="margin-top:8px;padding-top:6px;border-top:1px solid #f0f0f0;font-size:11px;color:#999;">${dataType}</div>`;

        return result;
      } catch (error) {
        return '<div style="color:#f5222d;font-size:12px;">数据显示异常</div>';
      }
    }
  },
  legend: {
    data: [],
    right: '5%',
    top: 10,
    textStyle: { fontSize: 12, color: '#666' },
    icon: 'circle',
    itemWidth: 8,
    itemHeight: 8,
    itemGap: 15
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '8%',
    top: '15%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: [],
    axisLabel: {
      color: '#666',
      fontSize: 12
    },
    axisLine: {
      lineStyle: {
        color: '#e6e6e6'
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
    name: '在线人数',
    nameTextStyle: {
      color: '#666',
      fontSize: 12
    },
    axisLabel: {
      color: '#666',
      fontSize: 12,
      formatter: (value: number) => {
        if (value >= 1000) {
          return (value / 1000).toFixed(1) + 'k';
        }
        return value.toString();
      }
    },
    axisLine: {
      show: false
    },
    axisTick: {
      show: false
    },
    splitLine: {
      lineStyle: {
        color: '#f0f0f0',
        type: 'dashed'
      }
    },
    min: 0
  },
  series: []
}));

// 过滤最近一小时数据
const filterLastHourData = (data: ServerResponse | null): ServerResponse | null => {
  if (!data?.levels?.length) return data;

  return {
    ...data,
    levels: data.levels.map(level => ({
      ...level,
      trend: level.trend.slice(-60) // 最多保留60个数据点
    }))
  };
};

// 请求数据
const fetchData = async () => {
  hasError.value = false;
  loading.value = true;

  try {
    const serverId = selectedServerId.value && selectedServerId.value !== "" ? Number(selectedServerId.value) : null;

    if (serverId === null) {
      hasError.value = true;
      return;
    }

        // 获取所有等级的数据
    const res = await fetchGetLevelDistributionChartData(serverId);

    const responseData = res?.data || res?.response?.data || res?.response || res;

    if (validateLevelData(responseData)) {
      fullData.value = responseData;
      await nextTick();
      processChartData();
    } else {
      // 当没有数据时，清空之前的数据并显示错误状态
      fullData.value = null;
      hasError.value = true;
    }
  } catch (error) {
    hasError.value = true;
  } finally {
    loading.value = false;
  }
};

// 处理图表数据
const processChartData = () => {
  // 根据时间范围过滤数据
  const data = timeRange.value === '1h' ? filterLastHourData(fullData.value) : fullData.value;

  if (!data) {
    hasError.value = true;
    return;
  }

  try {
    if (data.levels && Array.isArray(data.levels)) {

      // 服务端数据按等级数字排序
      const filteredLevels = data.levels.sort((a: any, b: any) => {
        const levelA = a.level || 0;
        const levelB = b.level || 0;
        return levelA - levelB;
      });

      if (filteredLevels.length === 0) {
        hasError.value = true;
        return;
      }

      // 收集所有时间点
      const allTimePoints = new Set<string>();
      filteredLevels.forEach((levelData: any) => {
        if (levelData.trend && Array.isArray(levelData.trend)) {
          levelData.trend.forEach((trendItem: any) => {
            if (trendItem.time) {
              allTimePoints.add(trendItem.time);
            }
          });
        }
      });

      const timePoints = Array.from(allTimePoints).sort();
      availableTimePoints.value = timePoints;

      if (timePoints.length === 0) {
        hasError.value = true;
        return;
      }

      // 确保选择的时间索引有效
      if (startTimeIndex.value >= timePoints.length) {
        startTimeIndex.value = timePoints.length - 1;
      }
      if (endTimeIndex.value >= timePoints.length) {
        endTimeIndex.value = timePoints.length - 1;
      }

      // 如果还没有初始化，设置默认区间
      if (endTimeIndex.value === 0 && timePoints.length > 1) {
        startTimeIndex.value = Math.max(0, timePoints.length - 5); // 默认选择最近5个时间点
        endTimeIndex.value = timePoints.length - 1;
      }

      // 确保开始时间不晚于结束时间
      if (startTimeIndex.value > endTimeIndex.value) {
        startTimeIndex.value = endTimeIndex.value;
      }

      // 更新当前选择的时间范围显示
      if (startTimeIndex.value === endTimeIndex.value) {
        currentSelectedTime.value = timePoints[startTimeIndex.value] || timePoints[0];
      } else {
        const startTime = timePoints[startTimeIndex.value]?.split(' ').pop() || '';
        const endTime = timePoints[endTimeIndex.value]?.split(' ').pop() || '';
        currentSelectedTime.value = `${startTime} - ${endTime}`;
      }

      // 准备等级数据（X轴）
      const levelLabels = filteredLevels.map(level => `${level.level}级`);

      // 为选定时间区间创建各等级的聚合数据
      const seriesData = filteredLevels.map((levelData: any) => {
        if (!levelData.trend || !Array.isArray(levelData.trend)) {
          return 0;
        }

        // 获取区间内的所有时间点
        const startTime = timePoints[startTimeIndex.value];
        const endTime = timePoints[endTimeIndex.value];

        // 筛选区间内的数据
        const rangeData = levelData.trend.filter((item: any) => {
          const itemTime = item.time;
          return itemTime >= startTime && itemTime <= endTime;
        });

        if (rangeData.length === 0) return 0;

        // 如果是单个时间点，直接返回该点的数据
        if (startTimeIndex.value === endTimeIndex.value) {
          const singlePoint = rangeData.find((item: any) => item.time === startTime);
          return typeof singlePoint?.count === 'number' && !isNaN(singlePoint.count) ? singlePoint.count : 0;
        }

        // 计算区间内的平均值
        const totalCount = rangeData.reduce((sum: number, item: any) => {
          const count = typeof item.count === 'number' && !isNaN(item.count) ? item.count : 0;
          return sum + count;
        }, 0);

        return Math.round(totalCount / rangeData.length);
      });

      // 创建等级分布图表
      const series = [{
        name: '等级人数分布',
        type: 'line' as const,
        smooth: true,
        showSymbol: true,
        symbolSize: 6,
        connectNulls: false,
        lineStyle: {
          width: 3,
          color: '#1890ff'
        },
        itemStyle: {
          color: '#1890ff',
          borderColor: '#fff',
          borderWidth: 2
        },
        areaStyle: {
          opacity: 0.1,
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
              { offset: 1, color: 'rgba(24, 144, 255, 0)' }
            ]
          }
        },
        emphasis: {
          focus: 'series' as const,
          lineStyle: { width: 4 },
          itemStyle: {
            borderColor: '#1890ff',
            borderWidth: 3,
            shadowBlur: 10,
            shadowColor: 'rgba(24, 144, 255, 0.4)'
          }
        },
        tooltip: {
          show: true
        },
        data: seriesData,
        z: 1
      }];

      setTimeout(() => {
        updateOptions(opts => {
          try {
            // 更新X轴数据（等级）
            (opts.xAxis as any).data = levelLabels;

            // 更新图例
            (opts.legend as any).data = ['等级人数分布'];

            // 更新series
            (opts as any).series = series;

            // 动态计算Y轴范围
            const maxY = Math.max(...seriesData, 10);
            (opts.yAxis as any).max = Math.ceil(maxY * 1.1 / 10) * 10;
            (opts.yAxis as any).min = 0;

            return opts;
          } catch (err) {
            return opts;
          }
        });
      }, 200);

    } else {
      hasError.value = true;
    }

  } catch (err) {
    hasError.value = true;
  }
};

// 获取所有服务器ID列表
const getAllServerIds = (): (string | number)[] => {
  const serverIds: (string | number)[] = [];

  serverOptions.value.forEach((option: any) => {
    if ('children' in option && option.children && Array.isArray(option.children)) {
      option.children.forEach((child: any) => {
        if (child.value && child.value !== "") {
          serverIds.push(child.value);
        }
      });
    }
  });

  return serverIds;
};

// 尝试找到有数据的服务器
const findServerWithData = async (): Promise<string | number | null> => {
  const serverIds = getAllServerIds();

  for (const serverId of serverIds) {
    try {
      const numericServerId = Number(serverId);

      const res = await fetchGetLevelDistributionChartData(numericServerId);
      const responseData = res?.data || res?.response?.data || res?.response || res;

      if (validateLevelData(responseData) && responseData.levels?.length > 0) {
        return serverId;
      }
    } catch (error) {
      continue;
    }
  }

  return null;
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

    await autoSelectServerWithData();
  } catch (err) {
    serverOptions.value = [{ value: "", label: "全部服务器" }];
  } finally {
    loadingServerList.value = false;
  }
};

// 自动选择有数据的服务器
const autoSelectServerWithData = async () => {
  // 如果已经选择了有效的服务器，先尝试获取数据
  if (selectedServerId.value && selectedServerId.value !== "") {
    await fetchData();
    return;
  }

  const serverWithData = await findServerWithData();
  if (serverWithData) {
    selectedServerId.value = serverWithData;
    await fetchData();
  } else {
    hasError.value = true;
  }
};

// 初始化
const init = async () => {
  try {
    await loadServerData();
  } catch (error) {
    hasError.value = true;
  }
};

// 生命周期
onMounted(() => {
  // 执行正常的初始化流程
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

// 监听器
watch(selectedServerId, (newServerId, oldServerId) => {
  if (oldServerId !== undefined) {
    fetchData();
  }
});

// 添加时间区间选择的监听器
watch([startTimeIndex, endTimeIndex], () => {
  // 时间区间变化时重新处理图表数据
  processChartData();
});

// 添加时间范围切换功能
const toggleTimeRange = (range: '1h' | '24h') => {
  timeRange.value = range;
  processChartData();
};

const refreshData = () => fetchData();

// 时间轴导航函数
const selectPreviousTime = () => {
  if (startTimeIndex.value > 0) {
    startTimeIndex.value--;
    // 如果开始时间超过了结束时间，也调整结束时间
    if (startTimeIndex.value > endTimeIndex.value) {
      endTimeIndex.value = startTimeIndex.value;
    }
  }
};

const selectNextTime = () => {
  if (endTimeIndex.value < availableTimePoints.value.length - 1) {
    endTimeIndex.value++;
    // 如果结束时间超前太多，也调整开始时间
    if (endTimeIndex.value - startTimeIndex.value > 10) {
      startTimeIndex.value = Math.max(0, endTimeIndex.value - 10);
    }
  }
};

// 新增区间调整函数
const adjustStartTime = (newIndex: number) => {
  startTimeIndex.value = Math.max(0, Math.min(newIndex, endTimeIndex.value));
};

const adjustEndTime = (newIndex: number) => {
  endTimeIndex.value = Math.max(startTimeIndex.value, Math.min(newIndex, availableTimePoints.value.length - 1));
};

// 添加额外的监听器来确保区间约束
watch(startTimeIndex, (newStart) => {
  if (newStart > endTimeIndex.value) {
    endTimeIndex.value = newStart;
  }
});

watch(endTimeIndex, (newEnd) => {
  if (newEnd < startTimeIndex.value) {
    startTimeIndex.value = newEnd;
  }
});
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
                <path d="M3 12a9 9 0 0 0-9-9"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div class="chart-title">{{ $t('page.home.levelOnline') }}</div>
    </div>
    <div ref="domRef" class="chart-container"></div>

    <!-- 时间区间选择滑动条 -->
    <div class="timeline-container" v-if="availableTimePoints.length > 0">
      <div class="timeline-wrapper">
        <button
          class="timeline-nav-btn"
          @click="selectPreviousTime"
          :disabled="startTimeIndex <= 0"
        >
          ‹
        </button>

        <div class="timeline-slider-wrapper">
          <div class="timeline-track">
            <!-- 开始时间滑动条 -->
            <input
              type="range"
              class="timeline-slider start-slider"
              v-model="startTimeIndex"
              :min="0"
              :max="availableTimePoints.length - 1"
              :step="1"
            />
            <!-- 结束时间滑动条 -->
            <input
              type="range"
              class="timeline-slider end-slider"
              v-model="endTimeIndex"
              :min="0"
              :max="availableTimePoints.length - 1"
              :step="1"
            />
            <!-- 区间高亮显示 -->
            <div class="timeline-range"
                 :style="{
                   left: startSliderProgress + '%',
                   width: (endSliderProgress - startSliderProgress) + '%'
                 }">
            </div>
            <div class="timeline-labels">
              <span class="timeline-label start">{{ availableTimePoints[0]?.split(' ').pop() || '' }}</span>
              <span class="timeline-label current">{{ selectedTimeRange }}</span>
              <span class="timeline-label end">{{ availableTimePoints[availableTimePoints.length - 1]?.split(' ').pop() || '' }}</span>
            </div>
          </div>
        </div>

        <button
          class="timeline-nav-btn"
          @click="selectNextTime"
          :disabled="endTimeIndex >= availableTimePoints.length - 1"
        >
          ›
        </button>
      </div>
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

.header-controls-right {
  display: flex;
  align-items: center;
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
  position: relative;
}

.server-selector-container {
  display: flex;
  align-items: center;
}

.time-slider-container {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 4px;
  padding: 6px 10px;
  border: 1px solid #d9d9d9;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-width: 100px;
}

.time-slider-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.time-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 60px;
  height: 3px;
  background: #e8e8e8;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  position: relative;
}

.time-slider::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: var(--progress, 0%);
  background: #1890ff;
  border-radius: 2px;
  transition: width 0.2s ease;
}

.time-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 10px;
  height: 10px;
  background: #1890ff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 2;
}

.time-slider::-webkit-slider-thumb:hover {
  background: #40a9ff;
  transform: scale(1.15);
}

.time-slider::-moz-range-thumb {
  width: 10px;
  height: 10px;
  background: #1890ff;
  border-radius: 50%;
  cursor: pointer;
  border: 1px solid #fff;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.time-slider::-moz-range-thumb:hover {
  background: #40a9ff;
  transform: scale(1.15);
}

.time-slider::-moz-range-track {
  height: 3px;
  background: #e8e8e8;
  border-radius: 2px;
  border: none;
}

.time-display {
  font-size: 12px;
  font-weight: 500;
  color: #333;
  min-width: 30px;
  text-align: center;
  background-color: transparent;
}

.timeline-container {
  margin-top: 20px;
  padding: 10px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.timeline-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.timeline-nav-btn {
  background: none;
  border: none;
  font: inherit;
  cursor: pointer;
  outline: inherit;
  color: #666;
  font-size: 16px;
}

.timeline-slider-wrapper {
  flex: 1;
}

.timeline-track {
  position: relative;
  height: 20px;
}

.timeline-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  background: transparent;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  position: absolute;
  top: 8px;
  z-index: 2;
}

.timeline-slider:first-of-type {
  background: #e8e8e8;
}

.timeline-slider.start-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #52c41a;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.timeline-slider.end-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #1890ff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.timeline-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.timeline-range {
  position: absolute;
  top: 8px;
  height: 4px;
  background: linear-gradient(90deg, #52c41a, #1890ff);
  border-radius: 2px;
  z-index: 1;
  transition: all 0.3s ease;
}

.timeline-labels {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.timeline-label {
  padding: 4px 8px;
  background-color: #fff;
  border-radius: 4px;
}
</style>
