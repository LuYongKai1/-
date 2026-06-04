<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from "vue";
import { NInputNumber } from "naive-ui";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { useItemPackage } from '@/hooks/business/useItemPackage';
import {
  fetchAddMultiMail,
  fetchUpdateMultiMail,
  fetchGetMailTemplateList,
} from "@/service/api";
import { $t } from "@/locales";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import ItemSearchSelector from "@/components/business/item-search-selector.vue";
import RoleSearchSelector from "@/components/business/role-search-selector.vue";
import CustomTimeDuration from "@/components/business/custom-time-duration.vue";
import BatchImportModal from "./batch-import-modal.vue";
import { parseGoodsJson, stringifyGoodsJson, type ItemInfo } from "@/utils/item";
import JSONbig from 'json-bigint';

// 公共的角色数据解析函数
function parseRolesData(mailRolesJson: any): any[] {
  try {
    let roles;
    if (typeof mailRolesJson === "object" && mailRolesJson !== null) {
      roles = mailRolesJson;
    } else if (typeof mailRolesJson === "string") {
      try {
        // 使用JSONbig来解析，保持大整数为字符串
        roles = JSONbig({ storeAsString: true }).parse(mailRolesJson);
      } catch (parseError) {
        try {
          // 如果是双重JSON编码，先用普通JSON解析一次
          const firstParse = JSON.parse(mailRolesJson);
          if (typeof firstParse === 'string') {
            roles = JSONbig({ storeAsString: true }).parse(firstParse);
          } else {
            roles = firstParse;
          }
        } catch (secondError) {
          // 最后尝试普通JSON解析
          roles = JSON.parse(mailRolesJson);
        }
      }
    }

    if (Array.isArray(roles)) {
      return roles.map((role: any) => ({
        id: String(role.roleId || role.id || role.openId),
        name: role.roleName || role.name || "未知角色",
        serverId: role.serverId || 1,
        serverName: role.serverName || "",
      }));
    }
    return [];
  } catch (e) {
    console.error("解析角色数据失败:", e);
    return [];
  }
}

defineOptions({
  name: "ItemOperateDrawer",
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?:
    | (Api.SystemManage.operateMulti & {
        isReadonly?: boolean;
        mailStatus?: number;
      })
    | null;
  /** 外部传入的只读 */
  readonly?: boolean;
}

const props = defineProps<Props>();

interface Emits {
  (e: "submitted", data?: any): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", {
  default: false,
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t("page.manage.operateserver.addservermail"),
    edit: $t("page.manage.operateserver.editservermail"),
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.SystemManage.operateMulti,
  | "mailRemark"
  | "mailId"
  | "mailTitle"
  | "mailExpire"
  | "mailContent"
  | "mailSendDate"
  | "mailRolesJson"
  | "goodsJson"
> & {
  importToken?: string;
  importCount?: number;
  top?: number | null;
  audit?: number;
  iuids?: string;
};

const model = ref(createDefaultModel());

function convertToTimestamp(dateStr: string): number | null {
  if (!dateStr) return null;
  if (dateStr.includes("+")) {
    return null;
  }
  try {
    // 将时间字符串解析为本地时间
    const [datePart, timePart] = dateStr.split(" ");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute, second] = timePart.split(":").map(Number);
    const date = new Date(year, month - 1, day, hour, minute, second);
    // 返回秒级时间戳
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
    mailRolesJson: "",
    goodsJson: "",
    importToken: "",
    importCount: 0,
    top: null,
    audit: 0,
    iuids: "",
  };
}

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
// --- End Helper Functions ---

// 自定义时长组件引用
const customTimeDurationRef = ref<InstanceType<typeof CustomTimeDuration> | null>(null);

// 添加新计算属性：计算过期时间秒数（不显示）
const mailExpireSeconds = computed(() => {
  return customTimeDurationRef.value?.getSeconds() || 0;
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

// 定义邮件模板选项的类型
interface MailTemplateOption extends CommonType.Option<string> {
  template: {
    title: string;
    content: string;
  };
}
// 定义邮件模板接口
interface MailTemplateItem {
  mail_id: number;
  title_str: string;
  name_str: string;
  description_str: string;
}
// 定义邮件模板API响应类型
interface MailTemplateResponse {
  mails: MailTemplateItem[];
}

const mailTemplateOptions = ref<MailTemplateOption[]>([]);
const isTemplateSelected = computed(
  () => !!model.value.mailId && model.value.mailId !== "8888"
);

// 修改获取邮件模板列表的函数
async function getMailTemplateOptions() {
  const data = await fetchGetMailTemplateList();
  const responseData = data?.response?.data as { mails?: unknown };
  if (responseData && responseData.mails && Array.isArray(responseData.mails)) {
    const templateResponse = responseData as unknown as MailTemplateResponse;
    mailTemplateOptions.value = templateResponse.mails.map((item) => ({
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
      // 自定义模板下，只有在新增模式时才清空标题和内容
      if (props.operateType === "add") {
        model.value.mailTitle = "";
        model.value.mailContent = "";
      }
    } else {
      // 选择了非自定义模板，总是使用模板内容
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
  (newVal, oldVal) => {
    // 只有在以下情况才应用模板内容：
    // 1. 从自定义模板切换到其他模板
    // 2. 模板变更（且不是切换到自定义模板）
    if (
      newVal &&
      newVal !== "8888" &&
      (oldVal === "8888" || (oldVal && oldVal !== newVal))
    ) {
      handleTemplateChange(newVal);
    } else if (newVal === "8888" && props.operateType === "add") {
      // 在添加模式下，切换到自定义模板时清空内容
      model.value.mailTitle = "";
      model.value.mailContent = "";
    } else if (!newVal) {
      // 清空选择时同样清空内容
      model.value.mailTitle = "";
      model.value.mailContent = "";
    }

    // 在模板更改并填充值后，清除所有验证状态
    restoreValidation();
    // 注意：这会清除所有字段的验证状态。
    // 如果需要，可以在之后显式地重新触发其他字段的验证，
    // 但通常当用户与那些字段交互时，验证会自动触发。
  }
);

function closeDrawer() {
  visible.value = false;
  importedDataInfo.value = null;
  originalGoodsJsonFormat.value = null;
  editLockedTab.value = null;
}

// 置顶选择：'no' 非置顶，'yes' 置顶
const topMode = ref<'no' | 'yes'>('no');

watch(visible, (newVal) => {
  if (newVal && props.operateType === 'add') {
    // 每次打开新增时重置置顶相关
    topMode.value = 'no';
    model.value.top = null;
  }
});

// 当切换为“非置顶”时，清空输入框的值
watch(
  topMode,
  (mode) => {
    if (mode === 'no') {
      model.value.top = null;
    }
  }
);

async function handleSubmit() {
  await validate();
  try {
    // 使用联合类型以支持字符串和数字
    const itemIds: (string | number)[] = [];
    const itemCounts: number[] = [];

    // 判断是否在补偿道具标签页
    const isCompensationTab = activeTab.value === 'tab3';

    if (isCompensationTab) {
      // 补偿道具标签页的特殊处理
      // 解析 iuids 输入框中的内容，保持为字符串以避免大整数精度丢失
      if (model.value.iuids) {
        // 支持中文逗号和英文逗号分割
        const iuidsArray = model.value.iuids
          .split(/[,，]/)
          .map(id => id.trim())
          .filter(id => id);

        // 合并到 itemIds 中，保持为字符串以避免大整数精度丢失
        itemIds.push(...iuidsArray);
      }

      // item_counts 传递空数组
      itemCounts.length = 0;

      // 构建 goodsJson，将大整数转换为数字（如果安全），否则保持为字符串
      // 使用 JSONbig 序列化以保持大整数精度
      const goodsData = [{
        item_ids: itemIds.map((id: string | number) => {
          const idStr = String(id);
          const numId = Number(idStr);
          // 如果数字在安全范围内且转换后值不变，使用数字；否则保持为字符串
          if (Number.isSafeInteger(numId) && String(numId) === idStr) {
            return numId;
          }
          // 超出安全范围，保持为字符串，JSONbig 会将其序列化为字符串
          return idStr;
        }),
        item_counts: itemCounts,
      }];
      // 使用 JSONbig 序列化，storeAsString: true 会将大整数保持为字符串
      model.value.goodsJson = JSONbig({ storeAsString: true }).stringify(goodsData);
    } else {
      // 其他标签页的原有逻辑
      // 如果存在原始多对象数组格式，且用户没有手动修改，则保持原格式
      if (originalGoodsJsonFormat.value && selectedItems.value.length === 0) {
        // 保持原始格式
        model.value.goodsJson = originalGoodsJsonFormat.value;
        // 从原始格式中提取 itemIds 和 itemCounts 用于提交
        try {
          const goodsData = JSON.parse(originalGoodsJsonFormat.value);
          if (Array.isArray(goodsData)) {
            goodsData.forEach((group: any) => {
              if (group.item_ids && Array.isArray(group.item_ids)) {
                itemIds.push(...group.item_ids.map((id: any) => Number(id)));
              }
              if (group.item_counts && Array.isArray(group.item_counts)) {
                itemCounts.push(...group.item_counts.map((count: any) => Number(count)));
              }
            });
          }
        } catch (e) {
          console.error("解析原始 goodsJson 失败:", e);
        }
      } else if (selectedItems.value.length > 0) {
        // 只有在手动添加模式下才处理 selectedItems
        selectedItems.value.forEach((item) => {
          itemIds.push(Number(item.id));
          itemCounts.push(Number(item.count));
        });

        model.value.goodsJson = JSON.stringify([{
          item_ids: itemIds,
          item_counts: itemCounts,
        }]);
        // 清除原始格式标记，因为用户已手动修改
        originalGoodsJsonFormat.value = null;
      } else if (!model.value.goodsJson || model.value.goodsJson === '[]') {
        // 只有在既没有手动添加，也没有导入数据时，才设置为空
        model.value.goodsJson = '[{"item_ids": [], "item_counts": []}]';
      }
      // 如果 model.value.goodsJson 已经有值（通过导入），则保持不变
    }

    // 直接使用计算好的秒数
    const expireSeconds = mailExpireSeconds.value;

    // 置顶：选择"是"传数值；选择"否"传空字符串
    const topValue =
      topMode.value === 'yes' && model.value.top !== null && model.value.top !== undefined
        ? Number(model.value.top)
        : '';

    // 编辑模式下，如果审核状态不是待审核（0），需要重置为待审核状态
    // 因为后端要求只有待审核状态的邮件才能编辑
    let auditValue = model.value.audit ?? 0;
    const originalAuditStatus = auditValue;
    if (props.operateType === "edit" && auditValue !== 0) {
      // 审核通过（1）或审核拒绝（2）的邮件，编辑时需要重置为待审核（0）
      auditValue = 0;
    }

    const data = {
      // 只在编辑模式下传递 id，新增模式（包括克隆）不传递 id
      ...(props.operateType === "edit" && props.rowData?.id ? { id: props.rowData.id } : {}),
      mailRemark: model.value.mailRemark,
      mailId: model.value.mailId,
      mailTitle: model.value.mailTitle,
      mailExpire: expireSeconds, // 直接使用计算好的秒数
      mailContent: model.value.mailContent,
      mailSendDate: model.value.mailSendDate,
      goodsJson: model.value.goodsJson,
      mailRolesJson: model.value.mailRolesJson || "[]",
      item_ids: itemIds,
      item_counts: itemCounts,
      mailType: 2,
      gameId: 101,
      importToken: model.value.importToken || "",
      top: topValue,
      audit: auditValue,
    };

    let response;
    if (props.operateType === "add") {
      response = await fetchAddMultiMail(data);
    } else {
      response = await fetchUpdateMultiMail(data);
    }

    // 使用统一的错误处理函数，如果有错误则返回
    if (handleApiResponseError(response, props.operateType === "add" ? '新增邮件' : '修改邮件')) {
      return;
    }

    // 成功后的处理
    window.$message?.success($t(props.operateType === "add" ? "common.addSuccess" : "common.updateSuccess"));

    // 如果编辑了审核通过或审核拒绝的邮件，提示用户需要重新审核
    if (props.operateType === "edit" && originalAuditStatus !== 0) {
      window.$message?.info("邮件已编辑，审核状态已重置为待审核，请重新审核");
    }

    // 如果是新增模式，获取返回的数据（用于后续编辑）
    let addedData = null;
    if (props.operateType === "add") {
      // 尝试多种可能的返回数据格式
      addedData = response?.response?.data || response?.data || response;
      // 如果返回的是数组，取第一个元素
      if (Array.isArray(addedData) && addedData.length > 0) {
        addedData = addedData[0];
      }
    }

    closeDrawer();
    emit("submitted", addedData);
  } catch (error: any) {
    // 表单验证错误不显示错误消息
    if (error instanceof Error && error.message.includes("validation")) {
      return;
    }
    // 使用统一的异常处理函数
    handleApiCatchError(error, props.operateType === "add" ? '新增邮件' : '修改邮件');
  }
}

// 物品选择相关
const selectedItems = ref<ItemInfo[]>([]);

// 物品数据，用于初始化时解析物品信息
const itemData = ref<any>(null);

// 保存原始的 goodsJson 格式（用于编辑时保持多对象数组格式）
const originalGoodsJsonFormat = ref<string | null>(null);

// 使用 onMounted 来异步获取数据，避免 setup 函数返回 Promise
onMounted(async () => {
  try {
    const data = await useItemPackage();
    itemData.value = data;
  } catch (error) {
    console.error("获取物品数据失败:", error);
    itemData.value = null;
  }
});

// 监听物品变化，更新 goodsJson（仅在手动添加模式下更新）
watch(selectedItems, (items) => {
  // 只有在手动添加标签页时才更新
  if (activeTab.value === 'tab1') {
    // 如果存在原始格式且是编辑模式，且用户确实修改了物品（items 不为空），才更新
    if (props.operateType === 'edit' && originalGoodsJsonFormat.value && items.length > 0) {
      // 编辑模式下，用户手动修改了物品，更新 goodsJson 并清除原始格式标记
      model.value.goodsJson = stringifyGoodsJson(items);
      originalGoodsJsonFormat.value = null;
    } else if (!originalGoodsJsonFormat.value || props.operateType === 'add') {
      // 新增模式或没有原始格式时，正常更新
      model.value.goodsJson = stringifyGoodsJson(items);
    }
    // 如果存在原始格式且 items 为空，不更新 goodsJson，保持原始格式
  }
}, { deep: true });

watch(visible, (newVal) => {
  if (newVal) {
    // 每次打开弹框时重置为手动添加标签页和导入统计（后续若是批量导入格式会再回显）
    activeTab.value = 'tab1';
    originalGoodsJsonFormat.value = null;
    importedDataInfo.value = null;
    // 新增模式下重置锁定 Tab
    if (props.operateType === 'add') {
      editLockedTab.value = null;
    }

    restoreValidation();
    getMailTemplateOptions();

    // 使用新增的帮助函数
    const currentTime = getCurrentFormattedTime();
    const oneMonthLaterTime = getOneMonthLaterFormattedTime();

    // 支持编辑模式和克隆模式（add 模式下有 rowData）
    if (props.rowData && (props.operateType === "edit" || props.operateType === "add")) {
      const data = props.rowData;
      const mailRolesJson = data.mailRolesJson || "[]";

      // 检查是否有 importToken
      const importToken = (data as any).importToken || "";
      let importCount = Number((data as any).importCount || 0);

      // 如果有 importToken 但 importCount 为 0，尝试从 mailRolesJson 解析数量
      if (importToken && importCount === 0) {
        const parsedRoles = parseRolesData(mailRolesJson);
        importCount = parsedRoles.length;
      }

      // 如果有 importToken，不解析角色数据；否则解析角色数据
      if (importToken && importCount > 0) {
        selectedRoles.value = [];
      } else {
        selectedRoles.value = parseRolesData(mailRolesJson);
      }

      // 先保存mailId值，以便后续设置正确的标题和内容状态
      const mailId = String(data.mailId || "8888");

      model.value = {
        mailRemark: data.mailRemark || "",
        mailId: mailId,
        mailTitle: data.mailTitle || "",
        mailExpire: data.mailExpire
          ? convertToString(Number(data.mailExpire))
          : currentTime,
        mailContent: data.mailContent || "",
        mailSendDate: data.mailSendDate || currentTime,
        goodsJson: data.goodsJson || '{"item_ids":[],"item_counts":[]}',
        mailRolesJson: data.mailRolesJson || "[]",
        importToken: importToken,
        importCount: importCount,
        top: null,
        audit: (data as any).audit ?? 0,
        iuids: (data as any).iuids || "",
      };

      // 初始化置顶状态（编辑/克隆时）
      const rawTop = (data as any).top;
      if (rawTop !== undefined && rawTop !== null && `${rawTop}` !== "") {
        topMode.value = "yes";
        model.value.top = Number(rawTop);
      } else {
        topMode.value = "no";
        model.value.top = null;
      }

      // 检查是否是补偿道具格式（item_counts 为空数组）
      let isCompensationFormat = false;
      // 检查是否是多对象数组格式（需要保持原始格式）
      let isMultiObjectArrayFormat = false;
      try {
        const goodsData = JSON.parse(model.value.goodsJson || '{"item_ids":[],"item_counts":[]}');
        const goodsArray = Array.isArray(goodsData) ? goodsData : [goodsData];

        // 检查是否是多对象数组格式（数组长度大于1，或数组长度为1但结构符合多对象格式）
        if (Array.isArray(goodsData) && goodsData.length > 1) {
          isMultiObjectArrayFormat = true;
          originalGoodsJsonFormat.value = model.value.goodsJson;
        }

        if (goodsArray.length > 0) {
          const firstGoods = goodsArray[0];
          // 如果 item_counts 为空数组或不存在，且 item_ids 不为空，则是补偿道具格式
          if (
            firstGoods.item_ids &&
            Array.isArray(firstGoods.item_ids) &&
            firstGoods.item_ids.length > 0 &&
            (!firstGoods.item_counts || (Array.isArray(firstGoods.item_counts) && firstGoods.item_counts.length === 0))
          ) {
            isCompensationFormat = true;
            // 补偿道具格式：回显到 iuids，但不回显到 selectedItems，并切换到补偿道具标签页
            let iuidsArray = firstGoods.item_ids.map((id: any) => String(id));
            // 兼容处理：如果只有一个元素且包含逗号（中文或英文），则按逗号分割
            if (iuidsArray.length === 1 && (iuidsArray[0].includes(',') || iuidsArray[0].includes('，'))) {
              iuidsArray = iuidsArray[0].split(/[,，]/).map(id => id.trim()).filter(id => id);
            }
            model.value.iuids = iuidsArray.join(',');
            selectedItems.value = [];
            activeTab.value = 'tab3';
            // 编辑模式下锁定 Tab
            if (props.operateType === 'edit') {
              editLockedTab.value = 'tab3';
            }
          }
        }
      } catch (e) {
        // 解析失败时忽略
      }

      // 如果是多对象数组格式，保持原始格式，不解析到 selectedItems，并回显为「批量导入」状态
      if (isMultiObjectArrayFormat) {
        // 保持原始 goodsJson，不解析到 selectedItems
        selectedItems.value = [];
        // 编辑时回显：切换到批量导入标签页，并显示「共导入 X 个角色 / X 组物品」
        activeTab.value = 'tab2';
        // 编辑模式下锁定 Tab
        if (props.operateType === 'edit') {
          editLockedTab.value = 'tab2';
        }
        try {
          const goodsData = JSON.parse(model.value.goodsJson || '[]');
          const goodsCount = Array.isArray(goodsData) ? goodsData.length : 0;
          const roleCount =
            importToken && importCount > 0
              ? importCount
              : parseRolesData(model.value.mailRolesJson || '[]').length;
          importedDataInfo.value = { goodsCount, roleCount };
        } catch {
          importedDataInfo.value = null;
        }
      } else if (!isCompensationFormat) {
        // 如果不是补偿道具格式，才回显到 selectedItems
        selectedItems.value = parseGoodsJson(model.value.goodsJson || '{"item_ids":[],"item_counts":[]}', itemData.value);
        // 编辑模式下锁定 Tab（手动添加）
        if (props.operateType === 'edit') {
          editLockedTab.value = 'tab1';
        }
      }

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
    } else {
      model.value = {
        ...createDefaultModel(),
        mailExpire: oneMonthLaterTime,
        mailSendDate: currentTime,
      };
      selectedItems.value = [];
      selectedRoles.value = [];

      // 默认选择1天 - 使用 nextTick 确保组件已渲染
      nextTick(() => {
        customTimeDurationRef.value?.reset();
      });
    }
  }
});

watch(
  () => props.rowData,
  async (newVal) => {
    if (visible.value && props.operateType === "edit" && newVal) {
      if (mailTemplateOptions.value.length === 0) {
        await getMailTemplateOptions();
      }

      const data = newVal;

      const mailExpireDate = data.mailExpire
        ? convertToString(Number(data.mailExpire))
        : "";
      const mailSendDate = data.mailSendDate || "";

      const mailId = String(data.mailId || "8888");

      // 检查是否有 importToken
      const importToken = (data as any).importToken || "";
      let importCount = Number((data as any).importCount || 0);

      // 如果有 importToken 但 importCount 为 0，尝试从 mailRolesJson 解析数量
      if (importToken && importCount === 0) {
        const mailRolesJson = data.mailRolesJson || "[]";
        const parsedRoles = parseRolesData(mailRolesJson);
        importCount = parsedRoles.length;
      }

      model.value = {
        mailRemark: data.mailRemark || "",
        mailId: mailId,
        mailTitle: data.mailTitle || "",
        mailExpire: mailExpireDate,
        mailSendDate: mailSendDate,
        mailContent: data.mailContent || "",
        goodsJson: data.goodsJson || '{"item_ids":[],"item_counts":[]}',
        mailRolesJson: data.mailRolesJson || "[]",
        importToken: importToken,
        importCount: importCount,
        top: null,
        audit: (data as any).audit ?? 0,
        iuids: (data as any).iuids || "",
      };

      // 初始化置顶状态（编辑时）
      const rawTop = (data as any).top;
      if (rawTop !== undefined && rawTop !== null && `${rawTop}` !== "") {
        topMode.value = "yes";
        model.value.top = Number(rawTop);
      } else {
        topMode.value = "no";
        model.value.top = null;
      }

      if (model.value.goodsJson) {
        try {
          const goodsData = JSON.parse(model.value.goodsJson);

          // 检查是否是多对象数组格式（需要保持原始格式）
          let isMultiObjectArrayFormat = false;
          if (Array.isArray(goodsData) && goodsData.length > 1) {
            isMultiObjectArrayFormat = true;
            // 保存原始格式
            originalGoodsJsonFormat.value = model.value.goodsJson;
            // 多对象数组格式：保持原始 goodsJson，不解析到 selectedItems
            selectedItems.value = [];
            // 编辑模式下锁定 Tab（批量导入）
            activeTab.value = 'tab2';
            editLockedTab.value = 'tab2';
          } else {
            // 处理可能是数组或对象的情况
            let itemIds: any[] = [];
            let itemCounts: any[] = [];

            if (Array.isArray(goodsData)) {
              // 如果是数组格式 [{"item_ids": [...], "item_counts": [...]}]
              goodsData.forEach(group => {
                if (group.item_ids) {
                  itemIds = itemIds.concat(group.item_ids);
                }
                if (group.item_counts) {
                  itemCounts = itemCounts.concat(group.item_counts);
                }
              });
            } else {
              // 如果是单个对象格式 {"item_ids": [...], "item_counts": [...]}
              itemIds = goodsData.item_ids || [];
              itemCounts = goodsData.item_counts || [];
            }

            // 检查是否是补偿道具格式（item_counts 为空数组）
            const goodsArray = Array.isArray(goodsData) ? goodsData : [goodsData];
            let isCompensationFormat = false;
            if (goodsArray.length > 0) {
              const firstGoods = goodsArray[0];
              // 如果 item_counts 为空数组或不存在，且 item_ids 不为空，则是补偿道具格式
              if (
                firstGoods.item_ids &&
                Array.isArray(firstGoods.item_ids) &&
                firstGoods.item_ids.length > 0 &&
                (!firstGoods.item_counts || (Array.isArray(firstGoods.item_counts) && firstGoods.item_counts.length === 0))
              ) {
                isCompensationFormat = true;
                // 补偿道具格式：回显到 iuids，但不回显到 selectedItems，并切换到补偿道具标签页
                let iuidsArray = firstGoods.item_ids.map((id: any) => String(id));
                // 兼容处理：如果只有一个元素且包含逗号（中文或英文），则按逗号分割
                if (iuidsArray.length === 1 && (iuidsArray[0].includes(',') || iuidsArray[0].includes('，'))) {
                  iuidsArray = iuidsArray[0].split(/[,，]/).map(id => id.trim()).filter(id => id);
                }
                model.value.iuids = iuidsArray.join(',');
                selectedItems.value = [];
                activeTab.value = 'tab3';
                // 编辑模式下锁定 Tab
                editLockedTab.value = 'tab3';
              }
            }

            // 如果不是补偿道具格式，才回显到 selectedItems
            if (!isCompensationFormat) {
              selectedItems.value = itemIds.map((id: any, index: number) => {
                let itemInfo = {
                  name: String(id),
                  names: "",
                  trade: undefined as boolean | undefined,
                };

                if (itemData.value?.data?.item) {
                  const item = itemData.value.data.item[id];
                  if (item) {
                    itemInfo = {
                      name: item.name || String(id),
                      names: item.names || "",
                      trade: item.trade,
                    };
                  }
                }

                return {
                  id: String(id),
                  name: itemInfo.name,
                  names: itemInfo.names,
                  count: Number(itemCounts[index]) || 1,
                  trade: itemInfo.trade,
                };
              });
              // 编辑模式下锁定 Tab（手动添加）
              activeTab.value = 'tab1';
              editLockedTab.value = 'tab1';
            }
          }
        } catch (e) {
          console.error("解析 goodsJson 失败:", e);
          selectedItems.value = [];
        }
      } else {
        selectedItems.value = [];
      }

      // 处理角色数据 - 如果有 importToken，不解析角色数据
      if (importToken && importCount > 0) {
        selectedRoles.value = [];
      } else {
        const mailRolesJson = data.mailRolesJson || "[]";
        selectedRoles.value = parseRolesData(mailRolesJson);
      }

      // 使用 nextTick 确保组件已渲染
      nextTick(() => {
        if (data.mailExpire) {
          const mailExpireTime = Number(data.mailExpire);
          customTimeDurationRef.value?.setFromSeconds(mailExpireTime);
        } else {
          customTimeDurationRef.value?.reset();
        }
      });
    }
  },
  { immediate: true }
);

const selectedRoles = ref<
  { id: string; name: string; serverId: number; serverName?: string }[]
>([]);

// 更新 mailRolesJson
function updateMailRolesJson() {
  const rolesData = selectedRoles.value.map((role) => ({
    openId: role.id,
    serverId: role.serverId || 1,
    roleId: role.id,
    roleName: role.name,
    serverName: role.serverName || "",
  }));
  model.value.mailRolesJson = JSON.stringify(rolesData);
}

// 监听角色变化，更新 mailRolesJson
watch(selectedRoles, () => {
  updateMailRolesJson();
}, { deep: true });

const rules: Record<string, App.Global.FormRule | App.Global.FormRule[]> = {
  mailRemark: { ...defaultRequiredRule, trigger: ["input", "blur"] },
  mailTitle: { ...defaultRequiredRule, trigger: ["input", "blur"] },
  mailContent: { ...defaultRequiredRule, trigger: ["input", "blur"] },
  mailId: { ...defaultRequiredRule, trigger: ["change", "blur"] },
  mailExpire: { ...defaultRequiredRule, trigger: ["change", "blur"] },
  mailSendDate: { ...defaultRequiredRule, trigger: ["change", "blur"] },
};

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

// Tab 切换状态
const activeTab = ref<'tab1' | 'tab2' | 'tab3'>('tab1');
/** 编辑模式下锁定的 Tab：手动添加=tab1，批量导入=tab2，补偿道具=tab3；仅编辑时生效，新增为 null */
const editLockedTab = ref<'tab1' | 'tab2' | 'tab3' | null>(null);

// 批量导入模态框
const batchImportModalVisible = ref(false);

// 导入统计信息
const importedDataInfo = ref<{
  goodsCount: number;
  roleCount: number;
} | null>(null);

/** 是否为导入的邮件（批量导入）：导入的邮件不显示角色信息 */
const isImportedMail = computed(
  () =>
    !!originalGoodsJsonFormat.value ||
    (!!model.value.importToken && Number(model.value.importCount) > 0)
);

// 打开批量导入弹窗
function openBatchImportModal() {
  batchImportModalVisible.value = true;
}

// 批量导入成功后的回调
function onBatchImportSuccess(importedData: any) {
  if (importedData) {
    // 处理物品数据
    if (importedData.goodsJson && Array.isArray(importedData.goodsJson)) {
      model.value.goodsJson = JSON.stringify(importedData.goodsJson);
    } else {
      model.value.goodsJson = '';
    }

    // 处理角色数据
    if (importedData.mailRolesJson && Array.isArray(importedData.mailRolesJson)) {
      model.value.mailRolesJson = JSON.stringify(importedData.mailRolesJson);
    } else {
      model.value.mailRolesJson = '';
    }

    // 保存导入统计信息
    const goodsCount = importedData.goodsJson?.length || 0;
    const roleCount = importedData.mailRolesJson?.length || 0;

    importedDataInfo.value = {
      goodsCount,
      roleCount,
    };

    window.$message?.success(
      `导入成功！共导入 ${roleCount} 个角色，${goodsCount} 组物品`
    );
  }

  batchImportModalVisible.value = false;
}

// 清除导入的数据
function clearImportedData() {
  // 清空表单中的导入数据
  model.value.goodsJson = '';
  model.value.mailRolesJson = '';
  // 清空统计信息
  importedDataInfo.value = null;

  window.$message?.success("已清除导入的数据");
}

// 处理 Tab 切换：编辑模式下如果 Tab 已锁定，阻止切换
function handleTabUpdate(value: 'tab1' | 'tab2' | 'tab3') {
  // 如果编辑模式下 Tab 已锁定，且尝试切换到其他 Tab，则阻止
  if (editLockedTab.value && editLockedTab.value !== value) {
    return;
  }
  activeTab.value = value;
}
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
              :disabled="isTemplateSelected || readonlyMode"
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
              :disabled="isTemplateSelected || readonlyMode"
            />
          </NFormItemGi>


            <!-- 置顶设置（新增/编辑） -->
             <NFormItemGi
            span="24 "
            :label="$t('page.manage.operateserver.isTop')"
          >
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
            span="24 m:24"
            :label="$t('page.manage.operateserver.mailSendDate')"
            path="mailSendDate"
          >
            <NDatePicker
              v-model:value="mailSendDateTimestamp"
              type="datetime"
              :placeholder="$t('page.manage.operateserver.form.mailSendDate')"
              value-format="yyyy-MM-dd HH:mm:ss"
              style="width: 100%"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <!-- 自定义时长组件 -->
          <NFormItemGi span="24 ">
            <CustomTimeDuration
              ref="customTimeDurationRef"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <!-- 新增 Tab 切换区域 -->
          <NFormItemGi span="24">
            <NTabs
              :value="activeTab"
              type="line"
              animated
              :class="{ 'tab-locked': editLockedTab !== null }"
              @update:value="handleTabUpdate"
            >
              <NTabPane name="tab1" tab="手动添加">
                <div class="p-4">
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

          <!-- 导入的邮件不显示角色信息 -->
          <NFormItemGi
            v-if="!isImportedMail"
            span="24"
            :label="$t('page.manage.operateserver.userRole')"
            path="mailRolesJson"
          >
            <RoleSearchSelector
              v-model="selectedRoles"
              v-model:import-token="model.importToken"
              v-model:import-count="model.importCount"
              :readonly="readonlyMode"
              :placeholder="$t('page.manage.operateserver.form.userRole')"
            />
          </NFormItemGi>
                </div>
              </NTabPane>
              <NTabPane name="tab2" tab="批量导入">
                <div class="p-4">
                  <!-- 提示信息 -->
                  <NAlert type="info" :show-icon="true" class="mb-4">
                    <div>
                      <div>点击下方按钮选择要导入的文件，支持批量导入角色和物品数据</div>
                    </div>
                  </NAlert>

                  <!-- 操作按钮 -->
                  <div class="mb-4">
                    <NButton
                      type="primary"
                      :disabled="readonlyMode"
                      @click="openBatchImportModal"
                    >
                      <template #icon>
                        <icon-mdi-upload class="text-icon" />
                      </template>
                      批量导入
                    </NButton>
                  </div>

                  <!-- 导入成功的数据统计 -->
                  <div v-if="importedDataInfo" class="mb-4">
                    <NAlert type="success" :show-icon="true" :closable="false">
                      <template #icon>
                        <icon-mdi-check-circle class="text-lg" />
                      </template>
                      <div class="flex items-start justify-between">
                        <div class="flex-1">
                          <div class="font-medium mb-1">导入成功！</div>
                          <div class="text-sm space-y-1">
                            <div>• 共导入 <span class="font-semibold text-primary">{{ importedDataInfo.roleCount }}</span> 个角色</div>
                            <div>• 共导入 <span class="font-semibold text-primary">{{ importedDataInfo.goodsCount }}</span> 组物品</div>
                            <div class="mt-1 text-gray-500">数据已自动填充到表单，请继续填写其他信息</div>
                          </div>
                        </div>
                        <NButton
                          text
                          type="error"
                          size="small"
                          :disabled="readonlyMode"
                          @click="clearImportedData"
                        >
                          <template #icon>
                            <icon-mdi-delete class="text-icon" />
                          </template>
                          删除
                        </NButton>
                      </div>
                    </NAlert>
                  </div>
                </div>
              </NTabPane>
              <NTabPane name="tab3" tab="补偿道具">
                <div class="p-4">
                  <NFormItemGi
                    span="24"
                    label="iuids"
                  >
                    <div class="w-full">
                      <NInput
                        v-model:value="model.iuids"
                        placeholder="请输入iuids"
                        :disabled="readonlyMode"
                      />
                      <div class="text-xs text-gray-500 mt-6px flex items-center gap-4px">
                        <div class="w-1 h-1 bg-gray rounded-full"></div>
                        <span>输入的ID以逗号分隔，例如：1000008,1000009</span>
                      </div>
                    </div>
                  </NFormItemGi>

                  <!-- 导入的邮件不显示角色信息 -->
                  <NFormItemGi
                    v-if="!isImportedMail"
                    span="24"
                    :label="$t('page.manage.operateserver.userRole')"
                    path="mailRolesJson"
                  >
                    <RoleSearchSelector
                      v-model="selectedRoles"
                      v-model:import-token="model.importToken"
                      v-model:import-count="model.importCount"
                      :readonly="readonlyMode"
                      :placeholder="$t('page.manage.operateserver.form.userRole')"
                    />
                  </NFormItemGi>
                </div>
              </NTabPane>
            </NTabs>
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

  <!-- 批量导入模态框 -->
  <BatchImportModal
    v-model:visible="batchImportModalVisible"
    @success="onBatchImportSuccess"
  />
</template>

<style scoped>
/* 编辑模式下锁定 Tab 时，禁用其他 Tab 的点击 */
:deep(.tab-locked .n-tabs-tab:not(.n-tabs-tab--active)) {
  pointer-events: none;
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
