<script setup lang="ts">
import { ref, computed, inject, watch, type Ref } from 'vue';
import { NSpace } from 'naive-ui';

defineOptions({
  name: 'TopRankings'
});

interface RankItem {
  id: number;
  name: string;
  value: number;
}

interface RevenueDataResponse {
  totalRevenue: number;
  payRate: string;
  arpu: number;
  activeUsers: number;
  channelRevenueRank: RankItem[];
  serverRevenueRank: RankItem[];
}

interface ApiResponse {
  code: number;
  msg: string | null;
  data: RevenueDataResponse;
}

// 从父组件注入共享数据
const injectedRevenueData = inject<Ref<RevenueDataResponse | null>>('revenueData', ref(null));

// 本地响应式数据
const revenueData = ref<RevenueDataResponse>({
  totalRevenue: 0,
  payRate: '0%',
  arpu: 0,
  activeUsers: 0,
  channelRevenueRank: [],
  serverRevenueRank: []
});

// 动画状态
const animatedChannelValues = ref<Map<number, number>>(new Map());
const animatedServerValues = ref<Map<number, number>>(new Map());
const isFirstLoad = ref(true);

// 监听父组件数据变化
watch(injectedRevenueData, (newData) => {
  if (!newData || !newData.channelRevenueRank || !newData.serverRevenueRank) {
    return;
  }

  // 首次加载时，初始化动画起始值
  if (isFirstLoad.value) {
    newData.channelRevenueRank.slice(0, 5).forEach((channel) => {
      animatedChannelValues.value.set(channel.id, 0);
    });
    newData.serverRevenueRank.slice(0, 5).forEach((server) => {
      animatedServerValues.value.set(server.id, 0);
    });
    isFirstLoad.value = false;
  }
  revenueData.value = { ...newData };
}, { immediate: true });

// 颜色映射（与项目整体风格一致）
const rankColors = [
  { start: '#5B8FF9', end: '#3B6FD9' },  // 蓝色
  { start: '#5AD8A6', end: '#3DB890' },  // 青绿色
  { start: '#F6BD16', end: '#E8A010' },  // 金色
  { start: '#6F5EF9', end: '#5840E0' },  // 紫色
  { start: '#5D7092', end: '#4A5A75' }   // 灰蓝色
];

// 数字动画函数
function animateValue(
  targetValue: number,
  id: number,
  animatedMap: Map<number, number>
) {
  const startValue = animatedMap.get(id) || 0;
  const startTime = Date.now();
  const duration = 1000;

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const currentValue = startValue + (targetValue - startValue) * easeOutQuart;

    animatedMap.set(id, currentValue);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      animatedMap.set(id, targetValue);
    }
  };

  requestAnimationFrame(animate);
}

// 计算渠道营收排行
const channelRankings = computed(() => {
  return computeRankings(
    revenueData.value.channelRevenueRank,
    animatedChannelValues.value
  );
});

// 计算区服营收排行
const serverRankings = computed(() => {
  return computeRankings(
    revenueData.value.serverRevenueRank,
    animatedServerValues.value
  );
});

// 通用排行计算函数
function computeRankings(
  dataList: RankItem[],
  animatedMap: Map<number, number>
) {
  const rawItems = dataList.slice(0, 5);

  const items = Array.from({ length: 5 }, (_, index) => {
    const item = rawItems[index];
    if (item) {
      return {
        id: item.id,
        name: item.name,
        value: item.value,
        displayValue: animatedMap.get(item.id) || item.value,
        color: rankColors[index],
        isEmpty: false
      };
    }
    return {
      id: `empty-${index}`,
      name: '-',
      value: 0,
      displayValue: 0,
      color: rankColors[index],
      isEmpty: true
    };
  });

  const maxValue = items.find(item => !item.isEmpty)?.value || 1;

  return items.map(item => ({
    ...item,
    percentage: item.isEmpty ? 0 : (item.value / maxValue) * 100,
    displayPercentage: item.isEmpty ? 0 : ((item.displayValue || item.value) / maxValue) * 100
  }));
}

// 监听数据变化，触发动画
watch(
  () => revenueData.value.channelRevenueRank,
  (newChannels) => {
    newChannels.slice(0, 5).forEach((channel) => {
      animateValue(channel.value, channel.id, animatedChannelValues.value);
    });
  },
  { deep: true }
);

watch(
  () => revenueData.value.serverRevenueRank,
  (newServers) => {
    newServers.slice(0, 5).forEach((server) => {
      animateValue(server.value, server.id, animatedServerValues.value);
    });
  },
  { deep: true }
);


// 格式化数字
function formatNumber(num: number): string {
  const rounded = Math.round(num);
  if (rounded >= 10000) return (rounded / 10000).toFixed(1) + 'w';
  if (rounded >= 1000) return (rounded / 1000).toFixed(1) + 'k';
  return rounded.toString();
}

</script>

<template>
  <NSpace vertical :size="16">
    <!-- 渠道总营收 Top 5 -->
    <div class="card-wrapper">
      <div class="chart-header">
        <div class="chart-title">渠道总营收 Top 5</div>
      </div>
      <div class="ranking-list">
        <div
          v-for="(channel, index) in channelRankings"
          :key="channel.id"
          class="ranking-card"
          :class="`rank-${index + 1}`"
          :style="{ animationDelay: `${index * 0.1}s` }"
        >
          <div class="rank-badge">
            <span class="rank-number">{{ index + 1 }}</span>
          </div>
          <div class="rank-content">
            <div class="rank-header">
              <span class="rank-name">{{ channel.name }}</span>
              <span class="rank-value">¥{{ formatNumber(channel.displayValue) }}</span>
            </div>
            <div class="progress-container">
              <div class="progress-track">
                <div
                  class="progress-fill"
                  :style="{
                    width: channel.displayPercentage + '%',
                    background: `linear-gradient(90deg, ${channel.color.start} 0%, ${channel.color.end} 100%)`
                  }"
                >
                  <div class="progress-glow"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 区服总营收 Top 5 (Revenue) -->
    <div class="card-wrapper">
      <div class="chart-header">
        <div class="chart-title">区服总营收 Top 5</div>
      </div>
      <div class="ranking-list">
        <div
          v-for="(server, index) in serverRankings"
          :key="server.id"
          class="ranking-card"
          :class="`rank-${index + 1}`"
          :style="{ animationDelay: `${index * 0.1}s` }"
        >
          <div class="rank-badge">
            <span class="rank-number">{{ index + 1 }}</span>
          </div>
          <div class="rank-content">
            <div class="rank-header">
              <span class="rank-name">{{ server.name }}</span>
              <span class="rank-value">¥{{ formatNumber(server.displayValue) }}</span>
            </div>
            <div class="progress-container">
              <div class="progress-track">
                <div
                  class="progress-fill"
                  :style="{
                    width: server.displayPercentage + '%',
                    background: `linear-gradient(90deg, ${server.color.start} 0%, ${server.color.end} 100%)`
                  }"
                >
                  <div class="progress-glow"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </NSpace>
</template>

<style scoped>
.card-wrapper {
  background-color: var(--n-card-color);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 20px;
  position: relative;
  height: 100%;
  transition: all 0.3s ease;
}

.card-wrapper:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.chart-header {
  display: flex;
  justify-content: center;
  align-items: center;
  /* margin-bottom: 20px; */
  padding-bottom: 5px;
  border-bottom: 1px solid var(--n-border-color);
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--n-text-color);
  letter-spacing: 0.5px;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ranking-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--n-card-color);
  border-radius: 10px;
  border: 1px solid var(--n-border-color);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  animation: slideInUp 0.5s ease-out forwards;
  transform: translateY(15px);
  position: relative;
  overflow: hidden;
}

.ranking-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, var(--rank-color-start, #5B8FF9), var(--rank-color-end, #3B6FD9));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.ranking-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--rank-color-start, #5B8FF9);
}

.ranking-card:hover::before {
  opacity: 1;
}

.ranking-card.rank-1::before {
  --rank-color-start: #5B8FF9;
  --rank-color-end: #3B6FD9;
}

.ranking-card.rank-2::before {
  --rank-color-start: #5AD8A6;
  --rank-color-end: #3DB890;
}

.ranking-card.rank-3::before {
  --rank-color-start: #F6BD16;
  --rank-color-end: #E8A010;
}

.ranking-card.rank-4::before {
  --rank-color-start: #6F5EF9;
  --rank-color-end: #5840E0;
}

.ranking-card.rank-5::before {
  --rank-color-start: #5D7092;
  --rank-color-end: #4A5A75;
}

@keyframes slideInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.rank-badge {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf0 100%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.ranking-card.rank-1 .rank-badge {
  background: linear-gradient(135deg, #5B8FF9 0%, #3B6FD9 100%);
  box-shadow: 0 4px 8px rgba(91, 143, 249, 0.3);
}

.ranking-card.rank-2 .rank-badge {
  background: linear-gradient(135deg, #5AD8A6 0%, #3DB890 100%);
  box-shadow: 0 4px 8px rgba(90, 216, 166, 0.3);
}

.ranking-card.rank-3 .rank-badge {
  background: linear-gradient(135deg, #F6BD16 0%, #E8A010 100%);
  box-shadow: 0 4px 8px rgba(246, 189, 22, 0.3);
}

.ranking-card.rank-4 .rank-badge {
  background: linear-gradient(135deg, #6F5EF9 0%, #5840E0 100%);
  box-shadow: 0 4px 8px rgba(111, 94, 249, 0.3);
}

.ranking-card.rank-5 .rank-badge {
  background: linear-gradient(135deg, #5D7092 0%, #4A5A75 100%);
  box-shadow: 0 4px 8px rgba(93, 112, 146, 0.3);
}

.rank-number {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.ranking-card.rank-4 .rank-number,
.ranking-card.rank-5 .rank-number {
  color: #fff;
}

.rank-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.rank-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.rank-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--n-text-color);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-value {
  font-size: 15px;
  font-weight: 700;
  color: #5B8FF9;
  flex-shrink: 0;
  letter-spacing: 0.3px;
  transition: all 0.3s ease;
}

.ranking-card:hover .rank-value {
  color: #5AD8A6;
  transform: scale(1.05);
}

.progress-container {
  width: 100%;
}

.progress-track {
  width: 100%;
  height: 6px;
  background: var(--n-border-color);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
}

.progress-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 1s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 8px rgba(91, 143, 249, 0.4);
}

.progress-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  animation: shimmer 2s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.ranking-card:hover .progress-fill {
  box-shadow: 0 0 12px rgba(91, 143, 249, 0.6);
}

/* 暗色主题适配 */
html.dark .card-wrapper {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

html.dark .card-wrapper:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

html.dark .chart-header {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

html.dark .chart-title {
  color: rgba(255, 255, 255, 0.9);
}

html.dark .ranking-card {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.08);
}

html.dark .ranking-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(91, 143, 249, 0.3);
}

html.dark .rank-badge {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
}

html.dark .rank-name {
  color: rgba(255, 255, 255, 0.85);
}

html.dark .progress-track {
  background: rgba(255, 255, 255, 0.08);
}

html.dark .progress-fill {
  box-shadow: 0 0 8px rgba(91, 143, 249, 0.5);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .card-wrapper {
    padding: 16px;
    margin-bottom: 16px;
  }

  .chart-header {
    margin-bottom: 16px;
    padding-bottom: 12px;
  }

  .chart-title {
    font-size: 14px;
  }

  .ranking-card {
    padding: 12px;
    gap: 10px;
  }

  .rank-badge {
    width: 32px;
    height: 32px;
  }

  .rank-number {
    font-size: 14px;
  }

  .rank-name {
    font-size: 13px;
  }

  .rank-value {
    font-size: 13px;
  }

  .progress-track {
    height: 5px;
  }
}
</style>


