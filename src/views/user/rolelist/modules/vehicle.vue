<script setup lang="ts">
import { NCard, NDataTable } from 'naive-ui';

interface VehicleInfo {
  tid: number;
  level: number;
  exp: number;
  satiety: number;
  end_date: string;
  equip_uid: number[];
}

interface VehicleData {
  cur_vehicle: number;
  list_vehicle: VehicleInfo[];
  list_equip_vehicle: any[];
}

interface Props {
  vehicleData: VehicleData;
  vehicleDataLoading: boolean;
  mobilePagination: any;
}

defineProps<Props>();
</script>

<template>
  <NCard title="Vehicles" :bordered="false">
    <NDataTable
      :columns="[
        { key: 'tid', title: 'TID', align: 'center', width: 100 },
        { key: 'level', title: 'Level', align: 'center', width: 120 },
        { key: 'exp', title: 'Exp', align: 'center', width: 120 },
        { key: 'satiety', title: 'Satiety', align: 'center', width: 120 },
        { key: 'end_date', title: 'End Date', align: 'center', width: 150 },
      ]"
      :data="vehicleData.list_vehicle"
      :loading="vehicleDataLoading"
      :pagination="mobilePagination"
      :row-key="row => row.tid"
    />
  </NCard>
</template>

