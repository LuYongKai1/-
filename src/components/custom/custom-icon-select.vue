<script lang="ts" setup>
import { computed, ref } from "vue";

defineOptions({ name: "CustomIconSelect" });

const iconList: string[] = [
  "mdi:emoticon",
  "mdi:ab-testing",
  "ph:alarm",
  "ph:android-logo",
  "ph:align-bottom",
  "ph:archive-box-light",
  "uil:basketball",
  "uil:brightness-plus",
  "uil:capture",
  "mdi:apps-box",
  "mdi:alert",
  "mdi:airballoon",
  "mdi:airplane-edit",
  "mdi:alpha-f-box-outline",
  "mdi:arm-flex-outline",
  "ic:baseline-10mp",
  "ic:baseline-access-time",
  "ic:baseline-brightness-4",
  "ic:baseline-brightness-5",
  "ic:baseline-credit-card",
  "ic:baseline-filter-1",
  "ic:baseline-filter-2",
  "ic:baseline-filter-3",
  "ic:baseline-filter-4",
  "ic:baseline-filter-5",
  "ic:baseline-filter-6",
  "ic:baseline-filter-7",
  "ic:baseline-filter-8",
  "ic:baseline-filter-9",
  "ic:baseline-filter-9-plus",
];

interface Props {
  /** Selected icon */
  value: string;
  /** List of icons */
  icons?: string[];
  /** Icon for when nothing is selected */
  emptyIcon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  emptyIcon: "mdi:apps",
});

interface Emits {
  (e: "update:value", val: string): void;
}

const emit = defineEmits<Emits>();

const modelValue = computed({
  get() {
    return props.value;
  },
  set(val: string) {
    emit("update:value", val);
  },
});

const selectedIcon = computed(() => modelValue.value || props.emptyIcon);

const searchValue = ref("");

const iconsList = computed(() => {
  if (props.icons && props.icons.length) {
    return props.icons.filter((v) => v.includes(searchValue.value));
  }else {
    return iconList.filter((v) => v.includes(searchValue.value))
  }
});

function handleChange(iconItem: string) {
  modelValue.value = iconItem;
}
</script>

<template>
  <NPopover placement="bottom-end" trigger="click">
    <template #trigger>
      <NInput v-model:value="modelValue" placeholder="点击选择图标">
        <template #suffix>
          <SvgIcon :icon="selectedIcon" class="p-5px text-30px" />
        </template>
      </NInput>
    </template>
    <template #header>
      <NInput v-model:value="searchValue" placeholder="搜索图标"></NInput>
    </template>
    <div
      v-if="iconsList.length > 0"
      class="grid grid-cols-9 h-auto overflow-auto"
    >
      <span
        v-for="iconItem in iconsList"
        :key="iconItem"
        @click="handleChange(iconItem)"
      >
        <SvgIcon
          :icon="iconItem"
          class="m-2px cursor-pointer border-1px border-#d9d9d9 p-5px text-30px"
          :class="{ 'border-primary': modelValue === iconItem }"
        />
      </span>
    </div>
    <NEmpty v-else class="w-306px" description="你什么也找不到" />
  </NPopover>
</template>

<style lang="scss" scoped>
:deep(.n-input-wrapper) {
  padding-right: 0;
}

:deep(.n-input__suffix) {
  border: 1px solid #d9d9d9;
}
</style>
