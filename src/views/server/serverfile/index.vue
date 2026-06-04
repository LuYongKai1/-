<script setup lang="tsx">
import {
  NButton,
  NCard,
  NDataTable,
  NModal,
  NDescriptions,
  NDescriptionsItem,
  NSpace,
  NIcon,
  NBreadcrumb,
  NBreadcrumbItem,
  NInput,
  NForm,
  NFormItem,
  NPopconfirm,
} from "naive-ui";
import {
  fetchServerFileList,
  fetchDownloadServerFile,
  fetchGetFileHash,
  fetchCreateFolder,
  fetchDeleteFile,
  fetchRenameFile,
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import FileSearch from "./modules/file-search.vue";
import TableHeaderOperation from "@/components/advanced/table-header-operation.vue";
import ServerFileUploadModal from "./modules/file-upload-modal.vue";
import FolderCreateModal from "./modules/folder-create-modal.vue";
import { ref, onMounted, h, resolveComponent } from "vue";
import { useAuth } from "@/hooks/business/auth";
import { format } from "date-fns";

// 使用简单的图标字符
const iconMap = {
  folder: '📁',
  file: '📄',
  text: '📝',
  image: '🖼️',
  archive: '📦',
  video: '🎬',
  audio: '🎵',
  pdf: '📕',
  excel: '📊',
  word: '📘'
};

const { hasAuth } = useAuth();
const appStore = useAppStore();

// 创建当前搜索参数的引用
const currentSearchParams = ref({
  path: "",
  serverId: "",
  keyword: "",
});

// 哈希值弹框相关状态
const hashModalVisible = ref(false);
const hashData = ref({
  fileName: "",
  algo: "",
  hash: "",
});

// 上传文件相关状态
const uploadModalVisible = ref(false);

// 路径导航相关状态
const currentPath = ref("");
const pathParts = ref<string[]>([]);

// 创建文件夹相关状态
const createFolderModalVisible = ref(false);

// 重命名相关状态
const renameModalVisible = ref(false);
const renameData = ref({
  oldName: "",
  newName: "",
  isDirectory: false,
});


// 获取文件图标
function getFileIcon(fileName: string, isDirectory: boolean): string {
  if (isDirectory) {
    return iconMap.folder;
  }
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'txt':
    case 'md':
    case 'log':
      return iconMap.text;
    case 'pdf':
      return iconMap.pdf;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'svg':
      return iconMap.image;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return iconMap.archive;
    case 'xlsx':
    case 'xls':
    case 'csv':
      return iconMap.excel;
    case 'doc':
    case 'docx':
      return iconMap.word;
    case 'mp4':
    case 'avi':
    case 'mkv':
    case 'mov':
    case 'wmv':
      return iconMap.video;
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'aac':
      return iconMap.audio;
    default:
      return iconMap.file;
  }
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 更新路径导航
function updatePathNavigation(path: string) {
  currentPath.value = path;
  pathParts.value = path ? path.split('/').filter(part => part) : [];
}

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
  apiFn: fetchServerFileList as any,
  immediate: false,
  showTotal: true,
  apiParams: currentSearchParams.value,
  columns: () => [
    {
      key: "name" as any,
      title: $t("page.manage.serverFile.name"),
      align: "left",
      minWidth: 200,
      render: (row: any) => (
        <div class="flex items-center gap-8px">
          <span style="font-size: 18px;">
            {getFileIcon(row.name, row.directory)}
          </span>
          <span
            class={row.directory ? "cursor-pointer text-blue-500 hover:text-blue-600" : ""}
            onClick={row.directory ? () => handleDirectoryClick(row) : undefined}
          >
            {row.name}
          </span>
        </div>
      ),
    },
    {
      key: "size" as any,
      title: $t("page.manage.serverFile.size"),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        return row.directory ? '-' : formatFileSize(row.size);
      },
    },
    {
      key: "lastModified" as any,
      title: $t("page.manage.serverFile.lastModified"),
      align: "center",
      minWidth: 160,
      render: (row: any) => {
        return row.lastModified ? format(new Date(row.lastModified), 'yyyy-MM-dd HH:mm:ss') : '';
      },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      minWidth: 280,
      render: (row: any) => (
        <div class="flex-center gap-8px">
          {!row.directory && hasAuth("operate:serverFile:download") && (
            <NButton
              type="info"
              ghost
              size="small"
              onClick={() => handleDownload(row)}
            >
              {$t("common.download")}
            </NButton>
          )}
          {!row.directory && hasAuth("operate:serverFile:hash") && (
            <NButton
              type="success"
              ghost
              size="small"
              onClick={() => handleHash(row)}
            >
              {$t("common.hash")}
            </NButton>
          )}
          {hasAuth("operate:serverFile:rename") && (
            <NButton
              type="primary"
              ghost
              size="small"
              onClick={() => handleRename(row)}
            >
              {$t("common.rename")}
            </NButton>
          )}
          {hasAuth("operate:serverFile:delete") && (
            <NPopconfirm onPositiveClick={() => handleDelete(row)}>
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
});

const {
  checkedRowKeys,
  onDeleted
} = useTableOperate(data, getData);

function handleSearch(serverId: string, keyword?: string, resetPath?: boolean) {
  const searchPath = resetPath ? "" : (currentPath.value || "");

  currentSearchParams.value = {
    serverId,
    path: searchPath,
    keyword: keyword || "",
  };

  // 如果需要重置路径，更新路径导航
  if (resetPath) {
    updatePathNavigation("");
  }

  // 使用类型断言更新搜索参数
  (updateSearchParams as any)({
    serverId,
    path: searchPath,
    keyword: keyword || "",
  });
  getData();
}

// 处理目录点击
function handleDirectoryClick(row: any) {
  if (!row.directory) return;

  const newPath = currentPath.value ? `${currentPath.value}/${row.name}` : row.name;

  currentSearchParams.value = {
    ...currentSearchParams.value,
    path: newPath,
  };

  updatePathNavigation(newPath);

  (updateSearchParams as any)({
    ...currentSearchParams.value,
    path: newPath,
  });
  getData();
}

// 处理面包屑导航点击
function handleBreadcrumbClick(index: number) {
  let newPath = '';
  if (index >= 0) {
    newPath = pathParts.value.slice(0, index + 1).join('/');
  }

  currentSearchParams.value = {
    ...currentSearchParams.value,
    path: newPath,
  };

  updatePathNavigation(newPath);

  (updateSearchParams as any)({
    ...currentSearchParams.value,
    path: newPath,
  });
  getData();
}

// 下载文件功能
async function handleDownload(row: any) {
  try {
    // 检查是否有serverId参数
    if (!currentSearchParams.value.serverId) {
      window.$message?.error($t("page.manage.serverFile.pleaseSelectServer"));
      return;
    }

    // @ts-ignore
    window.$message?.info($t("common.downloadingFile"));

    const response = await fetchDownloadServerFile({
      dir: currentSearchParams.value.path,
      fileName: row.name,
      serverId: currentSearchParams.value.serverId,
    });

    // 使用通用错误处理函数检查响应
    if (handleApiResponseError(response, "下载文件")) {
      return;
    }

    // 检查响应数据是否存在
    if (!response.data) {
      window.$message?.error($t("common.fileDataEmpty"));
      return;
    }

    // 创建 Blob 对象和下载链接
    const blob = new Blob([response.data], {
      type: "application/octet-stream",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = row.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    window.$message?.success($t("common.fileDownloadSuccess"));
  } catch (error: any) {
    handleApiCatchError(error, "下载文件");
  }
}

// 获取文件哈希值功能
async function handleHash(row: any) {
  try {
    // 检查是否有serverId参数
    if (!currentSearchParams.value.serverId) {
      window.$message?.error($t("common.pleaseSelectServer"));
      return;
    }

    const response = await fetchGetFileHash({
      dir: currentSearchParams.value.path,
      fileName: row.name,
      serverId: currentSearchParams.value.serverId,
    });

    // 使用通用错误处理函数检查响应
    if (handleApiResponseError(response, "获取文件哈希值")) {
      return;
    }
        // 检查响应数据是否存在
    if (!response?.response?.data) {
      window.$message?.error($t("common.hashDataEmpty"));
      return;
    }

    const responseData = response.response.data;

    // 从响应中提取真正的哈希数据
    const hashInfo = responseData.data;

    // 设置哈希数据并显示弹框
    hashData.value = {
      fileName: hashInfo.fileName || row.name,
      algo: hashInfo.algo || "unknown",
      hash: hashInfo.hash || "",
    };

    hashModalVisible.value = true;

  } catch (error: any) {
    handleApiCatchError(error, "获取文件哈希值");
  }
}

// 复制哈希值到剪贴板
async function copyHashToClipboard() {
  try {
    await navigator.clipboard.writeText(hashData.value.hash);
    window.$message?.success($t("common.hashCopiedToClipboard"));
  } catch (error) {
    window.$message?.error($t("common.copyFailed"));
  }
}

// 处理上传按钮点击
function handleUpload() {
  uploadModalVisible.value = true;
}

// 处理上传成功
function handleUploadSuccess() {
  uploadModalVisible.value = false;
  getData(); // 刷新文件列表
}

// 处理创建文件夹
function handleCreateFolder() {
  createFolderModalVisible.value = true;
}

// 处理创建成功
function handleCreateFolderSuccess() {
  getData(); // 刷新文件列表
}

// 处理重命名
function handleRename(row: any) {
  renameData.value = {
    oldName: row.name,
    newName: row.name,
    isDirectory: row.directory,
  };
  renameModalVisible.value = true;
}

// 确认重命名
async function confirmRename() {
  if (!renameData.value.newName.trim()) {
    window.$message?.error($t("common.pleaseEnterNewName"));
    return;
  }

  if (renameData.value.oldName === renameData.value.newName.trim()) {
    window.$message?.error($t("common.nameCannotBeSame"));
    return;
  }

  if (!currentSearchParams.value.serverId) {
    window.$message?.error($t("common.pleaseSelectServer"));
    return;
  }

  try {
    // 文件和文件夹都使用同一个重命名接口
    const response = await fetchRenameFile({
      path: currentPath.value,
      oldName: renameData.value.oldName,
      newName: renameData.value.newName.trim(),
      serverId: currentSearchParams.value.serverId,
    });

    if (handleApiResponseError(response, "重命名")) {
      return;
    }

    window.$message?.success($t("common.modifySuccess"));
    renameModalVisible.value = false;
    getData(); // 刷新文件列表
  } catch (error: any) {
    handleApiCatchError(error, "重命名");
  }
}

// 删除文件以及文件夹
async function handleDelete(row: any) {
  try {
    const response = await fetchDeleteFile({
      path: currentPath.value,
      name: row.name,
      serverId: currentSearchParams.value.serverId,
    });
    onDeleted(response);
  } catch (error: any) {
    onDeleted(error);
  }
}

</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <FileSearch
      ref="fileSearchRef"
      v-model:model="currentSearchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />
    <NCard
      :title="$t('page.manage.serverFile.title')"
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
          @upload="handleUpload"
          @create-folder="handleCreateFolder"
          :show-upload="hasAuth('operate:serverFile:upload')"
          :show-create-folder="hasAuth('operate:serverFile:create')"
        />
      </template>

      <!-- 路径导航面包屑 -->
      <div v-if="currentSearchParams.serverId" class="mb-16px">
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
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns "
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="960"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
    </NCard>

    <ServerFileUploadModal
      v-model:visible="uploadModalVisible"
      :server-id="currentSearchParams.serverId"
      :path="currentSearchParams.path"
      :multi-server="true"
      @success="handleUploadSuccess"
    />

    <!-- 哈希值弹框 -->
    <NModal
      v-model:show="hashModalVisible"
      preset="dialog"
      :title="$t('common.hashInfo')"
      style="width: 500px"
    >
      <NDescriptions bordered :column="1">
        <NDescriptionsItem :label="$t('common.fileName')">
          {{ hashData.fileName }}
        </NDescriptionsItem>
        <NDescriptionsItem :label="$t('common.hashAlgo')">
          {{ hashData.algo }}
        </NDescriptionsItem>
        <NDescriptionsItem :label="$t('common.hashValue')">
          <div class="flex items-center gap-8px">
            <span class="break-all font-mono text-sm">{{ hashData.hash }}</span>
            <NButton
              size="small"
              type="primary"
              ghost
              @click="copyHashToClipboard"
            >
              {{ $t('common.copy') }}
            </NButton>
          </div>
        </NDescriptionsItem>
      </NDescriptions>
    </NModal>

    <!-- 创建文件夹模态框 -->
    <FolderCreateModal
      v-model:visible="createFolderModalVisible"
      :server-id="currentSearchParams.serverId"
      :path="currentPath"
      :multi-server="true"
      @success="handleCreateFolderSuccess"
    />

    <!-- 重命名模态框 -->
    <NModal
      v-model:show="renameModalVisible"
      preset="dialog"
      :title="$t('common.rename')"
      :positive-text="$t('common.confirm')"
      :negative-text="$t('common.cancel')"
      @positive-click="confirmRename"
    >
      <NForm>
        <NFormItem :label="`${renameData.isDirectory ? $t('common.folderName') : $t('common.fileName')}:`">
          <NInput
            v-model:value="renameData.newName"
            :placeholder="$t('common.enterFolderName')"
            @keyup.enter="confirmRename"
          />
        </NFormItem>
      </NForm>
    </NModal>
  </div>
</template>

<style scoped>
</style>
