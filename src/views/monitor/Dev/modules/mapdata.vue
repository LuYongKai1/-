<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NCard, NDataTable, NSpace, NModal, NForm, NFormItem, NInputNumber, NInput, NEmpty, useMessage } from "naive-ui";
import { Icon } from '@iconify/vue';
import { fetchGetMapData, fetchOpenMap, fetchCloseMap, fetchKickMap, fetchSetMapMaxPlayer } from "@/service/api";
import { ref, onMounted, computed, h, watch, shallowRef, onUnmounted, nextTick } from "vue";
import { useAuth } from "@/hooks/business/auth";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import { useItemPackage } from "@/hooks/business/useItemPackage";
import TableHeaderOperation from "@/components/advanced/table-header-operation.vue";
import BatchMapOperateModal from "./batch-map-operate-modal.vue";

// ===== 类型定义 =====
interface MapChannel {
  map_id: string;
  line_guid: string;
  channel_id: number;
  player_count: number;
  max_player_count: number;
  world_line_state: string;
  is_preset: boolean;
  world_server_id: string;
  empty_start_time: string;
}

interface MaxPlayerForm {
  serverId: number;
  channelGuid: string;
  maxPlayer: number;
  mapId: string;
  channelId: number;
}

interface StateInfo {
  label: string;
  type: 'success' | 'warning' | 'error' | 'default';
}

interface ColumnCheck {
  key: string;
  title: string;
  checked: boolean;
}

type OperationType = 'open' | 'close' | 'kick';

// ===== 常量定义 =====
const CONSTANTS = {
  GAME_ID: 101,
  MAX_PLAYER_LIMIT: 1000000,
  MIN_PLAYER_LIMIT: 1,
  BATCH_SIZE: 10,
  SCROLL_THRESHOLD: 100,
  LOAD_MORE_DELAY: 300,
  DEBOUNCE_DELAY: 500,
  REFRESH_DELAY: 2000, // 操作后刷新延迟2秒
  MAX_RETRIES: 3,
  RETRY_BASE_DELAY: 1000,
} as const;

// 状态映射配置
const STATE_CONFIG: Record<string, StateInfo> = {
  world_line_loaded: { label: "已加载", type: "success" },
  world_line_loading: { label: "加载中", type: "warning" },
  world_line_error: { label: "错误", type: "error" },
  world_line_closed: { label: "已关闭", type: "error" },
} as const;

const OPERATION_CONFIG: Record<OperationType, string> = {
  open: '开启',
  close: '关闭',
  kick: '踢人到主城'
} as const;

// ===== Props定义 =====
interface Props {
  serverId?: string;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  serverId: '',
  title: ''
});

// ===== Composables =====
const { hasAuth } = useAuth();
const message = useMessage();

// ===== 响应式数据 =====
const selectedServerId = ref<number>();
const mapData = shallowRef<MapChannel[]>([]);
const allMapIds = ref<Set<string>>(new Set()); // 保存所有地图ID，包括为null的地图
const loading = ref(false);
const mapNameLoading = ref(false);
const collapsedMaps = ref<Set<string>>(new Set());
const checkedRowKeysMap = ref<Record<string, string[]>>({});
const showMaxPlayerModal = ref(false);
const displayedMapCount = ref(0);
const isLoadingMore = ref(false);
const mapNameData = ref<Record<string, string>>({});
const isInitialized = ref(false);
const operationLoading = ref<Record<string, boolean>>({});
const setMaxPlayerLoading = ref(false);
const searchKeyword = ref<string>(''); // 搜索关键词
const batchOperateModalVisible = ref(false); // 批量操作弹窗显示状态

const maxPlayerForm = ref<MaxPlayerForm>({
  serverId: 0,
  channelGuid: '',
  maxPlayer: 0,
  mapId: '',
  channelId: 0
});

const columnChecks = ref<ColumnCheck[]>([
  { key: 'line_guid', title: '频道GUID', checked: true },
  { key: 'channel_id', title: '频道号', checked: true },
  { key: 'player_count', title: '当前人数', checked: true },
  { key: 'max_player_count', title: '最大人数', checked: true },
  { key: 'world_line_state', title: '频道状态', checked: true },
  { key: 'is_preset', title: '预启动地图', checked: true },
  { key: 'world_server_id', title: '世界服务器ID', checked: true },
  { key: 'empty_start_time', title: '空闲开始时间', checked: true }
]);

// ===== 计算属性 =====
const groupedMapData = computed(() => {
  // 先基于 mapData 构建分组
  const grouped = mapData.value.reduce((acc, item) => {
    if (!acc[item.map_id]) {
      acc[item.map_id] = [];
    }
    acc[item.map_id].push(item);
    return acc;
  }, {} as Record<string, MapChannel[]>);

  // 确保所有地图ID都出现在结果中，即使没有频道数据
  allMapIds.value.forEach(mapId => {
    if (!grouped[mapId]) {
      grouped[mapId] = [];
    }
  });

  return grouped;
});

// 过滤后的地图数据（根据搜索关键词）
const filteredMapData = computed(() => {
  const allMaps = Object.entries(groupedMapData.value);
  const keyword = searchKeyword.value.trim().toLowerCase();

  if (!keyword) return allMaps;

  return allMaps.filter(([mapId]) => {
    return mapId.toLowerCase().includes(keyword) ||
           getMapName(mapId).toLowerCase().includes(keyword);
  });
});

const visibleMapData = computed(() => {
  return filteredMapData.value.slice(0, displayedMapCount.value);
});

const hasMoreMaps = computed(() => {
  return displayedMapCount.value < filteredMapData.value.length;
});

const mapStats = computed(() => {
  const filteredChannels = filteredMapData.value.flatMap(([, channels]) => channels);

  return {
    totalMaps: filteredMapData.value.length,
    totalChannels: filteredChannels.length,
    totalPlayers: filteredChannels.reduce((sum, item) => sum + (item.player_count || 0), 0),
  };
});

const statsConfig = computed(() => [
  {
    value: mapStats.value.totalMaps,
    label: "地图总数",
    colorClass: "text-blue-500"
  },
  {
    value: mapStats.value.totalChannels,
    label: "频道总数",
    colorClass: "text-green-500"
  },
  {
    value: mapStats.value.totalPlayers,
    label: "在线人数",
    colorClass: "text-orange-500"
  }
]);

const filteredColumns = computed(() => {
  const baseColumns = columns.value.filter(col => col.key !== 'map_id');
  return baseColumns.filter(col => {
    if (!col.key || col.type === 'selection' || col.key === 'operations') return true;
    const check = columnChecks.value.find(check => check.key === col.key);
    return check?.checked !== false;
  });
});

// ===== 工具函数 =====
const getStateInfo = (state: string): StateInfo => {
  return STATE_CONFIG[state] || { label: state, type: "default" };
};

const getOperationLabel = (operation: string): string => {
  return OPERATION_CONFIG[operation as OperationType] || operation;
};

const getMapPlayerCount = (channels: MapChannel[]): number => {
  return channels.reduce((sum, ch) => sum + (ch.player_count || 0), 0);
};

const getChevronClass = (mapId: string): string => {
  return `transition-transform duration-200 ${!collapsedMaps.value.has(mapId) ? 'rotate-180' : ''}`;
};

const getMapName = (mapId: string): string => {
  return mapNameData.value[mapId] || `地图 ${mapId}`;
};


// ===== 操作loading状态管理 =====
const createOperationKey = (mapId: string, operation: string): string => `${mapId}_${operation}`;

const setOperationLoading = (mapId: string, operation: string, isLoading: boolean): void => {
  const key = createOperationKey(mapId, operation);
  operationLoading.value[key] = isLoading;
};

const getOperationLoading = (mapId: string, operation: string): boolean => {
  const key = createOperationKey(mapId, operation);
  return operationLoading.value[key] || false;
};

const isAnyOperationLoading = (mapId: string): boolean => {
  const operations: OperationType[] = ['open', 'close', 'kick'];
  return operations.some(op => getOperationLoading(mapId, op));
};

// ===== 地图折叠状态管理 =====
const toggleMapCollapse = (mapId: string): void => {
  const newCollapsedMaps = new Set(collapsedMaps.value);
  if (newCollapsedMaps.has(mapId)) {
    newCollapsedMaps.delete(mapId);
  } else {
    newCollapsedMaps.add(mapId);
  }
  collapsedMaps.value = newCollapsedMaps;
};

const isMapCollapsed = (mapId: string): boolean => {
  return collapsedMaps.value.has(mapId);
};

// ===== 表格选中状态管理 =====
const getCheckedRowKeys = (mapId: string): string[] => {
  return checkedRowKeysMap.value[mapId] || [];
};

const setCheckedRowKeys = (mapId: string, keys: string[]): void => {
  checkedRowKeysMap.value[mapId] = keys;
};

const hasCheckedRows = (mapId: string): boolean => {
  return getCheckedRowKeys(mapId).length > 0;
};

const handleTableCheck = (mapId: string, checkedKeys: (string | number)[]): void => {
  const stringKeys = checkedKeys.map(key => String(key));
  setCheckedRowKeys(mapId, stringKeys);
};

// ===== 数据获取函数 =====
const getMapData = async (): Promise<void> => {
  if (!selectedServerId.value) {
    mapData.value = [];
    allMapIds.value = new Set();
    displayedMapCount.value = 0;
    return;
  }

  loading.value = true;
  try {
    const response = await fetchGetMapData(selectedServerId.value);
    const { data, error } = response;

    if (error || !data) {
      mapData.value = [];
      allMapIds.value = new Set();
      displayedMapCount.value = 0;
      return;
    }

    // 确保 data 是对象类型
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      console.warn('获取地图数据失败: 数据格式不正确', data);
      mapData.value = [];
      allMapIds.value = new Set();
      displayedMapCount.value = 0;
      return;
    }

    const allMapData: MapChannel[] = [];
    const mapIdsSet = new Set<string>();

    Object.entries(data as Record<string, any>).forEach(([mapId, mapChannels]) => {
      // 保存所有地图ID，包括为null的
      mapIdsSet.add(mapId);

      // 如果 mapChannels 为 null 或无效，跳过处理频道数据，但地图仍会显示
      if (mapChannels === null || mapChannels === undefined || typeof mapChannels !== 'object' || Array.isArray(mapChannels)) {
        if (mapChannels === null) {
          console.warn(`地图 ${mapId} 的频道数据为 null，将显示为空`);
        } else {
          console.warn(`地图 ${mapId} 的频道数据格式不正确:`, mapChannels);
        }
        return;
      }

      Object.entries(mapChannels as Record<string, any>).forEach(([channelGuid, channelData]: [string, any]) => {
        // 确保 channelData 是对象类型（排除 null 和数组）
        if (channelData === null || channelData === undefined || typeof channelData !== 'object' || Array.isArray(channelData)) {
          if (channelData === null) {
            console.warn(`频道 ${channelGuid} 的数据为 null，跳过处理`);
          } else {
            console.warn(`频道 ${channelGuid} 的数据格式不正确:`, channelData);
          }
          return;
        }

        allMapData.push({
          map_id: mapId,
          line_guid: channelGuid,
          channel_id: channelData.channel_id,
          player_count: channelData.player_count,
          max_player_count: channelData.max_player_count,
          world_line_state: channelData.world_line_state,
          is_preset: channelData.is_preset,
          world_server_id: channelData.world_server_id,
          empty_start_time: channelData.empty_start_time
        });
      });
    });

    // 保存所有地图ID
    allMapIds.value = mapIdsSet;

    mapData.value = allMapData;
    await nextTick(); // 确保DOM更新后再计算显示数量
    displayedMapCount.value = Math.min(CONSTANTS.BATCH_SIZE, Object.keys(groupedMapData.value).length);
  } catch (error) {
    console.error('获取地图数据失败:', error);
    mapData.value = [];
    allMapIds.value = new Set();
    displayedMapCount.value = 0;
  } finally {
    loading.value = false;
  }
};

// 获取地图名称数据 - 优化缓存逻辑
const getMapNameData = async (): Promise<void> => {
  if (Object.keys(mapNameData.value).length > 0 || mapNameLoading.value) {
    return;
  }

  mapNameLoading.value = true;
  try {
    const itemPackageData = await useItemPackage();
    if (itemPackageData?.data?.map) {
      mapNameData.value = itemPackageData.data.map;
    }
  } catch (error) {
    console.warn('获取地图名称数据失败:', error);
  } finally {
    mapNameLoading.value = false;
  }
};

// ===== 频道操作函数 =====
interface OperationParams {
  gameId: number;
  serverId: number;
  mapId: number;
  channelId: number;
}

const executeChannelOperation = async (channel: MapChannel, operation: OperationType): Promise<void> => {
  const baseParams: OperationParams = {
    gameId: CONSTANTS.GAME_ID,
    serverId: selectedServerId.value!,
    mapId: parseInt(channel.map_id),
    channelId: channel.channel_id,
  };

  const operationHandlers = {
    open: () => fetchOpenMap(baseParams),
    close: () => fetchCloseMap(baseParams),
    kick: () => fetchKickMap(baseParams)
  };

  const response = await operationHandlers[operation]();

  if (handleApiResponseError(response, getOperationLabel(operation))) {
    throw new Error(`${getOperationLabel(operation)}失败`);
  }
};

const handleBatchChannelOperation = async (operation: OperationType, mapId: string): Promise<void> => {
  const checkedKeys = getCheckedRowKeys(mapId);
  if (checkedKeys.length === 0) {
    message.warning('请先选择要操作的频道');
    return;
  }

  // 设置loading状态
  setOperationLoading(mapId, operation, true);

  try {
    const selectedChannels = mapData.value.filter(channel =>
      checkedKeys.includes(channel.line_guid) && channel.map_id === mapId
    );

    // 并行执行操作以提高性能
    const results = await Promise.allSettled(
      selectedChannels.map(channel => executeChannelOperation(channel, operation))
    );

    const successCount = results.filter(result => result.status === 'fulfilled').length;
    const errorCount = results.filter(result => result.status === 'rejected').length;

    // 记录失败的操作
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`${selectedChannels[index].line_guid} ${getOperationLabel(operation)}失败:`, result.reason);
      }
    });

    if (successCount > 0) {
      message.success(`${getOperationLabel(operation)}操作完成，成功: ${successCount} 个，失败: ${errorCount} 个`);
    }

    setCheckedRowKeys(mapId, []);

    // 延迟刷新数据，确保服务器状态更新
    setTimeout(() => {
      refreshDataWithRetry(0, CONSTANTS.MAX_RETRIES, () => {
        setOperationLoading(mapId, operation, false);
      });
    }, CONSTANTS.REFRESH_DELAY);
  } catch (error) {
    handleApiCatchError(error, `${getOperationLabel(operation)}`);
    setOperationLoading(mapId, operation, false);
  }
};

// ===== 最大人数设置 =====
const handleSetMaxPlayer = (channelData: MapChannel): void => {
  maxPlayerForm.value = {
    serverId: selectedServerId.value || 0,
    channelGuid: channelData.line_guid,
    maxPlayer: channelData.max_player_count || 100,
    mapId: channelData.map_id,
    channelId: channelData.channel_id
  };
  showMaxPlayerModal.value = true;
};

const confirmSetMaxPlayer = async (): Promise<void> => {
  setMaxPlayerLoading.value = true;

  try {
    const response = await fetchSetMapMaxPlayer({
      gameId: CONSTANTS.GAME_ID,
      serverId: maxPlayerForm.value.serverId,
      mapId: parseInt(maxPlayerForm.value.mapId),
      channelId: maxPlayerForm.value.channelId,
      maxPlayerCount: maxPlayerForm.value.maxPlayer
    });

    if (handleApiResponseError(response, '设置最大人数')) {
      setMaxPlayerLoading.value = false;
      return;
    }

    message.success(`设置成功,最大人数为 ${maxPlayerForm.value.maxPlayer}`);
    showMaxPlayerModal.value = false;

    // 延迟刷新数据，确保服务器状态更新
    setTimeout(() => {
      refreshDataWithRetry(0, CONSTANTS.MAX_RETRIES, () => {
        setMaxPlayerLoading.value = false;
      });
    }, CONSTANTS.REFRESH_DELAY);
  } catch (error) {
    handleApiCatchError(error, '设置最大人数');
    setMaxPlayerLoading.value = false;
  }
};

// ===== 通用操作函数 =====
const refreshData = (): void => {
  getMapData();
};

// 增强的刷新函数，支持重试机制
const refreshDataWithRetry = async (
  retryCount = 0,
  maxRetries = CONSTANTS.MAX_RETRIES,
  onComplete?: () => void
): Promise<void> => {
  // 创建状态快照用于比较
  const createStateSnapshot = (data: MapChannel[]) =>
    data.map(item => ({
      line_guid: item.line_guid,
      world_line_state: item.world_line_state,
      player_count: item.player_count
    }));

  const previousStates = createStateSnapshot(mapData.value);

  await getMapData();

  const currentStates = createStateSnapshot(mapData.value);
  const hasStateChanged = JSON.stringify(previousStates) !== JSON.stringify(currentStates);

  if (!hasStateChanged && retryCount < maxRetries) {
    const delay = CONSTANTS.RETRY_BASE_DELAY * (retryCount + 1);
    setTimeout(() => {
      refreshDataWithRetry(retryCount + 1, maxRetries, onComplete);
    }, delay);
  } else {
    if (hasStateChanged) {
    } else {
    }
    onComplete?.();
  }
};

// ===== 防抖初始化 =====
let initTimeout: NodeJS.Timeout | null = null;

const debouncedInit = async (): Promise<void> => {
  if (initTimeout) {
    clearTimeout(initTimeout);
  }

  initTimeout = setTimeout(async () => {
    if (!isInitialized.value) {
      isInitialized.value = true;

      // 并行获取地图名称和数据
      const promises: Promise<void>[] = [];
      if (Object.keys(mapNameData.value).length === 0) {
        promises.push(getMapNameData());
      }
      if (selectedServerId.value) {
        promises.push(getMapData());
      }

      await Promise.all(promises);
    }
  }, CONSTANTS.DEBOUNCE_DELAY);
};

// ===== 加载更多功能 =====
const loadMoreMaps = async (): Promise<void> => {
  if (isLoadingMore.value || !hasMoreMaps.value) return;

  isLoadingMore.value = true;
  await new Promise(resolve => setTimeout(resolve, CONSTANTS.LOAD_MORE_DELAY));

  const totalMaps = filteredMapData.value.length;
  const nextCount = Math.min(displayedMapCount.value + CONSTANTS.BATCH_SIZE, totalMaps);
  displayedMapCount.value = nextCount;

  isLoadingMore.value = false;
};

const handleScroll = (): void => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;

  if (documentHeight - scrollTop - windowHeight < CONSTANTS.SCROLL_THRESHOLD &&
      hasMoreMaps.value &&
      !isLoadingMore.value) {
    loadMoreMaps();
  }
};

// ===== 表格列配置 =====
const columns = computed(() => [
  {
    key: "map_id",
    title: "地图名称",
    align: "center" as const,
    minWidth: 150,
    render: (row: MapChannel) => {
      return h('span', { title: `ID: ${row.map_id}` }, getMapName(row.map_id));
    },
  },
  {
    type: 'selection' as const,
    align: 'center' as const,
    width: 48
  },
  {
    key: "line_guid",
    title: "频道GUID",
    align: "center" as const,
    minWidth: 150,
    ellipsis: { tooltip: true }
  },
  {
    key: "channel_id",
    title: "渠道ID",
    align: "center" as const,
    minWidth: 100,
  },
  {
    key: "player_count",
    title: "当前人数",
    align: "center" as const,
    minWidth: 100,
  },
  {
    key: "max_player_count",
    title: "最大人数",
    align: "center" as const,
    minWidth: 100,
  },
  {
    key: "world_line_state",
    title: "频道状态",
    align: "center" as const,
    minWidth: 150,
    render: (row: MapChannel) => {
      const state = getStateInfo(row.world_line_state);
      return h(NTag, { type: state.type }, () => state.label);
    },
  },
  {
    key: "is_preset",
    title: "预启动地图",
    align: "center" as const,
    minWidth: 120,
    render: (row: MapChannel) => {
      return h(NTag, { type: row.is_preset ? 'success' : 'default' }, () => row.is_preset ? '是' : '否');
    },
  },
  {
    key: "world_server_id",
    title: "世界服务器ID",
    align: "center" as const,
    minWidth: 180,
    ellipsis: { tooltip: true },
  },
  {
    key: "empty_start_time",
    title: "空闲开始时间",
    align: "center" as const,
    minWidth: 120,
  },
  {
    key: "operations",
    title: "操作",
    align: "center" as const,
    minWidth: 200,
    render: (row: MapChannel) => (
      <div class="flex-center gap-8px">
        <NButton
          type="primary"
          ghost
          size="small"
          onClick={() => handleSetMaxPlayer(row)}
        >
          设置人数
        </NButton>
      </div>
    ),
  }
]);

// ===== 监听器 =====
watch(() => props.serverId, async (newServerId) => {
  if (newServerId) {
    selectedServerId.value = Number(newServerId);
    isInitialized.value = false;
    await debouncedInit();
  }
}, { immediate: true });

// 监听搜索关键词变化，重置显示数量并自动展开匹配的地图
watch(searchKeyword, (keyword) => {
  displayedMapCount.value = Math.min(CONSTANTS.BATCH_SIZE, filteredMapData.value.length);

  if (keyword.trim()) {
    const newCollapsedMaps = new Set(collapsedMaps.value);
    filteredMapData.value.forEach(([mapId]) => newCollapsedMaps.delete(mapId));
    collapsedMaps.value = newCollapsedMaps;
  }
});

// ===== 生命周期 =====
onMounted(async () => {
  window.addEventListener('scroll', handleScroll);
  if (!isInitialized.value) {
    await debouncedInit();
  }
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  if (initTimeout) {
    clearTimeout(initTimeout);
  }
});
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <!-- 搜索框和批量操作 -->
    <NCard size="small" class="search-card">
      <div class="flex items-center justify-between gap-12px">
        <div class="flex items-center gap-12px" style="flex: 1;">
          <span class="search-label">搜索</span>
          <NInput
            v-model:value="searchKeyword"
            placeholder="请输入地图名称或地图ID进行搜索"
            clearable
            style="flex: 1; max-width: 400px;"
          >
            <template #prefix>
              <Icon icon="ion:search-outline" />
            </template>
          </NInput>
        </div>
        <NButton type="primary" @click="batchOperateModalVisible = true">
          <template #icon>
            <Icon icon="ion:layers-outline" />
          </template>
          批量操作
        </NButton>
      </div>
    </NCard>

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
    <div v-if="filteredMapData.length === 0 && searchKeyword" class="text-center py-16">
      <NEmpty description="未找到匹配的地图" />
    </div>

    <div v-else class="flex-col-stretch gap-16px">
      <NCard
        v-for="mapItem in visibleMapData"
        :key="mapItem[0]"
        :bordered="false"
        size="small"
        class="card-wrapper"
      >
        <template #header>
          <div
            class="flex items-center cursor-pointer"
            @click="toggleMapCollapse(mapItem[0])"
            :title="`地图ID: ${mapItem[0]}`"
          >
            <span class="mr-2">{{ getMapName(mapItem[0]) }}</span>
            <NTag size="small" type="info" class="mr-2">ID: {{ mapItem[0] }}</NTag>
            <Icon
              icon="ion:chevron-down-outline"
              :class="getChevronClass(mapItem[0])"
            />
          </div>
        </template>

        <div v-if="!isMapCollapsed(mapItem[0])">
          <!-- 频道表格头部操作 -->
          <div class="mb-4">
            <TableHeaderOperation
              v-model:columns="columnChecks"
              :disabled-delete="!hasCheckedRows(mapItem[0])"
              :loading="loading"
              @refresh="refreshData"
              :show-batch-delete="false"
            >
              <template #prefix>
                <NSpace size="small">
                  <NButton
                    size="small"
                    ghost
                    type="success"
                    :disabled="!hasCheckedRows(mapItem[0]) || isAnyOperationLoading(mapItem[0])"
                    :loading="getOperationLoading(mapItem[0], 'open')"
                    @click="handleBatchChannelOperation('open', mapItem[0])"
                  >
                    <Icon icon="ion:play-outline" class="mr-1" />
                    开启地图
                  </NButton>
                  <NButton
                    size="small"
                    ghost
                    type="warning"
                    :disabled="!hasCheckedRows(mapItem[0]) || isAnyOperationLoading(mapItem[0])"
                    :loading="getOperationLoading(mapItem[0], 'close')"
                    @click="handleBatchChannelOperation('close', mapItem[0])"
                  >
                    <Icon icon="ion:stop-outline" class="mr-1" />
                    关闭地图
                  </NButton>
                  <NPopconfirm
                    positive-text="确认"
                    negative-text="取消"
                    @positive-click="handleBatchChannelOperation('kick', mapItem[0])"
                  >
                    <template #trigger>
                      <NButton
                        size="small"
                        ghost
                        type="error"
                        :disabled="!hasCheckedRows(mapItem[0]) || isAnyOperationLoading(mapItem[0])"
                        :loading="getOperationLoading(mapItem[0], 'kick')"
                      >
                        <Icon icon="ion:people-outline" class="mr-1" />
                        踢出全部
                      </NButton>
                    </template>
                    确定要踢出选中频道的所有玩家吗？
                  </NPopconfirm>
                </NSpace>
              </template>
            </TableHeaderOperation>
          </div>

          <!-- 频道数据表格 -->
          <div v-if="mapItem[1].length === 0" class="text-center py-8 text-gray-400">
            <Icon icon="ion:information-circle-outline" class="text-2xl mb-2" />
            <div>暂无频道数据</div>
          </div>
          <NDataTable
            v-else
            v-model:checked-row-keys="checkedRowKeysMap[mapItem[0]]"
            @update:checked-row-keys="handleTableCheck(mapItem[0], $event)"
            :columns="filteredColumns"
            :data="mapItem[1]"
            size="small"
            :scroll-x="1000"
            :row-key="(row) => row.line_guid"
            :pagination="false"
          />

          <!-- 表格下方统计信息 -->
          <div class="mt-3 flex justify-end">
            <NSpace>
              <NTag type="info" size="small"> {{ mapItem[1].length }} 个频道 </NTag>
              <NTag type="success" size="small">
                {{ getMapPlayerCount(mapItem[1]) }} 人在线
              </NTag>
            </NSpace>
          </div>
        </div>
      </NCard>
    </div>

    <!-- 加载更多按钮 -->
    <div v-if="hasMoreMaps" class="text-center py-4">
      <NButton
        type="primary"
        ghost
        :loading="isLoadingMore"
        @click="loadMoreMaps"
      >
        {{ isLoadingMore ? '正在加载...' : `加载更多地图 (${displayedMapCount}/${filteredMapData.length})` }}
      </NButton>
    </div>

    <!-- 设置最大人数模态框 -->
    <NModal
      v-model:show="showMaxPlayerModal"
      preset="dialog"
      title="设置频道最大人数"
      positive-text="确认"
      negative-text="取消"
      :loading="setMaxPlayerLoading"
      @positive-click="confirmSetMaxPlayer"
    >
      <NForm :model="maxPlayerForm" label-placement="left" :label-width="120">
        <NFormItem label="服务器ID">
          <span>{{ maxPlayerForm.serverId }}</span>
        </NFormItem>
        <NFormItem label="地图名称">
          <span>{{ getMapName(maxPlayerForm.mapId) }}</span>
        </NFormItem>
        <NFormItem label="频道GUID">
          <span>{{ maxPlayerForm.channelGuid }}</span>
        </NFormItem>
        <NFormItem label="最大人数" required>
          <NInputNumber
            v-model:value="maxPlayerForm.maxPlayer"
            :min="CONSTANTS.MIN_PLAYER_LIMIT"
            :max="CONSTANTS.MAX_PLAYER_LIMIT"
            placeholder="请输入最大人数"
            style="width: 100%"
          />
        </NFormItem>
      </NForm>
    </NModal>

    <!-- 批量操作弹窗 -->
    <BatchMapOperateModal
      v-model:visible="batchOperateModalVisible"
      @success="refreshData"
    />
  </div>
</template>

<style scoped>
.search-card {
  margin-bottom: 16px;
}

.search-label {
  font-weight: 500;
  color: var(--n-text-color);
  white-space: nowrap;
}

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

/* 添加操作按钮的样式 */
:deep(.n-button) {
  transition: all 0.3s ease;
}

:deep(.n-button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* 地图头部操作区域样式 */
.card-wrapper :deep(.n-card-header) {
  padding-bottom: 12px;
}

/* 表格操作列样式 */
:deep(.n-data-table td) {
  white-space: nowrap;
}

/* 操作按钮组间距 */
:deep(.n-space-item) {
  margin-right: 4px !important;
}
</style>
