<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import {  fetchAddChannel, fetchUpdateChannel, fetchAddChannelRelation } from "@/service/api";
import { $t } from "@/locales";
import { channelenableOptions, channelPlatformOptions } from "@/constants/business";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import ServerAllocation from './server-allocation.vue';

defineOptions({
  name: "channelOperateDrawer",
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.channel | null;
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

// 区服分配相关状态
const selectedServerIds = ref<string[]>([]);

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t("page.manage.channel.addchannel"),
    edit: $t("page.manage.channel.editChannel"),
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.SystemManage.channel,
  | "channelId"
  | "channelName"
  | "channelBriefName"
  | "enable"
> & {
  platform: string;
  openId?: string;
  productCode?: string;
  openKey?: string;
  baseUrl?: string;
};

const model = ref(createDefaultModel());

// 添加表单验证规则
const rules = {
  channelBriefName: defaultRequiredRule,
  platform: defaultRequiredRule,
  enable: defaultRequiredRule,
};

function createDefaultModel(): Model {
  return {
    channelId: "",
    channelName: "",
    channelBriefName: "",
    platform: "",
    enable: "",
    openId: "",
    productCode: "",
    openKey: "",
    baseUrl: "",
  };
}

// 是否禁用字段编辑
const isEditMode = computed(() => props.operateType === "edit");

function handleInitModel() {
  model.value = createDefaultModel();
  // 不在这里重置 selectedServerIds，让子组件根据 channelId 自动加载

  if (props.operateType === "edit" && props.rowData) {
    // 解析配置数据（可能是 JSON 字符串或对象）
    let configData: any = {};
    if (props.rowData.channelConfig) {
      try {
        configData = typeof props.rowData.channelConfig === 'string'
          ? JSON.parse(props.rowData.channelConfig)
          : props.rowData.channelConfig;
      } catch (e) {
        console.error('Failed to parse channelConfig:', e);
      }
    }

    Object.assign(model.value, {
      channelId: props.rowData.channelId || "",
      channelName: props.rowData.channelName || "",
      channelBriefName: props.rowData.channelBriefName || "",
      channelUserTotal: String(props.rowData.channelUserTotal ?? ""),
      platform: String(props.rowData.platform ?? ""),
      enable: String(props.rowData.enable ?? ""),
      openId: configData['open-id'] || configData.openId || "",
      productCode: configData['product-code'] || configData.productCode || "",
      openKey: configData['open-key'] || configData.openKey || "",
      baseUrl: configData['base-url'] || configData.baseUrl || "",
    });
  }
}


function closeDrawer() {
  visible.value = false;
}

// 判断是否为 PC 平台
const isPCPlatform = computed(() => model.value.platform === '1');

async function handleSubmit() {
  await validate();
  try {
    // 根据平台构建配置对象
    let config: any = {};
    if (isPCPlatform.value) {
      // PC 平台：open-id, product-code, open-key, base-url
      config = {
        'open-id': model.value.openId || '',
        'product-code': model.value.productCode || '',
        'open-key': model.value.openKey || '',
        'base-url': model.value.baseUrl || '',
      };
    } else {
      // 安卓和IOS：product-code, base-url
      config = {
        'product-code': model.value.productCode || '',
        'base-url': model.value.baseUrl || '',
      };
    }

    const userData = {
      channelId: model.value.channelId,
      channelName: model.value.channelName,
      channelBriefName: model.value.channelBriefName,
      platform: model.value.platform,
      enable: model.value.enable,
      channelConfig: JSON.stringify(config),
    };

    let channelId = model.value.channelId;
    let response;

    if (props.operateType === "add") {
      response = await fetchAddChannel(userData) as any;

      // 使用通用错误处理函数
      if (handleApiResponseError(response, $t("common.add"))) {
        return;
      }

      // 获取新创建的渠道ID
      channelId = response?.channelId || response?.id || channelId;
      window.$message?.success($t("common.addSuccess"));
    } else {
      response = await fetchUpdateChannel(userData);

      // 使用通用错误处理函数
      if (handleApiResponseError(response, $t("common.update"))) {
        return;
      }

      window.$message?.success($t("common.updateSuccess"));
    }

    // 保存区服分配关系（使用渠道名称）
    // 无论是否选择区服都要保存，空数组表示可查看所有区服
    if (model.value.channelName) {
      const serverIds = selectedServerIds.value.map(id => Number(id));
      const relationResponse = await fetchAddChannelRelation({
        channelId: model.value.channelName,
        serverIds
      });

      // 检查区服分配关系保存是否成功
      if (handleApiResponseError(relationResponse, "保存区服分配")) {
        return;
      }
    }

    closeDrawer();
    emit("submitted");
  } catch (error: any) {
    // 表单验证错误不显示错误消息
    if (error instanceof Error && error.message.includes("validation")) {
      return;
    }
    // 使用统一的异常处理函数
    handleApiCatchError(error, props.operateType === "add" ? $t("common.add") : $t("common.update"));
  }
}

watch(visible, () => {
  if (visible.value) {
    handleInitModel();
    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="600">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
     <!--
        <NFormItem :label="$t('page.manage.channel.channelId')" path="channelId">
          <NInput
            v-model:value="model.channelId"
            :placeholder="$t('page.manage.channel.form.channelId')"
            :disabled="isEditMode"
          />
        </NFormItem> -->



        <NFormItem :label="$t('page.manage.channel.channelName')" path="channelName">
          <NInput
            v-model:value="model.channelName"
            :placeholder="$t('page.manage.channel.form.channelName')"
            :disabled="isEditMode"
          />
        </NFormItem>

        <NFormItem :label="$t('page.manage.channel.channelBriefName')" path="channelBriefName">
          <NInput
            v-model:value="model.channelBriefName"
            :placeholder="$t('page.manage.channel.form.channelBriefName')"
          />
        </NFormItem>

        <NFormItem
            span="24 m:24"
            :label="$t('page.manage.channel.platform')"
            path="platform"
          >
            <NRadioGroup v-model:value="model.platform">
              <NRadio
                v-for="item in channelPlatformOptions"
                :key="item.value"
                :value="item.value"
                :label="$t(item.label)"
              />
            </NRadioGroup>
          </NFormItem>

        <!-- PC 平台字段 -->
        <template v-if="isPCPlatform">
          <NFormItem :label="$t('page.manage.channel.config.openId')" path="openId">
            <NInput
              v-model:value="model.openId"
              :placeholder="$t('page.manage.channel.config.openIdPlaceholder')"
            />
          </NFormItem>
          <NFormItem :label="$t('page.manage.channel.config.productCode')" path="productCode">
            <NInput
              v-model:value="model.productCode"
              :placeholder="$t('page.manage.channel.config.productCodePlaceholder')"
            />
          </NFormItem>
          <NFormItem :label="$t('page.manage.channel.config.openKey')" path="openKey">
            <NInput
              v-model:value="model.openKey"
              :placeholder="$t('page.manage.channel.config.openKeyPlaceholder')"
            />
          </NFormItem>
          <NFormItem :label="$t('page.manage.channel.config.baseUrl')" path="baseUrl">
            <NInput
              v-model:value="model.baseUrl"
              :placeholder="$t('page.manage.channel.config.baseUrlPlaceholder')"
            />
          </NFormItem>
        </template>

        <!-- 安卓和IOS平台字段 -->
        <template v-else-if="model.platform === '2' || model.platform === '3'">
          <NFormItem :label="$t('page.manage.channel.config.productCode')" path="productCode">
            <NInput
              v-model:value="model.productCode"
              :placeholder="$t('page.manage.channel.config.productCodePlaceholder')"
            />
          </NFormItem>
          <NFormItem :label="$t('page.manage.channel.config.baseUrl')" path="baseUrl">
            <NInput
              v-model:value="model.baseUrl"
              :placeholder="$t('page.manage.channel.config.baseUrlPlaceholder')"
            />
          </NFormItem>
        </template>

        <NFormItem
            span="24 m:24"
            :label="$t('page.manage.channel.enable')"
            path="enable"
          >
            <NRadioGroup v-model:value="model.enable">
              <NRadio
                v-for="item in channelenableOptions"
                :key="item.value"
                :value="item.value"
                :label="$t(item.label)"
              />
            </NRadioGroup>
          </NFormItem>

      </NForm>

      <!-- 区服分配 -->
      <ServerAllocation
        v-model:selected-server-ids="selectedServerIds"
        :visible="visible"
        :channel-id="model.channelName"
        :channel-name="model.channelName"
        style="margin-top: 16px;"
      />
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

<style scoped>
</style>
