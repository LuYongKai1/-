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
import { ref, watch, onMounted, computed } from "vue";
import { $t } from "@/locales";
import { fetchGetServerList } from "@/service/api";
import type { SelectOption, SelectGroupOption } from "naive-ui";
import { useDebounceFn } from "@vueuse/core";

defineOptions({
  name: "TreasureSearch",
});

interface Emits {
  (e: "reset"): void;
  (e: "search", params: any): void;
}
const emit = defineEmits<Emits>();

const serverLoading = ref(false);

const model = defineModel<{
  serverId?: string | null;
  openId?: string;
  roleId?: string;
  itemId?: string;
  iuid?: string;
  consignmentId?: string;
  status?: string;
}>("model", {
  default: () => ({
    serverId: null,
    openId: "",
    roleId: "",
    itemId: "",
    iuid: "",
    consignmentId: "",
    status: "",
  }),
});

// 是否允许触发搜索（避免初始化时误触发）
const shouldTriggerSearch = ref(false);

// 服务器选项状态
const serverOptions = ref<(SelectOption | SelectGroupOption)[]>([]);

// 状态选项
const statusOptions = computed(() => [
  { label: $t("page.manage.treasure.allStatus"), value: "" },
  { label: $t("page.manage.treasure.statusAvailable"), value: "AVAILABLE" },
  { label: $t("page.manage.treasure.statusProcessing"), value: "PROCESSING" },
]);

// 获取服务器列表
async function getServerOptions() {
  serverLoading.value = true;
  try {
    const responseWrapper = await fetchGetServerList();
    let formattedOptions: (SelectOption | SelectGroupOption)[] = [];

    if (
      responseWrapper &&
      responseWrapper.response &&
      responseWrapper.response.data
    ) {
      const serverListData = responseWrapper.response.data;
      if (Array.isArray(serverListData)) {
        const serverGroups: SelectGroupOption[] = serverListData.map(
          (group: any) => ({
            type: "group",
            label: group.groupName || `Group ${group.id}`,
            key: group.id,
            children: Array.isArray(group.serverItems)
              ? group.serverItems.map((server: any) => ({
                  value: server.serverId,
                  label: `${server.serverId}-${
                    server.serverName || "Unknown Server"
                  }`,
                }))
              : [],
          })
        );
        formattedOptions = formattedOptions.concat(serverGroups);
      } else {
        console.error(
          "Server list data (in response.response.data) is not an array:",
          serverListData
        );
      }
    } else {
      console.error(
        "Failed to fetch server list, responseWrapper.response or responseWrapper.response.data is missing:",
        responseWrapper
      );
    }
    serverOptions.value = formattedOptions;
  } catch (error) {
    serverOptions.value = [];
    console.error("Error during fetch server list API call:", error);
  } finally {
    serverLoading.value = false;
  }
}

function reset() {
  // 重置搜索条件到初始值
  model.value.serverId = null;
  model.value.openId = "";
  model.value.roleId = "";
  model.value.itemId = "";
  model.value.iuid = "";
  model.value.consignmentId = "";
  model.value.status = "";

  // 发送明确的空搜索参数来清除所有搜索条件
  const resetParams = {
    serverId: undefined,
    openId: undefined,
    roleId: undefined,
    itemId: undefined,
    iuid: undefined,
    consignmentId: undefined,
    status: undefined,
  };

  // 先发送重置搜索参数
  emit("search", resetParams);
  // 然后触发重置事件
  emit("reset");
}

function handleSearch() {
  if (!shouldTriggerSearch.value) return;

  const params: any = {
    // 明确清除所有可能的搜索字段
    serverId: undefined,
    openId: undefined,
    roleId: undefined,
    itemId: undefined,
    iuid: undefined,
    consignmentId: undefined,
    status: undefined,
  };

  // 添加服务器筛选条件
  if (model.value.serverId) {
    params.serverId = model.value.serverId;
  }

  // 添加搜索字段
  if (model.value.openId) {
    params.openId = model.value.openId;
  }
  if (model.value.roleId) {
    params.roleId = model.value.roleId;
  }
  if (model.value.itemId) {
    params.itemId = model.value.itemId;
  }
  if (model.value.iuid) {
    params.iuid = model.value.iuid;
  }
  if (model.value.consignmentId) {
    params.consignmentId = model.value.consignmentId;
  }

  // 添加状态筛选条件
  if (model.value.status) {
    params.status = model.value.status;
  }

  emit("search", params);
}

// 防抖搜索函数（500ms）
const debouncedSearch = useDebounceFn(handleSearch, 500);

// 监听表单字段变化，自动触发搜索
watch(
  () => [
    model.value.serverId,
    model.value.openId,
    model.value.roleId,
    model.value.itemId,
    model.value.iuid,
    model.value.consignmentId,
    model.value.status,
  ],
  () => {
    if (shouldTriggerSearch.value) {
      debouncedSearch();
    }
  },
  { deep: true }
);

// 初始化数据
getServerOptions();

// 挂载时延迟启用搜索触发，避免初始化时误触发
onMounted(() => {
  setTimeout(() => {
    shouldTriggerSearch.value = true;
  }, 100);
});
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
        <!-- 服务器选择 -->
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.orders.serverId')"
          path="serverId"
          class="pr-24px"
        >
          <NSelect
            v-model:value="model.serverId"
            :options="serverOptions"
            :loading="serverLoading"
            :placeholder="$t('page.manage.serveritem.form.serverId')"
            filterable
            clearable
          />
        </NFormItemGi>

        <!-- 寄售ID -->
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.treasure.consignmentId')"
          path="consignmentId"
          class="pr-24px"
        >
          <NInput
            v-model:value="model.consignmentId"
            :placeholder="$t('page.manage.treasure.form.consignmentId')"
            clearable
          />
        </NFormItemGi>

        <!-- OpenID -->
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.treasure.platformId')"
          path="openId"
          class="pr-24px"
        >
          <NInput
            v-model:value="model.openId"
            :placeholder="$t('page.manage.treasure.form.platformId')"
            clearable
          />
        </NFormItemGi>

        <!-- 角色ID -->
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.treasure.roleId')"
          path="roleId"
          class="pr-24px"
        >
          <NInput
            v-model:value="model.roleId"
            :placeholder="$t('page.manage.treasure.form.roleId')"
            clearable
          />
        </NFormItemGi>

        <!-- 物品ID -->
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.treasure.itemId')"
          path="itemId"
          class="pr-24px"
        >
          <NInput
            v-model:value="model.itemId"
            :placeholder="$t('page.manage.treasure.form.itemId')"
            clearable
          />
        </NFormItemGi>

        <!-- IUID -->
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.treasure.itemUniqueId')"
          path="iuid"
          class="pr-24px"
        >
          <NInput
            v-model:value="model.iuid"
            :placeholder="$t('page.manage.treasure.form.itemUniqueId')"
            clearable
          />
        </NFormItemGi>

        <!-- 状态 -->
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.treasure.status')"
          path="status"
          class="pr-24px"
        >
          <NSelect
            v-model:value="model.status"
            :options="statusOptions"
            :placeholder="$t('page.manage.treasure.form.status')"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi span="24 s:12 m:6">
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
