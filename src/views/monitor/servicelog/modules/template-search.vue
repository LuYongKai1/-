<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { $t } from '@/locales';
import type { SelectOption, SelectGroupOption } from 'naive-ui';
import {
  getTemplateOptions,
  getTemplateConfig,
  type TemplateConfig
} from '../config/template-config';
import { buildQueryParams } from '../config/template-config';
import { fetchGetServerList } from '@/service/api';
import { useChannel } from '@/hooks/business/useChannel';

defineOptions({
  name: 'TemplateSearch'
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search', templateConfig: TemplateConfig | null, queryParams: any): void;
  (e: 'template-change', templateConfig: TemplateConfig | null): void;
}

const emit = defineEmits<Emits>();

// 定义搜索参数接口
interface TemplateSearchParams {
  template?: string;
  startTime?: string;
  endTime?: string;
  serverId?: string[]; // 多选区服ID（使用树形复选框）
  channel?: string[];
  accountId?: string;
  petId?: string; // 灵宠ID（用于灵宠相关模板）
}

const model = defineModel<TemplateSearchParams>('model', { required: true });

// 是否允许触发搜索（避免初始化时误触发）
const shouldTriggerSearch = ref(false);

// 从配置文件获取模板选项（不包含"全部"选项）
const templateOptions = computed(() => {
  return getTemplateOptions();
});

// 当前选中的模板配置
const currentTemplateConfig = computed(() => {
  if (!model.value.template) return null;
  return getTemplateConfig(model.value.template);
});

// 初始化时间范围（默认今天）
function getDefaultTimeRange() {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setHours(23, 59, 59, 999);

  const formatDateTime = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  return {
    startTime: formatDateTime(startDate),
    endTime: formatDateTime(endDate),
  };
}

// 初始化默认时间
if (!model.value.startTime || !model.value.endTime) {
  const defaultTime = getDefaultTimeRange();
  model.value.startTime = defaultTime.startTime;
  model.value.endTime = defaultTime.endTime;
}

// 区服树形选项（从API获取）
interface TreeOption {
  key: string;
  label: string;
  children?: TreeOption[];
}

const serverTreeOptions = ref<TreeOption[]>([]);
const serverLoading = ref(false);
const serverPopoverVisible = ref(false);

// 使用渠道 hook
const { channelOptions: allChannelOptions, channelLoading, getChannelOptions } = useChannel();
const channelPopoverVisible = ref(false);

// 过滤掉"全部"选项
const channelOptions = computed(() => {
  return allChannelOptions.value.filter(opt => opt.value !== '');
});

// 计算选中的渠道显示文本
const selectedChannelText = computed(() => {
  if (!model.value.channel || model.value.channel.length === 0) {
    return '请选择渠道';
  }
  if (model.value.channel.length === 1) {
    const selected = channelOptions.value.find(opt => opt.value === model.value.channel![0]);
    return selected?.label || model.value.channel[0];
  }
  return `已选择 ${model.value.channel.length} 个渠道`;
});

// 获取区服列表并转换为树形结构
async function getServerList() {
  serverLoading.value = true;
  try {
    const responseWrapper = await fetchGetServerList();

    if (responseWrapper?.response?.data && Array.isArray(responseWrapper.response.data)) {
      const serverListData = responseWrapper.response.data;
      const treeData: TreeOption[] = serverListData.map((group: any) => ({
        key: `group_${group.id}`,
        label: group.groupName || `分组 ${group.id}`,
        children: Array.isArray(group.serverItems)
          ? group.serverItems.map((server: any) => ({
              key: String(server.serverId),
              label: `${server.serverId}-${server.serverName || '未知服务器'}`,
            }))
          : [],
      }));

      serverTreeOptions.value = treeData;
    } else {
      serverTreeOptions.value = [];
    }
  } catch (error) {
    serverTreeOptions.value = [];
  } finally {
    serverLoading.value = false;
  }
}


// 计算选中的区服显示文本
const selectedServerText = computed(() => {
  if (!model.value.serverId || model.value.serverId.length === 0) {
    return '请选择区服';
  }
  if (model.value.serverId.length === 1) {
    return `已选择 ${model.value.serverId.length} 个区服`;
  }
  return `已选择 ${model.value.serverId.length} 个区服`;
});

// 重置
function reset() {
  model.value.template = undefined;
  model.value.serverId = [];
  model.value.channel = [];
  model.value.accountId = '';
  model.value.petId = '';
  const defaultTime = getDefaultTimeRange();
  model.value.startTime = defaultTime.startTime;
  model.value.endTime = defaultTime.endTime;
  emit('template-change', null);
  search();
  emit('reset');
}

// 搜索
function search() {
  if (!shouldTriggerSearch.value) return;

  if (!model.value.template) {
    return;
  }

  const templateConfig = currentTemplateConfig.value;

  // 构建查询参数，包含过滤条件
  const queryParams = model.value.template && model.value.startTime && model.value.endTime
    ? buildQueryParams(
        model.value.template,
        model.value.startTime,
        model.value.endTime,
        '0-35',
        model.value.serverId,
        model.value.channel,
        model.value.accountId,
        model.value.petId
      )
    : null;

  emit('search', templateConfig, queryParams);
}

// 防抖搜索函数（500ms）
const debouncedSearch = useDebounceFn(search, 500);

// 监听模板变化
watch(
  () => model.value.template,
  (newValue) => {
    emit('template-change', currentTemplateConfig.value);
    // 只有选择了模板后才触发搜索
    if (shouldTriggerSearch.value && newValue) {
      debouncedSearch();
    }
  }
);

// 监听时间和过滤条件变化
watch(
  () => [model.value.startTime, model.value.endTime, model.value.serverId, model.value.channel, model.value.accountId, model.value.petId],
  () => {
    if (shouldTriggerSearch.value && model.value.template) {
      debouncedSearch();
    }
  },
  { deep: true }
);

// 初始化（延迟启用搜索触发）
function initializeSearch() {
  // 如果已有模板值，触发模板变化事件
  if (model.value.template) {
    emit('template-change', currentTemplateConfig.value);
  }
  // 延迟启用自动搜索，避免初始化时误触发
  setTimeout(() => {
    shouldTriggerSearch.value = true;
  }, 100);
}

// 组件挂载后初始化
onMounted(() => {
  getServerList();
  getChannelOptions();
  initializeSearch();
});
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper" :title="$t('common.search')">
    <NForm :model="model" label-placement="left" :label-width="80" @keyup.enter="search">
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi span="24 s:12 m:6" label="选择模板" path="template" class="pr-24px">
          <NSelect
            v-model:value="model.template"
            :options="templateOptions"
            placeholder="请选择模板"
            clearable
            filterable
          />
        </NFormItemGi>

        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.retention.selectserver')" path="serverId" class="pr-24px">
          <NPopover trigger="click" placement="bottom-start" v-model:show="serverPopoverVisible" :style="{ width: '300px' }">
            <template #trigger>
              <NInput
                :value="selectedServerText"
                readonly
                placeholder="请选择区服"
                clearable
                @clear="model.serverId = []"
              >
                <template #suffix>
                  <NIcon><icon-ic-baseline-arrow-drop-down /></NIcon>
                </template>
              </NInput>
            </template>
            <div style="max-height: 300px; overflow-y: auto;">
              <NTree
                v-model:checked-keys="model.serverId"
                :data="serverTreeOptions"
                :loading="serverLoading"
                checkable
                cascade
                expand-on-click
                :default-expand-all="false"
                selectable
                block-line
              />
            </div>
          </NPopover>
        </NFormItemGi>

        <NFormItemGi span="24 s:12 m:6" label="渠道" path="channel" class="pr-24px">
          <NPopover trigger="click" placement="bottom-start" v-model:show="channelPopoverVisible" :style="{ width: '300px' }">
            <template #trigger>
              <NInput
                :value="selectedChannelText"
                readonly
                placeholder="请选择渠道"
                clearable
                @clear="model.channel = []"
              >
                <template #suffix>
                  <NIcon><icon-ic-baseline-arrow-drop-down /></NIcon>
                </template>
              </NInput>
            </template>
            <div style="max-height: 300px; overflow-y: auto;">
              <NCheckboxGroup v-model:value="model.channel">
                <NSpace vertical>
                  <NCheckbox
                    v-for="option in channelOptions"
                    :key="option.value"
                    :value="option.value"
                    :label="option.label"
                  />
                </NSpace>
              </NCheckboxGroup>
            </div>
          </NPopover>
        </NFormItemGi>

        <NFormItemGi span="24 s:12 m:6" label="账户ID" path="accountId" class="pr-24px">
          <NInput
            v-model:value="model.accountId"
            placeholder="请输入账户ID（JV+角色）"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi span="24 s:12 m:6" label="灵宠ID" path="petId" class="pr-24px">
          <NInput
            v-model:value="model.petId"
            placeholder="请输入灵宠ID"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi span="24 s:18">
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

<style scoped>
.card-wrapper {
  margin-bottom: 16px;
}
</style>

