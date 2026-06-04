<script setup lang="tsx">
import { ref, computed } from "vue";
import { NTag } from "naive-ui";
import { fetchGetSeasonList } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { useServerStore } from "@/store/modules/server";
import SeasonSwitchDrawer from "./modules/season-switch-drawer.vue";
import BanCurrencyDrawer from "./modules/ban-currency-drawer.vue";
import SingleServerBlacklistDrawer from "./modules/single-server-blacklist-drawer.vue";
import PlayoffsControlModal from "./modules/playoffs-control-modal.vue";
import BiddingSettingsModal from "./modules/bidding-settings-modal.vue";

defineOptions({
  name: "SeasonList"
});

type SeasonStatus = "success" | "warning" | "error" | "default" | "info";
type FeatureColor = "success" | "warning" | "error" | "info" | "primary";

interface FeatureConfig {
  label: string;
  color: FeatureColor;
}

interface SeasonRow {
  seasonNo: number;
  serverId: string | number;
  serverName?: string;
  status: string;
  featureState?: Record<string, number>;
  stage: string;
  startTimeStr: string;
  endTimeStr: string;
}

const appStore = useAppStore();
const serverStore = useServerStore();
const switchDrawerVisible = ref(false);
const banCurrencyDrawerVisible = ref(false);
const singleServerBlacklistVisible = ref(false);
const playoffsControlVisible = ref(false);
const biddingSettingsVisible = ref(false);

// 功能状态配置
const FEATURE_CONFIG: Record<string, FeatureConfig> = {
  all: { label: "全部", color: "primary" },
  shop: { label: "商店", color: "success" },
  achievement: { label: "成就", color: "warning" },
  must_do: { label: "必做", color: "error" },
  ranking: { label: "排行", color: "info" },
  mandala: { label: "曼陀罗", color: "primary" },
  currency: { label: "货币", color: "warning" }
};

// 功能显示顺序
const FEATURE_ORDER = ["all", "shop", "achievement", "must_do", "ranking", "mandala", "currency"];

// 获取服务器名称映射
const serverNameMap = computed(() => {
  const map = new Map<number, string>();
  serverStore.serverList.forEach(server => {
    map.set(server.serverId, server.serverName);
  });
  return map;
});

// 渲染赛季状态标签
function renderStatusTag(status: string) {
  const statusMap: Record<string, SeasonStatus> = {
    进行中: "success",
    未开始: "info",
    已结束: "error"
  };

  const type = Object.keys(statusMap).find(key => status.includes(key))
    ? statusMap[Object.keys(statusMap).find(key => status.includes(key))!]
    : "default";

  return (
    <NTag type={type} size="small" round>
      {status}
    </NTag>
  );
}

// 渲染功能状态标签组
function renderFeatureStates(featureState?: Record<string, number>) {
  const features = FEATURE_ORDER.map(key => {
    const config = FEATURE_CONFIG[key];
    // 0表示开启，1表示关闭
    const enabled = featureState?.[key] !== undefined && Number(featureState[key]) === 0;

    return {
      key,
      label: config.label,
      color: config.color,
      enabled
    };
  });

  return (
    <div class="flex flex-wrap gap-4px justify-center items-center">
      {features.map((feature) => (
        <NTag
          key={feature.key}
          size="small"
          type={feature.enabled ? feature.color : "default"}
          round
          class={feature.enabled ? "feature-tag-enabled" : "feature-tag-disabled"}
        >
          {`${feature.label}:${feature.enabled ? "开启" : "关闭"}`}
        </NTag>
      ))}
    </div>
  );
}

// 获取服务器名称
function getServerName(serverId: number | string): string {
  const id = typeof serverId === 'string' ? Number(serverId) : serverId;
  return serverNameMap.value.get(id) || `服务器${serverId}`;
}

const { columns, columnChecks, data, getData, loading, mobilePagination } =
  useTable({
    apiFn: fetchGetSeasonList,
    showTotal: true,
    apiParams: {
      current: 1,
      size: 10,
    },
    columns: () => [
      {
        type: "selection",
        align: "center",
        width: 48,
      },

      {
        key: "serverId",
        title: "服务器ID",
        align: "center",
        minWidth: 80,
      },
      {
        key: "serverName",
        title: "服务器名称",
        align: "center",
        minWidth: 80,
        ellipsis: { tooltip: true },
        render: (row: SeasonRow) => row.serverName || getServerName(Number(row.serverId))
      },
      {
        key: "seasonNo",
        title: "赛季编号",
        align: "center",
        minWidth: 80,
      },
      {
        key: "stage",
        title: "阶段",
        align: "center",
        minWidth: 80,
      },
      {
        key: "status",
        title: "状态",
        align: "center",
        minWidth: 80,
        render: (row: SeasonRow) => renderStatusTag(row.status)
      },
      {
        key: "featureState",
        title: "功能状态",
        align: "center",
        width: 500,
        render: (row: SeasonRow) => renderFeatureStates(row.featureState)
      },
      {
        key: "startTimeStr",
        title: "开始时间",
        align: "center",
        minWidth: 160,
        ellipsis: { tooltip: true }
      },
      {
        key: "endTimeStr",
        title: "结束时间",
        align: "center",
        minWidth: 160,
        ellipsis: { tooltip: true }
      }
    ],
  });

const { checkedRowKeys } = useTableOperate<SeasonRow>(data, getData);

// 打开赛季开关抽屉
function openSwitchDrawer() {
  switchDrawerVisible.value = true;
}

// 打开禁止货币抽屉
function openBanCurrencyDrawer() {
  banCurrencyDrawerVisible.value = true;
}

// 赛季开关提交成功后刷新列表
function handleSwitchSubmitted() {
  getData();
}

// 禁止货币提交成功后刷新列表
function handleBanCurrencySubmitted() {
  getData();
}

// 打开单服黑名单抽屉
function openSingleServerBlacklistDrawer() {
  singleServerBlacklistVisible.value = true;
}

// 单服黑名单提交成功后刷新列表
function handleSingleServerBlacklistSubmitted() {
  getData();
}

// 打开控制季后赛弹窗
function openPlayoffsControlModal() {
  playoffsControlVisible.value = true;
}

// 控制季后赛提交成功后刷新列表
function handlePlayoffsControlSubmitted() {
  getData();
}

// 打开设置赛季竞价弹窗
function openBiddingSettingsModal() {
  biddingSettingsVisible.value = true;
}

// 设置赛季竞价提交成功后刷新列表
function handleBiddingSettingsSubmitted() {
  getData();
}
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <NCard
      title="赛季列表"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :loading="loading"
          show-season-switch
          show-ban-currency
          show-single-server-blacklist
          show-playoffs-control
          show-bidding-settings
          @refresh="getData"
          @season-switch="openSwitchDrawer"
          @ban-currency="openBanCurrencyDrawer"
          @single-server-blacklist="openSingleServerBlacklistDrawer"
          @playoffs-control="openPlayoffsControlModal"
          @bidding-settings="openBiddingSettingsModal"
        />
      </template>

      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="1100"
        :loading="loading"
        remote
        :row-key="(row: SeasonRow) => `${row.serverId}-${row.seasonNo}`"
        :pagination="mobilePagination"
        class="sm:h-full"
      />

      <SeasonSwitchDrawer
        v-model:visible="switchDrawerVisible"
        @submitted="handleSwitchSubmitted"
      />

      <BanCurrencyDrawer
        v-model:visible="banCurrencyDrawerVisible"
        @submitted="handleBanCurrencySubmitted"
      />

      <SingleServerBlacklistDrawer
        v-model:visible="singleServerBlacklistVisible"
        @submitted="handleSingleServerBlacklistSubmitted"
      />

      <PlayoffsControlModal
        v-model:visible="playoffsControlVisible"
        @success="handlePlayoffsControlSubmitted"
      />

      <BiddingSettingsModal
        v-model:visible="biddingSettingsVisible"
        @success="handleBiddingSettingsSubmitted"
      />
    </NCard>
  </div>
</template>


<style scoped>
.feature-tag-enabled {
  opacity: 1;
  font-weight: bold;
}

.feature-tag-disabled {
  opacity: 0.5;
  font-weight: normal;
}
</style>
