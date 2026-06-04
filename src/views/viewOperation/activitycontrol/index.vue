<script setup lang="tsx">
import { ref, computed } from "vue";
import { NButton, NCard, NDataTable } from "naive-ui";
import { fetchToggleSabak } from "@/service/api";
import { handleApiCatchError } from '@/utils/common';
import ActivityOperateDrawer from "./modules/activity-operate-drawer.vue";
import ResultModal from "./modules/result-modal.vue";

defineOptions({
  name: "ActivityControl",
});

interface ActivityType {
  key: string;
  name: string;
  description: string;
}

interface OperationResult {
  success: boolean;
  serverId: number;
  errorMsg?: string;
}

const GAME_ID = 101;

const activityList = ref<ActivityType[]>([
  {
    key: 'sabak',
    name: '沙巴克攻城战',
    description: '开启/关闭沙巴克攻城战活动'
  }
]);

const drawerVisible = ref(false);
const currentOperation = ref<'enable' | 'disable'>('enable');
const currentActivityKey = ref('');
const operatingActivity = ref(false);
const resultModalVisible = ref(false);
const operationResults = ref<OperationResult[]>([]);

function openDrawer(activityKey: string, operation: 'enable' | 'disable') {
  currentActivityKey.value = activityKey;
  currentOperation.value = operation;
  drawerVisible.value = true;
}

async function handleConfirmOperation(selectedServerIds: string[]) {
  const activity = activityList.value.find(a => a.key === currentActivityKey.value);
  if (!activity) return;

  operatingActivity.value = true;

  try {
    const response = await fetchToggleSabak({
      serverList: selectedServerIds.map(Number),
      gameId: GAME_ID,
      status: currentOperation.value === 'enable'
    });

    const { results, code } = extractResponseData(response);

    if (code === 200 && results.length > 0) {
      handleOperationSuccess(results, activity);
    } else {
      handleOperationError(response, activity);
    }
  } catch (error) {
    const operationText = currentOperation.value === 'enable' ? '开启' : '关闭';
    handleApiCatchError(error, `${operationText}${activity.name}失败`);
  } finally {
    operatingActivity.value = false;
  }
}

function extractResponseData(response: any) {
  const data = response?.response?.data || response;
  return {
    results: Array.isArray(data?.data) ? data.data : [],
    code: data?.code || 0
  };
}

function handleOperationSuccess(results: OperationResult[], activity: ActivityType) {
  operationResults.value = results;

  const successCount = results.filter(r => r.success === true).length;
  const failedCount = results.length - successCount;
  const operationText = currentOperation.value === 'enable' ? '开启' : '关闭';

  if (failedCount === 0 && successCount > 0) {
    window.$message?.success(`已成功${operationText} ${activity.name}，共 ${successCount} 个服务器`);
  } else if (successCount === 0) {
    window.$message?.error(`${operationText} ${activity.name}失败，共 ${failedCount} 个服务器失败`);
  } else {
    window.$message?.warning(`${operationText} ${activity.name}部分成功，成功 ${successCount} 个，失败 ${failedCount} 个`);
  }

  drawerVisible.value = false;
  resultModalVisible.value = true;
}

function handleOperationError(response: any, activity: ActivityType) {
  const operationText = currentOperation.value === 'enable' ? '开启' : '关闭';
  const msg = response?.response?.data?.msg || response?.msg || `${operationText}${activity.name}失败`;
  window.$message?.error(msg);
}

const currentActivity = computed(() =>
  activityList.value.find(a => a.key === currentActivityKey.value)
);

const activityColumns = [
  {
    key: "name" as any,
    title: "活动名称",
    align: "center" as const,
    minWidth: 150,
  },
  {
    key: "description" as any,
    title: "活动描述",
    align: "center" as const,
    minWidth: 200,
  },
  {
    key: "actions" as any,
    title: "操作",
    align: "center" as const,
    width: 200,
    render: (row: ActivityType) => (
      <>
        <NButton
          type="success"
          ghost
          size="small"
          class="mr-8px"
          onClick={() => openDrawer(row.key, 'enable')}
        >
          开启
        </NButton>
        <NButton
          type="error"
          ghost
          size="small"
          onClick={() => openDrawer(row.key, 'disable')}
        >
          关闭
        </NButton>
      </>
    ),
  },
];
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard title="活动控制" :bordered="false" size="small" class="card-wrapper">
      <NDataTable
        :columns="activityColumns"
        :data="activityList"
        :bordered="false"
        :single-line="false"
        size="small"
        class="sm:h-full"
      />
    </NCard>

    <ActivityOperateDrawer
      v-model:visible="drawerVisible"
      :activity-name="currentActivity?.name || '活动'"
      :operation="currentOperation"
      :loading="operatingActivity"
      @confirm="handleConfirmOperation"
    />

    <ResultModal
      v-model:visible="resultModalVisible"
      :operation="currentOperation"
      :activity-name="currentActivity?.name || '活动'"
      :results="operationResults"
    />
  </div>
</template>

<style scoped>
.card-wrapper {
  height: 100%;
}
</style>
