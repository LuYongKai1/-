<script setup lang="ts">
import { ref, watch, computed, nextTick } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import { $t } from "@/locales";
import { useAuthStore } from "@/store/modules/auth";
import { useAuth } from "@/hooks/business/auth";
import { fetchAddGsQuotaTask, fetchEditGsQuotaTask, fetchmultiplerole, fetchImportGsQuotaTask, fetchDownloadGsQuotaTaskTemplate } from "@/service/api";
import { useThemeStore } from "@/store/modules/theme";
import { NDatePicker, NRadioGroup, NRadio, NSpace, NTabs, NTabPane, NButton, NAlert, useMessage } from "naive-ui";
import { gsQuotaCycleTypeOptions, gsQuotaSendModeOptions } from "@/constants/business";

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
const { hasAuth } = useAuth();
const message = useMessage();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t("page.manage.gsQuota.addTask"),
    edit: $t("page.manage.gsQuota.editTask"),
  };
  return titles[props.operateType];
});

// 新增模式下的选项卡：single-单个新增, import-批量导入
const addMode = ref<"single" | "import">("single");

// 导入相关状态
const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const importing = ref(false);

// 常量定义
const ALLOWED_FILE_TYPES = [".xlsx", ".xls"] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type Model = {
  roleId: string;
  amount: string;
  cycleType: string;
  startTime: string;
  status: string;
  remark: string;
  operator: string;
};

const model = ref<Model>(createDefaultModel());
const themeStore = useThemeStore();

// 发送模式：immediate-立即发送, scheduled-定时循环发送
const sendMode = ref<"immediate" | "scheduled">("immediate");
const startTimeTimestamp = ref<number | null>(null);

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

/**
 * 将时间戳转换为本地时间格式 (yyyy-MM-ddTHH:mm:ss)
 */
function formatLocalDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
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
    amount: "",
    cycleType: "DAILY",
    startTime: "",
    status: "1",
    remark: "",
    operator: "",
  };
}

// 周期类型选项
const cycleTypeOptions = computed(() => gsQuotaCycleTypeOptions);

// 发送模式选项
const sendModeOptions = computed(() => gsQuotaSendModeOptions);


// 表单验证规则
const rules = computed(() => {
  const baseRules: any = {
    roleId: defaultRequiredRule,
    amount: [
      {
        required: true,
        message: $t("page.manage.gsQuota.form.amountRequired"),
        trigger: ['input', 'blur']
      },
      {
        pattern: /^\d+$/,
        message: $t("page.manage.gsQuota.form.amountNumberOnly"),
        trigger: ['input', 'blur']
      },
      {
        validator: (rule: any, value: string) => {
          if (value && Number(value) > 1000000) {
            return new Error($t("page.manage.gsQuota.form.amountMaxLimit"));
          }
          return true;
        },
        trigger: ['input', 'blur']
      }
    ],
    cycleType: defaultRequiredRule,
  };

  // 如果是定时发送，则添加开始时间验证
  if (sendMode.value === "scheduled") {
    baseRules.startTime = defaultRequiredRule;
  }

  return baseRules;
});

function handleInitModel() {
  model.value = createDefaultModel();
  sendMode.value = "immediate";
  startTimeTimestamp.value = null;

  if (props.operateType === "edit" && props.rowData) {
    // 回显时间
    if (props.rowData.startTime) {
      const startTimeDate = new Date(props.rowData.startTime);
      if (!isNaN(startTimeDate.getTime())) {
        sendMode.value = "scheduled";
        startTimeTimestamp.value = startTimeDate.getTime();
        model.value.startTime = formatLocalDateTime(startTimeDate.getTime());
      }
    }

    Object.assign(model.value, {
      id: props.rowData.id,
      roleId: String(props.rowData.roleId || ""),
      amount: props.rowData.amount !== undefined && props.rowData.amount !== null ? String(props.rowData.amount) : "",
      cycleType: props.rowData.cycleType || "DAILY",
      status: props.rowData.status !== undefined ? String(props.rowData.status) : "1",
      remark: props.rowData.remark || "",
      operator: props.rowData.operator || "",
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
  addMode.value = "single";
  selectedFile.value = null;
  importing.value = false;
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
    // 根据发送模式设置开始时间
    let startTime: string;
    if (sendMode.value === "immediate") {
      // 立即发送，使用当前时间的本地时间格式
      startTime = formatLocalDateTime(Date.now());
    } else {
      // 定时发送，使用选择的时间
      if (!startTimeTimestamp.value) {
        window.$message?.error($t("page.manage.gsQuota.messages.pleaseSelectStartTime"));
        return;
      }
      startTime = formatLocalDateTime(startTimeTimestamp.value);
    }

    const submitData: any = {
      roleId: model.value.roleId, // 保持字符串格式，避免大整数精度丢失
      amount: Number(model.value.amount),
      cycleType: model.value.cycleType,
      startTime: startTime,
      remark: model.value.remark || "",
      operator: authStore.userInfo.user.userName,
    };

    if (props.operateType === "add") {
      // 新增时不传递 status 字段
      const response = await fetchAddGsQuotaTask(submitData);
      if (handleApiResponseError(response, "新增额度发放任务")) {
        return;
      }
      window.$message?.success($t("common.addSuccess"));
    } else {
      // 编辑时不传递 status 字段
      submitData.id = props.rowData?.id;
      const response = await fetchEditGsQuotaTask(submitData);
      if (handleApiResponseError(response, "编辑额度发放任务")) {
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

// 监听发送模式变化
watch(sendMode, (newMode) => {
  if (newMode === "immediate") {
    // 切换到立即发送时，清除时间选择
    startTimeTimestamp.value = null;
    model.value.startTime = "";
  }
});

// 监听时间戳变化，同步到 model.startTime
watch(startTimeTimestamp, (newValue) => {
  if (newValue) {
    // 将时间戳转换为本地时间格式 (yyyy-MM-ddTHH:mm:ss)
    model.value.startTime = formatLocalDateTime(newValue);
  } else {
    model.value.startTime = "";
  }
});

/**
 * 获取文件扩展名
 */
function getFileExtension(fileName: string): string {
  return fileName.toLowerCase().substring(fileName.lastIndexOf("."));
}

/**
 * 验证文件类型
 */
function validateFileType(file: File): boolean {
  const extension = getFileExtension(file.name);
  if (!ALLOWED_FILE_TYPES.includes(extension as any)) {
    message.error($t("page.manage.gsQuota.messages.invalidFileType"));
    return false;
  }
  return true;
}

/**
 * 验证文件大小
 */
function validateFileSize(file: File): boolean {
  if (file.size > MAX_FILE_SIZE) {
    message.error($t("page.manage.gsQuota.messages.fileSizeExceeded"));
    return false;
  }
  return true;
}

/**
 * 选择文件
 */
function selectFile() {
  fileInputRef.value?.click();
}

/**
 * 处理文件选择
 */
function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) {
    return;
  }

  // 验证文件类型
  if (!validateFileType(file)) {
    target.value = "";
    return;
  }

  // 验证文件大小
  if (!validateFileSize(file)) {
    target.value = "";
    return;
  }

  selectedFile.value = file;
  message.success($t("page.manage.gsQuota.messages.fileSelected", { name: file.name }));
  target.value = "";
}

/**
 * 下载base64错误文件
 */
function downloadErrorFile(base64Data: string) {
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/vnd.ms-excel" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `错误数据_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("下载错误文件失败:", error);
    message.error($t("common.downloadFailed"));
  }
}

/**
 * 从错误响应中提取错误文件并下载
 */
function handleErrorFile(response: any) {
  const errorFileBase64 = response?.response?.data?.errorFileBase64;
  if (errorFileBase64) {
    downloadErrorFile(errorFileBase64);
  }
}

/**
 * 下载模板
 */
async function downloadTemplate() {
  message.info($t("page.manage.gsQuota.messages.downloadingTemplate"));

  try {
    const response = await fetchDownloadGsQuotaTaskTemplate();

    // 使用通用错误处理函数检查响应
    if (handleApiResponseError(response, "下载模板")) {
      return;
    }

    // 检查响应数据是否存在
    if (!response.data) {
      message.error($t("page.manage.gsQuota.messages.templateDataEmpty"));
      return;
    }

    // 创建 Blob 对象和下载链接
    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "额度发放任务导入模板.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    message.success($t("common.downloadSuccess"));
  } catch (error: any) {
    handleApiCatchError(error, "下载模板");
  }
}

/**
 * 验证导入条件
 */
function validateImport(): boolean {
  if (!selectedFile.value) {
    message.warning($t("common.pleaseSelectFile"));
    return false;
  }

  if (sendMode.value === "scheduled" && !startTimeTimestamp.value) {
    message.error($t("page.manage.gsQuota.messages.pleaseSelectStartTime"));
    return false;
  }

  return true;
}

/**
 * 确认导入
 */
async function handleImport() {
  if (!validateImport()) {
    return;
  }

  importing.value = true;

  try {
    const file = selectedFile.value;
    if (!file) {
      importing.value = false;
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    // 构建请求参数，使用表单中的所有参数
    const params: {
      sendType: number;
      startTime?: string;
      cycleType?: string;
      remark?: string;
      amount?: string;
    } = {
      sendType: sendMode.value === "immediate" ? 1 : 2,
      cycleType: model.value.cycleType || "DAILY",
      remark: model.value.remark || "",
    };

    // 如果填写了发放金额/额度，添加该参数
    if (model.value.amount && model.value.amount.trim()) {
      params.amount = model.value.amount.trim();
    }

    // 如果是定时发送，添加开始时间
    if (sendMode.value === "scheduled" && startTimeTimestamp.value) {
      // 将时间戳转换为 LocalDateTime 格式 (yyyy-MM-ddTHH:mm:ss)
      const date = new Date(startTimeTimestamp.value);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      params.startTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }

    const response = await fetchImportGsQuotaTask(formData, params);

    if (handleApiResponseError(response, "导入额度发放任务")) {
      handleErrorFile(response);
      return;
    }

    message.success($t("common.importSuccess"));
    closeDrawer();
    emit("submitted");
  } catch (error: any) {
    handleErrorFile(error);
    handleApiCatchError(error, "导入额度发放任务");
  } finally {
    importing.value = false;
  }
}

// 监听抽屉显示状态
watch(visible, async (newVal) => {
  if (newVal) {
    restoreValidation();
    handleInitModel();
    if (props.operateType === "add") {
      addMode.value = "single";
    }
  } else {
    setRoleSearchInput("");
    roleSearchResults.value = [];
    selectedFile.value = null;
    importing.value = false;
  }
});
</script>

<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-900px">
    <!-- 新增模式下显示选项卡 -->
    <NTabs v-if="operateType === 'add'" v-model:value="addMode" type="line">
      <NTabPane name="single" :tab="$t('page.manage.gsQuota.singleAdd')">
        <NScrollbar class="h-400px pr-20px">
          <NForm
            ref="formRef"
            :model="model"
            :rules="rules"
            label-placement="left"
            :label-width="120"
          >
            <NGrid responsive="screen" item-responsive>
          <!-- 基础信息区域 -->
          <!-- 角色ID -->
          <NFormItemGi
            span="24"
            :label="$t('page.manage.gsQuota.roleId')"
            path="roleId"
          >
            <div class="relative w-full">
                <NInput
                  v-model:value="roleSearchInput"
                  clearable
                  :placeholder="$t('page.manage.gsQuota.form.roleId')"
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

          <!-- 发放金额/额度 -->
          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.gsQuota.amount')"
            path="amount"
          >
            <NInput
              v-model:value="model.amount"
              :placeholder="$t('page.manage.gsQuota.form.amount')"
            />
          </NFormItemGi>

          <!-- 周期类型 -->
          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.gsQuota.cycleType')"
            path="cycleType"
          >
            <NSelect
              v-model:value="model.cycleType"
              :options="cycleTypeOptions"
              :placeholder="$t('page.manage.gsQuota.form.cycleType')"
            />
          </NFormItemGi>

          <!-- 发送时间设置区域 -->
          <!-- 首次发送时间设置 -->
          <NFormItemGi
            span="24"
            :label="$t('page.manage.gsQuota.firstSendTime')"
          >
            <NRadioGroup v-model:value="sendMode">
              <NSpace>
                <NRadio
                  v-for="item in sendModeOptions"
                  :key="item.value"
                  :value="item.value"
                  :label="item.label"
                />
              </NSpace>
            </NRadioGroup>
          </NFormItemGi>

          <!-- 首次开始时间（仅在定时发送时显示） -->
          <NFormItemGi
            v-if="sendMode === 'scheduled'"
            span="24 m:12"
            :label="$t('page.manage.gsQuota.startTime')"
            path="startTime"
          >
            <NDatePicker
              v-model:value="startTimeTimestamp"
              type="datetime"
              :placeholder="$t('page.manage.gsQuota.form.startTime')"
              clearable
              format="yyyy-MM-dd HH:mm:ss"
              style="width: 100%"
            />
          </NFormItemGi>

          <!-- 任务备注 -->
          <NFormItemGi
            span="24"
            :label="$t('page.manage.gsQuota.taskRemark')"
            path="remark"
          >
            <NInput
              v-model:value="model.remark"
              type="textarea"
              :placeholder="$t('page.manage.gsQuota.form.remark')"
              :rows="3"
            />
          </NFormItemGi>
            </NGrid>
          </NForm>
        </NScrollbar>
      </NTabPane>

      <NTabPane v-if="hasAuth('operate:gsGrantTask:import')" name="import" :tab="$t('page.manage.gsQuota.batchImport')">
        <NScrollbar class="h-400px pr-20px">
          <!-- 隐藏的文件输入元素 -->
          <input
            ref="fileInputRef"
            type="file"
            accept=".xlsx,.xls"
            style="display: none"
            @change="handleFileChange"
          />

          <div class="space-y-4">
            <!-- 提示信息 -->
            <NAlert type="info" :show-icon="false">
              <span>
                {{ $t('page.manage.gsQuota.import.tip') }}
              </span>
            </NAlert>

            <!-- 文件选择 -->
            <div class="flex gap-4 items-center flex-wrap">
              <NButton type="primary" :disabled="importing" @click="selectFile">
                {{ $t('page.manage.gsQuota.import.selectFile') }}
              </NButton>
              <NButton type="info" :disabled="importing" @click="downloadTemplate">
                {{ $t('page.manage.gsQuota.import.downloadTemplate') }}
              </NButton>
              <div v-if="selectedFile" class="text-sm text-gray-600 flex items-center">
                {{ $t('page.manage.gsQuota.import.selectedFile') }}{{ selectedFile.name }}
              </div>
            </div>

            <!-- 使用表单中的参数设置 -->
            <NForm
              :model="model"
              label-placement="left"
              :label-width="120"
            >
              <NGrid responsive="screen" item-responsive>
                <!-- 发放金额/额度 -->
                <!-- <NFormItemGi
                  span="24 m:12"
                  :label="$t('page.manage.gsQuota.amount')"
                >
                  <NInput
                    v-model:value="model.amount"
                    :placeholder="$t('page.manage.gsQuota.form.amountOptional')"
                  />
                </NFormItemGi> -->

                <!-- 周期类型 -->
                <NFormItemGi
                  span="24 m:12"
                  :label="$t('page.manage.gsQuota.cycleType')"
                >
                  <NSelect
                    v-model:value="model.cycleType"
                    :options="cycleTypeOptions"
                    :placeholder="$t('page.manage.gsQuota.form.cycleType')"
                  />
                </NFormItemGi>

                <!-- 发送时间设置区域 -->
                <!-- 首次发送时间设置 -->
                <NFormItemGi
                  span="24"
                  :label="$t('page.manage.gsQuota.firstSendTime')"
                >
                  <NRadioGroup v-model:value="sendMode">
                    <NSpace>
                      <NRadio
                        v-for="item in sendModeOptions"
                        :key="item.value"
                        :value="item.value"
                        :label="item.label"
                      />
                    </NSpace>
                  </NRadioGroup>
                </NFormItemGi>

                <!-- 首次开始时间（仅在定时发送时显示） -->
                <NFormItemGi
                  v-if="sendMode === 'scheduled'"
                  span="24 m:12"
                  :label="$t('page.manage.gsQuota.startTime')"
                >
                  <NDatePicker
                    v-model:value="startTimeTimestamp"
                    type="datetime"
                    :placeholder="$t('page.manage.gsQuota.form.startTime')"
                    clearable
                    format="yyyy-MM-dd HH:mm:ss"
                    style="width: 100%"
                  />
                </NFormItemGi>

                <!-- 任务备注 -->
                <NFormItemGi
                  span="24"
                  :label="$t('page.manage.gsQuota.taskRemark')"
                >
                  <NInput
                    v-model:value="model.remark"
                    type="textarea"
                    :placeholder="$t('page.manage.gsQuota.form.remark')"
                    :rows="3"
                  />
                </NFormItemGi>
              </NGrid>
            </NForm>
          </div>
        </NScrollbar>
      </NTabPane>
    </NTabs>

    <!-- 编辑模式显示表单 -->
    <template v-else>
      <NScrollbar class="h-400px pr-20px">
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
              span="24"
              :label="$t('page.manage.gsQuota.roleId')"
              path="roleId"
            >
              <div class="relative w-full">
                <NInput
                  v-model:value="roleSearchInput"
                  disabled
                  :placeholder="$t('page.manage.gsQuota.form.roleId')"
                />
              </div>
            </NFormItemGi>

            <!-- 发放金额/额度 -->
            <NFormItemGi
              span="24 m:12"
              :label="$t('page.manage.gsQuota.amount')"
              path="amount"
            >
              <NInput
                v-model:value="model.amount"
                :placeholder="$t('page.manage.gsQuota.form.amount')"
              />
            </NFormItemGi>

            <!-- 周期类型 -->
            <NFormItemGi
              span="24 m:12"
              :label="$t('page.manage.gsQuota.cycleType')"
              path="cycleType"
            >
              <NSelect
                v-model:value="model.cycleType"
                :options="cycleTypeOptions"
                :placeholder="$t('page.manage.gsQuota.form.cycleType')"
              />
            </NFormItemGi>

            <!-- 首次发送时间设置 -->
            <NFormItemGi
              span="24"
              :label="$t('page.manage.gsQuota.firstSendTime')"
            >
              <NRadioGroup v-model:value="sendMode">
                <NSpace>
                  <NRadio
                    v-for="item in sendModeOptions"
                    :key="item.value"
                    :value="item.value"
                    :label="item.label"
                  />
                </NSpace>
              </NRadioGroup>
            </NFormItemGi>

            <!-- 首次开始时间（仅在定时发送时显示） -->
            <NFormItemGi
              v-if="sendMode === 'scheduled'"
              span="24 m:12"
              :label="$t('page.manage.gsQuota.startTime')"
              path="startTime"
            >
              <NDatePicker
                v-model:value="startTimeTimestamp"
                type="datetime"
                :placeholder="$t('page.manage.gsQuota.form.startTime')"
                clearable
                format="yyyy-MM-dd HH:mm:ss"
                style="width: 100%"
              />
            </NFormItemGi>

            <!-- 任务备注 -->
            <NFormItemGi
              span="24"
              :label="$t('page.manage.gsQuota.taskRemark')"
              path="remark"
            >
              <NInput
                v-model:value="model.remark"
                type="textarea"
                :placeholder="$t('page.manage.gsQuota.form.remark')"
                :rows="3"
              />
            </NFormItemGi>
          </NGrid>
        </NForm>
      </NScrollbar>
    </template>

    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeDrawer">{{ $t("common.cancel") }}</NButton>
        <NButton
          v-if="operateType === 'add' && addMode === 'import' && hasAuth('operate:gsGrantTask:import')"
          type="primary"
          :loading="importing"
          :disabled="!selectedFile || (sendMode === 'scheduled' && !startTimeTimestamp)"
          @click="handleImport"
        >
          {{ importing ? $t('page.manage.gsQuota.import.importing') : $t('page.manage.gsQuota.import.importBtn') }}
        </NButton>
        <NButton
          v-else
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
/* 自定义样式 */
.n-input--disabled {
  cursor: not-allowed;
}
</style>
