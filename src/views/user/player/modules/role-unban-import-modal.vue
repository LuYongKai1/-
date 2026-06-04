<script setup lang="ts">
import { ref, watch } from "vue";
import { $t } from "@/locales";
import { fetchImportRoleUnBan, fetchDownloadTemplateRoleUnBan } from "@/service/api";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "RoleUnbanImportModal",
});

interface Emits {
  (e: "success"): void;
}

const emit = defineEmits<Emits>();

// 文件相关状态
const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const updateExistingData = ref(false);
const importing = ref(false);

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
  const file = target.files?.[0];

  if (!file) {
    return;
  }

  // 检查文件类型
  const allowedTypes = [".xlsx", ".xls"];
  const fileExtension = file.name
    .toLowerCase()
    .substring(file.name.lastIndexOf("."));

  if (!allowedTypes.includes(fileExtension)) {
    window.$message?.error("请上传Excel文件（.xlsx 或 .xls 格式）");
    target.value = "";
    return;
  }

  // 检查文件大小（限制为10MB）
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    window.$message?.error("文件大小不能超过10MB");
    target.value = "";
    return;
  }

  selectedFile.value = file;
  window.$message?.success(`已选择文件：${file.name}`);
  target.value = "";
}

// 下载模板
async function downloadTemplate() {
  window.$message?.info("正在下载模板...");

  try {
    const response = await fetchDownloadTemplateRoleUnBan();

    if (handleApiResponseError(response, "下载模板")) {
      return;
    }

    if (!response.data) {
      window.$message?.error("模板数据为空");
      return;
    }

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "解封角色列表导入模板.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    window.$message?.success("模板下载成功");
  } catch (error: any) {
    handleApiCatchError(error, "下载模板");
  }
}

// 下载错误文件
function downloadErrorFile(base64Data: string) {
  try {
    const base64Content = base64Data.replace(/^data:.*?;base64,/, '');
    const binaryString = window.atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `导入错误文件_${new Date().getTime()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    window.$message?.info("错误文件下载成功");
  } catch (error) {
    console.error("下载错误文件失败:", error);
    window.$message?.error("下载错误文件失败");
  }
}

// 确认导入
async function confirmImport() {
  if (!selectedFile.value) {
    window.$message?.warning("请选择要导入的文件");
    return;
  }

  importing.value = true;

  try {
    const formData = new FormData();
    formData.append("file", selectedFile.value);
    formData.append("updateSupport", updateExistingData.value.toString());

    const response = await fetchImportRoleUnBan(formData);

    if (handleApiResponseError(response, "导入解封角色")) {
      const errorFileBase64 = (response as any)?.response?.data?.errorFileBase64;
      if (errorFileBase64) {
        downloadErrorFile(errorFileBase64);
      }
      return;
    }

    window.$message?.success("文件导入成功");
    emit("success");
    closeModal();
  } catch (error: any) {
    const errorFileBase64 = (error as any)?.response?.data?.errorFileBase64;
    if (errorFileBase64) {
      downloadErrorFile(errorFileBase64);
    }
    handleApiCatchError(error, "导入解封角色");
  } finally {
    importing.value = false;
  }
}

// 关闭模态框
function closeModal() {
  visible.value = false;
}

// 重置表单
function resetForm() {
  selectedFile.value = null;
  updateExistingData.value = false;
  importing.value = false;
}
</script>

<template>
  <div>
    <input
      ref="fileInputRef"
      type="file"
      accept=".xlsx,.xls"
      style="display: none"
      @change="handleFileChange"
    />

    <NModal v-model:show="visible" :mask-closable="true">
      <NCard
        style="width: 600px"
        title="导入解封角色列表"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
        closable
        @close="closeModal"
      >
        <div class="space-y-4">
          <NAlert type="warning" :show-icon="false">
            <span style="color: red;">
              请下载模板文件，按照模板格式填写数据后导入
            </span>
          </NAlert>

          <div class="flex gap-4">
            <NButton type="primary" :disabled="importing" @click="selectFile">
              选择文件
            </NButton>
            <NButton
              type="info"
              :disabled="importing"
              @click="downloadTemplate"
            >
              下载模板
            </NButton>
          </div>

          <div v-if="selectedFile" class="text-sm text-gray-600">
            已选择文件：{{ selectedFile.name }}
          </div>

        </div>

        <template #footer>
          <div class="flex justify-end gap-4">
            <NButton :disabled="importing" @click="closeModal">
              {{ $t("common.cancel") }}
            </NButton>
            <NButton type="primary" :loading="importing" @click="confirmImport">
              {{ importing ? "导入中..." : "导入" }}
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
</style>
