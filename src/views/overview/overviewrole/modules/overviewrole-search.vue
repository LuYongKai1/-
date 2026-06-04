<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { $t } from "@/locales";
import { fetchGetChannelList, fetchGetServerList } from "@/service/api";
import type { SelectOption, SelectGroupOption } from "naive-ui";

defineOptions({
  name: "RetentionRoleSearch",
});

interface Emits {
  (e: "reset"): void;
  (e: "search", serverId: string, channelId: string, retentionGroupType: string, targetDay?: string | null, beginTime?: string, endTime?: string,): void;
}
const emit = defineEmits<Emits>();

const channelOptions = ref<CommonType.Option<string>[]>([]);
const serverOptions = ref<(SelectOption | SelectGroupOption)[]>([]);
const serverLoading = ref(false);
const channelLoading = ref(false);

const shouldTriggerSearch = ref(false);

const model = ref({
  channelId: "",
  serverId: "",
  retentionGroupType: "date",
  targetDay: null as string | null,
  dateRange: null as [number, number] | null,
  datePreset: "last30days",
});

const retentionGroupTypeOptions = computed(() => [
  { label: $t('page.manage.retention.date' as any), value: 'date' },
  { label: $t('page.manage.retention.channel' as any), value: 'channel' },
  { label: $t('page.manage.retention.server' as any), value: 'server' },
  { label: $t('page.manage.retention.combo' as any), value: 'combo' },
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

async function getServerOptions() {
  serverLoading.value = true;
  try {
    const responseWrapper = await fetchGetServerList();

    const allOption: SelectOption = {
      value: "",
      label: $t('common.all' as any)
    };
    let formattedOptions: (SelectOption | SelectGroupOption)[] = [allOption];
    if (responseWrapper?.response?.data && Array.isArray(responseWrapper.response.data)) {
      const serverListData = responseWrapper.response.data;
      const serverGroups: SelectGroupOption[] = serverListData.map((group: any) => ({
        type: "group",
        label: group.groupName || `Group ${group.id}`,
        key: group.id,
        children: Array.isArray(group.serverItems)
          ? group.serverItems.map((server: any) => ({
              value: server.serverId,
              label: `${server.serverId}-${server.serverName || "Unknown Server"}`,
            }))
          : [],
      }));

      formattedOptions = [...formattedOptions, ...serverGroups];
    } else {
      console.warn("Invalid server list data structure:", responseWrapper);
    }

    serverOptions.value = formattedOptions;
  } catch (error) {
    console.error("Error fetching server options:", error);
    serverOptions.value = [{ value: "", label: $t('common.all' as any) }];
  } finally {
    serverLoading.value = false;
  }
}

// 处理预设日期选择
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

  // 设置日期范围
  model.value.dateRange = [startDate.getTime(), endDate.getTime()];
}

function resetForm() {
  model.value = {
    channelId: "",
    serverId: "",
    retentionGroupType: "date",
    targetDay: null,
    dateRange: null,
    datePreset: "last30days",
  };

  // 重置后重新设置默认日期
  handleDatePresetChange('last30days');
  emit("reset");
}

// 初始化数据
async function initializeData() {
  await Promise.all([
    getChannelOptions(),
    getServerOptions()
  ]);

  handleDatePresetChange('last30days');

  shouldTriggerSearch.value = true;
}

// 日期格式转换工具函数
function formatDateToYYYYMMDD(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// 监听表单变化，自动触发搜索
watch(
  () => [model.value.channelId, model.value.serverId, model.value.retentionGroupType, model.value.targetDay, model.value.dateRange, ],
  () => {

    if (!shouldTriggerSearch.value) return;

    let beginTime = "";
    let endTime = "";

    if (model.value.dateRange && model.value.dateRange.length === 2) {
      beginTime = formatDateToYYYYMMDD(model.value.dateRange[0]);
      endTime = formatDateToYYYYMMDD(model.value.dateRange[1]);
    }

    emit("search",
      model.value.serverId,
      model.value.channelId,
      model.value.retentionGroupType,
      model.value.targetDay,
      beginTime,
      endTime,
    );
  },
  { deep: true }
);


// 监听预设日期选择变化
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
            filterable
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
