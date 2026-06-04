<script setup lang="ts">
import { ref, watch, reactive } from "vue";
import { $t } from "@/locales";
import { gsOperateTypeOptions } from "@/constants/business";
import { useDebounceFn } from "@vueuse/core";

defineOptions({
  name: "OperateLogSearch",
});

interface Props {
  model: {
    operator?: string;
    operationType?: string | number | null;
    roleId?: string;
    startDate?: string;
    endDate?: string;
  };
}
const props = defineProps<Props>();

interface Emits {
  (e: "reset"): void;
  (e: "search"): void;
}
const emit = defineEmits<Emits>();

const localModel = reactive<Props["model"]>(
  props.model || {
    operator: "",
    operationType: null,
    roleId: "",
    startDate: "",
    endDate: "",
  }
);

const dateRange = ref<[number, number] | null>(null);
const shouldTriggerSearch = ref(true);
const maxRoleIdLength = 19;

// 验证数字输入
function validateNumberInput(value: string): boolean {
  return /^\d*$/.test(value);
}

// 处理角色ID输入
function handleRoleIdInput(value: string) {
  if (validateNumberInput(value)) {
    if (value.length <= maxRoleIdLength) {
      localModel.roleId = value;
    }
  }
}


// 格式化日期为后端需要的格式 (YYYY-MM-DD)
function formatDateForBackend(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 监听日期范围变化，更新模型
watch(dateRange, (newRange) => {
  if (newRange && newRange.length === 2) {
    localModel.startDate = formatDateForBackend(newRange[0]);
    localModel.endDate = formatDateForBackend(newRange[1]);
  } else {
    localModel.startDate = '';
    localModel.endDate = '';
  }
}, { deep: true });

// 初始化日期范围（如果模型中已有值）
function initDateRange() {
  if (localModel.startDate && localModel.endDate) {
    const startTime = new Date(localModel.startDate).getTime();
    const endTime = new Date(localModel.endDate).getTime();
    dateRange.value = [startTime, endTime];
  }
}

// 重置
function reset() {
  localModel.operator = '';
  localModel.operationType = null;
  localModel.roleId = '';
  localModel.startDate = '';
  localModel.endDate = '';
  dateRange.value = null;
  emit('reset');
  search();
}

// 搜索
function search() {
  if (!shouldTriggerSearch.value) return;
  emit('search');
}

// 防抖搜索函数（500ms）
const debouncedSearch = useDebounceFn(search, 500);

// 监听表单字段变化，自动触发搜索
watch(
  () => [
    localModel.operator,
    localModel.operationType,
    localModel.roleId,
    localModel.startDate,
    localModel.endDate
  ],
  () => {
    if (shouldTriggerSearch.value) {
      debouncedSearch();
    }
  },
  { deep: true }
);

// 初始化
function initializeSearch() {
  initDateRange();
  shouldTriggerSearch.value = true;
  search();
}

// 组件挂载后初始化
initializeSearch();

// 同步props变化
watch(
  () => props.model,
  (newModel) => {
    Object.assign(localModel, newModel);
  },
  { deep: true }
);
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper" :title="$t('common.search')">
    <NForm :model="localModel" label-placement="left" :label-width="80" @keyup.enter="search">
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.operateLog.operator')"
          path="operator"
          class="pr-24px"
        >
          <NInput
            v-model:value="localModel.operator"
            :placeholder="$t('page.manage.operateLog.form.operator')"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.operateLog.operationType')"
          path="operationType"
          class="pr-24px"
        >
          <NSelect
            v-model:value="localModel.operationType"
            :options="gsOperateTypeOptions"
            :placeholder="$t('page.manage.operateLog.form.operationType')"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.operateLog.roleId')"
          path="roleId"
          class="pr-24px"
        >
          <NInput
            :value="localModel.roleId"
            @update:value="handleRoleIdInput"
            :placeholder="$t('page.manage.operateLog.form.roleId')"
            :maxlength="maxRoleIdLength"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.operateserver.timeRange')"
          path="dateRange"
          class="pr-24px"
        >
          <NDatePicker
            v-model:value="dateRange"
            type="daterange"
            clearable
            :start-placeholder="$t('page.manage.operateLog.form.startDate')"
            :end-placeholder="$t('page.manage.operateLog.form.endDate')"
            format="yyyy-MM-dd"
            :separator="$t('page.manage.operateserver.form.separator')"
            style="width: 100%;"
          />
        </NFormItemGi>

        <!-- <NFormItemGi span="24 m:6" class="pr-24px">
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
        </NFormItemGi> -->

      </NGrid>
    </NForm>
  </NCard>
</template>

<style scoped></style>

