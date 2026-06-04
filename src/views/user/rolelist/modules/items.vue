<script setup lang="ts">
import { ref, computed, h } from 'vue';
import { NCard, NDataTable, NInput, NButton, NSpace } from 'naive-ui';
import { Icon } from '@iconify/vue';
import DeleteItemsModal from '@/views/gs/role/modules/delete-items-modal.vue';
import { type ItemInfo as UtilsItemInfo } from '@/utils/item';
import { $t } from '@/locales';

interface ItemInfo {
  id: number | string;
  name: string;
  guid: string;
  count: number | null;
  isEmpty?: boolean;
}

interface Props {
  inventoryItems: ItemInfo[];
  storageItems: ItemInfo[];
  equipItems: ItemInfo[];
  itemInfoLoading: boolean;
  inventoryColumns: any[];
  equipColumns: any[];
  mobilePagination: any;
  roleId?: string;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'refresh'): void;
}

const emit = defineEmits<Emits>();

const itemSearchKeyword = ref('');

// 删除物品弹窗
const deleteItemsModalVisible = ref(false);
const initialDeleteItems = ref<UtilsItemInfo[]>([]);

// 打开删除物品弹窗
function handleDeleteItem(item: ItemInfo) {
  if (item.isEmpty) return;
  // 将当前物品转换为弹窗需要的格式并预选
  initialDeleteItems.value = [{
    id: String(item.id),
    name: item.name,
    names: item.name || String(item.id),
    count: item.count || 1
  }];
  deleteItemsModalVisible.value = true;
}

// 删除成功后刷新
function handleDeleteSubmitted() {
  emit('refresh');
  deleteItemsModalVisible.value = false;
  initialDeleteItems.value = [];
}

// 构建角色数据对象（用于传递给删除弹窗）
const roleDataForDelete = computed(() => {
  if (!props.roleId) return undefined;
  return {
    roleId: props.roleId
  };
});

// 过滤后的背包物品
const filteredInventoryItems = computed(() => {
  if (!itemSearchKeyword.value.trim()) {
    return props.inventoryItems;
  }
  const keyword = itemSearchKeyword.value.toLowerCase().trim();
  return props.inventoryItems.filter(item => {
    if (item.isEmpty) return false;
    return (
      item.id.toString().includes(keyword) ||
      item.name.toLowerCase().includes(keyword) ||
      item.guid.toLowerCase().includes(keyword)
    );
  });
});

// 过滤后的仓库物品
const filteredStorageItems = computed(() => {
  if (!itemSearchKeyword.value.trim()) {
    return props.storageItems;
  }
  const keyword = itemSearchKeyword.value.toLowerCase().trim();
  return props.storageItems.filter(item => {
    if (item.isEmpty) return false;
    return (
      item.id.toString().includes(keyword) ||
      item.name.toLowerCase().includes(keyword) ||
      item.guid.toLowerCase().includes(keyword)
    );
  });
});

// 过滤后的装备物品
const filteredEquipItems = computed(() => {
  if (!itemSearchKeyword.value.trim()) {
    return props.equipItems;
  }
  const keyword = itemSearchKeyword.value.toLowerCase().trim();
  return props.equipItems.filter(item => {
    if (item.isEmpty) return false;
    return (
      item.id.toString().includes(keyword) ||
      item.name.toLowerCase().includes(keyword) ||
      item.guid.toLowerCase().includes(keyword)
    );
  });
});

// 添加操作列的背包列配置
const inventoryColumnsWithAction = computed(() => {
  const columns = [...props.inventoryColumns];
  columns.push({
    key: 'actions',
    title: '操作',
    align: 'center' as const,
    width: 120,
    fixed: 'right' as const,
    render: (row: ItemInfo) => {
      if (row.isEmpty) return '';
      return h(NButton, {
        type: 'error',
        ghost: true,
        size: 'small',
        onClick: () => handleDeleteItem(row)
      }, {
        default: () => $t('common.delete')
      });
    }
  });
  return columns;
});

// 添加操作列的装备列配置
const equipColumnsWithAction = computed(() => {
  const columns = [...props.equipColumns];
  columns.push({
    key: 'actions',
    title: '操作',
    align: 'center' as const,
    width: 120,
    fixed: 'right' as const,
    render: (row: ItemInfo) => {
      if (row.isEmpty) return '';
      return h(NButton, {
        type: 'error',
        ghost: true,
        size: 'small',
        onClick: () => handleDeleteItem(row)
      }, {
        default: () => $t('common.delete')
      });
    }
  });
  return columns;
});
</script>

<template>
  <div class="flex flex-col gap-6 items-container">
    <!-- 搜索框 -->
    <div class="item-search-container">
      <NInput
        v-model:value="itemSearchKeyword"
        placeholder="搜索物品（支持ID、名称、GUID）"
        clearable
        class="item-search-input"
      >
        <template #prefix>
          <Icon icon="ic:round-search" class="text-gray-400" />
        </template>
      </NInput>
      <div v-if="itemSearchKeyword" class="search-result-hint">
        找到 {{ filteredInventoryItems.length }} 个背包物品，{{ filteredStorageItems.length }} 个仓库物品，{{ filteredEquipItems.length }} 个装备
      </div>
    </div>

    <!-- 背包物品表格 -->
    <NCard title="items" :bordered="false">
      <NDataTable
        :columns="inventoryColumnsWithAction"
        :data="filteredInventoryItems"
        :loading="itemInfoLoading"
        :pagination="mobilePagination"
        :row-key="row => row.id"
        class="fixed-height-table"
        size="medium"
      />
    </NCard>

    <!-- 仓库物品表格 -->
    <NCard title="Storage" :bordered="false">
      <NDataTable
        :columns="inventoryColumnsWithAction"
        :data="filteredStorageItems"
        :loading="itemInfoLoading"
        :pagination="mobilePagination"
        :row-key="row => row.id"
        class="fixed-height-table"
        size="medium"
      />
    </NCard>

    <!-- 装备物品表格 -->
    <NCard title="Equip" :bordered="false">
      <NDataTable
        :columns="equipColumnsWithAction"
        :data="filteredEquipItems"
        :loading="itemInfoLoading"
        :pagination="mobilePagination"
        :row-key="row => row.id"
        class="fixed-height-table"
        size="medium"
      />
    </NCard>

    <!-- 删除物品弹窗 -->
    <DeleteItemsModal
      v-model:visible="deleteItemsModalVisible"
      :row-data="roleDataForDelete"
      :initial-items="initialDeleteItems"
      @submitted="handleDeleteSubmitted"
    />
  </div>
</template>

<style scoped>
/* 物品搜索容器 */

</style>

