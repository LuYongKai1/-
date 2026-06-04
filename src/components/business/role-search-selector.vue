<script setup lang="ts">
import { ref, computed, watch, h } from 'vue';
import { NInput, NDataTable, NEmpty, NButton, NAlert } from 'naive-ui';
import { useThemeStore } from '@/store/modules/theme';
import { fetchmultiplerole } from '@/service/api';
import { useAuth } from '@/hooks/business/auth';
import SvgIcon from '@/components/custom/svg-icon.vue';
import BatchAddModal from '@/views/operate/multiple/modules/batch-add-modal.vue';

interface RoleInfo {
  id: string;
  name: string;
  serverId: number;
  serverName?: string;
}

interface Props {
  /** 已选择的角色列表 */
  modelValue: RoleInfo[];
  /** 是否只读 */
  readonly?: boolean;
  /** 搜索框占位符 */
  placeholder?: string;
  /** 表格最大高度 */
  maxHeight?: number;
  /** 导入的token */
  importToken?: string;
  /** 导入的数量 */
  importCount?: number;
}

interface Emits {
  (e: 'update:modelValue', value: RoleInfo[]): void;
  (e: 'update:importToken', value: string): void;
  (e: 'update:importCount', value: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  placeholder: '请输入角色名称或ID搜索',
  maxHeight: 300,
  importToken: '',
  importCount: 0
});

const emit = defineEmits<Emits>();

const themeStore = useThemeStore();
const { hasAuth } = useAuth();

// 搜索相关
const searchValue = ref('');
const searchResults = ref<RoleInfo[]>([]);
const roleInputMode = ref<'search' | 'import'>('search');
const batchAddModalVisible = ref(false);

// 内部选中的角色列表
const selectedRoles = computed({
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

// 搜索角色
async function handleSearch(value: string) {
  if (!value) {
    searchResults.value = [];
    return;
  }

  try {
    const response = await fetchmultiplerole({
      param: value,
      type: "1",
    });
    if (response?.response?.data) {
      const data = Array.isArray(response.response.data)
        ? response.response.data
        : [response.response.data];
      searchResults.value = data.map((role: any) => ({
        id: String(role.roleId || role.id),
        name: role.roleName || role.name || "未知角色",
        serverId: role.serverId || 1,
        serverName: role.serverName || "",
      }));
    }
  } catch (error) {
    console.error("搜索角色失败:", error);
    searchResults.value = [];
  }
}

const debouncedHandleSearch = useDebounce(handleSearch, 500);

// 添加角色
function addRole(role: RoleInfo) {
  const existingRole = selectedRoles.value.find(r => r.id === role.id && r.name === role.name);
  if (!existingRole) {
    const roleToAdd = {
      ...role,
      serverId: role.serverId ?? 1,
      serverName: role.serverName ?? "",
    };
    emit('update:modelValue', [...selectedRoles.value, roleToAdd]);
  }
  searchResults.value = [];
  searchValue.value = '';
}

// 删除角色
function removeRole(roleId: string) {
  const newRoles = selectedRoles.value.filter(r => r.id !== roleId);
  emit('update:modelValue', newRoles);
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
    // 清空搜索模式下选择的角色
    emit('update:modelValue', []);
  }
  batchAddModalVisible.value = false;
}

// 清除导入数据
function clearImportData() {
  emit('update:importToken', '');
  emit('update:importCount', 0);
}

// 角色表格列配置
const roleColumns = computed(() => [
  {
    title: '角色名称',
    key: 'name',
    width: 150,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '角色ID',
    key: 'id',
    width: 180,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '服务器',
    key: 'serverName',
    width: 120,
    ellipsis: {
      tooltip: true
    },
    render: (row: any) => {
      return row.serverName || '-';
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    fixed: 'right' as const,
    render: (row: any) => {
      return h(
        NButton,
        {
          text: true,
          type: 'error',
          size: 'small',
          disabled: props.readonly,
          onClick: () => removeRole(row.id)
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
          v-model:value="roleInputMode"
          :options="[
            { label: '搜索角色', value: 'search' },
            { label: '导入角色', value: 'import' }
          ]"
          style="width: 120px"
          :disabled="readonly || selectedRoles.length > 0 || !!(importToken && importCount > 0)"
        />
        <NInput
          v-if="roleInputMode === 'search'"
          v-model:value="searchValue"
          :placeholder="placeholder"
          @input="debouncedHandleSearch"
          style="flex: 1"
          :disabled="readonly"
          clearable
        />
        <NButton
          v-if="roleInputMode === 'import'"
          type="primary"
          ghost
          style="flex: 1"
          :disabled="readonly"
          @click="openBatchAddModal"
        >
          <template #icon>
            <icon-mdi-upload class="text-icon" />
          </template>
          点击导入
        </NButton>
      </div>

      <div
        v-show="searchResults.length > 0 && roleInputMode === 'search'"
        class="absolute left-0 right-0 top-full mt-1 rounded z-50 max-h-[300px] overflow-y-auto shadow-lg"
        :class="[
          themeStore.darkMode
            ? 'bg-[rgb(44,44,50)] border border-[#333]'
            : 'bg-white border border-[#e5e7eb]',
        ]"
      >
        <div
          v-for="role in searchResults"
          :key="role.id + '-' + role.name"
          class="p-3 cursor-pointer border-b last:border-b-0 transition-colors duration-200"
          :class="[
            themeStore.darkMode
              ? 'hover:bg-[rgb(55,55,60)] border-[#333]'
              : 'hover:bg-[#f3f4f6] border-[#e5e7eb]',
          ]"
          @click="addRole(role)"
        >
          <div
            class="font-medium text-sm whitespace-normal break-words"
            :class="themeStore.darkMode ? 'text-white' : 'text-[#1f1f1f]'"
          >
            {{ role.name }}
          </div>
          <div
            class="text-xs mt-1"
            :class="themeStore.darkMode ? 'text-[#aaa]' : 'text-[#666]'"
          >
            ID: {{ role.id }}
          </div>
          <div
            v-if="role.serverName"
            class="text-xs mt-1"
            :class="themeStore.darkMode ? 'text-[#aaa]' : 'text-[#666]'"
          >
            服务器: {{ role.serverName }}
          </div>
        </div>
      </div>
    </div>

    <!-- 批量导入信息或已选择的角色表格 -->
    <div v-if="importToken && importCount > 0">
      <NAlert type="info" :bordered="false">
        <template #icon>
          <icon-mdi-file-excel class="text-lg" />
        </template>
        <div class="flex items-center justify-between">
          <span>批量导入角色：共 {{ importCount }} 条记录</span>
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
      v-else-if="selectedRoles.length > 0"
      :columns="roleColumns"
      :data="selectedRoles"
      :bordered="true"
      :single-line="false"
      size="small"
      :max-height="maxHeight"
    />
    <NEmpty
      v-else
      description="暂无角色"
      size="small"
      class="py-4"
    />
  </div>

  <!-- 批量导入角色弹窗 -->
  <BatchAddModal
    v-model:visible="batchAddModalVisible"
    @success="onBatchAddSuccess"
  />
</template>

<style scoped></style>
