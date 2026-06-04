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

const model = defineModel<{
  searchType?: string;
  searchValue?: string;
  channelId?: string;
  serverId?: string;
  status?: string;
  callbackStatus?: string;
}>("model", {
  default: () => ({
    searchType: "",
    searchValue: "",
    channelId: "",
    serverId: "",
    status: "",
    callbackStatus: "",
  }),
});

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

  emit("search", params);
}

// 监听筛选条件变化，自动触发搜索
watch(
  () => [
    model.value.channelId,
    model.value.serverId,
    model.value.status,
    model.value.callbackStatus,
  ],
  () => {
    handleSearch();
  }
);

/**
 * 监听搜索值变化
 * 场景：当用户点击搜索框的清除按钮（×）时，自动重新搜索以清除筛选条件
 */
watch(
  () => model.value.searchValue,
  (newValue, oldValue) => {
    // 从有值变为空值时，触发搜索重新加载数据
    if (oldValue && !newValue && model.value.searchType) {
      handleSearch();
    }
  }
);

// 初始化渠道和服务器选项
(async function initializeData() {
  await Promise.all([getChannelOptions(), getServerOptions()]);
})();
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

        <NFormItemGi span="24 s:18">
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
