<script setup lang="ts">
import { ref, computed, inject, watch, type Ref } from "vue";
import { createReusableTemplate } from "@vueuse/core";

defineOptions({
  name: "CardData",
});

// 服务器数据接口
interface ServerData {
  serverId: number;
  serverName: string;
  onlineCount: number;
}

// 趋势数据接口
interface TrendData {
  name: string;
  data: number[];
}

// 渠道数据接口
interface ChannelDataMap {
  [key: string]: number;
}

// 首页数据响应接口
interface HomeDataResponse {
  totalOnline: number;
  channelData: ChannelDataMap;
  topServers: ServerData[];
  serverTrend: TrendData[];
  channelTrend: TrendData[];
  allServerStatus: ServerData[];
  xaxis: string[];
}

// API响应结构
interface ApiResponse {
  code: number;
  msg: string | null;
  data: HomeDataResponse;
}

// 营收数据接口
interface RevenueDataResponse {
  totalRevenue: number;
  todayRevenue?: number;
  payRate: string;
  arpu?: number;
  arppu?: number; // ARPPU值
  activeUsers: number;
  totalRegister?: number; // 注册人数
  todayRegister?: number; // 今日注册人数
  channelRevenueRank: Array<{
    id: number;
    name: string;
    value: number;
  }>;
  serverRevenueRank: Array<{
    id: number;
    name: string;
    value: number;
  }>;
}

interface RevenueApiResponse {
  code: number;
  msg: string | null;
  data: RevenueDataResponse;
}

// 从父组件注入共享数据
const homeData = inject<Ref<HomeDataResponse | null>>('homeData', ref(null));
const revenueData = inject<Ref<RevenueDataResponse | null>>('revenueData', ref(null));

// 本地响应式数据
const localHomeData = ref<HomeDataResponse>({
  totalOnline: 0,
  channelData: {},
  topServers: [],
  serverTrend: [],
  channelTrend: [],
  allServerStatus: [],
  xaxis: [],
});

const localRevenueData = ref<RevenueDataResponse>({
  totalRevenue: 0,
  todayRevenue: 0,
  payRate: "0%",
  arpu: 0,
  arppu: 0,
  activeUsers: 0,
  totalRegister: 0,
  todayRegister: 0,
  channelRevenueRank: [],
  serverRevenueRank: [],
});

// 监听父组件数据变化
watch(homeData, (newData) => {
  if (newData) {
    localHomeData.value = { ...newData };
  }
}, { immediate: true });

watch(revenueData, (newData) => {
  if (newData) {
    localRevenueData.value = { ...newData };
  }
}, { immediate: true });

interface CardData {
  key: string;
  title: string;
  value: number;
  unit: string;
  color: {
    start: string;
    end: string;
  };
  icon: string;
  subTitle?: string;
  clickable?: boolean;
}

// 计算渠道总数
const totalChannels = computed(() => {
  return Object.keys(localHomeData.value.channelData).length;
});

// 计算在线服务器数量
const onlineServersCount = computed(() => {
  return localHomeData.value.allServerStatus.filter(
    (server) => server.onlineCount > 0
  ).length;
});

const cardData = computed<CardData[]>(() => {
  // 营业额：直接使用原始值
  const revenueValue = localRevenueData.value.totalRevenue;

  // ARPPU：直接使用原始值
  const arppuValue = localRevenueData.value.arppu || 0;

  return [
    {
      key: "totalOnline",
      title: "在线人数",
      value: localHomeData.value.totalOnline,
      unit: "",
      color: {
        start: "#5B8FF9",
        end: "#4A7FE8",
      },
      icon: "ant-design:team-outlined",
      clickable: false,
    },
    {
      key: "totalRegister",
      title: "注册人数",
      value: localRevenueData.value.totalRegister || 0,
      unit: "",
      color: {
        start: "#F59E0B",
        end: "#D97706",
      },
      icon: "ant-design:user-add-outlined",
      clickable: false,
    },
    {
      key: "arppu",
      title: "ARPPU",
      value: arppuValue,
      unit: "¥",
      color: {
        start: "#10B981",
        end: "#059669",
      },
      icon: "ant-design:user-outlined",
      clickable: false,
    },

    {
      key: "totalRevenue",
      title: "营业额",
      value: revenueValue,
      unit: "¥",
      color: {
        start: "#8B5CF6",
        end: "#7C3AED",
      },
      icon: "ant-design:money-collect-outlined",
      clickable: false,
    },
  ];
});

interface GradientBgProps {
  gradientColor: string;
}

const [DefineGradientBg, GradientBg] =
  createReusableTemplate<GradientBgProps>();

function getGradientColor(color: CardData["color"]) {
  return `linear-gradient(to bottom right, ${color.start}, ${color.end})`;
}


// 处理卡片点击事件
function handleCardClick(cardKey: string) {
  const card = cardData.value.find((c) => c.key === cardKey);
  if (!card?.clickable) return;
  // 如果需要添加点击功能，可以在这里实现
}

// 检查是否为可点击的卡片
function isClickableCard(cardKey: string) {
  const card = cardData.value.find((c) => c.key === cardKey);
  return card?.clickable || false;
}

// 计算合适的起始值和动画时长
function getAnimationConfig(endValue: number) {
  // Handle null, undefined, or invalid values
  if (endValue == null || !isFinite(endValue) || endValue === 0) {
    return { startValue: 0, duration: 800 };
  }

  // 根据数字位数计算起始百分比和动画时长
  const digits = Math.floor(Math.log10(endValue)) + 1;

  // 位数越多，起始值越接近目标值，动画时间越短
  let startPercent = 0;
  let duration = 800;

  if (digits >= 10) {      // 十亿级别
    startPercent = 0.95;
    duration = 600;
  } else if (digits >= 9) { // 亿级别
    startPercent = 0.92;
    duration = 650;
  } else if (digits >= 8) { // 千万级别
    startPercent = 0.88;
    duration = 700;
  } else if (digits >= 7) { // 百万级别
    startPercent = 0.8;
    duration = 750;
  } else if (digits >= 6) { // 十万级别
    startPercent = 0.7;
  } else if (digits >= 5) { // 万级别
    startPercent = 0.5;
  } else if (digits >= 4) { // 千级别
    startPercent = 0.3;
  }

  return {
    startValue: Math.floor(endValue * startPercent),
    duration
  };
}

</script>

<template>
  <NCard :bordered="false" size="small">
    <!-- define component start: GradientBg -->
    <DefineGradientBg v-slot="{ $slots, gradientColor }">
      <div
        class="rd-8px px-16px pb-4px pt-8px text-white"
        :style="{ backgroundImage: gradientColor }"
      >
        <component :is="$slots.default" />
      </div>
    </DefineGradientBg>
    <!-- define component end: GradientBg -->

    <NGrid cols="s:1 m:2 l:4" responsive="screen" :x-gap="16" :y-gap="16">
      <NGi v-for="item in cardData" :key="item.key">
        <GradientBg
          :gradient-color="getGradientColor(item.color)"
          :class="[
            'flex-1 transition-transform duration-200',
            isClickableCard(item.key)
              ? 'cursor-pointer hover:scale-105 hover:shadow-lg select-none'
              : '',
          ]"
          @click="handleCardClick(item.key)"
        >
          <div class="flex justify-between items-start">
            <h3 class="text-16px">{{ item.title }}</h3>
            <div
              v-if="
                item.key === 'totalRevenue' &&
                localRevenueData.todayRevenue !== undefined
              "
              class="text-right flex items-center gap-1 text-16px text-white dark:text-dark"
            >
              <span class="opacity-90">今</span>
              <CountTo
                prefix="¥"
                v-bind="getAnimationConfig(localRevenueData.todayRevenue || 0)"
                :end-value="localRevenueData.todayRevenue || 0"
                :decimals="0"
                :separator="''"
              />
            </div>
            <div
              v-if="
                item.key === 'totalRegister' &&
                localRevenueData.todayRegister !== undefined
              "
              class="text-right flex items-center gap-1 text-16px text-white dark:text-dark"
            >
              <span class="opacity-90">今</span>
              <CountTo
                v-bind="getAnimationConfig(localRevenueData.todayRegister || 0)"
                :end-value="localRevenueData.todayRegister || 0"
                :decimals="0"
                :separator="''"
              />
            </div>
          </div>
          <div class="flex justify-between pt-12px items-end">
            <SvgIcon :icon="item.icon" class="text-32px" />
            <div class="text-right flex items-baseline">
              <CountTo
                :prefix="item.unit"
                v-bind="getAnimationConfig(item.value)"
                :end-value="item.value"
                :decimals="
                  item.key === 'totalOnline' ||
                  item.key === 'totalRevenue' ||
                  item.key === 'totalRegister'
                    ? 0
                    : 2
                "
                :separator="''"
                class="text-30px text-white dark:text-dark"
              />
              <span v-if="item.subTitle" class="text-20px ml-1 opacity-90">{{
                item.subTitle
              }}</span>
            </div>
          </div>
        </GradientBg>
      </NGi>
    </NGrid>
  </NCard>
</template>

<style scoped>
:deep(.text-16px span) {
  font-size: 16px;
}
</style>
