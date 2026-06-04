<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { NCard, NAlert, NSpin, NTree, NSpace, NButton, NEmpty } from 'naive-ui';
import type { TreeOption } from 'naive-ui';
import { useServerStore } from '@/store/modules/server';
import { fetchGetChannelRelation } from '@/service/api';
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';
import { $t } from '@/locales';

interface Props {
  visible: boolean;
  channelId?: string; // 渠道名称（channelName），用于API调用
  channelName?: string; // 渠道名称，用于显示
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  channelId: '',
  channelName: ''
});

// 区服分配相关状态
const serverStore = useServerStore();
const serverLoading = ref(false);
const selectedServerIds = defineModel<string[]>('selectedServerIds', {
  default: () => []
});

// 显示的渠道名称
const displayChannelName = computed(() => props.channelName || props.channelId);

// 创建树形结构的区服选项
const treeData = computed<TreeOption[]>(() => {
  return serverStore.regionList.map(region => {
    const regionKey = `region_${region.id}`;
    return {
      label: region.regionName,
      key: regionKey,
      isLeaf: false,
      checkable: false, // 专区节点不显示复选框
      children: (region.children || []).map(server => ({
        label: server.serverName,
        key: String(server.serverId),
        isLeaf: true
      }))
    };
  });
});

// 处理树节点选择
function handleTreeCheck(keys: Array<string | number>) {
  // 过滤掉专区节点（以 region_ 开头的key）
  selectedServerIds.value = keys.filter(key => !String(key).startsWith('region_')).map(String);
}

// 全选所有区服
function selectAll() {
  const allServerIds: string[] = [];
  serverStore.regionList.forEach(region => {
    if (region.children) {
      region.children.forEach(server => {
        allServerIds.push(String(server.serverId));
      });
    }
  });
  selectedServerIds.value = allServerIds;
}

// 清空选择
function clearAll() {
  selectedServerIds.value = [];
}

// 获取区服名称
function getServerName(serverId: string): string {
  for (const region of serverStore.regionList) {
    if (region.children) {
      const server = region.children.find(s => String(s.serverId) === serverId);
      if (server) {
        return server.serverName;
      }
    }
  }
  return serverId;
}

// 移除单个区服
function removeServer(serverId: string) {
  selectedServerIds.value = selectedServerIds.value.filter(id => id !== serverId);
}

// 获取区服列表
async function getServerList(): Promise<void> {
  try {
    serverLoading.value = true;
    await serverStore.fetchServerList();
  } catch (error) {
    console.error('获取区服列表失败:', error);
    window.$message?.error('获取区服列表失败');
  } finally {
    serverLoading.value = false;
  }
}

// 解析API响应数据
function parseResponseData(response: any): number[] | null {
  let data = null;

  if (response?.data !== undefined) {
    data = response.data;
  } else if (Array.isArray(response)) {
    data = response;
  } else if (response?.response?.data !== undefined) {
    data = response.response.data;
  } else {
    data = response;
  }

  // 处理数组格式
  if (Array.isArray(data)) {
    return data;
  }

  // 处理对象格式 { servers: [1011] }
  if (data?.servers && Array.isArray(data.servers)) {
    return data.servers;
  }

  return null;
}

// 获取渠道已分配的区服
async function getChannelServerIds(): Promise<void> {
  const channelName = props.channelId?.trim();


  if (!channelName) {
    selectedServerIds.value = [];
    return;
  }

  try {
    const response = await fetchGetChannelRelation({ channelId: channelName });

    const serverIds = parseResponseData(response);

    if (serverIds) {
      // 使用 nextTick 确保在下一个 DOM 更新周期后设置值
      await nextTick();
      selectedServerIds.value = serverIds.map(id => String(id));
    } else {
      console.warn('无法解析区服数据:', response);
      selectedServerIds.value = [];
    }
  } catch (error) {
    console.error('获取渠道区服关联失败:', error);
    selectedServerIds.value = [];
  }
}

// 加载数据
async function loadData(): Promise<void> {
  await getServerList();
  await getChannelServerIds();
}

// 监听可见性变化
watch(() => props.visible, async (visible) => {
  if (visible) {
    await loadData();
  }
}, { immediate: true });

// 监听渠道ID变化
watch(() => props.channelId, async (newChannelId) => {
  if (props.visible && newChannelId) {
    await getChannelServerIds();
  }
});

// 暴露方法供父组件使用
defineExpose({
  getServerList,
  loadData
});
</script>

<template>
  <NCard size="small" class="allocation-card">
    <template #header>
      <div class="allocation-header">
        {{ displayChannelName ? $t('page.manage.channel.serverAllocationTitle', { name: displayChannelName }) : $t('page.manage.channel.serverAllocation') }}
      </div>
    </template>

    <div class="allocation-content">
      <!-- 配置规则说明 -->
      <NAlert type="warning" class="rule-alert">
        <template #header>
          <span class="rule-title">{{ $t('page.manage.channel.configRules') }}</span>
        </template>
        <div class="rule-content">
          <div><strong>1. {{ $t('page.manage.channel.ruleDefaultAll') }}</strong>{{ $t('page.manage.channel.ruleDefaultAllDesc') }}</div>
          <div><strong>2. {{ $t('page.manage.channel.ruleSpecific') }}</strong>{{ $t('page.manage.channel.ruleSpecificDesc') }}</div>
        </div>
      </NAlert>

      <div class="section-header">
        <span class="section-title">{{ $t('page.manage.channel.selectServers') }}</span>
      </div>

      <NSpin :show="serverLoading">
        <div v-if="treeData.length > 0" class="transfer-layout">
          <!-- 左侧：可选区服树 -->
          <div class="transfer-panel left-panel">
            <div class="panel-header">
              <span class="panel-title">{{ $t('page.manage.channel.totalItems', { count: serverStore.serverList.length }) }}</span>
              <NButton text size="small" @click="selectAll">{{ $t('page.manage.channel.selectAll') }}</NButton>
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

          <!-- 右侧：已选区服列表 -->
          <div class="transfer-panel right-panel">
            <div class="panel-header">
              <span class="panel-title">{{ $t('page.manage.channel.selectedItems', { count: selectedServerIds.length }) }}</span>
              <NButton text size="small" @click="clearAll">{{ $t('page.manage.channel.clearAll') }}</NButton>
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
              <NEmpty v-else :description="$t('page.manage.channel.noData')" size="small" />
            </div>
          </div>
        </div>
        <NEmpty v-else :description="$t('page.manage.channel.noServerData')" />
      </NSpin>
    </div>
  </NCard>
</template>

<style scoped>
.allocation-card {
  margin-bottom: 0;
}

.allocation-header {
  font-size: 1rem;
  font-weight: 600;
  /* color: rgba(0, 0, 0, 0.85); */
}

.allocation-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rule-alert {
  margin-bottom: 1rem;
}

.rule-title {
  font-weight: 600;
}

.rule-content {
  line-height: 1.8;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 500;
  /* color: #c3cad4; */
}

/* 穿梭框布局 */
.transfer-layout {
  display: flex;
  gap: 1rem;
  height: 400px;
}

.transfer-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  /* background-color: #ffffff; */
  overflow: hidden;
  /* box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); */
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  /* border-bottom: 1px solid #e5e7eb; */
  /* background-color: #f9fafb; */
}

/* .panel-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
} */

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  /* background-color: #ffffff; */
}

/* 已选列表 */
/* .selected-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
} */

.selected-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  /* background-color: #f0f0f0; */
  border: 1px solid #e0e0e0;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  /* color: #333; */
  transition: all 0.2s;
}

.selected-item:hover {
  /* background-color: #e8e8e8; */
  border-color: #d0d0d0;
}

.remove-btn {
  font-size: 1.25rem;
  font-weight: bold;
  min-width: 24px;
}

</style>
