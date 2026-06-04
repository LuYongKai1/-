<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { $t } from "@/locales";
import { fetchForceRenameGuild } from "@/service/api";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "ForceRenameModal",
});

interface Props {
  /** 公会数据 */
  guildData?: {
    guildGuid: string | number;
    guildName: string;
    masterCuid: string | number;
    masterNickname: string;
    serverId?: string | number;
  } | null;
}

interface Emits {
  (e: "success"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", {
  default: false,
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

type Model = {
  guildGuid: string;
  guildName: string;
  masterCuid: string;
  masterNickname: string;
  newGuildName: string;
};

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    guildGuid: "",
    guildName: "",
    masterCuid: "",
    masterNickname: "",
    newGuildName: "",
  };
}

const rules = computed(() => ({
  newGuildName: [
    defaultRequiredRule,
    {
      min: 2,
      max: 20,
      message: $t("page.manage.guildslist.guildNameLength"),
      trigger: ["input", "blur"],
    },
  ],
}));

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.guildData) {
    Object.assign(model.value, {
      guildGuid: String(props.guildData.guildGuid || ""),
      guildName: props.guildData.guildName || "",
      masterCuid: String(props.guildData.masterCuid || ""),
      masterNickname: props.guildData.masterNickname || "",
    });
  }
}

function closeModal() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  try {
    const response: any = await fetchForceRenameGuild({
      guildId: model.value.guildGuid,
      guildName: model.value.newGuildName,
      serverId: props.guildData?.serverId,
      notice: "",
    });

    // 使用统一的错误处理函数，如果有错误则返回
    if (handleApiResponseError(response, $t("common.forceRename"))) {
      return;
    }

    // 成功后的处理
    window.$message?.success($t("common.forceRenameSuccess"));
    closeModal();
    emit("success");
  } catch (error: any) {
    // 表单验证错误不显示错误消息
    if (error instanceof Error && error.message.includes("validation")) {
      return;
    }
    // 使用统一的异常处理函数
    handleApiCatchError(error, $t("common.forceRename"));
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
      <NFormItem :label="$t('page.manage.guildslist.guildId')">
        <NInput
          v-model:value="model.guildGuid"
          :placeholder="$t('page.manage.guildslist.guildId')"
          disabled
        />
      </NFormItem>

      <NFormItem :label="$t('page.manage.guildslist.guildName')">
        <NInput
          v-model:value="model.guildName"
          :placeholder="$t('page.manage.guildslist.guildName')"
          disabled
        />
      </NFormItem>

      <NFormItem :label="$t('page.manage.guildslist.leadercuid')">
        <NInput
          v-model:value="model.masterCuid"
          :placeholder="$t('page.manage.guildslist.leadercuid')"
          disabled
        />
      </NFormItem>

      <NFormItem :label="$t('page.manage.guildslist.leaderName')">
        <NInput
          v-model:value="model.masterNickname"
          :placeholder="$t('page.manage.guildslist.leaderName')"
          disabled
        />
      </NFormItem>

      <NFormItem :label="$t('page.manage.guildslist.newGuildName')" path="newGuildName">
        <NInput
          v-model:value="model.newGuildName"
          :placeholder="$t('page.manage.guildslist.enterNewGuildName')"
          :maxlength="20"
          show-count
          clearable
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
