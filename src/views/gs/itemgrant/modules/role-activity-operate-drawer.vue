<script setup lang="ts">
import { ref, watch, computed, nextTick } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { gsRoleTagTypeOptions, gsRoleTagStatusOptions } from "@/constants/business";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import { $t } from "@/locales";
import { useAuthStore } from "@/store/modules/auth";
import { fetchAddGsRoleTag , fetchUpdateGsRoleTag, fetchmultiplerole } from "@/service/api";
import { useThemeStore } from "@/store/modules/theme";

defineOptions({
  name: "RoleActivityOperateDrawer",
});

interface Props {
  /** 操作类型 */
  operateType: NaiveUI.TableOperateType;
  /** 编辑的行数据 */
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
const authStore = useAuthStore();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t("page.manage.gsRole.addrole"),
    edit: $t("page.manage.gsRole.editrole"),
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.SystemManage.gsRoleTag,
  | "roleId"
  | "tagType"
  | "userName"
  | "reason"
  | "status"
  | "operator"
  | "quota"
>;

const model = ref<Model>(createDefaultModel());
const themeStore = useThemeStore();

function useDebounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: number | null = null;
  return function(...args: Parameters<T>) {
    if (timer) {
      window.clearTimeout(timer);
    }
    timer = window.setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
}

interface RoleSearchResult {
  roleId: string;
  roleName: string;
  serverName?: string;
  openId?: string;
  channelId?: string;
  userId?: string;
}

const roleSearchInput = ref<string>("");
const roleSearchResults = ref<RoleSearchResult[]>([]);
const skipNextRoleSearchUpdate = ref<boolean>(false);

function setRoleSearchInput(value: string) {
  skipNextRoleSearchUpdate.value = true;
  roleSearchInput.value = value;
  nextTick(() => {
    skipNextRoleSearchUpdate.value = false;
  });
}

function createDefaultModel(): Model {
  return {
    roleId: "",
    tagType: "1",
    userName: "",
    reason: "",
    status: "1",
    operator: "",
    quota: "",
  };
}


// 表单验证规则
const rules = {
  roleId: defaultRequiredRule,
  tagType: defaultRequiredRule,
  userName: defaultRequiredRule,
  status: defaultRequiredRule,
  quota: [
    {
      required: true,
      message: '请输入额度',
      trigger: ['input', 'blur']
    },
    {
      pattern: /^\d+$/,
      message: '只能输入数字',
      trigger: ['input', 'blur']
    },
    {
      validator: (rule: any, value: string) => {
        if (value && Number(value) > 1000000) {
          return new Error('额度不能超过100万');
        }
        return true;
      },
      trigger: ['input', 'blur']
    }
  ],
};

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === "edit" && props.rowData) {
    Object.assign(model.value, {
      id: props.rowData.id,
      roleId: String(props.rowData.roleId || ""),
      tagType: String(props.rowData.tagType || ""),
      userName: props.rowData.userName || "",
      reason: props.rowData.reason || null,
      status: props.rowData.status !== undefined ? String(props.rowData.status) : "1",
      operator: props.rowData.operator || "",
      quota: props.rowData.quota !== undefined && props.rowData.quota !== null ? String(props.rowData.quota) : "",
    });
  }
  setRoleSearchInput(model.value.roleId ? String(model.value.roleId) : "");
  roleSearchResults.value = [];
}

function closeDrawer() {
  visible.value = false;
  model.value.roleId = "";
  setRoleSearchInput("");
  roleSearchResults.value = [];
}

async function handleRoleSearch(value: string) {
  const keyword = value.trim();

  if (!keyword) {
    roleSearchResults.value = [];
    return;
  }

  try {
    const response = await fetchmultiplerole({ param: keyword, type: "1" });
    const rawData = response?.response?.data;
    if (!rawData) {
      roleSearchResults.value = [];
      return;
    }
    const list = Array.isArray(rawData) ? rawData : [rawData];
    roleSearchResults.value = list
      .map((role: any) => {
        const resolvedRoleId =
          role.roleId ?? role.id ?? role.openId ?? role.userId ?? "";
        if (!resolvedRoleId) return null;
        return {
          roleId: String(resolvedRoleId),
          roleName: role.roleName || role.name || role.channelUid || "",
          serverName: role.serverName || "",
          openId: role.openId || "",
          channelId: role.channelId || "",
          userId: role.userId || "",
        } as RoleSearchResult;
      })
      .filter((item): item is RoleSearchResult => !!item?.roleId);
  } catch (error) {
    console.error("搜索角色失败:", error);
    roleSearchResults.value = [];
  } finally {
  }
}

const debouncedHandleRoleSearch = useDebounce(handleRoleSearch, 400);

watch(roleSearchInput, (value) => {
  if (skipNextRoleSearchUpdate.value) {
    skipNextRoleSearchUpdate.value = false;
    return;
  }

  const trimmed = value.trim();
  model.value.roleId = trimmed;

  if (!trimmed) {
    clearRoleSearch();
    return;
  }

  debouncedHandleRoleSearch(trimmed);
});

function handleSelectRole(role: RoleSearchResult) {
  model.value.roleId = role.roleId;
  setRoleSearchInput(role.roleId);
  roleSearchResults.value = [];
}

function clearRoleSearch() {
  model.value.roleId = "";
  setRoleSearchInput("");
  roleSearchResults.value = [];
}

async function handleSubmit() {
  await validate();

  try {
    const submitData = {
      ...model.value,
      roleId: model.value.roleId, // 保持字符串格式，避免大整数精度丢失
      tagType: Number(model.value.tagType),
      status: model.value.status ? Number(model.value.status) : 1,
      operator: authStore.userInfo.user.userName,
    };

    if (props.operateType === "add") {
      const response = await fetchAddGsRoleTag(submitData);
      if (handleApiResponseError(response, "添加角色标记")) {
        return;
      }
      window.$message?.success($t("common.addSuccess"));
    } else {
      const response = await fetchUpdateGsRoleTag(submitData);
      if (handleApiResponseError(response, "更新角色标记")) {
        return;
      }
      window.$message?.success($t("common.updateSuccess"));
    }

    closeDrawer();
    emit("submitted");
  } catch (error) {
    handleApiCatchError(error, "操作失败");
  }
}

// 监听抽屉显示状态
watch(visible, async (newVal) => {
  if (newVal) {
    restoreValidation();
    handleInitModel();
  } else {
    setRoleSearchInput("");
    roleSearchResults.value = [];
  }
});
</script>

<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-800px">
    <NScrollbar class="h-300px pr-20px">
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        :label-width="120"
      >
        <NGrid responsive="screen" item-responsive>
          <!-- 角色ID -->
          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.gsRole.roleId')"
            path="roleId"
          >
            <div class="relative w-full">
              <NInput
                v-model:value="roleSearchInput"
                clearable
                :disabled="operateType === 'edit'"
                :placeholder="$t('page.manage.gsRole.form.roleId')"
                @clear="clearRoleSearch"
              />
              <div
                v-if="roleSearchInput && (roleSearchResults.length > 0 )"
                class="absolute left-0 right-0 top-full z-50 mt-1 w-full max-h-[260px] overflow-y-auto rounded-md shadow-sm"
                :class="[
                  themeStore.darkMode
                    ? 'bg-[rgb(44,44,50)] border border-[#333]'
                    : 'bg-white border border-[#e5e7eb]'
                ]"
              >
                <div
                  v-for="role in roleSearchResults"
                  :key="role.roleId + role.roleName"
                  class="cursor-pointer px-12px py-10px text-13px transition-colors duration-200 border-b last:border-b-0"
                  :class="[
                    themeStore.darkMode
                      ? 'hover:bg-[rgb(55,55,60)] border-[#333] text-white'
                      : 'hover:bg-[#f3f4f6] border-[#e5e7eb] text-[#1f1f1f]'
                  ]"
                  @click="handleSelectRole(role)"
                >
                  <div class="font-medium">
                    {{ role.roleName || role.roleId }}
                  </div>
                  <div
                    class="mt-4px text-12px"
                    :class="themeStore.darkMode ? 'text-[#aaa]' : 'text-[#666]'"
                  >
                    ID: {{ role.roleId }}
                  </div>
                  <div
                    v-if="role.serverName"
                    class="mt-2px text-12px"
                    :class="themeStore.darkMode ? 'text-[#aaa]' : 'text-[#666]'"
                  >
                    {{ role.serverName }}
                  </div>
                </div>
                <div
                  v-if="!roleSearchResults.length"
                  class="px-12px py-10px text-center text-12px text-[#888]"
                >
                  {{ $t("common.noData") }}
                </div>
              </div>
            </div>
          </NFormItemGi>

          <!-- 标签类型 -->
          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.gsRole.tagType')"
            path="tagType"
          >
            <NSelect
              v-model:value="model.tagType"
              :options="gsRoleTagTypeOptions"
              :placeholder="$t('page.manage.gsRole.form.tagType')"
            />
          </NFormItemGi>

          <!-- 使用者姓名 -->
          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.gsRole.userName')"
            path="userName"
          >
            <NInput
              v-model:value="model.userName"
              :placeholder="$t('page.manage.gsRole.form.userName')"
            />
          </NFormItemGi>

          <!-- 额度 -->
          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.gsRole.quota')"
            path="quota"
          >
            <NInput
              v-model:value="model.quota"
              :placeholder="$t('page.manage.gsRole.form.quota')"
            />
          </NFormItemGi>

          <!-- 状态 -->
          <!-- <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.gsRole.status')"
            path="status"
          >
            <NSelect
              v-model:value="model.status"
              :options="gsRoleTagStatusOptions"
              :placeholder="$t('page.manage.gsRole.form.status')"
            />
          </NFormItemGi> -->

          <!-- 标记原因 -->
          <NFormItemGi
            span="24 "
            :label="$t('page.manage.gsRole.reason')"
            path="reason"
          >
            <NInput
              v-model:value="model.reason"
              type="textarea"
              :placeholder="$t('page.manage.gsRole.form.reason')"
              :rows="4"
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

<style scoped>
/* 自定义样式 */
.n-input--disabled {
  cursor: not-allowed;
}
</style>
