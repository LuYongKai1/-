<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { $t } from "@/locales";
import { fetchDisbandGuild } from "@/service/api";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "DisbandGuildModal",
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
  confirmGuildName: string;
};

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    guildGuid: "",
    guildName: "",
    masterCuid: "",
    masterNickname: "",
    confirmGuildName: "",
  };
}

// 自定义验证规则：确认公会名称必须与原公会名称一致
const validateGuildName = (_rule: any, value: string) => {
  if (!value) {
    return new Error($t("page.manage.guildslist.enterGuildName"));
  }
  if (value !== model.value.guildName) {
    return new Error($t("page.manage.guildslist.guildNameMismatch"));
  }
  return true;
};

const rules = computed(() => ({
  confirmGuildName: [
    defaultRequiredRule,
    {
      validator: validateGuildName,
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
    const response: any = await fetchDisbandGuild({
      guildId: model.value.guildGuid,
      serverId: String(props.guildData?.serverId || ''),
    });

    // 使用统一的错误处理函数，如果有错误则返回
    if (handleApiResponseError(response, $t("common.disbandGuild"))) {
      return;
    }

    // 成功后的处理
    window.$message?.success($t("common.disbandGuildSuccess"));
    closeModal();
    emit("success");
  } catch (error: any) {
    // 表单验证错误不显示错误消息
    if (error instanceof Error && error.message.includes("validation")) {
      return;
    }
    // 使用统一的异常处理函数
    handleApiCatchError(error, $t("common.disbandGuild"));
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
  <NModal v-model:show="visible" :title="$t('common.disbandGuild')" preset="card" class="w-500px">
    <NForm
      ref="formRef"
      :model="model"
      :rules="rules"
      label-placement="left"
      :label-width="120"
    >
      <NAlert type="warning" :show-icon="true" class="mb-16px">
        <template #header>
          <span class="font-bold">{{ $t('common.warning') }}</span>
        </template>
        {{ $t('page.manage.guildslist.confirmDisbandWarning') }}
      </NAlert>

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

      <NFormItem :label="$t('page.manage.guildslist.confirmGuildName')" path="confirmGuildName">
        <NInput
          v-model:value="model.confirmGuildName"
          :placeholder="$t('page.manage.guildslist.confirmDisbandPlaceholder')"
          clearable
        />
      </NFormItem>

      <NAlert type="info" :show-icon="false" class="mt-8px">
        <span class="text-12px">{{ $t('page.manage.guildslist.confirmDisbandTip') }} <span class="font-bold text-primary">{{ model.guildName }}</span></span>
      </NAlert>
    </NForm>

    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeModal">{{ $t("common.cancel") }}</NButton>
        <NButton type="error" @click="handleSubmit">{{
          $t("common.confirm")
        }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>

