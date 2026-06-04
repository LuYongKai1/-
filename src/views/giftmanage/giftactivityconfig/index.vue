<script setup lang="tsx">
import {
  fetchGetGiftActivityList,
  fetchDeleteGiftActivity,
} from "@/service/api/game-manage";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { NButton, NPopconfirm, NTag, NProgress, NTooltip } from "naive-ui";
import {
  scopeTypeRecord,
  giftActivityTypeRecord,
  giftActivityStatusRecord
} from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import GiftActivityOperateDrawer from "./modules/gift-activity-operate-drawer.vue";
import ActivityBatchDrawer from "./modules/activity-batch-drawer.vue";
import ActivityAllocationDrawer from "./modules/activity-allocation-drawer.vue";
import { ref, onMounted, h } from "vue";
import { useAuth } from "@/hooks/business/auth";
import { format } from "date-fns";
import { useItemPackage } from "@/hooks/business/useItemPackage";


const { hasAuth } = useAuth();
const appStore = useAppStore();

// 添加物品数据状态
const itemData = ref<any>(null);

// 获取物品数据
onMounted(async () => {
  try {
    const data = await useItemPackage();
    itemData.value = data;
  } catch (error) {
    console.error("获取物品数据失败:", error);
    itemData.value = null;
  }
});

// 解析并格式化奖励信息
function formatRewardJson(rewardJson: string) {
  if (!rewardJson || !itemData.value?.data?.item) {
    return rewardJson || '-';
  }

  try {
    const rewardData = JSON.parse(rewardJson);

    // 处理新格式的 itemIds 和 itemCounts
    if (rewardData.itemIds && rewardData.itemCounts) {
      const itemIds = rewardData.itemIds || [];
      const itemCounts = rewardData.itemCounts || [];

      if (itemIds.length === 0) {
        return '-';
      }

      const items = itemIds.map((id: number, index: number) => {
        const item = itemData.value.data.item[id];
        const itemName = item?.names || item?.name || `物品${id}`;
        const count = itemCounts[index] || 1;
        return `${itemName} x${count}`;
      });

      return items.join(', ');
    }

    // 处理旧格式的 items 数组
    if (rewardData.items && Array.isArray(rewardData.items)) {
      const items = rewardData.items.map((item: any) => {
        const itemName = item.name || `物品${item.id}`;
        const count = item.quantity || 1;
        return `${itemName} x${count}`;
      });
      return items.join(', ');
    }

    return rewardJson;
  } catch (e) {
    console.error('解析rewardJson失败:', e);
    return rewardJson;
  }
}


const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  scrollX,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetGiftActivityList,
  showTotal: true,
  apiParams: {
    current: 1,
    size: 10,
  },
  columns: () => [
    {
      type: "selection",
      align: "center",
      width: 50,
    },
    {
      key: "id",
      title: $t("page.manage.giftactivity.ID"),
      align: "center",
      width: 60,
    },
    {
      key: "campaignCode",
      title: $t("page.manage.giftactivity.campaignCode"),
      align: "center",
      width: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "name",
      title: $t("page.manage.giftactivity.name"),
      align: "center",
      width: 140,
      ellipsis: { tooltip: true },
    },
    {
      key: "scopeChannel",
      title: $t("page.manage.giftactivity.scopeChannel"),
      align: "center",
      width: 100,
      render: (row: any) => {
        if (row.scopeChannel === null || row.scopeChannel === undefined) {
          return null;
        }
        const label = $t(scopeTypeRecord[row.scopeChannel]);
        return <span>{label}</span>;
      },
    },
    {
      key: "scopeServer",
      title: $t("page.manage.giftactivity.scopeServer"),
      align: "center",
      width: 100,
      render: (row: any) => {
        if (row.scopeServer === null || row.scopeServer === undefined) {
          return null;
        }
        const label = $t(scopeTypeRecord[row.scopeServer]);
        return <span>{label}</span>;
      },
    },
    {
      key: "perUserLimit",
      title: $t("page.manage.giftactivity.perUserLimit"),
      align: "center",
      width: 90,
    },
    {
      key: "totalLimit",
      title: $t("page.manage.giftactivity.totalLimit"),
      align: "center",
      width: 80,
    },
    {
      key: "rewardJson",
      title: $t("page.manage.giftactivity.rewardJson"),
      align: "center",
      width: 220,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        const formattedReward = formatRewardJson(row.rewardJson);
        return <span title={formattedReward}>{formattedReward}</span>;
      },
    },
    {
      key: "remark",
      title: $t("page.manage.giftactivity.remark"),
      align: "center",
      width: 130,
      ellipsis: { tooltip: true },
    },
    {
      key: "startTime",
      title: $t("page.manage.giftactivity.startTime"),
      align: "center",
      width: 170,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return format(new Date(row.startTime), "yyyy-MM-dd HH:mm:ss");
      },
    },
    {
      key: "endTime",
      title: $t("page.manage.giftactivity.endTime"),
      align: "center",
      width: 170,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return format(new Date(row.endTime), "yyyy-MM-dd HH:mm:ss");
      },
    },
    {
      key: "status",
      title: $t("page.manage.giftactivity.status"),
      align: "center",
      width: 90,
      render: (row: any) => {
        if (row.status === null) {
          return null;
        }

        const tagMap: Record<string, NaiveUI.ThemeColor> = {
          1: "success",  // 启用 → 绿色
          2: "error",  // 停用 → 红色
          3: "info",     // 归档 → 蓝色
        };

        const label = $t(giftActivityStatusRecord[row.status]);

        return <NTag type={tagMap[row.status]}>{label}</NTag>;
      },
    },
    {
      key: "creator",
      title: $t("page.manage.giftactivity.creator"),
      align: "center",
      width: 110,
      ellipsis: { tooltip: true },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 260,
      fixed: "right",
      render: (row: any) => (
        <div class="flex items-center justify-center gap-4px flex-wrap">
          {hasAuth("operate:giftCodeBatch:list") && (
          <NButton
            type="warning"
            ghost
            size="small"
            onClick={() => handleViewBatches(row.id, row.name)}
          >
            {$t("page.manage.giftactivity.batch")}
          </NButton>
          )}

          {(hasAuth("operate:campaignChannel:list") && hasAuth("operate:giftCampaignServer:list")) && (
          <NButton
            type="success"
            ghost
            size="small"
            onClick={() => handleAllocation(row)}
          >
            {$t("page.manage.giftactivity.allocation")}
          </NButton>
          )}

          {hasAuth("operate:campaign:edit") && (
            <NButton
              type="primary"
              ghost
              size="small"
              onClick={() => edit(row.id, row)}
            >
              {$t("common.edit")}
            </NButton>
          )}

          {hasAuth("operate:campaign:remove") && (
            <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
              {{
                default: () => $t("common.confirmDelete"),
                trigger: () => (
                  <NButton type="error" ghost size="small">
                    {$t("common.delete")}
                  </NButton>
                ),
              }}
            </NPopconfirm>
          )}
        </div>
      ),
    },
  ],
  defaultHiddenKeys: ['campaignCode','remark','creator']
});

const {
  drawerVisible,
  operateType,
  editingData,
  handleAdd,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted,
  // closeDrawer
} = useTableOperate(data, getData);

function handleSearch(name: string, status: string, updater: string) {
  const params: any = {
    name,
    status,
    updater,
  };
  updateSearchParams(params);
  getData();
}

async function handleBatchDelete() {
  try {
    const deletePromises = checkedRowKeys.value.map((id: string) => {
      return fetchDeleteGiftActivity({ id: Number(id) });
    });
    const responses = await Promise.all(deletePromises);

    onBatchDeleted(responses);
  } catch (error: any) {
    onBatchDeleted(error);
  }
}

async function handleDelete(id: number) {
  try {
    const response = await fetchDeleteGiftActivity({ id });

    onDeleted(response);
  } catch (error: any) {
    onDeleted(error);
  }
}

function edit(id: number, row: any) {
  const editData = {
    ...row,
  };
  handleEdit(id, editData);
}

const currentServerId = ref("");

// 批次管理相关状态
const batchDrawerVisible = ref(false);
const currentActivityId = ref<number | null>(null);
const currentActivityName = ref<string>("");

// 分配管理相关状态
const allocationDrawerVisible = ref(false);
const currentActivityData = ref<any>(null);

// 查看活动批次
function handleViewBatches(activityId: number, activityName: string) {
  currentActivityId.value = activityId;
  currentActivityName.value = activityName;
  batchDrawerVisible.value = true;
}

// 分配活动
function handleAllocation(row: any) {
  currentActivityData.value = row;
  allocationDrawerVisible.value = true;
}
</script>

<template>
  <div class="flex-col gap-16px lt-sm:overflow-auto">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">{{$t("page.manage.giftactivity.herder.title")}}</h1>
      <p class="page-description">
        {{$t("page.manage.giftactivity.herder.description")}}
      </p>
    </div>

    <!-- 统计卡片区域 -->
    <div class="stats-grid">
      <NCard class="stats-card">
        <div class="stats-content">
          <div class="stats-number">24</div>
          <div class="stats-label">
            <span>{{ $t("page.manage.giftactivity.herder.totalActivity") }}</span>
            <div class="stats-trend positive">
              <span class="trend-icon">↑</span>
              <span>较上月增长12%</span>
            </div>
          </div>
        </div>
        <div class="stats-icon stats-icon-blue">
          <icon-mdi-gift class="text-24px" />
        </div>
      </NCard>

      <NCard class="stats-card">
        <div class="stats-content">
          <div class="stats-number">15,824</div>
          <div class="stats-label">
            <span>{{ $t("page.manage.giftactivity.herder.generateCode") }}</span>
            <div class="stats-trend positive">
              <span class="trend-icon">↑</span>
              <span>较上月增长8%</span>
            </div>
          </div>
        </div>
        <div class="stats-icon stats-icon-green">
          <icon-mdi-swap-horizontal class="text-24px" />
        </div>
      </NCard>

      <NCard class="stats-card">
        <div class="stats-content">
          <div class="stats-number">9,342</div>
          <div class="stats-label">
            <span>{{ $t("page.manage.giftactivity.herder.exchangedCount") }}</span>
            <div class="stats-trend positive">
              <span class="trend-icon">↑</span>
              <span>较上月增长18%</span>
            </div>
          </div>
        </div>
        <div class="stats-icon stats-icon-orange">
          <icon-mdi-check-circle class="text-24px" />
        </div>
      </NCard>
    </div>

    <NCard
      :title="$t('page.manage.giftactivity.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @refresh="getData"
          :show-add="hasAuth('operate:campaign:add')"
          :show-batch-delete="hasAuth('operate:campaign:remove')"
        />
      </template>

      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="scrollX"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />

      <GiftActivityOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        :server-id="currentServerId"
        @submitted="getDataByPage"
      />

      <!-- 活动批次管理抽屉 -->
      <ActivityBatchDrawer
        v-model:visible="batchDrawerVisible"
        :activity-id="currentActivityId"
        :activity-name="currentActivityName"
      />

      <!-- 活动分配抽屉 -->
      <ActivityAllocationDrawer
        v-model:visible="allocationDrawerVisible"
        :activity-id="currentActivityData?.id"
        :activity-name="currentActivityData?.name || ''"
        :campaign-code="currentActivityData?.campaignCode || ''"
        :scope-channel="currentActivityData?.scopeChannel || 0"
        :scope-server="currentActivityData?.scopeServer || 0"
        :channel-ids="currentActivityData?.channelIds || ''"
        :server-ids="currentActivityData?.serverIds || ''"
        @submitted="getData"
      />
    </NCard>
  </div>
</template>

<style scoped>
/* 页面标题样式 */

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: rgb(var(--base-text-color)) !important;
  line-height: 1.2;
}

.page-description {
  font-size: 14px;
  margin: 0;
  color: rgb(var(--base-text-color)) !important;
  opacity: 0.7;
}

/* 统计卡片网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.stats-card {
  position: relative;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.stats-card :deep(.n-card-body) {
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stats-content {
  flex: 1;
}

.stats-number {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-color);
  line-height: 1;
  margin-bottom: 8px;
}

.stats-label {
  font-size: 14px;
  color: var(--text-color-2);
}

.stats-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  margin-top: 4px;
}

.stats-trend.positive {
  color: #52c41a;
}

.trend-icon {
  font-weight: bold;
}

.stats-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stats-icon-blue {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stats-icon-green {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stats-icon-orange {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    flex-direction: column;
    gap: 16px;
  }

  .table-header-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
}
</style>

