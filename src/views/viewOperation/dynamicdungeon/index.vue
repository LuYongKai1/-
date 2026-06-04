<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NCard, NDataTable, NSwitch, NDropdown, NSpace } from "naive-ui";
import {
  fetchGetDynamicEventDungeonList,
  fetchToggleDynamicEventDungeon,
  fetchDeleteDynamicEventDungeon
} from "@/service/api";
import { useI18n } from "vue-i18n";
import { useAppStore } from "@/store/modules/app";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { format } from "date-fns";
import DynamicEventDungeonSearch from "./modules/dynamiceventdungeon-search.vue";
import DungeonOperateDrawer from "./modules/dungeon-operate-drawer.vue";
import DungeonSwitchModal from "./modules/dungeon-switch-modal.vue";
import { $t } from "@/locales";
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useAuth } from "@/hooks/business/auth";
import { handleApiCatchError, handleApiResponseError } from "@/utils/common";

// i18n
const { t } = useI18n();
const { hasAuth } = useAuth();
const appStore = useAppStore();

// 本地维护副本开启状态
const dungeonStates = ref(new Map<string, boolean>());

// 轮询定时器
let pollingTimer: NodeJS.Timeout | null = null;
const showLoading = ref(false);
const pollingInterval = ref<number | string>('off');
const refreshOptions = [
  { label: 'Off', key: 'off' },
  { label: 'Auto', key: 'auto' },
  { label: '5s', key: 5 },
  { label: '10s', key: 10 },
  { label: '30s', key: 30 },
  { label: '1m', key: 60 },
  { label: '5m', key: 300 },
  { label: '15m', key: 900 },
  { label: '30m', key: 1800 },
  { label: '1h', key: 3600 },
  { label: '2h', key: 7200 },
  { label: '1d', key: 86400 }
];
const refreshLabel = computed(() => {
  const option = refreshOptions.find(opt => opt.key === pollingInterval.value);
  return option ? option.label : 'Refresh';
});

// 处理副本开关状态变化
async function handleDungeonToggle(row: any, checked: boolean) {
  try {
    const isClosed = !checked; // 开关开启时，isClosed为false
    const dungeonKey = `${row.indunId}`; // 使用indunId作为唯一键

    // 构建请求参数 - 传递数组，即使只有一个服务器
    const requestData = {
      serverIds: [searchParams.serverId], // 数组，包含当前服务器ID
      indunId: row.indunId,
      isClosed: isClosed
    };
    // 调用切换副本状态的API
    const response = await fetchToggleDynamicEventDungeon(requestData);

    const hasError = handleApiResponseError(response, checked ? '开启副本' : '关闭副本');
    if (hasError) {
      return;
    }

    dungeonStates.value.set(dungeonKey, checked);
    window.$message?.success(checked ? t('page.manage.dynamiceventdungeon.dungeonOpen') : t('page.manage.dynamiceventdungeon.dungeonClose'));
    getData();
  } catch (error) {
    console.error('切换副本状态失败:', error);
    handleApiCatchError(error, checked ? '开启副本' : '关闭副本');
  }
}

// 删除副本
async function handleDelete(row: any) {
  try {

    // 构建请求参数 - 传递数组，即使只有一个服务器
    const requestData = {
      serverIds: [searchParams.serverId], // 数组，包含当前服务器ID
      indunId: row.indunId
    };
    const response = await fetchDeleteDynamicEventDungeon(requestData);

    const hasError = handleApiResponseError(response, '删除动态副本');
    if (hasError) {
      return;
    }

    window.$message?.success('删除副本成功');
    getData();
  } catch (error) {
    console.error('删除副本失败:', error);
    handleApiCatchError(error, '删除动态副本');
  }
}

// 获取副本开启状态
function getDungeonState(row: any): boolean {
  const dungeonKey = `${row.indunId}`;
  if (dungeonStates.value.has(dungeonKey)) {
    return dungeonStates.value.get(dungeonKey) || false;
  }
  // 直接使用 isClosed 字段，取反是因为 isClosed 为 false 表示开启
  return !row.isClosed;
}

const {
  columns,
  columnChecks,
  data,
  getData,
  loading,
  searchParams,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetDynamicEventDungeonList,
  immediate: false,
  apiParams: {
    current: 1,
    size: 9999,
  },
  columns: () => [
    {
      type: "selection",
      align: "center",
      width: 48,
    },
    {
      key: "indunId",
      title: t("page.manage.dynamiceventdungeon.indunId"),
      align: "center",
      minWidth: 130,
      ellipsis: { tooltip: true },
    },
    {
      key: "indunName",
      title: t("page.manage.dynamiceventdungeon.indunName"),
      align: "center",
      minWidth: 150,
      ellipsis: { tooltip: true },
    },
    {
      key: "indunParams",
      title: t("page.manage.dynamiceventdungeon.indunParams"),
      align: "center",
      minWidth: 200,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        if (!row.indunParams) return "-";
        return <span title={JSON.stringify(row.indunParams, null, 2)}>{JSON.stringify(row.indunParams)}</span>;
      },
    },
    {
      key: "isClosed",
      title: t("page.manage.dynamiceventdungeon.isClosed"),
      align: "center",
      minWidth: 120,
      render: (row: any) => (
        <div class="flex-center gap-8px">
          {hasAuth('operate:dynamicDungeon:switch') && (
            <NSwitch
              value={getDungeonState(row)}
              onUpdateValue={(checked: boolean) => handleDungeonToggle(row, checked)}
            />
          )}
        </div>
      ),
    },
    {
      key: "operate",
      title: t("common.action"),
      align: "center",
      width: 150,
      fixed: "right",
      render: (row: any) => (
        <div class="flex-center gap-8px">
          {hasAuth('operate:dynamicDungeon:edit') && (
            <NButton type="primary" ghost size="small" onClick={() => handleEdit(row)}>
              {t("common.edit")}
            </NButton>
          )}
          {hasAuth('operate:dynamicDungeon:delete') && (
            <NPopconfirm onPositiveClick={() => handleDelete(row)}>
              {{
                default: () => t("common.confirmDelete"),
                trigger: () => (
                  <NButton type="error" ghost size="small">
                    {t("common.delete")}
                  </NButton>
                ),
              }}
            </NPopconfirm>
          )}
        </div>
      ),
    },
  ],
});

// 使用 useTableOperate
const tableOperate = useTableOperate(data, getData);
const {
  drawerVisible,
  operateType,
  editingData,
  handleAdd: originalHandleAdd,
  checkedRowKeys,
} = tableOperate;

// 自定义的 handleEdit 函数
function handleEdit(row: any) {
  // 构建要编辑的数据，包含从列表中获取的所有字段
  const editData = {
    ...row,
    // 确保传递 serverId，使用当前搜索的 serverId
    serverId: searchParams.serverId,
  };
  // 调用基础编辑函数，传递两个参数：id 和 detail
  tableOperate.handleEdit(editData.indunId, editData);
}

// 自定义的 handleAdd 函数
function handleAdd() {
  tableOperate.handleAdd({});
}

// 搜索函数
function handleSearch(serverId: number, indunId: string, isClosed: boolean) {
  updateSearchParams({
    serverId,
    indunId,
    isClosed
  });
  getData();
}

function handleReset() {
  resetSearchParams();
  getData();
}

// 手动刷新函数
function handleRefresh() {
  showLoading.value = true;
  getData().finally(() => {
    showLoading.value = false;
  });
}


// 副本开关弹框显示状态
const dungeonSwitchModalVisible = ref(false);
function handleDungeonSwitch() {
  dungeonSwitchModalVisible.value = true;
}

// 轮询控制
function startPolling() {
  stopPolling();
  if (pollingInterval.value === 'off') {
    return;
  }
  const interval = pollingInterval.value === 'auto' ? 3 : pollingInterval.value as number;
  pollingTimer = setInterval(() => {
    getData();
  }, interval * 1000);
}
function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}
watch(pollingInterval, (newValue) => {
  if (newValue === 'off') {
    stopPolling();
  } else {
    startPolling();
  }
});

onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <DynamicEventDungeonSearch
      v-model:model="searchParams"
      @reset="handleReset"
      @search="handleSearch"
    />
    <NCard
      :title="t('page.manage.dynamiceventdungeon.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <NSpace align="center" :size="12">
          <NDropdown
            trigger="click"
            :options="refreshOptions"
            @select="(key) => pollingInterval = key"
          >
            <NButton size="small">
              <template #icon>
                <icon-mdi-refresh class="text-icon" />
              </template>
              {{ refreshLabel }}
              <icon-mdi-chevron-down class="text-icon ml-1" />
            </NButton>
          </NDropdown>
          <TableHeaderOperation
            v-model:columns="columnChecks"
            :disabled-delete="checkedRowKeys.length === 0"
            :loading="showLoading"
            @add="handleAdd"
            @refresh="handleRefresh"
            :show-add="hasAuth('operate:dynamicDungeon:add')"
          />
        </NSpace>
      </template>

      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="750"
        :loading="loading"
        remote
        :row-key="(row: any) => row.indunId || row.id"
        :pagination="false"
        class="sm:h-full"
      />
    </NCard>

    <DungeonOperateDrawer
      v-model:visible="drawerVisible"
      :operate-type="operateType"
      :editing-data="editingData"
      @submitted="getData"
    />

    <DungeonSwitchModal
      v-model:visible="dungeonSwitchModalVisible"
      @submitted="getData"
    />
  </div>
</template>
