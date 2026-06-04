<script setup lang="ts">
import { ref, watch } from "vue";
import { NModal, NCard, NForm, NFormItem, NInput, NSpace, NButton, NAlert } from "naive-ui";
import { $t } from "@/locales";

defineOptions({
  name: "ShadowLoginModal",
});

interface Props {
  /** 用户数据 */
  userData?: any | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: "confirm", params: { operatorOpenId: string; targetOpenId: string }): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", {
  default: false,
});

const formModel = ref({
  targetOpenId: "",
  operatorOpenId: "",
});

// 监听用户数据变化,回显平台ID
watch(
  () => props.userData,
  (newData) => {
    if (newData) {
      // 使用字符串保持精度,避免大数字丢失精度
      formModel.value.targetOpenId = String(newData.openId || "");
      formModel.value.operatorOpenId = "";
    }
  },
  { immediate: true }
);

// 监听模态框打开状态，每次打开时重新设置表单值
watch(
  () => visible.value,
  (isVisible) => {
    if (isVisible && props.userData) {
      // 模态框打开时，重新设置目标平台ID
      formModel.value.targetOpenId = String(props.userData.openId || "");
      formModel.value.operatorOpenId = "";
    }
  }
);

// 关闭弹框
function handleClose() {
  visible.value = false;
  formModel.value.operatorOpenId = "";
  formModel.value.targetOpenId = "";
}

// 确认登录
function handleConfirm() {
  if (!formModel.value.operatorOpenId.trim()) {
    window.$message?.warning($t('page.manage.gmuser.pleaseInputOperatorOpenId'));
    return;
  }
  if (!formModel.value.targetOpenId.trim()) {
    window.$message?.warning($t('page.manage.gmuser.pleaseSelectUser'));
    return;
  }

  // 验证是否为纯数字格式（使用字符串保持精度）
  if (!/^\d+$/.test(formModel.value.operatorOpenId)) {
    window.$message?.warning($t('page.manage.gmuser.pleaseInputValidOperatorOpenId'));
    return;
  }
  if (!/^\d+$/.test(formModel.value.targetOpenId)) {
    window.$message?.warning($t('page.manage.gmuser.invalidTargetOpenId'));
    return;
  }

  emit("confirm", {
    operatorOpenId: formModel.value.operatorOpenId,
    targetOpenId: formModel.value.targetOpenId,
  });
  handleClose();
}
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="$t('page.manage.gmuser.shadowLogin')"
    class="w-600px"
    :segmented="{
      content: true,
      footer: 'soft',
    }"
  >
    <NAlert type="info" :show-icon="true" class="mb-16px">
      {{ $t('page.manage.gmuser.shadowLoginTip') }}
    </NAlert>

    <NForm :model="formModel" label-placement="left" :label-width="120">
      <NFormItem :label="$t('page.manage.gmuser.targetOpenId')" path="targetOpenId">
        <NInput
          v-model:value="formModel.targetOpenId"
          :placeholder="$t('page.manage.gmuser.targetOpenId')"
          disabled
        />
      </NFormItem>

      <NFormItem :label="$t('page.manage.gmuser.operatorOpenId')" path="operatorOpenId">
        <NInput
          v-model:value="formModel.operatorOpenId"
          :placeholder="$t('page.manage.gmuser.pleaseInputOperatorOpenId')"
        />
      </NFormItem>
    </NForm>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="handleClose">
          {{ $t("common.cancel") }}
        </NButton>
        <NButton type="primary" @click="handleConfirm">
          {{ $t("common.confirm") }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>

