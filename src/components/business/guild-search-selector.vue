<script setup lang="ts">
import { ref, computed, watch, h } from 'vue';
import { NInput, NDataTable, NEmpty, NButton, NAlert } from 'naive-ui';
import { useThemeStore } from '@/store/modules/theme';
import { useAuth } from '@/hooks/business/auth';
import SvgIcon from '@/components/custom/svg-icon.vue';
import BatchAddGuildModal from '@/views/user/guildmail/modules/batch-add-guild-modal.vue';

export interface GuildInfo {
  guid: string;
  guild_name: string;
  leader_name: string;
  member_count: number;
  serverId?: number | string;
}

interface Props {
  /** 已选择的公会列表 */
  modelValue: GuildInfo[];
  /** 是否只读 */
  readonly?: boolean;
  /** 搜索框占位符 */
  placeholder?: string;
  /** 表格最大高度 */
  maxHeight?: number;
  /** 是否禁用（例如未选择服务器） */
  disabled?: boolean;
  /** 搜索函数 */
  onSearch?: (value: string) => Promise<GuildInfo[]>;
  /** 导入的token */
  importToken?: string;
  /** 导入的数量 */
  importCount?: number;
}

interface Emits {
  (e: 'update:modelValue', value: GuildInfo[]): void;
  (e: 'update:importToken', value: string): void;
  (e: 'update:importCount', value: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  placeholder: '请输入公会名称或ID搜索',
  maxHeight: 300,
  disabled: false,
  importToken: '',
  importCount: 0
});

const emit = defineEmits<Emits>();

const themeStore = useThemeStore();
const { hasAuth } = useAuth();

// 搜索相关
const searchValue = ref('');
const searchResults = ref<GuildInfo[]>([]);
const isSearching = ref(false);
const guildInputMode = ref<'search' | 'import'>('search');
const batchAddModalVisible = ref(false);

// 内部选中的公会列表
const selectedGuilds = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
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

// 搜索公会
async function handleSearch(value: string) {
  if (!value || props.disabled || !props.onSearch) {
    searchResults.value = [];
    return;
  }

  try {
    isSearching.value = true;
    searchResults.value = await props.onSearch(value);
  } catch (error) {
    console.error('搜索公会失败:', error);
    searchResults.value = [];
  } finally {
    isSearching.value = false;
  }
}

const debouncedHandleSearch = useDebounce(handleSearch, 300);

// 添加公会
function addGuild(guild: GuildInfo) {
  const existingGuild = selectedGuilds.value.find(g => g.guid === guild.guid);
  if (existingGuild) {
    window.$message?.warning('该公会已添加');
    return;
  }
  emit('update:modelValue', [...selectedGuilds.value, guild]);
  searchResults.value = [];
  searchValue.value = '';
}

// 删除公会
function removeGuild(index: number) {
  const newGuilds = [...selectedGuilds.value];
  newGuilds.splice(index, 1);
  emit('update:modelValue', newGuilds);
}

// 打开批量导入弹窗
function openBatchAddModal() {
  batchAddModalVisible.value = true;
}

// 批量导入成功后的回调
function onBatchAddSuccess(importedData: any) {
  if (importedData && importedData.token) {
    emit('update:importToken', importedData.token);
    emit('update:importCount', importedData.totalCount || 0);
    // 清空搜索模式下选择的公会
    emit('update:modelValue', []);
  }
  batchAddModalVisible.value = false;
}

// 清除导入数据
function clearImportData() {
  emit('update:importToken', '');
  emit('update:importCount', 0);
}

// 公会表格列配置
const guildColumns = computed(() => [
  {
    title: '公会名称',
    key: 'guild_name',
    width: 180,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '公会ID',
    key: 'guid',
    width: 150,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '服务器ID',
    key: 'serverId',
    width: 100,
    render: (row: GuildInfo) => row.serverId || '-'
  },
  {
    title: '会长',
    key: 'leader_name',
    width: 120,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '成员数',
    key: 'member_count',
    width: 80,
    render: (row: GuildInfo) => row.member_count || 0
  },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    fixed: 'right' as const,
    render: (row: GuildInfo, index: number): any => {
      return h(
        NButton,
        {
          text: true,
          type: 'error',
          size: 'small',
          disabled: props.readonly,
          onClick: () => {
            removeGuild(index);
          }
        },
        {
          default: () => '删除'
        }
      );
    }
  }
]);

// 清空搜索结果
watch(searchValue, (val) => {
  if (!val) {
    searchResults.value = [];
  }
});
</script>

<template>
  <div class="flex flex-col gap-3 w-full">
    <!-- 输入模式选择和输入框 -->
    <div class="relative">
      <div class="flex gap-2">
        <NSelect
          v-if="hasAuth('operate:multipleMail:import')"
          v-model:value="guildInputMode"
          :options="[
            { label: '搜索公会', value: 'search' },
            { label: '导入公会', value: 'import' }
          ]"
          style="width: 120px"
          :disabled="readonly || disabled || selectedGuilds.length > 0 || !!(importToken && importCount > 0)"
        />
        <NInput
          v-if="guildInputMode === 'search'"
          v-model:value="searchValue"
          :placeholder="placeholder"
          @input="debouncedHandleSearch"
          style="flex: 1"
          :disabled="readonly || disabled"
          :loading="isSearching"
          clearable
        />
        <NButton
          v-if="guildInputMode === 'import'"
          type="primary"
          ghost
          style="flex: 1"
          :disabled="readonly || disabled"
          @click="openBatchAddModal"
        >
          <template #icon>
            <icon-mdi-upload class="text-icon" />
          </template>
          点击导入
        </NButton>
      </div>
      <div
        v-show="searchResults.length > 0 && guildInputMode === 'search'"
        class="absolute left-0 right-0 top-full mt-1 rounded z-50 max-h-[300px] overflow-y-auto shadow-lg"
        :class="[
          themeStore.darkMode
            ? 'bg-[rgb(44,44,50)] border border-[#333]'
            : 'bg-white border border-[#e5e7eb]',
        ]"
      >
        <div
          v-for="guild in searchResults"
          :key="guild.guid"
          class="p-3 cursor-pointer border-b last:border-b-0 transition-colors duration-200"
          :class="[
            themeStore.darkMode
              ? 'hover:bg-[rgb(55,55,60)] border-[#333]'
              : 'hover:bg-[#f3f4f6] border-[#e5e7eb]',
          ]"
          @click="addGuild(guild)"
        >
          <div class="flex flex-col gap-2">
            <div
              class="font-medium text-sm"
              :class="themeStore.darkMode ? 'text-white' : 'text-[#1f1f1f]'"
            >
              {{ guild.guild_name }}
            </div>
            <div class="flex items-center gap-4">
              <div
                class="text-xs"
                :class="themeStore.darkMode ? 'text-[#aaa]' : 'text-[#666]'"
              >
                ID: {{ guild.guid }}
              </div>
              <div
                v-if="guild.serverId"
                class="text-xs"
                :class="themeStore.darkMode ? 'text-[#aaa]' : 'text-[#666]'"
              >
                服务器: {{ guild.serverId }}
              </div>
              <div
                class="text-xs"
                :class="themeStore.darkMode ? 'text-[#aaa]' : 'text-[#666]'"
              >
                会长: {{ guild.leader_name }}
              </div>
              <div
                class="text-xs"
                :class="themeStore.darkMode ? 'text-[#aaa]' : 'text-[#666]'"
              >
                成员: {{ guild.member_count }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 批量导入信息或已选择的公会表格 -->
    <div v-if="importToken && importCount > 0">
      <NAlert type="info" :bordered="false">
        <template #icon>
          <icon-mdi-file-excel class="text-lg" />
        </template>
        <div class="flex items-center justify-between">
          <span>批量导入公会：共 {{ importCount }} 条记录</span>
          <NButton
            v-if="!readonly"
            text
            type="error"
            size="small"
            @click="clearImportData"
          >
            <template #icon>
              <SvgIcon icon="mdi:delete" />
            </template>
            清除
          </NButton>
        </div>
      </NAlert>
    </div>
    <NDataTable
      v-else-if="selectedGuilds.length > 0"
      :columns="guildColumns"
      :data="selectedGuilds"
      :bordered="true"
      :single-line="false"
      size="small"
      :max-height="maxHeight"
    />
    <NEmpty
      v-else
      description="暂无公会"
      size="small"
      class="py-4"
    />
  </div>

  <!-- 批量导入公会弹窗 -->
  <BatchAddGuildModal
    v-model:visible="batchAddModalVisible"
    @success="onBatchAddSuccess"
  />
</template>

<style scoped></style>
