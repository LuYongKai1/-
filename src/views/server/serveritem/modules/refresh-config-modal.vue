<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { NModal, NSpin, NTree, NButton, NEmpty } from 'naive-ui';
import { $t } from '@/locales';
import { fetchRefreshConfig } from '@/service/api';
import type { TreeOption } from 'naive-ui';
import { useServerStore } from '@/store/modules/server';
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';

defineOptions({
  name: 'RefreshConfigModal'
});

interface Props {
  visible: boolean;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'update:visible', visible: boolean): void;
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const serverStore = useServerStore();

// 状态管理
const serverLoading = ref(false);  // 服务器列表加载状态
const submitting = ref(false);     // 提交中状态
const error = ref<string>('');     // 错误信息
const selectedServerIds = ref<string[]>([]);  // 已选服务器ID列表

/**
 * 构建树形数据结构
 */
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

/**
 * 监听弹框显示状态，打开时加载数据并重置状态
 */
watch(() => props.visible, async (newValue) => {
  if (newValue) {
    await loadServerData();
    resetState();
  }
});

/**
 * 加载服务器列表数据
 */
async function loadServerData() {
  serverLoading.value = true;
  error.value = '';

  try {
    if (!serverStore.regionList?.length) {
      await serverStore.fetchServerList();
    }
  } catch (err) {
    console.error('获取服务器数据失败:', err);
    error.value = '获取服务器数据失败';
  } finally {
    serverLoading.value = false;
  }
}

/**
 * 处理树节点选择，过滤掉区服节点，只保留服务器节点
 */
function handleTreeCheck(keys: Array<string | number>) {
  selectedServerIds.value = keys
    .filter(key => !String(key).startsWith('region_'))
    .map(String);
}

/**
 * 全选所有服务器
 */
function selectAll() {
  const allServerIds: string[] = [];

  serverStore.regionList?.forEach(region => {
    region.children?.forEach(server => {
      allServerIds.push(String(server.serverId));
    });
  });

  selectedServerIds.value = allServerIds;
}

/**
 * 清空所有已选服务器
 */
function clearAll() {
  selectedServerIds.value = [];
}

/**
 * 移除单个服务器
 */
function removeServer(serverId: string) {
  const index = selectedServerIds.value.indexOf(serverId);
  if (index > -1) {
    selectedServerIds.value.splice(index, 1);
  }
}

/**
 * 获取服务器显示名称（格式：serverId-serverName）
 */
function getServerName(serverId: string): string {
  for (const region of serverStore.regionList || []) {
    const server = region.children?.find(s => String(s.serverId) === serverId);
    if (server) {
      return `${server.serverId}-${server.serverName || 'Unknown Server'}`;
    }
  }
  return serverId;
}

/**
 * 重置状态
 */
function resetState() {
  error.value = '';
  selectedServerIds.value = [];
}

/**
 * 提交刷新配置请求
 */
async function handleSubmit() {
  // 验证是否选择了服务器
  if (selectedServerIds.value.length === 0) {
    window.$message?.warning($t('common.pleaseSelectServer'));
    return;
  }

  submitting.value = true;

  try {
    // 批量刷新配置 - 传递服务器ID数组
    const response = await fetchRefreshConfig(selectedServerIds.value);

    if (!handleApiResponseError(response, '刷新配置')) {
      const count = selectedServerIds.value.length;
      window.$message?.success(
        `${$t('common.operateSuccess')}！成功刷新 ${count} 个服务器的配置`
      );

      // 触发数据刷新
      emit('submitted');

      // 关闭弹框
      handleUpdateVisible(false);
    }
  } catch (error) {
    handleApiCatchError(error, '刷新配置');
  } finally {
    submitting.value = false;
  }
}

/**
 * 更新弹框显示状态
 */
function handleUpdateVisible(visible: boolean) {
  emit('update:visible', visible);
}
</script>

<template>
  <NModal
    :show="visible"
    preset="card"
    title="选择同步区服"
    style="width: 900px; max-width: 90vw;"
    class="sync-modal"
    @update:show="handleUpdateVisible"
  >
    <!-- 加载状态 -->
    <div v-if="serverLoading" class="flex justify-center items-center py-12">
      <NSpin size="large" />
      <span class="ml-4 text-lg">加载中...</span>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="text-center py-12">
      <div class="mb-4" style="color: var(--n-error-color);">
        <icon-mdi-alert-circle class="w-16 h-16 mx-auto" />
      </div>
      <p class="text-lg" style="color: var(--n-error-color);">{{ error }}</p>
    </div>

    <!-- 主内容区 -->
    <div v-else class="modal-content-wrapper">
      <!-- 穿梭框布局 -->
      <div v-if="treeData.length > 0" class="transfer-layout">
        <!-- 左侧面板：可选服务器树 -->
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

        <!-- 右侧面板：已选服务器列表 -->
        <div class="transfer-panel">
          <div class="panel-header">
            <span class="panel-title">已选 {{ selectedServerIds.length }} 项</span>
            <NButton text size="small" @click="clearAll">清空</NButton>
          </div>
          <div class="panel-body">
            <!-- 已选服务器列表 -->
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
            <!-- 空状态 -->
            <NEmpty v-else description="暂无已选服务器" size="small" />
          </div>
        </div>
      </div>

      <!-- 无数据状态 -->
      <NEmpty v-else description="暂无服务器数据" />
    </div>

    <!-- 底部操作按钮 -->
    <template #footer>
      <div class="flex gap-2 justify-end">
        <NButton
          @click="handleUpdateVisible(false)"
          size="medium"
          :disabled="submitting"
        >
          {{ $t("common.cancel") }}
        </NButton>
        <NButton
          type="primary"
          @click="handleSubmit"
          :disabled="selectedServerIds.length === 0 || submitting"
          :loading="submitting"
          size="medium"
        >
          {{ $t("common.confirm") }}
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


