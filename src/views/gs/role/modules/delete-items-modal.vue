<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { NModal, NCard, NForm, NFormItemGi, NGrid, NInput, NButton, NInputNumber, NTooltip, NSpace, NScrollbar } from 'naive-ui';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { fetchDeleteItems } from '@/service/api/game-manage';
import { $t } from '@/locales';
import { useThemeStore } from '@/store/modules/theme';
import { useItemPackage } from '@/hooks/business/useItemPackage';
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import ItemSearchSelector from '@/components/business/item-search-selector.vue';
import { type ItemInfo } from '@/utils/item';

defineOptions({
  name: 'DeleteItemsModal'
});

interface Props {
  /** 角色数据 */
  rowData?: any;
  /** 初始选中的物品列表 */
  initialItems?: ItemInfo[];
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();
const themeStore = useThemeStore();

// 表单数据
const model = ref({
  roleId: '',
  remark: ''
});

// 物品相关状态 - 使用封装的组件
const selectedItems = ref<ItemInfo[]>([]);
const itemData = ref<any>(null);

// 表单验证规则
const rules = {
  roleId: defaultRequiredRule,
  remark: defaultRequiredRule
};

// 获取物品数据
onMounted(async () => {
  try {
    const data = await useItemPackage();
    itemData.value = data;
  } catch (error) {
    console.error('获取物品数据失败:', error);
    itemData.value = null;
  }
});

// 关闭弹窗
function closeModal() {
  visible.value = false;
  restoreValidation();
}

// 提交表单
async function handleSubmit() {
  await validate();

  if (selectedItems.value.length === 0) {
    window.$message?.error('请至少添加一个物品');
    return;
  }

  const itemIds = selectedItems.value.map(item => Number(item.id));
  const itemCounts = selectedItems.value.map(item => Number(item.count));

  const data = {
    roleId: model.value.roleId, // 保持字符串格式，避免大整数精度丢失
    itemIds: JSON.stringify(itemIds),
    itemCounts: JSON.stringify(itemCounts),
    remark: model.value.remark
  };

  try {
    const response = await fetchDeleteItems(data);
    if (handleApiResponseError(response)) return;
    window.$message?.success($t('common.deleteSuccess'));
    closeModal();
    emit('submitted');
    // 清空选中的物品
    selectedItems.value = [];
  } catch (error) {
    handleApiCatchError(error);
  }
}

// 设置角色ID和备注
function setRoleData() {
  if (props.rowData && props.rowData.roleId) {
    model.value.roleId = String(props.rowData.roleId);
  } else {
    model.value.roleId = '';
  }
  model.value.remark = '';
}

// 监听弹窗显示
watch(visible, newVal => {
  if (newVal) {
    restoreValidation();

    // 设置初始选中的物品（如果有）
    if (props.initialItems && props.initialItems.length > 0) {
      selectedItems.value = props.initialItems.map(item => ({
        id: String(item.id),
        name: item.name || String(item.id),
        names: item.names || item.name || String(item.id),
        count: item.count || 1,
        trade: item.trade
      }));
    } else {
      // 清空选中的物品
      selectedItems.value = [];
    }

    // 设置角色ID
    setRoleData();
  }
});

// 监听 rowData 变化，确保角色ID能及时更新
watch(() => props.rowData, () => {
  if (visible.value) {
    setRoleData();
  }
}, { deep: true });
</script>

<template>
  <NModal
    v-model:show="visible"
    :mask-closable="true"
    preset="card"
    :title="$t('page.manage.gsRole.deleteItems')"
    class="w-800px"

  >
    <NScrollbar class="h-500px pr-20px">
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        label-width="auto"
      >
        <NGrid :cols="24" :x-gap="18">
          <NFormItemGi span="24" :label="$t('page.manage.gsRole.roleId')" path="roleId">
            <NInput
              v-model:value="model.roleId"
              :placeholder="$t('page.manage.gsRole.form.roleId')"
              disabled
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi span="24" label="物品选择">
            <ItemSearchSelector
              v-model="selectedItems"
              placeholder="输入物品ID或名称搜索"
            />
          </NFormItemGi>

          <NFormItemGi span="24" :label="$t('page.manage.gsRole.remark')" path="remark">
            <NInput
              v-model:value="model.remark"
              type="textarea"
              :placeholder="$t('page.manage.gsRole.form.remark')"
              :rows="3"
              style="width: 100%"
            />
          </NFormItemGi>
        </NGrid>
      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeModal">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
.w-800px {
  width: 800px;
  max-width: 95vw;
}

/* 输入框禁用状态样式 */
:deep(.n-input--disabled) {
  cursor: not-allowed;
  opacity: 0.7;
}

/* 物品卡片样式优化 */
:deep(.n-card) {
  transition: all 0.2s ease;
}

:deep(.n-card:hover) {
  transform: translateY(-2px);
}
</style>

