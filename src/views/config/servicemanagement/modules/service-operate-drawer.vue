<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { $t } from "@/locales";
import { fetchAddService, fetchUpdateService } from "@/service/api/game-manage";
import { serviceStatusOptions } from "@/constants/business";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "ServiceOperateDrawer",
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: any | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: "submitted"): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", {
  default: false,
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: "添加服务",
    edit: "编辑服务",
  };
  return titles[props.operateType];
});


type Model = {
  typeCode: string;
  typeName: string;
  description: string;
  isEnabled: number | null;
  sortOrder: number | null;
  // 动态参数字段
  [key: string]: any;
};

const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    typeCode: "",
    typeName: "",
    description: "",
    isEnabled: 1,
    sortOrder: 1,
  };
}


// 验证规则
const rules = computed(() => {
  return {
    typeCode: defaultRequiredRule,
    typeName: defaultRequiredRule,
    description: defaultRequiredRule,
    isEnabled: defaultRequiredRule,
    sortOrder: defaultRequiredRule,
  };
});


function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === "edit" && props.rowData) {
    Object.assign(model.value, props.rowData);
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  try {
    if (props.operateType === "add") {
      const response = await fetchAddService(model.value);
      if (handleApiResponseError(response, "添加服务")) {
        return;
      }
      window.$message?.success("添加成功");
    } else {
      const response = await fetchUpdateService(model.value);
      if (handleApiResponseError(response, "更新服务")) {
        return;
      }
      window.$message?.success("更新成功");
    }

    closeDrawer();
    emit("submitted");
  } catch (error: any) {
    handleApiCatchError(error, "操作失败");
  }
}


watch(visible, () => {
  if (visible.value) {
    handleInitModel();
    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="480">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" label-width="100">
        <NFormItem label="类型代码" path="typeCode">
          <NInput
            v-model:value="model.typeCode"
            placeholder="如: center, gate"
            :disabled="props.operateType === 'edit'"
          />
          <template #feedback>
            <span class="text-12px text-gray-400">唯一标识，仅支持小写字母和下划线</span>
          </template>
        </NFormItem>

        <NFormItem label="类型名称" path="typeName">
          <NInput
            v-model:value="model.typeName"
            placeholder="如: Center服务"
          />
        </NFormItem>

        <NFormItem label="服务描述" path="description">
          <NInput
            v-model:value="model.description"
            type="textarea"
            placeholder="请输入服务类型说明"
            :rows="3"
          />
        </NFormItem>

        <NFormItem label="排序" path="sortOrder">
          <NInputNumber
            v-model:value="model.sortOrder"
            placeholder="请输入排序值"
            :min="1"
            style="width: 100%"
          />
        </NFormItem>

        <NFormItem label="服务状态" path="isEnabled">
          <NRadioGroup v-model:value="model.isEnabled">
            <NRadio
              v-for="item in serviceStatusOptions"
              :key="item.value"
              :value="Number(item.value)"
            >
              {{ $t(item.label) }}
            </NRadio>
          </NRadioGroup>
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">取消</NButton>
          <NButton type="primary" @click="handleSubmit">确认</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
