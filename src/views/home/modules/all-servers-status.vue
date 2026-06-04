<script setup lang="ts">
import { ref, computed, inject, watch, type Ref } from 'vue';
import { fetchGetHomeData } from '@/service/api/system-manage';
import { $t } from '@/locales';

defineOptions({
  name: 'AllServersStatus'
});

interface ServerData {
  serverId: number;
  serverName: string;
  onlineCount: number;
  roleCount?: number; // 角色新增
  arpu?: number; // 平均每用户收入
  totalRevenue?: number; // 总收入
  openTime?: number | string; // 开服时间：时间戳或 "YYYY-MM-DD HH:mm:ss" / "YYYY-MM-DDTHH:mm:ss"
}

interface HomeDataResponse {
  totalOnline: number;
  channelData: { [key: string]: number };
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

// 从父组件注入共享数据
const homeData = inject<Ref<HomeDataResponse | null>>('homeData', ref(null));

const allServers = ref<ServerData[]>([]);
const loading = ref(false);

// 搜索关键字
const searchKeyword = ref('');

// 排序方式
type SortType = 'online-desc' | 'online-asc' | 'revenue-desc' | 'revenue-asc' | 'arpu-desc' | 'arpu-asc';
const sortBy = ref<SortType>('online-desc');

// 排序选项
const sortOptions = [
  { label: '在线人数（降序）', value: 'online-desc' as SortType },
  { label: '在线人数（升序）', value: 'online-asc' as SortType },
  { label: '总收入（降序）', value: 'revenue-desc' as SortType },
  { label: '总收入（升序）', value: 'revenue-asc' as SortType },
  { label: 'ARPU（降序）', value: 'arpu-desc' as SortType },
  { label: 'ARPU（升序）', value: 'arpu-asc' as SortType }
];

// 排序函数映射
const sortFunctions: Record<SortType, (a: ServerData, b: ServerData) => number> = {
  'online-desc': (a, b) => b.onlineCount - a.onlineCount,
  'online-asc': (a, b) => a.onlineCount - b.onlineCount,
  'revenue-desc': (a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0),
  'revenue-asc': (a, b) => (a.totalRevenue || 0) - (b.totalRevenue || 0),
  'arpu-desc': (a, b) => (b.arpu || 0) - (a.arpu || 0),
  'arpu-asc': (a, b) => (a.arpu || 0) - (b.arpu || 0)
};

// 过滤和排序后的服务器列表
const filteredAndSortedServers = computed(() => {
  let servers = [...allServers.value];

  // 搜索过滤
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (keyword) {
    servers = servers.filter(
      server =>
        server.serverName.toLowerCase().includes(keyword) ||
        server.serverId.toString().includes(keyword)
    );
  }

  // 排序
  const sortFn = sortFunctions[sortBy.value];
  if (sortFn) {
    servers.sort(sortFn);
  }

  return servers;
});

// 统计信息
const statistics = computed(() => {
  const servers = allServers.value;
  const total = servers.length;
  const online = servers.filter(s => s.onlineCount > 0).length;
  const totalOnline = servers.reduce((sum, s) => sum + s.onlineCount, 0);
  const totalRoleNew = servers.reduce((sum, s) => sum + (s.roleCount || 0), 0);
  const totalRevenue = servers.reduce((sum, s) => sum + (s.totalRevenue || 0), 0);
  const avgArpu = servers.length > 0
    ? servers.reduce((sum, s) => sum + (s.arpu || 0), 0) / servers.length
    : 0;

  return {
    total,
    online,
    offline: total - online,
    totalOnline,
    totalRoleNew,
    totalRevenue,
    avgArpu
  };
});

// 格式化金额显示（美化大数字）
function formatCurrency(value: number): string {
  if (value >= 10000000) {
    // 千万以上
    return `¥${(value / 10000000).toFixed(2)}千万`;
  } else if (value >= 1000000) {
    // 百万以上
    return `¥${(value / 10000).toFixed(1)}万`;
  } else if (value >= 10000) {
    // 万以上
    return `¥${(value / 10000).toFixed(2)}万`;
  } else if (value >= 1000) {
    // 千以上
    return `¥${(value / 1000).toFixed(1)}k`;
  } else {
    return `¥${value.toFixed(2)}`;
  }
}

// 格式化 ARPU 显示
function formatArpu(value: number): string {
  if (value >= 1000) {
    return `¥${(value / 1000).toFixed(1)}k`;
  } else if (value >= 100) {
    return `¥${value.toFixed(0)}`;
  } else {
    return `¥${value.toFixed(2)}`;
  }
}

// 获取服务器状态样式
function getServerStatusClass(onlineCount: number): string {
  return onlineCount === 0 ? 'status-offline' : 'status-online';
}

// 获取服务器状态标签
function getServerStatusTag(onlineCount: number): { text: string; type: 'default' | 'success' } {
  return onlineCount === 0
    ? { text: '离线', type: 'default' as const }
    : { text: '在线', type: 'success' as const };
}

// 格式化开服时间：只显示日期，不显示时间
function formatOpenTime(openTime?: number | string): string {
  if (openTime === undefined || openTime === null) return '—';
  try {
    const date = typeof openTime === 'number' ? new Date(openTime) : new Date(String(openTime).replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return '—';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return '—';
  }
}

// 计算开服天数：参考 serveritem/index.vue 的逻辑
function calculateOpenDays(openTime?: number | string): { days: number | null; text: string; class: string } {
  if (openTime === undefined || openTime === null) {
    return { days: null, text: '—', class: '' };
  }
  try {
    const openDate = typeof openTime === 'number' ? new Date(openTime) : new Date(String(openTime).replace(' ', 'T'));
    if (Number.isNaN(openDate.getTime())) {
      return { days: null, text: '—', class: '' };
    }
    const now = new Date();

    // 按照自然日计算：将时间归零到当天的00:00:00
    const openDateOnly = new Date(openDate.getFullYear(), openDate.getMonth(), openDate.getDate());
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 计算自然日差值，开服当天算第1天
    const diffTime = nowDateOnly.getTime() - openDateOnly.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays < 1) {
      return { days: null, text: $t('page.manage.serveritem.notOpenYet'), class: 'open-days-not-open' };
    } else if (diffDays === 1) {
      return { days: 1, text: $t('page.manage.serveritem.today'), class: 'open-days-today' };
    } else {
      return { days: diffDays, text: `${diffDays} ${$t('page.manage.serveritem.days')}`, class: 'open-days-normal' };
    }
  } catch {
    return { days: null, text: '—', class: '' };
  }
}

// 计算状态栏宽度
const maxOnlineCount = computed(() => {
  const counts = allServers.value.map(s => s.onlineCount);
  return counts.length > 0 ? Math.max(...counts) : 1;
});

function getStatusBarWidth(onlineCount: number): string {
  if (onlineCount === 0) return '0%';
  const percentage = (onlineCount / maxOnlineCount.value) * 100;
  return `${Math.min(percentage, 100)}%`;
}

// 监听父组件提供的数据变化
watch(homeData, (newData) => {
  if (!newData || !newData.allServerStatus || !Array.isArray(newData.allServerStatus)) {
    return;
  }

  allServers.value = newData.allServerStatus;
}, { immediate: true });
</script>

<template>
  <NCard :bordered="false" size="small" class="server-status-card">
    <div class="header-section">
      <div class="title-row">
        <h3 class="card-title">全部服务器状态</h3>
        <span class="auto-refresh-hint">自动刷新</span>
      </div>

      <!-- 统计信息：与首页卡片数据风格统一 -->
      <div class="statistics-row">
        <span class="stat-text">总服务器：<span class="stat-number">{{ statistics.total }}</span></span>
        <span class="stat-text">在线：<span class="stat-number stat-online">{{ statistics.online }}</span></span>
        <span class="stat-text">离线：<span class="stat-number stat-offline">{{ statistics.offline }}</span></span>
        <span class="stat-text">总在线人数：<span class="stat-number stat-total">{{ statistics.totalOnline }}</span></span>
        <span class="stat-text">总角色新增：<span class="stat-number stat-role-new">{{ statistics.totalRoleNew }}</span></span>
      </div>

      <!-- 搜索和排序 -->
      <div class="filter-row">
        <NInput
          v-model:value="searchKeyword"
          placeholder="搜索服务器名称或ID..."
          clearable
          class="search-input"
        >
          <template #prefix>
            <SvgIcon icon="ant-design:search-outlined" />
          </template>
        </NInput>

        <NSelect
          v-model:value="sortBy"
          :options="sortOptions"
          class="sort-select"
        />
      </div>
    </div>

    <!-- 服务器列表 -->
    <div class="server-list-container">
      <NSpin :show="loading">
        <div v-if="filteredAndSortedServers.length === 0" class="empty-state">
          <NEmpty description="暂无服务器数据" />
        </div>
        <div v-else class="server-grid">
          <div
            v-for="server in filteredAndSortedServers"
            :key="server.serverId"
            class="server-card"
            :class="getServerStatusClass(server.onlineCount)"
          >
            <div class="server-card-header">
              <div class="server-info">
                <div class="server-name">{{ server.serverName }}</div>
                <div class="server-meta">
                  <span class="server-id">ID: {{ server.serverId }}</span>
                  <span class="server-meta-sep">·</span>
                  <span class="server-open-days" :class="calculateOpenDays(server.openTime).class">
                    {{ calculateOpenDays(server.openTime).text }}
                  </span>
                </div>
              </div>
              <span class="status-dot" :class="getServerStatusClass(server.onlineCount)" :title="getServerStatusTag(server.onlineCount).text">
                {{ getServerStatusTag(server.onlineCount).text }}
              </span>
            </div>
            <div class="server-card-body">
              <div class="metrics-row">
                <div class="metric-item">
                  <SvgIcon icon="ant-design:user-outlined" class="metric-icon" />
                  <div class="metric-content">
                    <div class="metric-value">{{ server.onlineCount }}</div>
                    <div class="metric-label">在线</div>
                  </div>
                </div>
                <div class="metric-item">
                  <SvgIcon icon="ant-design:user-add-outlined" class="metric-icon" />
                  <div class="metric-content">
                    <div class="metric-value">{{ server.roleCount || 0 }}</div>
                    <div class="metric-label">角色</div>
                  </div>
                </div>
              </div>

              <div class="metrics-row">
                <div class="metric-item">
                  <SvgIcon icon="ant-design:dollar-circle-outlined" class="metric-icon" />
                  <div class="metric-content">
                    <div class="metric-value revenue">{{ formatCurrency(server.totalRevenue || 0) }}</div>
                    <div class="metric-label">收入</div>
                  </div>
                </div>
                <div class="metric-item">
                  <SvgIcon icon="ant-design:rise-outlined" class="metric-icon" />
                  <div class="metric-content">
                    <div class="metric-value arpu">{{ formatArpu(server.arpu || 0) }}</div>
                    <div class="metric-label">ARPU</div>
                  </div>
                </div>
              </div>

              <div
                class="status-bar"
                :style="{ width: getStatusBarWidth(server.onlineCount) }"
              ></div>
            </div>
          </div>
        </div>
      </NSpin>
    </div>
  </NCard>
</template>

<style scoped>
/* 与首页 card-data、主题色统一：柔和边框、项目色板、无强烈高亮 */
.server-status-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header-section {
  margin-bottom: 16px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--n-text-color);
  margin: 0;
}

.auto-refresh-hint {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.auto-refresh-hint::before {
  content: '●';
  color: #5B8FF9;
  margin-right: 4px;
}

.statistics-row {
  display: flex;
  gap: 20px;
  padding: 10px 0;
  margin-bottom: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.stat-text {
  font-size: 13px;
  color: var(--n-text-color-2);
}

.stat-number {
  font-size: 14px;
  font-weight: 600;
  color: var(--n-text-color);
  margin-left: 2px;
}

.stat-online {
  color: #10B981;
}

.stat-offline {
  color: #5D7092;
}

.stat-total {
  color: #5B8FF9;
}

.stat-role-new {
  color: #8B5CF6;
}

.stat-revenue {
  color: #f5222d;
}

.stat-arpu {
  color: #fa8c16;
}

.filter-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  flex: 1;
  max-width: 280px;
}

.sort-select {
  width: 180px;
}

.server-list-container {
  flex: 1;
  overflow: auto;
  min-height: 400px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.server-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}

.server-card {
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  padding: 12px 14px;
  background: var(--n-card-color);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  position: relative;
}

.server-card:hover {
  border-color: var(--n-border-color-hover);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.server-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.server-info {
  flex: 1;
  min-width: 0;
}

.server-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--n-text-color);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.server-meta {
  font-size: 12px;
  color: var(--n-text-color-3);
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.server-id {
  color: var(--n-text-color-3);
}

.server-meta-sep {
  color: var(--n-text-color-3);
  opacity: 0.5;
}

.server-open-days {
  font-size: 12px;
  color: var(--n-text-color-2);
}

.server-open-days.open-days-today {
  color: #10B981;
  font-weight: 500;
}

.server-open-days.open-days-not-open {
  color: #5D7092;
  opacity: 0.7;
}

.server-open-days.open-days-normal {
  color: var(--n-text-color-2);
}

/* 状态：小标签样式，与项目内 NTag 默认风格一致 */
.status-dot {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
  white-space: nowrap;
}

.status-dot.status-online {
  color: #10B981;
  background: rgba(16, 185, 129, 0.12);
}

.status-dot.status-offline {
  color: #5D7092;
  background: rgba(93, 112, 146, 0.1);
}

.server-card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.metrics-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
}

.metric-icon {
  font-size: 14px;
  color: var(--n-text-color-3);
  flex-shrink: 0;
}

.metric-content {
  flex: 1;
  min-width: 0;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--n-text-color);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-value.revenue {
  color: #f5222d;
}

.metric-value.arpu {
  color: #fa8c16;
}

.metric-label {
  font-size: 11px;
  color: var(--n-text-color-3);
  margin-top: 1px;
}

.status-bar {
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, #5B8FF9 0%, #4A7FE8 100%);
  transition: width 0.4s ease;
}

.server-card.status-offline .status-bar {
  background: rgba(93, 112, 146, 0.2);
}

.server-card.status-online .status-bar {
  background: linear-gradient(90deg, #10B981 0%, #059669 100%);
}

/* 暗色主题 */
html.dark .server-card {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.08);
}

html.dark .server-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.12);
}

@media (max-width: 768px) {
  .server-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;
  }

  .filter-row {
    flex-direction: column;
  }

  .search-input,
  .sort-select {
    width: 100%;
    max-width: 100%;
  }

  .statistics-row {
    gap: 14px;
  }

  .stat-text {
    font-size: 12px;
  }

  .stat-number {
    font-size: 13px;
  }

  .metrics-row {
    grid-template-columns: 1fr;
  }
}
</style>

