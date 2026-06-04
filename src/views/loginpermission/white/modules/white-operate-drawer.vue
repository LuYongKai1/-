<script setup lang="ts">
import { computed, ref, watch,onMounted } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import {
  fetchAddUserWhiteList,
  fetchUpdateUserWhiteList,
  fetchGetChannelList,
  fetchmultiplerole,
} from "@/service/api";
import { $t } from "@/locales";
import { serverWhiteOptions, userGenderOptions } from "@/constants/business";
import { translateOptions } from "@/utils/common";
import { useThemeStore } from "@/store/modules/theme";

defineOptions({
  name: "WhiteOperateDrawer",
});

function useDebounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: number | null = null;
  return function(...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
}

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.serverwhite | null;
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

// 添加主题状态
const themeStore = useThemeStore();

// 添加表单验证规则
const rules = {
  type: defaultRequiredRule,
  param: [
    {
      required: true,
      message: () => {
        if (model.value.type === "1" || model.value.type === "2" || model.value.type === "3") {
          return "请输入IP地址";
        } else if (model.value.type === "4") {
          return "请输入账号";
        } else {
          return "不能为空";
        }
      },
      trigger: ['input', 'blur']
    },
    {
      validator: (rule: any, value: string) => {
        if ((model.value.type === "1" || model.value.type === "2" || model.value.type === "3") && value) {
          const ipPattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          if (!ipPattern.test(value)) {
            return new Error("请输入有效的IP地址格式");
          }
        }
        return true;
      },
      trigger: ['input', 'blur']
    }
  ],
  description: [
   {
      required: true,
      message: "描述不能为空",
      trigger: ['input', 'blur']
    },
    {
      max: 200,
      message: "描述长度不能超过200个字符",
      trigger: ['input', 'blur']
    }
  ]
};

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t("page.manage.serverwhite.addwhite"),
    edit: $t("page.manage.serverwhite.editwhite"),
  };
  return titles[props.operateType];
});

const translatedWhiteOptions = computed(() => translateOptions(serverWhiteOptions));

type Model = {
  type: string;
  channel: string;
  param: string;
  status: string;
  description: string;
};

const model = ref(createDefaultModel());

const isAccountWhiteList = computed(() => {
  return model.value.type === "0" || model.value.type === "4";
});

const cachedParams = ref<Record<string, string>>({
  '0': '', // 账号白名单
  '1': '',  // IP白名单
  '2': '',  // IP黑名单
  '3': '',  // IP白名单(受限)
  '4': '',  //账号白名单(受限)

});

function createDefaultModel(): Model {
  return {
    type: "0",
    channel: "",
    param: "",
    status: "0",
    description: "",
  };
}

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === "edit" && props.rowData) {
    const {type, ...rest } = props.rowData;
    const typeValue = type !== undefined ? String(type) : "";

    Object.assign(model.value, {
      type: typeValue,
      ...rest,
    });

    if (model.value.param && typeValue) {
      cachedParams.value[typeValue] = model.value.param;
    }
  }
}

function closeDrawer() {
  visible.value = false;
  model.value = createDefaultModel();
  roleSearchValue.value = '';
  roleSearchResults.value = [];
  searchType.value = '1'; // 重置搜索类型为角色搜索
  cachedParams.value = {
    '0': '',
    '1': '',
    '2': '',
    '3': '',
    '4': ''
  };
}


const roleSearchValue = ref('');
const roleSearchResults = ref<{ id: string; name: string; serverId: number; serverName: string; channelId?: string; channelUid?: string; userId?: string }[]>([]);
// 添加搜索类型状态
const searchType = ref<'0' | '1'>('1'); // 0: 账号搜索, 1: 角色搜索

async function handleRoleSearch(value: string) {
  if (!value) {
    roleSearchResults.value = [];
    return;
  }

  try {
    const response = await fetchmultiplerole({
      param: value,
      type: searchType.value, // 传递搜索类型
    });
    if (response?.response?.data) {
      const data = Array.isArray(response.response.data)
        ? response.response.data
        : [response.response.data];
      roleSearchResults.value = data.map((role: any) => ({
        id: String(role.openId || role.id),
        name: role.roleName || role.name || role.channelUid || "未知角色",
        serverId: role.serverId || 1,
        serverName: role.serverName || "",
        channelId: role.channelId || "",
        channelUid: role.channelUid || "",
        userId: role.userId || ""
      }));
    }
  } catch (error) {
    console.error("搜索失败:", error);
    roleSearchResults.value = [];
  }
}

// 添加角色
function addRole(role: { id: string; name: string; serverId: number; serverName: string; channelId?: string; channelUid?: string; userId?: string }) {
  model.value.param = role.id;
  roleSearchResults.value = [];
  // roleSearchValue.value = role.name;
}

const debouncedHandleRoleSearch = useDebounce(handleRoleSearch, 500);

async function handleSubmit() {
  try {
    await validate();
    const Data = {
      ...model.value,
    };

    let response;
    if (props.operateType === "add") {
      response = await fetchAddUserWhiteList(Data);
      if (String(response?.response?.data?.code) === '500') {
        window.$message?.error(response.response.data.msg || '操作失败');
        return;
      }
      window.$message?.success($t("common.addSuccess"));
    } else {
      response = await fetchUpdateUserWhiteList(Data);
      if (String(response?.response?.data?.code) === '500') {
        window.$message?.error(response.response.data.msg || '操作失败');
        return;
      }
      window.$message?.success($t("common.updateSuccess"));
    }

    closeDrawer();
    emit("submitted");
  } catch (error) {
    if (error instanceof Error && error.message.includes('validation')) {
      return;
    }
  }
}

// 当类型改变时处理param值和搜索框
watch(() => model.value.type, (newType, oldType) => {
  if (oldType) {
    cachedParams.value[oldType] = model.value.param;
  }

  model.value.param = '';
  roleSearchValue.value = '';
  roleSearchResults.value = []; // 清空搜索结果

  // 如果有缓存的值，恢复它
  if (cachedParams.value[newType]) {
    model.value.param = cachedParams.value[newType];
  }
});

// 当搜索类型改变时清空搜索结果
watch(() => searchType.value, () => {
  roleSearchValue.value = '';
  roleSearchResults.value = [];
});

watch(visible, () => {
  if (visible.value) {
    handleInitModel();
    restoreValidation();

    // 如果是新增操作，确保所有数据被清空
    if (props.operateType === 'add') {
      model.value = createDefaultModel();
      roleSearchValue.value = '';
      roleSearchResults.value = [];
      searchType.value = '1'; // 重置搜索类型为角色搜索
      cachedParams.value = {
        '0': '',
        '1': '',
        '2': '',
        '3': '',
        '4': ''
      };
    }
  }
});

function paramPlaceholder() {
  return model.value.type === "1" || model.value.type === "2" || model.value.type === "3" || model.value.type === "4" ? "请输入IP地址" : $t('page.manage.serverwhite.form.param');
}
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="360">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">

        <NFormItem :label="$t('page.manage.serverwhite.type')" path="type">
          <NSelect
            v-model:value="model.type"
            :options="translatedWhiteOptions"
            :placeholder="$t('page.manage.serverwhite.form.type')"
            clearable
          />
        </NFormItem>

        <!-- 搜索类型选择按钮 -->
        <NFormItem
          v-if="isAccountWhiteList"
          label="搜索类型"
        >
          <NButtonGroup>
            <NButton
              :type="searchType === '1' ? 'primary' : 'default'"
              @click="searchType = '1'"
            >
              角色搜索
            </NButton>
            <NButton
              :type="searchType === '0' ? 'primary' : 'default'"
              @click="searchType = '0'"
            >
              账号搜索
            </NButton>
          </NButtonGroup>
        </NFormItem>

        <NFormItem
            v-if="isAccountWhiteList"
            span="24 m:12"
            :label="searchType === '1' ? '角色信息' : '账号信息'"
            path="param"
          >
            <NInput
              v-model:value="roleSearchValue"
              :placeholder="searchType === '1' ? '请搜索角色信息' : '请搜索账号信息'"
              @input="debouncedHandleRoleSearch"
              clearable
            />
            <div
              v-show="roleSearchResults.length > 0"
              class="absolute left-0 right-0 top-full mt-1 rounded z-50 max-h-[400px] overflow-y-auto shadow-sm w-full"
              :class="[
                themeStore.darkMode
                  ? 'bg-[rgb(44,44,50)] border border-[#333]'
                  : 'bg-white border border-[#e5e7eb]'
              ]"
            >
              <div
                v-for="role in roleSearchResults"
                :key="role.id + '-' + role.name"
                class="p-3 cursor-pointer border-b last:border-b-0 transition-colors duration-200"
                :class="[
                  themeStore.darkMode
                    ? 'hover:bg-[rgb(55,55,60)] border-[#333]'
                    : 'hover:bg-[#f3f4f6] border-[#e5e7eb]'
                ]"
                @click="addRole(role)"
              >
                <!-- <div class="font-medium text-sm whitespace-normal break-words" :class="themeStore.darkMode ? 'text-white' : 'text-[#1f1f1f]'">{{ role.name }}</div> -->
                <div class="mt-1 space-y-1">
                  <div class="flex items-center justify-between">
                    <div class="text-xs" :class="themeStore.darkMode ? 'text-[#aaa]' : 'text-[#666]'">OpenID: {{ role.id }}</div>
                    <div v-if="role.serverName" class="text-xs font-medium px-2 py-0.5 rounded" :class="themeStore.darkMode ? 'bg-[#333] text-[#ddd]' : 'bg-[#f0f0f0] text-[#666]'">{{ role.serverName }}</div>
                  </div>
                  <!-- 显示渠道信息 -->
                  <div v-if="searchType === '0' && (role.channelId || role.channelUid)" class="flex items-center gap-2 text-xs" :class="themeStore.darkMode ? 'text-[#aaa]' : 'text-[#666]'">
                    <span v-if="role.channelId">渠道ID: {{ role.channelId }}</span>
                    <span v-if="role.channelUid">渠道UID: {{ role.channelUid }}</span>
                  </div>
                </div>
              </div>
            </div>
          </NFormItem>

        <!-- 内容输入框始终显示 -->
        <NFormItem
          :label="$t('page.manage.serverwhite.param')"
          path="param"
        >
          <NInput
            v-model:value="model.param"
            :placeholder="paramPlaceholder()"
            :disabled="isAccountWhiteList"
          />
        </NFormItem>

        <NFormItem :label="$t('page.manage.serverwhite.description')" path="description">
          <NInput
            v-model:value="model.description"
            :placeholder="$t('page.manage.serverwhite.form.description')"
            type="textarea"
            :rows="3"
            :maxlength="200"
            show-count
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
