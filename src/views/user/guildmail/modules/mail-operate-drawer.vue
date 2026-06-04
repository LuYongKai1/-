<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from "vue";
import type { Ref } from 'vue';
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import type { FormRules, FormItemRule, FormInst } from 'naive-ui';
import {
  fetchGetMailTemplateList,
  fetchGetGuildList,
  fetchAddGuildMail,
  fetchUpdateGuildMail,
} from "@/service/api";
import { $t } from "@/locales";
import { useThemeStore } from '@/store/modules/theme';
import { useItemPackage } from '@/hooks/business/useItemPackage';
import ItemSearchSelector from '@/components/business/item-search-selector.vue';
import CustomTimeDuration from '@/components/business/custom-time-duration.vue';
import { type ItemInfo, parseGoodsJson, stringifyGoodsJson } from '@/utils/item';
import GuildSearchSelector, { type GuildInfo } from '@/components/business/guild-search-selector.vue';
import JSONbig from 'json-bigint';

defineOptions({
  name: "MailOperateDrawer",
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: (Api.SystemManage.operateGuild & { mailStatus?: number, isReadonly?: boolean }) | null;
  /** mail status to determine read-only mode */
  mailStatus?: number;
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
const { defaultRequiredRule } = useFormRules();

// 表单验证规则
const rules: Record<string, FormRules | FormItemRule> = {
  mailRemark: { ...defaultRequiredRule, trigger: ['input', 'blur'] },
  mailId: { ...defaultRequiredRule, trigger: ['change', 'blur'] },
  mailTitle: { ...defaultRequiredRule, trigger: ['input', 'blur'] },
  mailContent: { ...defaultRequiredRule, trigger: ['input', 'blur'] },
};

// 判断是否为只读模式（邮件已发送）
const readonlyMode = computed(() => {
  // 优先外部传入
  if (typeof props.readonly === 'boolean') return props.readonly;
  // 兼容旧逻辑
  return props.rowData?.isReadonly || props.rowData?.mailStatus === 1 ||
         props.rowData?.mailStatus === 2 ||
         props.rowData?.mailStatus === 3 ||
         props.rowData?.mailStatus === 4;
});

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t("page.manage.mailGuildController.addservermail"),
    edit: $t("page.manage.mailGuildController.editservermail"),
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.SystemManage.operateGuild,
  | "mailRemark"
  | "mailId"
  | "mailTitle"
  | "mailExpire"
  | "mailContent"
  | "mailSendDate"
  | "goodsJson"
  | "mailGuildJson"
> & {
  importToken?: string;
  top?: number | null;
};

const model = ref(createDefaultModel());

// 时间格式化辅助函数
function getCurrentFormattedTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getOneMonthLaterFormattedTime(): string {
  const now = new Date();
  now.setMonth(now.getMonth() + 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function convertToString(timestamp: number | null): string {
  if (!timestamp) return '';
  try {
    const milliseconds = String(timestamp).length === 10 ? timestamp * 1000 : timestamp;
    const date = new Date(milliseconds);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return '';
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
    goodsJson: "",
    mailGuildJson: "",
    importToken: "",
    top: null,
  };
}

// 自定义时长组件引用
const customTimeDurationRef = ref<InstanceType<typeof CustomTimeDuration> | null>(null);

// 计算过期时间秒数（使用组件提供的方法）
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
      model.value.mailSendDate = '';
    } else {
      const date = new Date(val);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      model.value.mailSendDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  }
});

// 邮件模板相关
interface MailTemplateOption extends CommonType.Option<string> {
  template: {
    title: string;
    content: string;
  };
}
const mailTemplateOptions = ref<MailTemplateOption[]>([]);


const isTemplateSelected = computed(() => !!model.value.mailId && model.value.mailId !== "8888");

async function getMailTemplateOptions() {
  const data = await fetchGetMailTemplateList();
  const responseData = data?.response?.data as { mails?: any[] };
  if (responseData && responseData.mails) {
    mailTemplateOptions.value = responseData.mails.map((item: any) => ({
      label: `${item.title_str} (${item.name_str})`,
      value: String(item.mail_id),
      template: {
        title: item.title_str,
        content: item.description_str
      }
    }));

    mailTemplateOptions.value.unshift({
      label: "自定义模板",
      value: "8888",
      template: {
        title: "",
        content: ""
      }
    });
  }
}

// 邮件模板选择处理
function handleTemplateChange(mailId: string | null) {
  if (mailId) {
    if (mailId === "8888") {
      model.value.mailTitle = '';
      model.value.mailContent = '';
    } else {
      const selectedTemplate = mailTemplateOptions.value.find(
        option => option.value === mailId
      );
      if (selectedTemplate) {
        model.value.mailTitle = selectedTemplate.template.title;
        model.value.mailContent = selectedTemplate.template.content;
      }
    }
  } else {
    model.value.mailTitle = '';
    model.value.mailContent = '';
  }
}

// 监听mailId的变化
watch(() => model.value.mailId, (newVal) => {
  handleTemplateChange(newVal);
  restoreValidation();
});

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
      selectedItems.value.forEach(item => {
        itemIds.push(Number(item.id));
        itemCounts.push(Number(item.count));
      });

      model.value.goodsJson = JSON.stringify({
        item_ids: itemIds,
        item_counts: itemCounts
      });
    } else {
      model.value.goodsJson = '{"item_ids": [], "item_counts": []}';
    }

    const expireSeconds = mailExpireSeconds.value;

    // 置顶：选择“是”传数值；选择“否”传空字符串
    const topValue =
      topMode.value === "yes" &&
      model.value.top !== null &&
      model.value.top !== undefined
        ? Number(model.value.top)
        : "";

    const data = {
      id: props.rowData?.id,
      mailRemark: model.value.mailRemark,
      mailId: model.value.mailId,
      mailTitle: model.value.mailTitle,
      mailExpire: expireSeconds,
      mailContent: model.value.mailContent,
      mailSendDate: model.value.mailSendDate,
      goodsJson: model.value.goodsJson,
      mailGuildJson: model.value.mailGuildJson,
      mailType: 1,
      gameId: 101,
      importToken: guildImportToken.value || "",
      top: topValue,
    };

    if (props.operateType === "add") {
      await fetchAddGuildMail(data);
      window.$message?.success($t("common.addSuccess"));
      // 清空状态
      selectedItems.value = [];
      selectedGuilds.value = [];
      guildImportToken.value = '';
      guildImportCount.value = 0;
    } else {
      await fetchUpdateGuildMail(data);
      window.$message?.success($t("common.updateSuccess"));
    }
    closeDrawer();
    emit("submitted");
  } catch (error) {
    console.error('提交失败:', error);
  }
}

// 物品搜索相关 - 使用封装的组件
const selectedItems = ref<ItemInfo[]>([]);
const itemData = ref<any>(null);

// 监听物品变化，更新 goodsJson
watch(selectedItems, (items) => {
  model.value.goodsJson = stringifyGoodsJson(items);
}, { deep: true });

// 公会搜索相关 - 使用封装的组件
const selectedGuilds = ref<GuildInfo[]>([]);
const guildImportToken = ref<string>('');
const guildImportCount = ref<number>(0);

onMounted(async () => {
  try {
    const data = await useItemPackage();
    itemData.value = data;
  } catch (error) {
    console.error("获取物品数据失败:", error);
    itemData.value = null;
  }
});

// 防抖函数
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


// 公会搜索处理函数 - 为 GuildSearchSelector 组件提供
async function handleGuildSearch(value: string): Promise<GuildInfo[]> {
  if (!value) {
    return [];
  }

  try {
    // 判断输入是否为纯数字（公会GUID）
    const isNumeric = /^\d+$/.test(value);

    const response = await fetchGetGuildList({
      guildName: isNumeric ? undefined : value,
      guildGuid: isNumeric ? value : undefined,
      current: 1,
      size: 100
    } as any);

    // 尝试多种可能的响应结构
    let responseData = response?.response?.data || response?.data || response;

    if (responseData && responseData.rows) {
      return responseData.rows.map((guild: any) => ({
        guid: guild.guildGuid || guild.guid,
        guild_name: guild.guildName || guild.guild_name || '',
        leader_name: guild.masterNickname || guild.leader_name || '',
        member_count: guild.currentMemberCount || guild.member_count || 0,
        serverId: guild.serverId || guild.server_id
      }));
    }
    return [];
  } catch (error) {
    console.error("搜索公会失败:", error);
    return [];
  }
}

// 监听公会变化，更新 mailGuildJson
watch(selectedGuilds, (guilds) => {
  // 如果没有导入token，使用搜索选择的公会
  if (!guildImportToken.value) {
    const guildsData = guilds.map((guild) => ({
      guildId: typeof guild.guid === 'string' ? guild.guid : String(guild.guid),
      guildName: guild.guild_name,
      serverId: guild.serverId
    }));
    // 使用JSONbig序列化，保持大整数为字符串
    model.value.mailGuildJson = JSONbig({ storeAsString: true }).stringify(guildsData);
  }
}, { deep: true });

// 监听导入token变化
watch([guildImportToken, guildImportCount], ([token, count]) => {
  if (token && count > 0) {
    // 清空搜索选择的公会
    selectedGuilds.value = [];
    // 清空 mailGuildJson，因为使用 importToken
    model.value.mailGuildJson = "[]";
  }
});

// 主要的监听器 - 处理表单初始化
watch(visible, async (newVal) => {
  if (newVal) {
    restoreValidation();
    await getMailTemplateOptions();
    // fetchItemData();

    // 清空搜索相关的状态已由组件处理

    const currentTime = getCurrentFormattedTime();
    const oneMonthLaterTime = getOneMonthLaterFormattedTime();

    if (props.operateType === 'edit' && props.rowData) {
      const data = props.rowData;

      // 检查是否有 importToken
      const importToken = (data as any).importToken || "";
      const importCount = Number((data as any).importCount || 0);

      model.value = {
        mailRemark: data.mailRemark || '',
        mailId: String(data.mailId || ''),
        mailTitle: data.mailTitle || '',
        mailExpire: data.mailExpire ? convertToString(Number(data.mailExpire)) : oneMonthLaterTime,
        mailContent: data.mailContent || '',
        mailSendDate: data.mailSendDate || currentTime,
        goodsJson: data.goodsJson || '{"item_ids":[],"item_counts":[]}',
        mailGuildJson: data.mailGuildJson || "[]",
        importToken: importToken,
        top: null,
      };

      // 处理物品数据 - 使用工具函数解析
      selectedItems.value = parseGoodsJson(model.value.goodsJson || '{"item_ids":[],"item_counts":[]}', itemData.value);

      // 处理公会数据 - 如果有 importToken，不解析公会数据
      if (importToken && importCount > 0) {
        selectedGuilds.value = [];
        guildImportToken.value = importToken;
        guildImportCount.value = importCount;
      } else {
        guildImportToken.value = '';
        guildImportCount.value = 0;
        if (data.mailGuildJson) {
          try {
            let guildData;
            // 处理可能的双重JSON编码，使用JSONbig保持大整数为字符串
            if (typeof data.mailGuildJson === 'string') {
              try {
                guildData = JSONbig({ storeAsString: true }).parse(data.mailGuildJson);
                // 如果解析结果还是字符串，再解析一次
                if (typeof guildData === 'string') {
                  guildData = JSONbig({ storeAsString: true }).parse(guildData);
                }
              } catch (parseError) {
                console.error('解析mailGuildJson失败:', parseError);
                guildData = [];
              }
            } else {
              guildData = data.mailGuildJson;
            }

            if (Array.isArray(guildData) && guildData.length > 0) {
              // 直接使用保存的基本信息（公会ID和名称）
              selectedGuilds.value = guildData.map((guild: any) => ({
                guid: guild.guildId || guild.guid || '',
                guild_name: guild.guildName || guild.guild_name || '',
                leader_name: guild.leader_name || guild.masterNickname || '',
                member_count: guild.member_count || guild.currentMemberCount || 0,
                serverId: guild.serverId || guild.server_id
              }));
            } else {
              selectedGuilds.value = [];
            }
          } catch (e) {
            console.error('处理mailGuildJson失败:', e, data.mailGuildJson);
            selectedGuilds.value = [];
          }
        } else {
          selectedGuilds.value = [];
        }
      }

      // 初始化置顶状态
      const rawTop = (data as any).top;
      if (rawTop !== undefined && rawTop !== null && `${rawTop}` !== "") {
        topMode.value = "yes";
        model.value.top = Number(rawTop);
      } else {
        topMode.value = "no";
        model.value.top = null;
      }

      // 设置时间选项 - 使用 nextTick 确保组件已渲染
      nextTick(() => {
        if (data.mailExpire) {
          const mailExpireTime = Number(data.mailExpire);
          customTimeDurationRef.value?.setFromSeconds(mailExpireTime);
        } else {
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
      selectedGuilds.value = [];
      guildImportToken.value = '';
      guildImportCount.value = 0;
      // 新增默认不置顶
      topMode.value = "no";
      model.value.top = null;

      // 默认选择1天 - 使用 nextTick 确保组件已渲染
      nextTick(() => {
        customTimeDurationRef.value?.reset();
      });
    }
  }
});

const themeStore = useThemeStore();
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
            :label="$t('page.manage.mailGuildController.mailRemark')"
            path="mailRemark"
          >
            <NInput
              v-model:value="model.mailRemark"
              :placeholder="$t('page.manage.mailGuildController.form.mailRemark')"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.mailGuildController.mailId')"
            path="mailId"
          >
            <NSelect
              v-model:value="model.mailId"
              :options="mailTemplateOptions"
              :placeholder="$t('page.manage.mailGuildController.form.mailId')"
              clearable
              @update:value="handleTemplateChange"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:24"
            :label="$t('page.manage.mailGuildController.mailTitle')"
            path="mailTitle"
          >
            <NInput
              v-model:value="model.mailTitle"
              :placeholder="$t('page.manage.mailGuildController.form.mailTitle')"
              :disabled="readonlyMode || isTemplateSelected"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.mailGuildController.mailContent')"
            path="mailContent"
          >
            <NInput
              v-model:value="model.mailContent"
              type="textarea"
              :placeholder="$t('page.manage.mailGuildController.form.mailContent')"
              :disabled="readonlyMode || isTemplateSelected"
            />
          </NFormItemGi>

               <!-- 置顶设置（新增/编辑） -->
               <NFormItemGi span="24" :label="$t('page.manage.mailGuildController.isTop')">
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
                :placeholder="$t('page.manage.mailGuildController.topPlaceholder')"
                :disabled="topMode !== 'yes' || readonlyMode"
                class="flex-1"
              />
            </div>
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.mailGuildController.mailSendDate')"
          >
            <NDatePicker
              v-model:value="mailSendDateTimestamp"
              type="datetime"
              :placeholder="$t('page.manage.mailGuildController.form.mailSendDate')"
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

          <NFormItemGi
            span="24"
            :label="$t('page.manage.mailGuildController.goodsJson')"
            path="goodsJson"
          >
            <ItemSearchSelector
              v-model="selectedItems"
              :readonly="readonlyMode"
              :placeholder="$t('page.manage.mailGuildController.form.goodsJson')"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.mailGuildController.mailGuildJson')"
          >
            <GuildSearchSelector
              v-model="selectedGuilds"
              v-model:import-token="guildImportToken"
              v-model:import-count="guildImportCount"
              :readonly="readonlyMode"
              :placeholder="$t('page.manage.mailGuildController.form.mailGuildJson')"
              :on-search="handleGuildSearch"
            />
          </NFormItemGi>

        </NGrid>
      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeDrawer">{{ $t("common.cancel") }}</NButton>
        <NButton type="primary" @click="handleSubmit" :disabled="readonlyMode">{{
          $t("common.confirm")
        }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
.n-input--disabled {
  cursor: not-allowed;
}
</style>

