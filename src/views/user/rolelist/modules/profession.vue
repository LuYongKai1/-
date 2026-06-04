<script setup lang="ts">
import { NCard, NDataTable } from 'naive-ui';

interface ProfessionInfo {
  grade: number;
  type: string;
  level: number;
}

interface Props {
  professionData: ProfessionInfo[];
  professionDataLoading: boolean;
  mobilePagination: any;
}

defineProps<Props>();
</script>

<template>
  <NCard title="Profession" :bordered="false">
    <NDataTable
      :columns="[
        { key: 'grade', title: 'Grade', align: 'center', width: 100 },
        { key: 'type', title: 'Type', align: 'center', width: 120 },
        { key: 'level', title: 'level', align: 'center', width: 120 },
      ]"
      :data="professionData"
      :loading="professionDataLoading"
      :pagination="mobilePagination"
      :row-key="row => `${row.type || 0}-${row.grade}`"
    />
  </NCard>
</template>

