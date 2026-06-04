<script setup lang="ts">
import { NCard, NDataTable } from 'naive-ui';

interface PetInfo {
  tid: number;
  name: string;
  level: number;
  satiety: number;
}

interface Props {
  petData: PetInfo[];
  petDataLoading: boolean;
  mobilePagination: any;
}

defineProps<Props>();
</script>

<template>
  <NCard title="Pets" :bordered="false">
    <NDataTable
      :columns="[
        { key: 'tid', title: 'TID', align: 'center', width: 100 },
        { key: 'name', title: 'Name', align: 'center', width: 120 },
        { key: 'level', title: 'Level', align: 'center', width: 120 },
        { key: 'satiety', title: 'Satiety', align: 'center', width: 120 },
      ]"
      :data="petData"
      :loading="petDataLoading"
      :pagination="mobilePagination"
      :row-key="row => row.tid"
    />
  </NCard>
</template>

