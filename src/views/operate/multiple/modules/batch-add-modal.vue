<script setup lang="ts">
import { ref, watch } from "vue";
import { $t } from "@/locales";
import { fetchImportRoleData, fetchDownloadImportRoleTemplate } from "@/service/api";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "BatchAddModal",
});

interface Emits {
  (e: "success", data: any): void;
}

const emit = defineEmits<Emits>();

// 文件相关状态
const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const uploading = ref(false);

const visible = defineModel<boolean>("visible", {
  default: false,
});

watch(visible, (newVal) => {
  if (!newVal) {
    resetForm();
  }
});

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

  const file = files[0];

  // 检查文件类型
  const allowedTypes = ['.xlsx', '.xls', '.csv'];
  const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

  if (!allowedTypes.includes(fileExtension)) {
    window.$message?.error($t("common.invalidFileType"));
    target.value = "";
    return;
  }

  // 检查文件大小（限制为10MB）
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    window.$message?.error($t("common.fileSizeExceeded"));
    target.value = "";
    return;
  }

  selectedFile.value = file;
  window.$message?.success($t("common.fileSelected"));

  // 清空文件输入
  target.value = "";
}

// 移除选中的文件
function removeFile() {
  selectedFile.value = null;
}

// 确认上传
async function confirmUpload() {
  if (!selectedFile.value) {
    window.$message?.warning($t("common.pleaseSelectFile"));
    return;
  }

  uploading.value = true;

  try {
    const formData = new FormData();
    formData.append("file", selectedFile.value);

    const response = await fetchImportRoleData(formData);

    // 使用通用错误处理函数检查响应
    if (handleApiResponseError(response, "批量导入角色")) {
      return;
    }

    // 解析返回的角色数据
    const importedData = response?.data || response?.response?.data;

    // 提取token
    const token = importedData?.token || '';

    // 成功时显示成功消息并关闭模态框
    window.$message?.success($t("common.uploadSuccess"));
    emit("success", { ...importedData, token });
    closeModal();
  } catch (error: any) {
    // 使用通用异常处理函数
    handleApiCatchError(error, "批量导入角色");
  } finally {
    uploading.value = false;
  }
}

function closeModal() {
  visible.value = false;
}

function resetForm() {
  selectedFile.value = null;
  uploading.value = false;
}

// 下载模板
async function downloadTemplate() {
  try {
    const response = await fetchDownloadImportRoleTemplate();

    // 检查响应是否有错误
    if (handleApiResponseError(response, "下载模板")) {
      return;
    }

    // 检查响应数据是否存在
    if (!response.data) {
      window.$message?.error("模板数据为空");
      return;
    }

    // 创建 Blob 对象和下载链接
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "批量导入角色模板.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    window.$message?.success($t("page.manage.products.importModal.templateDownloadSuccess"));
  } catch (error: any) {
    handleApiCatchError(error, "下载模板");
  }
}
</script>

<template>
  <div>
    <!-- 隐藏的文件输入元素 -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".xlsx,.xls,.csv"
      style="display: none"
      @change="handleFileChange"
    />

    <!-- 批量新增模态对话框 -->
    <NModal v-model:show="visible" :mask-closable="!uploading">
      <NCard
        style="width: 600px"
        :title="$t('common.batchAdd')"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
        closable
        @close="closeModal"
      >
        <div class="space-y-4">
          <!-- 提示信息 -->
          <NAlert type="info" :show-icon="true">
            <div>
              <div>{{ $t("common.batchAddTip") }}</div>
              <div class="mt-2">
                <NButton text type="primary" @click="downloadTemplate">
                  {{ $t("common.downloadTemplate") }}
                </NButton>
              </div>
            </div>
          </NAlert>

          <!-- 操作按钮 -->
          <div class="flex gap-4">
            <NButton type="primary" :disabled="uploading" @click="selectFile">
              <template #icon>
                <icon-mdi-file-upload class="text-icon" />
              </template>
              {{ $t("common.selectFile") }}
            </NButton>
            <NButton
              v-if="selectedFile"
              :disabled="uploading"
              @click="removeFile"
            >
              {{ $t("common.remove") }}
            </NButton>
          </div>

          <!-- 已选择的文件 -->
          <div v-if="selectedFile" class="file-info">
            <NCard size="small" :bordered="true">
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <icon-mdi-file-excel class="text-lg text-green-500" />
                    <div class="flex-1">
                      <div class="text-sm font-medium truncate">{{ selectedFile.name }}</div>
                      <div class="text-xs text-gray-500">
                        {{ (selectedFile.size / 1024).toFixed(2) }} KB
                      </div>
                    </div>
                  </div>
                </div>
                <NButton
                  size="small"
                  quaternary
                  type="error"
                  :disabled="uploading"
                  @click="removeFile"
                >
                  <template #icon>
                    <icon-ic-round-delete class="text-icon" />
                  </template>
                </NButton>
              </div>
            </NCard>
          </div>

          <!-- 文件格式说明 -->
          <NCard size="small" :bordered="false" class="bg-gray-50">
            <div class="text-sm">
              <div class="font-medium mb-2">{{ $t("common.fileFormatRequirement") }}:</div>
              <ul class="list-disc list-inside space-y-1 text-gray-600">
                <li>{{ $t("common.supportedFormats") }}: Excel (.xlsx, .xls)</li>
                <li>{{ $t("common.maxFileSize") }}: 10MB</li>
                <li>{{ $t("common.pleaseFollowTemplate") }}</li>
              </ul>
            </div>
          </NCard>
        </div>

        <template #footer>
          <div class="flex justify-end gap-4">
            <NButton :disabled="uploading" @click="closeModal">
              {{ $t("common.cancel") }}
            </NButton>
            <NButton
              type="primary"
              :loading="uploading"
              :disabled="!selectedFile"
              @click="confirmUpload"
            >
              {{ $t("common.confirm") }}
            </NButton>
          </div>
        </template>
      </NCard>
    </NModal>
  </div>
</template>

<style scoped>
.space-y-4 > * + * {
  margin-top: 1rem;
}

.file-info {
  padding: 0.5rem 0;
}
</style>
