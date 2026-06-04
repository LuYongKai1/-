<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import {  fetchAddServerGroup, fetchUpdateServerGroup } from "@/service/api";
import { $t } from "@/locales";
import { channelStatusOptions,servergroupStatusOptions,gamePlatformOptions } from "@/constants/business";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "GroupOperateDrawer",
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.servergroup | null;
  /** 当前最大的索引值 */
  maxIndex?: number;
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

// 添加特殊字符校验规则
const specialCharRule = {
  pattern: /^[a-zA-Z0-9\u4e00-\u9fa5]+$/,
  message: $t('form.itemValueInvalid'),
  trigger: ['input', 'blur']
};

// 添加表单验证规则
const rules = {
  groupName: [defaultRequiredRule, specialCharRule],
  groupTag: [defaultRequiredRule, specialCharRule],
  groupTest: defaultRequiredRule,
  groupIndex: defaultRequiredRule
};

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t("page.manage.servergroup.addservergroup"),
    edit: $t("page.manage.servergroup.editservergroup"),
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.SystemManage.servergroup,
  | "gameId"
  | "groupName"
  | "groupTag"
  | "groupTest"
  | "groupIndex"
>;

const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    gameId: "101",
    groupName: "",
    groupTag: "",
    groupTest: "",
    groupIndex: 0,
  };
}

function handleInitModel() {
  if (props.operateType === "edit" && props.rowData) {
    const {groupTest, groupIndex, ...rest } = props.rowData;
    model.value = {
      ...createDefaultModel(),
      ...rest,
      groupTest: groupTest !== undefined ? String(groupTest) : "",
      groupIndex: Number(groupIndex) || 0,
    };
  } else {
    const defaultModel = createDefaultModel();
    const nextIndex = (typeof props.maxIndex === 'number' ? props.maxIndex : 0) + 1;
    model.value = {
      ...defaultModel,
      groupIndex: nextIndex
    };
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  try {
    const Data = {
      ...model.value,
      gameId: "101",
    };

    let response;
    const operationType = props.operateType === "add" ? "添加" : "修改";

    if (props.operateType === "add") {
      response = await fetchAddServerGroup(Data);

      // 检查API响应是否有错误
      if (handleApiResponseError(response, operationType)) {
        return;
      }

      window.$message?.success($t("common.addSuccess"));
    } else {
      response = await fetchUpdateServerGroup(Data);

      // 检查API响应是否有错误
      if (handleApiResponseError(response, operationType)) {
        return;
      }

      window.$message?.success($t("common.updateSuccess"));
    }

    closeDrawer();
    emit("submitted");
  } catch (error) {
    const operationType = props.operateType === "add" ? "添加" : "修改";
    handleApiCatchError(error, operationType);
  }
}

watch(visible, () => {
  if (visible.value) {
    handleInitModel();
    restoreValidation();
    // getRoleOptions();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="360">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules" >

        <NFormItem :label="$t('page.manage.servergroup.groupName')" path="groupName">
          <NInput
            v-model:value="model.groupName"
            :placeholder="$t('page.manage.servergroup.form.groupName')"
          />
        </NFormItem>

        <NFormItem :label="$t('page.manage.servergroup.groupTag')" path="groupTag">
          <NInput
            v-model:value="model.groupTag"
            :placeholder="$t('page.manage.servergroup.form.groupTag')"
          />
        </NFormItem>

        <NFormItem :label="$t('page.manage.servergroup.groupTest')" path="groupTest">
          <NRadioGroup v-model:value="model.groupTest">
            <NRadio
              v-for="item in servergroupStatusOptions"
              :key="item.value"
              :value="item.value"
              :label="$t(item.label)"
            />
          </NRadioGroup>
        </NFormItem>


        <NFormItem
            span="24 m:12"
            :label="$t('page.manage.servergroup.groupIndex')"
            path="gameName"
          >
            <NInputNumber
              v-model:value="model.groupIndex"
              :placeholder="$t('page.manage.servergroup.form.groupIndex')"
              style="width: 500px"
            />
          </NFormItem>


      </NForm>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">{{ $t("common.cancel") }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{
            $t("common.confirm")
          }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
