<script setup lang="ts">
import { ref, watch } from "vue";
import { NModal, NCard, NForm, NFormItem, NCheckbox, NCheckboxGroup, NSpace, NButton, NAlert } from "naive-ui";
import { $t } from "@/locales";

defineOptions({
  name: "PrivilegeModal",
});

interface Props {
  /** 用户数据列表 */
  userDataList?: any[];
}

const props = defineProps<Props>();

interface Emits {
  (e: "confirm", params: { privilegeCodes: number[] }): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", {
  default: false,
});

// 特权选项配置
const privilegeOptions = [
  {
    label: "免排队",
    value: 8,
    description: "设置角色免排队权限"
  },
  {
    label: "无视最大人数强制进地图",
    value: 9,
    description: "无视最大人数限制，强制进入地图"
  }
];

// 选中的特权代码
const selectedPrivileges = ref<number[]>([]);

// 关闭弹框
function handleClose() {
  visible.value = false;
  selectedPrivileges.value = [];
}

// 确认设置特权
function handleConfirm() {
  if (selectedPrivileges.value.length === 0) {
    window.$message?.warning("请至少选择一个特权选项");
    return;
  }

  emit("confirm", {
    privilegeCodes: selectedPrivileges.value,
  });
  handleClose();
}

// 监听弹框显示状态，重置选择
watch(
  () => visible.value,
  (newVal) => {
    if (!newVal) {
      selectedPrivileges.value = [];
    }
  }
);
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="card"
    title="设置特权"
    class="w-600px"
    :segmented="{
      content: true,
      footer: 'soft',
    }"
  >
    <NAlert type="info" :show-icon="true" class="mb-16px">
      请选择要设置的特权选项，支持多选。已选择 {{ selectedPrivileges.length }} 个特权。
    </NAlert>

    <NForm label-placement="left" :label-width="0">
      <NFormItem>
        <NCheckboxGroup v-model:value="selectedPrivileges">
          <NSpace vertical :size="16">
            <NCheckbox
              v-for="option in privilegeOptions"
              :key="option.value"
              :value="option.value"
              :label="option.label"
            >
              <template #default>
                <div>
                  <div style="font-weight: 500;">{{ option.label }}</div>
                  <div style="font-size: 12px; color: var(--n-text-color-2); margin-top: 4px;">
                    {{ option.description }}
                  </div>
                </div>
              </template>
            </NCheckbox>
          </NSpace>
        </NCheckboxGroup>
      </NFormItem>
    </NForm>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="handleClose">
          {{ $t("common.cancel") }}
        </NButton>
        <NButton type="primary" @click="handleConfirm" :disabled="selectedPrivileges.length === 0">
          {{ $t("common.confirm") }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>

