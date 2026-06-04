<script setup lang="ts">
import { reactive, ref, computed, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { $t } from "@/locales";
import { useServerStore } from "@/store/modules/server";

defineOptions({ name: "ProductsSearch" });

interface Emits {
  (e: "reset"): void;
  (e: "search", serverId: string, leixing: string): void;
}
const emit = defineEmits<Emits>();

// 表单模型
const model = reactive({
  serverId: "",
  leixing: "",
});

// 服务器数据
const serverStore = useServerStore();
const serverTreeOptions = computed(() => serverStore.serverTreeOptions);
const serverLoading = ref(false);

// 是否允许触发搜索（避免初始化时误触发）
const shouldTriggerSearch = ref(false);


// 计算服务器选项
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


// 获取服务器列表
async function getServerOptions() {
  serverLoading.value = true;
  try {
    await serverStore.fetchServerList();
  } catch (err) {
    console.error("Error fetching server options:", err);
  } finally {
    serverLoading.value = false;
  }
}

// 重置
function reset() {
  model.serverId = "";
  model.leixing = "";
  search();
  emit("reset");
}

// 搜索
function search() {
  if (!shouldTriggerSearch.value) return;
  emit("search", model.serverId, model.leixing);
}

// 防抖搜索函数（500ms）
const debounceSearch = useDebounceFn(search, 500);

// 初始化
async function initializeData() {
  await getServerOptions();
  shouldTriggerSearch.value = true;
  search();
}

// 监听表单任意字段变化
watch(
  () => [model.serverId, model.leixing],
  () => debounceSearch()
);

// 初始化数据
initializeData();
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
            filterable
            :filter="(pattern, option) => option.label.includes(pattern)"
          />
        </NFormItemGi>

        <!-- 操作按钮 -->
        <NFormItemGi span="24 m:18" >
          <NSpace class="w-full" justify="end">
            <NButton @click="reset">
              <template #icon>
                <icon-ic-round-refresh class="text-icon" />
              </template>
              {{ $t("common.reset") }}
            </NButton>
            <NButton type="primary" ghost @click="search">
              <template #icon>
                <icon-ic-round-search class="text-icon" />
              </template>
              {{ $t("common.search") }}
            </NButton>
          </NSpace>
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
