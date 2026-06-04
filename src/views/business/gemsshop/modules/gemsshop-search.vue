<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import { $t } from "@/locales";
import { useServerStore } from "@/store/modules/server";
import { debounce } from "@/utils/common";

defineOptions({
  name: "GemsshopSearch",
});

interface Emits {
  (e: "reset"): void;
  (
    e: "search",
    serverId: string,
    discountPrice: number | null,
    operator: string,
    searchTime: string | null
  ): void;
}
const emit = defineEmits<Emits>();

const serverStore = useServerStore();
const serverTreeOptions = computed(() => serverStore.serverTreeOptions);
const serverLoading = ref(false);
const shouldTriggerSearch = ref(false);

const model = ref({
  serverId: "",
  discountPrice: null,
  operator: "",
  searchTime: null,
});

const serverOptions = computed(() => {
  const allOption = { label: $t("common.all" as any), value: "" };
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
  return [allOption, ...options];
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
}

const debouncedSearch = debounce(
  (
    serverId: string,
    discountPrice: number | null,
    operator: string,
    searchTime: string
  ) => {
    emit("search", serverId, discountPrice, operator, searchTime);
  },
  500
);

watch(
  () => [
    model.value.serverId,
    model.value.discountPrice,
    model.value.operator,
    model.value.searchTime,
  ],
  () => {
    if (!shouldTriggerSearch.value) return;

    const saleStart = model.value.searchTime
      ? Math.floor(new Date(model.value.searchTime).getTime() / 1000)
      : "";

    debouncedSearch(
      model.value.serverId,
      model.value.discountPrice,
      model.value.operator,
      saleStart
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
          :label="$t('page.manage.Gems.discountPrice')"
          path="discountPrice"
          class="pr-24px"
        >
          <NInputNumber
            v-model:value="model.discountPrice"
            :placeholder="$t('page.manage.Gems.form.discountPrice')"
            clearable
            :show-button="false"
            style="width: 100%"
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.Gems.operator')"
          path="operator"
          class="pr-24px"
        >
          <NInput
            v-model:value="model.operator"
            :placeholder="$t('page.manage.Gems.form.operator')"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.Gems.searchTime')"
          path="searchTime"
          class="pr-24px"
        >
          <NDatePicker
            v-model:value="model.searchTime"
            type="datetime"
            clearable
            :placeholder="$t('page.manage.Gems.form.searchTime')"
            style="width: 100%"
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
