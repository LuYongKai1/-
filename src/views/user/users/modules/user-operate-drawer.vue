<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { fetchBanUser, fetchchatuser, quicklyBanOrUnban, quicklyChatOrUnchat } from "@/service/api/gm";
import { $t } from "@/locales";
import { enableStatusOptions, userGenderOptions } from "@/constants/business";
import { useMessage } from "naive-ui";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "UserOperateDrawer",
});

interface RowDataWithOperationType {
  [key: string]: any;
  operationType?: 'mute' | 'unmute' | 'ban';
  useRoleId?: boolean;
  roleId?: string;
  userId?: string | number;
}

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: RowDataWithOperationType | null;
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
const message = useMessage();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t("page.manage.user.addUser"),
    edit: $t("page.manage.user.editUser"),
  };
  return titles[props.operateType];
});

const chatChannelOptions = [
  { label: '普通', value: '0' },
  { label: '世界', value: '1' },
  { label: '队伍', value: '2' },
  { label: '公会', value: '3' },
  { label: '私聊', value: '7' }
];

interface Model {
  userId: string;
  keepTime: string;
  banReason: string;
  banChatting: string[];
}

const model = ref(createDefaultModel());
const selectedTime = ref<number | null>(null);

function createDefaultModel(): Model {
  return {
    userId: "",
    keepTime: "",
    banReason: "",
    banChatting: [],
  };
}

const rules = {
  userId: defaultRequiredRule,
  banReason: defaultRequiredRule,
  banChatting:defaultRequiredRule,
};

function handleInitModel() {
  model.value = createDefaultModel();
  selectedTime.value = null;

  if (props.operateType === "edit" && props.rowData) {
    Object.assign(model.value, {
      ...props.rowData,
      // 如果使用角色ID，确保 userId 字段使用 roleId 的值
      userId: props.rowData.useRoleId ? (props.rowData.roleId || props.rowData.userId) : props.rowData.userId,
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
    const operationType = props.rowData?.operationType;

    if (operationType !== 'unmute') {
      if (!selectedTime.value) {
        message.error($t('page.manage.gmuser.form.banTime'));
        return;
      }
      if (selectedTime.value <= currentTime) {
        message.error($t('common.banTimeInvalid'));
        return;
      }
    }

    let banDuration = 0;
    if (operationType !== 'unmute' && selectedTime.value) {
       banDuration = Math.floor((selectedTime.value - currentTime) / 1000);
       if (banDuration <= 0) {
         message.error($t('common.banTimeInvalid'));
         return;
       }
    }

    const useRoleId = props.rowData?.useRoleId || false;
    const roleId = props.rowData?.roleId || model.value.userId;

    let response: any;
    const operationTypeText = operationType === 'mute' ? '禁言' : operationType === 'unmute' ? '解除禁言' : '封禁';

    if (operationType === 'mute') {
      if (useRoleId) {
        // 使用角色ID接口（聊天监控场景）
        const chatData = {
          roleId: String(roleId),
          keepTime: banDuration,
          banReason: model.value.banReason,
          action: 'chat',
          banChatting: model.value.banChatting.join(',')
        };
        response = await quicklyChatOrUnchat(chatData);
      } else {
        // 使用用户ID接口（原有逻辑）
        const chatData = {
          userId: model.value.userId,
          keepTime: banDuration,
          banReason: model.value.banReason,
          action: 'chat',
          banChatting: model.value.banChatting.join(',')
        };
        response = await fetchchatuser(chatData as any);
      }
      // 检查API响应是否有错误
      if (handleApiResponseError(response, operationTypeText)) {
        return;
      }
      message.success($t('common.muteSuccess'));
    } else if (operationType === 'unmute') {
      if (useRoleId) {
        // 使用角色ID接口（聊天监控场景）
        const chatData = {
          roleId: String(roleId),
          keepTime: 0,
          banReason: '',
          action: 'unchat',
          banChatting: model.value.banChatting.join(',')
        };
        response = await quicklyChatOrUnchat(chatData);
      } else {
        // 使用用户ID接口（原有逻辑）
        const chatData = {
          userId: model.value.userId,
          keepTime: 0,
          banReason: '',
          action: 'unchat',
          banChatting: model.value.banChatting.join(',')
        };
        response = await fetchchatuser(chatData as any);
      }
      // 检查API响应是否有错误
      if (handleApiResponseError(response, operationTypeText)) {
        return;
      }
      message.success($t('common.unmuteSuccess'));
    } else {
      if (useRoleId) {
        // 使用角色ID接口（聊天监控场景）
        const banData = {
          roleId: String(roleId),
          keepTime: banDuration,
          banReason: model.value.banReason,
          action: 'ban'
        };
        response = await quicklyBanOrUnban(banData);
      } else {
        // 使用用户ID接口（原有逻辑）
        const banData = {
          userId: model.value.userId,
          keepTime: banDuration,
          banReason: model.value.banReason,
          action: 'ban'
        };
        response = await fetchBanUser(banData as any);
      }
      // 检查API响应是否有错误
      if (handleApiResponseError(response, operationTypeText)) {
        return;
      }
      message.success($t('common.banSuccess'));
    }

    closeDrawer();
    emit("submitted");
  } catch (error: any) {
    const operationType = props.rowData?.operationType;
    const operationTypeText = operationType === 'mute' ? '禁言' : operationType === 'unmute' ? '解除禁言' : '封禁';
    handleApiCatchError(error, operationTypeText);
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
            path="userId"
          >
            <NInput
              v-model:value="model.userId"
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

          <NFormItemGi
            v-if="rowData?.operationType !== 'unmute'"
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
