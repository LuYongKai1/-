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
  purchasedExchangeData: ExchangeItem[];
  purchasedExchangeLoading: boolean;
  mobilePagination: any;
}

defineProps<Props>();
</script>

<template>
  <NCard title="Purchased Exchange" :bordered="false">
    <template #header-extra>
      <span class="text-sm text-gray-500">
        共 {{ purchasedExchangeData.length }} 条购买记录
      </span>
    </template>
    <NDataTable
      :columns="[
        { key: 'id', title: 'GID', align: 'center', width: 120 },
        { key: 'itemId', title: 'Item ID', align: 'center', width: 100 },
        { key: 'itemName', title: 'Item Name', align: 'center', width: 200 },
        { key: 'count', title: 'Count', align: 'center', width: 80 },
        { key: 'price', title: 'Price', align: 'center', width: 100 },
        { key: 'tradeCuid', title: 'Seller CUID', align: 'center', width: 180 },
        { key: 'euid', title: 'EUID', align: 'center', width: 180 },
        { key: 'createTime', title: 'Expire Time', align: 'center', width: 180 },
        { key: 'status', title: 'Status', align: 'center', width: 100 },
      ]"
      :data="purchasedExchangeData"
      :loading="purchasedExchangeLoading"
      :pagination="mobilePagination"
      :row-key="row => row.euid || row.id"
    >
      <template #empty>
        <div class="text-center py-8">
          <div class="text-gray-400 mb-2">暂无购买记录</div>
          <div class="text-xs text-gray-300">该角色还没有在交易行购买过物品</div>
        </div>
      </template>
    </NDataTable>
  </NCard>
</template>

