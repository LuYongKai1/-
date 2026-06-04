<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { fetchBanrole, fetchchatrole } from "@/service/api/gm";
import { $t } from "@/locales";
import { enableStatusOptions, userGenderOptions } from "@/constants/business";
import { useMessage } from 'naive-ui';

defineOptions({
  name: "UserOperateDrawer",
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.gmrole | null;
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
    add: $t("page.manage.role.addRole"),
    edit: $t("page.manage.role.editRole"),
  };
  return titles[props.operateType];
});

// 修改聊天频道选项
const chatChannelOptions = [
  { label: '普通', value: '0' },
  { label: '世界', value: '1' },
  { label: '队伍', value: '2' },
  { label: '公会', value: '3' },
  { label: '私聊', value: '7' }
];

type Model = Pick<
  Api.SystemManage.gmrole,
  | "roleId"
  | "keepTime"
  | "banReason"
  | "banChatting"
>;

const model = ref(createDefaultModel());
const selectedTime = ref<number | null>(null);

const message = useMessage();

function createDefaultModel(): Model {
  return {
    roleId: "",
    keepTime: "",
    banReason: "",
    banChatting: [],  // 改为数组类型
  };
}

const rules = {
  roleId: defaultRequiredRule,
  banReason: defaultRequiredRule,
  banChatting: defaultRequiredRule,
};

function handleInitModel() {
  model.value = createDefaultModel();
  selectedTime.value = null;

  if (props.operateType === "edit" && props.rowData) {
    Object.assign(model.value, {
      ...props.rowData,
    });
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  try {
    const currentTime = new Date().getTime();

    if (props.rowData?.operationType === 'unmute') {
      const chatData = {
        roleId: model.value.roleId,
        action: 'unchat',
        banChatting: Array.isArray(model.value.banChatting) ? model.value.banChatting.join(',') : model.value.banChatting // 确保是数组再 join
      };
      await fetchchatrole(chatData);
      closeDrawer();
      emit("submitted");
      message.success($t('common.unmuteSuccess'));
      return;
    }




    if (props.rowData?.operationType === 'mute') {

      if (selectedTime.value <= currentTime) {
        message.error($t('common.banTimeInvalid')); // 提示时间无效
        return; // 阻止提交
      }

      const banEndTime = selectedTime.value;
      const banDuration = Math.floor((banEndTime - currentTime) / 1000); // 计算时间差（秒）

      const chatData = {
        roleId: model.value.roleId,
        keepTime: banDuration,
        banReason: model.value.banReason,
        action: 'chat',
        banChatting: Array.isArray(model.value.banChatting) ? model.value.banChatting.join(',') : model.value.banChatting // 确保是数组再 join
      };
      await fetchchatrole(chatData);
      message.success($t('common.muteSuccess'));

    } else if (props.rowData?.operationType === 'ban') { // 默认是封禁角色
      const banData = {
        roleId: model.value.roleId,
        banReason: model.value.banReason,
        action: 'ban'
      };
      await fetchBanrole(banData);
      message.success($t('common.banSuccess'));
    }

    closeDrawer();
    emit("submitted");
  } catch (error) {
     message.error($t('common.error'));
    console.error("Submission error:", error);
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
  <NModal v-model:show="visible" :title="title" preset="card" class="w-500px">
    <NScrollbar class="h-290px pr-30px">
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        :label-width="100"
      >
        <NGrid responsive="screen" item-responsive>
          <NFormItemGi
            span="24"
            :label="$t('page.manage.gmuser.userId')"
            path="roleId"
          >
            <NInput
              v-model:value="model.roleId"
              :placeholder="$t('page.manage.gmuser.form.userId')"
              disabled
            />
          </NFormItemGi>

          <NFormItemGi
            v-if="rowData?.operationType === 'mute' || rowData?.operationType === 'unmute'"
            span="24"
            :label="$t('page.manage.gmuser.chatChannels')"
            path="banChatting"
          >
            <NCheckboxGroup v-model:value="model.banChatting">
              <NSpace>
                <NCheckbox
                  v-for="option in chatChannelOptions"
                  :key="option.value"
                  :value="option.value"
                  :label="option.label"
                />
              </NSpace>
            </NCheckboxGroup>
          </NFormItemGi>

          <!-- 只在非解除禁言时显示时间选择器 -->
          <NFormItemGi
            v-if="rowData?.operationType !== 'unmute' && rowData?.operationType !== 'ban'"
            span="24"
            :label="$t('page.manage.gmuser.banTime')"
          >
            <NDatePicker
              v-model:value="selectedTime"
              type="datetime"
              :placeholder="$t('page.manage.gmuser.form.banTime')"
              style="width: 100%"
            />
          </NFormItemGi>

          <!-- 只在非解除禁言时显示原因输入框 -->
          <NFormItemGi
            v-if="rowData?.operationType !== 'unmute'"
            span="24"
            :label="$t('page.manage.gmuser.banReason')"
            path="banReason"
          >
            <NInput
              v-model:value="model.banReason"
              type="textarea"
              :placeholder="$t('page.manage.gmuser.form.banReason')"
            />
          </NFormItemGi>
        </NGrid>
      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeDrawer">{{ $t("common.cancel") }}</NButton>
        <NButton type="primary" @click="handleSubmit">{{
          $t("common.confirm")
        }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>
<style scoped></style>
