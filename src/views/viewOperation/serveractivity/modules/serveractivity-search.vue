<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import { $t } from "@/locales";
import { useServerStore } from "@/store/modules/server";
import { debounce } from "@/utils/common";
import type { SelectOption, SelectGroupOption } from "naive-ui";
import {
  serverActivityStatusOptions,
  callbackStatusOptions,
} from "@/constants/business";

defineOptions({
  name: "ServerActivitySearch",
});

interface Emits {
  (e: "reset"): void;
  (
    e: "search",
    serverId: string | null,
    activityGuid: string | number,
    state: string | null,
    searchTime: string,
    isCrossServer: boolean
  ): void;
}
const emit = defineEmits<Emits>();

const serverStore = useServerStore();
const serverTreeOptions = computed(() => serverStore.serverTreeOptions);
const crossServerList = computed(() => serverStore.crossServerList);
const serverLoading = ref(false);
const shouldTriggerSearch = ref(false);

const model = ref({
  serverId: null,
  activityGuid: null,
  state: null,
  searchTime: null,
});

const serverOptions = computed(() => {
  const options: (SelectOption | SelectGroupOption)[] = [];

  // 添加跨服专区分组
  if (crossServerList.value && crossServerList.value.length > 0) {
    const crossServerGroup: SelectGroupOption = {
      type: "group",
      label: "跨服专区",
      key: "cross_server_group",
      children: crossServerList.value.map((server: any) => ({
        label: server.serverName,
        value: `cross_${server.serverId}`,
      })),
    };
    options.push(crossServerGroup);
  }

  // 添加普通服务器分组
  serverTreeOptions.value.forEach((region: any) => {
    if (region.children && region.children.length > 0) {
      const serverGroup: SelectGroupOption = {
        type: "group",
        label: region.label,
        key: region.key,
        children: region.children.map((server: any) => ({
          label: server.label,
          value: server.key,
        })),
      };
      options.push(serverGroup);
    }
  });

  return options;
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
    await serverStore.fetchCrossServerList();
  } catch (error) {
    console.error("Error fetching server list:", error);
  } finally {
    serverLoading.value = false;
  }

  shouldTriggerSearch.value = true;

  if (model.value.serverId) {
    const isCrossServer = String(model.value.serverId).startsWith("cross_");
    const serverId = isCrossServer
      ? String(model.value.serverId).replace("cross_", "")
      : model.value.serverId;
    emit(
      "search",
      serverId,
      model.value.activityGuid || "",
      model.value.state,
      "",
      isCrossServer
    );
  }
}

const debouncedSearch = debounce(
  (
    serverId: string | null,
    activityGuid: string | number,
    state: string | null,
    searchTime: string,
    isCrossServer: boolean
  ) => {
    emit("search", serverId, activityGuid, state, searchTime, isCrossServer);
  },
  500
);

watch(
  () => [
    model.value.serverId,
    model.value.activityGuid || "",
    model.value.state,
    model.value.searchTime,
  ],
  () => {
    if (!shouldTriggerSearch.value) return;

    const saleStart = model.value.searchTime
      ? Math.floor(new Date(model.value.searchTime).getTime() / 1000).toString()
      : "";

    const isCrossServer = model.value.serverId
      ? String(model.value.serverId).startsWith("cross_")
      : false;
    const serverId = isCrossServer
      ? String(model.value.serverId).replace("cross_", "")
      : model.value.serverId;

    debouncedSearch(
      serverId,
      model.value.activityGuid || "",
      model.value.state,
      saleStart,
      isCrossServer
    );
  }
);

onMounted(() => {
  initializeData();
});

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
          <NSelect
            v-model:value="model.serverId"
            :placeholder="$t('page.manage.retention.form.selectserver')"
            :options="serverOptions"
            :loading="serverLoading"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.serveractivity.activityGuid')"
          path="activityGuid"
          label-width="90"
        >
          <NInputNumber
            v-model:value="model.activityGuid"
            :placeholder="$t('page.manage.serveractivity.form.activityGuid')"
            clearable
            :show-button="false"
            style="width: 100%"
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.serveractivity.state')"
          path="state"
        >
          <NSelect
            v-model:value="model.state"
            :options="serverActivityStatusOptions"
            :placeholder="$t('page.manage.serveractivity.form.state')"
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
