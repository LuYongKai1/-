<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from "naive-ui";
import { fetchGetGiftRecordList, fetchExportGiftRecord } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { giftActivityTypeRecord, giftBatchStatusRecord } from '@/constants/business';
import { useTable, useTableOperate } from "@/hooks/common/table";
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';
import { ref, onMounted } from "vue";
import { useAuth } from "@/hooks/business/auth";
import { format } from 'date-fns';
// @ts-ignore
import RewardDetailModal from './modules/reward-detail-modal.vue';
const { hasAuth } = useAuth();
const appStore = useAppStore();

// 奖励详情弹窗相关
const showRewardDetail = ref(false);
const currentRewardSnapshot = ref('');

// 打开奖励详情
function handleViewReward(rewardSnapshot: string) {
  currentRewardSnapshot.value = rewardSnapshot;
  showRewardDetail.value = true;
}

// 状态映射
const statusOptions: Record<number, { label: string; type: 'success' | 'error' | 'warning' }> = {
  1: { label: '成功', type: 'success' },
  0: { label: '失败', type: 'error' },
  2: { label: '处理中', type: 'warning' }
};


const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetGiftRecordList,
  showTotal: true,
  // immediate: false/,
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
    // @ts-ignore
    {
      key: "id",
      title: "ID",
      align: "center",
      width: 80,
    },
    // @ts-ignore
    {
      key: "campaignId",
      title: $t("page.manage.redeemrecord.campaignId"),
      align: "center",
      width: 100,
    },
    // @ts-ignore
    {
      key: "codeId",
      title: $t("page.manage.redeemrecord.codeId"),
      align: "center",
      width: 100,
    },
    // @ts-ignore
    {
      key: "codeType",
      title: $t("page.manage.redeemrecord.codeType"),
      align: "center",
      width: 100,
      render: (row: any) => {
        if (row.codeType === null) {
          return null;
        }

        const tagMap: Record<string, NaiveUI.ThemeColor> = {
          1: "info",  // 通码 → 蓝色
          2: "error",  // 专码 → 紫色
        };

        const label = $t(giftActivityTypeRecord[row.codeType as keyof typeof giftActivityTypeRecord]);

        return <NTag type={tagMap[row.codeType]}>{label}</NTag>;
      },
    },
    // @ts-ignore
    {
      key: "openId",
      title: $t("page.manage.redeemrecord.openId"),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
    },
    // @ts-ignore
    {
      key: "roleId",
      title: $t("page.manage.redeemrecord.roleId"),
      align: "center",
      minWidth: 180,
      ellipsis: { tooltip: true },
    },
    // @ts-ignore
    {
      key: "serverId",
      title: $t("page.manage.redeemrecord.serverId"),
      align: "center",
      width: 100,
    },
    // @ts-ignore
    {
      key: "channelId",
      title: $t("page.manage.redeemrecord.channelId"),
      align: "center",
      width: 100,
    },
    // @ts-ignore
    {
      key: "ip",
      title: $t("page.manage.redeemrecord.ip"),
      align: "center",
      width: 120,
    },
    // @ts-ignore
    {
      key: "deviceId",
      title: $t("page.manage.redeemrecord.deviceId"),
      align: "center",
      width: 120,
      render: (row: any) => {
        return row.deviceId || '-';
      },
    },
    // @ts-ignore
    {
      key: "traceId",
      title: $t("page.manage.redeemrecord.traceId"),
      align: "center",
      minWidth: 150,
      ellipsis: { tooltip: true },
    },
    // @ts-ignore
    {
      key: "status",
      title: $t("page.manage.redeemrecord.status"),
      align: "center",
      width: 100,
      render: (row: any) => {
        const statusInfo = statusOptions[row.status];
        if (statusInfo) {
          return <NTag type={statusInfo.type}>{statusInfo.label}</NTag>;
        }
        return row.status;
      },
    },
    // @ts-ignore

    // @ts-ignore
    {
      key: "createdAt",
      title: $t("page.manage.redeemrecord.createdAt"),
      align: "center",
      minWidth: 160,
      render: (row: any) => {
        return row.createdAt ? format(new Date(row.createdAt), 'yyyy-MM-dd HH:mm:ss') : '';
      },
    },
    {
      key: "failReason",
      title: $t("page.manage.redeemrecord.failReason"),
      align: "center",
      minWidth: 150,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return row.failReason || '-';
      },
    },
    {
      key: "rewardSnapshot",
      title: $t("page.manage.redeemrecord.rewardSnapshot"),
      align: "center",
      minWidth: 200,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        if (!row.rewardSnapshot || row.rewardSnapshot === '{}') return '-';

        return (
          <div class="flex items-center gap-2">
            <span class="flex-1 truncate">
              {(() => {
                try {
                  const snapshot = JSON.parse(row.rewardSnapshot);
                  const preview = Object.entries(snapshot)
                    .slice(0, 2)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ');
                  return preview + (Object.keys(snapshot).length > 2 ? '...' : '');
                } catch (e) {
                  return row.rewardSnapshot.substring(0, 30) + '...';
                }
              })()}
            </span>
            <NButton
              size="small"
              type="primary"
              ghost
              onClick={() => handleViewReward(row.rewardSnapshot)}
            >
            { $t('common.view') }
            </NButton>
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
  handleAdd,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted,
  // closeDrawer
} = useTableOperate(data as any, getData);

// function handleSearch(channelId: string, channelName: string, channelProductId: string, gameProductId: string) {
//   currentChannelId.value = channelId;
//   currentChannelName.value = channelName;
//   const params: any = {
//     channelId,
//     channelName,
//     channelProductId,
//     gameProductId,
//   };
//   updateSearchParams(params);
//   getData();
// }


// 处理导出
async function handleExport() {
  try {
    // @ts-ignore
    window.$message?.info($t("common.exportingData"));

    // 调用兑换记录导出API
    // 注意：根据API定义需要batchId参数，这里使用默认值
    const response = await fetchExportGiftRecord({ batchId: 1 });

    // 对于文件下载，直接处理blob响应，不使用通用错误处理
    const blob = (response as any)?.data || (response as any)?.response?.data || response;

    // 检查是否获取到有效的blob数据
    if (!blob || (blob instanceof Blob && blob.size === 0)) {
      // @ts-ignore
      window.$message?.error($t("common.exportFailed") + ": 没有数据");
      return;
    }

    // 如果响应不是blob，尝试创建blob
    let fileBlob;
    if (blob instanceof Blob) {
      fileBlob = blob;
    } else {
      // 创建blob对象
      fileBlob = new Blob([blob], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    }

    // 检查文件大小
    if (fileBlob.size === 0) {
      // @ts-ignore
      window.$message?.warning($t("common.exportFailed") + ": 没有数据");
      return;
    }

    // 创建下载链接
    const url = window.URL.createObjectURL(fileBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `兑换记录_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // @ts-ignore
    window.$message?.success($t("common.exportSuccess"));
  } catch (error) {
    // 使用通用异常处理函数
    handleApiCatchError(error, '导出兑换记录');
  }
}
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <NCard
      :title="$t('page.manage.redeemrecord.title')"
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
          @export="handleExport"
          :show-export="hasAuth('gift:redeem:export')"
          :show-export-confirm="true"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="2000"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
    </NCard>

    <!-- 奖励详情弹窗 -->
    <RewardDetailModal
      v-model:show="showRewardDetail"
      :reward-snapshot="currentRewardSnapshot"
    />
  </div>
</template>

<style scoped></style>
