<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { fetchForceRename } from "@/service/api/gm";
import { $t } from "@/locales";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "ForceRenameModal",
});

interface Props {
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

type Model = {
  openId: string;
  roleId: string;
  roleName: string;
  renameReason: string;
};

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    openId: "",
    roleId: "",
    roleName: "",
    renameReason: "",
  };
}

const rules = {
  renameReason: defaultRequiredRule,
};

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.rowData) {
    Object.assign(model.value, {
      openId: props.rowData.openId || "",
      roleId: String(props.rowData.roleId || ""),
      roleName: props.rowData.roleName || "",
    });
  }
}

function closeModal() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  try {
    const response = await fetchForceRename({
      roleId: model.value.roleId,
      renameReason: model.value.renameReason,
    });

    // 使用统一的错误处理函数，如果有错误则返回
    if (handleApiResponseError(response, '强制改名')) {
      return;
    }

    // 成功后的处理
    window.$message?.success($t('common.forceRenameSuccess'));
    closeModal();
    emit("submitted");
  } catch (error: any) {
    // 表单验证错误不显示错误消息
    if (error instanceof Error && error.message.includes("validation")) {
      return;
    }
    // 使用统一的异常处理函数
    handleApiCatchError(error, '强制改名');
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
  <NModal v-model:show="visible" :title="$t('common.forceRename')" preset="card" class="w-500px">
    <NForm
      ref="formRef"
      :model="model"
      :rules="rules"
      label-placement="left"
      :label-width="100"
    >
      <NFormItem
        :label="$t('page.manage.gmrole.openId')"
      >
        <NInput
          v-model:value="model.openId"
          :placeholder="$t('page.manage.gmrole.openId')"
          disabled
        />
      </NFormItem>

      <NFormItem
        :label="$t('page.manage.gmrole.roleId')"
      >
        <NInput
          v-model:value="model.roleId"
          :placeholder="$t('page.manage.gmrole.roleId')"
          disabled
        />
      </NFormItem>

      <NFormItem
        :label="$t('page.manage.gmrole.roleName')"
      >
        <NInput
          v-model:value="model.roleName"
          :placeholder="$t('page.manage.gmrole.roleName')"
          disabled
        />
      </NFormItem>

      <NFormItem
        :label="$t('page.manage.gmrole.renameReason')"
        path="renameReason"
      >
        <NInput
          v-model:value="model.renameReason"
          type="textarea"
          :placeholder="$t('page.manage.gmrole.form.renameReason')"
          :rows="3"
        />
      </NFormItem>
    </NForm>

    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeModal">{{ $t("common.cancel") }}</NButton>
        <NButton type="primary" @click="handleSubmit">{{
          $t("common.confirm")
        }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>

