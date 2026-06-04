<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { NModal, NCard, NForm, NFormItem, NTree, NButton, NSpace, NSpin, NEmpty, NSelect, NPopconfirm } from "naive-ui";
import { Icon } from '@iconify/vue';
import { useServerStore } from "@/store/modules/server";
import { fetchOpenMap, fetchCloseMap, fetchKickMap, fetchGetMapData } from "@/service/api";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import { useItemPackage } from "@/hooks/business/useItemPackage";

defineOptions({
  name: "BatchMapOperateModal",
});

interface Emits {
  (e: "update:visible", visible: boolean): void;
  (e: "success"): void;
}

interface OperationProgress {
  current: number;
  total: number;
  success: number;
  failed: number;
}

interface OperationResult {
  serverId: string;
  success: boolean;
  error?: string;
}

type OperationType = 'open' | 'close' | 'kick';

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", {
  default: false,
});

const serverStore = useServerStore();

// ===== 常量定义 =====
const CONSTANTS = {
  GAME_ID: 101,
} as const;

const OPERATION_LABELS: Record<OperationType, string> = {
  open: '开启',
  close: '关闭',
  kick: '踢出全部'
} as const;

// ===== 响应式数据 =====
const serverLoading = ref(false);
const selectedServerIds = ref<string[]>([]);
const selectedMapId = ref<string>("");
const mapNameData = ref<Record<string, string>>({});
const operating = ref(false);
const operationLoading = ref<Record<OperationType, boolean>>({
  open: false,
  close: false,
  kick: false
});
const operationProgress = ref<OperationProgress>({ current: 0, total: 0, success: 0, failed: 0 });

// ===== 计算属性 =====
// 弹窗样式
const modalCardStyle = computed(() => ({
  width: '800px',
  maxWidth: '90vw'
}));

// 树形数据
const treeData = computed(() => {
  if (!serverStore.regionList?.length) return [];
  return serverStore.regionList.map(region => ({
    label: region.regionName,
    key: `region_${region.id}`,
    isLeaf: false,
    checkable: false,
    children: (region.children || []).map(server => ({
      label: `${server.serverId}-${server.serverName}`,
      key: String(server.serverId),
      isLeaf: true
    }))
  }));
});

// 地图选项
const mapOptions = computed(() => {
  return Object.entries(mapNameData.value).map(([mapId, mapName]) => ({
    label: `${mapName} (ID: ${mapId})`,
    value: mapId
  }));
});

// ===== 监听器 =====
watch(visible, async (newVal) => {
  if (newVal) {
    resetForm();
    await initializeData();
  }
});

// ===== 初始化函数 =====
async function initializeData() {
  serverLoading.value = true;
  try {
    if (!serverStore.regionList?.length) {
      await serverStore.fetchServerList();
    }
    // 加载地图名称数据
    if (Object.keys(mapNameData.value).length === 0) {
      try {
        const itemPackageData = await useItemPackage();
        if (itemPackageData?.data?.map) {
          mapNameData.value = itemPackageData.data.map;
        }
      } catch (error) {
        console.warn('获取地图名称数据失败:', error);
      }
    }
  } finally {
    serverLoading.value = false;
  }
}

// ===== 服务器选择相关函数 =====
function handleTreeCheck(keys: Array<string | number>) {
  selectedServerIds.value = keys
    .filter(key => !String(key).startsWith('region_'))
    .map(String);
}

function selectAllServers() {
  selectedServerIds.value = serverStore.regionList?.flatMap(region =>
    region.children?.map(server => String(server.serverId)) || []
  ) || [];
}

function clearAllServers() {
  selectedServerIds.value = [];
}

// ===== 表单管理函数 =====
function resetForm() {
  selectedServerIds.value = [];
  selectedMapId.value = "";
  operating.value = false;
  operationLoading.value = {
    open: false,
    close: false,
    kick: false
  };
  operationProgress.value = { current: 0, total: 0, success: 0, failed: 0 };
}

function closeModal() {
  visible.value = false;
  resetForm();
}

// ===== 数据获取函数 =====
async function getMapChannels(serverId: number, mapId: string): Promise<Array<{ channelId: number }>> {
  try {
    const response = await fetchGetMapData(serverId);
    const { data, error } = response;

    if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
      return [];
    }

    const channels: Array<{ channelId: number }> = [];
    const mapChannels = (data as Record<string, any>)[mapId];

    if (mapChannels && typeof mapChannels === 'object' && !Array.isArray(mapChannels)) {
      Object.entries(mapChannels).forEach(([, channelData]: [string, any]) => {
        if (channelData && typeof channelData === 'object' && channelData.channel_id !== undefined) {
          channels.push({ channelId: channelData.channel_id });
        }
      });
    }

    return channels;
  } catch (error) {
    console.error(`获取服务器 ${serverId} 地图 ${mapId} 的频道失败:`, error);
    return [];
  }
}

// ===== 批量操作函数 =====
async function executeBatchOperation(operation: OperationType) {
  if (selectedServerIds.value.length === 0) {
    window.$message?.warning('请先选择服务器');
    return;
  }

  if (!selectedMapId.value) {
    window.$message?.warning('请先选择地图');
    return;
  }

  // 设置当前操作的loading状态
  operating.value = true;
  operationLoading.value[operation] = true;
  operationProgress.value = {
    current: 0,
    total: selectedServerIds.value.length,
    success: 0,
    failed: 0
  };

  const results: OperationResult[] = [];

  try {
    // 遍历每个服务器
    for (const serverIdStr of selectedServerIds.value) {
      const serverId = Number(serverIdStr);
      operationProgress.value.current++;

      try {
        // 获取该服务器该地图的所有频道
        const channels = await getMapChannels(serverId, selectedMapId.value);

        if (channels.length === 0) {
          results.push({ serverId: serverIdStr, success: false, error: '该地图没有频道数据' });
          operationProgress.value.failed++;
          continue;
        }

        // 对每个频道执行操作
        const operationHandlers: Record<OperationType, (channelId: number) => Promise<any>> = {
          open: (channelId: number) => fetchOpenMap({
            gameId: CONSTANTS.GAME_ID,
            serverId,
            mapId: Number(selectedMapId.value),
            channelId
          }),
          close: (channelId: number) => fetchCloseMap({
            gameId: CONSTANTS.GAME_ID,
            serverId,
            mapId: Number(selectedMapId.value),
            channelId
          }),
          kick: (channelId: number) => fetchKickMap({
            gameId: CONSTANTS.GAME_ID,
            serverId,
            mapId: Number(selectedMapId.value),
            channelId
          })
        };

        // 并行执行所有频道的操作
        const channelResults = await Promise.allSettled(
          channels.map(channel => operationHandlers[operation](channel.channelId))
        );

        const successCount = channelResults.filter(r => r.status === 'fulfilled').length;
        const failedCount = channelResults.filter(r => r.status === 'rejected').length;

        if (failedCount === 0) {
          results.push({ serverId: serverIdStr, success: true });
          operationProgress.value.success++;
        } else {
          results.push({ serverId: serverIdStr, success: false, error: `${failedCount} 个频道操作失败` });
          operationProgress.value.failed++;
        }
      } catch (error) {
        results.push({ serverId: serverIdStr, success: false, error: String(error) });
        operationProgress.value.failed++;
      }
    }

    // 显示结果
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    if (successCount > 0) {
      window.$message?.success(`${OPERATION_LABELS[operation]}操作完成，成功: ${successCount} 个服务器，失败: ${failedCount} 个服务器`);
    } else {
      window.$message?.error(`${OPERATION_LABELS[operation]}操作失败，所有服务器操作均失败`);
    }

    // 如果有失败的操作，打印详细信息
    const failedResults = results.filter(r => !r.success);
    if (failedResults.length > 0) {
      console.error('失败的操作详情:', failedResults);
    }

    emit("success");
    // 操作完成后不关闭弹窗，重置操作状态以便继续操作
    operating.value = false;
    operationLoading.value[operation] = false;
    operationProgress.value = { current: 0, total: 0, success: 0, failed: 0 };
  } catch (error) {
    handleApiCatchError(error, OPERATION_LABELS[operation]);
    operating.value = false;
    operationLoading.value[operation] = false;
  }
}
</script>

<template>
  <NModal v-model:show="visible" :mask-closable="!operating">
    <NCard
      title="批量地图操作"
      :bordered="false"
      size="huge"
      role="dialog"
      aria-modal="true"
      closable
      class="batch-map-modal-card"
      :style="modalCardStyle"
      @close="closeModal"
    >
      <div class="space-y-4">
        <!-- 服务器选择 -->
        <div>
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm font-medium">选择服务器（已选择 {{ selectedServerIds.length }} 个）</span>
            <NSpace size="small">
              <NButton text size="small" @click="selectAllServers">全选</NButton>
              <NButton text size="small" @click="clearAllServers">清空</NButton>
            </NSpace>
          </div>
          <div v-if="serverLoading" class="flex justify-center items-center py-8">
            <NSpin size="small" />
            <span class="ml-2">加载中...</span>
          </div>
          <div v-else-if="treeData.length > 0" class="border rounded p-2 server-tree-container">
            <NTree
              :data="treeData"
              :checked-keys="selectedServerIds"
              checkable
              cascade
              expand-on-click
              @update:checked-keys="handleTreeCheck"
            />
          </div>
          <NEmpty v-else description="暂无服务器数据" />
        </div>

        <!-- 地图选择 -->
        <div v-if="!selectedMapId" class="text-xs text-gray-400 mb-2">
          💡 提示：请选择要操作的地图，支持通过地图名称或ID搜索
        </div>
        <NFormItem label="选择地图" required>
          <NSelect
            v-model:value="selectedMapId"
            :options="mapOptions"
            :placeholder="mapOptions.length > 0 ? '请选择要操作的地图（支持搜索地图名称或ID）' : '正在加载地图列表...'"
            filterable
            :disabled="operating"
            style="width: 100%"
          >
            <template #empty>
              <div class="text-center py-2 text-gray-400">
                暂无地图数据
              </div>
            </template>
          </NSelect>
        </NFormItem>

        <!-- 操作进度 -->
        <div v-if="operating" class="p-4 bg-gray-50 rounded">
          <div class="text-sm mb-2">操作进度：{{ operationProgress.current }} / {{ operationProgress.total }}</div>
          <div class="text-sm">
            <span class="text-green-600">成功: {{ operationProgress.success }}</span>
            <span class="ml-4 text-red-600">失败: {{ operationProgress.failed }}</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end gap-2 operation-buttons">
          <NButton :disabled="operating" @click="closeModal">取消</NButton>
          <NButton
            type="success"
            :disabled="operating || selectedServerIds.length === 0 || !selectedMapId"
            :loading="operationLoading.open"
            @click="executeBatchOperation('open')"
          >
            <template #icon>
              <Icon icon="ion:play-outline" />
            </template>
            批量开启
          </NButton>
          <NButton
            type="warning"
            :disabled="operating || selectedServerIds.length === 0 || !selectedMapId"
            :loading="operationLoading.close"
            @click="executeBatchOperation('close')"
          >
            <template #icon>
              <Icon icon="ion:stop-outline" />
            </template>
            批量关闭
          </NButton>
          <NPopconfirm
            :disabled="operating || selectedServerIds.length === 0 || !selectedMapId"
            @positive-click="executeBatchOperation('kick')"
          >
            <template #trigger>
              <NButton
                type="error"
                :disabled="operating || selectedServerIds.length === 0 || !selectedMapId"
                :loading="operationLoading.kick"
              >
                <template #icon>
                  <Icon icon="ion:people-outline" />
                </template>
                批量踢出全部
              </NButton>
            </template>
            确定要对选中的 {{ selectedServerIds.length }} 个服务器的地图执行踢出全部操作吗？
          </NPopconfirm>
        </div>
      </div>
    </NCard>
  </NModal>
</template>

<style scoped>
.space-y-4 > * + * {
  margin-top: 1rem;
}

.server-tree-container {
  height: 300px;
  overflow-y: auto;
}

.batch-map-modal-card {
  width: 800px;
  max-width: 90vw;
}

/* 小屏幕适配 */
@media (max-width: 768px) {
  .batch-map-modal-card {
    width: 95vw;
    max-width: 95vw;
  }

  .server-tree-container {
    height: 250px;
  }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
  .batch-map-modal-card {
    width: 100vw;
    max-width: 100vw;
    margin: 0;
  }

  .server-tree-container {
    height: 200px;
  }

  .operation-buttons {
    flex-direction: column;
  }

  .operation-buttons > * {
    width: 100%;
  }
}
</style>
