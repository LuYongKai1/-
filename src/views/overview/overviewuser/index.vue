<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NTooltip } from "naive-ui";
import { fetchGetUserOverview } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { serverStatusWhite } from "@/constants/business";
import { useTable, useTableOperate, createTooltipHeader } from "@/hooks/common/table";
import WhiteSelect from "./modules/overviewuser-search.vue";
import { ref, onMounted } from "vue";

const appStore = useAppStore();

const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  loading,
  mobilePagination,
  searchParams,
  scrollX,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetUserOverview,
  showTotal: true,
  immediate: false,
  apiParams: {
    current: 1,
    size: 30,
    dataType: "DAY",
  },
  columns: () => [
    {
      key: "targetDay",
      title: $t("page.manage.overviewuser.targetDay"),
      align: "center",
      minWidth: 130,
      // sorter: true,
      render: (row: any) => {
        if (row.summary) {
          return $t("common.total");
        }
        return row.targetDay === 0 ? $t("common.all") : row.targetDay;
      },
    },
    {
      key: "channelId",
      title: $t("page.manage.overviewuser.channelID"),
      align: "center",
      minWidth: 130,
      render: (row: any) => {
        if (row.summary) {
          return $t("common.total");
        }
        return row.channelId;
      },
    },
        {
      key: "channelName",
      title: $t("page.manage.overviewuser.channelName"),
      align: "center",
      minWidth: 130,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return row.channelName || "-";
      },
    },
    {
      key: "deviceAdd",
      title: $t("page.manage.overviewuser.ActivatedDevices"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "deviceReg",
      title: $t("page.manage.overviewuser.NewDevices"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "userAdd",
      title: createTooltipHeader($t("page.manage.overviewuser.NewUsers"), "NewUsers", "page.manage.overviewuser.tooltips"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "userAddPayed",
      title: createTooltipHeader($t("page.manage.overviewuser.NewPayingUsers"), "NewPayingUsers", "page.manage.overviewuser.tooltips"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "userAddTotal",
      title: createTooltipHeader($t("page.manage.overviewuser.NewPayingIncome"), "NewPayingIncome", "page.manage.overviewuser.tooltips"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "newArpu",
      title: createTooltipHeader($t("page.manage.overviewuser.NewARPU"), "NewARPU", "page.manage.overviewuser.tooltips"),
      align: "center",
      minWidth: 130,
      render: (row: any) => {
        return row.userAdd > 0 // 严格大于 0
          ? (row.userAddTotal / row.userAdd).toFixed(2)
          : "0.00";
      },
    },
    {
      key: "newPayRate",
      title: createTooltipHeader($t("page.manage.overviewuser.NewPayingRate"), "NewPayingRate", "page.manage.overviewuser.tooltips"),
      align: "center",
      minWidth: 130,
      render: (row: any) => {
        return row.userAdd > 0 // 严格大于 0
          ? ((row.userAddPayed * 100) / row.userAdd).toFixed(2) + "%"
          : "0.00%";
      },
    },
    {
      key: "newPayArpu",
      title: createTooltipHeader($t("page.manage.overviewuser.NewPayingARPU"), "NewPayingARPU", "page.manage.overviewuser.tooltips"),
      align: "center",
      minWidth: 130,
      render: (row: any) => {
        return row.userAddPayed > 0
          ? (row.userAddTotal / row.userAddPayed).toFixed(2)
          : "0.00";
      },
    },
    {
      key: "deviceLaunch",
      title: $t("page.manage.overviewuser.BootedDevices"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "deviceLogin",
      title: createTooltipHeader($t("page.manage.overviewuser.LoggedInDevices"), "LoggedInDevices", "page.manage.overviewuser.tooltips"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "userLogin",
      title: createTooltipHeader($t("page.manage.overviewuser.LoggedInUsers"), "LoggedInUsers", "page.manage.overviewuser.tooltips"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "activeUser",
      title: createTooltipHeader($t("page.manage.overviewuser.ActiveUsers"), "ActiveUsers", "page.manage.overviewuser.tooltips"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "userPayed",
      title: createTooltipHeader($t("page.manage.overviewuser.LoggedInPayingUsers"), "LoggedInPayingUsers", "page.manage.overviewuser.tooltips"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "payedTotal",
      title: createTooltipHeader($t("page.manage.overviewuser.TotalPayingIncome"), "TotalPayingIncome", "page.manage.overviewuser.tooltips"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "loginPayArpu",
      title: createTooltipHeader($t("page.manage.overviewuser.LoggedInPayingARPU"), "LoggedInPayingARPU", "page.manage.overviewuser.tooltips"),
      align: "center",
      minWidth: 130,
      render: (row: any) => {
        return row.userPayed > 0
          ? (row.payedTotal / row.userPayed).toFixed(2)
          : "0.00";
      },
    },
    {
      key: "loginPayRate",
      title: createTooltipHeader($t("page.manage.overviewuser.LoggedInPayingRate"), "LoggedInPayingRate", "page.manage.overviewuser.tooltips"),
      align: "center",
      minWidth: 130,
      render: (row: any) => {
        return ((row.userPayed * 100) / row.userLogin).toFixed(2) + "%";
      },
    },
    {
      key: "loginArpu",
      title: createTooltipHeader($t("page.manage.overviewuser.LoggedInARPU"), "LoggedInARPU", "page.manage.overviewuser.tooltips"),
      align: "center",
      minWidth: 130,
      render: (row: any) => {
        return (row.payedTotal / row.userLogin).toFixed(2);
      },
    },
    {
      key: "paySuccessRate",
      title: createTooltipHeader($t("page.manage.overviewuser.PayingSuccessRate"), "PayingSuccessRate", "page.manage.overviewuser.tooltips"),
      align: "center",
      minWidth: 130,
      render: (row: any) => {
        return row.orderRequest > 0
          ? ((row.orderPayed * 100) / row.orderRequest).toFixed(2) + "%"
          : "0.00%";
      },
    },
    {
      key: "avgLaunchTimes",
      title: $t("page.manage.overviewuser.AverageLaunchTimes"),
      align: "center",
      minWidth: 130,
      render: (row: any) => {
        return (row.launch / row.deviceLaunch).toFixed(2);
      },
    },
  ],
  defaultHiddenKeys: ['deviceAdd','deviceReg','deviceLaunch','avgLaunchTimes']
});

const { checkedRowKeys, onBatchDeleted, onDeleted } = useTableOperate(
  data,
  getData
);

function handleSearch(
  channelId: string,
  groupType: string,
  targetDay?: string | null,
  beginTime?: string,
  endTime?: string
) {
  const params: any = {
    channelId,
    groupType,
    gameId: 101,
  };

  columnChecks.value.forEach((columnCheck) => {
    if (columnCheck.key === "channelId") {
      columnCheck.checked = groupType === "channel" || groupType === "combo";
    }
    if (columnCheck.key === "channelName") {
      columnCheck.checked = groupType === "channel" || groupType === "combo";
    }
    if (columnCheck.key === "targetDay") {
      columnCheck.checked =
        groupType === "date" || groupType === "combo";
    }
  });

  if (targetDay) {
    params.targetDay = targetDay;
  }
  if (beginTime) {
    params.beginTime = beginTime;
  }
  if (endTime) {
    params.endTime = endTime;
  }

  updateSearchParams(params);
  getData();
}

function handleFilterTime(range: 'DAY' | 'WEEK' | 'MONTH') {
  const dataTypeMap = {
    'day': 'DAY',
    'week': 'WEEK',
    'month': 'MONTH'
  };

  updateSearchParams({
    dataType: dataTypeMap[range],
  });
  getData();
}


onMounted(() => {
  // 移除清空数据的操作，让搜索组件主动触发初始搜索
});

</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <WhiteSelect
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />
    <NCard
      :title="$t('page.manage.overviewuser.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @refresh="getData"
          @filter-time="handleFilterTime"
          :show-time-filter="true"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="scrollX"
        :max-height="3200"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
    </NCard>
  </div>
</template>



<style scoped></style>
