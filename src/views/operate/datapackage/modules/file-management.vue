<script setup lang="tsx">
import { NDataTable, NButton, NSpace, NTag, NPopconfirm, NModal, NUpload, NUploadDragger, NText, NP, NBreadcrumb, NBreadcrumbItem } from "naive-ui";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useTable } from "@/hooks/common/table";
import { format } from 'date-fns';
import { useMessage } from 'naive-ui';
import { ref } from 'vue';
import { useAuth } from '@/hooks/business/auth';
import { fetchCurrentFile, fetchUploadFile } from '@/service/api';
import type { UploadFileInfo } from 'naive-ui';

const appStore = useAppStore();
const message = useMessage();
const { hasAuth } = useAuth();

// 上传弹框状态
const showUploadModal = ref(false);
const fileList = ref<UploadFileInfo[]>([]);
const uploading = ref(false);

// 路径导航相关状态
const currentPath = ref("");
const pathParts = ref<string[]>([]);

// 文件类型定义
interface FileItem {
  name: string;
  isDirectory: boolean;
  size: number;
  sizeFormatted: string;
  lastModified: string;
  path: string;
}

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

// 更新路径导航
function updatePathNavigation(path: string) {
  currentPath.value = path;
  pathParts.value = path ? path.split('/').filter(part => part) : [];
}

// 获取文件列表的适配器函数
async function fetchFileList(params?: any) {
  const res = await fetchCurrentFile({
    current: params?.current || 1,
    size: params?.size || 10,
    path: params?.path || currentPath.value || '/'
  });

  const data = (res as any)?.data || {};
  const fileList = data.files || [];
  const totalCount = data.fileCount || 0;

  return {
    response: {
      data: {
        rows: fileList,
        data: fileList,
        current: params?.current || 1,
        size: params?.size || 10,
        total: totalCount
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
  loading,
  mobilePagination,
} = useTable({
  apiFn: fetchFileList as any,
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
      key: "name" as any,
      title: $t("page.manage.serverFile.name") || "文件名称",
      align: "left",
      minWidth: 300,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return (
          <div class="flex items-center gap-8px">
            {row.isDirectory ? (
              <icon-mdi-folder class="text-20px text-primary" />
            ) : (
              <icon-mdi-file class="text-20px text-info" />
            )}
            <span
              class={row.isDirectory ? "cursor-pointer text-blue-500 hover:text-blue-600" : ""}
              onClick={row.isDirectory ? () => handleDirectoryClick(row) : undefined}
            >
              {row.name}
            </span>
          </div>
        );
      }
    },
    {
      key: "sizeFormatted" as any,
      title: $t("page.manage.serverFile.size") || "文件大小",
      align: "center",
      minWidth: 120,
      render: (row: any) => row.sizeFormatted || formatFileSize(row.size)
    },
    {
      key: "lastModified" as any,
      title: $t("page.manage.serverFile.lastModified") || "最后修改时间",
      align: "center",
      minWidth: 180,
      render: (row: any) => formatDateTime(row.lastModified)
    },
  ],
});

// 打开上传弹框
function handleUpload() {
  showUploadModal.value = true;
  fileList.value = [];
}

// 文件上传前的校验
function beforeUpload(data: { file: UploadFileInfo; fileList: UploadFileInfo[] }) {
  const file = data.file.file;
  if (!file) return false;

  // 检查文件类型
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.zip')) {
    message.error($t('common.onlyZipAllowed') || '只能上传 ZIP 文件');
    return false;
  }

  // 检查文件大小（例如限制为 100MB）
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    message.error($t('common.fileTooLarge') || '文件大小不能超过 100MB');
    return false;
  }

  return true;
}

// 处理文件变化
function handleFileChange(options: { fileList: UploadFileInfo[] }) {
  fileList.value = options.fileList;
}

// 确认上传
async function handleConfirmUpload() {
  if (fileList.value.length === 0) {
    message.warning($t('common.pleaseSelectFile') || '请选择文件');
    return;
  }

  const file = fileList.value[0].file;
  if (!file) {
    message.error($t('common.pleaseSelectFile') || '请选择文件');
    return;
  }

  try {
    uploading.value = true;

    // 调用上传API
    const res = await fetchUploadFile({ file });

    // 检查上传结果
    const error = (res as any)?.error || (res as any)?.response?.error;
    if (error) {
      const errorMsg = error?.message || $t('common.uploadFailed') || '上传失败';
      message.error(errorMsg);
      return;
    }

    message.success($t('common.uploadSuccess') || '上传成功');
    showUploadModal.value = false;
    fileList.value = [];
    await getData();
  } catch (error: any) {
    console.error('上传文件失败:', error);
    message.error(error?.message || $t('common.uploadFailed') || '上传失败');
  } finally {
    uploading.value = false;
  }
}

// 取消上传
function handleCancelUpload() {
  showUploadModal.value = false;
  fileList.value = [];
}

// 处理目录点击
function handleDirectoryClick(row: any) {
  if (!row.isDirectory) return;

  const newPath = currentPath.value ? `${currentPath.value}/${row.name}` : row.name;
  updatePathNavigation(newPath);
  getData();
}

// 处理面包屑导航点击
function handleBreadcrumbClick(index: number) {
  let newPath = '';
  if (index >= 0) {
    newPath = pathParts.value.slice(0, index + 1).join('/');
  }
  updatePathNavigation(newPath);
  getData();
}

// 暴露方法和数据给父组件
defineExpose({
  columnChecks,
  loading,
  getData,
  handleUpload,
});
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 路径导航面包屑 -->
    <div class="mb-16px">
      <NBreadcrumb>
        <NBreadcrumbItem @click="handleBreadcrumbClick(-1)" class="cursor-pointer">
          <span class="mr-4px" style="font-size: 16px;">📁</span>
          根目录
        </NBreadcrumbItem>
        <NBreadcrumbItem
          v-for="(part, index) in pathParts"
          :key="index"
          @click="handleBreadcrumbClick(index)"
          class="cursor-pointer"
        >
          {{ part }}
        </NBreadcrumbItem>
      </NBreadcrumb>
    </div>

    <NDataTable
      :columns="columns"
      :data="data"
      size="small"
      :flex-height="!appStore.isMobile"
      :loading="loading"
      :row-key="(row) => row.name"
      :pagination="mobilePagination"
      class="flex-1"
    />

    <!-- 上传文件弹框 -->
    <NModal
      v-model:show="showUploadModal"
      preset="card"
      :title="$t('common.upload') || '上传文件'"
      :bordered="false"
      size="medium"
      style="width: 600px"
    >
      <NUpload
        v-model:file-list="fileList"
        :max="1"
        accept=".zip"
        :before-upload="beforeUpload"
        @change="handleFileChange"
      >
        <NUploadDragger>
          <div style="margin-bottom: 12px">
            <icon-mdi-cloud-upload style="font-size: 48px; color: #18a058" />
          </div>
          <NText style="font-size: 16px">
            {{ $t('common.clickOrDragToUpload') || '点击或拖拽文件到此区域上传' }}
          </NText>
          <NP depth="3" style="margin: 8px 0 0 0">
            {{ $t('common.onlyZipAllowed') || '只能上传 ZIP 文件' }}，{{ $t('common.maxSize') || '文件大小不超过' }} 100MB
          </NP>
        </NUploadDragger>
      </NUpload>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="handleCancelUpload">
            {{ $t('common.cancel') || '取消' }}
          </NButton>
          <NButton
            type="primary"
            :loading="uploading"
            :disabled="fileList.length === 0"
            @click="handleConfirmUpload"
          >
            {{ $t('common.confirm') || '确认上传' }}
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped></style>
