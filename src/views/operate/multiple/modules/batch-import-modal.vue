<script setup lang="ts">
import { ref, watch } from "vue";
import { $t } from "@/locales";
import { fetchImportMultiMail, fetchDownloadMultiMailTemplate } from "@/service/api";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "BatchImportModal",
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
    window.$message?.error($t("page.manage.operateserver.batchImport.invalidFileType"));
    target.value = "";
    return;
  }

  // 检查文件大小（限制为10MB）
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    window.$message?.error($t("page.manage.operateserver.batchImport.fileSizeExceeded"));
    target.value = "";
    return;
  }

  selectedFile.value = file;
  window.$message?.success($t("page.manage.operateserver.batchImport.fileSelected"));

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
    window.$message?.warning($t("page.manage.operateserver.batchImport.pleaseSelectFile"));
    return;
  }

  uploading.value = true;

  try {
    const formData = new FormData();
    formData.append("file", selectedFile.value);

    const response = await fetchImportMultiMail(formData);

    // 使用通用错误处理函数检查响应
    if (handleApiResponseError(response, "导入多人邮件及物品")) {
      return;
    }

    // 解析返回的数据
    const importedData = response?.data || response?.response?.data;

    // 验证返回数据
    if (!importedData) {
      window.$message?.error($t("page.manage.operateserver.batchImport.importFailed"));
      return;
    }

    // 成功时显示成功消息并关闭模态框
    window.$message?.success($t("page.manage.operateserver.batchImport.importSuccess"));
    emit("success", importedData);
    closeModal();
  } catch (error: any) {
    // 使用通用异常处理函数
    handleApiCatchError(error, "导入多人邮件及物品");
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
    const response = await fetchDownloadMultiMailTemplate();

    // 使用统一错误处理检查响应
    if (handleApiResponseError(response, "下载模板")) {
      return;
    }

    // 验证响应数据
    if (!response.data) {
      window.$message?.error($t("common.fileDataEmpty"));
      return;
    }

    // 创建 Blob 对象并触发下载
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "批量导入多人邮件及物品模板.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    window.$message?.success($t("page.manage.operateserver.batchImport.templateDownloadSuccess"));
  } catch (error: any) {
    // 使用通用异常处理函数
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

    <!-- 批量导入模态对话框 -->
    <NModal v-model:show="visible" :mask-closable="!uploading">
      <NCard
        style="width: 600px"
        :title="$t('page.manage.operateserver.batchImport.title')"
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
              <div>{{ $t('page.manage.operateserver.batchImport.tip') }}</div>
              <div class="mt-2">
                <NButton text type="primary" @click="downloadTemplate">
                  {{ $t('page.manage.operateserver.batchImport.downloadTemplate') }}
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
              {{ $t('page.manage.operateserver.batchImport.selectFile') }}
            </NButton>
            <NButton
              v-if="selectedFile"
              :disabled="uploading"
              @click="removeFile"
            >
              {{ $t('page.manage.operateserver.batchImport.remove') }}
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
              <div class="font-medium mb-2">{{ $t('page.manage.operateserver.batchImport.fileFormatRequirement') }}</div>
              <ul class="list-disc list-inside space-y-1 text-gray-600">
                <li>{{ $t('page.manage.operateserver.batchImport.supportedFormats') }}</li>
                <li>{{ $t('page.manage.operateserver.batchImport.maxFileSize') }}</li>
                <li>{{ $t('page.manage.operateserver.batchImport.followTemplate') }}</li>
              </ul>
            </div>
          </NCard>
        </div>

        <template #footer>
          <div class="flex justify-end gap-4">
            <NButton :disabled="uploading" @click="closeModal">
              {{ $t('common.cancel') }}
            </NButton>
            <NButton
              type="primary"
              :loading="uploading"
              :disabled="!selectedFile"
              @click="confirmUpload"
            >
              {{ $t('common.confirm') }}
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

