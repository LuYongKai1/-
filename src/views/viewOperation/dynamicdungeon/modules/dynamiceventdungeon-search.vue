<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import { $t } from "@/locales";
import { useServerStore } from "@/store/modules/server";
import { debounce } from "@/utils/common";

defineOptions({
  name: "DynamicEventDungeonSearch",
});

interface Emits {
  (e: "reset"): void;
  (
    e: "search",
    serverId: number | null,
    indunId: string | null,
    isClosed: boolean | null
  ): void;
}
const emit = defineEmits<Emits>();

const serverStore = useServerStore();
const serverTreeOptions = computed(() => serverStore.serverTreeOptions);
const serverLoading = ref(false);
const shouldTriggerSearch = ref(false);

// 定义动态副本状态选项
const dungeonStatusOptions = [
  { label: '开启', value: 0 },
  { label: '关闭', value: 1 },
];

const model = ref({
  serverId: null as number | null,
  indunId: null as string | null,
  isClosed: null as boolean | null,
});

const serverOptions = computed(() => {
  const options: CommonType.Option<string>[] = [];

  serverTreeOptions.value.forEach((region: any) => {
    if (region.children && region.children.length > 0) {
      region.children.forEach((server: any) => {
        options.push({
          label: server.label,
          value: server.key,
        });
      });
    }
  });

  return [...options];
});

function getAllServerIds(): number[] {
  const serverIds: number[] = [];

  serverTreeOptions.value.forEach((region: any) => {
    if (region.children && region.children.length > 0) {
      region.children.forEach((server: any) => {
        serverIds.push(Number(server.key));
      });
    }
  });

  return serverIds;
}

async function initializeData() {
  serverLoading.value = true;
  try {
    await serverStore.fetchServerList();
  } catch (error) {
    console.error("Error fetching server list:", error);
  } finally {
    serverLoading.value = false;
  }

  shouldTriggerSearch.value = true;

  if (model.value.serverId) {
    emit(
      "search",
      model.value.serverId,
      model.value.indunId || "",
      model.value.isClosed
    );
  }
}

const debouncedSearch = debounce(
  (
    serverId: number | null,
    indunId: string | null,
    isClosed: boolean | null
  ) => {
    emit("search", serverId, indunId, isClosed);
  },
  500
);

watch(
  () => [
    model.value.serverId,
    model.value.indunId || "",
    model.value.isClosed,
  ],
  () => {
    if (!shouldTriggerSearch.value) return;

    debouncedSearch(
      model.value.serverId,
      model.value.indunId || "",
      model.value.isClosed
    );
  }
);

onMounted(() => {
  initializeData();
});

// 重置搜索条件
function handleReset() {
  model.value.serverId = null;
  model.value.indunId = null;
  model.value.isClosed = null;
  emit("reset");
}

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
    <NForm :model="model" label-placement="left" :label-width="100">
      <NGrid responsive="screen" item-responsive>
        <!-- 区服选择 -->
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.retention.selectserver')"
          path="serverId"
          class="pr-24px"
        >
          <NSelect
            v-model:value="model.serverId"
            :placeholder="$t('page.manage.retention.form.selectserver')"
            :options="serverOptions"
            :loading="serverLoading"
            clearable
          />
        </NFormItemGi>

        <!-- 副本配置ID搜索 -->
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.dynamiceventdungeon.indunId')"
          path="indunId"
          class="pr-24px"
        >
          <NInput
            v-model:value="model.indunId"
            :placeholder="$t('page.manage.dynamiceventdungeon.indunId')"
            clearable
            style="width: 100%"
          />
        </NFormItemGi>

        <!-- 副本状态搜索 -->
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.dynamiceventdungeon.isClosed')"
          path="isClosed"
        >
          <NSelect
            v-model:value="model.isClosed"
            :options="dungeonStatusOptions"
            :placeholder="$t('page.manage.dynamiceventdungeon.form.isClosed')"
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
