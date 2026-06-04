<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from "naive-ui";
import { fetchGetQuestionnaireRecord, fetchExportQuestionnaireRecord } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { productStatusRecord } from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';
import { ref, onMounted } from "vue";
import { useAuth } from "@/hooks/business/auth";
import { format } from 'date-fns';
const { hasAuth } = useAuth();
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
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetQuestionnaireRecord,
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
      key: "surveyId",
      title: $t("page.manage.surveyrecord.surveyId"),
      align: "center",
      width: 80,
    },
    // @ts-ignore
    {
      key: "openId",
      title: $t("page.manage.surveyrecord.openId"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    // @ts-ignore
    {
      key: "roleId",
      title: $t("page.manage.surveyrecord.roleId"),
      align: "center",
      minWidth: 120,
    },
    // @ts-ignore
    {
      key: "serverId",
      title: $t("page.manage.surveyrecord.serverId"),
      align: "center",
      minWidth: 100,
    },
    // @ts-ignore
    {
      key: "finishedAt",
      title: $t("page.manage.surveyrecord.finishedAt"),
      align: "center",
      minWidth: 160,
      render: (row: any) => {
        return row.finishedAt ? format(new Date(row.finishedAt), 'yyyy-MM-dd HH:mm:ss') : '';
      },
    },
    // @ts-ignore
    {
      key: "wjxRespId",
      title: $t("page.manage.surveyrecord.wjxRespId"),
      align: "center",
      minWidth: 140,
    },
    // @ts-ignore
    {
      key: "extPayload",
      title: $t("page.manage.surveyrecord.extPayload"),
      align: "center",
      minWidth: 200,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        if (!row.extPayload) return '';
        try {
          const payload = JSON.parse(row.extPayload);
          // 显示前几个问题作为预览
          const preview = Object.entries(payload)
            .slice(0, 3)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
          return preview + (Object.keys(payload).length > 3 ? '...' : '');
        } catch (e) {
          return row.extPayload.substring(0, 50) + '...';
        }
      },
    },
    // @ts-ignore
    {
      key: "createdAt",
      title: $t("page.manage.surveyrecord.createdAt"),
      align: "center",
      minWidth: 160,
      render: (row: any) => {
        return row.createdAt ? format(new Date(row.createdAt), 'yyyy-MM-dd HH:mm:ss') : '';
      },
    },
    // @ts-ignore
    {
      key: "updatedAt",
      title: $t("page.manage.surveyrecord.updatedAt"),
      align: "center",
      minWidth: 160,
      render: (row: any) => {
        return row.updatedAt ? format(new Date(row.updatedAt), 'yyyy-MM-dd HH:mm:ss') : '';
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
} = useTableOperate(data, getData);

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

    // 调用问卷记录导出API
    const response = await fetchExportQuestionnaireRecord();

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
    link.download = `问卷记录_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // @ts-ignore
    window.$message?.success($t("common.exportSuccess"));
  } catch (error) {
    // 使用通用异常处理函数
    handleApiCatchError(error, '导出问卷记录');
  }
}
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >

    <NCard
      :title="$t('page.manage.surveyrecord.title')"
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
          :show-export="hasAuth('operate:surveyAnswer:export')"
          :show-export-confirm="true"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="1400"
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
