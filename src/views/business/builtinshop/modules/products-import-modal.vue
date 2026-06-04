<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { $t } from "@/locales";
import { fetchImportStore } from "@/service/api";
import { useServerStore } from '@/store/modules/server';
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import { NTree, NEmpty, NSpin, NButton } from "naive-ui";
import type { TreeOption } from "naive-ui";

defineOptions({
  name: "ProductsImportModal",
});

interface Props {
  serverId?: string;
}

interface Emits {
  (e: "success"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const serverStore = useServerStore();

// 文件相关状态
const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const updateExistingData = ref(false);
const importing = ref(false);
const serverLoading = ref(false);

// 选中的服务器ID（只存储服务器ID，不包含专区ID）
const selectedServerIds = ref<string[]>([]);

const visible = defineModel<boolean>("visible", {
  default: false,
});

// 树形数据
const treeData = computed<TreeOption[]>(() => {
  if (!serverStore.regionList?.length) return [];
  return serverStore.regionList.map(region => ({
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
});

watch(visible, async (newVal) => {
  if (!newVal) {
    resetForm();
  } else {
    // 打开时加载服务器列表
    serverLoading.value = true;
    try {
      if (!serverStore.regionList?.length) {
        await serverStore.fetchServerList();
      }
      // 如果有传入的serverId，设置为选中
      if (props.serverId) {
        selectedServerIds.value = [props.serverId];
      } else {
        selectedServerIds.value = [];
      }
    } catch (error) {
      console.error("Error during fetch server list:", error);
    } finally {
      serverLoading.value = false;
    }
  }
});

// 处理树节点选择
function handleTreeCheck(keys: Array<string | number>) {
  // 过滤掉专区节点（以 region_ 开头的key），只保留服务器ID
  selectedServerIds.value = keys
    .filter(key => !String(key).startsWith('region_'))
    .map(String);
}

// 全选所有服务器
function selectAll() {
  const allServerIds: string[] = [];
  serverStore.regionList?.forEach(region => {
    region.children?.forEach(server => {
      allServerIds.push(String(server.serverId));
    });
  });
  selectedServerIds.value = allServerIds;
}

// 清空所有选择
function clearAll() {
  selectedServerIds.value = [];
}

// 移除单个服务器
function removeServer(serverId: string) {
  const index = selectedServerIds.value.indexOf(serverId);
  if (index > -1) {
    selectedServerIds.value.splice(index, 1);
  }
}

// 获取服务器名称
function getServerName(serverId: string): string {
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
  const file = target.files?.[0];

  if (!file) {
    return;
  }

  // 检查文件类型 - 只允许CSV文件
  const allowedTypes = [".csv"];
  const fileExtension = file.name
    .toLowerCase()
    .substring(file.name.lastIndexOf("."));

  if (!allowedTypes.includes(fileExtension)) {
    // @ts-ignore
    window.$message?.error(
      "请上传CSV格式的文件"
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
  // 验证是否选择了服务器
  const serverIds = selectedServerIds.value.filter(id => !id.startsWith('region_'));
  if (serverIds.length === 0) {
    // @ts-ignore
    window.$message?.warning("请先选择服务器");
    return;
  }

  if (!selectedFile.value) {
    // @ts-ignore
    window.$message?.warning(
      $t("page.manage.products.importModal.pleaseSelectFile")
    );
    return;
  }

  importing.value = true;

  try {
    // @ts-ignore
    window.$message?.info("正在导入中...");

    const formData = new FormData();
    formData.append("file", selectedFile.value);

    // 添加所有选中的服务器ID到FormData中（多次append同一个key，后端会解析为List）
    serverIds.forEach(serverId => {
      formData.append("serverIds", serverId);
    });

    // 调用导入内置商城API（批量导入所有选中的服务器）
    const response = await fetchImportStore(formData);

    // 使用通用错误处理函数检查响应
    if (handleApiResponseError(response, "导入内置商城")) {
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
    handleApiCatchError(error, "导入内置商城");
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
  selectedServerIds.value = [];
}
</script>

<!-- @ts-ignore -->
<template>
  <div>
    <!-- 隐藏的文件输入元素 -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".csv"
      style="display: none"
      @change="handleFileChange"
    />

    <!-- 导入数据模态对话框 -->
    <NModal v-model:show="visible" :mask-closable="true">
      <NCard
        style="width: 1000px; max-width: 90vw;"
        :title="$t('page.manage.products.importModal.title')"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
        closable
        @close="closeModal"
      >
        <div class="space-y-4">
          <!-- 服务器选择 -->
          <div>
            <div class="mb-2 text-sm font-medium">{{ $t('page.manage.activity.servers') }}</div>
            <div v-if="serverLoading" class="flex justify-center items-center py-8">
              <NSpin size="small" />
              <span class="ml-2">加载中...</span>
            </div>
            <div v-else-if="treeData.length > 0" class="server-select-container">
              <div class="panel-header">
                <span class="panel-title">共 {{ serverStore.serverList.length }} 项</span>
                <div class="panel-actions">
                  <NButton text size="small" @click="selectAll">全选</NButton>
                  <NButton text size="small" @click="clearAll">清空</NButton>
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
            <NEmpty v-else description="暂无服务器数据" />
          </div>

          <!-- 提示信息 -->
          <NAlert type="warning" :show-icon="false">
            <span style="color: red;">
              请上传CSV格式的文件
            </span>
          </NAlert>

          <!-- 操作按钮 -->
          <div class="flex gap-4">
            <NButton type="primary" :disabled="importing" @click="selectFile">
              {{ $t("page.manage.products.importModal.selectFile") }}
            </NButton>
          </div>

          <!-- 已选择的文件 -->
          <div v-if="selectedFile" class="text-sm text-gray-600">
            {{ $t("page.manage.products.importModal.selectedFile")
            }}{{ selectedFile.name }}
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-4">
            <NButton :disabled="importing" @click="closeModal">
              {{ $t("common.cancel") }}
            </NButton>
            <NButton
              type="primary"
              :loading="importing"
              :disabled="selectedServerIds.filter(id => !id.startsWith('region_')).length === 0 || !selectedFile"
              @click="confirmImport"
            >
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
</style>

