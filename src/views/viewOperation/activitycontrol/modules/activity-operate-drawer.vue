<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { NDrawer, NDrawerContent, NButton, NSpace, NTree, NEmpty, NSpin } from "naive-ui";
import { useServerStore } from "@/store/modules/server";

defineOptions({
  name: "ActivityOperateDrawer",
});

interface Props {
  visible: boolean;
  activityName: string;
  operation: 'enable' | 'disable';
  loading?: boolean;
}

interface Emits {
  (e: "update:visible", visible: boolean): void;
  (e: "confirm", serverIds: string[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
});

const emit = defineEmits<Emits>();
const serverStore = useServerStore();

const selectedServerIds = ref<string[]>([]);
const serverLoading = ref(false);

const treeData = computed(() => {
  const nodes: any[] = [];

  // 添加普通服务器
  if (serverStore.regionList?.length) {
    const regionNodes = serverStore.regionList.map(region => ({
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
    nodes.push(...regionNodes);
  }

  // 添加跨服节点
  if (serverStore.crossServerList?.length) {
    nodes.push({
      label: '跨服专区',
      key: 'cross_server_group',
      isLeaf: false,
      checkable: false,
      children: serverStore.crossServerList.map(crossServer => ({
        label: `${crossServer.serverId}-${crossServer.serverName}`,
        key: `cross_${crossServer.serverId}`,
        isLeaf: true
      }))
    });
  }

  return nodes;
});

const selectedServerNames = computed(() => {
  if (!selectedServerIds.value.length) return '';

  const names: string[] = [];

  // 获取普通服务器名称
  serverStore.regionList?.forEach(region => {
    region.children?.forEach(server => {
      if (selectedServerIds.value.includes(String(server.serverId))) {
        names.push(server.serverName);
      }
    });
  });

  // 获取跨服服务器名称
  serverStore.crossServerList?.forEach(crossServer => {
    if (selectedServerIds.value.includes(`cross_${crossServer.serverId}`)) {
      names.push(`跨服-${crossServer.serverName}`);
    }
  });

  return names.join('、');
});

watch(() => props.visible, async (visible) => {
  if (visible) {
    selectedServerIds.value = [];

    serverLoading.value = true;
    try {
      if (!serverStore.regionList?.length) {
        await serverStore.fetchServerList();
      }
      // 获取跨服列表
      if (!serverStore.crossServerList?.length) {
        await serverStore.fetchCrossServerList();
      }
    } finally {
      serverLoading.value = false;
    }
  }
});

function handleTreeCheck(keys: Array<string | number>) {
  selectedServerIds.value = keys
    .filter(key => {
      const keyStr = String(key);
      return !keyStr.startsWith('region_') && keyStr !== 'cross_server_group';
    })
    .map(String);
}

function selectAllServers() {
  const regularServers = serverStore.regionList?.flatMap(region =>
    region.children?.map(server => String(server.serverId)) || []
  ) || [];

  const crossServers = serverStore.crossServerList?.map(crossServer =>
    `cross_${crossServer.serverId}`
  ) || [];

  selectedServerIds.value = [...regularServers, ...crossServers];
}

function clearAllServers() {
  selectedServerIds.value = [];
}

function handleConfirm() {
  if (selectedServerIds.value.length === 0) {
    window.$message?.warning('请先选择要操作的服务器');
    return;
  }

  // 处理服务器ID，将跨服ID转换为实际的serverId
  const actualServerIds = selectedServerIds.value.map(serverId => {
    if (serverId.startsWith('cross_')) {
      return serverId.replace('cross_', '');
    }
    return serverId;
  });

  emit('confirm', actualServerIds);
}

function handleCancel() {
  emit('update:visible', false);
}
</script>

<template>
  <NDrawer
    :show="visible"
    :width="600"
    :placement="'right'"
    @update:show="(val) => $emit('update:visible', val)"
  >
    <NDrawerContent
      :title="`${operation === 'enable' ? '开启' : '关闭'}${activityName}`"
      closable
    >
      <NSpin :show="loading" description="正在处理，请稍候...">
        <div class="flex flex-col h-full">
          <!-- 提示信息 -->
          <div class="mb-16px p-12px bg-blue-50 dark:bg-blue-900/20 rounded">
            <div class="text-14px text-blue-600 dark:text-blue-400 mb-4px">
              <icon-mdi-information class="align-text-bottom" />
              操作说明
            </div>
            <div class="text-12px text-gray-600 dark:text-gray-400">
              请在下方选择需要{{ operation === 'enable' ? '开启' : '关闭' }}活动的服务器
            </div>
          </div>

          <!-- 选中信息 -->
          <div v-if="selectedServerIds.length > 0" class="mb-16px p-12px bg-green-50 dark:bg-green-900/20 rounded">
            <div class="text-14px text-green-600 dark:text-green-400 mb-4px">
              <icon-mdi-check-circle class="align-text-bottom" />
              已选择 {{ selectedServerIds.length }} 个服务器
            </div>
            <div class="text-12px text-gray-600 dark:text-gray-400 line-clamp-3">
              {{ selectedServerNames }}
            </div>
          </div>

          <!-- 快捷操作 -->
          <div class="mb-16px">
            <NSpace>
              <NButton size="small" quaternary type="primary" :disabled="loading" @click="selectAllServers">
                <template #icon>
                  <icon-mdi-checkbox-multiple-marked />
                </template>
                全选
              </NButton>
              <NButton size="small" quaternary :disabled="loading" @click="clearAllServers">
                <template #icon>
                  <icon-mdi-checkbox-multiple-blank-outline />
                </template>
                清空
              </NButton>
            </NSpace>
          </div>

          <!-- 服务器树 -->
          <div class="flex-1 overflow-auto border border-gray-200 dark:border-gray-700 rounded p-8px">
            <NSpin :show="serverLoading">
              <NTree
                v-if="treeData.length > 0"
                :data="treeData"
                checkable
                cascade
                :checked-keys="selectedServerIds"
                :selectable="false"
                :expand-on-click="true"
                :default-expanded-keys="[]"
                :disabled="loading"
                block-line
                @update:checked-keys="handleTreeCheck"
              />
              <NEmpty v-else description="暂无服务器数据" />
            </NSpin>
          </div>
        </div>
      </NSpin>

      <template #footer>
        <NSpace justify="end">
          <NButton :disabled="loading" @click="handleCancel">
            取消
          </NButton>
          <NButton
            :type="operation === 'enable' ? 'success' : 'error'"
            :loading="loading"
            :disabled="selectedServerIds.length === 0 || loading"
            @click="handleConfirm"
          >
            {{ loading ? '处理中...' : `确认${operation === 'enable' ? '开启' : '关闭'}` }}
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
