<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { $t } from '@/locales';
import { useAppStore } from '@/store/modules/app';
import { useEcharts } from '@/hooks/common/echarts';
import { fetchGetHomeData } from '@/service/api/system-manage';

defineOptions({
  name: 'PieChart'
});

interface ChannelDataMap {
  [key: string]: number;
}

interface ServerData {
  serverId: number;
  serverName: string;
  onlineCount: number;
}

interface HomeDataResponse {
  totalOnline: number;
  channelData: ChannelDataMap;
  topServers: ServerData[];
  serverTrend: any[];
  channelTrend: any[];
  allServerStatus: ServerData[];
  xaxis: string[];
}

interface ApiResponse {
  code: number;
  msg: string | null;
    data: HomeDataResponse;
}

// 渠道名称映射
const channelNameMap: Record<string, string> = {
  mirm: 'MirM渠道',
  custom: '自定义渠道',
  gov: '版署渠道'
};

const channelData = ref<ChannelDataMap>({});
const serverData = ref<ServerData[]>([]);
const activeTab = ref<'channel' | 'server'>('channel');
const appStore = useAppStore();

const { domRef, updateOptions } = useEcharts(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{a} <br/>{b}: {c} ({d}%)'
  },
  legend: {
    bottom: '1%',
    left: 'center',
    itemStyle: {
      borderWidth: 0
    }
  },
  series: [
    {
      color: ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#f97316', '#06b6d4'],
      name: '在线分布',
      type: 'pie',
      radius: ['45%', '75%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: false,
        position: 'center'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: '14',
          fontWeight: 'bold'
        }
      },
      labelLine: {
        show: false
      },
      data: [] as { name: string; value: number }[]
    }
  ]
}));

async function fetchAndUpdateData() {
  try {
    const result = await fetchGetHomeData({}) as unknown as ApiResponse;

    console.log('PieChart API响应:', result);

    if (result && result.code === 200 && result.data) {
      channelData.value = result.data.channelData || {};
      serverData.value = result.data.topServers || [];
    } else if (result && result.data) {
      channelData.value = result.data.channelData || {};
      serverData.value = result.data.topServers || [];
    }

    updateDistribution();
  } catch (error) {
    console.error('获取饼图数据失败:', error);
    updateDistribution();
  }
}

function updateDistribution() {
  updateOptions(opts => {
    if (activeTab.value === 'channel') {
      // 显示渠道分布
      opts.series[0].name = '渠道在线分布';
      opts.series[0].data = Object.entries(channelData.value).map(([key, value]) => ({
        name: channelNameMap[key] || key,
        value: value
      }));
    } else {
      // 显示服务器分布（只显示在线的服务器）
      opts.series[0].name = '区服在线分布';
      const onlineServers = serverData.value.filter(s => s.onlineCount > 0);
      opts.series[0].data = onlineServers.map(server => ({
        name: server.serverName,
        value: server.onlineCount
    }));
    }
    return opts;
  });
}

function switchTab(tab: 'channel' | 'server') {
  activeTab.value = tab;
  updateDistribution();
}

function updateLocale() {
  updateDistribution();
}

watch(
  () => appStore.locale,
  () => {
    updateLocale();
  }
);

onMounted(() => {
  fetchAndUpdateData();
});
</script>

<template>
  <NCard :bordered="false" class="card-wrapper">
    <div class="chart-header">
      <div class="chart-title">在线分布</div>
      <div class="toggle-tabs">
        <div
          class="tab-item"
          :class="{ active: activeTab === 'channel' }"
          @click="switchTab('channel')"
        >
          渠道分布
        </div>
        <div
          class="tab-item"
          :class="{ active: activeTab === 'server' }"
          @click="switchTab('server')"
        >
          区服分布
        </div>
      </div>
    </div>
    <div ref="domRef" class="h-360px overflow-hidden"></div>
  </NCard>
</template>
<style scoped>
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  position: relative;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.toggle-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.tab-item {
  padding: 4px 12px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 16px;
  line-height: 22px;
  white-space: nowrap;
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
</style>
