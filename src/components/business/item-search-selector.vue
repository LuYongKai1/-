<script setup lang="ts">
import { ref, computed, watch, onMounted, h } from 'vue';
import { NInput, NDataTable, NEmpty, NButton, NInputNumber, NSelect } from 'naive-ui';
import { useThemeStore } from '@/store/modules/theme';
import { useItemPackage } from '@/hooks/business/useItemPackage';
import type { ItemInfo } from '@/utils/item';

interface Props {
  /** 已选择的物品列表 */
  modelValue: ItemInfo[];
  /** 是否只读 */
  readonly?: boolean;
  /** 搜索框占位符 */
  placeholder?: string;
  /** 表格最大高度 */
  maxHeight?: number;
  /** 最大选择数量 */
  maxCount?: number;
}

interface Emits {
  (e: 'update:modelValue', value: ItemInfo[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  placeholder: '请输入物品名称或ID搜索',
  maxHeight: 300,
  maxCount: 5
});

const emit = defineEmits<Emits>();

const themeStore = useThemeStore();

// 搜索相关
const searchValue = ref('');
const searchResults = ref<ItemInfo[]>([]);
const itemData = ref<any>(null);
const bindingFilter = ref<'all' | 'bound' | 'unbound'>('all');

// 绑定状态筛选选项
const bindingOptions = [
  { label: '全部', value: 'all' },
  { label: '绑定', value: 'bound' },
  { label: '非绑定', value: 'unbound' }
];

// 内部选中的物品列表
const selectedItems = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

// 加载物品数据
onMounted(async () => {
  try {
    const data = await useItemPackage();
    itemData.value = data;
  } catch (error) {
    console.error('获取物品数据失败:', error);
    itemData.value = null;
  }
});

// 防抖函数
function useDebounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: number | null = null;
  return function (...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
}

// 搜索物品
function handleSearch(value: string) {
  if (!value) {
    searchResults.value = [];
    return;
  }

  // 如果物品数据还没加载完成，不执行搜索，但也不清空已有结果
  if (!itemData.value?.data?.item) {
    return;
  }

  const searchTerm = value.toLowerCase();
  const items = itemData.value.data.item;

  searchResults.value = Object.entries(items)
    .filter(([id, item]: [string, any]) => {
      const itemName = (item.name || '').toLowerCase();
      const itemNames = (item.names || '').toLowerCase();
      const itemId = id.toLowerCase();
      const matchesSearch = itemName.includes(searchTerm) || itemNames.includes(searchTerm) || itemId.includes(searchTerm);

      // 绑定状态筛选
      let matchesBinding = true;
      if (bindingFilter.value === 'bound') {
        matchesBinding = item.trade === false || item.trade === 0;
      } else if (bindingFilter.value === 'unbound') {
        matchesBinding = item.trade === true || item.trade === 1;
      }
      // 'all' 时 matchesBinding 保持为 true

      return matchesSearch && matchesBinding;
    })
    .slice(0, 20) // 限制搜索结果数量
    .map(([id, item]: [string, any]) => ({
      id: String(id),
      name: item.name || String(id),
      names: item.names || '',
      count: 1,
      trade: item.trade
    }));
}

const debouncedHandleSearch = useDebounce(handleSearch, 300);

// 添加物品
function addItem(item: ItemInfo) {
  const existingItem = selectedItems.value.find(i => i.id === item.id);
  if (existingItem) {
    // 如果已存在，增加数量
    existingItem.count += 1;
    // 触发更新
    emit('update:modelValue', [...selectedItems.value]);
  } else {
    // 检查是否超过最大数量限制
    if (selectedItems.value.length >= props.maxCount) {
      window.$message?.warning(`最多只能选择${props.maxCount}个物品`);
      return;
    }
    // 添加新物品
    emit('update:modelValue', [...selectedItems.value, { ...item, count: 1 }]);
  }
  searchResults.value = [];
  searchValue.value = '';
}

// 删除物品
function removeItem(index: number) {
  const newItems = [...selectedItems.value];
  newItems.splice(index, 1);
  emit('update:modelValue', newItems);
}

// 更新物品数量
function updateItemCount(index: number, count: number | null) {
  if (count !== null) {
    const newItems = [...selectedItems.value];
    newItems[index].count = count;
    emit('update:modelValue', newItems);
  }
}

// 物品表格列配置
const itemColumns = computed(() => [
  {
    title: '物品名称',
    key: 'names',
    width: 200,
    ellipsis: {
      tooltip: true
    },
    render: (row: any) => row.names || row.name
  },
  {
    title: '物品ID',
    key: 'id',
    width: 100,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '绑定状态',
    key: 'trade',
    width: 100,
    render: (row: any) => {
      if (row.trade === undefined) return '-';
      return row.trade ? '非绑定' : '绑定';
    }
  },
  {
    title: '数量',
    key: 'count',
    width: 120,
    render: (row: any, index: number): any => {
      return h(
        NInputNumber,
        {
          value: row.count,
          min: 1,
          max: 999999999,
          disabled: props.readonly,
          onUpdateValue: (value: number | null) => {
            updateItemCount(index, value);
          }
        }
      );
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    fixed: 'right' as const,
    render: (row: any, index: number): any => {
      return h(
        NButton,
        {
          text: true,
          type: 'error',
          size: 'small',
          disabled: props.readonly,
          onClick: () => {
            removeItem(index);
          }
        },
        {
          default: () => '删除'
        }
      );
    }
  }
]);

// 监听搜索值变化，触发搜索
watch(searchValue, (val) => {
  if (!val) {
    searchResults.value = [];
  } else if (itemData.value?.data?.item) {
    // 确保物品数据已加载后再搜索
    debouncedHandleSearch(val);
  }
});

// 监听物品数据加载完成，如果有搜索值则立即搜索
watch(() => itemData.value?.data?.item, (hasData) => {
  if (hasData && searchValue.value) {
    // 数据加载完成后，如果有搜索值，立即搜索（不使用防抖）
    handleSearch(searchValue.value);
  }
});

// 监听绑定状态筛选变化，重新搜索
watch(bindingFilter, () => {
  if (searchValue.value && itemData.value?.data?.item) {
    handleSearch(searchValue.value);
  }
});
</script>

<template>
  <div class="flex flex-col gap-3 w-full">
    <!-- 搜索输入框和筛选 -->
    <div class="flex gap-2">
      <div class="relative flex-1">
        <NInput
          v-model:value="searchValue"
          :placeholder="placeholder"
          :disabled="readonly"
          clearable
        />
      </div>
      <NSelect
        v-model:value="bindingFilter"
        :options="bindingOptions"
        :disabled="readonly"
        class="w-32"
      />
    </div>
    <div class="relative">
      <div
        v-show="searchResults.length > 0"
        class="absolute left-0 right-0 top-0 rounded z-50 max-h-[300px] overflow-y-auto shadow-lg"
        :class="[
          themeStore.darkMode
            ? 'bg-[rgb(44,44,50)] border border-[#333]'
            : 'bg-white border border-[#e5e7eb]',
        ]"
      >
        <div
          v-for="item in searchResults"
          :key="item.id"
          class="p-3 cursor-pointer border-b last:border-b-0 transition-colors duration-200"
          :class="[
            themeStore.darkMode
              ? 'hover:bg-[rgb(55,55,60)] border-[#333]'
              : 'hover:bg-[#f3f4f6] border-[#e5e7eb]',
          ]"
          @click="addItem(item)"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex-1">
              <div
                class="font-medium text-sm whitespace-normal break-words"
                :class="themeStore.darkMode ? 'text-white' : 'text-[#1f1f1f]'"
              >
                {{ item.names || item.name }}
              </div>
              <div
                class="text-xs mt-1"
                :class="themeStore.darkMode ? 'text-[#aaa]' : 'text-[#666]'"
              >
                ID: {{ item.id }}
              </div>
            </div>
            <div
              class="text-xs px-2 py-1 rounded"
              :class="item.trade ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'"
            >
              {{ item.trade ? '非绑定' : '绑定' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 已选择的物品表格 -->
    <div>
      <div v-if="selectedItems.length > 0" class="text-xs mb-2" :class="themeStore.darkMode ? 'text-[#aaa]' : 'text-[#666]'">
        已选择 {{ selectedItems.length }}/{{ maxCount }} 个物品
      </div>
      <NDataTable
        v-if="selectedItems.length > 0"
        :columns="itemColumns"
        :data="selectedItems"
        :bordered="true"
        :single-line="false"
        size="small"
        :max-height="maxHeight"
      />
      <NEmpty
        v-else
        description="暂无物品"
        size="small"
        class="py-4"
      />
    </div>
  </div>
</template>

<style scoped></style>

