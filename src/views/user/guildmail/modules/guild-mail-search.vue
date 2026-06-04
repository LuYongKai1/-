<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { $t } from '@/locales';

defineOptions({
  name: 'GuildMailSearch'
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

// 定义多人邮件搜索参数接口，扩展基础分页参数
interface MultiMailSearchParams {
  current?: number;
  size?: number;
  operateUser?: string;
  mailRemark?: string;
  status?: string;
  beginTime?: string;
  endTime?: string;
}

const model = defineModel<MultiMailSearchParams>('model', { required: true });

// 是否允许触发搜索（避免初始化时误触发）
const shouldTriggerSearch = ref(false);

// 日期范围值
const dateRange = ref<[number, number] | null>(null);

// 状态选项
const statusOptions = [
  { label: $t('common.all'), value: '' },
  { label: '初始化', value: '0' },
  { label: '待发送', value: '1' },
  { label: '发送中', value: '2' },
  { label: '已完成', value: '3' },
  { label: '已撤销', value: '4' },
  { label: '已终止', value: '5' }
];

// 格式化日期为后端期望的 LocalDateTime 格式
function formatDateForBackend(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().slice(0, 19); // 格式: YYYY-MM-DDTHH:mm:ss
}

// 监听日期范围变化，更新模型
watch(dateRange, (newRange) => {
  if (newRange && newRange.length === 2) {
    // 开始时间设置为当天的 00:00:00
    const beginDate = new Date(newRange[0]);
    beginDate.setHours(0, 0, 0, 0);
    model.value.beginTime = formatDateForBackend(beginDate.getTime());

    // 结束时间设置为当天的 23:59:59
    const endDate = new Date(newRange[1]);
    endDate.setHours(23, 59, 59, 999);
    model.value.endTime = formatDateForBackend(endDate.getTime());
  } else {
    model.value.beginTime = '';
    model.value.endTime = '';
  }
}, { deep: true });

// 初始化日期范围（如果模型中已有值）
function initDateRange() {
  if (model.value.beginTime && model.value.endTime) {
    // 解析后端的 LocalDateTime 格式
    const beginTime = new Date(model.value.beginTime).getTime();
    const endTime = new Date(model.value.endTime).getTime();
    dateRange.value = [beginTime, endTime];
  }
}

// 重置
function reset() {
  // 清空所有搜索字段，保留分页参数
  model.value.operateUser = '';
  model.value.mailRemark = '';
  model.value.status = '';
  model.value.beginTime = '';
  model.value.endTime = '';
  dateRange.value = null;
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
    model.value.operateUser,
    model.value.mailRemark,
    model.value.status,
    model.value.beginTime,
    model.value.endTime
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
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper" :title="$t('common.search')">
    <NForm :model="model" label-placement="left" :label-width="80" @keyup.enter="search">
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.operateserver.operateUser')" path="operateUser" class="pr-24px">
          <NInput
            v-model:value="model.operateUser"
            :placeholder="$t('page.manage.operateserver.form.operateUser')"
            @keyup.enter="search"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.operateserver.mailRemark')" path="mailRemark" class="pr-24px">
          <NInput
            v-model:value="model.mailRemark"
            :placeholder="$t('page.manage.operateserver.form.mailRemark')"
            @keyup.enter="search"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.operateserver.mailStatus')" path="status" class="pr-24px">
          <NSelect
            v-model:value="model.status"
            :options="statusOptions"
            :placeholder="$t('page.manage.operateserver.form.mailStatus')"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.operateserver.timeRange')" path="dateRange" class="pr-24px">
          <NDatePicker
            v-model:value="dateRange"
            type="daterange"
            clearable
            :start-placeholder="$t('page.manage.operateserver.form.startTime')"
            :end-placeholder="$t('page.manage.operateserver.form.endTime')"
            format="yyyy-MM-dd"
            :separator="$t('page.manage.operateserver.form.separator')"
            style="width: 100%;"
          />
        </NFormItemGi>

        <!-- <NFormItemGi span="24 s:6 m:3">
          <NSpace class="w-full" justify="end">
            <NButton @click="reset">
              <template #icon>
                <icon-ic-round-refresh class="text-icon" />
              </template>
              {{ $t("common.reset") }}
            </NButton>
            <NButton type="primary" ghost @click="handleSearch">
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

<style scoped>

</style>
