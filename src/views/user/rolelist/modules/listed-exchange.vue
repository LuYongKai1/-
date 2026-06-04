<script setup lang="ts">
import { NCard, NDataTable } from 'naive-ui';

interface ExchangeItem {
  id: number;
  itemId: number;
  itemName: string;
  count: number;
  price: number;
  createTime: string;
  status: string;
  tradeCuid?: string;
  euid?: string;
  username?: string;
  regtime?: string;
  exchangeType?: number;
}

interface Props {
  listedExchangeData: ExchangeItem[];
  listedExchangeLoading: boolean;
  mobilePagination: any;
}

defineProps<Props>();
</script>

<template>
  <NCard title="Listed Exchange" :bordered="false">
    <template #header-extra>
      <span class="text-sm text-gray-500">
        共 {{ listedExchangeData.length }} 条上架记录
      </span>
    </template>
    <NDataTable
      :columns="[
        { key: 'id', title: 'TID', align: 'center', width: 100 },
        { key: 'itemId', title: 'Item ID', align: 'center', width: 100 },
        { key: 'itemName', title: 'Item Name', align: 'center', width: 180 },
        { key: 'count', title: 'Count', align: 'center', width: 70 },
        { key: 'price', title: 'Price', align: 'center', width: 90 },
        { key: 'username', title: 'Username', align: 'center', width: 120 },
        { key: 'exchangeType', title: 'Type', align: 'center', width: 70 },
        { key: 'regtime', title: 'Reg Time', align: 'center', width: 160 },
        { key: 'createTime', title: 'Expire Time', align: 'center', width: 160 },
        { key: 'status', title: 'Status', align: 'center', width: 90 },
        { key: 'euid', title: 'EUID', align: 'center', width: 180 },
      ]"
      :data="listedExchangeData"
      :loading="listedExchangeLoading"
      :pagination="mobilePagination"
      :row-key="row => row.euid || row.id"
    >
      <template #empty>
        <div class="text-center py-8">
          <div class="text-gray-400 mb-2">暂无上架记录</div>
          <div class="text-xs text-gray-300">该角色还没有在交易行上架过物品</div>
        </div>
      </template>
    </NDataTable>
  </NCard>
</template>

