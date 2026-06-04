<script setup lang="ts">
import { ref, watch, computed, h } from "vue";
import { NModal, NCard, NButton, NInput, NFormItem, NForm, NTree, NEmpty, NSpin, NDataTable, NTag } from "naive-ui";
import type { TreeOption, DataTableColumns } from "naive-ui";
import { $t } from "@/locales";
import { fetchCreateFolder } from "@/service/api";
import { useServerStore } from '@/store/modules/server';
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "FolderCreateModal",
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

// 表单相关状态
const folderName = ref("");
const creating = ref(false);
const serverLoading = ref(false);

// 选中的服务器ID（只存储服务器ID，不包含专区ID）
const selectedServerIds = ref<string[]>([]);

// 结果展示相关状态
const resultModalVisible = ref(false);
const createResults = ref<Array<{ serverId: string; serverName: string; success: boolean; message?: string }>>([]);

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
    return;
  }

  if (props.multiServer) {
    serverLoading.value = true;
    try {
      if (!serverStore.regionList?.length) {
        await serverStore.fetchServerList();
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
  // 过滤掉专区节点（以 region_ 开头的key），只保留服务器ID
  selectedServerIds.value = keys
    .filter(key => !String(key).startsWith('region_'))
    .map(String);
}

// 全选所有服务器
function selectAllServers() {
  selectedServerIds.value = serverStore.regionList?.flatMap(region =>
    region.children?.map(server => String(server.serverId)) || []
  ) || [];
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
  for (const region of serverStore.regionList || []) {
    const server = region.children?.find(s => String(s.serverId) === serverId);
    if (server) {
      return `${server.serverId}-${server.serverName || "Unknown Server"}`;
    }
  }
  return serverId;
}

// 确认创建
async function confirmCreate() {
  if (!folderName.value.trim()) {
    window.$message?.warning($t("common.pleaseEnterFolderName"));
    return;
  }

  const serverIds = props.multiServer
    ? selectedServerIds.value.filter(id => !id.startsWith('region_'))
    : props.serverId ? [props.serverId] : [];

  if (!serverIds.length) {
    window.$message?.error($t("common.pleaseSelectServer"));
    return;
  }

  creating.value = true;

  try {
    const formData = new FormData();
    formData.append("folderName", folderName.value.trim());
    formData.append("path", props.path || "/");
    serverIds.forEach(serverId => formData.append("serverIds", serverId));

    const response = await fetchCreateFolder(formData);

    const responseData = (response as any)?.response?.data?.data || (response as any)?.data?.data;
    const hasDetailedResults = responseData && typeof responseData === 'object' && Object.keys(responseData).length > 0;
    const hasApiError = handleApiResponseError(response, "创建文件夹");

    if (hasDetailedResults) {
      buildCreateResults(serverIds, responseData);
      resultModalVisible.value = true;
      setTimeout(() => {
        emit("success");
        closeModal();
      }, 100);
    } else if (!hasApiError) {
      window.$message?.success(
        props.multiServer
          ? $t("page.manage.serverFile.upload.createFolderSuccessToServers", {
              serverCount: serverIds.length,
              folderName: folderName.value
            })
          : $t("common.createFolderSuccess")
      );
      emit("success");
      closeModal();
    }
  } catch (error: any) {
    handleApiCatchError(error, "创建文件夹");
  } finally {
    creating.value = false;
  }
}

// 构建创建结果数组
function buildCreateResults(serverIds: string[], responseData: Record<string, string>) {
  createResults.value = serverIds.map(serverId => {
    const serverIdStr = String(serverId);
    const message = responseData[serverIdStr];
    const server = serverStore.serverList.find(s => String(s.serverId) === serverIdStr);
    const isError = message ? (message.includes('失败') || message.includes('错误') || message.includes('Exception')) : false;

    return {
      serverId: serverIdStr,
      serverName: server?.serverName || serverIdStr,
      success: !message || !isError,
      message: message || undefined
    };
  });

  const successCount = createResults.value.filter(r => r.success && !r.message).length;
  const partialSuccessCount = createResults.value.filter(r => r.success && r.message).length;
  const failCount = createResults.value.filter(r => !r.success).length;

  if (!failCount && !partialSuccessCount) {
    window.$message?.success($t("page.manage.serverFile.upload.createSuccessCount", { count: successCount }));
  } else if (failCount > 0) {
    window.$message?.warning($t("page.manage.serverFile.upload.createCompleteWithFailures", {
      successCount: successCount + partialSuccessCount,
      failCount
    }));
  } else {
    window.$message?.info($t("page.manage.serverFile.upload.createCompleteInfo", { count: createResults.value.length }));
  }
}

// 结果表格列定义
const resultColumns = computed<DataTableColumns<typeof createResults.value[0]>>(() => [
  { title: $t("page.manage.serverFile.upload.serverIdColumn"), key: 'serverId', align: 'center', width: 120 },
  { title: $t("page.manage.serverFile.upload.serverNameColumn"), key: 'serverName', align: 'center', width: 200, ellipsis: { tooltip: true } },
  {
    title: $t("page.manage.serverFile.upload.createStatusColumn"),
    key: 'success',
    align: 'center',
    width: 150,
    render: (row) => h(NTag, { type: row.success ? 'success' : 'error' }, () =>
      row.success ? $t("page.manage.serverFile.upload.createSuccessStatus") : $t("page.manage.serverFile.upload.createFailedStatus")
    )
  },
  { title: $t("page.manage.serverFile.upload.detailInfoColumn"), key: 'message', align: 'center', ellipsis: { tooltip: true }, render: (row) => row.message || '-' }
]);

function closeModal() {
  visible.value = false;
}

function resetForm() {
  folderName.value = "";
  creating.value = false;
  selectedServerIds.value = [];
}
</script>

<template>
  <div>
    <!-- 创建文件夹模态对话框 -->
    <NModal v-model:show="visible" :mask-closable="true">
      <NCard
        :style="props.multiServer ? 'width: 800px; max-width: 90vw;' : 'width: 500px'"
        :title="$t('common.createFolder')"
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
                <span class="panel-title">共 {{ serverStore.serverList.length }} 项</span>
                <div class="panel-actions">
                  <NButton text size="small" @click="selectAllServers">{{ $t('common.selectAll') }}</NButton>
                  <NButton text size="small" @click="clearAllServers">{{ $t('common.clear') }}</NButton>
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

          <!-- 目标服务器信息（单服务器模式） -->
          <div v-if="!props.multiServer && props.serverId">
            <div class="text-sm">
              <strong>{{ $t("common.targetServer") }}:</strong> {{ props.serverId }}
            </div>
          </div>

          <!-- 创建路径 -->
          <div>
            <div class="text-sm mb-1">
              <strong>{{ $t("common.createPath") }}:</strong>
              <span class="font-mono">{{ props.path || '/' }}</span>
            </div>
          </div>

          <!-- 文件夹名称输入 -->
          <NForm>
            <NFormItem :label="$t('common.folderName')" required>
              <NInput
                v-model:value="folderName"
                :placeholder="$t('common.enterFolderName')"
                :disabled="creating"
                @keyup.enter="confirmCreate"
              />
            </NFormItem>
          </NForm>
        </div>

        <template #footer>
          <div class="flex justify-end gap-4">
            <NButton :disabled="creating" @click="closeModal">
              {{ $t("common.cancel") }}
            </NButton>
            <NButton
              type="primary"
              :loading="creating"
              :disabled="!folderName.trim() || (props.multiServer && selectedServerIds.length === 0)"
              @click="confirmCreate"
            >
              {{ $t("common.confirm") }}
            </NButton>
          </div>
        </template>
      </NCard>
    </NModal>

    <!-- 创建结果弹框 -->
    <NModal
      v-model:show="resultModalVisible"
      preset="card"
      :title="`${$t('page.manage.serverFile.upload.createFolderResult')} (${$t('page.manage.serverFile.upload.createFolderResultSummary', { count: createResults.length })})`"
      style="width: 1200px; max-width: 95vw;"
      :mask-closable="true"
      :close-on-esc="true"
    >
      <div style="height: 500px; display: flex; flex-direction: column;">
        <NDataTable
          :columns="resultColumns"
          :data="createResults"
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

.mb-1 {
  margin-bottom: 0.25rem;
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

.font-mono {
  font-family: monospace;
  padding: 0.25rem 0.5rem;
  background-color: var(--n-color-target);
  border-radius: 0.25rem;
}

.flex {
  display: flex;
}

.justify-center {
  justify-content: center;
}

.justify-end {
  justify-content: flex-end;
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
</style>

