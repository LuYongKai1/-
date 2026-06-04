<script setup lang="tsx">
import { NTag, NSelect, NCard, NDataTable, NSpace, NButton, useMessage } from "naive-ui";
import { Icon } from '@iconify/vue';
import { fetchCopyList } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { ref, onMounted, computed, h, watch } from "vue";
import { useAuth } from "@/hooks/business/auth";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

// 常量定义
const GAME_ID = 101;

// 类型定义
interface Props {
  serverId?: string;
  title?: string;
}

interface IndunData {
  indun_id: number;
  indun_line_guid: string;
  player_count: number;
  world_indun_state: string;
  world_server_id: string;
}

interface StateInfo {
  label: string;
  type: 'success' | 'warning' | 'error' | 'default';
}

// Props定义
const props = withDefaults(defineProps<Props>(), {
  serverId: '',
  title: ''
});

// Composables
const { hasAuth } = useAuth();
const appStore = useAppStore();
const message = useMessage();

// 响应式数据
const selectedServerId = ref<number>();
const indunData = ref<IndunData[]>([]);
const loading = ref(false);
const collapsedInduns = ref<Set<string>>(new Set());

const columnChecks = ref<NaiveUI.TableColumnCheck[]>([
  { key: 'indun_id', title: '副本ID', checked: true },
  { key: 'indun_line_guid', title: '副本GUID', checked: true },
  { key: 'player_count', title: '当前人数', checked: true },
  { key: 'world_indun_state', title: '副本状态', checked: true },
  { key: 'world_server_id', title: '副本服务器ID', checked: true }
]);

// 获取副本数据的函数
const getIndunData = async (): Promise<void> => {
  if (!selectedServerId.value) {
    indunData.value = [];
    return;
  }

  loading.value = true;
  try {
    const response = await fetchCopyList(selectedServerId.value);

    const { data, error } = response;
    if (!error && data) {
      const allIndunData: IndunData[] = [];
      Object.entries(data as Record<string, any>).forEach(([indunId, indunLines]) => {
        Object.entries(indunLines as Record<string, any>).forEach(([lineGuid, lineData]: [string, any]) => {
          allIndunData.push({
            indun_id: lineData.indun_id,
            // 确保 indun_line_guid 保持为字符串，避免大整数精度丢失
            indun_line_guid: String(lineData.indun_line_guid || lineGuid),
            player_count: lineData.player_count,
            world_indun_state: lineData.world_indun_state,
            world_server_id: lineData.world_server_id
          });
        });
      });

      indunData.value = allIndunData;
    } else {
      indunData.value = [];
    }
  } catch (error) {
    indunData.value = [];
  } finally {
    loading.value = false;
  }
};

// 监听器
watch(() => props.serverId, async (newServerId) => {
  if (newServerId) {
    selectedServerId.value = Number(newServerId);
    await getIndunData();
  }
}, { immediate: true });

// 计算属性
const groupedIndunData = computed(() => {
  const grouped: Record<string, IndunData[]> = {};
  indunData.value.forEach(item => {
    const indunKey = item.indun_id.toString();
    if (!grouped[indunKey]) {
      grouped[indunKey] = [];
    }
    grouped[indunKey].push(item);
  });
  return grouped;
});

const indunStats = computed(() => ({
  totalInduns: Object.keys(groupedIndunData.value).length,
  totalLines: indunData.value.length,
  totalPlayers: indunData.value.reduce((sum, item) => sum + (item.player_count || 0), 0)
}));

const statsConfig = computed(() => [
  {
    value: indunStats.value.totalInduns,
    label: "副本总数",
    colorClass: "text-blue-500"
  },
  {
    value: indunStats.value.totalLines,
    label: "副本线路总数",
    colorClass: "text-green-500"
  },
  {
    value: indunStats.value.totalPlayers,
    label: "在线人数",
    colorClass: "text-orange-500"
  }
]);

const filteredColumns = computed(() => {
  return columns.value.filter(col => {
    if (!col.key || col.key === 'operations') return true;
    const check = columnChecks.value.find(check => check.key === col.key);
    return check?.checked !== false;
  });
});

// 状态映射
const stateMap: Record<string, StateInfo> = {
  "world_indun_loaded": { label: "已加载", type: "success" },
  "world_indun_loading": { label: "加载中", type: "warning" },
  "world_indun_error": { label: "错误", type: "error" },
};

const getStateInfo = (state: string): StateInfo => {
  return stateMap[state] || { label: state, type: "default" };
};

const toggleIndunCollapse = (indunId: string): void => {
  const newCollapsedInduns = new Set(collapsedInduns.value);
  if (newCollapsedInduns.has(indunId)) {
    newCollapsedInduns.delete(indunId);
  } else {
    newCollapsedInduns.add(indunId);
  }
  collapsedInduns.value = newCollapsedInduns;
};

const isIndunCollapsed = (indunId: string): boolean => {
  return collapsedInduns.value.has(indunId);
};

const getIndunPlayerCount = (lines: IndunData[]): number => {
  return lines.reduce((sum, line) => sum + (line.player_count || 0), 0);
};

const getChevronClass = (indunId: string): string => {
  return `transition-transform duration-200 ${!isIndunCollapsed(indunId) ? 'rotate-180' : ''}`;
};

const refreshData = (): void => {
  getIndunData();
};

const onServerChange = (): void => {
  getIndunData();
};

// 表格列配置
const columns = computed(() => [
  {
    key: "indun_id",
    title: "副本ID",
    align: "center" as const,
    minWidth: 100,
  },
  {
    key: "indun_line_guid",
    title: "副本GUID",
    align: "center" as const,
    minWidth: 150,
    ellipsis: { tooltip: true }
  },
  {
    key: "player_count",
    title: "当前人数",
    align: "center" as const,
    minWidth: 100,
  },
  {
    key: "world_indun_state",
    title: "副本状态",
    align: "center" as const,
    minWidth: 150,
    render: (row: IndunData) => {
      const state = getStateInfo(row.world_indun_state);
      return h(NTag, { type: state.type }, () => state.label);
    },
  },
  {
    key: "world_server_id",
    title: "副本服务器ID",
    align: "center" as const,
    minWidth: 180,
    ellipsis: { tooltip: true },
  }
]);

onMounted(() => {
  getIndunData();
});
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <!-- 统计信息卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-16px">
      <NCard
        v-for="(stat, index) in statsConfig"
        :key="index"
        class="text-center"
        size="small"
      >
        <div :class="`text-2xl font-bold ${stat.colorClass}`">
          {{ stat.value }}
        </div>
        <div class="text-gray-500">
          {{ stat.label }}
        </div>
      </NCard>
    </div>

    <!-- 分组视图 -->
    <div class="flex-col-stretch gap-16px">
      <NCard
        v-for="(lines, indunId) in groupedIndunData"
        :key="indunId"
        :bordered="false"
        size="small"
        class="card-wrapper"
      >
        <template #header>
          <div
            class="flex items-center cursor-pointer"
            @click="toggleIndunCollapse(indunId)"
          >
            <span class="mr-2">副本 {{ indunId }}</span>
            <Icon
              icon="ion:chevron-down-outline"
              :class="getChevronClass(indunId)"
            />
          </div>
        </template>

        <div v-if="!isIndunCollapsed(indunId)">
          <!-- 副本表格头部操作 -->
          <div class="mb-4">
            <TableHeaderOperation
              v-model:columns="columnChecks"
              :loading="loading"
              @refresh="refreshData"
              :show-batch-delete="false"
            />
          </div>

          <!-- 副本数据表格 -->
          <NDataTable
            :columns="filteredColumns"
            :data="lines"
            size="small"
            :scroll-x="1000"
            :row-key="(row) => row.indun_line_guid"
            :pagination="false"
          />

          <!-- 表格下方统计信息 -->
          <div class="mt-3 flex justify-end">
            <NSpace>
              <NTag type="info" size="small"> {{ lines.length }} 个线路 </NTag>
              <NTag type="success" size="small">
                {{ getIndunPlayerCount(lines) }} 人在线
              </NTag>
            </NSpace>
          </div>
        </div>
      </NCard>
    </div>
  </div>
</template>

<style scoped>
.card-wrapper {
  margin-bottom: 16px;
}

.rotate-180 {
  transform: rotate(180deg);
}

.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  color: #1890ff;
}

/* 副本头部操作区域样式 */
.card-wrapper :deep(.n-card-header) {
  padding-bottom: 12px;
}

/* 表格操作列样式 */
:deep(.n-data-table td) {
  white-space: nowrap;
}
</style>
