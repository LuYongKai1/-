<script setup lang="ts">
import { ref, watch, h, computed } from "vue";
import { NModal, NButton, NSpin, NTree, NEmpty, NDataTable, NTag } from "naive-ui";
import type { TreeOption, DataTableColumns } from "naive-ui";
import { fetchSyncStore } from "@/service/api";
import { useServerStore } from '@/store/modules/server';
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';

defineOptions({ name: "StoreSyncModal" });

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
    checkable: false, // 专区节点不显示复选框
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
  // 过滤掉专区节点（以 region_ 开头的key），只保留服务器ID
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
  // 检查是否选择了区服
  if (!selectedServerIds.value || selectedServerIds.value.length === 0) {
    // @ts-ignore
    window.$message?.warning("请选择需要同步的区服");
    return;
  }

  try {
    syncLoading.value = true;
    // @ts-ignore
    window.$message?.info("正在同步中...");

    // 将服务器ID转换为数字
    const serverIds = selectedServerIds.value.map(id => Number(id));

    // 批量同步选中的服务器（一次性传递所有serverIds）
    const response = await fetchSyncStore(serverIds);

    // 解析响应数据
    const resp = response as any;
    const responseData = resp?.response?.data?.code !== undefined
      ? resp.response.data
      : resp?.response?.data?.data || resp?.data?.data || resp?.data || resp?.response?.data || resp;
    const { code, data } = responseData || {};

    // 检查业务错误
    handleApiResponseError(response, "同步内置商城");

    if (code === 200 && data && typeof data === 'object') {
      // data字段是一个对象，key是服务器ID，value是错误信息或提示信息
      // 如果data中有某个服务器ID，说明该服务器有信息需要展示
      // 如果data中没有某个服务器ID，说明该服务器同步成功
      const serversWithInfo: Array<{ serverId: string; message: string; isError: boolean }> = [];
      const successServerIds: number[] = [];

      // 遍历所有选中的服务器ID
      serverIds.forEach(serverId => {
        const serverIdStr = String(serverId);
        // 检查data中是否有该服务器ID
        if (data && typeof data === 'object' && data[serverIdStr]) {
          // 如果data中有该服务器ID，说明有信息需要展示
          const message = String(data[serverIdStr]);
          // 判断是否是错误信息（包含"失败"、"错误"等关键词）
          const isError = message.includes('失败') || message.includes('错误') || message.includes('Exception');
          serversWithInfo.push({
            serverId: serverIdStr,
            message: message,
            isError: isError
          });
        } else {
          // 如果data中没有该服务器ID，说明同步成功
          successServerIds.push(serverId);
        }
      });

      // 计算成功和失败的数量
      const successCount = successServerIds.length;
      const failCount = serversWithInfo.filter(s => s.isError).length;
      const infoCount = serversWithInfo.filter(s => !s.isError).length;

      // 构建结果列表
      syncResults.value = [];

      // 添加成功的服务器
      successServerIds.forEach(serverId => {
        const server = serverStore.serverList.find(s => s.serverId === serverId);
        syncResults.value.push({
          serverId: String(serverId),
          serverName: server?.serverName || String(serverId),
          success: true
        });
      });

      // 添加有信息的服务器（包括失败和提示信息）
      serversWithInfo.forEach(item => {
        const server = serverStore.serverList.find(s => String(s.serverId) === item.serverId);
        syncResults.value.push({
          serverId: item.serverId,
          serverName: server?.serverName || item.serverId,
          success: !item.isError, // 如果不是错误，标记为成功
          error: item.message // 显示消息内容
        });
      });

      // 显示同步结果消息和弹框
      const totalCount = syncResults.value.length;
      const hasResults = totalCount > 0;

      // 显示消息提示
      if (failCount === 0 && infoCount === 0) {
        // @ts-ignore
        window.$message?.success(`同步成功：${successCount}个服务器`);
        emit("success");
      } else if (failCount > 0) {
        // @ts-ignore
        window.$message?.[successCount > 0 || infoCount > 0 ? 'warning' : 'error'](
          successCount > 0 || infoCount > 0
            ? `同步完成：成功${successCount + infoCount}个，失败${failCount}个`
            : `同步失败：${failCount}个服务器`
        );
      } else {
        // @ts-ignore
        window.$message?.info(`同步完成：${totalCount}个服务器`);
      }

      // 关闭主弹框并显示结果弹框
      emit("update:visible", false);
      selectedServerIds.value = [];

      if (hasResults) {
        setTimeout(() => {
          resultModalVisible.value = true;
        }, 300);
      }

      if (failCount === 0) {
        emit("success");
      }
    } else {
      // 请求失败或响应格式错误
      emit("update:visible", false);
      selectedServerIds.value = [];
    }
  } catch (error) {
    handleApiCatchError(error, '批量同步内置商城');
  } finally {
    syncLoading.value = false;
  }
}

// 关闭弹框
function handleClose() {
  emit("update:visible", false);
  selectedServerIds.value = [];
}

// 监听弹框显示状态，打开时加载服务器列表
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
          <template #icon>
          </template>
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

