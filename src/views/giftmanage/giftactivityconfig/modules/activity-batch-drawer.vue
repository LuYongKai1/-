<script setup lang="tsx">
import { ref, watch, onUnmounted, computed } from 'vue';
import { NDrawer, NDrawerContent, NCard, NDataTable, NButton, NPopconfirm, NTag, NInput, NSelect } from 'naive-ui';
import { useRouter } from 'vue-router';
import {
  fetchGetGiftBatchList,
  fetchInvalidGiftBatch,
  fetchGenerateGiftCodes,
} from '@/service/api/game-manage';
import { useAppStore } from "@/store/modules/app";
import { useTable, useTableOperate } from '@/hooks/common/table';
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';
import { giftActivityTypeRecord, giftBatchStatusRecord } from '@/constants/business';
import BatchOperateDrawer from './batch-operate-drawer.vue';
import TableHeaderOperation from '@/components/advanced/table-header-operation.vue';

interface Props {
  visible: boolean;
  activityId: number | null;
  activityName: string;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
}
const appStore = useAppStore();

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { hasAuth } = useAuth();
const router = useRouter();

// 控制抽屉显示
const drawerVisible = ref(false);

// 状态监听定时器
const statusPollingTimer = ref<NodeJS.Timeout | null>(null);
const POLLING_INTERVAL = 3000; // 3秒轮询一次

watch(() => props.visible, (newVal) => {
  drawerVisible.value = newVal;
  if (newVal && props.activityId) {
    // 动态更新 campaignId 参数
    updateSearchParams({ campaignId: props.activityId });
    getData();
  }
});

watch(drawerVisible, (newVal) => {
  if (!newVal) {
    emit('update:visible', false);
    stopStatusPolling(); // 抽屉关闭时停止轮询
  }
});

const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  loading,
  mobilePagination,
  searchParams,
  scrollX,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetGiftBatchList,
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
      title: "ID",
      align: "center",
      width: 80,
    },
    {
      key: "codeType",
      title: $t("page.manage.giftactivity.batchlist.codeType"),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        if (row.codeType === null) {
          return null;
        }

        const tagMap: Record<string, NaiveUI.ThemeColor> = {
          1: "info",  // 通码 → 蓝色
          2: "error",  // 专码 → 紫色
        };

        const label = $t(giftActivityTypeRecord[row.codeType as keyof typeof giftActivityTypeRecord]);

        return <NTag type={tagMap[row.codeType]}>{label}</NTag>;
      },
    },
    {
      key:'total',
      title:$t("page.manage.giftactivity.batchlist.total"),
      align:'center',
      minWidth:80,
    },
    {
      key:'used',
      title:$t("page.manage.giftactivity.batchlist.used"),
      align:'center',
      minWidth:100,
      render: (row: any) => {
        // 根据代码类型显示不同的使用次数
        if (row.codeType === 1 || row.codeType === '1') {
          // 通码显示 publicUsed
          return row.publicUsed || 0;
        } else if (row.codeType === 2 || row.codeType === '2') {
          // 专码显示 uniqueUsed
          return row.uniqueUsed || 0;
        }
        return 0;
      },
    },
    {
      key:'remain',
      title:$t("page.manage.giftactivity.batchlist.remain"),
      align:'center',
      minWidth:100,
      render: (row: any) => {
        // 根据代码类型显示不同的剩余次数
        if (row.codeType === 1 || row.codeType === '1') {
          // 通码显示 publicRemain
          return row.publicRemain || 0;
        } else if (row.codeType === 2 || row.codeType === '2') {
          // 专码显示 uniqueRemain
          return row.uniqueRemain || 0;
        }
        return 0;
      },
    },
    {
      key: "codePrefix",
      title: $t("page.manage.giftactivity.batchlist.codePrefix"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "codeLen",
      title: $t("page.manage.giftactivity.batchlist.codeLen"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "amount",
      title: $t("page.manage.giftactivity.batchlist.amount"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "generatedCount",
      title: $t("page.manage.giftactivity.batchlist.generatedCount"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "exportedCount",
      title: $t("page.manage.giftactivity.batchlist.exportedCountL"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "status",
      title: $t("page.manage.giftactivity.batchlist.status"),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        if (row.status === null) {
          return null;
        }

        const tagMap: Record<string, NaiveUI.ThemeColor> = {
          '0': "info",  // 初始化 → 蓝色
          '1': "info",  // 生成中 → 蓝色
          '2': "success",  // 完成 → 绿色
          '3': "error",  // 已取消 → 红色
        };

        const label = $t(giftBatchStatusRecord[row.status as keyof typeof giftBatchStatusRecord]);

        return <NTag type={tagMap[row.status]}>{label}</NTag>;
      },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      minWidth: 160,
      render: (row: any) => (
        <div class="flex-center gap-8px">
          {hasAuth("operate:giftCodeBatch:edit") && (
            <NButton
              type="primary"
              ghost
              size="small"
              disabled={row.status === '2' || row.status === 2 || row.status === '3' || row.status === 3}
              onClick={() => edit(row.id, row)}
            >
            {$t("common.edit")}
            </NButton>
          )}

          {hasAuth("operate:giftCodeBatch:generate") && (
            <NButton
              type="warning"
              ghost
              size="small"
              disabled={row.status !== '0' && row.status !== 0}
              onClick={() => handleGenerateCodes(row.id)}
            >
            {$t("page.manage.giftactivity.batchlist.giftCodeBatch")}
            </NButton>
          )}

          {hasAuth("operate:giftCode:list") && (
            <NButton
              type="info"
              ghost
              size="small"
              onClick={() => handleViewCodes(row.id)}
            >
            {$t("page.manage.giftactivity.batchlist.view")}
            </NButton>
          )}

          {hasAuth("operate:giftCodeBatch:remove2") && (
            <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
              {{
                default: () => $t("page.manage.giftactivity.batchlist.confirmVoid"),
                trigger: () => (
                  <NButton
                    type="error"
                    ghost
                    size="small"
                    disabled={row.status === '3' || row.status === 3}
                  >
                  {$t("page.manage.giftactivity.batchlist.void")}
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

// 检查是否有生成中的批次
function hasGeneratingBatches() {
  return data.value.some((batch: any) => batch.status === '1' || batch.status === 1);
}

// 检查选中的批次中是否包含已作废的批次
const hasInvalidatedBatches = computed(() => {
  return checkedRowKeys.value.some((id: string) => {
    // 尝试不同的查找方式以确保能找到对应的批次
    const batch = data.value.find((item: any) =>
      item.id === id ||
      item.id === Number(id) ||
      item.id.toString() === id
    );

    return batch && (batch.status === '3' || batch.status === 3);
  });
});

// 批量作废按钮禁用状态：没有选中项或包含已作废批次时禁用
const isBatchDeleteDisabled = computed(() => {
  const noSelection = checkedRowKeys.value.length === 0;
  const hasInvalid = hasInvalidatedBatches.value;
  return noSelection || hasInvalid;
});

// 开始状态轮询
function startStatusPolling() {
  if (statusPollingTimer.value) {
    clearInterval(statusPollingTimer.value);
  }

  statusPollingTimer.value = setInterval(async () => {
    try {
      await getData();
      // 如果没有生成中的批次，停止轮询
      if (!hasGeneratingBatches()) {
        stopStatusPolling();
      }
    } catch (error) {
      console.error('轮询获取数据失败:', error);
    }
  }, POLLING_INTERVAL);
}

// 停止状态轮询
function stopStatusPolling() {
  if (statusPollingTimer.value) {
    clearInterval(statusPollingTimer.value);
    statusPollingTimer.value = null;
  }
}

// 监听数据变化，检查是否需要开始轮询
watch(data, () => {
  if (hasGeneratingBatches()) {
    if (!statusPollingTimer.value) {
      startStatusPolling();
    }
  } else {
    stopStatusPolling();
  }
}, { deep: true, immediate: true });

// 监听抽屉关闭，清理定时器
watch(drawerVisible, (newVal) => {
  if (!newVal) {
    stopStatusPolling();
  }
});

// 组件销毁时清理定时器
onUnmounted(() => {
  stopStatusPolling();
});

// 表格操作
const {
  drawerVisible: batchOperateVisible,
  operateType,
  editingData,
  handleAdd,
  handleEdit,
  checkedRowKeys,
} = useTableOperate(data, getData);

// 搜索功能
const searchForm = ref({
  batchCode: '',
  codeType: null,
});

function handleSearch() {
  updateSearchParams({
    ...searchForm.value,
    campaignId: props.activityId
  });
  getData();
}

function resetSearch() {
  searchForm.value = {
    batchCode: '',
    codeType: null,
  };
  updateSearchParams({
    campaignId: props.activityId
  });
  getData();
}

// 批量作废批次
async function handleBatchDelete() {
  try {
    const deletePromises = checkedRowKeys.value.map((id: string) => {
      return fetchInvalidGiftBatch({ id: Number(id) });
    });
    const responses = await Promise.all(deletePromises);

    // 自定义处理作废成功提示
    const hasError = handleApiResponseError(responses, '批量作废');
    if (!hasError) {
      window.$message?.success($t("page.manage.giftactivity.batchlist.batchVoidSuccess"));
      checkedRowKeys.value = [];
      getData();
    }
  } catch (error: any) {
    handleApiCatchError(error, '批量作废');
  }
}

// 生成兑换码
async function handleGenerateCodes(batchId: number) {
  try {
    const response = await fetchGenerateGiftCodes({ batchId });

    const hasError = handleApiResponseError(response, '生成兑换码');

    if (!hasError) {
      window.$message?.success($t("page.manage.giftactivity.batchlist.generateSuccess"));
      getData();
    }
  } catch (error: any) {
    handleApiCatchError(error, '生成兑换码');
  }
}

// 查看兑换码 - 跳转到兑换码页面
function handleViewCodes(batchId: number) {
  drawerVisible.value = false;

  router.push({
    path: '/giftmanage/giftcode',
    query: {
      batchId: batchId.toString(),
      activityName: props.activityName
    }
  });
}

// 作废批次
async function handleDelete(id: number) {
  try {
    const response = await fetchInvalidGiftBatch({ id });

    // 自定义处理作废成功提示
    const hasError = handleApiResponseError(response, '作废');
    if (!hasError) {
      window.$message?.success($t("page.manage.giftactivity.batchlist.voidSuccess"));
      getData();
    }
  } catch (error: any) {
    handleApiCatchError(error, '作废');
  }
}

function edit(id: number, row: any) {
  const editData = {
    ...row,
    activityName: props.activityName,
  };
  handleEdit(id, editData);
}

function handleAddBatch() {
  const newBatchData = {
    campaignId: props.activityId,
  };
  handleAdd(newBatchData);
}

</script>

<template>
  <NDrawer
    v-model:show="drawerVisible"
    width="80%"
    placement="right"
    :trap-focus="false"
    :block-scroll="false"
  >
    <NDrawerContent :title="`${activityName} - ${$t('page.manage.giftactivity.batchlist.title')}`" closable>
      <div class="flex-col-stretch gap-16px">
        <!-- 搜索区域 -->
        <NCard title="搜索条件" size="small">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-16px">
            <div>
              <label class="block text-sm font-medium mb-2">批次编码</label>
              <NInput
                v-model:value="searchForm.batchCode"
                placeholder="请输入批次编码"
                clearable
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">类型</label>
              <NSelect
                v-model:value="searchForm.codeType"
                placeholder="请选择类型"
                clearable
                :options="[
                  { label: '通码', value: '1' },
                  { label: '专码', value: '2' },
                ]"
              />
            </div>
            <div class="flex items-end gap-8px">
              <NButton type="primary" @click="handleSearch"> 搜索 </NButton>
              <NButton @click="resetSearch"> 重置 </NButton>
            </div>
          </div>
        </NCard>

        <!-- 批次列表 -->
        <NCard
          title="批次列表"
          :bordered="false"
          size="small"
          class="sm:flex-1-hidden card-wrapper"
        >
          <template #header-extra>
            <TableHeaderOperation
              v-model:columns="columnChecks"
              :disabled-delete="isBatchDeleteDisabled"
              :loading="loading"
              @add="handleAddBatch"
              @delete="handleBatchDelete"
              @batchCancel="handleBatchDelete"
              @refresh="getData"
              :show-add="hasAuth(['operate:giftCodeBatch:create', 'operate:giftCodeBatch:create2'])"
              :show-batch-cancel="hasAuth('operate:giftCodeBatch:remove2')"
            />
          </template>

          <NDataTable
            v-model:checked-row-keys="checkedRowKeys"
            :columns="columns"
            :data="data"
            size="small"
            :scroll-x="1080"
            :loading="loading"
            remote
            :row-key="(row) => row.id"
            :pagination="mobilePagination"
            class="sm:h-full"
          />
        </NCard>
      </div>

      <!-- 批次操作抽屉 -->
      <BatchOperateDrawer
        v-model:visible="batchOperateVisible"
        :operate-type="operateType"
        :row-data="editingData"
        :activity-id="props.activityId"
        :activity-name="props.activityName"
        @submitted="getDataByPage"
      />
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
</style>
