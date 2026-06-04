<script setup lang="ts">
/**
 * 订单搜索组件
 *
 * 功能模块：
 * - 渠道选择：支持渠道筛选
 * - 服务器选择：支持服务器筛选
 * - 订单查询：支持多种查询条件
 *
 * 特点：
 * - 完整国际化支持
 * - 实时搜索响应
 */
import { ref, computed, watch, nextTick } from "vue";
import { $t } from "@/locales";
import { fetchGetChannelList } from "@/service/api";
import {
  orderStatusOptions,
  callbackStatusOptions,
} from "@/constants/business";
import { useServerStore } from "@/store/modules/server";
import { debounce } from "@/utils/common";

defineOptions({
  name: "OrdersSearch",
});

interface Emits {
  (e: "reset"): void;
  (e: "search", params: any): void;
}
const emit = defineEmits<Emits>();

const channelOptions = ref<CommonType.Option<string>[]>([]);
const channelLoading = ref(false);
const serverStore = useServerStore();
const serverLoading = ref(false);

// 日期范围值
const dateRange = ref<[number, number] | null>(null);

const model = defineModel<{
  searchType?: string;
  searchValue?: string;
  channelId?: string;
  serverId?: string;
  status?: string;
  callbackStatus?: string;
  createTimeStart?: string;
  createTimeEnd?: string;
}>("model", {
  default: () => ({
    searchType: "",
    searchValue: "",
    channelId: "",
    serverId: "",
    status: "",
    callbackStatus: "",
    createTimeStart: "",
    createTimeEnd: "",
  }),
});

// 日期预设选项
const datePreset = ref("last7days");

// 搜索类型选项 - 移除渠道ID和服务器ID，因为它们现在是独立的选择框
const searchTypeOptions = computed(() => [
  { label: $t("page.manage.orders.openId"), value: "openId" },
  { label: $t("page.manage.orders.roleId"), value: "roleId" },
  { label: $t("page.manage.orders.itemId"), value: "itemId" },
  { label: $t("page.manage.orders.orderNo"), value: "orderNo" },
  {
    label: $t("page.manage.orders.outOrderNo"),
    value: "outOrderNo",
  },
  { label: $t("page.manage.orders.uid"), value: "uid" },
  { label: $t("page.manage.orders.loginName"), value: "loginName" },
]);

// 带有"全部"选项的订单状态选项
const orderStatusOptionsWithAll = computed(() => [
  { label: $t("common.all"), value: "" },
  ...orderStatusOptions,
]);

// 带有"全部"选项的回调状态选项
const callbackStatusOptionsWithAll = computed(() => [
  { label: $t("common.all"), value: "" },
  ...callbackStatusOptions,
]);

// 日期预设选项
const datePresetOptions = computed(() => [
  { label: $t('page.manage.retention.today' as any), value: 'today' },
  { label: $t('page.manage.retention.yesterday' as any), value: 'yesterday' },
  { label: $t('page.manage.retention.last7days' as any), value: 'last7days' },
  { label: $t('page.manage.retention.last14days' as any), value: 'last14days' },
  { label: $t('page.manage.retention.last30days' as any), value: 'last30days' },
  { label: $t('page.manage.retention.thisMonth' as any), value: 'thisMonth' },
  { label: $t('page.manage.retention.lastMonth' as any), value: 'lastMonth' },
]);

// 格式化日期为后端期望的格式 yyyy-MM-dd HH:mm:ss
function formatDateForBackend(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 处理日期预设变化
function handleDatePresetChange(value: string) {
  if (!value) {
    dateRange.value = null;
    return;
  }

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
    default:
      return;
  }

  dateRange.value = [startDate.getTime(), endDate.getTime()];
}

async function getChannelOptions() {
  channelLoading.value = true;
  try {
    const { error, data } = await fetchGetChannelList();

    if (error) {
      console.error("Failed to fetch channels:", error);
      channelOptions.value = [{ label: $t("common.all" as any), value: "" }];
      return;
    }
    const allOption: CommonType.Option<string> = {
      label: $t("common.all" as any),
      value: "",
    };
    const options = Array.isArray(data)
      ? data.map((item: Api.SystemManage.channel) => ({
          label: item.channelName,
          value: item.channelId.toString(),
        }))
      : [];
    channelOptions.value = [allOption, ...options];
  } catch (error) {
    console.error("Error fetching channel options:", error);
    channelOptions.value = [{ label: $t("common.all" as any), value: "" }];
  } finally {
    channelLoading.value = false;
  }
}

// 服务器选项，从server store获取
const serverOptions = computed(() => {
  const allOption: CommonType.Option<string> = {
    label: $t("common.all" as any),
    value: "",
  };

  const options: CommonType.Option<string>[] = [];
  serverStore.regionList.forEach((region: any) => {
    if (region.children && region.children.length > 0) {
      region.children.forEach((server: any) => {
        options.push({
          label: server.serverName || `服务器${server.serverId}`,
          value: server.serverId.toString(),
        });
      });
    }
  });

  return [allOption, ...options];
});

async function getServerOptions() {
  serverLoading.value = true;
  try {
    await serverStore.fetchServerList();
  } catch (error) {
    console.error("Error fetching server options:", error);
  } finally {
    serverLoading.value = false;
  }
}

function reset() {
  // 重置搜索条件到初始值
  model.value.searchType = "";
  model.value.searchValue = "";
  model.value.channelId = "";
  model.value.serverId = "";
  model.value.status = "";
  model.value.callbackStatus = "";
  model.value.createTimeStart = "";
  model.value.createTimeEnd = "";
  dateRange.value = null;
  datePreset.value = "";

  // 发送明确的空搜索参数来清除所有搜索条件
  const resetParams = {
    channelId: undefined,
    serverId: undefined,
    openId: undefined,
    roleId: undefined,
    itemId: undefined,
    orderNo: undefined,
    outOrderNo: undefined,
    uid: undefined,
    loginName: undefined,
    status: undefined,
    callbackStatus: undefined,
    createTimeStart: undefined,
    createTimeEnd: undefined,
  };

  // 先发送重置搜索参数
  emit("search", resetParams);
  // 然后触发重置事件
  emit("reset");
}

function handleSearch() {
  const params: any = {
    // 明确清除所有可能的搜索字段
    channelId: undefined,
    serverId: undefined,
    openId: undefined,
    roleId: undefined,
    itemId: undefined,
    orderNo: undefined,
    outOrderNo: undefined,
    uid: undefined,
    loginName: undefined,
    status: undefined,
    callbackStatus: undefined,
    createTimeStart: undefined,
    createTimeEnd: undefined,
  };

  // 添加渠道筛选条件
  if (model.value.channelId) {
    params.channelId = model.value.channelId;
  }

  // 添加服务器筛选条件
  if (model.value.serverId) {
    params.serverId = model.value.serverId;
  }

  // 添加当前选择的搜索条件
  if (model.value.searchType && model.value.searchValue) {
    params[model.value.searchType] = model.value.searchValue;
  }

  // 添加状态筛选条件
  if (model.value.status) {
    params.status = model.value.status;
  }
  if (model.value.callbackStatus) {
    params.callbackStatus = model.value.callbackStatus;
  }

  // 添加日期范围筛选条件
  if (model.value.createTimeStart) {
    params.createTimeStart = model.value.createTimeStart;
  }
  if (model.value.createTimeEnd) {
    params.createTimeEnd = model.value.createTimeEnd;
  }

  emit("search", params);
}

watch(
  () => [
    model.value.channelId,
    model.value.serverId,
    model.value.status,
    model.value.callbackStatus,
    model.value.createTimeStart,
    model.value.createTimeEnd,
  ],
  () => {
    handleSearch();
  }
);

// 监听日期范围变化，更新模型
watch(dateRange, (newRange) => {
  if (newRange && newRange.length === 2) {
    // 开始时间设置为当天的 00:00:00
    const beginDate = new Date(newRange[0]);
    beginDate.setHours(0, 0, 0, 0);
    model.value.createTimeStart = formatDateForBackend(beginDate.getTime());

    // 结束时间设置为当天的 23:59:59
    const endDate = new Date(newRange[1]);
    endDate.setHours(23, 59, 59, 999);
    model.value.createTimeEnd = formatDateForBackend(endDate.getTime());
  } else {
    model.value.createTimeStart = "";
    model.value.createTimeEnd = "";
  }
}, { deep: true });

// 监听日期预设变化
watch(datePreset, (newPreset) => {
  if (newPreset) {
    handleDatePresetChange(newPreset);
  }
});

// 监听搜索值变化，使用防抖避免频繁触发
watch(
  () => model.value.searchValue,
  debounce(() => {
    // 当搜索值为空时，也触发搜索以清除之前的搜索条件
    if (model.value.searchType) {
      handleSearch();
    }
  }, 500)
);

// 初始化数据
async function initializeData() {
  await Promise.all([getChannelOptions(), getServerOptions()]);
  // 设置默认日期范围为最近7天
  handleDatePresetChange('last7days');
}

initializeData();
</script>

<template>
  <NCard
    :bordered="false"
    size="small"
    class="card-wrapper"
    :title="$t('common.search')"
  >
    <NForm :model="model" label-placement="left" :label-width="80">
      <NGrid responsive="screen" item-responsive>
        <!-- 渠道选择 -->
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.orders.channelID')"
          path="channelId"
        >
          <NSelect
            v-model:value="model.channelId"
            :options="channelOptions"
            :loading="channelLoading"
            :placeholder="$t('page.manage.channel.form.channelId')"
            clearable
          />
        </NFormItemGi>

        <!-- 服务器选择 -->
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.orders.serverId')"
          path="serverId"
        >
          <NSelect
            v-model:value="model.serverId"
            :options="serverOptions"
            :loading="serverLoading"
            :placeholder="$t('page.manage.serveritem.form.serverId')"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.orders.status')"
          path="status"
        >
          <NSelect
            v-model:value="model.status"
            :options="orderStatusOptionsWithAll"
            :placeholder="$t('page.manage.orders.form.status')"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.orders.callbackStatus')"
          path="callbackStatus"
        >
          <NSelect
            v-model:value="model.callbackStatus"
            :options="callbackStatusOptionsWithAll"
            :placeholder="$t('page.manage.orders.form.callbackStatus')"
            clearable
          />
        </NFormItemGi>

        <!-- 选择时间预设 -->
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.retention.selectTime')"
          path="datePreset"
        >
          <NSelect
            v-model:value="datePreset"
            :placeholder="$t('page.manage.retention.form.datePreset')"
            :options="datePresetOptions"
            clearable
          />
        </NFormItemGi>

        <!-- 日期范围选择 -->
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.orders.createTime')"
          path="dateRange"
        >
          <NDatePicker
            v-model:value="dateRange"
            type="daterange"
            clearable
            :start-placeholder="$t('page.manage.operateLog.form.startDate')"
            :end-placeholder="$t('page.manage.operateLog.form.endDate')"
            format="yyyy-MM-dd"
            style="width: 100%;"
          />
        </NFormItemGi>

        <!-- 搜索条件 -->
        <NFormItemGi
          span="12 s:6 m:3"
          :label="$t('page.manage.orders.searchType')"
        >
          <NSelect
            v-model:value="model.searchType"
            :placeholder="$t('page.manage.orders.searchType')"
            :options="searchTypeOptions"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi
          span="12 s:6 m:3"
        >
          <NInput
            v-model:value="model.searchValue"
            :placeholder="$t('page.manage.orders.form.searchValue')"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi span="24 s:6 m:3">
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
