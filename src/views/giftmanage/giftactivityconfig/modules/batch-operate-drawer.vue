<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NInputNumber,
  NButton,
  NSpace,
} from "naive-ui";
import {
  fetchAddGiftBatch,
  fetchAddGiftBatchPublic,
  fetchUpdateGiftBatch,
} from "@/service/api/game-manage";
import { useNaiveForm, useFormRules } from "@/hooks/common/form";
import { $t } from "@/locales";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import { giftActivityTypeOptions } from '@/constants/business';

interface Props {
  /** 操作类型 */
  operateType: NaiveUI.TableOperateType;
  /** 编辑的行数据 */
  rowData?: any | null;
  /** 活动ID */
  activityId?: number | null;
  /** 活动名称 */
  activityName?: string;
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
    add: $t("page.manage.giftactivity.batchlist.addBatch"),
    edit: $t("page.manage.giftactivity.batchlist.editBatch"),
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.SystemManage.giftBatch,
  | "campaignId"
  | "codeType"
  | "codePrefix"
  | "codeLen"
  | "amount"
  | "maxRedeemCount"
  | "customUsePrefixOnly"
> & {
  activityName: string;
};

const model = ref(createDefaultModel());
const loading = ref(false);

// 计算属性：判断是否为通码
const isPublicCode = computed(() => model.value.codeType === "1");

// 监听兑换码长度变化，自动设置customUsePrefixOnly
watch(() => model.value.codeLen, (newVal) => {
  if (isPublicCode.value) {
    model.value.customUsePrefixOnly = (!newVal || newVal === "" || newVal === "0") ? "1" : "0";
  }
});

// 监听兑换码类型变化，切换时清空前缀
watch(() => model.value.codeType, () => {
  model.value.codePrefix = "";
});

function createDefaultModel(): Model {
  return {
    campaignId: "",
    codeType: "1",
    codePrefix: "",
    codeLen:null,
    amount: null,
    maxRedeemCount: null,
    customUsePrefixOnly: "",
    activityName: "",
  };
}

// 表单验证规则
const rules = computed(() => ({
  campaignId: defaultRequiredRule,
  codeType: defaultRequiredRule,
  amount: defaultRequiredRule,
  maxRedeemCount: defaultRequiredRule,
  codePrefix: [
    {
      validator: (rule: any, value: string) => {
        if (!value) return true; // 允许为空

        if (isPublicCode.value) {
          // 通码：最少6位
          if (value.length < 6) {
            return new Error($t('page.manage.giftactivity.batchlist.example.prefixMinLength', { min: 6 }));
          }
        } else {
          // 专码：最多4位
          if (value.length > 4) {
            return new Error($t('page.manage.giftactivity.batchlist.example.prefixMaxLength', { max: 4 }));
          }
        }
        return true;
      },
      trigger: ['input', 'blur']
    }
  ]
}));

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === "edit" && props.rowData) {
    Object.assign(model.value, {
      campaignId: props.rowData.campaignId || "",
      codeType: String(props.rowData.codeType || 1),
      codePrefix: props.rowData.codePrefix || "",
      codeLen: Number(props.rowData.codeLen || 6),
      amount: Number(props.rowData.amount),
      maxRedeemCount: Number(props.rowData.maxRedeemCount || 1),
      customUsePrefixOnly: String(props.rowData.customUsePrefixOnly || 0),
      activityName: props.rowData.activityName || "",
    });
  } else if (props.operateType === "add") {
    // 新增时设置活动ID和名称
    if (props.activityId) {
      model.value.campaignId = String(props.activityId);
    }
    if (props.activityName) {
      model.value.activityName = props.activityName;
    }
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  try {
    loading.value = true;

    let response;
    if (props.operateType === "add") {
      if (Number(model.value.codeType) === 1) {
        const codeLen = model.value.codeLen ? Number(model.value.codeLen) : 6;
        const publicSubmitData = {
          campaignId: Number(model.value.campaignId),
          codePrefix: model.value.codePrefix,
          codeLen: codeLen,
          amount: 1, // 通码情况下固定传递1
          maxRedeemCount: Number(model.value.maxRedeemCount),
          customUsePrefixOnly: (!model.value.codeLen || model.value.codeLen === 0),
        };
        response = await fetchAddGiftBatchPublic(publicSubmitData);
      } else {
        // 专码参数结构
        const uniqueSubmitData = {
          campaignId: Number(model.value.campaignId),
          channelId: null, // 默认传递0
          codePrefix: model.value.codePrefix,
          codeLen: Number(model.value.codeLen),
          amount: Number(model.value.amount),
        };
        response = await fetchAddGiftBatch(uniqueSubmitData);
      }

      // 使用统一的错误处理函数
      if (handleApiResponseError(response, "新增")) {
        return;
      }

      window.$message?.success($t("page.manage.giftactivity.batchlist.addBatchSuccess"));
    } else {
      // 编辑模式 - 通码情况下如果没有填写随机码长度，默认给6位
      const codeLen = (Number(model.value.codeType) === 1 && (!model.value.codeLen || model.value.codeLen === 0))
        ? 6
        : Number(model.value.codeLen);

      const editSubmitData = {
        campaignId: Number(model.value.campaignId),
        codePrefix: model.value.codePrefix,
        codeLen: codeLen,
        amount:
          Number(model.value.codeType) === 1 ? 1 : Number(model.value.amount),
        maxRedeemCount: Number(model.value.maxRedeemCount),
        customUsePrefixOnly: (!model.value.codeLen || model.value.codeLen === "" || model.value.codeLen === "0"),
        id: props.rowData?.id,
      };

      response = await fetchUpdateGiftBatch(editSubmitData);

      // 使用统一的错误处理函数
      if (handleApiResponseError(response, "更新")) {
        return;
      }

      window.$message?.success($t("page.manage.giftactivity.batchlist.updateBatchSuccess"));
    }

    closeDrawer();
    emit("submitted");
  } catch (error) {
    handleApiCatchError(error, props.operateType === "add" ? "新增" : "更新");
  } finally {
    loading.value = false;
  }
}

// 获取显示的长度
function getDisplayLength() {
  const length = Number(model.value.codeLen);
  if (length && length > 0) {
    return length;
  }
  return '?';
}

// 生成示例兑换码
function generateExampleCodes() {
  const prefix = model.value.codePrefix;
  const length = Number(model.value.codeLen);

  // 如果没有输入长度，显示提示
  if (!length || length <= 0) {
    return $t('page.manage.giftactivity.batchlist.form.randomCodeLength');
  }

  // 生成3个示例兑换码
  const examples = [];
  for (let i = 0; i < 3; i++) {
    let randomCode = '';
    for (let j = 0; j < length; j++) {
      randomCode += Math.floor(Math.random() * 10);
    }
    // 如果有前缀就用连字符连接，没有前缀就直接显示随机码
    const fullCode = prefix ? prefix + '-' + randomCode : randomCode;
    examples.push(fullCode);
  }

  return examples.join('、');
}

// 监听抽屉显示状态
watch(visible, async (newVal) => {
  if (newVal) {
    restoreValidation();
    handleInitModel();
  }
});
</script>

<template>
  <NDrawer
    v-model:show="visible"
    width="500px"
    placement="right"
    :trap-focus="false"
    :block-scroll="false"
  >
    <NDrawerContent :title="title" closable>
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="top"
        label-width="auto"
      >
        <NFormItem :label="$t('page.manage.giftactivity.name')" path="activityName">
          <NInput
            v-model:value="model.activityName"
            :readonly="true"
            disabled
          />
        </NFormItem>

        <NFormItem :label="$t('page.manage.giftactivity.batchlist.codeType')" path="codeType">
          <NSelect
            v-model:value="model.codeType"
            :placeholder="$t('page.manage.giftactivity.batchlist.codeType')"
            :options="giftActivityTypeOptions"
          />
        </NFormItem>

        <NFormItem path="codePrefix">
          <template #label>
            <div>
              <span>{{$t('page.manage.giftactivity.batchlist.codePrefix')}}</span>
              <span style="color: #999; font-size: 12px; margin-left: 8px;">
                {{ isPublicCode ? '(最少6位)' : '(最多4位)' }}
              </span>
            </div>
          </template>
          <NInput
            v-model:value="model.codePrefix"
            :placeholder="
              isPublicCode && (!model.codeLen || model.codeLen === '' || model.codeLen === '0')
                ? $t('page.manage.giftactivity.batchlist.form.codePrefix')
                : $t('page.manage.giftactivity.batchlist.form.codePrefixPlaceholder')
            "
            :maxlength="isPublicCode ? undefined : 4"
            :minlength="isPublicCode ? 6 : undefined"
            clearable
          />
        </NFormItem>

        <!-- 兑换码长度字段始终显示 -->
        <NFormItem
          :label="$t('page.manage.giftactivity.batchlist.randomCodeLength')"
          path="codeLen"
        >
          <NInputNumber
            v-model:value="model.codeLen"
            :placeholder="$t('page.manage.giftactivity.batchlist.form.randomCodeLength')"
            :min="6"
            :max="12"
            style="width: 100%"
          />
        </NFormItem>

        <NFormItem v-if="!isPublicCode" :label="$t('page.manage.giftactivity.batchlist.amount')" path="amount">
          <NInputNumber
            v-model:value="model.amount"
            :placeholder="$t('page.manage.giftactivity.batchlist.form.amount')"
            :min="1"
            :max="100000"
             style="width: 100%"
          />
        </NFormItem>

        <!-- 通码类型下显示领取数量 -->
        <NFormItem v-if="isPublicCode" :label="$t('page.manage.giftactivity.batchlist.maxRedeemCount')" path="maxRedeemCount">
          <NInputNumber
            v-model:value="model.maxRedeemCount"
            :placeholder="$t('page.manage.giftactivity.batchlist.form.maxRedeemCount')"
            :min="1"
            :max="999999999999"
            style="width: 100%"
          />
        </NFormItem>
      </NForm>

      <!-- 动态示例说明 - 始终显示 -->
      <div style="padding: 16px; background-color: #f8f9fa; border-radius: 6px; margin-bottom: 16px; border: 1px solid #e9ecef;">
        <div style="font-size: 14px; font-weight: 500; color: #333; margin-bottom: 8px;">
          {{$t('page.manage.giftactivity.batchlist.example.title')}}
        </div>
        <div style="font-size: 13px; color: #666; line-height: 1.6;">
          <div style="margin-bottom: 4px;">
            {{$t('page.manage.giftactivity.batchlist.example.inputPrefix', { prefix: model.codePrefix, length: model.codeLen || $t('page.manage.giftactivity.batchlist.form.randomCodeLength') })}}
          </div>
          <div style="margin-bottom: 4px;">
            {{$t('page.manage.giftactivity.batchlist.example.result', { prefix: model.codePrefix, length: getDisplayLength() })}}
          </div>
          <div style="color: #52c41a; font-weight: 500;">
            {{$t('page.manage.giftactivity.batchlist.example.generated', { code: generateExampleCodes() })}}
          </div>
        </div>
      </div>

      <template #footer>
        <NSpace justify="end" :size="16">
        <NButton @click="closeDrawer">{{ $t("common.cancel") }}</NButton>
        <NButton type="primary" @click="handleSubmit">{{
          $t("common.confirm")
        }}</NButton>
      </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.n-form {
  margin-bottom: 24px;
}
</style>
