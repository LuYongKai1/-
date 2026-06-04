<script setup lang="ts">
import { ref, watch, computed, h } from "vue";
import { NModal, NCard, NButton, NAlert, NProgress, NTree, NEmpty, NSpin, NDataTable, NTag } from "naive-ui";
import type { TreeOption, DataTableColumns } from "naive-ui";
import { $t } from "@/locales";
import { fetchUploadServerFile } from "@/service/api";
import { useServerStore } from '@/store/modules/server';
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "ServerFileUploadModal",
});

interface Props {
  serverId?: string;
  path?: string;
  multiServer?: boolean; // 是否支持多服务器选择
}

interface Emits {
  (e: "success"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const serverStore = useServerStore();

// 文件相关状态
const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFiles = ref<File[]>([]);
const uploading = ref(false);
const uploadProgress = ref(0);
const currentUploadingFile = ref("");
const serverLoading = ref(false);

// 结果展示相关状态
const resultModalVisible = ref(false);
const uploadResults = ref<Array<{ serverId: string; serverName: string; success: boolean; message?: string }>>([]);

// 支持的文件类型（可配置）
const allowedTypes = ref<string[]>([]);
const maxFileSize = ref(100 * 1024 * 1024); // 100MB

// 拖拽相关状态
const isDragOver = ref(false);

// 选中的服务器ID（只存储服务器ID，不包含专区ID）
const selectedServerIds = ref<string[]>([]);

const visible = defineModel<boolean>("visible", {
  default: false,
});

// 树形数据
const treeData = computed<TreeOption[]>(() => {
  const nodes: TreeOption[] = [];

  // 添加专区和服务器
  if (serverStore.regionList?.length) {
    const regionNodes = serverStore.regionList.map(region => ({
      label: region.regionName,
      key: `region_${region.id}`,
      isLeaf: false,
      checkable: false, // 专区节点不显示复选框
      children: (region.children || []).map(server => ({
        label: server.serverName,
        key: String(server.serverId),
        isLeaf: true
      }))
    }));
    nodes.push(...regionNodes);
  }

  // 添加跨服节点
  if (serverStore.crossServerList?.length) {
    nodes.push({
      label: '跨服专区',
      key: 'cross_server_group',
      isLeaf: false,
      checkable: false,
      children: serverStore.crossServerList.map(crossServer => ({
        label: crossServer.serverName,
        key: `cross_${crossServer.serverId}`,
        isLeaf: true
      }))
    });
  }

  return nodes;
});

watch(visible, async (newVal) => {
  if (!newVal) {
    resetForm();
    return;
  }

  if (props.multiServer) {
    serverLoading.value = true;
    try {
      if (!serverStore.regionList?.length) {
        await serverStore.fetchServerList();
      }
      // 获取跨服列表
      if (!serverStore.crossServerList?.length) {
        await serverStore.fetchCrossServerList();
      }
      selectedServerIds.value = props.serverId ? [props.serverId] : [];
    } finally {
      serverLoading.value = false;
    }
  } else if (props.serverId) {
    selectedServerIds.value = [props.serverId];
  }
});

// 处理树节点选择
function handleTreeCheck(keys: Array<string | number>) {
  // 过滤掉专区节点（以 region_ 开头的key）和跨服组节点（cross_server_group），保留服务器ID和跨服ID
  const filteredKeys = keys
    .filter(key => {
      const keyStr = String(key);
      return !keyStr.startsWith('region_') && keyStr !== 'cross_server_group';
    })
    .map(String);

  // 去重处理
  selectedServerIds.value = Array.from(new Set(filteredKeys));

}

// 全选所有服务器（包括跨服）
function selectAllServers() {
  const regularServers = serverStore.regionList?.flatMap(region =>
    region.children?.map(server => String(server.serverId)) || []
  ) || [];

  const crossServers = serverStore.crossServerList?.map(crossServer =>
    `cross_${crossServer.serverId}`
  ) || [];

  selectedServerIds.value = [...regularServers, ...crossServers];
}

// 清空所有服务器选择
function clearAllServers() {
  selectedServerIds.value = [];
}

// 移除单个服务器
function removeServer(serverId: string) {
  selectedServerIds.value = selectedServerIds.value.filter(id => id !== serverId);
}

// 获取服务器名称
function getServerName(serverId: string): string {
  // 检查是否是跨服
  if (serverId.startsWith('cross_')) {
    const crossServerId = serverId.replace('cross_', '');
    const crossServer = serverStore.crossServerList?.find(cs => cs.serverId === crossServerId);
    if (crossServer) {
      return `跨服-${crossServer.serverName}`;
    }
    return `跨服-${crossServerId}`;
  }

  // 普通服务器
  for (const region of serverStore.regionList || []) {
    const server = region.children?.find(s => String(s.serverId) === serverId);
    if (server) {
      return `${server.serverId}-${server.serverName || "Unknown Server"}`;
    }
  }
  return serverId;
}

// 选择文件
function selectFile() {
  fileInputRef.value?.click();
}

// 处理文件选择
function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;

  if (!files || files.length === 0) {
    return;
  }

  const validFiles: File[] = [];
  const invalidSizeFiles: string[] = [];
  const invalidTypeFiles: string[] = [];
  const duplicateFiles: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // 检查是否已存在
    const isDuplicate = selectedFiles.value.some(existingFile =>
      existingFile.name === file.name && existingFile.size === file.size
    );

    if (isDuplicate) {
      duplicateFiles.push(file.name);
      continue;
    }

    // 检查文件大小
    if (file.size > maxFileSize.value) {
      invalidSizeFiles.push(file.name);
      continue;
    }

    // 检查文件类型（如果有限制）
    if (allowedTypes.value.length > 0) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      if (!allowedTypes.value.includes(fileExtension)) {
        invalidTypeFiles.push(file.name);
        continue;
      }
    }

    validFiles.push(file);
  }

  // 显示各种错误信息
  if (invalidSizeFiles.length > 0) {
    window.$message?.error(
      `${$t("page.manage.serverFile.upload.fileSizeExceededLimit")} (${$t("common.maxFileSize")}${(maxFileSize.value / 1024 / 1024).toFixed(0)}MB): ${invalidSizeFiles.join(", ")}`
    );
  }

  if (invalidTypeFiles.length > 0) {
    window.$message?.error(
      `${$t("page.manage.serverFile.upload.unsupportedFileType")}: ${invalidTypeFiles.join(", ")}`
    );
  }

  if (duplicateFiles.length > 0) {
    window.$message?.warning(
      `${$t("page.manage.serverFile.upload.fileExists")}: ${duplicateFiles.join(", ")}`
    );
  }

  // 添加有效文件到选中列表
  if (validFiles.length > 0) {
    selectedFiles.value.push(...validFiles);
    window.$message?.success(
      `${$t("page.manage.serverFile.upload.filesAdded")} ${validFiles.length} ${$t("page.manage.serverFile.upload.filesCount")}`
    );
  }

  // 清空文件输入
  target.value = "";
}

// 移除选中的文件
function removeFile(index: number) {
  selectedFiles.value.splice(index, 1);
}

// 清空所有文件
function clearAllFiles() {
  selectedFiles.value = [];
}

// 确认上传
async function confirmUpload() {
  if (!selectedFiles.value.length) {
    window.$message?.warning($t("page.manage.serverFile.upload.pleaseSelectFilesToUpload"));
    return;
  }

  const serverIds = props.multiServer
    ? selectedServerIds.value.filter(id => !id.startsWith('region_') && id !== 'cross_server_group')
    : props.serverId ? [props.serverId] : [];

  if (!serverIds.length) {
    window.$message?.error($t("common.pleaseSelectServer"));
    return;
  }

  uploading.value = true;
  uploadProgress.value = 0;

  try {
    const formData = new FormData();
    selectedFiles.value.forEach(file => formData.append("files", file));
    formData.append("path", props.path || "");

    // 处理服务器ID，将跨服ID转换为实际的serverId，并去重
    const actualServerIds = new Set<string>();
    serverIds.forEach(serverId => {
      if (serverId.startsWith('cross_')) {
        // 跨服ID，去掉 cross_ 前缀
        actualServerIds.add(serverId.replace('cross_', ''));
      } else {
        // 普通服务器ID
        actualServerIds.add(serverId);
      }
    });

    // 将去重后的服务器ID添加到formData
    actualServerIds.forEach(serverId => {
      formData.append("serverIds", serverId);
    });

    currentUploadingFile.value = $t("page.manage.serverFile.upload.uploadingToServers", {
      fileCount: selectedFiles.value.length,
      serverCount: actualServerIds.size
    });

    uploadProgress.value = 50;
    const response = await fetchUploadServerFile(formData);
    uploadProgress.value = 100;

    const responseData = (response as any)?.response?.data?.data || (response as any)?.data?.data;
    const hasDetailedResults = responseData && typeof responseData === 'object' && Object.keys(responseData).length > 0;
    const hasApiError = handleApiResponseError(response, `上传文件`);

    if (hasDetailedResults) {
      buildUploadResults(Array.from(actualServerIds), responseData);
      resultModalVisible.value = true;
      setTimeout(() => {
        emit("success");
        closeModal();
      }, 100);
    } else if (!hasApiError) {
      window.$message?.success(
        props.multiServer
          ? $t("page.manage.serverFile.upload.uploadSuccessToServers", {
              fileCount: selectedFiles.value.length,
              serverCount: actualServerIds.size
            })
          : `${$t("page.manage.serverFile.upload.uploadSuccess")} ${selectedFiles.value.length} ${$t("page.manage.serverFile.upload.filesCount")}`
      );
      emit("success");
      closeModal();
    }
  } catch (error: any) {
    handleApiCatchError(error, "上传文件");
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
    currentUploadingFile.value = "";
  }
}

function closeModal() {
  visible.value = false;
}

// 构建上传结果数组
function buildUploadResults(serverIds: string[], responseData: Record<string, string>) {
  uploadResults.value = serverIds.map(serverId => {
    const serverIdStr = String(serverId);
    // 获取实际的服务器ID（去掉 cross_ 前缀）
    const actualServerId = serverIdStr.startsWith('cross_') ? serverIdStr.replace('cross_', '') : serverIdStr;
    const message = responseData[actualServerId];

    // 查找服务器名称
    let serverName = '';
    if (serverIdStr.startsWith('cross_')) {
      const crossServer = serverStore.crossServerList?.find(cs => cs.serverId === actualServerId);
      serverName = crossServer ? `跨服-${crossServer.serverName}` : `跨服-${actualServerId}`;
    } else {
      const server = serverStore.serverList.find(s => String(s.serverId) === actualServerId);
      serverName = server?.serverName || actualServerId;
    }

    const isError = message ? (message.includes('上传失败') || message.includes('错误') || message.includes('Exception')) : false;

    return {
      serverId: actualServerId,
      serverName: serverName,
      success: !message || !isError,
      message: message || undefined
    };
  });

  const successCount = uploadResults.value.filter(r => r.success && !r.message).length;
  const partialSuccessCount = uploadResults.value.filter(r => r.success && r.message).length;
  const failCount = uploadResults.value.filter(r => !r.success).length;

  if (!failCount && !partialSuccessCount) {
    window.$message?.success($t("page.manage.serverFile.upload.uploadSuccessCount", { count: successCount }));
  } else if (failCount > 0) {
    window.$message?.warning($t("page.manage.serverFile.upload.uploadCompleteWithFailures", {
      successCount: successCount + partialSuccessCount,
      failCount
    }));
  } else {
    window.$message?.info($t("page.manage.serverFile.upload.uploadCompleteInfo", { count: uploadResults.value.length }));
  }
}

// 结果表格列定义
const resultColumns = computed<DataTableColumns<typeof uploadResults.value[0]>>(() => [
  { title: $t("page.manage.serverFile.upload.serverIdColumn"), key: 'serverId', align: 'center', width: 120 },
  { title: $t("page.manage.serverFile.upload.serverNameColumn"), key: 'serverName', align: 'center', width: 200, ellipsis: { tooltip: true } },
  {
    title: $t("page.manage.serverFile.upload.uploadStatusColumn"),
    key: 'success',
    align: 'center',
    width: 150,
    render: (row) => h(NTag, { type: row.success ? 'success' : 'error' }, () =>
      row.success ? $t("page.manage.serverFile.upload.uploadSuccessStatus") : $t("page.manage.serverFile.upload.uploadFailedStatus")
    )
  },
  { title: $t("page.manage.serverFile.upload.detailInfoColumn"), key: 'message', align: 'center', ellipsis: { tooltip: true }, render: (row) => row.message || '-' }
]);

function resetForm() {
  selectedFiles.value = [];
  uploading.value = false;
  uploadProgress.value = 0;
  currentUploadingFile.value = "";
}

// 获取文件图标
function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  const iconMap: Record<string, string> = {
    // 文档
    'txt': '📝', 'md': '📝', 'log': '📝',
    'pdf': '📕',
    'doc': '📘', 'docx': '📘',
    'xls': '📊', 'xlsx': '📊', 'csv': '📊',
    'ppt': '📙', 'pptx': '📙',

    // 图片
    'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
    'bmp': '🖼️', 'svg': '🖼️', 'webp': '🖼️',

    // 压缩文件
    'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',

    // 音视频
    'mp4': '🎬', 'avi': '🎬', 'mkv': '🎬', 'mov': '🎬', 'wmv': '🎬',
    'mp3': '🎵', 'wav': '🎵', 'flac': '🎵', 'aac': '🎵',

    // 代码
    'js': '💻', 'ts': '💻', 'html': '💻', 'css': '💻', 'vue': '💻',
    'py': '💻', 'java': '💻', 'cpp': '💻', 'c': '💻',
  };

  return iconMap[ext] || '📄';
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 获取文件类型
function getFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  const typeMap: Record<string, string> = {
    'jpg': '图片', 'jpeg': '图片', 'png': '图片', 'gif': '图片',
    'mp4': '视频', 'avi': '视频', 'mkv': '视频',
    'mp3': '音频', 'wav': '音频', 'flac': '音频',
    'pdf': 'PDF文档', 'doc': 'Word文档', 'docx': 'Word文档',
    'xls': 'Excel表格', 'xlsx': 'Excel表格',
    'zip': '压缩文件', 'rar': '压缩文件',
    'txt': '文本文件', 'md': 'Markdown',
  };

  return typeMap[ext] || ext.toUpperCase() + '文件';
}

// 获取总文件大小
function getTotalSize(): string {
  const totalBytes = selectedFiles.value.reduce((sum, file) => sum + file.size, 0);
  return formatFileSize(totalBytes);
}

// 拖拽处理函数
function handleDragOver(event: DragEvent) {
  event.preventDefault();
  isDragOver.value = true;
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault();
  isDragOver.value = false;
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragOver.value = false;

  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    // 模拟文件输入事件
    const mockEvent = {
      target: { files, value: "" }
    } as any;
    handleFileChange(mockEvent);
  }
}
</script>

<template>
  <div>
    <!-- 隐藏的文件输入元素 -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      style="display: none"
      @change="handleFileChange"
    />

    <!-- 上传文件模态对话框 -->
    <NModal v-model:show="visible" :mask-closable="true">
      <NCard
        :style="props.multiServer ? 'width: 1000px; max-width: 90vw;' : 'width: 600px'"
        :title="$t('common.upload')"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
        closable
        @close="closeModal"
      >
        <div class="space-y-4">
          <!-- 服务器选择（多服务器模式） -->
          <div v-if="props.multiServer">
            <div class="mb-2 text-sm font-medium">{{ $t('page.manage.activity.servers') }}</div>
            <div v-if="serverLoading" class="flex justify-center items-center py-8">
              <NSpin size="small" />
              <span class="ml-2">{{ $t('common.loading') }}</span>
            </div>
            <div v-else-if="treeData.length > 0" class="server-select-container">
              <div class="panel-header">
                <span class="panel-title">共 {{ serverStore.serverList.length + (serverStore.crossServerList?.length || 0) }} 项 (服务器: {{ serverStore.serverList.length }}, 跨服: {{ serverStore.crossServerList?.length || 0 }})</span>
                <div class="panel-actions">
                  <NButton text size="small" @click="selectAllServers">全选</NButton>
                  <NButton text size="small" @click="clearAllServers">清空</NButton>
                </div>
              </div>
              <div class="panel-body">
                <NTree
                  :data="treeData"
                  :checked-keys="selectedServerIds"
                  checkable
                  cascade
                  expand-on-click
                  @update:checked-keys="handleTreeCheck"
                />
              </div>
            </div>
            <NEmpty v-else :description="$t('common.noServerData')" />
          </div>

          <!-- 上传路径信息（单服务器模式） -->
          <div v-if="!props.multiServer && props.serverId" class="upload-info">
            <NAlert type="default" :show-icon="false">
              <div class="space-y-1">
                <div class="text-sm">
                  <strong>{{ $t("common.targetServer") }}:</strong> {{ props.serverId }}
                </div>
                <div class="text-sm">
                  <strong>{{ $t("common.uploadPath") }}:</strong>
                  <span class="font-mono px-2 py-1 rounded">
                    {{ props.path || '/' }}
                  </span>
                </div>
              </div>
            </NAlert>
          </div>

          <!-- 提示信息 -->
          <NAlert type="warning" :show-icon="false">
            <span style="color: red;">
              {{ $t("page.manage.serverFile.upload.supportMultipleFiles") }}, {{ $t("common.maxFileSize") }}{{ (maxFileSize / 1024 / 1024).toFixed(0) }}MB
            </span>
          </NAlert>

          <!-- 上传进度 -->
          <div v-if="uploading" class="upload-progress">
            <div class="text-sm mb-2">
              {{ $t("page.manage.serverFile.upload.uploading") }}: {{ currentUploadingFile }}
            </div>
            <NProgress
              type="line"
              :percentage="uploadProgress"
              :show-indicator="true"
              processing
            />
          </div>

          <!-- 操作按钮 -->
          <div class="flex gap-4">
            <NButton type="primary" :disabled="uploading" @click="selectFile">
              选择文件
            </NButton>
            <NButton v-if="selectedFiles.length > 0" :disabled="uploading" @click="clearAllFiles">
              清空
            </NButton>
          </div>

          <!-- 已选择的文件列表 -->
          <div v-if="selectedFiles.length > 0" class="file-list">
            <div class="text-sm mb-2">
              {{ $t("page.manage.serverFile.upload.selectedFiles") }} {{ selectedFiles.length }} {{ $t("page.manage.serverFile.upload.filesCount") }} ({{ $t("page.manage.serverFile.upload.totalSize") }}: {{ getTotalSize() }})
            </div>
            <div class="selected-files-container">
              <div
                v-for="(file, index) in selectedFiles"
                :key="index"
                class="file-item"
              >
                <div class="file-info">
                  <div class="file-name">{{ file.name }}</div>
                  <div class="file-meta">{{ formatFileSize(file.size) }} • {{ getFileType(file.name) }}</div>
                </div>
                <button
                  class="file-remove-btn"
                  :disabled="uploading"
                  @click="removeFile(index)"
                >
                  {{ $t("page.manage.serverFile.upload.remove") }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-4">
            <NButton :disabled="uploading" @click="closeModal">
              {{ $t("common.cancel") }}
            </NButton>
            <NButton type="primary" :loading="uploading" @click="confirmUpload">
              {{ $t("common.confirm") }}
            </NButton>
          </div>
        </template>
      </NCard>
    </NModal>

    <!-- 上传结果弹框 -->
    <NModal
      v-model:show="resultModalVisible"
      preset="card"
      :title="`${$t('page.manage.serverFile.upload.uploadResult')} (${$t('page.manage.serverFile.upload.uploadResultSummary', { count: uploadResults.length })})`"
      style="width: 1200px; max-width: 95vw;"
      :mask-closable="true"
      :close-on-esc="true"
    >
      <div style="height: 500px; display: flex; flex-direction: column;">
        <NDataTable
          :columns="resultColumns"
          :data="uploadResults"
          :bordered="true"
          size="small"
          :max-height="450"
          flex-height
          style="flex: 1;"
        />
      </div>
      <template #footer>
        <div class="flex justify-end">
          <NButton @click="resultModalVisible = false" size="medium">
            {{ $t("page.manage.serverFile.upload.closeButton") }}
          </NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.space-y-4 > * + * {
  margin-top: 1rem;
}

.file-list {
  margin-top: 1rem;
}

.selected-files-container {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  /* border: 1px solid var(--n-border-color); */
  /* border-radius: 0.5rem; */
  /* background-color: var(--n-color-modal); */
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--n-border-color);
  border-radius: 0.375rem;
  /* background-color: var(--n-color-target); */
  transition: all 0.2s ease;
}


.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 0.875rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  font-size: 0.75rem;
  opacity: 0.6;
}

.file-remove-btn {
  padding: 0.375rem 0.75rem;
  background-color: transparent;
  border: 1px solid var(--n-border-color);
  border-radius: 0.25rem;
  color: var(--n-text-color);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.file-remove-btn:hover:not(:disabled) {
  background-color: var(--n-color-error);
  border-color: var(--n-color-error);
  color: white;
}

.file-remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.server-select-container {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--n-border-color);
  border-radius: 0.5rem;
  overflow: hidden;
  height: 300px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--n-divider-color);
  background-color: var(--n-color-modal);
}

.panel-title {
  font-size: 0.875rem;
  font-weight: 500;
}

.panel-actions {
  display: flex;
  gap: 0.5rem;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.text-sm {
  font-size: 0.875rem;
}

.font-medium {
  font-weight: 500;
}

.min-w-0 {
  min-width: 0;
}

.flex-1 {
  flex: 1;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-xs {
  font-size: 0.75rem;
}

.opacity-60 {
  opacity: 0.6;
}

.text-lg {
  font-size: 1.125rem;
}

.mr-2 {
  margin-right: 0.5rem;
}

.flex {
  display: flex;
}

.justify-center {
  justify-content: center;
}

.items-center {
  align-items: center;
}

.gap-4 {
  gap: 1rem;
}

.py-8 {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.ml-2 {
  margin-left: 0.5rem;
}

.justify-end {
  justify-content: flex-end;
}

</style>

