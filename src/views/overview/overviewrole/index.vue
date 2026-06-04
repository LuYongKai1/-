<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from "naive-ui";
import {
  fetchGetRoleOverview,
  fetchDeleteWhiteListManage,
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { serverStatusWhite } from "@/constants/business";
import { useTable, useTableOperate, createTooltipHeader } from "@/hooks/common/table";
import OverviewRoleSearch from "./modules/overviewrole-search.vue";
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
  apiFn: fetchGetRoleOverview,
  showTotal: true,
  immediate: false,
  apiParams: {
    current: 1,
    size: 30,
    dataType: 'DAY',
  },
  columns: () => [
    {
      key: "targetDay",
      title: createTooltipHeader($t("page.manage.overviewrole.targetDay"), "targetDay", "page.manage.overviewrole.tooltips"),
      align: "center",
      minWidth: 130,
      render: (row) => {
        if (row.summary) {
          return $t('common.total');
        }
        return row.targetDay === 0 ? $t('common.all') : row.targetDay;
      }
    },
    {
      key: "serverId",
      title: $t("page.manage.overviewrole.serverID"),
      align: "center",
      minWidth: 130,
      render: (row) => {
        if (row.summary) {
          return $t('common.total');
        }
        return row.serverId;
      }
    },
    {
      key: "serverName",
      title: $t("page.manage.overviewrole.serverName"),
      align: "center",
      minWidth: 130,
      ellipsis: { tooltip: true },
      render: (row) => {
        return row.serverName || "-";
      }
    },
    {
      key: "channelId",
      title: $t("page.manage.overviewrole.channelID"),
      align: "center",
      minWidth: 130,
      render: (row) => {
        if (row.summary) {
          return $t('common.total');
        }
        return row.channelId;
      }
    },
    {
      key: "channelName",
      title: $t("page.manage.overviewrole.channelName"),
      align: "center",
      minWidth: 130,
      ellipsis: { tooltip: true },
      render: (row) => {
        return row.channelName || "-";
      }
    },
    {
      key: "roleAdd",
      title: createTooltipHeader($t("page.manage.overviewrole.roleAdd"), "roleAdd", "page.manage.overviewrole.tooltips"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "addPayed",
      title: createTooltipHeader($t("page.manage.overviewrole.addPayedRole"), "addPayedRole", "page.manage.overviewrole.tooltips"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "addTotal",
      title: createTooltipHeader($t("page.manage.overviewrole.addTotal"), "addTotal", "page.manage.overviewrole.tooltips"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "newPayRate",
      title: createTooltipHeader($t("page.manage.overviewrole.NewPayingRate"), "NewPayingRate", "page.manage.overviewrole.tooltips"),
      align: "center",
      minWidth: 120,
      render: (row) => {
        const result = (row.addPayed * 100) / row.roleAdd;
        return isNaN(result) ? '0.00%' : result.toFixed(2) + '%';
      }
    },
    {
      key: "newARPU",
      title: createTooltipHeader($t("page.manage.overviewrole.NewARPU"), "NewARPU", "page.manage.overviewrole.tooltips"),
      align: "center",
      minWidth: 130,
      render: (row) => {
        const result = row.addTotal / row.roleAdd;
        return isNaN(result) ? '0.00' : result.toFixed(2);
      }
    },
    // {
    //   key: "newPayARPU",
    //   title: createTooltipHeader($t("page.manage.overviewrole.NewPayARPU"), "NewPayARPU", "page.manage.overviewrole.tooltips"),
    //   align: "center",
    //   minWidth: 100,
    //   render: (row) => {
    //     return (row.addTotal / row.addPayed).toFixed(2);
    //   }
    // },
    {
      key: "roleLogin",
      title: createTooltipHeader($t("page.manage.overviewrole.LoginRoles"), "LoginRoles", "page.manage.overviewrole.tooltips"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "rolePayed",
      title: createTooltipHeader($t("page.manage.overviewrole.LoginPayingRoles"), "LoginPayingRoles", "page.manage.overviewrole.tooltips"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "payedTotal",
      title: createTooltipHeader($t("page.manage.overviewrole.TotalPayingIncome"), "TotalPayingIncome", "page.manage.overviewrole.tooltips"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "loginPayRate",
      title: createTooltipHeader($t("page.manage.overviewrole.LoginPayingRate"), "LoginPayingRate", "page.manage.overviewrole.tooltips"),
      align: "center",
      minWidth: 130,
      render: (row) => {
        return ((row.rolePayed * 100) / row.roleLogin).toFixed(2) + '%';
      }
    },
    // {
    //   key: "loginPayARPU",
    //   title: createTooltipHeader($t("page.manage.overviewrole.LoginPayARPU"), "LoginPayARPU", "page.manage.overviewrole.tooltips"),
    //   align: "center",
    //   minWidth: 100,
    //   render: (row) => {
    //     return (row.payedTotal / row.rolePayed).toFixed(2);
    //   }
    // },
    {
      key: "loginARPU",
      title: createTooltipHeader($t("page.manage.overviewrole.LoginARPU"), "LoginARPU", "page.manage.overviewrole.tooltips"),
      align: "center",
      minWidth: 130,
      render: (row) => {
        return (row.payedTotal / row.roleLogin).toFixed(2);
      }
    },
    {
      key: "avgOnlineTime",
      title: $t("page.manage.overviewrole.AverageOnlineTime"),
      align: "center",
      minWidth: 130,
      render: (row) => {
        return (row.onlineTotal / row.roleLogin).toFixed(2);
      }
    },
    // {
    //   key: "avgGameTime",
    //   title: createTooltipHeader($t("page.manage.overviewrole.AverageGameTime"), "AverageGameTime", "page.manage.overviewrole.tooltips"),
    //   align: "center",
    //   minWidth: 100,
    //   render: (row) => {
    //     return (row.onlineTotal / row.timesTotal).toFixed(2);
    //   }
    // },
    {
      key: "avgGameSessions",
      title: createTooltipHeader($t("page.manage.overviewrole.AverageGameSessions"), "AverageGameSessions", "page.manage.overviewrole.tooltips"),
      align: "center",
      minWidth: 130,
      render: (row) => {
        return (row.timesTotal / row.roleLogin).toFixed(2);
      }
    },
    {
      key: "avgOnlineUsers",
      title: createTooltipHeader($t("page.manage.overviewrole.AverageOnlineUsers"), "AverageOnlineUsers", "page.manage.overviewrole.tooltips"),
      align: "center",
      minWidth: 130,
      render: (row) => {
        if (row.channelId === 0 && row.index === 0) {
          return null;
        }
        return parseInt(row.onlineTotal / 1440);
      }
    },
  ],
  defaultHiddenKeys: ['avgOnlineUsers'],
});

const {
  drawerVisible,
  operateType,
  editingData,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted,
} = useTableOperate(data, getData);

// 监听数据分组变化并更新列显示状态
function handleSearch(serverId: string, channelId: string, retentionGroupType: string, targetDay?: string | null, beginTime?: string, endTime?: string,) {
  const params: any = {
    channelId,
    serverId,
    retentionGroupType,
    gameId: 101,
  };

  // 根据分组类型显示/隐藏列
  columnChecks.value.forEach((columnCheck) => {
    if (columnCheck.key === 'serverId') {
      columnCheck.checked = retentionGroupType === 'server' || retentionGroupType === 'combo';
    }
    if (columnCheck.key === 'serverName') {
      columnCheck.checked = retentionGroupType === 'server' || retentionGroupType === 'combo';
    }
    if (columnCheck.key === 'channelId') {
      columnCheck.checked = retentionGroupType === 'channel' || retentionGroupType === 'combo';
    }
    if (columnCheck.key === 'channelName') {
      columnCheck.checked = retentionGroupType === 'channel' || retentionGroupType === 'combo';
    }
    if (columnCheck.key === 'targetDay') {
      columnCheck.checked = retentionGroupType === 'date';
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
    <OverviewRoleSearch
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />
    <NCard
      :title="$t('page.manage.overviewrole.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
        v-model:columns="columnChecks"
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
