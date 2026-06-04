<script setup lang="tsx">
import { NCard, NDataTable, NTag, NTabs, NTabPane } from "naive-ui";
import { fetchDataPackageList, fetchUpdateDataPackage, fetchGetPackageVersion } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useTable } from "@/hooks/common/table";
import { format } from 'date-fns';
import { useMessage } from 'naive-ui';
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import { ref } from 'vue';
import { useAuth } from '@/hooks/business/auth';
import TableHeaderOperation from '@/components/advanced/table-header-operation.vue';
import FileManagement from './modules/file-management.vue';

// 数据包文件类型定义
interface DataPackageFile {
  name: string;
  size: number;
  last_modified: string;
}

const appStore = useAppStore();
const message = useMessage();
const { hasAuth } = useAuth();

// 标签页切换
const activeTab = ref('datapackage');

// 文件管理组件引用
const fileManagementRef = ref<any>(null);

// 更新数据包的加载状态
const updateLoading = ref(false);
const getVersionLoading = ref(false);
const currentVersion = ref<string>("");

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化日期时间
function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return format(date, 'yyyy-MM-dd HH:mm:ss');
  } catch (error) {
    return dateString;
  }
}

// 获取数据包列表的适配器函数
async function getDataPackageListAdapter(params?: any) {
  const res = await fetchDataPackageList(params);
  const responseData = (res as any)?.response?.data || (res as any)?.data || [];
  const fileList = Array.isArray(responseData) ? responseData :
                   Array.isArray(responseData.data) ? responseData.data :
                   Array.isArray(responseData.rows) ? responseData.rows : [];

  return {
    response: {
      data: {
        rows: fileList,
        data: fileList,
        current: 1,
        size: fileList.length || 1,
        total: fileList.length
      }
    }
  } as any;
}

// 使用 useTable hook
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
} = useTable({
  apiFn: getDataPackageListAdapter as any,
  showTotal: true,
  apiParams: {
    current: 1,
    size: 10, // 设置一个很大的值，确保一次性加载所有数据包文件
  },
  columns: () => [
    {
      key: "name" as any,
      title: $t("page.manage.serverFile.name"),
      align: "left",
      minWidth: 300,
      ellipsis: { tooltip: true }
    },
    {
      key: "size" as any,
      title: $t("page.manage.serverFile.size"),
      align: "center",
      minWidth: 120,
      render: (row: any) => formatFileSize(row.size)
    },
    {
      key: "last_modified" as any,
      title: $t("page.manage.serverFile.lastModified"),
      align: "center",
      minWidth: 180,
      render: (row: any) => formatDateTime(row.last_modified)
    },
  ],
});

// 处理更新数据包
async function handleUpdateDataPackage() {
  if (updateLoading.value) return; // 防止重复点击

  let loadingMessage: ReturnType<typeof message.loading> | null = null;

  try {
    updateLoading.value = true;

    // 显示加载提示
    loadingMessage = message.loading("正在更新数据包...", { duration: 0 });

    // 调用更新数据包的 API
    const response = await fetchUpdateDataPackage({});

    // 检查响应是否有错误
    if (handleApiResponseError(response, $t("common.updateDataPackage"))) {
      return; // 如果有错误，handleApiResponseError 已经显示了错误消息，直接返回
    }

    // 更新成功后刷新数据列表
    await getData();
    message.success($t("common.updateDataPackageSuccess"));
  } catch (error) {
    // 处理异常错误，显示 API 返回的 msg
    handleApiCatchError(error, $t("common.updateDataPackage"));
  } finally {
    // 关闭加载提示
    if (loadingMessage) {
      loadingMessage.destroy();
    }
    updateLoading.value = false;
  }
}

// 获取版本号
async function handleGetPackageVersion() {
  if (getVersionLoading.value) return;

  try {
    getVersionLoading.value = true;
    const res = await fetchGetPackageVersion();

    if (handleApiResponseError(res, $t("common.getPackageVersion"))) {
      return;
    }

    const dataRoot = (res as any)?.data ?? (res as any)?.response?.data ?? res;
    const versions = dataRoot?.versions ?? [];
    const version = Array.isArray(versions) && versions[0]?.version || "";

    currentVersion.value = version || $t("common.noData");
    message.info(`${$t("common.currentVersion")}: ${currentVersion.value}`);
  } catch (error) {
    handleApiCatchError(error, $t("common.getPackageVersion"));
  } finally {
    getVersionLoading.value = false;
  }
}

// 处理上传文件（仅文件管理标签页使用）
function handleUploadFile() {
  fileManagementRef.value?.handleUpload();
}

// 处理刷新
function handleRefresh() {
  if (activeTab.value === 'datapackage') {
    getData();
  } else if (activeTab.value === 'filemanagement' && fileManagementRef.value) {
    fileManagementRef.value.getData();
  }
}

</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <NCard
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header>
        <NTabs v-model:value="activeTab" type="line" size="small">
          <NTabPane name="datapackage" :tab="$t('route.server_datapackage')" />
          <NTabPane name="filemanagement" :tab="$t('page.manage.serverFile.title')" />
        </NTabs>
      </template>

      <template #header-extra>
        <!-- 数据包管理操作按钮 -->
        <TableHeaderOperation
          v-if="activeTab === 'datapackage'"
          v-model:columns="columnChecks"
          :loading="loading"
          :show-update-data-package="hasAuth('operate:datapackageupdate')"
          :disabled-update-data-package="updateLoading"
          :show-get-package-version="hasAuth('operate:datapackage:version')"
          :disabled-get-package-version="getVersionLoading"
          @refresh="handleRefresh"
          @update-data-package="handleUpdateDataPackage"
          @get-package-version="handleGetPackageVersion"
        />

        <!-- 文件管理操作按钮 -->
        <TableHeaderOperation
          v-else-if="activeTab === 'filemanagement' && fileManagementRef"
          v-model:columns="fileManagementRef.columnChecks"
          :loading="fileManagementRef.loading"
          :show-upload-file="true"
          @refresh="handleRefresh"
          @upload-file="handleUploadFile"
        />
      </template>

      <!-- 数据包管理标签页内容 -->
      <div v-show="activeTab === 'datapackage'" class="h-full">
        <!-- 当前版本展示 -->
        <div v-if="currentVersion" class="mb-12px">
          <NTag type="info" size="small">
            {{ $t('common.currentVersion') }}: {{ currentVersion }}
          </NTag>
        </div>

        <NDataTable
          :columns="columns"
          :data="data"
          size="small"
          :loading="loading"
          :row-key="(row) => row.name"
          :pagination="mobilePagination"
        />
      </div>

      <!-- 文件管理标签页内容 -->
      <div v-show="activeTab === 'filemanagement'" class="h-full">
        <FileManagement ref="fileManagementRef" />
      </div>
    </NCard>
  </div>
</template>

<style scoped></style>
