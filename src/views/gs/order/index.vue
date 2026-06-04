<script setup lang="tsx">
import { ref, onMounted, nextTick, watch, computed } from "vue";
import { NTag, NCard, NDataTable, NButton } from "naive-ui";
import { useRoute, useRouter } from "vue-router";
import { format } from "date-fns";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { orderStatusRecord } from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { fetchGetGsOrderList } from "@/service/api";
import OrdersSearch from "./modules/products-search.vue";

const appStore = useAppStore();
const route = useRoute();
const router = useRouter();

const currentChannelId = ref<string>("");

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
  apiFn: fetchGetGsOrderList,
  immediate: false,
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
      width: 70,
    },
    {
      key: "channelId",
      title: $t("page.manage.orders.channelID"),
      align: "center",
      width: 70,
    },
    {
      key: "serverId",
      title: $t("page.manage.orders.serverId"),
      align: "center",
      width: 70,
      ellipsis: { tooltip: true },
    },
    {
      key: "roleId",
      title: $t("page.manage.orders.roleId"),
      align: "center",
      width: 160,
      ellipsis: { tooltip: true },
    },
    {
      key: "openId",
      title: $t("page.manage.orders.openId"),
      align: "center",
      width: 160,
      ellipsis: { tooltip: true },
    },
    {
      key: "loginName",
      title: $t("page.manage.orders.loginName"),
      align: "center",
      width: 100,
    },
    {
      key: "itemId",
      title: $t("page.manage.orders.itemId"),
      align: "center",
      width: 70,
    },
    {
      key: "amount",
      title: $t("page.manage.orders.amount"),
      align: "center",
      width: 70,
    },
    {
      key: "price",
      title: $t("page.manage.orders.price"),
      align: "center",
      width: 70,
    },
    {
      key: "outOrderNo",
      title: $t("page.manage.orders.outOrderNo"),
      align: "center",
      width: 280,
      ellipsis: { tooltip: true },
    },
    {
      key: "count",
      title: $t("page.manage.orders.count"),
      align: "center",
      width: 70,
    },
    {
      key: "status",
      title: $t("page.manage.orders.status"),
      align: "center",
      width: 90,
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
      key: "createTime",
      title: $t("page.manage.orders.createTime"),
      align: "center",
      width: 160,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return row.createTime ? format(new Date(row.createTime), 'yyyy-MM-dd HH:mm:ss') : '';
      },
    },
    {
      key: "updateTime",
      title: $t("page.manage.orders.updateTime"),
      align: "center",
      width: 160,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return row.updateTime ? format(new Date(row.updateTime), 'yyyy-MM-dd HH:mm:ss') : '';
      },
    },
    {
      key: "extrasParams",
      title: $t("page.manage.orders.extrasParams"),
      align: "center",
      width: 150,
      ellipsis: { tooltip: true },
    },
  ],
  defaultHiddenKeys: ['gameId','price','count','createTime','updateTime','extrasParams'],
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

/**
 * 处理基于角色ID的订单搜索
 * @param roleId - 角色ID，可选参数
 * @description 当从GS角色列表跳转过来时，根据角色ID自动搜索该角色的订单
 */
async function handleRoleIdSearch(roleId?: string) {
  if (roleId) {
    // 设置搜索条件为角色ID
    Object.assign(searchParams, {
      searchType: 'roleId',
      searchValue: roleId
    });

    // 等待DOM更新确保搜索框显示正确的值
    await nextTick();

    // 执行搜索
    handleSearch({ roleId });
  } else {
    // 没有角色ID参数时，加载所有订单
    getData();
  }
}

// 监听路由查询参数变化
// 场景：用户在订单页面时，再次从角色列表点击其他角色的"查看订单"
watch(
  () => route.query.roleId as string | undefined,
  (newRoleId) => {
    if (newRoleId) {
      handleRoleIdSearch(newRoleId);
    }
  }
);

// 组件挂载时初始化
// 场景：首次从角色列表跳转到订单页面
onMounted(() => {
  const roleId = route.query.roleId as string | undefined;
  handleRoleIdSearch(roleId);
});

// 判断是否显示返回按钮（从角色列表跳转过来时显示）
const showBackButton = computed(() => !!route.query.roleId);

/**
 * 返回GS角色列表页面
 */
function handleBackToRoleList() {
  router.push({ name: 'gs_role' });
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
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header>
        <div class="flex items-center gap-8px">
          <!-- 返回按钮 -->
          <NButton
            v-if="showBackButton"
            text
            type="primary"
            @click="handleBackToRoleList"
            size="small"
            title="返回GS角色列表"
          >
            <template #icon>
              <icon-mdi-arrow-left class="text-icon" />
            </template>
          </NButton>
          <span>{{ $t('page.manage.orders.title') }}</span>
        </div>
      </template>
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @add="handleAddWithChannel"
          @refresh="getData"
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
  </div>
</template>

<style scoped></style>
