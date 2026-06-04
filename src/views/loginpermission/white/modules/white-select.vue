<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { $t } from "@/locales";
import { serverWhiteOptions } from "@/constants/business";
import { translateOptions } from "@/utils/common";

defineOptions({
  name: "whiteSelect",
});

interface Emits {
  (e: "reset"): void;
  (e: "search", params: { type: string; param: string }): void;
}
const emit = defineEmits<Emits>();

const model = defineModel("model", {
  default: () => ({
    type: "",
    param: "",
  })
});

const translatedWhiteOptions = computed(() => [
  { label: $t("common.all" as any), value: "" },
  ...translateOptions(serverWhiteOptions),
]);

// 防抖函数
function useDebounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: number | null = null;
  return function(...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
}

function handleSearch() {
  emit("search", {
    type: model.value.type,
    param: model.value.param,
  });
}

// 创建防抖搜索函数
const debouncedSearch = useDebounce(handleSearch, 300);

// 监听type变化时自动搜索（不需要防抖，因为下拉选择不会频繁触发）
watch(
  () => model.value.type,
  () => {
    handleSearch();
  }
);

// 监听param变化时进行防抖搜索
watch(
  () => model.value.param,
  () => {
    debouncedSearch();
  }
);
</script>

<template>
  <NCard
    :bordered="false"
    size="small"
    class="card-wrapper"
    :title="$t('common.search')"
  >
    <NForm :model="model" label-placement="left" :label-width="100" inline>
      <NFormItem
        span="24 s:12"
        :label="$t('page.manage.serverwhite.type')"
        path="type"
      >
        <NSelect
          v-model:value="model.type"
          :placeholder="$t('page.manage.serverwhite.form.type')"
          :options="translatedWhiteOptions"
          style="width: 280px"
          clearable
        />
      </NFormItem>

      <NFormItem
        :label="$t('page.manage.serverwhite.param')"
        path="param"
      >
        <NInput
          v-model:value="model.param"
          :placeholder="$t('page.manage.serverwhite.form.param')"
          style="width: 280px"
          clearable
        />
      </NFormItem>
    </NForm>
  </NCard>
</template>

<style scoped></style>
