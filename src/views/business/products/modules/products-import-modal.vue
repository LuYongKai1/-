<script setup lang="ts">
import { ref, watch } from "vue";
import { $t } from "@/locales";
import { fetchImportProduct, fetchDownloadTemplate } from "@/service/api";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "ProductsImportModal",
});

interface Props {
  channelId?: string;
}

interface Emits {
  (e: "success"): void;
}

const props = defineProps<Props>();
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
    // @ts-ignore
    window.$message?.error(
      $t("page.manage.products.importModal.invalidFileFormat")
    );
    target.value = "";
    return;
  }

  // 检查文件大小（限制为10MB）
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    // @ts-ignore
    window.$message?.error(
      $t("page.manage.products.importModal.fileSizeExceeded")
    );
    target.value = "";
    return;
  }

  selectedFile.value = file;
  // @ts-ignore
  window.$message?.success(
    `${$t("page.manage.products.importModal.selectedFile")}${file.name}`
  );
  // 清空文件输入
  target.value = "";
}

// 下载模板
async function downloadTemplate() {
  // @ts-ignore
  window.$message?.info(
    $t("page.manage.products.importModal.downloadingTemplate")
  );

  try {
    const response = await fetchDownloadTemplate({ channelId: props.channelId || "" });

    // 使用通用错误处理函数检查响应
    if (handleApiResponseError(response, "下载模板")) {
      return;
    }

    // 检查响应数据是否存在
    if (!response.data) {
      // @ts-ignore
      window.$message?.error("模板数据为空");
      return;
    }

    // 创建 Blob 对象和下载链接
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "商品列表导入模板.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    window.$message?.success($t("page.manage.products.importModal.templateDownloadSuccess"));
  } catch (error: any) {
    handleApiCatchError(error, "下载模板");
  }
}

// 下载base64错误文件
function downloadErrorFile(base64Data: string) {
  try {
    // 去除base64前缀（如果有的话）
    const base64Content = base64Data.replace(/^data:.*?;base64,/, '');

    // 将base64转换为二进制数据
    const binaryString = window.atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 创建 Blob 对象
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // 创建下载链接
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `导入错误文件_${new Date().getTime()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    // @ts-ignore
    window.$message?.info($t("page.manage.products.importModal.errorFileDownloadSuccess"));
  } catch (error) {
    console.error("下载错误文件失败:", error);
    // @ts-ignore
    window.$message?.error("下载错误文件失败");
  }
}

// 确认导入
async function confirmImport() {
  if (!selectedFile.value) {
    // @ts-ignore
    window.$message?.warning(
      $t("page.manage.products.importModal.pleaseSelectFile")
    );
    return;
  }

  importing.value = true;

  try {
    const formData = new FormData();
    formData.append("file", selectedFile.value);

    // 只有当channelId存在时才添加到表单数据中
    if (props.channelId) {
      formData.append("channelId", props.channelId);
    }

    formData.append("updateSupport", updateExistingData.value.toString());

    // 调用导入商品API
    const response = await fetchImportProduct(formData);

    // 使用通用错误处理函数检查响应
    if (handleApiResponseError(response, "导入商品")) {
      // 检查是否有错误文件需要下载
      const errorFileBase64 = (response as any)?.response?.data?.errorFileBase64;
      if (errorFileBase64) {
        downloadErrorFile(errorFileBase64);
      }
      return;
    }

    // 成功时显示成功消息并关闭模态框
    // @ts-ignore
    window.$message?.success(
      $t("page.manage.products.importModal.fileImportSuccess")
    );
    emit("success");
    closeModal();
    } catch (error: any) {
    // 检查错误中是否包含错误文件
    const errorFileBase64 = (error as any)?.response?.data?.errorFileBase64;
    if (errorFileBase64) {
      downloadErrorFile(errorFileBase64);
    }

    // 使用通用异常处理函数
    handleApiCatchError(error, "导入商品");
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

<!-- @ts-ignore -->
<template>
  <div>
    <!-- 隐藏的文件输入元素 -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".xlsx,.xls"
      style="display: none"
      @change="handleFileChange"
    />

    <!-- 导入数据模态对话框 -->
    <NModal v-model:show="visible" :mask-closable="true">
      <NCard
        style="width: 600px"
        :title="$t('page.manage.products.importModal.title')"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
        closable
        @close="closeModal"
      >
        <div class="space-y-4" >
          <!-- 提示信息 -->
          <NAlert type="warning" :show-icon="false" >
            <span style="color: red; ">
              {{ $t("page.manage.products.importModal.fileFormatTip") }}
            </span>
          </NAlert>

          <!-- 操作按钮 -->
          <div class="flex gap-4">
            <NButton type="primary" :disabled="importing" @click="selectFile">
              {{ $t("page.manage.products.importModal.selectFile") }}
            </NButton>
            <NButton
              type="info"
              :disabled="importing"
              @click="downloadTemplate"
            >
              {{ $t("page.manage.products.importModal.downloadTemplate") }}
            </NButton>
          </div>

          <!-- 已选择的文件 -->
          <div v-if="selectedFile" class="text-sm text-gray-600">
            {{ $t("page.manage.products.importModal.selectedFile")
            }}{{ selectedFile.name }}
          </div>

          <!-- 是否更新已存在数据 -->
          <!-- <NCheckbox v-model:checked="updateExistingData" :disabled="importing">
            {{ $t("page.manage.products.importModal.updateExistingData") }}
          </NCheckbox> -->
        </div>

        <template #footer>
          <div class="flex justify-end gap-4">
            <NButton :disabled="importing" @click="closeModal">
              {{ $t("common.cancel") }}
            </NButton>
            <NButton type="primary" :loading="importing" @click="confirmImport">
              {{
                importing
                  ? $t("page.manage.products.importModal.importing")
                  : $t("common.import")
              }}
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

