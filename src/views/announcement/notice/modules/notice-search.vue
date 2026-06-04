<script setup lang="ts">
import { ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { $t } from '@/locales';

defineOptions({
  name: 'NoticeSearch'
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

// 定义公告搜索参数接口，扩展基础分页参数
interface NoticeSearchParams {
  current?: number;
  size?: number;
  filterParam?: string;
}

const model = defineModel<NoticeSearchParams>('model', { required: true });

// 是否允许触发搜索（避免初始化时误触发）
const shouldTriggerSearch = ref(false);

// 公告类型选项
const noticeTypeOptions = [
  { label: $t('common.all'), value: '' },
  { label: $t('page.manage.norice.noticeTypeOptions.channel'), value: 'channel' },
  { label: $t('page.manage.norice.noticeTypeOptions.server'), value: 'server' }
];

// 重置
function reset() {
  // 清空所有搜索字段，保留分页参数
  model.value.filterParam = 'channel'; // 重置为默认值
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
  () => model.value.filterParam,
  () => {
    if (shouldTriggerSearch.value) {
      debouncedSearch();
    }
  }
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
    <NForm :model="model" label-placement="left" :label-width="80" @keyup.enter="search">
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.norice.noticeTypeLabel')" path="filterParam" class="pr-24px">
          <NSelect
            v-model:value="model.filterParam"
            :options="noticeTypeOptions"
            :placeholder="$t('page.manage.norice.form.noticeType')"
          />
        </NFormItemGi>
      </NGrid>
    </NForm>
  </NCard>
</template>

<style scoped>
</style>
