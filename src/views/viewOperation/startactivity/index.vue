<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NModal, useMessage, NSpin, NTable } from "naive-ui";
import { fetchGetActivityNotice, fetchDeleteActivityNotice, fetchAuditActivityNotice, fetchGetActivityLogDetail,fetchEnableActivityNotice } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { serverStatusgroupTest} from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import ActivityOperateDrawer from "./modules/activity-operate-drawer.vue";
import { ref, computed } from "vue";
import { format } from 'date-fns';
import { useAuthStore } from '@/store/modules/auth';
import { useAuth } from '@/hooks/business/auth';

const authStore = useAuthStore();
const { hasAuth } = useAuth();

const appStore = useAppStore();
const message = useMessage();

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
  apiFn: fetchGetActivityNotice,
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
      key: "id",
      title: $t("page.manage.activity.ID"),
      align: "center",
      width: 64,
    },
    {
      key: "name",
      title: $t("page.manage.activity.activityName"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "templateName",
      title: $t("page.manage.activity.templateId"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "servers",
      title: $t("page.manage.activity.servers"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row) => {
        let servers: string[] = [];
        if (row.servers) {
          try {
            const arr = JSON.parse(row.servers);
            if (Array.isArray(arr)) {
              servers = arr.map((s) => s.serverName).filter(Boolean);
            }
          } catch (e) {
            servers = [row.servers];
          }
        }
        return servers.length ? servers.join(', ') : '-';
      }
    },
    {
      key: "startTime",
      title: $t("page.manage.activity.startTime"),
      align: "center",
      minWidth: 100,
      render: (row) => {
        if (row.startTime) {
          try {
            const startTime = Number(row.startTime);
            if (!isNaN(startTime)) {
              const milliseconds = String(startTime).length === 10 ? startTime * 1000 : startTime;
              return format(new Date(milliseconds), 'yyyy-MM-dd HH:mm:ss');
            }
            return format(new Date(row.startTime), 'yyyy-MM-dd HH:mm:ss');
          } catch (e) {
            return row.startTime;
          }
        }
        return 'N/A';
      },
    },
    {
      key: "endTime",
      title: $t("page.manage.activity.endTime"),
      align: "center",
      minWidth: 100,
      render: (row) => {
        if (row.endTime) {
          try {
            const endTime = Number(row.endTime);
            if (!isNaN(endTime)) {
              const milliseconds = String(endTime).length === 10 ? endTime * 1000 : endTime;
              return format(new Date(milliseconds), 'yyyy-MM-dd HH:mm:ss');
            }
            return format(new Date(row.endTime), 'yyyy-MM-dd HH:mm:ss');
          } catch (e) {
            return row.endTime;
          }
        }
        return 'N/A';
      },
    },
    {
      key: "status",
      title: $t("page.manage.activity.status"),
      align: "center",
      minWidth: 120,
      render: (row) => {
        const statusMap = {
          0: { label: $t('page.manage.activity.audit'), type: 'default' },
          1: { label: $t('page.manage.activity.auditPass'), type: 'info' },
          2: { label: $t('page.manage.activity.auditReject'), type: 'error' },
          3: { label: $t('page.manage.activity.enable'), type: 'success' },
          4: { label: $t('page.manage.activity.disable'), type: 'error' },
          5: { label: $t('page.manage.activity.expired'), type: 'default' }
        };

        const statusInfo = statusMap[row.status] || { label: $t('common.unknown'), type: 'default' };

        return (
          <NTag type={statusInfo.type}>{statusInfo.label}</NTag>
        );
      }
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 250,
      render: (row) => (
        <div class="flex-center gap-8px">
          {hasAuth('operate:activity:audit') && (
          <NButton
            type="info"
            ghost
            size="small"
            onClick={() => openAuditModal(row.id, row)}
            disabled={row.status === 1 || row.status === 2 || row.status === 3 || row.status === 4 || row.status === 5}
          >
            {$t("common.audit")}
          </NButton>
          )}
          {hasAuth('operate:activity:enable') && (
          <NButton
            type={row.status === 3 ? "error" : "success"}
            ghost
            size="small"
            onClick={() => handleStatusChange(row.id, row.status === 3 ? 4 : 3, row)}
            disabled={row.status === 4 || row.status === 5 || (row.status !== 1 && row.status !== 3 && row.status !== 4)}
          >
            {row.status === 3 ? $t("page.manage.activity.statusClose") : $t("page.manage.activity.statusEnable")}
          </NButton>
          )}
          {hasAuth('operate:activity:edit') && (
          <NButton
            type="primary"
            ghost
            size="small"
            onClick={() => edit(row.id, row, row.status !== 0)}
          >
            {$t("common.edit")}
          </NButton>
          )}
          {hasAuth('operate:activity:remove') && (
            <NPopconfirm  onPositiveClick={() => handleDelete(row.id)}>
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
  drawerVisible,
  operateType,
  editingData,
  handleAdd,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted,
  // closeDrawer
} = useTableOperate(data, getData);

const showAuditModal = ref(false);
const currentAuditId = ref<number | null>(null);
const auditLoading = ref(false);
const currentRowData = ref<any>(null);
const disableAuditButtons = ref(false);

const showDetailModal = ref(false);
const detailLoading = ref(false);
const detailData = ref<any>(null);


const statusMap = {
  0: $t('page.manage.activity.audit'),
  1: $t('page.manage.activity.auditPass'),
  2: $t('page.manage.activity.auditReject'),
  3: $t('page.manage.activity.enable'),
  4: $t('page.manage.activity.disable'),
  5: $t('page.manage.activity.expired')
};

// 解析 GM 参数数据
const gmParamData = computed(() => {
  try {
    if (detailData.value?.template?.gmParam) {
      const parsedData = JSON.parse(detailData.value.template.gmParam);
      return Array.isArray(parsedData) ? parsedData : [];
    }
    return [];
  } catch (e) {
    console.error('解析 GM 参数失败:', e);
    return [];
  }
});

// 获取 GM 参数中所有的键
const gmParamKeys = computed(() => {
  if (gmParamData.value.length > 0) {
    return Object.keys(gmParamData.value[0]);
  }
  return [];
});

function openAuditModal(id: number, row: any) {
  currentAuditId.value = id;
  currentRowData.value = row;
  showAuditModal.value = true;
  disableAuditButtons.value = false;
  openDetailForAudit(id);
}

async function openDetailForAudit(id: number) {
  try {
    detailLoading.value = true;

    // 直接使用当前行数据创建详情数据，不调用 API
    const detail = {
      template: {
        templateName: currentRowData.value?.templateName || '-',
        gmParam: currentRowData.value?.gmParam || null,
        createTime: '-',
        updateTime: '-'
      },
      activityInfo: {
        name: currentRowData.value?.name || '-',
        servers: currentRowData.value?.servers || '',
        startTime: currentRowData.value?.startTime
          ? format(new Date(currentRowData.value.startTime), 'yyyy-MM-dd HH:mm:ss')
          : '-',
        endTime: currentRowData.value?.endTime
          ? format(new Date(currentRowData.value.endTime), 'yyyy-MM-dd HH:mm:ss')
          : '-',
        status: currentRowData.value?.status || 0
      }
    };

    detailData.value = detail;
  } catch (error) {
    console.error('处理详情数据失败:', error);
  } finally {
    detailLoading.value = false;
  }
}

async function handleAudit(status: number) {
  if (!currentAuditId.value) return;

  try {
    auditLoading.value = true;
    disableAuditButtons.value = true;
    const params = {
      id: currentAuditId.value,
      status: status,
      templateId: currentRowData.value.templateId,
      name: currentRowData.value.name,
      servers: currentRowData.value.servers,
      startTime: currentRowData.value.startTime,
      endTime: currentRowData.value.endTime,
      flag: currentRowData.value.flag,
      templateName: currentRowData.value.templateName,
      serverNames: currentRowData.value.serverNames
    };

    const response = await fetchAuditActivityNotice(params);

    if (response) {
      const errorInfo = response?.data || response?.response?.data || {};
      const { code: errorCode, msg: errorMsg } = errorInfo;
      if (errorCode === 403) {
        message.error(errorMsg || "没有操作权限");
        return;
      }

      if (errorCode === 500) {
        message.error(errorMsg || "服务器内部错误");
        return;
      }
    }

    showAuditModal.value = false;
    currentAuditId.value = null;
    currentRowData.value = null;
    getData();
    if (status === 1) {
      message.success($t('common.auditSuccess'));
    } else {
      message.error($t('common.auditReject'));
    }
  } catch (error: any) {
    console.error('审核失败:', error);

    const errorData = error?.response?.data || {};
    const { code, msg } = errorData;

    if (code === 403) {
      message.error(msg || "没有操作权限");
    } else if (code === 500) {
      message.error(msg || "服务器内部错误");
    } else {
      const operationType = status === 1 ? "审核通过" : "审核驳回";
      message.error(msg || error?.message || `${operationType}失败，请重试`);
    }
  } finally {
    auditLoading.value = false;
    disableAuditButtons.value = false;
  }
}

async function handleBatchDelete() {
  const response = await fetchDeleteActivityNotice({ id: checkedRowKeys.value });
  onBatchDeleted(response);
}

async function handleDelete(id : number) {
  const response = await fetchDeleteActivityNotice({ id });
  onDeleted(response);
}

function edit(id: number, row: Api.channel["game"], isReadonly = false) {
  const editData = {
    ...row,
    isReadonly
  };
  handleEdit(id, editData);
}

async function handleStatusChange(id: number, status: number, row: any) {
  try {
    const params = {
      id: id,
      status: status,
      templateId: row.templateId,
      name: row.name,
      servers: row.servers,
      startTime: row.startTime,
      endTime: row.endTime,
      flag: row.flag,
      templateName: row.templateName,
      serverNames: row.serverNames,
      gmParam: row.gmParam
    };

    const response = await fetchEnableActivityNotice(params);

    if (response) {
      const errorInfo = response?.data || response?.response?.data || {};
      const { code: errorCode, msg: errorMsg } = errorInfo;
      if (errorCode === 403) {
        message.error(errorMsg || "没有操作权限");
        return;
      }

      if (errorCode === 500) {
        message.error(errorMsg || "服务器内部错误");
        return;
      }
    }

    getData();
    message.success(status === 3 ? $t('common.enableSuccess') : $t('common.disableSuccess'));
  } catch (error: any) {
    console.error('操作失败:', error);

    // 参考新增提示的错误处理逻辑
    const errorData = error?.response?.data || {};
    const { code, msg } = errorData;

    if (code === 403) {
      message.error(msg || "没有操作权限");
    } else if (code === 500) {
      message.error(msg || "服务器内部错误");
    } else {
      const operationType = status === 3 ? "启用" : "停用";
      message.error(msg || error?.message || `${operationType}失败，请重试`);
    }
  }
}

function formatServers(servers) {
  if (!servers) return '-';
  try {
    const arr = JSON.parse(servers);
    if (Array.isArray(arr)) {
      return arr.map(s => `${s.serverName}(${s.serverId})`).join(', ');
    }
    return '-';
  } catch {
    return servers;
  }
}
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <GameSearch
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="getDataByPage"
    />
    <NCard
      :title="$t('page.manage.activity.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @refresh="getData"
          :show-add="hasAuth('operate:activity:add')"
          :show-batch-delete="hasAuth('operate:activity:edit')"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="962"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <ActivityOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        :readonly="editingData?.isReadonly"
        @submitted="getDataByPage"
      />

      <!-- 审核弹窗 -->
      <NModal
        v-model:show="showAuditModal"
        preset="card"
        :title="$t('page.manage.activity.auditModal')"
        style="width: 900px; height: 900px"
        :bordered="false"
        size="huge"
        @close="() => { currentAuditId.value = null; disableAuditButtons.value = false; }"
      >
        <div v-if="detailLoading" class="flex-center">
          <NSpin />
        </div>
        <div v-else class="detail-content">
          <div class="detail-section">
            <h3 class="section-title">{{ $t('page.manage.activity.templateInfo') }}</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">{{ $t('page.manage.activity.templateName') }}</span>
                <span class="detail-value">{{ detailData?.template?.templateName || '-' }}</span>
              </div>
              <div class="detail-item gm-param-item">
                <span class="detail-label">{{ $t('page.manage.activity.gmParam') }}</span>
                <div class="detail-value">
                  <template v-if="gmParamData && gmParamData.length">
                    <NTable :bordered="true" size="small" class="gm-param-table">
                      <thead>
                        <tr>
                          <th v-for="(key, index) in gmParamKeys" :key="index">{{ key }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(item, idx) in gmParamData" :key="idx">
                          <td v-for="(key, keyIdx) in gmParamKeys" :key="keyIdx">{{ item[key] }}</td>
                        </tr>
                      </tbody>
                    </NTable>
                  </template>
                  <span v-else>-</span>
                </div>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ $t('page.manage.activity.createTime') }}</span>
                <span class="detail-value">{{ detailData?.template?.createTime || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ $t('page.manage.activity.updateTime') }}</span>
                <span class="detail-value">{{ detailData?.template?.updateTime || '-' }}</span>
              </div>
              <!-- <div class="detail-item">
                <span class="detail-label">标记：</span>
                <span class="detail-value">{{ detailData?.template?.flag ?? '-' }}</span>
              </div> -->
            </div>
          </div>
          <div class="detail-section">
            <h3 class="section-title">{{ $t('page.manage.activity.activityInfo') }}</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">{{ $t('page.manage.activity.activityName') }}</span>
                <span class="detail-value">{{ detailData?.activityInfo?.name || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">生效服务器</span>
                <span class="detail-value">
                  {{ formatServers(detailData?.activityInfo?.servers) }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ $t('page.manage.activity.startTime') }}</span>
                <span class="detail-value">{{ detailData?.activityInfo?.startTime || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ $t('page.manage.activity.endTime') }}</span>
                <span class="detail-value">{{ detailData?.activityInfo?.endTime || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ $t('page.manage.activity.status') }}</span>
                <span class="detail-value">{{ statusMap[detailData?.activityInfo?.status] || '-' }}</span>
              </div>
              <!-- <div class="detail-item">
                <span class="detail-label">{{ $t('page.manage.activity.flag') }}</span>
                <span class="detail-value">{{ detailData?.activityInfo?.flag ?? '-' }}</span>
              </div> -->
            </div>
          </div>
          <div class="audit-action-container">
            <div class="flex justify-center gap-4 py-4">
              <NButton
                type="success"
                :loading="auditLoading"
                :disabled="disableAuditButtons.value"
                @click="handleAudit(1)"
              >
                {{ $t('common.auditPass') }}
              </NButton>
              <NButton
                type="error"
                :loading="auditLoading"
                :disabled="disableAuditButtons.value"
                @click="handleAudit(2)"
              >
                {{ $t('common.auditReject') }}
              </NButton>
            </div>
          </div>
        </div>
      </NModal>
    </NCard>
  </div>
</template>

<style scoped>
.detail-content {
  padding: 24px 8px 8px 8px;
}
.detail-section {
  margin-bottom: 32px;
}
.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 18px;
  border-left: 4px solid #18a058;
  padding-left: 10px;
  letter-spacing: 1px;
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.gm-param-item {
  grid-column: span 2;
}
.detail-label {
  font-weight: bold;
  color: #666;
}
.detail-value {
  word-break: break-all;
}
.gm-param-table {
  margin-top: 8px;
  font-size: 13px;
}
.json-content {
  background-color: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}
.audit-action-container {
  border-top: 1px solid #eee;
  margin-top: 20px;
  padding-top: 10px;
}
</style>
