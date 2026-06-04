<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { $t } from '@/locales';
import { useAppStore } from '@/store/modules/app';
import { useEcharts } from '@/hooks/common/echarts';
import { fetchGetHomeData } from '@/service/api/system-manage';

defineOptions({
  name: 'LevelDetailChart'
});

interface HomeDataResponse {
  totalAmount: number;
  onlineUser: number;
  userRecord: number;
  userRole: number;
  levelDetail: {
    roleLevel: number;
    count: number;
  }[];
  levelDistribution: {
    range: string;
    count: number;
  }[];
}

interface ApiResponse {
  error: any;
  response?: {
    data: HomeDataResponse;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    config: any;
    request: any;
  };
  data?: HomeDataResponse;
}

const levelDetailData = ref<{roleLevel: number; count: number}[]>([]);
const appStore = useAppStore();

const { domRef, updateOptions } = useEcharts(() => ({
  title: {
    text: '等级人数分布详情',
    left: 'center',
    textStyle: {
      fontSize: 16,
      fontWeight: 'bold'
    }
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    },
    formatter: '{b}级: {c}人'
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '10%',
    top: '15%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: [] as string[],
    axisLabel: {
      interval: 4, // 每5个等级显示一次标签，避免太密集
      rotate: 0
    },
    name: '等级',
    nameLocation: 'middle',
    nameGap: 30
  },
  yAxis: {
    type: 'value',
    name: '人数',
    nameLocation: 'middle',
    nameGap: 50,
    min: 0
  },
  series: [
    {
      name: '人数',
      type: 'bar',
      data: [] as number[],
      itemStyle: {
        color: '#5da8ff',
        borderRadius: [4, 4, 0, 0]
      },
      emphasis: {
        itemStyle: {
          color: '#3d8bff'
        }
      },
      label: {
        show: true,
        position: 'top',
        formatter: (params: any) => {
          return params.value > 0 ? params.value : '';
        },
        fontSize: 10
      }
    }
  ]
}));

async function fetchAndUpdateData() {
  try {
    const result = await fetchGetHomeData() as unknown as ApiResponse;
    if (result && result.response && result.response.data && result.response.data.levelDetail) {
      levelDetailData.value = result.response.data.levelDetail;
    } else if (result && result.data && result.data.levelDetail) {
      levelDetailData.value = result.data.levelDetail;
    }

    updateLevelDetail();
  } catch (error) {
    console.error('获取等级数据失败:', error);
    updateLevelDetail();
  }
}

function updateLevelDetail() {
  updateOptions(opts => {
    // 生成等级标签和数据
    const levels = levelDetailData.value.map(item => item.roleLevel.toString());
    const counts = levelDetailData.value.map(item => item.count);

    opts.xAxis.data = levels;
    opts.series[0].data = counts;

    return opts;
  });
}

function updateLocale() {
  updateOptions((opts) => {
    opts.title.text = '等级人数分布详情';
    opts.xAxis.name = '等级';
    opts.yAxis.name = '人数';
    opts.series[0].name = '人数';

    if (levelDetailData.value && levelDetailData.value.length > 0) {
      const levels = levelDetailData.value.map(item => item.roleLevel.toString());
      const counts = levelDetailData.value.map(item => item.count);

      opts.xAxis.data = levels;
      opts.series[0].data = counts;
    }

    return opts;
  });
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
    <div ref="domRef" class="h-400px overflow-hidden"></div>
  </NCard>
</template>
<style scoped></style>
