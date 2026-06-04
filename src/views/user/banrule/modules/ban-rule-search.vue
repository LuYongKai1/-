<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { $t } from '@/locales';

defineOptions({
  name: 'BanRuleSearch'
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

// 定义封禁规则搜索参数接口
interface BanRuleSearchParams {
  current?: number;
  size?: number;
  configType?: string;
  description?: string;
  banCount?: number | null;
  enabled?: number | null;
  configValue?: number | null;
  timeUnit?: string;
}

const model = defineModel<BanRuleSearchParams>('model', { required: true });

// 是否允许触发搜索（避免初始化时误触发）
const shouldTriggerSearch = ref(false);

// 配置类型选项
const configTypeOptions = [
  { label: '全部', value: '' },
  { label: '时间窗口', value: 'TIME_WINDOW' },
  { label: '惩罚规则', value: 'PENALTY_RULE' }
];

// 时间单位选项
const timeUnitOptions = [
  { label: '全部', value: '' },
  { label: '分钟', value: 'MINUTE' },
  { label: '小时', value: 'HOUR' },
  { label: '天', value: 'DAY' },
  { label: '月', value: 'MONTH' },
  { label: '年', value: 'YEAR' }
];

// 启用状态选项
const enabledOptions = [
  { label: '全部', value: '' },
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 }
];

// 重置
function reset() {
  // 清空所有搜索字段，保留分页参数
  model.value.configType = '';
  model.value.description = '';
  model.value.banCount = null;
  model.value.enabled = null;
  model.value.configValue = null;
  model.value.timeUnit = '';
  search(); // 重置后立即搜索
  emit('reset');
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
    model.value.configType,
    model.value.description,
    model.value.banCount,
    model.value.enabled,
    model.value.configValue,
    model.value.timeUnit
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
  shouldTriggerSearch.value = true;
  search();
}

// 组件挂载后初始化
initializeSearch();
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper" :title="$t('common.search')">
    <NForm :model="model" label-placement="left" :label-width="100" @keyup.enter="search">
      <NGrid responsive="screen" item-responsive>
        <!-- 配置类型 -->
        <NFormItemGi span="24 s:12 m:8" label="配置类型" path="configType" class="pr-24px">
          <NSelect
            v-model:value="model.configType"
            :options="configTypeOptions"
            placeholder="请选择配置类型"
            clearable
            style="width: 100%"
          />
        </NFormItemGi>



        <!-- 违规次数 -->
        <NFormItemGi span="24 s:12 m:8" label="违规次数" path="banCount" class="pr-24px">
          <NInputNumber
            v-model:value="model.banCount"
            placeholder="请输入违规次数"
            :min="1"
            clearable
            style="width: 100%"
            :show-button="false"
          />
        </NFormItemGi>

      </NGrid>
    </NForm>
  </NCard>
</template>

<style scoped>
/* 保持原有样式 */
.card-wrapper {
  margin-bottom: 16px;
}
</style>
