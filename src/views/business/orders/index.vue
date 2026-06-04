<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NCard, NDataTable } from "naive-ui";
import {
  fetchGetOrderList,
  fetchCheckStatus,
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useAuthStore } from "@/store/modules/auth";
import { callbackStatusRecord, orderStatusRecord } from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import OrdersSearch from "./modules/products-search.vue";
import BatchRechargeModal from "./modules/batch-recharge-modal.vue";
import { ref, onMounted,computed } from "vue";
import { useAuth } from "@/hooks/business/auth";
import { format } from "date-fns";

const { hasAuth } = useAuth();
const appStore = useAppStore();
const authStore = useAuthStore();


const importModalVisible = ref(false);
const currentChannelId = ref<string>("");
const batchRechargeModalVisible = ref(false);

const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  loading,
  mobilePagination,
  scrollX,
  searchParams,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetOrderList,
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
      key: "gameId",
      title: $t("page.manage.orders.gameId"),
      align: "center",
      width: 80,
    },
    {
      key: "channelId",
      title: $t("page.manage.orders.channelID"),
      align: "center",
      width: 80,
    },
    {
      key: "serverId",
      title: $t("page.manage.orders.serverId"),
      align: "center",
      width: 80,
      ellipsis: { tooltip: true },
    },
    {
      key: "serverName",
      title: $t("page.manage.orders.serverName"),
      align: "center",
      width: 130,
      ellipsis: { tooltip: true },
    },
    {
      key: "roleId",
      title: $t("page.manage.orders.roleId"),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
    },
    {
      key: "openId",
      title: $t("page.manage.orders.openId"),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
    },
    {
      key: "loginName",
      title: $t("page.manage.orders.loginName"),
      align: "center",
      width: 120,
    },
    {
      key: "itemId",
      title: $t("page.manage.orders.itemId"),
      align: "center",
      width: 80,
    },
    {
      key: "itemName",
      title: $t("page.manage.orders.itemName"),
      align: "center",
      width: 180,
      ellipsis: { tooltip: true },
    },
    {
      key: "amount",
      title: $t("page.manage.orders.amount"),
      align: "center",
      width: 80,
    },
    {
      key: "price",
      title: $t("page.manage.orders.price"),
      align: "center",
      width: 80,
    },
    {
      key: "orderNo",
      title: $t("page.manage.orders.orderNo"),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
    },
    {
      key: "outOrderNo",
      title: $t("page.manage.orders.outOrderNo"),
      align: "center",
      minWidth: 360,
      ellipsis: { tooltip: true },
    },
    {
      key: "count",
      title: $t("page.manage.orders.count"),
      align: "center",
      width: 80,
    },
    {
      key: "payTime",
      title: $t("page.manage.orders.payTime"),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return row.payTime ? format(new Date(row.payTime), 'yyyy-MM-dd HH:mm:ss') : '';
      },
    },
    {
      key: "remark",
      title: $t("page.manage.orders.remark"),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
    },
    {
      key: "serverOrderNo",
      title: $t("page.manage.orders.serverOrderNo"),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
    },
    {
      key: "callbackCount",
      title: $t("page.manage.orders.callbackCount"),
      align: "center",
      width: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "uid",
      title: $t("page.manage.orders.uid"),
      align: "center",
      width: 120,
    },
    {
      key: "createIp",
      title: $t("page.manage.orders.createIp"),
      align: "center",
      minWidth: 120,
    },
    {
      key: "callbackIp",
      title: $t("page.manage.orders.callbackIp"),
      align: "center",
      minWidth: 180,
    },
    {
      key: "status",
      title: $t("page.manage.orders.status"),
      align: "center",
      width: 80,
      render: (row: any) => {
        if (row.status === null || row.status === undefined) {
          return null;
        }

        const statusTagMap: Record<Api.SystemManage.OrderStatus, NaiveUI.ThemeColor> = {
          '0': 'success',  // 支付成功
          '1': 'warning',  // 待支付
          '2': 'error',    // 支付失败
          '3': 'info',     // 发货中
          '4': 'success',  // 已发货
          '5': 'success',  // 已完成
          '6': 'warning',  // 待补单
        };

        const statusKey = String(row.status) as Api.SystemManage.OrderStatus;
        const statusText = $t(orderStatusRecord[statusKey] || orderStatusRecord['default']);
        const tagType = statusTagMap[statusKey] || statusTagMap['default'];

        return <NTag type={tagType}>{statusText}</NTag>;
      }
    },
    {
      key: "callbackStatus",
      title: $t("page.manage.orders.callbackStatus"),
      align: "center",
      width: 80,
      render: (row: any) => {
        if (row.callbackStatus === null || row.callbackStatus === undefined) {
          return null;
        }

        const statusTagMap: Record<Api.SystemManage.callbackStatus, NaiveUI.ThemeColor> = {
          '0': 'warning',  // 待处理
          '1': 'success',  // 处理成功
          '2': 'error',    // 处理失败
        };

        const statusKey = String(row.callbackStatus) as Api.SystemManage.callbackStatus;
        const statusText = $t(callbackStatusRecord[statusKey]);
        const tagType = statusTagMap[statusKey];

        return <NTag type={tagType}>{statusText}</NTag>;
      }
    },
    {
      key: "createTime",
      title: $t("page.manage.orders.createTime"),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return row.createTime ? format(new Date(row.createTime), 'yyyy-MM-dd HH:mm:ss') : '';
      },
    },
    {
      key: "updateTime",
      title: $t("page.manage.orders.updateTime"),
      align: "center",
      width: 180,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return row.updateTime ? format(new Date(row.updateTime), 'yyyy-MM-dd HH:mm:ss') : '';
      },
    },
  ],
  defaultHiddenKeys: ['gameId','price','count','remark','serverOrderNo','callbackCount','uid','createIp','callbackIp','callbackStatus','createTime','updateTime',],
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
} = useTableOperate(data, getData);

function handleSearch(params: any) {
  updateSearchParams(params);
  getData();
}

function handleReset() {
  // 重置搜索参数到初始状态
  resetSearchParams();
  // 重新获取数据
  getData();
}

function handleAddWithChannel() {
  handleAdd({ channelId: currentChannelId.value });
}

// 获取选中的订单数据
const selectedOrders = computed(() => {
  return data.value.filter(order =>
    checkedRowKeys.value.includes(order.orderId || order.id)
  );
});

// 批量补单功能
function handleBatchRecharge() {
  if (checkedRowKeys.value.length === 0) {
    window.$message?.warning($t("page.manage.orders.selectOrder"));
    return;
  }
  batchRechargeModalVisible.value = true;
}

// 批量补单成功回调
function onBatchRechargeSuccess() {
  checkedRowKeys.value = [];
  getData();
}

// 状态检查功能
async function handleStatusCheck() {
  if (checkedRowKeys.value.length === 0) {
    window.$message?.warning($t('page.manage.treasure.selectOrderFirst'));
    return;
  }

  // 获取选中的订单
  const selectedOrdersData = data.value.filter(order =>
    checkedRowKeys.value.includes(order.orderId || order.id)
  );

  if (selectedOrdersData.length === 0) {
    window.$message?.warning($t('page.manage.orders.noOrder'));
    return;
  }

  let successCount = 0;
  let failCount = 0;

  // 逐个检查订单状态
  for (const order of selectedOrdersData) {
    try {
      const params = {
        outOrderNo: order.outOrderNo || order.orderNo,
        serverId: order.serverId
      };

      const { data: result, error } = await fetchCheckStatus(params);

      if (!error) {
        successCount++;
      } else {
        failCount++;
        handleApiResponseError(error);
      }
    } catch (err: any) {
      failCount++;
      handleApiCatchError(err);
    }
  }

  // 显示检查结果
  if (failCount === 0) {
    window.$message?.success($t('page.manage.treasure.statusCheckComplete', { count: successCount }));
  } else {
    window.$message?.warning(
      $t('page.manage.treasure.statusCheckPartial', { success: successCount, fail: failCount })
    );
  }

  // 刷新列表
  await getData();
  // 清空选中
  checkedRowKeys.value = [];
}

</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <OrdersSearch
      v-model:model="searchParams"
      @reset="handleReset"
      @search="handleSearch"
    />
    <NCard
      :title="$t('page.manage.orders.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @add="handleAddWithChannel"
          @refresh="getData"
          @batchRecharge="handleBatchRecharge"
          :show-batch-recharge="true"
          :show-status-check="true"
          :disabled-status-check="checkedRowKeys.length === 0"
          @status-check="handleStatusCheck"
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
        :row-key="(row: any) => row.orderId || row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
    </NCard>

    <!-- 批量补单弹窗 -->
    <BatchRechargeModal
      v-model:visible="batchRechargeModalVisible"
      :selected-orders="selectedOrders"
      :checked-row-keys="checkedRowKeys"
      @success="onBatchRechargeSuccess"
    />
  </div>
</template>

<style scoped></style>
