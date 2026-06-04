<script setup lang="ts">
import { NCard, NDataTable } from 'naive-ui';

interface QuestInfo {
  id: number;
  name: string;
  count: number;
  state: string;
  description?: string;
  objectValue?: number;
  mapId?: number;
  positionId?: number;
}

interface QuestHistoryInfo {
  id: number;
  name: string;
  completedDate: string;
  reward: string;
}

interface Props {
  questData: QuestInfo[];
  questHistoryData: QuestHistoryInfo[];
  achieveData: { gid: number; index: number; value: number }[];
  questDataLoading: boolean;
  questHistoryDataLoading: boolean;
  achieveDataLoading: boolean;
  mobilePagination: any;
}

defineProps<Props>();
</script>

<template>
  <div class="flex flex-col gap-6 quest-container">
    <NCard title="Quests" :bordered="false">
      <NDataTable
        :columns="[
          { key: 'id', title: 'ID', align: 'center', width: 100 },
          { key: 'name', title: 'Name', align: 'center', width: 200 },
          { key: 'count', title: 'Count', align: 'center', width: 100 },
          { key: 'state', title: 'State', align: 'center', width: 100 },
          { key: 'description', title: 'Description', align: 'center', width: 200 },
          { key: 'mapId', title: 'Map ID', align: 'center', width: 100 },
          { key: 'positionId', title: 'Position ID', align: 'center', width: 100 }
        ]"
        :data="questData"
        :loading="questDataLoading"
        :pagination="mobilePagination"
        :row-key="row => row.id"
      />
    </NCard>

    <!-- 任务历史 -->
    <NCard title="History" :bordered="false">
      <NDataTable
        :columns="[
          { key: 'id', title: 'ID', align: 'center', width: 100 },
          { key: 'name', title: 'Name', align: 'center', width: 200 },
        ]"
        :data="questHistoryData"
        :loading="questHistoryDataLoading"
        :pagination="mobilePagination"
        :row-key="row => row.id"
      />
    </NCard>

    <!-- 每日任务 -->
    <NCard title="Achieves" :bordered="false">
      <NDataTable
        :columns="[
          { key: 'gid', title: 'GID', align: 'center', width: 100 },
          { key: 'index', title: 'Index', align: 'center', width: 100 },
          { key: 'value', title: 'Value', align: 'center', width: 200 },
        ]"
        :data="achieveData"
        :loading="achieveDataLoading"
        :pagination="mobilePagination"
        :row-key="row => `${row.gid}-${row.index}`"
      />
    </NCard>
  </div>
</template>

<style scoped>
/* 任务容器样式优化 */
.quest-container {
  max-height: calc(100vh - 180px);
  overflow-y: auto;
  padding-right: 12px;
  padding-bottom: 30px;
}

.quest-container::-webkit-scrollbar {
  width: 6px;
}

.quest-container::-webkit-scrollbar-track {
  background: rgba(128, 128, 128, 0.05);
  border-radius: 3px;
}

.quest-container::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.3);
  border-radius: 3px;
  transition: background 0.3s ease;
}

.quest-container::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.5);
}
</style>

