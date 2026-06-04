<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";

defineOptions({
  name: "ServiceParamModal",
});

interface Props {
  /** the type of operation */
  operateType: 'add' | 'edit';
  /** the edit row data */
  rowData?: any | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: "submitted", data: any): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", {
  default: false,
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<'add' | 'edit', string> = {
    add: "添加参数",
    edit: "编辑参数",
  };
  return titles[props.operateType];
});

// 参数类型选项
const paramTypeOptions = [
  { label: 'String', value: 'String' },
  { label: 'Integer', value: 'Integer' },
  { label: 'Float', value: 'Float' },
  { label: 'Boolean', value: 'Boolean' },
  { label: 'Date', value: 'Date' },
  { label: 'JSON', value: 'JSON' }
];

type Model = {
  paramName: string;
  paramCode: string;
  paramType: string;
  paramUnit?: string;
  defaultValue?: string;
  description?: string;
  isRequired: number;
  sortOrder: number;
};

const model: Model = reactive({
  paramName: "",
  paramCode: "",
  paramType: "String",
  paramUnit: "",
  defaultValue: "",
  description: "",
  isRequired: 1,
  sortOrder: 0,
});

const rules: Record<keyof Model, any> = {
  paramName: defaultRequiredRule,
  paramCode: defaultRequiredRule,
  paramType: defaultRequiredRule,
  paramUnit: [],
  defaultValue: [],
  description: [],
  isRequired: defaultRequiredRule,
  sortOrder: defaultRequiredRule,
};

function createDefaultModel(): Model {
  return {
    paramName: "",
    paramCode: "",
    paramType: "String",
    paramUnit: "",
    defaultValue: "",
    description: "",
    isRequired: 1,
    sortOrder: 0,
  };
}

function handleUpdateModelWhenEdit() {
  if (props.operateType === "add") {
    Object.assign(model, createDefaultModel());
    return;
  }

  if (props.operateType === "edit" && props.rowData) {
    Object.assign(model, {
      paramName: props.rowData.paramName || props.rowData.param_name || "",
      paramCode: props.rowData.paramCode || props.rowData.param_code || "",
      paramType: props.rowData.paramType || props.rowData.param_type || "String",
      paramUnit: props.rowData.paramUnit || props.rowData.param_unit || "",
      defaultValue: props.rowData.defaultValue || props.rowData.default_value || "",
      description: props.rowData.description || "",
      isRequired: props.rowData.isRequired || props.rowData.is_required || 1,
      sortOrder: props.rowData.sortOrder || props.rowData.sort_order || 0,
    });
  }
}

async function handleSubmit() {
  await validate();
  emit("submitted", { ...model });
}

function handleReset() {
  restoreValidation();
  handleUpdateModelWhenEdit();
}

watch(visible, () => {
  if (visible.value) {
    handleUpdateModelWhenEdit();
    restoreValidation();
  }
});
</script>

<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-700px">
    <NForm ref="formRef" :model="model" :rules="rules" size="large" :label-width="100">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-16px">
        <NFormItem label="参数名称" path="paramName">
          <NInput v-model:value="model.paramName" placeholder="请输入参数名称" />
        </NFormItem>
        <NFormItem label="参数代码" path="paramCode">
          <NInput v-model:value="model.paramCode" placeholder="请输入参数代码" />
        </NFormItem>
        <NFormItem label="参数类型" path="paramType">
          <NSelect
            v-model:value="model.paramType"
            :options="paramTypeOptions"
            placeholder="请选择参数类型"
          />
        </NFormItem>
        <NFormItem label="参数单位" path="paramUnit">
          <NInput v-model:value="model.paramUnit" placeholder="请输入参数单位（可选）" />
        </NFormItem>
        <NFormItem label="默认值" path="defaultValue">
          <NInput v-model:value="model.defaultValue" placeholder="请输入默认值（可选）" />
        </NFormItem>
        <NFormItem label="是否必填" path="isRequired">
          <NRadioGroup v-model:value="model.isRequired">
            <NRadio :value="1">必填</NRadio>
            <NRadio :value="0">非必填</NRadio>
          </NRadioGroup>
        </NFormItem>
        <NFormItem label="排序" path="sortOrder" class="md:col-span-1">
          <NInputNumber v-model:value="model.sortOrder" placeholder="请输入排序值" class="w-full" />
        </NFormItem>
      </div>
      <NFormItem label="参数描述" path="description">
        <NInput
          v-model:value="model.description"
          type="textarea"
          placeholder="请输入参数描述（可选）"
          :rows="3"
        />
      </NFormItem>
    </NForm>
    <template #footer>
      <div class="flex-y-center justify-end gap-12px">
        <NButton @click="visible = false">取消</NButton>
        <NButton @click="handleReset">重置</NButton>
        <NButton type="primary" @click="handleSubmit">确认</NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped></style>
