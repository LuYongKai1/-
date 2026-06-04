<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { fetchGetAllRoles, fetchCreateUser, fetchUpdateUser, fetchGetUserRoleById } from "@/service/api";
import { $t } from "@/locales";
import { enableStatusOptions, userGenderOptions } from "@/constants/business";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "UserOperateDrawer",
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.User | null;
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
    add: $t("page.manage.user.addUser"),
    edit: $t("page.manage.user.editUser"),
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.SystemManage.User,
  | "userName"
  | "sex"
  | "nickName"
  | "phonenumber"
  | "email"
  | "password"
  | "userRoles"
  | "status"
>;

const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    userName: "",
    sex: "",
    nickName: "",
    phonenumber: "",
    email: "",
    password: "",
    userRoles: [],
    status: null,
  };
}
type RuleKey = keyof Model;

const rules = computed(() => {
  return {
    userName: defaultRequiredRule,
    sex: defaultRequiredRule,
    nickName: defaultRequiredRule,
    password: {
      required: props.operateType === 'add',
      trigger: ['input', 'blur'],
      message: props.operateType === 'add' ? $t('form.pwd.required') : ''
    },
    userRoles: defaultRequiredRule,
    status: defaultRequiredRule,
    email: {},
    phonenumber: {}
  } as Record<RuleKey, App.Global.FormRule>;
});

/** the enabled role options */
const roleOptions = ref<CommonType.Option<string>[]>([]);

async function getRoleOptions() {
  const { error, data } = await fetchGetAllRoles();

  if (!error) {
    const options = data.map((item) => ({
      label: item.roleName,
      value: item.roleId,
    }));
    roleOptions.value = options;
  }
}

async function getUserRoles(userId: number) {
  try {
    const { data, error } = await fetchGetUserRoleById(userId);
    if (!error && data) {
      // 确保data.roles存在且是数组
      if (Array.isArray(data.roles)) {
        model.value.userRoles = data.roles.map((role: { roleId: string | number }) => role.roleId);
      } else {
        console.warn("未找到有效的roles数组");
      }
    } else {
      console.warn("获取用户角色失败");
    }
  } catch (error) {
    console.error("获取用户角色失败:", error);
  }
}

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === "edit" && props.rowData) {
    const { sex, ...rest } = props.rowData as any;
    Object.assign(model.value, {
      ...rest,
      sex: sex,
    });

    if (rest.userId) {
      getUserRoles(rest.userId);
    }
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  try {
    // 确保 roleIds 不为 null
    const userData = {
      ...model.value,
      roleIds: model.value.userRoles ?? [],
    } as any;

    if (props.operateType === "edit" && !model.value.password) {
      delete userData.password;
    }

    let response: any;
    if (props.operateType === "add") {
      response = await fetchCreateUser(userData);
    } else {
      response = await fetchUpdateUser(userData);
    }

    // 使用通用错误处理函数检查响应
    const operationType = props.operateType === "add" ? "新增用户" : "修改用户";
    if (handleApiResponseError(response, operationType)) {
      return;
    }

    // 操作成功
    if (props.operateType === "add") {
      window.$message?.success($t("common.addSuccess"));
    } else {
      window.$message?.success($t("common.updateSuccess"));
    }

    closeDrawer();
    emit("submitted");
  } catch (error: any) {
    // 使用通用异常处理函数
    const operationType = props.operateType === "add" ? "新增用户" : "修改用户";
    handleApiCatchError(error, operationType);
  }
}

watch(visible, async () => {
  if (visible.value) {
    await getRoleOptions();
    handleInitModel();
    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="360">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem :label="$t('page.manage.user.userName')" path="userName">
          <NInput
            v-model:value="model.userName"
            :placeholder="$t('page.manage.user.form.userName')"
          />
        </NFormItem>
        <NFormItem :label="$t('page.manage.user.userGender')" path="sex">
          <NRadioGroup v-model:value="model.sex">
            <NRadio
              v-for="item in userGenderOptions"
              :key="item.value"
              :value="item.value"
              :label="$t(item.label)"
            />
          </NRadioGroup>
        </NFormItem>
        <NFormItem :label="$t('page.manage.user.nickName')" path="nickName">
          <NInput
            v-model:value="model.nickName"
            :placeholder="$t('page.manage.user.form.nickName')"
          />
        </NFormItem>
        <NFormItem :label="$t('page.manage.user.userPhone')" path="phonenumber">
          <NInput
            v-model:value="model.phonenumber"
            :placeholder="$t('page.manage.user.form.userPhone')"
          />
        </NFormItem>
        <NFormItem :label="$t('page.manage.user.userEmail')" path="email">
          <NInput
            v-model:value="model.email"
            :placeholder="$t('page.manage.user.form.userEmail')"
          />
        </NFormItem>
        <!-- 密码输入框 - 在添加模式下显示，或在编辑模式下点击显示 -->
        <template v-if="props.operateType === 'add'">
          <NFormItem :label="$t('page.manage.user.passWord')" path="password">
            <NInput
              v-model:value="model.password"
              type="password"
              :placeholder="$t('page.manage.user.form.passWord')"
            />
          </NFormItem>
        </template>
        <template v-else>
          <NFormItem :label="$t('page.manage.user.passWord')" path="password">
            <NInput
              v-model:value="model.password"
              type="password"
              :placeholder="$t('page.manage.user.form.passWord')"
            />
            <template #help>
              <div>{{ $t("page.manage.user.form.passwordHint") || "留空表示不修改密码" }}</div>
            </template>
          </NFormItem>
        </template>

        <NFormItem :label="$t('page.manage.user.userStatus')" path="status">
          <NRadioGroup v-model:value="model.status">
            <NRadio
              v-for="item in enableStatusOptions"
              :key="item.value"
              :value="item.value"
              :label="$t(item.label)"
            />
          </NRadioGroup>

        </NFormItem>
        <NFormItem :label="$t('page.manage.user.userRole')" path="userRoles">
          <NSelect
            v-model:value="model.userRoles"
            multiple
            :options="roleOptions"
            :placeholder="$t('page.manage.user.form.userRole')"
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
