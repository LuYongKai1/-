<script setup lang="ts">
import { computed, ref, watch, h } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { useDialog } from "naive-ui";
import { $t } from "@/locales";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import { fetchSetVIPPoints } from "@/service/api/game-manage";

defineOptions({
  name: "SetPeakPointsModal",
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
const dialog = useDialog();

type Model = {
  openId: string;
  roleId: string;
  roleName: string;
  serverId: string;
  peakPoints: number | null;
};

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    openId: "",
    roleId: "",
    roleName: "",
    serverId: "",
    peakPoints: null,
  };
}

const rules = {
  peakPoints: [
    {
      required: true,
      type: "number",
      message: "请输入巅峰点数",
      trigger: ["blur", "change"]
    }
  ],
};

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.rowData) {
    // 使用字符串保持大数字精度，避免 openId/roleId 超过 Number.MAX_SAFE_INTEGER 丢失精度
    Object.assign(model.value, {
      openId: String(props.rowData.openId ?? ""),
      roleId: String(props.rowData.roleId ?? ""),
      roleName: String(props.rowData.roleName ?? ""),
      serverId: String(props.rowData.serverId ?? ""),
    });
  }
}

function closeModal() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  // 判断是添加还是扣减
  const points = model.value.peakPoints!;
  const isNegative = points < 0;
  const actionText = isNegative ? "扣减" : "添加";
  const displayPoints = isNegative ? Math.abs(points) : points;

  // 二次确认
  dialog.warning({
    title: "确认操作",
    content: () => h('div', [
      '确定要为角色 "',
      h('span', { style: 'font-weight: bold;' }, model.value.roleName),
      '" (ID: ',
      model.value.roleId,
      ') ',
      h('span', { style: 'font-weight: bold; color: ' + (isNegative ? '#d03050' : '#18a058') + ';' }, actionText),
      '巅峰点数 (',
      h('span', { style: 'font-weight: bold; font-size: 16px;' }, displayPoints.toString()),
      ') 吗？'
    ]),
    positiveText: "确认",
    negativeText: "取消",
    onPositiveClick: async () => {
      await executeSubmit();
    }
  });
}

async function executeSubmit() {
  try {
    const response = await fetchSetVIPPoints({
      roleId: model.value.roleId, // 保持字符串传递，避免大整数丢失精度
      serverId: Number(model.value.serverId),
      points: model.value.peakPoints!,
      gameId: 101, // 默认gameId
    });

    // 使用统一的错误处理函数，如果有错误则返回
    if (handleApiResponseError(response, '设置巅峰点数')) {
      return;
    }

    // 成功后的处理
    window.$message?.success("设置巅峰点数成功");
    closeModal();
    emit("submitted");
  } catch (error: any) {
    // 使用统一的异常处理函数
    handleApiCatchError(error, "设置巅峰点数");
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
  <NModal v-model:show="visible" title="设置巅峰点数" preset="card" class="w-500px">
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
        label="服务器ID"
      >
        <NInput
          v-model:value="model.serverId"
          placeholder="服务器ID"
          disabled
        />
      </NFormItem>

      <NFormItem
        label="巅峰点数"
        path="peakPoints"
      >
        <NInputNumber
          v-model:value="model.peakPoints"
          placeholder="请输入巅峰点数（负数为扣减巅峰点数）"
          :step="1"
          :show-button="true"
          class="w-full"
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
