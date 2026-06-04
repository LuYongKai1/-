<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useBoolean } from "@sa/hooks";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { $t } from "@/locales";
import { enableStatusOptions } from "@/constants/business";
import MenuAuthModal from "./menu-auth-modal.vue";
// import ButtonAuthModal from "./button-auth-modal.vue";
import { fetchCreateRole, fetchUpdateRole } from "@/service/api";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "RoleOperateDrawer",
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.Role | null;
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
const { bool: menuAuthVisible, setTrue: openMenuAuthModal, setFalse: closeMenuAuthModal } = useBoolean();
const { bool: buttonAuthVisible, setTrue: openButtonAuthModal } = useBoolean();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t("page.manage.role.addRole"),
    edit: $t("page.manage.role.editRole"),
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.SystemManage.Role,
  "roleName" | "roleCode" | "roleDesc" | "roleKey" | "roleSort" | "remark" | "status"
> & {
  menuIds: number[];
  roleId?: number;
};

const model = ref<Model>({
  roleName: "",
  roleCode: "",
  roleDesc: "",
  roleKey: "",
  roleSort: 1,
  status: null,
  remark: "",
  menuIds: [],
});

function createDefaultModel(): Model {
  return {
    roleName: "",
    roleCode: "",
    roleDesc: "",
    roleKey: "",
    roleSort: 0,
    status: null,
    remark: "",
    menuIds: [],
  };
}

type RuleKey = keyof Model;

const rules: Record<RuleKey, App.Global.FormRule> = {
  roleName: defaultRequiredRule,
  roleCode: defaultRequiredRule,
  roleKey: defaultRequiredRule,
  roleSort: defaultRequiredRule,
  remark: defaultRequiredRule,
  status: defaultRequiredRule,
  // menuIds: defaultRequiredRule,
};

const roleId = computed(() => props.rowData?.roleId || -1);

const isEdit = computed(() => props.operateType === "edit");

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === "edit" && props.rowData) {
    Object.assign(model.value, props.rowData);
    model.value.roleId = props.rowData.roleId;
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  try {
    model.value.menuIds = model.value.menuIds || [];

    let response: any;
    if (props.operateType === "add") {
      response = await fetchCreateRole(model.value);
    } else if (props.operateType === "edit" && props.rowData) {
      model.value.roleId = (props.rowData as any).roleId;
      response = await fetchUpdateRole(model.value);
    }

    // 使用通用错误处理函数检查响应
    const operationType = props.operateType === "add" ? "新增角色" : "修改角色";
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
    const operationType = props.operateType === "add" ? "新增角色" : "修改角色";
    handleApiCatchError(error, operationType);
  }
}

function handleMenuAuthSubmit(menuIds: number[]) {
  // 确保menuIds是数组
  model.value.menuIds = Array.isArray(menuIds) ? [...menuIds] : [];
  closeMenuAuthModal();
}

watch(visible, () => {
  if (visible.value) {
    handleInitModel();
    restoreValidation();
  }
});
</script>

<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-800px">
    <NScrollbar class="h-500px pr-20px">

      <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="100">
        <NGrid responsive="screen" item-responsive>

          <NFormItemGi span="24" :label="$t('page.manage.role.roleName')" path="roleName">
            <NInput v-model:value="model.roleName" :placeholder="$t('page.manage.role.form.roleName')" />
          </NFormItemGi>

          <NFormItemGi span="24" :label="$t('page.manage.role.roleKey')" path="roleKey">
            <NInput v-model:value="model.roleKey" :placeholder="$t('page.manage.role.form.roleKey')" />
          </NFormItemGi>

          <NFormItemGi span="24" :label="$t('page.manage.role.roleDesc')" path="roleDesc">
            <NInput v-model:value="model.remark" :placeholder="$t('page.manage.role.form.roleDesc')" />
          </NFormItemGi>

          <NFormItemGi span="24"  :label="$t('page.manage.role.roleSort')" path="roleSort">
            <NInputNumber style="width: 100%;"  v-model:value="model.roleSort" :placeholder="$t('page.manage.role.form.roleSort')"
            :min="0"
            />
          </NFormItemGi>

          <NFormItemGi span="24" :label="$t('page.manage.role.roleStatus')" path="status">
            <NRadioGroup v-model:value="model.status">
              <NRadio v-for="item in enableStatusOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
            </NRadioGroup>
          </NFormItemGi>

          <NFormItemGi span="24 m:12" :label="$t('page.manage.role.menuAuth')" path="menuIds">
            <NButton @click="openMenuAuthModal">
              {{ $t('page.manage.role.menuAuth') }}
            </NButton>
            <MenuAuthModal
              v-model:visible="menuAuthVisible"
              :roleId="roleId"
              @submit="handleMenuAuthSubmit"
            />
          </NFormItemGi>
        </NGrid>
      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
