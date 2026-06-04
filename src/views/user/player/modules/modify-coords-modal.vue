<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { fetchChangePlayerMapPosition } from "@/service/api/gm";
import { $t } from "@/locales";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "ModifyCoordsModal",
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
  roleId: string;
  roleName: string;
  mapId: string;
  x: string;
  y: string;
  z: string;
};

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    roleId: "",
    roleName: "",
    mapId: "",
    x: "",
    y: "",
    z: "",
  };
}

const rules = {
  mapId: defaultRequiredRule,
  x: defaultRequiredRule,
  y: defaultRequiredRule,
  z: defaultRequiredRule,
};

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.rowData) {
    Object.assign(model.value, {
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
    const response = await fetchChangePlayerMapPosition({
      roleId: model.value.roleId,
      mapId: model.value.mapId,
      x: model.value.x,
      y: model.value.y,
      z: model.value.z,
    });

    // 使用统一的错误处理函数，如果有错误则返回
    if (handleApiResponseError(response, '修改坐标')) {
      return;
    }

    // 成功后的处理
    window.$message?.success($t('common.modifyCoordsSuccess'));
    closeModal();
    emit("submitted");
  } catch (error: any) {
    // 表单验证错误不显示错误消息
    if (error instanceof Error && error.message.includes("validation")) {
      return;
    }
    // 使用统一的异常处理函数
    handleApiCatchError(error, '修改坐标');
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
  <NModal v-model:show="visible" :title="$t('common.modifyCoords')" preset="card" class="w-500px">
    <NForm
      ref="formRef"
      :model="model"
      :rules="rules"
      label-placement="left"
      :label-width="100"
    >
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
        :label="$t('page.manage.gmrole.mapId')"
        path="mapId"
      >
        <NInput
          v-model:value="model.mapId"
          :placeholder="$t('page.manage.gmrole.form.mapId')"
        />
      </NFormItem>

      <NFormItem
        :label="$t('page.manage.gmrole.coordX')"
        path="x"
      >
        <NInput
          v-model:value="model.x"
          :placeholder="$t('page.manage.gmrole.form.coordX')"
        />
      </NFormItem>

      <NFormItem
        :label="$t('page.manage.gmrole.coordY')"
        path="y"
      >
        <NInput
          v-model:value="model.y"
          :placeholder="$t('page.manage.gmrole.form.coordY')"
        />
      </NFormItem>

      <NFormItem
        :label="$t('page.manage.gmrole.coordZ')"
        path="z"
      >
        <NInput
          v-model:value="model.z"
          :placeholder="$t('page.manage.gmrole.form.coordZ')"
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
