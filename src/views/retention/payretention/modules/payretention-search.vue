<script setup lang="ts">
/**
 * 留存数据搜索组件
 *
 * 功能模块：
 * - 时间选择：支持预设时间范围和自定义日期范围
 * - 数据分组：支持总和、渠道、服务器分组
 * - 数据显示：支持百分数和数值显示模式
 * - 渠道和服务器选择：支持多级选择
 *
 * 特点：
 * - 完整国际化支持
 * - 实时搜索响应
 * - 默认选择今天数据
 */
import { ref, watch, computed } from "vue";
import { $t } from "@/locales";
import { fetchGetChannelList, fetchGetServerList } from "@/service/api";
import type { SelectOption, SelectGroupOption } from "naive-ui";

defineOptions({
  name: "PayRetentionSearch",
});

interface Emits {
  (e: "reset"): void;
  (e: "search",  channelId: string, retentionGroupType: string, targetDay?: string | null, beginTime?: string, endTime?: string, retentionType?: string): void;
}
const emit = defineEmits<Emits>();

const channelOptions = ref<CommonType.Option<string>[]>([]);
const serverLoading = ref(false);
const channelLoading = ref(false);
const shouldTriggerSearch = ref(false);

const model = ref({
  channelId: "",
  retentionGroupType: "sum",
  retentionType: "percentage",
  targetDay: null as string | null,
  dateRange: null as [number, number] | null,
  datePreset: "last30days",
});

const retentionGroupTypeOptions = computed(() => [
  { label: $t('page.manage.retention.sum' as any), value: 'sum' },
  { label: $t('page.manage.retention.channel' as any), value: 'channel' },
]);

const displayModeOptions = computed(() => [
  { label: $t('page.manage.retention.percentage' as any), value: 'percentage' },
  { label: $t('page.manage.retention.value' as any), value: 'value' }
]);

const datePresetOptions = computed(() => [
  { label: $t('page.manage.retention.today' as any), value: 'today' },
  { label: $t('page.manage.retention.yesterday' as any), value: 'yesterday' },
  { label: $t('page.manage.retention.last7days' as any), value: 'last7days' },
  { label: $t('page.manage.retention.last14days' as any), value: 'last14days' },
  { label: $t('page.manage.retention.last30days' as any), value: 'last30days' },
  { label: $t('page.manage.retention.thisMonth' as any), value: 'thisMonth' },
  { label: $t('page.manage.retention.lastMonth' as any), value: 'lastMonth' },
  { label: $t('page.manage.retention.thisYear' as any), value: 'thisYear' },
  { label: $t('page.manage.retention.lastYear' as any), value: 'lastYear' },
]);

async function getChannelOptions() {
  channelLoading.value = true;
  try {
    const { error, data } = await fetchGetChannelList();

    if (error) {
      console.error("Failed to fetch channels:", error);
      channelOptions.value = [{ label: $t('common.all' as any), value: '' }];
      return;
    }
    const allOption: CommonType.Option<string> = {
      label: $t('common.all' as any),
      value: ''
    };
    const options = Array.isArray(data) ? data.map((item: Api.SystemManage.channel) => ({
      label: item.channelName,
      value: item.channelId,
    })) : [];
    channelOptions.value = [allOption, ...options];
  } catch (error) {
    console.error("Error fetching channel options:", error);
    channelOptions.value = [{ label: $t('common.all' as any), value: '' }];
  } finally {
    channelLoading.value = false;
  }
}

function handleDatePresetChange(value: string) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (value) {
    case 'today':
      startDate = new Date(now);
      endDate = new Date(now);
      break;
    case 'yesterday':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      endDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'last7days':
      startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      endDate = new Date(now);
      break;
    case 'last14days':
      startDate = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
      endDate = new Date(now);
      break;
    case 'last30days':
      startDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      endDate = new Date(now);
      break;
    case 'thisMonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now);
      break;
    case 'lastMonth':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'thisYear':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now);
      break;
    case 'lastYear':
      startDate = new Date(now.getFullYear() - 1, 0, 1);
      endDate = new Date(now.getFullYear() - 1, 11, 31);
      break;
    default:
      return;
  }

  model.value.dateRange = [startDate.getTime(), endDate.getTime()];
}

function resetForm() {
  model.value = {
    channelId: "",
    retentionGroupType: "sum",
    retentionType: "percentage",
    targetDay: null,
    dateRange: null,
    datePreset: "last30days",
  };

  handleDatePresetChange('last30days');
  emit("reset");
}

async function initializeData() {
  // 先获取渠道选项数据
  await Promise.all([
    getChannelOptions(),
  ]);

  // 设置默认日期，但还不启用搜索触发
  handleDatePresetChange('last30days');

  // 最后启用搜索触发，这时会自动触发一次搜索
  shouldTriggerSearch.value = true;
}

function formatDateToYYYYMMDD(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

watch(
  () => [model.value.channelId,model.value.retentionGroupType, model.value.targetDay, model.value.dateRange, model.value.retentionType],
  () => {
    if (!shouldTriggerSearch.value) return;

    let beginTime = "";
    let endTime = "";

    if (model.value.dateRange && model.value.dateRange.length === 2) {
      beginTime = formatDateToYYYYMMDD(model.value.dateRange[0]);
      endTime = formatDateToYYYYMMDD(model.value.dateRange[1]);
    }

    emit("search",
      model.value.channelId,
      model.value.retentionGroupType,
      model.value.targetDay,
      beginTime,
      endTime,
      model.value.retentionType
    );
  },
  { deep: true }
);

watch(
  () => model.value.datePreset,
  (newPreset) => {
    if (newPreset && shouldTriggerSearch.value) {
      handleDatePresetChange(newPreset);
    }
  }
);

initializeData();
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper" :title="$t('common.search')">
    <NForm :model="model" label-placement="left" :label-width="80">
      <NGrid responsive="screen" item-responsive>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.retention.selectTime')"
          path="datePreset"
          class="pr-24px"
        >
          <NSelect
            v-model:value="model.datePreset"
            :placeholder="$t('page.manage.retention.form.datePreset')"
            :options="datePresetOptions"
            clearable
            @update:value="handleDatePresetChange"
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.retention.dateRange')"
          path="dateRange"
          class="pr-24px"
        >
          <NDatePicker
            v-model:value="model.dateRange"
            type="daterange"
            :placeholder="$t('page.manage.retention.form.dateRange')"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.retention.retentionGroupType')"
          path="retentionGroupType"
          class="pr-24px"
        >
          <NSelect
            v-model:value="model.retentionGroupType"
            :placeholder="$t('page.manage.retention.form.retentionGroupType')"
            :options="retentionGroupTypeOptions"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.retention.retentionType')"
          path="retentionType"
          class="pr-24px"
        >
          <NSelect
            v-model:value="model.retentionType"
            :placeholder="$t('page.manage.retention.retentionType')"
            :options="displayModeOptions"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.retention.selectchannel')"
          path="channelId"
          class="pr-24px"
        >
          <NSelect
            v-model:value="model.channelId"
            :placeholder="$t('page.manage.retention.form.selectchannel')"
            :options="channelOptions"
            :loading="channelLoading"
            clearable
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
