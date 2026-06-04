<script setup lang="ts">
  import { ref, watch, computed, nextTick } from "vue";
  import { useFormRules, useNaiveForm } from "@/hooks/common/form";
  import {
    gsRoleTagTypeOptions,
    gsRoleTagStatusOptions,
    gsQuotaCycleTypeOptions,
  } from "@/constants/business";
  import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
  import { $t } from "@/locales";
  import { useAuthStore } from "@/store/modules/auth";
  import {
    fetchAddGsRoleTag,
    fetchUpdateGsRoleTag,
    fetchmultiplerole,
    fetchAuditGsRoleTag,
  } from "@/service/api";
  import { useThemeStore } from "@/store/modules/theme";
  import { useAuth } from "@/hooks/business/auth";

  defineOptions({
    name: "RoleActivityOperateDrawer",
  });

  interface Props {
    /** 操作类型 */
    operateType: NaiveUI.TableOperateType | 'audit';
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

  const title = computed(() => {
    const titles: Record<NaiveUI.TableOperateType | 'audit', string> = {
      add: $t("page.manage.gsRole.addrole"),
      edit: $t("page.manage.gsRole.editrole"),
      audit: $t("page.manage.gsRole.auditrole"),
    };
    return titles[props.operateType];
  });

  type Model = Omit<
    Pick<
      Api.SystemManage.gsRoleTag,
      | "roleId"
      | "tagType"
      | "userName"
      | "phoneNumber"
      | "quota"
      | "amount"
      | "reason"
      | "operator"
      | "cycleType"
      | "sendMode"
      | "startTime"
      | "grantTaskStatus"
    >,
    "roleId" | "tagType" | "quota" | "amount"
  > & {
    /** 编辑时回显用 */
    id?: number;
    /** 表单里用字符串，提交时再转 number，避免大整数精度丢失 */
    roleId: string;
    tagType: string;
    status: string;
    /** 表单里用字符串，提交时再转 number */
    quota?: string;
    /** 表单里用字符串，提交时再转 number */
    amount?: string;
  };

  const model = ref<Model>(createDefaultModel());
  const themeStore = useThemeStore();
  const loading = ref(false);

  // 仅保留：scheduled-定时循环发送
  const sendMode = ref<Api.SystemManage.gsQuotaSendMode>("scheduled");
  const startTimeTimestamp = ref<number | null>(null);

  // 计算首次开始时间（增强版）
  const calculatedStartTime = computed(() => {
    const now = new Date();
    const cycleType = model.value.cycleType;

    switch (cycleType) {
      case 'DAILY':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'WEEKLY':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'MONTHLY':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  });

  // 自动设置开始时间的函数
  const setDefaultStartTime = () => {
    if (model.value.grantTaskStatus === 1) {
      const defaultTime = calculatedStartTime.value.getTime();
      startTimeTimestamp.value = defaultTime;
      model.value.startTime = formatLocalDateTime(defaultTime);
    }
  };

  // 监听周期类型变化
  watch(() => model.value.cycleType, (newCycleType, oldCycleType) => {
    if (newCycleType !== oldCycleType) {
      setDefaultStartTime();
    }
  }, { immediate: true }); // 关键：立即执行

  // 监听任务额度状态变化
  watch(() => model.value.grantTaskStatus, (newStatus) => {
    if (newStatus === 1) {
      setDefaultStartTime();
    }
  }, { immediate: true });

  // 组件显示时也检查一次
  watch(visible, (newVal) => {
    if (newVal) {
      restoreValidation();
      handleInitModel();
      // 确保开始时间正确设置
      nextTick(() => {
        setDefaultStartTime();
      });
    } else {
      setRoleSearchInput("");
      roleSearchResults.value = [];
    }
  });

  // 是否启用：0-否，1-是（写法参考其它页面：NRadio + v-for）
  const enableOptions = [
    { label: "否", value: 0 as const },
    { label: "是", value: 1 as const },
  ] as const;

  function useDebounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
    let timer: number | null = null;
    return function (...args: Parameters<T>) {
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
      tagType: "",
      userName: "",
      phoneNumber: "",
      quota: "",
      amount: undefined,
      reason: "",
      status: "1",
      operator: "",
      cycleType: "DAILY",
      sendMode: "scheduled",
      startTime: "",
      grantTaskStatus: 1,
    } as Model;
  }

  /**
   * 将时间戳转换为本地时间格式 (yyyy-MM-ddTHH:mm:ss)
   */
  function formatLocalDateTime(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  // 周期类型选项：使用普通常量，便于模板类型推断稳定通过
  const cycleTypeOptions = gsQuotaCycleTypeOptions;

  // 根据权限过滤标签类型选项
  const filteredTagTypeOptions = computed(() => {
    const filtered = gsRoleTagTypeOptions.filter((option) => {
      // '1' 对应 GS，'2' 对应客诉
      if (option.value === '1') {
        return hasAuth('operate:gsRoleTags:tagType:gs');
      }
      if (option.value === '2') {
        return hasAuth('operate:gsRoleTags:tagType:ks');
      }
      return true; // 其他选项默认显示
    });

    // 如果过滤后没有选项，添加一个提示选项
    if (filtered.length === 0) {
      return [{
        label: '暂无可选标签类型权限',
        value: '',
        disabled: true
      }];
    }

    return filtered;
  });

  // 监听过滤后的选项变化，如果当前选中的值不在可选项中，则清空
  watch(filteredTagTypeOptions, (newOptions) => {
    if (newOptions.length > 0) {
      const hasCurrentValue = newOptions.some(opt => opt.value === model.value.tagType);
      if (!hasCurrentValue) {
        model.value.tagType = "";
      }
    } else {
      // 如果没有任何可选项，清空选中值
      model.value.tagType = "";
    }
  }, { immediate: true });

  // 表单验证规则
  const rules = computed(() => {
    const baseRules: any = {
      roleId: defaultRequiredRule,
      tagType: defaultRequiredRule,
      userName: defaultRequiredRule,
      status: defaultRequiredRule,
      quota: [
        {
          required: true,
          message: $t("page.manage.gsRole.form.quota"),
          trigger: ["input", "blur"],
        },
        {
          pattern: /^\d+$/,
          message: "只能输入数字",
          trigger: ["input", "blur"],
        },
        {
          validator: (rule: any, value: string) => {
            if (value && Number(value) > 1000000) {
              return new Error("额度不能超过100万");
            }
            return true;
          },
          trigger: ["input", "blur"],
        },
      ],
    };

    // 当任务额度开启为"是"(1)时，添加额外的必填校验
    if (model.value.grantTaskStatus === 1) {
      baseRules.amount = [
        {
          required: true,
          message: "请输入任务发放额度",
          trigger: ["input", "blur"],
        },
      ];
      baseRules.cycleType = defaultRequiredRule;
      baseRules.startTime = defaultRequiredRule;
    }

    return baseRules;
  });

  function handleInitModel() {
    model.value = createDefaultModel();
    sendMode.value = "scheduled";
    startTimeTimestamp.value = null;

    if ((props.operateType === "edit" || props.operateType === "audit") && props.rowData) {
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
        tagType: String(props.rowData.tagType || ""),
        userName: props.rowData.userName || "",
        phoneNumber: props.rowData.phoneNumber || "",
        quota:
          props.rowData.quota !== undefined && props.rowData.quota !== null
            ? String(props.rowData.quota)
            : "",
        amount:
          props.rowData.amount !== undefined && props.rowData.amount !== null
            ? String(props.rowData.amount)
            : "",
        reason: props.rowData.reason || null,
        status:
          props.rowData.status !== undefined ? String(props.rowData.status) : "1",
        operator: props.rowData.operator || "",
        cycleType: props.rowData.cycleType || "DAILY",
        sendMode: "scheduled",
        startTime: props.rowData.startTime || model.value.startTime,
        grantTaskStatus:
          props.rowData.grantTaskStatus !== undefined
            ? props.rowData.grantTaskStatus
            : 1,
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

  // 固定为 scheduled，同步到 model
  watch(sendMode, (newMode) => {
    model.value.sendMode = newMode;
  });

  // 监听时间戳变化，同步到 model.startTime
  watch(startTimeTimestamp, (newValue) => {
    if (newValue) {
      model.value.startTime = formatLocalDateTime(newValue);
    } else {
      model.value.startTime = "";
    }
  });

  async function handleSubmit() {
    await validate();

    try {
      loading.value = true;

      // 当任务额度开启为"是"时，检查必填字段
      if (model.value.grantTaskStatus === 1) {
        if (!model.value.amount) {
          window.$message?.error("请输入任务发放额度");
          loading.value = false;
          return;
        }
        if (!model.value.cycleType) {
          window.$message?.error("请选择周期类型");
          loading.value = false;
          return;
        }
        if (!startTimeTimestamp.value) {
          window.$message?.error("请选择首次开始时间");
          loading.value = false;
          return;
        }
      }

      // 如果有选择开始时间，则格式化；否则使用空字符串
      const startTime = startTimeTimestamp.value
        ? formatLocalDateTime(startTimeTimestamp.value)
        : "";

      const submitData = {
        ...model.value,
        roleId: model.value.roleId, // 保持字符串格式，避免大整数精度丢失
        tagType: Number(model.value.tagType),
        status: model.value.status ? Number(model.value.status) : 1,
        operator: authStore.userInfo.user.userName,
        cycleType: model.value.cycleType,
        sendMode: "scheduled",
        startTime,
        quota: model.value.quota ? Number(model.value.quota) : 0,
      };

      if (props.operateType === "add") {
        const response = await fetchAddGsRoleTag(submitData);
        if (handleApiResponseError(response, "添加角色标记")) {
          loading.value = false;
          return;
        }
        window.$message?.success($t("common.addSuccess"));
      } else {
        const response = await fetchUpdateGsRoleTag(submitData);
        if (handleApiResponseError(response, "更新角色标记")) {
          loading.value = false;
          return;
        }
        window.$message?.success($t("common.updateSuccess"));
      }

      loading.value = false;
      closeDrawer();
      emit("submitted");
    } catch (error) {
      loading.value = false;
      handleApiCatchError(error, "操作失败");
    }
  }

  // 审核处理函数
  async function handleAudit(auditStatus: 0 | 1) {
    try {
      await validate();
      loading.value = true;

      // 当任务额度开启为"是"时，检查必填字段
      if (model.value.grantTaskStatus === 1) {
        if (!model.value.amount) {
          window.$message?.error("请输入任务发放额度");
          loading.value = false;
          return;
        }
        if (!model.value.cycleType) {
          window.$message?.error("请选择周期类型");
          loading.value = false;
          return;
        }
        if (!startTimeTimestamp.value) {
          window.$message?.error("请选择首次开始时间");
          loading.value = false;
          return;
        }
      }

      // 如果有选择开始时间，则格式化；否则使用空字符串
      const startTime = startTimeTimestamp.value
        ? formatLocalDateTime(startTimeTimestamp.value)
        : "";

      // 先更新数据
      const updateData = {
        ...model.value,
        id: props.rowData?.id,
        roleId: model.value.roleId,
        tagType: Number(model.value.tagType),
        status: auditStatus, // 使用审核状态
        operator: authStore.userInfo.user.userName,
        cycleType: model.value.cycleType,
        sendMode: "scheduled",
        startTime,
        quota: model.value.quota ? Number(model.value.quota) : 0,
      };

      const updateResponse = await fetchUpdateGsRoleTag(updateData);
      if (handleApiResponseError(updateResponse, "更新角色标记")) {
        loading.value = false;
        return;
      }

      // 再调用审核接口
      const auditData = {
        id: props.rowData?.id,
        status: auditStatus,
      };

      const response = await fetchAuditGsRoleTag(auditData);

      if (handleApiResponseError(response, "审核操作")) {
        loading.value = false;
        return;
      }

      window.$message?.success(
        auditStatus === 1
          ? $t("common.auditPass")
          : $t("common.auditReject")
      );

      loading.value = false;
      closeDrawer();
      emit('submitted');

    } catch (error) {
      loading.value = false;
      handleApiCatchError(error, "审核操作");
    }
  }

  // 通过审核
  function handleApprove() {
    handleAudit(1);
  }

  // 拒绝审核
  function handleReject() {
    handleAudit(0);
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
      <NScrollbar class="h-420px pr-20px">
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
                  :disabled="operateType === 'edit' || operateType === 'audit'"
                  :placeholder="$t('page.manage.gsRole.form.roleId')"
                  @clear="clearRoleSearch"
                />
                <div
                  v-if="roleSearchInput && roleSearchResults.length > 0"
                  class="absolute left-0 right-0 top-full z-50 mt-1 w-full max-h-[260px] overflow-y-auto rounded-md shadow-sm"
                  :class="[
                    themeStore.darkMode
                      ? 'bg-[rgb(44,44,50)] border border-[#333]'
                      : 'bg-white border border-[#e5e7eb]',
                  ]"
                >
                  <div
                    v-for="role in roleSearchResults"
                    :key="role.roleId + role.roleName"
                    class="cursor-pointer px-12px py-10px text-13px transition-colors duration-200 border-b last:border-b-0"
                    :class="[
                      themeStore.darkMode
                        ? 'hover:bg-[rgb(55,55,60)] border-[#333] text-white'
                        : 'hover:bg-[#f3f4f6] border-[#e5e7eb] text-[#1f1f1f]',
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
                :options="filteredTagTypeOptions"
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

            <!-- 手机号 -->
            <NFormItemGi span="24 m:12" label="手机号" path="phoneNumber">
              <NInput
                v-model:value="model.phoneNumber"
                placeholder="请输入手机号"
              />
            </NFormItemGi>

            <!-- 额度 -->
            <NFormItemGi
              span="24"
              :label="$t('page.manage.gsRole.quota')"
              path="quota"
            >
              <NInput
                v-model:value="model.quota"
                :placeholder="$t('page.manage.gsRole.form.quota')"
              />
            </NFormItemGi>

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

            <!-- 是否启用 -->
            <NFormItemGi
              span="24 m:12"
              label="任务额度开启"
              path="grantTaskStatus"
            >
              <NRadioGroup v-model:value="model.grantTaskStatus">
                <NSpace>
                  <NRadio
                    v-for="item in enableOptions"
                    :key="item.value"
                    :value="item.value"
                    :label="item.label"
                  />
                </NSpace>
              </NRadioGroup>
            </NFormItemGi>

              <!-- 任务发放额度 -->
              <NFormItemGi
              v-if="model.grantTaskStatus === 1"
              span="24 m:12"
              :label="$t('page.manage.gsRole.amount')"
              path="amount"
            >
              <NInput v-model:value="model.amount" />
            </NFormItemGi>

            <!-- 周期类型 -->
            <NFormItemGi
              v-if="model.grantTaskStatus === 1"
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

            <!-- 首次开始时间（定时循环发送） -->
            <NFormItemGi
              v-if="model.grantTaskStatus === 1"
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
                :disabled="true"
              />
            </NFormItemGi>

          </NGrid>
        </NForm>
      </NScrollbar>

      <template #footer>
        <NSpace justify="end" :size="16">
          <template v-if="operateType === 'audit'">
            <NButton
              type="error"
              ghost
              :loading="loading"
              @click="handleReject"
            >
              {{ $t('common.reject') }}
            </NButton>
            <NButton
              type="primary"
              ghost
              :loading="loading"
              @click="handleApprove"
            >
              {{ $t('common.approve') }}
            </NButton>
          </template>
          <template v-else>
          <NButton @click="closeDrawer">{{ $t("common.cancel") }}</NButton>
            <NButton type="primary" :loading="loading" @click="handleSubmit">{{
            $t("common.confirm")
          }}</NButton>
          </template>
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
