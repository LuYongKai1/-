<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NCard, NDataTable, NSwitch, NDropdown, NSpace } from "naive-ui";
import {
  fetchGetServerActivityList,
  fetchToggleServerActivity,
} from "@/service/api";
import * as XLSX from "xlsx";
import { useI18n } from "vue-i18n"; // ✅ 改用 useI18n
import { useAppStore } from "@/store/modules/app";
import {
  serverActivityStatusRecord,
  activityBigTypeRecord,
  activitySmallTypeRankRecord,
  activitySmallTypeTaskRecord,
  activitySmallTypeMapRecord,
  activitySmallTypeShopRecord,
  activitySmallTypeIncomeRecord,
  activitySmallTypeSystemRecord,
} from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { format } from "date-fns";
import ServerActivitySearch from "./modules/serveractivity-search.vue";
import ActivityOperateDrawer from "./modules/activity-operate-drawer.vue";
import LevelSwitchModal from "./modules/level-switch-modal.vue";
import { $t } from "@/locales";
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useAuth } from "@/hooks/business/auth";
import { handleApiCatchError, handleApiResponseError } from "@/utils/common";

// i18n
const { t } = useI18n();
const { hasAuth } = useAuth();
const appStore = useAppStore();

// 本地维护活动开启状态
const activityStates = ref(new Map<string, boolean>());

// 轮询定时器
let pollingTimer: NodeJS.Timeout | null = null;

// 控制是否显示loading（点击刷新按钮时显示，轮询时不显示）
const showLoading = ref(false);

// 轮询控制
const pollingInterval = ref<number | string>('off'); // 轮询间隔（'off', 'auto' 或秒数）
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

// 获取当前选中的刷新模式标签
const refreshLabel = computed(() => {
  const option = refreshOptions.find(opt => opt.key === pollingInterval.value);
  return option ? option.label : 'Refresh';
});

function getActivityTypeDisplay(row: any) {
  if (!row?.activityType) return "";
  const { bigType, smallType } = parseActivityType(row.activityType);
  if (!bigType) return String(row.activityType);

  const bigTypeText = activityBigTypeRecord[bigType]
    ? t(activityBigTypeRecord[bigType])
    : `未知大类型(${bigType})`;
  const smallTypeText = getSmallTypeText(bigType, smallType);

  return `${bigTypeText} / ${smallTypeText}`;
}

function formatUnixSeconds(seconds: number | string | null | undefined) {
  const s = Number(seconds);
  if (!s) return "";
  return format(new Date(s * 1000), "yyyy-MM-dd HH:mm:ss");
}

function applyAutoColumnWidth(
  worksheet: XLSX.WorkSheet,
  rows: Record<string, unknown>[],
  options?: { minWch?: number; maxWch?: number; padding?: number }
) {
  const { minWch = 12, maxWch = 60, padding = 2 } = options ?? {};
  const headers = Object.keys(rows?.[0] ?? {});
  if (headers.length === 0) return;

  worksheet["!cols"] = headers.map((header) => {
    const maxLen = Math.max(
      header.length,
      ...rows.map((r) => {
        const v = (r as any)[header];
        return (v === null || v === undefined ? "" : String(v)).length;
      })
    );
    return { wch: Math.min(maxWch, Math.max(minWch, maxLen + padding)) };
  });
}

// 解析活动类型
function parseActivityType(activityType: number) {
  if (!activityType) return { bigType: null, smallType: null };
  const bigType = Math.floor(activityType / 10000).toString() as Api.SystemManage.activityBigType;
  const smallType = (activityType % 10000).toString();
  return { bigType, smallType };
}

// const smallTypeMap = {
//   "1": activitySmallTypeRankRecord,
//   "2": activitySmallTypeTaskRecord,
//   "3": activitySmallTypeMapRecord,
//   "4": activitySmallTypeShopRecord,
//   "5": activitySmallTypeIncomeRecord,
//   "6": activitySmallTypeActivityRecord,
// } as const;
// 和 activityBigTypeRecord 保持一致

const smallTypeMap = {
  "1": activitySmallTypeSystemRecord, // 如果有 system
  "2": activitySmallTypeRankRecord,
  "3": activitySmallTypeTaskRecord,
  "4": activitySmallTypeMapRecord,
  "5": activitySmallTypeShopRecord,
  "6": activitySmallTypeIncomeRecord,
};


function getSmallTypeText(bigType: string, smallType: string) {
  const record = smallTypeMap[bigType as keyof typeof smallTypeMap];
  if (record && smallType in record) {
    return t(record[smallType as keyof typeof record]);
  }
  return "未知小类型";
}

function getSmallTypeStyle(bigType: string) {
  // 如果是系统类型（bigType为"1"），使用黄色
  if (bigType === "1") {
    return "px-2 py-1 bg-yellow-50 text-yellow-700 rounded text-xs font-medium border border-yellow-200";
  }
  // 其他类型使用蓝色
  return "px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-200";
}

// 处理活动开关状态变化
async function handleActivityToggle(row: any, checked: boolean) {
  try {
    // 检查是否选择了区服
    if (!searchParams.serverId) {
      window.$message?.warning($t('common.pleaseSelectServer'));
      return;
    }

    // 如果满足关闭条件（state > 5），则不允许开启活动
    if (checked && row.state > 5) {
      window.$message?.warning('活动处于关闭状态，无法开启');
      return;
    }

    const tag = checked ? 0 : 1; // 0表示开启，1表示关闭
    const activityKey = `${row.activityGuid}_${row.serverId || searchParams.serverId}`;

    const response = await fetchToggleServerActivity({
      serverId: Number(searchParams.serverId || row.serverId),
      activityGuid: row.activityGuid,
      tag: tag
    });

    // 使用封装好的错误处理方法
    const hasError = handleApiResponseError(response, checked ? '开启活动' : '关闭活动');
    if (hasError) {
      return;
    }

    activityStates.value.set(activityKey, checked);
    window.$message?.success(checked ? '活动开启成功' : '活动关闭成功');
    getData();
  } catch (error) {
    console.error('切换活动状态失败:', error);
    handleApiCatchError(error, checked ? '开启活动' : '关闭活动');
  }
}

// 删除活动
async function handleDelete(row: any) {
  try {
    // 检查是否选择了区服
    if (!searchParams.serverId) {
      window.$message?.warning($t('common.pleaseSelectServer'));
      return;
    }

    const response = await fetchToggleServerActivity({
      serverId: Number(searchParams.serverId || row.serverId),
      activityGuid: row.activityGuid,
      tag: 0,
      del: true
    });

    // 使用封装好的错误处理方法
    const hasError = handleApiResponseError(response, '删除活动');
    if (hasError) {
      return;
    }

    window.$message?.success('删除活动成功');
    getData();
  } catch (error) {
    console.error('删除活动失败:', error);
    handleApiCatchError(error, '删除活动');
  }
}

// 获取活动开启状态
function getActivityState(row: any): boolean {
  const activityKey = `${row.activityGuid}_${row.serverId || searchParams.serverId}`;
  if (activityStates.value.has(activityKey)) {
    return activityStates.value.get(activityKey) || false;
  }

  // 只有满足关闭条件时才显示为关闭状态，否则都是开启状态
  if (row.state > 5) {
    return false; // 关闭状态
  }

  // 如果 tag === 1，根据本地状态判断，默认为关闭
  if (row.tag === 1) {
    return false;
  }

  return true; // 默认为开启状态
}

// 判断活动开关是否应该被禁用
function isActivityDisabled(row: any): boolean {
  // 只有满足关闭条件时才可以禁用（因为已经是关闭状态）
  // if (row.state > 5 || row.tag === 1) {
  //   return true;
  // }

  return false;
}

function isRemoved(row: any): boolean {
  return row?.state?.toString?.() === "8";
}

const {
  columns,
  columnChecks,
  data,
  getData,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetServerActivityList,
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
    // {
    //   key: "activityId",
    //   title: t("page.manage.serveractivity.activityId"),
    //   align: "center",
    //   minWidth: 130,
    //   ellipsis: { tooltip: true },
    // },
    {
      key: "activityGuid",
      title: t("page.manage.serveractivity.activityGuid"),
      align: "center",
      minWidth: 130,
      ellipsis: { tooltip: true },
    },
    {
      key: "activityName",
      title: t("page.manage.serveractivity.activityName"),
      align: "center",
      minWidth: 130,
      ellipsis: { tooltip: true },
    },
    {
      key: "activityTypeId",
      title: t("page.manage.serveractivity.activityTypeId"),
      align: "center",
      minWidth: 130,
      ellipsis: { tooltip: true },
      render: (row: any) => row.activityType,
    },
    {
      key: "activityType",
      title: t("page.manage.serveractivity.activityType"),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        if (!row.activityType) return "";
        const { bigType, smallType } = parseActivityType(row.activityType);
        if (!bigType) return row.activityType;

        const bigTypeText = activityBigTypeRecord[bigType]
          ? t(activityBigTypeRecord[bigType])
          : "未知大类型";
        const smallTypeText = getSmallTypeText(bigType, smallType);

        return (
          <div class="space-y-1">
            <div class={`text-xs font-medium ${bigType === "1" ? "text-yellow-600" : "text-gray-600"}`}>{bigTypeText}</div>
            <div class={getSmallTypeStyle(bigType)}>
              {smallTypeText}
            </div>
          </div>
        );
      },
    },
    {
      key: "createTime",
      title: t("page.manage.serveractivity.createTime"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return formatUnixSeconds(row.createTime);
      },
    },
    {
      key: "beginShowTime",
      title: t("page.manage.serveractivity.beginShowTime"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return formatUnixSeconds(row.beginShowTime);
      },
    },
    {
      key: "openTime",
      title: t("page.manage.serveractivity.openTime"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return formatUnixSeconds(row.openTime);
      },
    },
    {
      key: "closeTime",
      title: t("page.manage.serveractivity.closeTime"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return formatUnixSeconds(row.closeTime);
      },
    },
    {
      key: "removeTime",
      title: t("page.manage.serveractivity.removeTime"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return formatUnixSeconds(row.removeTime);
      },
    },
    {
      key: "state",
      title: t("page.manage.serveractivity.state"),
      align: "center",
      minWidth: 120,
      render: (row: any) => {
        if (!row.state && row.state !== 0) return <NTag type="info">-</NTag>;

        const stateKey = row.state.toString() as Api.SystemManage.serverState;
        const stateText = serverActivityStatusRecord[stateKey]
          ? t(serverActivityStatusRecord[stateKey])
          : `未知状态(${row.state})`;

        return <NTag type="info">{stateText}</NTag>;
      },
    },
    {
      key: "isActive",
      title: t("page.manage.serveractivity.isActive"),
      align: "center",
      minWidth: 120,
      render: (row: any) => (
        <div class="flex-center gap-8px">
          {hasAuth('operate:relayActivity:buildGmJson') && (
          <NSwitch
            value={getActivityState(row)}
            onUpdateValue={(checked: boolean) => handleActivityToggle(row, checked)}
            disabled={isActivityDisabled(row)}
          />
          )}
        </div>
      ),
    },
    {
      key: "operate",
      title: t("common.action"),
      align: "center",
      width: 100,
      fixed: "right",
      render: (row: any) => {
        const disabled = isRemoved(row);

        return (
          <div class="flex-center gap-8px">
            {hasAuth('operate:relayActivity:buildGmJson') && (
              disabled ? (
                <NButton type="error" ghost size="small" disabled>
                  {t("common.delete")}
                </NButton>
              ) : (
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
              )
            )}
          </div>
        );
      },
    },
  ],
});

const {
  drawerVisible,
  operateType,
  editingData,
  handleAdd: originalHandleAdd,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted,
} = useTableOperate(data, getData);

// 自定义handleAdd
function handleAdd() {
  originalHandleAdd({});
}

function handleSearch(
  serverId: number,
  activityGuid: string,
  state: string | null,
) {
  updateSearchParams({ serverId, activityGuid, state });
  getData();
}

function handleReset() {
  resetSearchParams();
  getData();
}

async function handleExport() {
  try {
    if (!searchParams.serverId) {
      window.$message?.warning($t("common.pleaseSelectServer"));
      return;
    }

    // 确保数据是最新的（如果没拉过数据，先拉一次）
    if (!Array.isArray((data as any).value) || (data as any).value.length === 0) {
      await getData();
    }

    const rows: any[] = Array.isArray((data as any).value) ? (data as any).value : [];
    if (rows.length === 0) {
      window.$message?.warning($t("common.exportFailed") + ": 没有数据");
      return;
    }

    window.$message?.info($t("common.exportingData"));

    const exportRows = rows.map((row) => {
      const stateKey = row?.state?.toString?.() as Api.SystemManage.serverState;
      const stateText = stateKey && serverActivityStatusRecord[stateKey]
        ? t(serverActivityStatusRecord[stateKey])
        : (row?.state ?? "");

      return {
        活动Guid: row?.activityGuid ?? "",
        活动名称: row?.activityName ?? "",
        活动类型Id: row?.activityType ?? "",
        活动类型: getActivityTypeDisplay(row),
        创建时间: formatUnixSeconds(row?.createTime),
        展示开始时间: formatUnixSeconds(row?.beginShowTime),
        开启时间: formatUnixSeconds(row?.openTime),
        关闭时间: formatUnixSeconds(row?.closeTime),
        移除时间: formatUnixSeconds(row?.removeTime),
        状态: stateText,
        是否开启: getActivityState(row) ? "开启" : "关闭",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    applyAutoColumnWidth(worksheet, exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "活动列表");

    const date = new Date().toISOString().slice(0, 10);
    const fileName = `区服_${searchParams.serverId}_活动列表_${date}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    window.$message?.success($t("common.exportSuccess"));
  } catch (error) {
    handleApiCatchError(error, "导出活动列表");
  }
}

// 刷新按钮手动刷新数据（带 loading）
async function handleRefresh() {
  try {
    showLoading.value = true;
    await getData();
  } finally {
    showLoading.value = false;
  }
}

// 等级开关弹框显示状态
const levelSwitchModalVisible = ref(false);

// 等级开关按钮点击处理
function handleLevelSwitch() {
  levelSwitchModalVisible.value = true;
}

// 开始轮询
function startPolling() {
  stopPolling(); // 先停止之前的轮询

  if (pollingInterval.value === 'off' || !searchParams.serverId) {
    return;
  }

  // Auto 模式使用 3 秒间隔
  const interval = pollingInterval.value === 'auto' ? 3 : pollingInterval.value as number;

  pollingTimer = setInterval(() => {
    getData();
  }, interval * 1000); // 转换为毫秒
}

// 停止轮询
function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

// 监听轮询间隔变化
watch(pollingInterval, (newValue) => {
  if (newValue === 'off') {
    stopPolling();
  } else {
    startPolling();
  }
});

// 组件卸载时停止轮询
onUnmounted(() => {
  stopPolling();
});


</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <ServerActivitySearch
      v-model:model="searchParams"
      @reset="handleReset"
      @search="handleSearch"
    />
    <NCard
      :title="t('page.manage.serveractivity.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
        <template #header-extra>
        <NSpace align="center" :size="12">
          <NDropdown
            trigger="click"
            :options="refreshOptions"
            :disabled="!searchParams.serverId"
            @select="(key) => pollingInterval = key"
          >
            <NButton size="small" :disabled="!searchParams.serverId">
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
            @export="handleExport"
            :show-add="hasAuth('operate:activity:add')"
            :show-export="true"
            :show-export-confirm="true"
            :show-level-switch="hasAuth('game:item:switch')"
            @level-switch="handleLevelSwitch"
          />
        </NSpace>
      </template>

      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="1080"
        :loading="loading"
        remote
        :row-key="row => row.activityGuid || row.id"
        :pagination="false"
        class="sm:h-full"
      />
    </NCard>

    <ActivityOperateDrawer
      v-model:visible="drawerVisible"
      @submitted="getData"
    />

    <LevelSwitchModal
      v-model:visible="levelSwitchModalVisible"
      @submitted="getData"
    />
  </div>
</template>
