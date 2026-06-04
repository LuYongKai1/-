<script setup lang="ts">
import { ref, watch } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { fetchGetServerActivityList } from '@/service/api/game-manage';
import { handleApiCatchError } from '@/utils/common';

defineOptions({
  name: 'ActivitySelectModal',
});

interface Props {
  originalServerId?: string | number | null;
  targetServerId?: string | number | null;
  originalServerName?: string;
  targetServerName?: string;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'select', data: { originalActivities: any[]; targetActivities: any[] }): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false,
});

const originalLoading = ref(false);
const targetLoading = ref(false);
const originalActivityList = ref<any[]>([]);
const targetActivityList = ref<any[]>([]);
const selectedOriginalActivityIds = ref<Array<string | number>>([]);
const selectedTargetActivityIds = ref<Array<string | number>>([]);

// 逐对配对：必须先选左，再选右，才能继续下一对
type Pair = {
  leftGuid: string;
  rightGuid: string;
};

const pairs = ref<Pair[]>([]);
const pendingLeftGuid = ref<string | null>(null);
const pendingRightGuid = ref<string | null>(null);

function formatUnixSeconds(value: unknown): string {
  const raw = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  if (!Number.isFinite(raw) || raw <= 0) return '';
  // 后端时间戳为秒
  const d = new Date(raw * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 表格列定义
const columns: DataTableColumns<any> = [
  {
    type: 'selection',
  },
  {
    title: '活动GUID',
    key: 'activityGuid',
    width: 220,
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: '活动名称',
    key: 'activityName',
    minWidth: 120,
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: '创建时间',
    key: 'createTime',
    width: 170,
    render: (row) => formatUnixSeconds(row?.createTime),
  },
];

// 加载源服务器活动列表
async function loadOriginalActivityList() {
  if (!props.originalServerId) {
    originalActivityList.value = [];
    return;
  }

  originalLoading.value = true;
  try {
    const response = await fetchGetServerActivityList({
      current: 1,
      size: 1000,
      serverId: Number(props.originalServerId),
    });

    if (response.error || !response.response) {
      window.$message?.error('获取源服务器活动列表失败');
      originalActivityList.value = [];
      return;
    }

    const data = response.response?.data || response.data;
    const rows = data?.rows || data?.records || [];
    // 接口 rows 通常不带 serverGid，这里补上用于展示
    originalActivityList.value = rows.map((item: any) => ({
      ...item,
      serverGid: String(props.originalServerId),
    }));
  } catch (error) {
    handleApiCatchError(error, '获取源服务器活动列表');
    originalActivityList.value = [];
  } finally {
    originalLoading.value = false;
  }
}

// 加载目标服务器活动列表
async function loadTargetActivityList() {
  if (!props.targetServerId) {
    targetActivityList.value = [];
    return;
  }

  targetLoading.value = true;
  try {
    const response = await fetchGetServerActivityList({
      current: 1,
      size: 1000,
      serverId: Number(props.targetServerId),
    });

    if (response.error || !response.response) {
      window.$message?.error('获取目标服务器活动列表失败');
      targetActivityList.value = [];
      return;
    }

    const data = response.response?.data || response.data;
    const rows = data?.rows || data?.records || [];
    // 接口 rows 通常不带 serverGid，这里补上用于展示
    targetActivityList.value = rows.map((item: any) => ({
      ...item,
      serverGid: String(props.targetServerId),
    }));
  } catch (error) {
    handleApiCatchError(error, '获取目标服务器活动列表');
    targetActivityList.value = [];
  } finally {
    targetLoading.value = false;
  }
}

// 加载所有活动列表
async function loadAllActivityLists() {
  await Promise.all([
    loadOriginalActivityList(),
    loadTargetActivityList(),
  ]);
}

function toKey(v: string | number): string {
  return String(v);
}

function removeValue(list: Array<string | number>, value: string | number) {
  const k = toKey(value);
  const idx = list.findIndex(x => toKey(x) === k);
  if (idx >= 0) list.splice(idx, 1);
}

function addUnique(list: Array<string | number>, value: string | number) {
  const k = toKey(value);
  if (!list.some(x => toKey(x) === k)) list.push(value);
}

function findLeftByGuid(guid: string | number) {
  const k = toKey(guid);
  return originalActivityList.value.find(a => toKey(a.activityGuid) === k);
}

function findRightByGuid(guid: string | number) {
  const k = toKey(guid);
  return targetActivityList.value.find(a => toKey(a.activityGuid) === k);
}

function rebuildCheckedKeys() {
  selectedOriginalActivityIds.value = [
    ...pairs.value.map(p => p.leftGuid),
    ...(pendingLeftGuid.value ? [pendingLeftGuid.value] : []),
  ];
  selectedTargetActivityIds.value = [
    ...pairs.value.map(p => p.rightGuid),
    ...(pendingRightGuid.value ? [pendingRightGuid.value] : []),
  ];
}

function removePairByLeft(leftGuid: string) {
  const idx = pairs.value.findIndex(p => p.leftGuid === leftGuid);
  if (idx >= 0) pairs.value.splice(idx, 1);
}

function removePairByRight(rightGuid: string) {
  const idx = pairs.value.findIndex(p => p.rightGuid === rightGuid);
  if (idx >= 0) pairs.value.splice(idx, 1);
}

function getAddedKey(prev: Array<string | number>, next: Array<string | number>): string | null {
  const prevSet = new Set(prev.map(toKey));
  const added = next.map(toKey).filter(k => !prevSet.has(k));
  return added.length > 0 ? added[added.length - 1] : null;
}

function getRemovedKey(prev: Array<string | number>, next: Array<string | number>): string | null {
  const nextSet = new Set(next.map(toKey));
  const removed = prev.map(toKey).filter(k => !nextSet.has(k));
  return removed.length > 0 ? removed[removed.length - 1] : null;
}

// 左边：必须先选 1 个左边，才能去选右边
function handleOriginalCheck(rowKeys: Array<string | number>) {
  const prev = selectedOriginalActivityIds.value.slice();
  const added = getAddedKey(prev, rowKeys);
  const removed = getRemovedKey(prev, rowKeys);

  // 取消 pending 或已配对的 left
  if (removed) {
    if (pendingLeftGuid.value === removed) {
      pendingLeftGuid.value = null;
    } else {
      removePairByLeft(removed);
    }
    rebuildCheckedKeys();
    return;
  }

  if (!added) {
    rebuildCheckedKeys();
    return;
  }

  // 如果正在等待选择右边，则不允许再选新的左边
  if (pendingLeftGuid.value && !pendingRightGuid.value) {
    window.$message?.warning('请先在右侧选择一个活动完成配对');
    rebuildCheckedKeys();
    return;
  }

  // 不允许选择已配对的 left（重复点击会被忽略）
  if (pairs.value.some(p => p.leftGuid === added)) {
    rebuildCheckedKeys();
    return;
  }

  pendingLeftGuid.value = added;
  pendingRightGuid.value = null;
  rebuildCheckedKeys();
  window.$message?.info('已选择左侧活动，请在右侧选择对应活动完成配对');
}

// 右边：必须在已有 pendingLeftGuid 的情况下，选 1 个右边完成配对
function handleTargetCheck(rowKeys: Array<string | number>) {
  const prev = selectedTargetActivityIds.value.slice();
  const added = getAddedKey(prev, rowKeys);
  const removed = getRemovedKey(prev, rowKeys);

  if (removed) {
    if (pendingRightGuid.value === removed) {
      pendingRightGuid.value = null;
    } else {
      removePairByRight(removed);
    }
    rebuildCheckedKeys();
    return;
  }

  if (!added) {
    rebuildCheckedKeys();
    return;
  }

  if (!pendingLeftGuid.value) {
    window.$message?.warning('请先在左侧选择一个活动');
    rebuildCheckedKeys();
    return;
  }

  // 不允许选择已配对的 right
  if (pairs.value.some(p => p.rightGuid === added)) {
    rebuildCheckedKeys();
    return;
  }

  pendingRightGuid.value = added;

  // 完成一对
  pairs.value.push({
    leftGuid: pendingLeftGuid.value,
    rightGuid: pendingRightGuid.value,
  });

  pendingLeftGuid.value = null;
  pendingRightGuid.value = null;
  rebuildCheckedKeys();
  window.$message?.success('已完成一对活动配对，可继续选择下一对');
}

// 确认选择
function handleConfirm() {
  if (pendingLeftGuid.value || pendingRightGuid.value) {
    window.$message?.warning('当前还有未完成的配对，请先完成后再确认');
    return;
  }

  // 允许不选择活动：直接返回空数组
  if (pairs.value.length === 0) {
    emit('select', { originalActivities: [], targetActivities: [] });
    closeModal();
    return;
  }

  // 按一一对应关系输出，保证左右顺序一致
  const originalActivities: any[] = [];
  const targetActivities: any[] = [];

  for (const p of pairs.value) {
    const left = findLeftByGuid(p.leftGuid);
    const right = findRightByGuid(p.rightGuid);

    if (left && right) {
      originalActivities.push(left);
      targetActivities.push(right);
    }
  }

  if (originalActivities.length === 0 || targetActivities.length === 0 || originalActivities.length !== targetActivities.length) {
    window.$message?.warning('请确保左右活动已一一对应配对后再确认');
    return;
  }

  emit('select', { originalActivities, targetActivities });
  closeModal();
}

// 关闭弹框
function closeModal() {
  visible.value = false;
  selectedOriginalActivityIds.value = [];
  selectedTargetActivityIds.value = [];
  pairs.value = [];
  pendingLeftGuid.value = null;
  pendingRightGuid.value = null;
}

// 监听弹框显示
watch(visible, async (newVisible) => {
  if (newVisible) {
    selectedOriginalActivityIds.value = [];
    selectedTargetActivityIds.value = [];
    pairs.value = [];
    pendingLeftGuid.value = null;
    pendingRightGuid.value = null;
    await loadAllActivityLists();
  }
});

// 监听服务器变化
watch(
  () => [props.originalServerId, props.targetServerId],
  async () => {
    if (visible.value) {
      selectedOriginalActivityIds.value = [];
      selectedTargetActivityIds.value = [];
      pairs.value = [];
      pendingLeftGuid.value = null;
      pendingRightGuid.value = null;
      await loadAllActivityLists();
    }
  }
);
</script>

<template>
  <NModal
    v-model:show="visible"
    title="选择活动（可不选）"
    preset="card"
    class="w-1200px"
    :segmented="{
      content: true,
      footer: 'soft',
    }"
  >
    <NAlert type="info" :bordered="false" class="mb-12px">
      活动配对为可选项。不选择活动也可以直接确认继续。
    </NAlert>
    <div class="h-500px flex gap-4">
      <!-- 左侧：源服务器活动 -->
      <div class="flex-1 flex flex-col">
        <div class="mb-2 font-medium text-base">
          源服务器活动 - {{ originalServerName || '未选择' }}
        </div>
        <div class="flex-1 overflow-hidden">
          <NDataTable
            :columns="columns"
            :data="originalActivityList"
            :loading="originalLoading"
            :row-key="(row) => row.activityGuid"
            :checked-row-keys="selectedOriginalActivityIds"
            :single-line="false"
            :max-height="450"
            @update:checked-row-keys="handleOriginalCheck"
          />
        </div>
      </div>

      <!-- 右侧：目标服务器活动 -->
      <div class="flex-1 flex flex-col">
        <div class="mb-2 font-medium text-base">
          目标服务器活动(主服) - {{ targetServerName || '未选择' }}
        </div>
        <div class="flex-1 overflow-hidden">
          <NDataTable
            :columns="columns"
            :data="targetActivityList"
            :loading="targetLoading"
            :row-key="(row) => row.activityGuid"
            :checked-row-keys="selectedTargetActivityIds"
            :single-line="false"
            :max-height="450"
            @update:checked-row-keys="handleTargetCheck"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeModal">
          取消
        </NButton>
        <NButton type="primary" @click="handleConfirm">
          确认选择
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
:deep(.n-data-table) {
  height: 100%;
}
</style>
