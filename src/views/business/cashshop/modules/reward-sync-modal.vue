<script setup lang="ts">
import { ref, watch, h, computed } from "vue";
import { NModal, NButton, NSpin, NTree, NEmpty, NDataTable, NTag } from "naive-ui";
import type { TreeOption, DataTableColumns } from "naive-ui";
import { fetchSyncReward } from "@/service/api";
import { useServerStore } from '@/store/modules/server';
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';

defineOptions({ name: "RewardSyncModal" });

interface Props {
  visible: boolean;
}

interface Emits {
  (e: "update:visible", visible: boolean): void;
  (e: "success"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const serverStore = useServerStore();

// 同步加载状态
const syncLoading = ref(false);

// 服务器加载状态
const serverLoading = ref(false);

// 选中的服务器ID（只存储服务器ID，不包含专区ID）
const selectedServerIds = ref<string[]>([]);

// 同步结果弹框
const resultModalVisible = ref(false);
const syncResults = ref<Array<{ serverId: string; serverName: string; success: boolean; error?: string }>>([]);

// 树形数据
const treeData = computed<TreeOption[]>(() => {
  if (!serverStore.regionList?.length) return [];
  return serverStore.regionList.map(region => ({
    label: region.regionName,
    key: `region_${region.id}`,
    isLeaf: false,
    checkable: false,
    children: (region.children || []).map(server => ({
      label: server.serverName,
      key: String(server.serverId),
      isLeaf: true
    }))
  }));
});

// 获取服务器列表
async function loadServerData() {
  serverLoading.value = true;
  try {
    if (!serverStore.regionList?.length) {
      await serverStore.fetchServerList();
    }
  } catch (error) {
    console.error("Error during fetch server list API call:", error);
  } finally {
    serverLoading.value = false;
  }
}

// 处理树节点选择
function handleTreeCheck(keys: Array<string | number>) {
  selectedServerIds.value = keys
    .filter(key => !String(key).startsWith('region_'))
    .map(String);
}

// 全选所有服务器
function selectAll() {
  const allServerIds: string[] = [];
  serverStore.regionList?.forEach(region => {
    region.children?.forEach(server => {
      allServerIds.push(String(server.serverId));
    });
  });
  selectedServerIds.value = allServerIds;
}

// 清空所有选择
function clearAll() {
  selectedServerIds.value = [];
}

// 移除单个服务器
function removeServer(serverId: string) {
  const index = selectedServerIds.value.indexOf(serverId);
  if (index > -1) {
    selectedServerIds.value.splice(index, 1);
  }
}

// 获取服务器名称
function getServerName(serverId: string): string {
  for (const region of serverStore.regionList || []) {
    const server = region.children?.find(s => String(s.serverId) === serverId);
    if (server) {
      return `${server.serverId}-${server.serverName || "Unknown Server"}`;
    }
  }
  return serverId;
}

// 确认同步
async function confirmSync() {
  if (!selectedServerIds.value || selectedServerIds.value.length === 0) {
    // @ts-ignore
    window.$message?.warning("请选择需要同步的区服");
    return;
  }

  try {
    syncLoading.value = true;
    // @ts-ignore
    window.$message?.info("正在同步中...");

    const serverIds = selectedServerIds.value.map(id => Number(id));
    const results: Array<{ serverId: number; success: boolean; message?: string }> = [];

    // 批量调用 API（传递 serverIds 数组）
    try {
      const response = await fetchSyncReward(serverIds as any);

      // 解析响应数据
      const resp = response as any;
      const responseData = resp?.response?.data?.code !== undefined
        ? resp.response.data
        : resp?.response?.data?.data || resp?.data?.data || resp?.data || resp?.response?.data || resp;
      const { code, msg, data } = responseData || {};

      // 检查是否有错误
      const hasError = handleApiResponseError(response, `批量同步发放商城`);

      if (!hasError && code === 200 && data) {
        // 解析返回的数据对象，键是服务器ID，值是同步结果消息
        // 示例: { "1001": "同步成功，共3条数据，但GM重载失败...", "1002": "同步成功..." }
        serverIds.forEach(serverId => {
          const serverIdStr = String(serverId);
          const resultMessage = data[serverIdStr];

          if (resultMessage) {
            // 判断是否成功（消息中包含"同步成功"表示成功）
            const isSuccess = resultMessage.includes('同步成功');
            results.push({
              serverId,
              success: isSuccess,
              message: resultMessage
            });
          } else {
            // 没有返回该服务器的结果
            results.push({
              serverId,
              success: false,
              message: '未返回同步结果'
            });
          }
        });
      } else {
        // 批量同步失败
        const errorMsg = msg || '同步失败';
        serverIds.forEach(serverId => {
          results.push({ serverId, success: false, message: String(errorMsg) });
        });
      }
    } catch (error: any) {
      // 捕获异常
      const errorMsg = error?.response?.data?.msg || error?.message || '同步失败';
      serverIds.forEach(serverId => {
        results.push({ serverId, success: false, message: String(errorMsg) });
      });
    }

    // 构建结果列表
    syncResults.value = [];
    let successCount = 0;
    let failCount = 0;

    results.forEach(result => {
      const server = serverStore.serverList.find(s => s.serverId === result.serverId);
      syncResults.value.push({
        serverId: String(result.serverId),
        serverName: server?.serverName || String(result.serverId),
        success: result.success,
        error: result.message
      });

      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    });

    // 显示消息提示
    if (failCount === 0) {
      // @ts-ignore
      window.$message?.success(`同步成功：${successCount}个服务器`);
      emit("success");
    } else if (successCount > 0) {
      // @ts-ignore
      window.$message?.warning(`同步完成：成功${successCount}个，失败${failCount}个`);
    } else {
      // @ts-ignore
      window.$message?.error(`同步失败：${failCount}个服务器`);
    }

    // 关闭主弹框并显示结果弹框
    emit("update:visible", false);
    selectedServerIds.value = [];

    if (syncResults.value.length > 0) {
      setTimeout(() => {
        resultModalVisible.value = true;
      }, 300);
    }

    if (failCount === 0) {
      emit("success");
    }
  } catch (error) {
    handleApiCatchError(error, '批量同步发放商城');
  } finally {
    syncLoading.value = false;
  }
}

// 关闭弹框
function handleClose() {
  emit("update:visible", false);
  selectedServerIds.value = [];
}

// 监听弹框显示状态
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    await loadServerData();
    selectedServerIds.value = [];
  }
});

// 结果表格列定义
const resultColumns = computed<DataTableColumns<typeof syncResults.value[0]>>(() => [
  {
    title: '服务器ID',
    key: 'serverId',
    align: 'center',
    width: 120
  },
  {
    title: '服务器名称',
    key: 'serverName',
    align: 'center',
    width: 200,
    ellipsis: { tooltip: true }
  },
  {
    title: '同步状态',
    key: 'success',
    align: 'center',
    width: 150,
    render: (row) => {
      return h(
        NTag,
        {
          type: row.success ? 'success' : 'error',
          style: 'min-width: 80px; text-align: center; display: flex; justify-content: center;'
        },
        { default: () => row.success ? '同步成功' : '同步失败' }
      );
    }
  },
  {
    title: '错误信息',
    key: 'error',
    align: 'center',
    ellipsis: { tooltip: true },
    render: (row) => {
      return row.error || '-';
    }
  }
]);
</script>

<template>
  <NModal
    :show="visible"
    preset="card"
    title="选择同步区服"
    style="width: 900px; max-width: 90vw;"
    class="sync-modal"
    @update:show="handleClose"
  >
    <div v-if="serverLoading" class="flex justify-center items-center py-12">
      <NSpin size="large" />
      <span class="ml-4 text-lg">加载中...</span>
    </div>

    <div v-else class="modal-content-wrapper">
      <div v-if="treeData.length > 0" class="transfer-layout">
        <!-- 左侧：可选服务器树 -->
        <div class="transfer-panel">
          <div class="panel-header">
            <span class="panel-title">共 {{ serverStore.serverList.length }} 项</span>
            <NButton text size="small" @click="selectAll">全选</NButton>
          </div>
          <div class="panel-body">
            <NTree
              :data="treeData"
              :checked-keys="selectedServerIds"
              checkable
              cascade
              expand-on-click
              @update:checked-keys="handleTreeCheck"
            />
          </div>
        </div>

        <!-- 右侧：已选服务器列表 -->
        <div class="transfer-panel">
          <div class="panel-header">
            <span class="panel-title">已选 {{ selectedServerIds.length }} 项</span>
            <NButton text size="small" @click="clearAll">清空</NButton>
          </div>
          <div class="panel-body">
            <div v-if="selectedServerIds.length > 0" class="selected-list">
              <div
                v-for="serverId in selectedServerIds"
                :key="serverId"
                class="selected-item"
              >
                <span>{{ getServerName(serverId) }}</span>
                <NButton
                  text
                  size="small"
                  @click="removeServer(serverId)"
                  class="remove-btn"
                >
                  ×
                </NButton>
              </div>
            </div>
            <NEmpty v-else description="暂无已选服务器" size="small" />
          </div>
        </div>
      </div>
      <NEmpty v-else description="暂无服务器数据" />
    </div>

    <template #footer>
      <div class="flex gap-2 justify-end">
        <NButton @click="handleClose" size="medium" :disabled="syncLoading">
          取消
        </NButton>
        <NButton
          type="primary"
          @click="confirmSync"
          :disabled="selectedServerIds.length === 0 || syncLoading"
          :loading="syncLoading"
          size="medium"
        >
          同步
        </NButton>
      </div>
    </template>
  </NModal>

  <!-- 同步结果弹框 -->
  <NModal
    v-model:show="resultModalVisible"
    preset="card"
    :title="`同步结果 (共 ${syncResults.length} 个服务器)`"
    style="width: 1200px; max-width: 95vw;"
    :mask-closable="true"
    :close-on-esc="true"
  >
    <div style="height: 500px; display: flex; flex-direction: column;">
      <NDataTable
        :columns="resultColumns"
        :data="syncResults"
        :bordered="true"
        size="small"
        :max-height="450"
        flex-height
        style="flex: 1;"
      />
    </div>
    <template #footer>
      <div class="flex justify-end">
        <NButton @click="resultModalVisible = false" size="medium">
          关闭
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
.modal-content-wrapper {
  min-height: 500px;
}

.transfer-layout {
  display: flex;
  gap: 1rem;
  height: 500px;
}

.transfer-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--n-border-color);
  border-radius: 0.5rem;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--n-divider-color);
}

.panel-title {
  font-size: 0.875rem;
  font-weight: 500;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
}

.selected-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.selected-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  border: 1px solid var(--n-border-color);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.selected-item:hover {
  border-color: var(--n-border-color-hover);
}

.remove-btn {
  font-size: 1.25rem;
  font-weight: bold;
  min-width: 24px;
}
</style>

