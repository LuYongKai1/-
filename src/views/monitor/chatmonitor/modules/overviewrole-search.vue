<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { $t } from "@/locales";
import { fetchGetServerList } from "@/service/api";
import type { TreeOption } from "naive-ui";
import { NInput } from "naive-ui";
import { useChannel } from "@/hooks/business/useChannel";

defineOptions({
  name: "ChatMonitorSearch",
});

interface FilterCondition {
  columnDesc: string;
  columnName: string;
  comparator: string;
  filterType: string;
  ftv: string[];
  specifiedClusterDate: string;
  subTableType: string;
  tableType: string;
  timeUnit: string;
}

interface Props {
  model?: {
    serverId?: string[];
    chatMsg?: string;
    accountId?: string;
    channel?: string[];
    jv?: string;
  };
}

const props = withDefaults(defineProps<Props>(), {
  model: undefined,
});

interface Emits {
  (e: "update:model", value: { serverId: string[]; chatMsg: string; accountId: string; channel: string[]; jv: string }): void;
  (e: "reset"): void;
  (e: "search", serverId: string[], filters?: FilterCondition[]): void;
}
const emit = defineEmits<Emits>();

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
    return '';
  }
  if (model.value.channel.length === 1) {
    const selected = channelOptions.value.find(opt => opt.value === model.value.channel![0]);
    return selected?.label || model.value.channel[0];
  }
  return `已选择 ${model.value.channel.length} 个渠道`;
});

const shouldTriggerSearch = ref(false);

// 使用 computed 来同步 props 和内部状态
const model = computed({
  get: () => {
    return props.model || {
      serverId: [] as string[],
      chatMsg: "",
      accountId: "",
      channel: [] as string[],
      jv: "4", // 默认值写死为 "4"
    };
  },
  set: (value: { serverId: string[]; chatMsg: string; accountId: string; channel: string[]; jv: string }) => {
    emit("update:model", value);
  },
});

// 计算选中的区服显示文本
const selectedServerText = computed(() => {
  if (!model.value.serverId || model.value.serverId.length === 0) {
    return '';
  }
  return `已选择 ${model.value.serverId.length} 个区服`;
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


// 重置表单
function resetForm() {
  model.value = {
    serverId: [],
    chatMsg: "",
    accountId: "",
    channel: [],
    jv: "4", // 重置时也保持默认值 "4"
  };
  emit("reset");
}

// 构建筛选条件数组
function buildFilters(): FilterCondition[] {
  const filters: FilterCondition[] = [];
  const today = new Date().toISOString().split('T')[0];

  // chat_msg 筛选条件
  if (model.value.chatMsg && model.value.chatMsg.trim()) {
    filters.push({
      columnDesc: "chat_msg",
      columnName: "chat_msg",
      comparator: "include",
      filterType: "SIMPLE",
      ftv: [model.value.chatMsg.trim()],
      specifiedClusterDate: today,
      subTableType: "",
      tableType: "event",
      timeUnit: ""
    });
  }

  // 账户ID筛选条件
  if (model.value.accountId && model.value.accountId.trim()) {
    filters.push({
      columnDesc: "账户ID",
      columnName: "#account_id",
      comparator: "equal",
      filterType: "SIMPLE",
      ftv: [model.value.accountId.trim()],
      specifiedClusterDate: today,
      subTableType: "",
      tableType: "event",
      timeUnit: ""
    });
  }

  // 区服ID筛选条件（支持多选）
  if (model.value.serverId && model.value.serverId.length > 0) {
    const serverIdArray = model.value.serverId.filter(id => id && id.trim().length > 0);
    if (serverIdArray.length > 0) {
      filters.push({
        columnDesc: "区服ID",
        columnName: "server_id",
        comparator: "equal",
        filterType: "SIMPLE",
        ftv: serverIdArray,
        specifiedClusterDate: today,
        subTableType: "",
        tableType: "event",
        timeUnit: ""
      });
    }
  }

  // 渠道筛选条件（支持多选）
  if (model.value.channel && model.value.channel.length > 0) {
    filters.push({
      columnDesc: "渠道",
      columnName: "channel",
      comparator: "equal",
      filterType: "SIMPLE",
      ftv: model.value.channel,
      specifiedClusterDate: today,
      subTableType: "",
      tableType: "event",
      timeUnit: ""
    });
  }

  // 注册jv筛选条件（默认值为 "4"，始终应用）
  const jvValue = (model.value.jv && model.value.jv.trim()) || "4";
  filters.push({
    columnDesc: "注册jv",
    columnName: "jv",
    comparator: "equal",
    filterType: "SIMPLE",
    ftv: [jvValue],
    specifiedClusterDate: today,
    subTableType: "",
    tableType: "event",
    timeUnit: ""
  });

  return filters;
}

// 初始化数据
async function initializeData() {
  await getServerList();
  await getChannelOptions();
  shouldTriggerSearch.value = true;
}

// 监听表单变化，自动触发搜索
watch(
  () => [model.value.serverId, model.value.chatMsg, model.value.accountId, model.value.channel, model.value.jv],
  () => {
    if (!shouldTriggerSearch.value) return;

    // 构建筛选条件
    const filters = buildFilters();

    emit("search", model.value.serverId || [], filters);
  },
  { deep: true }
);

initializeData();
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper" :title="$t('common.search')">
    <NForm :model="model" label-placement="left" :label-width="80">
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.retention.selectserver')"
          path="serverId"
          class="pr-24px"
        >
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

        <NFormItemGi
          span="24 s:12 m:6"
          label="chat_msg"
          path="chatMsg"
          class="pr-24px"
        >
          <NInput
            v-model:value="model.chatMsg"
            placeholder="请输入聊天消息内容（支持包含筛选）"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          label="账户ID"
          path="accountId"
          class="pr-24px"
        >
          <NInput
            v-model:value="model.accountId"
            placeholder="请输入账户ID（精确匹配）"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          label="渠道"
          path="channel"
          class="pr-24px"
        >
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
      </NGrid>
    </NForm>
  </NCard>
</template>

<style scoped>
.card-wrapper {
  margin-bottom: 16px;
}
</style>
