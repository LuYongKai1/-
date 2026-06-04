<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from "naive-ui";
import {
  fetchGetRoleRetentionList,
  fetchDeleteWhiteListManage,
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { serverStatusWhite } from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import RetentionRoleSearch from "./modules/retentionrole-search.vue";
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
  apiFn: fetchGetRoleRetentionList,
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
      title: $t("page.manage.retention.targetDay"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "serverId",
      title: $t("page.manage.retention.serverID"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "serverName",
      title: $t("page.manage.retention.serverName"),
      align: "center",
      minWidth: 130,
      ellipsis: { tooltip: true },
      render: (row) => {
        return row.serverName || "-";
      }
    },
    {
      key: "channelId",
      title: $t("page.manage.retention.channelID"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "channelName",
      title: $t("page.manage.retention.channelName"),
      align: "center",
      minWidth: 130,
      ellipsis: { tooltip: true },
      render: (row) => {
        return row.channelName || "-";
      }
    },
    {
      key: "day1",
      title: $t("page.manage.retention.RoleAdd"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day2",
      title: $t("page.manage.retention.Retention1"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day3",
      title: $t("page.manage.retention.Retention3"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day4",
      title: $t("page.manage.retention.Retention4"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day5",
      title: $t("page.manage.retention.Retention5"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day6",
      title: $t("page.manage.retention.Retention6"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day7",
      title: $t("page.manage.retention.Retention7"),
      align: "center",
      minWidth: 130,
    },
      {
      key: "day8",
      title: $t("page.manage.retention.Retention8"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day9",
      title: $t("page.manage.retention.Retention9"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day10",
      title: $t("page.manage.retention.Retention10"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day11",
      title: $t("page.manage.retention.Retention11"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day12",
      title: $t("page.manage.retention.Retention12"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day13",
      title: $t("page.manage.retention.Retention13"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day14",
      title: $t("page.manage.retention.Retention14"),
      align: "center",
      minWidth: 60,
    },
    {
      key: "day15",
      title: $t("page.manage.retention.Retention15"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day16",
      title: $t("page.manage.retention.Retention16"),
      align: "center",
      minWidth: 60,
    },
    {
      key: "day17",
      title: $t("page.manage.retention.Retention17"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day18",
      title: $t("page.manage.retention.Retention18"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day19",
      title: $t("page.manage.retention.Retention19"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day20",
      title: $t("page.manage.retention.Retention20"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day21",
      title: $t("page.manage.retention.Retention21"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day22",
      title: $t("page.manage.retention.Retention22"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day23",
      title: $t("page.manage.retention.Retention23"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day24",
      title: $t("page.manage.retention.Retention24"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day25",
      title: $t("page.manage.retention.Retention25"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day26",
      title: $t("page.manage.retention.Retention26"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day27",
      title: $t("page.manage.retention.Retention27"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day28",
      title: $t("page.manage.retention.Retention28"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day29",
      title: $t("page.manage.retention.Retention29"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day30",
      title: $t("page.manage.retention.Retention30"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day45",
      title: $t("page.manage.retention.Retention45"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day60",
      title: $t("page.manage.retention.Retention60"),
      align: "center",
      minWidth: 130,
    },
    {
      key: "day90",
      title: $t("page.manage.retention.Retention90"),
      align: "center",
      minWidth: 130,
    },
  ],
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


// 监听数据分组变化并更新列显示状态
function handleSearch(serverId: string, channelId: string, retentionGroupType: string, targetDay?: string | null, beginTime?: string, endTime?: string, retentionType?: string) {
  const params: any = {
    channelId,
    serverId,
    retentionGroupType,
    retentionType,
  };

  // 根据分组类型显示/隐藏列
  columnChecks.value.forEach((columnCheck) => {
    if (columnCheck.key === 'serverId') {
      columnCheck.checked = retentionGroupType === 'server';
    }
    if (columnCheck.key === 'channelId') {
      columnCheck.checked = retentionGroupType === 'channel';
    }
    if (columnCheck.key === 'serverName') {
      columnCheck.checked = retentionGroupType === 'server';
    }
    if (columnCheck.key === 'channelName') {
      columnCheck.checked = retentionGroupType === 'channel';
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
    <RetentionRoleSearch
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />
    <NCard
      :title="$t('page.manage.retention.title')"
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
