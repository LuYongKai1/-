<script setup lang="ts">
import { NCard, NDataTable } from 'naive-ui';

interface SkillInfo {
  id: number;
  name: string;
  level: number;
}

interface Props {
  skillData: SkillInfo[];
  skillDataLoading: boolean;
  mobilePagination: any;
}

defineProps<Props>();
</script>

<template>
  <NCard title="Skills" :bordered="false">
    <NDataTable
      :columns="[
        { key: 'id', title: 'ID', align: 'center', width: 100 },
        { key: 'name', title: 'Name', align: 'center', width: 120 },
        { key: 'level', title: 'Level', align: 'center', width: 80 },
      ]"
      :data="skillData"
      :loading="skillDataLoading"
      :pagination="mobilePagination"
      :row-key="row => row.id"
    />
  </NCard>
</template>

