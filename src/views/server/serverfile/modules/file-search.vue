<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import type { TreeSelectOption } from "naive-ui";
import { $t } from "@/locales";
import { useServerStore } from "@/store/modules/server";
import { debounce } from "@/utils/common";

defineOptions({
  name: "FileSearch",
});

interface Emits {
  (e: "reset"): void;
  (
    e: "search",
    serverId: string,
    keyword?: string,
    resetPath?: boolean,
  ): void;
}
const emit = defineEmits<Emits>();

const serverStore = useServerStore();
const serverLoading = ref(false);
const shouldTriggerSearch = ref(false);

const model = ref({
  serverId: null,
  path: "",
  keyword: "",
});

// 树形选择器数据
const treeSelectOptions = computed<TreeSelectOption[]>(() => {
  const options: TreeSelectOption[] = [];

  // 添加专区和服务器
  if (serverStore.regionList?.length) {
    serverStore.regionList.forEach(region => {
      options.push({
        label: region.regionName,
        key: `region_${region.id}`,
        children: (region.children || []).map(server => ({
          label: server.serverName,
          key: String(server.serverId),
        }))
      });
    });
  }

  // 添加跨服节点
  if (serverStore.crossServerList?.length) {
    options.push({
      label: '跨服专区',
      key: 'cross_server_group',
      children: serverStore.crossServerList.map(crossServer => ({
        label: crossServer.serverName,
        key: `cross_${crossServer.serverId}`,
      }))
    });
  }

  return options;
});

function getAllServerIds(): number[] {
  const serverIds: number[] = [];

  // 获取普通服务器ID
  serverStore.regionList?.forEach((region: any) => {
    if (region.children && region.children.length > 0) {
      region.children.forEach((server: any) => {
        serverIds.push(Number(server.serverId));
      });
    }
  });

  // 获取跨服ID
  serverStore.crossServerList?.forEach((crossServer: any) => {
    serverIds.push(Number(crossServer.serverId));
  });

  return serverIds;
}

async function initializeData() {
  serverLoading.value = true;
  try {
    await serverStore.fetchServerList();
    // 获取跨服列表
    await serverStore.fetchCrossServerList();
  } catch (error) {
    console.error("Error fetching server list:", error);
  } finally {
    serverLoading.value = false;
  }

  // 不自动选择第一个服务器，保持为空
  shouldTriggerSearch.value = true;

  if (model.value.serverId) {
    emit("search", model.value.serverId, model.value.keyword, true);
  }
}


const debouncedSearch = debounce(
  (
    serverId: string,
    keyword?: string,
    resetPath?: boolean,
  ) => {
    // 处理跨服ID，去掉 cross_ 前缀
    const actualServerId = serverId?.startsWith('cross_')
      ? serverId.replace('cross_', '')
      : serverId;
    emit("search", actualServerId, keyword, resetPath);
  },
  500
);

// 监听服务器ID变化，重置路径
watch(
  () => model.value.serverId,
  () => {
    if (!shouldTriggerSearch.value) return;
    if (!model.value.serverId) return; // 如果没有选择服务器，不触发搜索
    debouncedSearch(
      model.value.serverId,
      model.value.keyword,
      true, // 服务器变化时重置路径
    );
  }
);

// 监听关键词变化，保持当前路径
watch(
  () => model.value.keyword,
  () => {
    if (!shouldTriggerSearch.value) return;
    if (!model.value.serverId) return; // 如果没有选择服务器，不触发搜索
    debouncedSearch(
      model.value.serverId,
      model.value.keyword,
      false, // 关键词变化时保持当前路径
    );
  }
);

onMounted(() => {
  initializeData();
});

// 暴露方法给父组件使用
defineExpose({
  getAllServerIds,
});
</script>

<template>
  <NCard
    :bordered="false"
    size="small"
    class="card-wrapper"
    :title="$t('common.search')"
  >
    <NForm :model="model" label-placement="left" :label-width="80">
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.retention.selectserver')"
          path="serverId"
          class="pr-24px"
        >
          <NTreeSelect
            v-model:value="model.serverId"
            :placeholder="$t('page.manage.retention.form.selectserver')"
            :options="treeSelectOptions"
            :loading="serverLoading"
            clearable
            filterable
            :show-path="true"
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('common.fileName')"
          path="keyword"
          class="pr-24px"
        >
          <NInput
            v-model:value="model.keyword"
            :placeholder="$t('common.fileNameSearch')"
            clearable
          />
        </NFormItemGi>

      </NGrid>
    </NForm>
  </NCard>
</template>

<style scoped>
.card-wrapper {
  margin-bottom: 16px;
}
</style>
