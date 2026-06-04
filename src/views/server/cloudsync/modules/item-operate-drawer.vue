<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick, unref } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import {
  fetchGetChannelList,
  fetchGetServeritemAdd,
  fetchGetServeritemUpdate,
  fetchGetServerGroup,
  fetchgetServerInfo,
  fetchGetSpecList,
} from "@/service/api";
import { $t } from "@/locales";
import {
  serverStatusShowOptions,
  serverVisibleOptions,
  serverRecommendOptions,
  serverNewOptions,
  serverStatusaddaddShowOptions,
} from "@/constants/business";
import { NUl, NCheckboxGroup, NCheckbox, NSpace, NCollapse, NCollapseItem } from "naive-ui";
import type { FormItemRule, FormRules, NDatePicker } from "naive-ui";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

const DEFAULT_GM_PORT = "30108";
const DEFAULT_GM_PATH = "/mirm_api/service/gm";

// 服务器发货地址
const DEFAULT_CALLBACK_PORT = "8864";
const DEFAULT_CALLBACK_PATH = "/mirm_api/service/payment";

defineOptions({
  name: "CrossOperateDrawer",
});

interface ServerGroupItem {
  id: number;
  groupName: string;
}

interface ServerGroupResponseData {
  rows: ServerGroupItem[];
}

interface ServerGroupApiResponse {
  response?: {
    data?: ServerGroupResponseData;
  };
  code?: number;
  message?: string;
  status?: string;
  success?: boolean;
  timestamp?: number;
  type?: string;
}

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.serveritem | null;
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

// Flag to prevent watchers from interfering during initialization
const isInitializing = ref(false);

const validateNumber = (
  _rule: FormItemRule,
  value: string | number
): true | Error => {
  if (!value) return true;
  const strValue = String(value);
  if (!/^\d+$/.test(strValue)) {
    return new Error($t("form.number.invalid"));
  }
  return true;
};

const validateIp = (_rule: FormItemRule, value: string): true | Error => {
  if (!value) return true;
  const ipRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(value)) {
    return new Error($t("form.ip.invalid"));
  }
  return true;
};

const validateHttpUrl = (_rule: FormItemRule, value: string): true | Error => {
  if (!value) return true;
  if (!/^https?:\/\/.+/.test(value)) {
    return new Error($t("form.url.invalid"));
  }
  return true;
};

const rules: FormRules = {
  groupId: [
    {
      required: true,
      message: $t("form.required"),
      type: "number",
      trigger: ["blur", "change"],
    },
  ],
  serverId: [
    {
      required: true,
      message: $t("page.manage.serveritem.form.serverId"),
      trigger: ["input", "blur"],
    },
    { validator: validateNumber, trigger: ["input", "blur"] },
  ],
  serverName: [
    {
      required: true,
      message: $t("form.required"),
      trigger: ["input", "blur"],
    },
  ],
  serverPort: [
    {
      required: true,
      message: $t("page.manage.serveritem.form.serverPort"),
      trigger: ["input", "blur"],
    },
    { validator: validateNumber, trigger: ["input", "blur"] },
  ],
  serverOpenDate: [
    {
      required: true,
      type: "number",
      message: $t("form.required"),
      trigger: ["blur", "change"],
    },
  ],
  serverStatus: [
    {
      required: true,
      message: $t("form.required"),
      trigger: ["blur", "change"],
    },
  ],
  busyUser: [
    {
      required: true,
      message: $t("form.required"),
      trigger: ["input", "blur"],
    },
    { validator: validateNumber, trigger: ["input", "blur"] },
    {
      validator: (_rule: FormItemRule, value: string | number) => {
        if (!value) return true;
        const numValue = Number(value);
        const maxUserValue = Number(model.value.maxUser);
        if (isNaN(numValue) || isNaN(maxUserValue) || maxUserValue === 0)
          return true;
        if (numValue >= maxUserValue) {
          return new Error($t("form.serverUser.busyUserInvalid"));
        }
        return true;
      },
      trigger: ["input", "blur", "change"],
    },
  ],
  fullUser: [
    {
      required: true,
      message: $t("form.required"),
      trigger: ["input", "blur"],
    },
    { validator: validateNumber, trigger: ["input", "blur"] },
    {
      validator: (_rule: FormItemRule, value: string | number) => {
        if (!value) return true;
        const numValue = Number(value);
        const maxUserValue = Number(model.value.maxUser);
        if (isNaN(numValue) || isNaN(maxUserValue) || maxUserValue === 0)
          return true;
        if (numValue >= maxUserValue) {
          return new Error($t("form.serverUser.fullUserInvalid"));
        }
        return true;
      },
      trigger: ["input", "blur", "change"],
    },
  ],
  maxUser: [
    {
      required: true,
      message: $t("form.required"),
      trigger: ["input", "blur", "change"],
    },
    { validator: validateNumber, trigger: ["input", "blur"] },
  ],
};

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t("page.manage.serveritem.addserveritem"),
    edit: $t("page.manage.serveritem.editserveritem"),
  };
  return titles[props.operateType];
});

type EnableStatus = string;

type Model = Omit<
  Api.SystemManage.serveritem,
  | "serverOpenDate"
  | "id"
  | "createTime"
  | "updateTime"
  | "delFlag"
  | "groupId"
  | "status"
  | "serverNew"
  | "serverRecommend"
  | "serverHot"
> & {
  serverOpenDate: number | null;
  groupId: number | null;
  status: EnableStatus | null;
  serverNew: number | null;
  serverNewUI: "0" | "1";
  serverRecommendUI: "0" | "1";
  serverHotUI: "0" | "1";
  noCreateRoleUI: "0" | "1";
  busyUser: string;
  fullUser: string;
  maxUser: string;
  serverType: string;
  specId: number | null; // 添加规格字段
};

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    groupId: null,
    serverId: "",
    serverName: "",
    serverIp: "", // 无默认值
    serverPort: "9000", // 默认端口9000
    intranetIp: "", // 无默认值
    serverOpenDate: Date.now(), // 默认当前时间
    urlCallback: "http://127.0.0.1:8864/mirm_api/service/payment", // 默认值
    urlGm: "http://127.0.0.1:30108/mirm_api/service/gm", // 默认值
    serverVisible: "VISIBLE",
    serverStatus: "0", // 默认正常
    serverNew: null,
    extendParam: "", // 默认值
    status: null,
    createBy: "",
    updateBy: "",
    serverNewUI: "1", // 默认打开新服务器
    serverRecommendUI: "1", // 默认打开推荐服务器
    serverHotUI: "0",
    noCreateRoleUI: "0",
    busyUser: "2000", // 默认2000
    fullUser: "2000", // 默认2000
    maxUser: "5000", // 默认5000
    serverType: "NORMAL",
    specId: null, // 默认无选中规格
  };
}
const serverGroupOptions = ref<CommonType.Option<number>[]>([]);
const specOptions = ref<CommonType.Option<number>[]>([]);
const specList = ref<Api.SystemManage.Spec[]>([]);

async function getServerGroupOptions() {
  try {
    const data: any = await fetchGetServerGroup();
    const rows = data?.response?.data?.rows;
    if (rows && Array.isArray(rows)) {
      serverGroupOptions.value = rows.map((item: ServerGroupItem) => ({
        label: item.groupName,
        value: item.id,
      }));

      // 如果是新增模式且当前没有选择分组，自动选择第一个
      if (props.operateType === 'add' && !model.value.groupId && serverGroupOptions.value.length > 0) {
        model.value.groupId = serverGroupOptions.value[0].value;
      }
    } else {
      console.error("获取服务器组数据格式不正确或为空:", data);
      serverGroupOptions.value = [];
    }
  } catch (err) {
    console.error("获取服务器组列表失败:", err);
    window.$message?.error($t("common.requestFailed"));
  }
}

// 获取规格列表
async function getSpecOptions() {
  try {
    const data: any = await fetchGetSpecList({
      current: 1,
      size: 100, // 获取所有规格
      isEnabled: 1 // 只获取启用的规格
    });

    // 根据实际数据结构获取规格列表
    let rows = [];
    if (data?.response?.data?.data && Array.isArray(data.response.data.data)) {
      rows = data.response.data.data;
    } else if (data?.data && Array.isArray(data.data)) {
      rows = data.data;
    } else if (data?.response?.data?.rows && Array.isArray(data.response.data.rows)) {
      rows = data.response.data.rows;
    }

    if (rows && Array.isArray(rows)) {
      specList.value = rows;
      specOptions.value = rows.map((item: Api.SystemManage.Spec) => ({
        label: `${item.specName} (${item.specCode})`,
        value: item.id,
      }));
    } else {
      console.error("获取规格数据格式不正确或为空:", data);
      specList.value = [];
      specOptions.value = [];
    }
  } catch (err) {
    console.error("获取规格列表失败:", err);
    window.$message?.error($t("common.requestFailed"));
  }
}

function formatTimestamp(timestamp: number | null): string | null {
  if (timestamp === null) {
    return null;
  }
  try {
    return new Date(timestamp).toISOString();
  } catch (e) {
    console.error("Error formatting timestamp:", e);
    return null;
  }
}

function handleInitModel() {
  isInitializing.value = true;
  try {
    model.value = createDefaultModel();
    if (props.operateType === "edit" && props.rowData) {
      const {
        serverOpenDate,
        groupId,
        status,
        serverId,
        serverPort,
        serverNew,
        busyUser,
        fullUser,
        maxUser,
        ...rest
      } = props.rowData;

      let openDateTimestamp: number | null = null;
      if (serverOpenDate && typeof serverOpenDate === "string") {
        try {
          openDateTimestamp = new Date(serverOpenDate).getTime();
        } catch (e) {
          console.error("无法解析开服时间:", serverOpenDate);
        }
      } else if (typeof serverOpenDate === "number") {
        openDateTimestamp = serverOpenDate;
      }

      const backendServerNew =
        serverNew !== undefined && serverNew !== null ? Number(serverNew) : 0;

        model.value = {
          ...model.value,
          ...rest,
          groupId:
            groupId !== undefined && groupId !== null ? Number(groupId) : null,
          serverOpenDate: openDateTimestamp,
          status: status !== undefined ? status : null,
          serverId: serverId !== undefined ? String(serverId) : "",
          serverPort: serverPort !== undefined ? String(serverPort) : "9000",
          serverNew: backendServerNew,
          busyUser:
            busyUser !== undefined && busyUser !== null ? String(busyUser) : "0",
          fullUser:
            fullUser !== undefined && fullUser !== null ? String(fullUser) : "0",
          maxUser:
            maxUser !== undefined && maxUser !== null ? String(maxUser) : "",
          serverType: "NORMAL",
          // 保持默认值，不从后端覆盖
          urlCallback: "http://127.0.0.1:8864/mirm_api/service/payment",
          urlGm: "http://127.0.0.1:30108/mirm_api/service/gm",
          extendParam: "",
          // 从后端数据中获取规格信息，如果没有则为null
          specId: (rest as any).specId !== undefined ? Number((rest as any).specId) : null,
        };

      // 将后端的十进制值拆分为各个开关状态
      model.value.serverNewUI = backendServerNew & 1 ? "1" : "0";
      model.value.serverRecommendUI = backendServerNew & 2 ? "1" : "0";
      model.value.serverHotUI = backendServerNew & 4 ? "1" : "0";
      model.value.noCreateRoleUI = backendServerNew & 8 ? "1" : "0";
    }

    // 删除IP同步逻辑，保持默认值
    // nextTick(() => {
    //   syncGmUrlWithIp();
    // });
  } finally {
    nextTick(() => {
      isInitializing.value = false;
    });
  }
}

// 删除IP同步函数，不再需要
// function syncGmUrlWithIp() {
//   const { serverIp, urlGm, urlCallback } = model.value;
//   if (serverIp && (!urlGm || urlGm.trim() === "")) {
//     model.value.urlGm = `http://${serverIp}:${DEFAULT_GM_PORT}${DEFAULT_GM_PATH}`;
//   }
//   // 只在新增时补全urlCallback，编辑时不处理
//   if (props.operateType === "add" && serverIp && (!urlCallback || urlCallback.trim() === "")) {
//     model.value.urlCallback = `http://${serverIp}:${DEFAULT_CALLBACK_PORT}${DEFAULT_CALLBACK_PATH}`;
//   }
// }

// 删除GM同步功能，不再需要
// const isSyncing = ref(false);
// const syncSuccess = ref(false);

// async function handleGmSync() {
//   // GM同步功能已删除
// }

// 选择规格
function selectSpec(specId: number) {
  model.value.specId = specId;

  // 查找选中的规格模板
  const selectedSpec = specList.value.find(spec => spec.id === specId);

  // 如果找到规格模板，将人数配置赋值到表单
  if (selectedSpec) {
    model.value.maxUser = selectedSpec.maxUser !== undefined && selectedSpec.maxUser !== null
      ? String(selectedSpec.maxUser)
      : model.value.maxUser;
    model.value.busyUser = selectedSpec.busyUser !== undefined && selectedSpec.busyUser !== null
      ? String(selectedSpec.busyUser)
      : model.value.busyUser;
    model.value.fullUser = selectedSpec.fullUser !== undefined && selectedSpec.fullUser !== null
      ? String(selectedSpec.fullUser)
      : model.value.fullUser;
  }
}

function closeDrawer() {
  visible.value = false;
  // 删除同步状态重置
  // syncSuccess.value = false;
}

async function handleSubmit() {
  // 删除同步检查，直接提交
  // if (!syncSuccess.value) {
  //   window.$message?.warning($t("page.manage.serveritem.syncFailedTip2"));
  //   return;
  // }

  await validate();
  try {
    const formattedDate = formatTimestamp(model.value.serverOpenDate);

    // 使用位运算将四个开关状态转为十进制
    let finalServerNew = 0;
    if (model.value.serverNewUI === "1") finalServerNew |= 1;
    if (model.value.serverRecommendUI === "1") finalServerNew |= 2; // 0010
    if (model.value.serverHotUI === "1") finalServerNew |= 4; // 0100
    if (model.value.noCreateRoleUI === "1") finalServerNew |= 8; // 1000

    const {
      serverNewUI,
      serverRecommendUI,
      serverHotUI,
      noCreateRoleUI,
      ...baseModelData
    } = model.value;

    const dataToSend = {
      ...baseModelData,
      serverOpenDate: formattedDate,
      serverNew: finalServerNew,
    };

    let response;
    const operationType = props.operateType === "add" ? "添加" : "修改";

    if (props.operateType === "add") {
      response = await fetchGetServeritemAdd(dataToSend);

      // 检查API响应是否有错误
      if (handleApiResponseError(response, operationType)) {
        return;
      }

      window.$message?.success($t("common.addSuccess"));
    } else {
      if (!props.rowData?.id) {
        window.$message?.error($t("form.serverUser.serverIdRequired"));
        return;
      }
      const updateData = { ...dataToSend, id: props.rowData.id };
      response = await fetchGetServeritemUpdate(updateData);

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

watch(visible, (newVal) => {
  if (newVal) {
    handleInitModel();
    restoreValidation();
    getServerGroupOptions();
    getSpecOptions(); // 获取规格列表
    // 删除同步状态重置
    // syncSuccess.value = false;
    // isSyncing.value = false;
  } else {
  }
});

watch(
  () => props.rowData,
  (newRowData) => {
    if (visible.value && props.operateType === "edit" && newRowData) {
      handleInitModel();
    }
  },
  { deep: true }
);

watch(
  () => model.value.serverHotUI,
  (newVal) => {
    if (isInitializing.value) return;
    if (newVal === "1") {
      model.value.serverRecommendUI = "0";
    }
  }
);

watch(
  () => model.value.serverRecommendUI,
  (newVal) => {
    if (isInitializing.value) return;
    if (newVal === "1") {
      model.value.serverHotUI = "0";
    }
  }
);

watch(
  [
    () => model.value.busyUser,
    () => model.value.fullUser,
    () => model.value.maxUser,
  ],
  ([busyUser, fullUser, maxUser]) => {
    if (isInitializing.value) return;

    if (!formRef.value) return;

    if (busyUser && fullUser && maxUser) {
      nextTick(() => {
        formRef.value?.restoreValidation();
      });
    }

    if (Number(maxUser) > 0) {
      if (Number(busyUser) < Number(maxUser)) {
        formRef.value?.restoreValidation();
      }

      if (Number(fullUser) < Number(maxUser)) {
        formRef.value?.restoreValidation();
      }
    }
  },
  { deep: true }
);

// 删除IP监听器，不再需要
// watch(
//   () => model.value.serverIp,
//   (newIp) => {
//     if (isInitializing.value) return;
//     if (!newIp) return;

//     const ipRegex =
//       /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
//     if (!ipRegex.test(newIp)) return;

//     updateGmUrlWithNewIp(newIp);
//   }
// );

// 删除IP更新函数，不再需要
// function updateGmUrlWithNewIp(newIp: string) {
//   // 已删除，使用默认值
// }
</script>


<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-1100px">
    <NScrollbar class="h-750px pr-20px">
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="top"
      >
        <NCollapse :default-expanded-names="['basic', 'spec']">
          <!-- 基础信息 -->
          <NCollapseItem name="basic">
            <template #header>
              <span class="collapse-title">{{ $t('page.manage.serveritem.basicInfo') }}</span>
            </template>
            <NGrid :cols="2" :x-gap="24" responsive="screen" item-responsive>
              <NFormItemGi
                :label="$t('page.manage.serveritem.serverId')"
                path="serverId"
              >
                <NInput
                  v-model:value="model.serverId"
                  :placeholder="$t('page.manage.serveritem.form.serverId')"
                />
              </NFormItemGi>

              <NFormItemGi
                :label="$t('page.manage.serveritem.serverName')"
                path="serverName"
              >
                <NInput
                  v-model:value="model.serverName"
                  :placeholder="$t('page.manage.serveritem.form.serverName')"
                />
              </NFormItemGi>
            </NGrid>

            <NGrid :cols="1" :x-gap="24">
              <NFormItemGi
                :label="$t('page.manage.serveritem.serverOpenDate')"
                path="serverOpenDate"
              >
                <NDatePicker
                  v-model:value="model.serverOpenDate"
                  type="datetime"
                  clearable
                  :placeholder="$t('page.manage.serveritem.form.serverOpenDate')"
                  style="width: 100%"
                />
              </NFormItemGi>
            </NGrid>

            <NGrid :cols="3" :x-gap="24">
              <NFormItemGi
                :label="$t('page.manage.serveritem.busyUser')"
                path="busyUser"
              >
                <NInputNumber
                  :value="Number(model.busyUser)"
                  @update:value="
                    (val) => (model.busyUser = val !== null ? String(val) : '0')
                  "
                  :placeholder="$t('page.manage.serveritem.form.busyUser')"
                  style="width: 100%"
                  :min="0"
                />
              </NFormItemGi>

              <NFormItemGi
                :label="$t('page.manage.serveritem.fullUser')"
                path="fullUser"
              >
                <NInputNumber
                  :value="Number(model.fullUser)"
                  @update:value="
                    (val) => (model.fullUser = val !== null ? String(val) : '0')
                  "
                  :placeholder="$t('page.manage.serveritem.form.fullUser')"
                  style="width: 100%"
                  :min="0"
                />
              </NFormItemGi>

              <NFormItemGi
                :label="$t('page.manage.serveritem.maxUser')"
                path="maxUser"
              >
                <NInputNumber
                  :value="Number(model.maxUser)"
                  @update:value="
                    (val) => (model.maxUser = val !== null ? String(val) : '')
                  "
                  :placeholder="$t('page.manage.serveritem.form.maxUser')"
                  style="width: 100%"
                  :min="0"
                />
              </NFormItemGi>
            </NGrid>
          </NCollapseItem>

          <!-- 规格模板 -->
          <NCollapseItem name="spec">
            <template #header>
              <span class="collapse-title">{{ $t('page.manage.serveritem.specTemplate') }}</span>
            </template>
            <div class="spec-selection-container">
              <div class="spec-cards-grid">
                <div
                  v-for="spec in specList"
                  :key="spec.id"
                  class="spec-card"
                  :class="{ 'spec-card-selected': model.specId === spec.id }"
                  @click="selectSpec(spec.id)"
                >
                  <div class="spec-card-header">
                    <h4 class="spec-name">{{ spec.specName }}</h4>
                  </div>
                  <div class="spec-card-content">
                    <div class="spec-description">{{ spec.description }}</div>
                    <div class="spec-scene">{{ spec.applicableScene }}</div>
                  </div>
                  <div class="spec-card-footer">
                    <span class="spec-code">{{ $t('page.manage.serveritem.specCode') }}: {{ spec.specCode }}</span>
                  </div>
                </div>
              </div>
              <div v-if="specList.length === 0" class="no-specs">
                {{ $t('page.manage.serveritem.noSpecAvailable') }}
              </div>
            </div>
          </NCollapseItem>

          <!-- 网络配置 -->
          <NCollapseItem name="network">
            <template #header>
              <span class="collapse-title">{{ $t('page.manage.serveritem.networkConfig') }}</span>
            </template>
            <NGrid :cols="2" :x-gap="24">
              <NFormItemGi
                :label="$t('page.manage.serveritem.serverIp')"
                path="serverIp"
              >
                <NInput
                  v-model:value="model.serverIp"
                  :placeholder="$t('page.manage.serveritem.form.serverIp')"
                />
              </NFormItemGi>

              <NFormItemGi
                :label="$t('page.manage.serveritem.serverPort')"
                path="serverPort"
              >
                <NInput
                  v-model:value="model.serverPort"
                  :placeholder="$t('page.manage.serveritem.form.serverPort')"
                />
              </NFormItemGi>
            </NGrid>
          </NCollapseItem>

          <!-- 地址配置 -->
          <NCollapseItem name="address">
            <template #header>
              <span class="collapse-title">{{ $t('page.manage.serveritem.addressConfig') }}</span>
            </template>
            <NGrid :cols="1" :x-gap="24">
              <NFormItemGi
                :label="$t('page.manage.serveritem.urlCallback')"
                path="urlCallback"
              >
                <NInput
                  v-model:value="model.urlCallback"
                  :placeholder="$t('page.manage.serveritem.form.urlCallback')"
                />
              </NFormItemGi>

              <NFormItemGi
                :label="$t('page.manage.serveritem.urlGm')"
                path="urlGm"
              >
                <NInput
                  v-model:value="model.urlGm"
                  :placeholder="$t('page.manage.serveritem.form.urlGm')"
                />
              </NFormItemGi>
            </NGrid>
          </NCollapseItem>

          <!-- 状态选项 -->
          <NCollapseItem name="status">
            <template #header>
              <span class="collapse-title">{{ $t('page.manage.serveritem.statusOptions') }}</span>
            </template>
            <NGrid :cols="4" :x-gap="24">
              <NFormItemGi
                span="1"
                :label="$t('page.manage.serveritem.serverNew')"
                path="serverNewUI"
              >
                <NSwitch
                  v-model:value="model.serverNewUI"
                  :checked-value="'1'"
                  :unchecked-value="'0'"
                />
              </NFormItemGi>

              <NFormItemGi
                span="1"
                :label="$t('page.manage.serveritem.serverRecommend')"
                path="serverRecommendUI"
              >
                <NSwitch
                  v-model:value="model.serverRecommendUI"
                  :checked-value="'1'"
                  :unchecked-value="'0'"
                  :disabled="model.serverHotUI === '1'"
                />
              </NFormItemGi>

              <NFormItemGi
                span="1"
                :label="$t('page.manage.serveritem.serverRecommendNew')"
                path="serverHotUI"
              >
                <NSwitch
                  v-model:value="model.serverHotUI"
                  :checked-value="'1'"
                  :unchecked-value="'0'"
                  :disabled="model.serverRecommendUI === '1'"
                />
              </NFormItemGi>

              <NFormItemGi
                span="1"
                :label="$t('page.manage.serveritem.noCreateRole')"
                path="noCreateRoleUI"
              >
                <NSwitch
                  v-model:value="model.noCreateRoleUI"
                  :checked-value="'1'"
                  :unchecked-value="'0'"
                />
              </NFormItemGi>
            </NGrid>

            <NFormItem
              :label="$t('page.manage.serveritem.serverStatus')"
              path="serverStatus"
            >
              <NRadioGroup v-model:value="model.serverStatus">
                <NSpace>
                  <NRadio
                    v-for="item in serverStatusaddaddShowOptions"
                    :key="item.value"
                    :value="item.value"
                    :label="$t(item.label)"
                  />
                </NSpace>
              </NRadioGroup>
            </NFormItem>

            <NFormItem
              :label="$t('page.manage.serverregion.groupList')"
              path="groupId"
            >
              <NRadioGroup v-model:value="model.groupId">
                <NSpace>
                  <NRadio
                    v-for="item in serverGroupOptions"
                    :key="item.value"
                    :value="item.value"
                  >
                    {{ item.label }}
                  </NRadio>
                </NSpace>
              </NRadioGroup>
            </NFormItem>
          </NCollapseItem>
        </NCollapse>
      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeDrawer">{{ $t("common.cancel") }}</NButton>
        <NButton
          type="primary"
          @click="handleSubmit"
        >
          {{ $t("common.confirm") }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
/* 折叠面板标题加粗 */
.collapse-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--n-text-color);
}

/* 规格选择容器 */
.spec-selection-container {
  width: 100%;
  margin-top: 8px;
}

.spec-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--n-text-color);
}

.spec-cards-grid {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.spec-card {
  border: 2px solid var(--n-border-color);
  border-radius: 6px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--n-card-color);
  position: relative;
  min-width: 200px;
  flex-shrink: 0;
}

.spec-card:hover {
  border-color: var(--n-primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.spec-card-selected {
  border-color: var(--n-primary-color) !important;
  background: var(--n-primary-color-suppl);
  box-shadow: 0 2px 12px rgba(24, 160, 88, 0.2);
}

.spec-card-selected::after {
  content: '✓';
  position: absolute;
  top: 6px;
  right: 6px;
  width: 16px;
  height: 16px;
  background: var(--n-primary-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
}

.spec-card-header {
  margin-bottom: 8px;
}

.spec-name {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--n-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.spec-card-content {
  margin-bottom: 8px;
}

.spec-description {
  color: var(--n-text-color-2);
  font-size: 12px;
  margin-bottom: 4px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.spec-scene {
  color: var(--n-text-color-3);
  font-size: 11px;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.spec-card-footer {
  border-top: 1px solid var(--n-divider-color);
  padding-top: 6px;
}

.spec-code {
  font-size: 10px;
  color: var(--n-text-color-3);
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-specs {
  text-align: center;
  color: var(--n-text-color-3);
  padding: 40px;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .spec-cards-grid {
    flex-wrap: wrap;
  }

  .spec-card {
    min-width: 160px;
  }
}

/* 滚动条样式 */
.spec-cards-grid::-webkit-scrollbar {
  height: 6px;
}

.spec-cards-grid::-webkit-scrollbar-track {
  background: var(--n-scrollbar-track-color);
  border-radius: 3px;
}

.spec-cards-grid::-webkit-scrollbar-thumb {
  background: var(--n-scrollbar-color);
  border-radius: 3px;
}

.spec-cards-grid::-webkit-scrollbar-thumb:hover {
  background: var(--n-scrollbar-color-hover);
}
</style>
