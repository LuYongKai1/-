<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { $t } from "@/locales";

defineOptions({
  name: "RewardConfigSearch",
});

interface Emits {
  (e: "reset"): void;
  (e: "search"): void;
}

const emit = defineEmits<Emits>();

const model = defineModel<Api.SystemManage.RewardConfigSearchParams>("model", {
  required: true,
});

// 是否允许触发搜索（避免初始化时误触发）
const shouldTriggerSearch = ref(false);

const rewardTypeOptions = computed(() => [
  { label: "全部", value: null },
  { label: "个人", value: "INDIVIDUAL" },
  { label: "公会", value: "GUILD" },
]);

function reset() {
  emit("reset");
}

// 搜索
function search() {
  if (!shouldTriggerSearch.value) return;
  emit("search");
}

// 防抖搜索函数（500ms）
const debouncedSearch = useDebounceFn(search, 500);

// 监听表单字段变化，自动触发搜索
watch(
  () => [model.value.seasonId, model.value.rewardType],
  () => {
    if (shouldTriggerSearch.value) {
      debouncedSearch();
    }
  },
  { deep: true }
);

// 初始化
function initializeSearch() {
  shouldTriggerSearch.value = true;
  search();
}

// 组件挂载后初始化
initializeSearch();
</script>

<template>
  <NCard
    :bordered="false"
    size="small"
    class="card-wrapper"
    :title="$t('common.search')"
    name="rewardconfig-search"
  >
    <NForm
      :model="model"
      label-placement="left"
      :label-width="80"
    >
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi
          span="24 s:12 m:6"
          label="赛季ID"
          path="seasonId"
          class="pr-24px"
        >
          <NInputNumber
            v-model:value="model.seasonId"
            placeholder="请输入赛季ID"
            clearable
            :show-button="false"
            style="width: 100%"
          />
        </NFormItemGi>
        <NFormItemGi
          span="24 s:12 m:6"
          label="奖励类型"
          path="rewardType"
          class="pr-24px"
        >
          <NSelect
            v-model:value="model.rewardType"
            :options="rewardTypeOptions"
            placeholder="请选择奖励类型"
          />
        </NFormItemGi>
        <NFormItemGi span="24 m:12" class="pr-24px">
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

<style scoped></style>

