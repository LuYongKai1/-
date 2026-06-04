<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from "vue";
import type { Ref } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import type { FormRules, FormItemRule, FormInst } from "naive-ui";
import {
  fetchAddMail,
  fetchUpdateMail,
  fetchGetServerGroup,
  fetchGetMailTemplateList,
  // fetchAndStoreCsPackageData,
} from "@/service/api";
import { $t } from "@/locales";
import { useServerStore } from "@/store/modules/server";
import { getJsonData, safeJsonParse } from "@/utils/indexedDB";
import { useThemeStore } from "@/store/modules/theme";
import { useItemPackage } from "@/hooks/business/useItemPackage";
import ItemSearchSelector from "@/components/business/item-search-selector.vue";
import CustomTimeDuration from "@/components/business/custom-time-duration.vue";
import { parseGoodsJson, stringifyGoodsJson, type ItemInfo } from "@/utils/item";

defineOptions({
  name: "MailOperateDrawer",
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?:
    | (Api.SystemManage.operateServer & {
        isReadonly?: boolean;
        mailStatus?: number;
      })
    | null;
  /** 外部传入的只读 */
  readonly?: boolean;
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
const typedFormRef = formRef as Ref<FormInst | null>;
const { defaultRequiredRule } = useFormRules();

// 添加表单验证规则
const rules: Record<string, FormRules | FormItemRule> = {
  mailRemark: { ...defaultRequiredRule, trigger: ["input", "blur"] },
  mailId: { ...defaultRequiredRule, trigger: ["change", "blur"] },
  mailTitle: { ...defaultRequiredRule, trigger: ["input", "blur"] },
  mailContent: { ...defaultRequiredRule, trigger: ["input", "blur"] },
  mailServerJson: {
    required: true,
    message: $t("page.manage.operateserver.form.mailServerJson"),
    trigger: ["change", "blur"],
    validator: (rule: FormItemRule, value: string) => {
      try {
        return selectedServerIds.value.length > 0;
      } catch {
        return false;
      }
    },
  },
};

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t("page.manage.operateserver.addservermail"),
    edit: $t("page.manage.operateserver.editservermail"),
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.SystemManage.operateServer,
  | "mailRemark"
  | "mailId"
  | "mailTitle"
  | "mailExpire"
  | "mailContent"
  | "mailSendDate"
  | "mailServerJson"
  | "activeFrom"
  | "activeTo"
  | "goodsJson"
  | "createRoleAfter"
  | "createRoleBefore"
> & {
  top?: number | null;
};

const model = ref(createDefaultModel());

// --- Helper Functions for Time Formatting ---
function getCurrentFormattedTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getOneMonthLaterFormattedTime(): string {
  const now = new Date();
  now.setMonth(now.getMonth() + 1); // Add one month
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function convertToTimestamp(dateStr: string): number | null {
  if (!dateStr) return null;
  if (dateStr.includes("+")) {
    return null;
  }
  try {
    const [datePart, timePart] = dateStr.split(" ");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute, second] = timePart.split(":").map(Number);
    const date = new Date(year, month - 1, day, hour, minute, second);
    return Math.floor(date.getTime() / 1000);
  } catch (error) {
    return null;
  }
}

function convertToString(timestamp: number | null): string {
  if (!timestamp) return "";
  try {
    const milliseconds =
      String(timestamp).length === 10 ? timestamp * 1000 : timestamp;
    const date = new Date(milliseconds);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const result = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    return result;
  } catch (error) {
    return "";
  }
}

function createDefaultModel(): Model {
  return {
    mailRemark: "",
    mailId: "8888",
    mailTitle: "",
    mailExpire: "",
    mailContent: "",
    mailSendDate: "",
    mailServerJson: "",
    activeFrom: "",
    activeTo: "",
    goodsJson: "",
    createRoleAfter: "",
    createRoleBefore: "",
    top: null,
  };
}

// Add a ref to control the date range switch
const enableDateRange = ref(false);

// 添加是否启用角色创建时间限制的开关
const enableRoleCreateTimeRange = ref(false);

// 自定义时长组件引用
const customTimeDurationRef = ref<InstanceType<typeof CustomTimeDuration> | null>(null);

// 添加新计算属性：计算过期时间秒数（不显示）
const mailExpireSeconds = computed(() => {
  return customTimeDurationRef.value?.getSeconds() || 0;
});

const mailExpireTimestamp = computed({
  get: () => {
    const timestamp = convertToTimestamp(model.value.mailExpire);
    return timestamp ? timestamp * 1000 : null;
  },
  set: (val) => {
    if (val === null) {
      model.value.mailExpire = "";
    } else {
      const date = new Date(val);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      model.value.mailExpire = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  },
});

const mailSendDateTimestamp = computed({
  get: () => {
    if (model.value.mailSendDate) {
      try {
        const date = new Date(model.value.mailSendDate);
        return date.getTime();
      } catch (error) {
        return null;
      }
    }
    return null;
  },
  set: (val) => {
    if (val === null) {
      model.value.mailSendDate = "";
    } else {
      const date = new Date(val);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      model.value.mailSendDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  },
});

const createDateTimestamp = computed({
  get: () => {
    const timestamp = convertToTimestamp(model.value.activeFrom);
    return timestamp ? timestamp * 1000 : null;
  },
  set: (val) => {
    if (val === null) {
      model.value.activeFrom = "";
    } else {
      const date = new Date(val);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      model.value.activeFrom = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  },
});

const updateDateTimestamp = computed({
  get: () => {
    const timestamp = convertToTimestamp(model.value.activeTo);
    return timestamp ? timestamp * 1000 : null;
  },
  set: (val) => {
    if (val === null) {
      model.value.activeTo = "";
    } else {
      const date = new Date(val);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      model.value.activeTo = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  },
});

const createRoleBeforeTimestamp = computed({
  get: () => {
    const timestamp = convertToTimestamp(model.value.createRoleBefore);
    return timestamp ? timestamp * 1000 : null;
  },
  set: (val) => {
    if (val === null) {
      model.value.createRoleBefore = "";
    } else {
      const date = new Date(val);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      model.value.createRoleBefore = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  },
});

const createRoleAfterTimestamp = computed({
  get: () => {
    const timestamp = convertToTimestamp(model.value.createRoleAfter);
    return timestamp ? timestamp * 1000 : null;
  },
  set: (val) => {
    if (val === null) {
      model.value.createRoleAfter = "";
    } else {
      const date = new Date(val);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      model.value.createRoleAfter = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  },
});

const serverGroupOptions = ref<CommonType.Option<number>[]>([]);
// Define a more specific type for mailTemplateOptions
interface MailTemplateOption extends CommonType.Option<string> {
  template: {
    title: string;
    content: string;
  };
}
const mailTemplateOptions = ref<MailTemplateOption[]>([]);

const serverStore = useServerStore();
const serverTreeOptions = computed(() => {
  const normalServerTree = serverStore.serverTreeOptions ?? [];
  const crossServerTree = (serverStore.crossServerList ?? []).map((server) => ({
    label: server.serverName,
    key: String(server.serverId)
  }));

  return [
    {
      label: "普通服",
      key: "normal_servers",
      children: normalServerTree
    },
    {
      label: "跨服",
      key: "cross_servers",
      children: crossServerTree
    }
  ];
});

// 修改selectedServerIds的计算属性
const selectedServerIds = ref<string[]>([]);

// 监听mailServerJson的变化
watch(
  () => model.value.mailServerJson,
  (newVal) => {
    try {
      const ids = JSON.parse(newVal);
      selectedServerIds.value = Array.isArray(ids)
        ? ids.map((id) => String(id))
        : [];
    } catch {
      selectedServerIds.value = [];
    }
  },
  { immediate: true }
);

watch(selectedServerIds, (val) => {
  const filteredIds = val.filter((id) => !String(id).startsWith("region_"));
  model.value.mailServerJson = JSON.stringify(filteredIds);
});

async function getServerGroupOptions() {
  const data = await fetchGetServerGroup();
  const responseData = data?.response?.data as {
    rows?: { groupName: string; id: number }[];
  };
  if (responseData?.rows && Array.isArray(responseData.rows)) {
    serverGroupOptions.value = responseData.rows.map(
      (item: { groupName: string; id: number }) => ({
        label: item.groupName,
        value: item.id,
      })
    );
  }
}

const isTemplateSelected = computed(
  () => !!model.value.mailId && model.value.mailId !== "8888"
);

async function getMailTemplateOptions() {
  const data = await fetchGetMailTemplateList();
  const responseData = data?.response?.data as { mails?: any[] };
  if (responseData && responseData.mails) {
    mailTemplateOptions.value = responseData.mails.map((item: any) => ({
      label: `${item.title_str} (${item.name_str})`,
      value: String(item.mail_id),
      template: {
        title: item.title_str,
        content: item.description_str,
      },
    }));

    mailTemplateOptions.value.unshift({
      label: "自定义模板",
      value: "8888",
      template: {
        title: "",
        content: "",
      },
    });
  }
}

// 添加邮件模板选择处理函数
function handleTemplateChange(mailId: string | null) {
  if (mailId) {
    if (mailId === "8888") {
      model.value.mailTitle = "";
      model.value.mailContent = "";
    } else {
      const selectedTemplate = mailTemplateOptions.value.find(
        (option) => option.value === mailId
      );
      if (selectedTemplate) {
        model.value.mailTitle = selectedTemplate.template.title;
        model.value.mailContent = selectedTemplate.template.content;
      }
    }
  } else {
    // 清空选择时，重置标题和内容
    model.value.mailTitle = "";
    model.value.mailContent = "";
  }
}

// 监听mailId的变化
watch(
  () => model.value.mailId,
  (newVal) => {
    handleTemplateChange(newVal);
    // 在模板更改并填充值后，清除所有验证状态
    restoreValidation();
    // 注意：这会清除所有字段的验证状态。
    // 如果需要，可以在之后显式地重新触发其他字段的验证，
    // 但通常当用户与那些字段交互时，验证会自动触发。
  }
);

function closeDrawer() {
  visible.value = false;
}

// 置顶选择：'no' 非置顶，'yes' 置顶
const topMode = ref<"no" | "yes">("no");

// 当切换为“非置顶”时，清空输入框的值
watch(topMode, (mode) => {
  if (mode === "no") {
    model.value.top = null;
  }
});

async function handleSubmit() {
  await validate();
  try {
    const itemIds: number[] = [];
    const itemCounts: number[] = [];

    if (selectedItems.value.length > 0) {
      selectedItems.value.forEach((item) => {
        itemIds.push(Number(item.id));
        itemCounts.push(Number(item.count));
      });

      model.value.goodsJson = JSON.stringify({
        item_ids: itemIds,
        item_counts: itemCounts,
      });
    } else {
      model.value.goodsJson = '{"item_ids": [], "item_counts": []}';
    }

    let mailServerJson = [];
    if (model.value.mailServerJson) {
      try {
        const serverIds = JSON.parse(model.value.mailServerJson);
        mailServerJson = serverIds.map((id: string | number) => {
          const normalizedId = String(id);
          const server = serverStore.mixedServerList.find(
            (s) => s.serverId === normalizedId
          );

          return {
            serverId: /^\d+$/.test(normalizedId) ? Number(normalizedId) : normalizedId,
            serverName: server?.serverName || "",
          };
        });
      } catch (e) {
        mailServerJson = [];
      }
    }

    // 直接使用计算好的秒数
    const expireSeconds = mailExpireSeconds.value;

    // 置顶：选择“是”传数值；选择“否”传空字符串
    const topValue =
      topMode.value === "yes" &&
      model.value.top !== null &&
      model.value.top !== undefined
        ? Number(model.value.top)
        : "";

    // 确保时间戳是秒级的，如果为空则发送0
    const activeFromDate = model.value.activeFrom
      ? convertToTimestamp(model.value.activeFrom)
      : 0;
    const activeToDate = model.value.activeTo
      ? convertToTimestamp(model.value.activeTo)
      : 0;
    const createRoleAfterDate = model.value.createRoleAfter
      ? convertToTimestamp(model.value.createRoleAfter)
      : 0;
    const createRoleBeforeDate = model.value.createRoleBefore
      ? convertToTimestamp(model.value.createRoleBefore)
      : 0;

    const data = {
      id: props.rowData?.id,
      mailRemark: model.value.mailRemark,
      mailId: model.value.mailId,
      mailTitle: model.value.mailTitle,
      mailExpire: expireSeconds, // 直接使用计算好的秒数
      mailContent: model.value.mailContent,
      mailSendDate: model.value.mailSendDate,
      mailServerJson: JSON.stringify(mailServerJson),
      goodsJson: model.value.goodsJson,
      activeFrom: activeFromDate,
      activeTo: activeToDate,
      item_ids: itemIds,
      item_counts: itemCounts,
      createRoleAfter: createRoleAfterDate,
      createRoleBefore: createRoleBeforeDate,
      mailType: 1,
      gameId: 101,
      top: topValue,
    };

    if (props.operateType === "add") {
      await fetchAddMail(data);
      window.$message?.success($t("common.addSuccess"));
      selectedItems.value = [];
      selectedServerIds.value = [];
    } else {
      await fetchUpdateMail(data);
      window.$message?.success($t("common.updateSuccess"));
    }
    closeDrawer();
    emit("submitted");
  } catch (error) {}
}

interface Server {
  serverId: number;
  serverName: string;
}

interface Region {
  id: number;
  regionName: string;
  children?: Server[];
}

// 物品选择相关
const selectedItems = ref<ItemInfo[]>([]);
const itemData = ref<any>(null);

onMounted(async () => {
  try {
    const data = await useItemPackage();
    itemData.value = data;
  } catch (error) {
    console.error("获取物品数据失败:", error);
    itemData.value = null;
  }
});

// 监听物品变化，自动更新 goodsJson
watch(selectedItems, (items) => {
  model.value.goodsJson = stringifyGoodsJson(items);
}, { deep: true });

// 修改watch函数，使用从IndexedDB获取的物品数据
watch(visible, async (newVal) => {
  if (newVal) {
    restoreValidation();
    // 先加载邮件模板数据，确保在设置model.value.mailId之前已经有了mailTemplateOptions
    await getMailTemplateOptions();
    await getServerGroupOptions();
    await Promise.all([serverStore.fetchServerList(), serverStore.fetchCrossServerList()]);
    // fetchItemData();

    // 初始化置顶
    topMode.value = "no";
    model.value.top = null;

    // Get current time and one month later time using helper functions
    const currentTime = getCurrentFormattedTime();
    const oneMonthLaterTime = getOneMonthLaterFormattedTime();

    if (props.operateType === "edit" && props.rowData) {
      const data = props.rowData;
      let serverIds: string[] = [];
      try {
        const serverData = JSON.parse(data.mailServerJson || "[]");
        serverIds = serverData.map((item: any) => String(item.serverId));
      } catch (e) {}

      model.value = {
        mailRemark: data.mailRemark || "",
        mailId: String(data.mailId || ""),
        mailTitle: data.mailTitle || "",
        mailExpire: data.mailExpire
          ? convertToString(Number(data.mailExpire))
          : oneMonthLaterTime,
        mailContent: data.mailContent || "",
        mailSendDate: data.mailSendDate || currentTime,
        mailServerJson: JSON.stringify(serverIds),
        goodsJson: data.goodsJson || '{"item_ids":[],"item_counts":[]}',
        activeFrom: data.activeFrom
          ? convertToString(Number(data.activeFrom))
          : "",
        activeTo: data.activeTo ? convertToString(Number(data.activeTo)) : "",
        createRoleAfter: data.createRoleAfter
          ? convertToString(Number(data.createRoleAfter))
          : "",
        createRoleBefore: data.createRoleBefore
          ? convertToString(Number(data.createRoleBefore))
          : "",
        top: null,
      };

      selectedServerIds.value = serverIds;
      // 初始化置顶状态
      const rawTop = (data as any).top;
      if (rawTop !== undefined && rawTop !== null && `${rawTop}` !== "") {
        topMode.value = "yes";
        model.value.top = Number(rawTop);
      } else {
        topMode.value = "no";
        model.value.top = null;
      }

      // 处理物品数据 - 使用工具函数解析
      selectedItems.value = parseGoodsJson(
        model.value.goodsJson || '{"item_ids":[],"item_counts":[]}',
        itemData.value
      );

      // 设置默认时间选项 - 使用 nextTick 确保组件已渲染
      nextTick(() => {
        if (data.mailExpire) {
          const mailExpireTimestamp = Number(data.mailExpire);
          customTimeDurationRef.value?.setFromSeconds(mailExpireTimestamp);
        } else {
          // 默认选择1天
          customTimeDurationRef.value?.reset();
        }
      });
    } else {
      model.value = {
        ...createDefaultModel(),
        mailExpire: oneMonthLaterTime,
        mailSendDate: currentTime,
        activeFrom: "",
        activeTo: "",
        createRoleAfter: "",
        createRoleBefore: "",
      };
      selectedItems.value = [];
      selectedServerIds.value = [];
      // 新增默认不置顶
      topMode.value = "no";
      model.value.top = null;

      // 默认选择1天 - 使用 nextTick 确保组件已渲染
      nextTick(() => {
        customTimeDurationRef.value?.reset();
      });
    }

    enableDateRange.value = false;
    enableRoleCreateTimeRange.value = false;

    if (props.operateType === "edit" && props.rowData) {
      // 检查活动时间范围
      if (props.rowData.activeFrom && props.rowData.activeTo) {
        if (
          Number(props.rowData.activeFrom) !== 0 &&
          Number(props.rowData.activeTo) !== 0
        ) {
          enableDateRange.value = true;
        }
      }

      // 检查角色创建时间范围
      if (props.rowData.createRoleAfter && props.rowData.createRoleBefore) {
        if (
          Number(props.rowData.createRoleAfter) !== 0 &&
          Number(props.rowData.createRoleBefore) !== 0
        ) {
          enableRoleCreateTimeRange.value = true;
        }
      }
    }
  }
});

watch(
  () => props.rowData,
  async (newVal) => {
    if (visible.value && props.operateType === "edit" && newVal) {
      // 确保模板选项已加载
      if (mailTemplateOptions.value.length === 0) {
        await getMailTemplateOptions();
      }

      const data = newVal;
      let serverIds: string[] = [];
      try {
        const serverData = JSON.parse(data.mailServerJson || "[]");
        serverIds = serverData.map((item: any) => String(item.serverId));
      } catch (e) {
        console.error("解析mailServerJson失败:", e);
      }

      // Get current time and one month later time using helper functions
      const currentTime = getCurrentFormattedTime();
      const oneMonthLaterTime = getOneMonthLaterFormattedTime();

      // 处理时间戳 - Use helper functions for defaults
      const mailExpireDate = data.mailExpire
        ? convertToString(Number(data.mailExpire))
        : oneMonthLaterTime;
      const mailSendDate = data.mailSendDate
        ? convertToString(Number(data.mailSendDate))
        : currentTime;

      // 修改这里：确保在非0的情况下才转换时间戳
      const activeFromDate =
        data.activeFrom && Number(data.activeFrom) !== 0
          ? convertToString(Number(data.activeFrom))
          : "";
      const activeToDate =
        data.activeTo && Number(data.activeTo) !== 0
          ? convertToString(Number(data.activeTo))
          : "";
      const createRoleAfterDate =
        data.createRoleAfter && Number(data.createRoleAfter) !== 0
          ? convertToString(Number(data.createRoleAfter))
          : "";
      const createRoleBeforeDate =
        data.createRoleBefore && Number(data.createRoleBefore) !== 0
          ? convertToString(Number(data.createRoleBefore))
          : "";

      model.value = {
        mailRemark: data.mailRemark || "",
        mailId: String(data.mailId || ""),
        mailTitle: data.mailTitle || "",
        mailExpire: mailExpireDate,
        mailContent: data.mailContent || "",
        mailSendDate: mailSendDate,
        mailServerJson: JSON.stringify(serverIds),
        goodsJson: data.goodsJson || '{"item_ids":[],"item_counts":[]}',
        activeFrom: activeFromDate,
        activeTo: activeToDate,
        createRoleAfter: createRoleAfterDate,
        createRoleBefore: createRoleBeforeDate,
        top: null,
      };

      selectedServerIds.value = serverIds;

      // Initialize the switch state based on existing dates
      enableDateRange.value = false;
      enableRoleCreateTimeRange.value = false;
      // 初始化置顶状态（编辑）
      const rawTop = (data as any).top;
      if (rawTop !== undefined && rawTop !== null && `${rawTop}` !== "") {
        topMode.value = "yes";
        model.value.top = Number(rawTop);
      } else {
        topMode.value = "no";
        model.value.top = null;
      }

      // 检查活动时间范围
      if (
        props.operateType === "edit" &&
        props.rowData &&
        props.rowData.activeFrom &&
        props.rowData.activeTo
      ) {
        // Check if timestamps are not 0 (assuming 0 means unset/default)
        if (
          Number(props.rowData.activeFrom) !== 0 &&
          Number(props.rowData.activeTo) !== 0
        ) {
          enableDateRange.value = true;
        }
      }

      // 检查角色创建时间范围
      if (
        props.operateType === "edit" &&
        props.rowData &&
        props.rowData.createRoleAfter &&
        props.rowData.createRoleBefore
      ) {
        // Check if timestamps are not 0 (assuming 0 means unset/default)
        if (
          Number(props.rowData.createRoleAfter) !== 0 &&
          Number(props.rowData.createRoleBefore) !== 0
        ) {
          enableRoleCreateTimeRange.value = true;
        }
      }

      // 处理物品数据 - 使用工具函数解析
      selectedItems.value = parseGoodsJson(
        model.value.goodsJson || '{"item_ids":[],"item_counts":[]}',
        itemData.value
      );

      // 设置正确的时间选项和相应的时间单位 - 使用 nextTick 确保组件已渲染
      nextTick(() => {
        if (data.mailExpire) {
          const mailExpireTime = Number(data.mailExpire);
          customTimeDurationRef.value?.setFromSeconds(mailExpireTime);
        } else {
          // 默认选择1天
          customTimeDurationRef.value?.reset();
        }
      });
    }
  },
  { immediate: true }
);

const themeStore = useThemeStore();

// 计算最终只读模式
const readonlyMode = computed(() => {
  if (typeof props.readonly === "boolean") return props.readonly;
  return (
    props.rowData?.isReadonly ||
    props.rowData?.mailStatus === 1 ||
    props.rowData?.mailStatus === 2 ||
    props.rowData?.mailStatus === 3 ||
    props.rowData?.mailStatus === 4
  );
});
</script>


<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-1200px">
    <NScrollbar class="h-700px pr-20px">
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        :label-width="100"
      >
        <NGrid responsive="screen" item-responsive>
          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.operateserver.mailRemark')"
            path="mailRemark"
          >
            <NInput
              v-model:value="model.mailRemark"
              :placeholder="$t('page.manage.operateserver.form.mailRemark')"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.operateserver.mailId')"
            path="mailId"
          >
            <NSelect
              v-model:value="model.mailId"
              :options="mailTemplateOptions"
              :placeholder="$t('page.manage.operateserver.form.mailId')"
              clearable
              @update:value="handleTemplateChange"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:24"
            :label="$t('page.manage.operateserver.mailTitle')"
            path="mailTitle"
          >
            <NInput
              v-model:value="model.mailTitle"
              :placeholder="$t('page.manage.operateserver.form.mailTitle')"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.operateserver.mailContent')"
            path="mailContent"
          >
            <NInput
              v-model:value="model.mailContent"
              type="textarea"
              :placeholder="$t('page.manage.operateserver.form.mailContent')"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <!-- 置顶设置（新增/编辑） -->
          <NFormItemGi span="24" :label="$t('page.manage.operateserver.isTop')">
            <div class="flex items-center gap-3 w-full">
              <NRadioGroup v-model:value="topMode" :disabled="readonlyMode">
                <NSpace>
                  <NRadio value="yes">{{ $t('common.yesOrNo.yes') }}</NRadio>
                  <NRadio value="no">{{ $t('common.yesOrNo.no') }}</NRadio>
                </NSpace>
              </NRadioGroup>
              <NInputNumber
                v-model:value="model.top"
                :min="1"
                :max="999999999"
                :placeholder="$t('page.manage.operateserver.topPlaceholder')"
                :disabled="topMode !== 'yes' || readonlyMode"
                class="flex-1"
              />
            </div>
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.operateserver.mailServerJson')"
            path="mailServerJson"
          >
            <NTreeSelect
              v-model:value="selectedServerIds"
              :options="serverTreeOptions"
              :placeholder="$t('page.manage.operateserver.form.mailServerJson')"
              multiple
              cascade
              checkable
              clearable
              :check-strategy="'child'"
              :max-tag-count="3"
              tag
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.operateserver.mailSendDate')"
          >
            <NDatePicker
              v-model:value="mailSendDateTimestamp"
              type="datetime"
              :placeholder="$t('page.manage.operateserver.form.mailSendDate')"
              value-format="yyyy-MM-dd HH:mm:ss"
              clearable
              style="width: 100%"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <!-- 自定义时长组件 -->
          <NFormItemGi span="24">
            <CustomTimeDuration
              ref="customTimeDurationRef"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <!-- <NFormItemGi
            span="24 m:24"
            :label="$t('page.manage.operateserver.enableDateRange')"
          >
            <NSwitch v-model:value="enableDateRange" />
          </NFormItemGi> -->

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.operateserver.activeFrom')"
          >
            <NDatePicker
              v-model:value="createDateTimestamp"
              type="datetime"
              :placeholder="$t('page.manage.operateserver.form.activeFrom')"
              value-format="yyyy-MM-dd HH:mm:ss"
              clearable
              style="width: 100%"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.operateserver.activeTo')"
          >
            <NDatePicker
              v-model:value="updateDateTimestamp"
              type="datetime"
              :placeholder="$t('page.manage.operateserver.form.activeTo')"
              value-format="yyyy-MM-dd HH:mm:ss"
              clearable
              style="width: 100%"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <!-- <NFormItemGi
            span="24 m:24"
            :label="$t('page.manage.operateserver.enableRoleCreateTimeRange')"
          >
            <NSwitch v-model:value="enableRoleCreateTimeRange" />
          </NFormItemGi> -->

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.operateserver.createRoleAfter')"
          >
            <NDatePicker
              v-model:value="createRoleAfterTimestamp"
              type="datetime"
              :placeholder="
                $t('page.manage.operateserver.form.createRoleAfter')
              "
              value-format="yyyy-MM-dd HH:mm:ss"
              clearable
              style="width: 100%"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.operateserver.createRoleBefore')"
          >
            <NDatePicker
              v-model:value="createRoleBeforeTimestamp"
              type="datetime"
              :placeholder="
                $t('page.manage.operateserver.form.createRoleBefore')
              "
              value-format="yyyy-MM-dd HH:mm:ss"
              clearable
              style="width: 100%"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.operateserver.goodsJson')"
            path="goodsJson"
          >
            <ItemSearchSelector
              v-model="selectedItems"
              :readonly="readonlyMode"
              :placeholder="$t('page.manage.operateserver.form.goodsJson')"
            />
          </NFormItemGi>

        </NGrid>
      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeDrawer">{{ $t("common.cancel") }}</NButton>
        <NButton
          type="primary"
          @click="handleSubmit"
          :disabled="readonlyMode"
          >{{ $t("common.confirm") }}</NButton
        >
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
.n-input--disabled {
  cursor: not-allowed;
}
</style>
