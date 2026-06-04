<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import { $t } from "@/locales";
import { gsQuotaCycleTypeOptions, gsQuotaTaskStatusOptions } from "@/constants/business";
import { useDebounceFn } from "@vueuse/core";

defineOptions({
  name: "gsQuotaSearch",
});

interface Emits {
  (e: "reset"): void;
  (e: "search", params: any): void;
}
const emit = defineEmits<Emits>();

const model = defineModel<{
  roleId?: string;
  cycleType?: string;
  status?: string | number | null | undefined;
}>("model", {
  default: () => ({
    roleId: "",
    cycleType: "",
    status: "",
  }),
});

const maxRoleIdLength = 19;

// 是否允许触发搜索（避免初始化时误触发）
const shouldTriggerSearch = ref(false);

// 为周期类型选项添加"全部"选项
const cycleTypeOptionsWithAll = computed(() => {
  return [
    { label: $t('common.all'), value: '' },
    ...gsQuotaCycleTypeOptions
  ];
});

// 为任务状态选项添加"全部"选项
const statusOptionsWithAll = computed(() => {
  return [
    { label: $t('common.all'), value: '' },
    ...gsQuotaTaskStatusOptions
  ];
});

// 验证数字输入
function validateNumberInput(value: string): boolean {
  return /^\d*$/.test(value);
}

// 处理角色ID输入
function handleRoleIdInput(value: string) {
  if (validateNumberInput(value)) {
    if (value.length <= maxRoleIdLength) {
      model.value.roleId = value;
    }
  }
}

function reset() {
  // 重置搜索条件到初始值
  model.value.roleId = "";
  model.value.cycleType = "";
  model.value.status = "";

  // 发送明确的空搜索参数来清除所有搜索条件
  const resetParams = {
    roleId: undefined,
    cycleType: undefined,
    status: undefined,
  };

  // 先发送重置搜索参数
  emit("search", resetParams);
  // 然后触发重置事件
  emit("reset");
}

function handleSearch() {
  if (!shouldTriggerSearch.value) return;

  const params: any = {
    // 明确清除所有可能的搜索字段
    roleId: undefined,
    cycleType: undefined,
    status: undefined,
  };

  // 添加搜索字段
  if (model.value.roleId) {
    params.roleId = model.value.roleId;
  }
  if (model.value.cycleType) {
    params.cycleType = model.value.cycleType;
  }
  if (model.value.status !== null && model.value.status !== undefined && model.value.status !== '') {
    params.status = model.value.status;
  }

  emit("search", params);
}

// 防抖搜索函数（500ms）
const debouncedSearch = useDebounceFn(handleSearch, 500);

// 监听表单字段变化，自动触发搜索
watch(
  () => [
    model.value.roleId,
    model.value.cycleType,
    model.value.status,
  ],
  () => {
    if (shouldTriggerSearch.value) {
      debouncedSearch();
    }
  },
  { deep: true }
);

// 挂载时延迟启用搜索触发，避免初始化时误触发
onMounted(() => {
  setTimeout(() => {
    shouldTriggerSearch.value = true;
  }, 100);
});

</script>


<template>
  <NCard :bordered="false" size="small" class="card-wrapper" :title="$t('common.search')" name="user-search">
    <!-- <NCollapse> -->
      <!-- <NCollapseItem > -->
        <NForm :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>

            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.manage.gsQuota.roleId')"
              path="roleId"
              class="pr-24px"
            >
              <NInput
                :value="model.roleId"
                @update:value="handleRoleIdInput"
                :placeholder="$t('page.manage.gsQuota.roleId')"
                :maxlength="maxRoleIdLength"
                clearable
                style="width: 100%"
              />
            </NFormItemGi>


            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.manage.gsQuota.cycleType')"
              path="cycleType"
              class="pr-24px"
            >
              <NSelect
                v-model:value="model.cycleType"
                :options="cycleTypeOptionsWithAll"
                :placeholder="$t('page.manage.gsQuota.cycleType')"
                clearable
              />
            </NFormItemGi>

            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.manage.gsQuota.taskStatus')"
              path="status"
              class="pr-24px"
            >
              <NSelect
                v-model:value="model.status"
                :options="statusOptionsWithAll"
                :placeholder="$t('page.manage.gsQuota.taskStatus')"
                clearable
              />
            </NFormItemGi>

          </NGrid>
        </NForm>
      <!-- </NCollapseItem> -->
    <!-- </NCollapse> -->
  </NCard>
</template>


<style scoped>
</style>
