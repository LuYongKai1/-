<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import {
  fetchAddCustomerServiceActivity,
  fetchEditCustomerServiceActivity,
  fetchGetChannelList,
} from "@/service/api";
import { useDebounceFn } from '@vueuse/core';
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import { $t } from "@/locales";


defineOptions({
  name: "ActivityOperateDrawer",
});

interface CustomerServiceActivity {
  id?: number;
  title?: string;
  description?: string;
  buttonText?: string;
  qrCodeUrl?: string;
  backgroundUrl?: string;
  jumpUrl?: string;
  channelCode?: string;
  sortOrder?: number;
  status?: number;
}

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: CustomerServiceActivity | null;
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
    add: $t("page.manage.operateqrcode.addActivity"),
    edit: $t("page.manage.operateqrcode.editActivity"),
  };
  return titles[props.operateType];
});


type Model = {
  title: string;
  description: string;
  buttonText: string;
  qrCodeUrl: string;
  backgroundUrl: string;
  jumpUrl: string;
  channelCode: string[];
  sortOrder: number;
  status: number;
};

const model = ref(createDefaultModel());
const isValidQrCodeImage = ref(false);
const isValidBackgroundImage = ref(false);

// 渠道选项
const channelOptions = ref<CommonType.Option<string>[]>([]);
const channelLoading = ref(false);

function createDefaultModel(): Model {
  return {
    title: "",
    description: "",
    buttonText: "",
    qrCodeUrl: "",
    backgroundUrl: "",
    jumpUrl: "",
    channelCode: [],
    sortOrder: 0,
    status: 1,
  };
}

// 添加二维码图片验证状态
const isCheckingQrCodeImage = ref(false);
const isValidQrCodeImageUrl = ref(false);

// 添加背景图片验证状态
const isCheckingBackgroundImage = ref(false);
const isValidBackgroundImageUrl = ref(false);

// 二维码图片验证函数
const debouncedCheckQrCodeImageValidity = useDebounceFn((url: string) => {
  if (!url) {
    isValidQrCodeImageUrl.value = false;
    isCheckingQrCodeImage.value = false;
    return;
  }

  isCheckingQrCodeImage.value = true;
  const img = new Image();

  const timeout = setTimeout(() => {
    isValidQrCodeImageUrl.value = false;
    isCheckingQrCodeImage.value = false;
  }, 10000);

  img.onload = () => {
    clearTimeout(timeout);
    isValidQrCodeImageUrl.value = true;
    isCheckingQrCodeImage.value = false;
  };

  img.onerror = () => {
    clearTimeout(timeout);
    isValidQrCodeImageUrl.value = false;
    isCheckingQrCodeImage.value = false;
  };

  img.src = url;
}, 500);

// 背景图片验证函数
const debouncedCheckBackgroundImageValidity = useDebounceFn((url: string) => {
  if (!url) {
    isValidBackgroundImageUrl.value = false;
    isCheckingBackgroundImage.value = false;
    return;
  }

  isCheckingBackgroundImage.value = true;
  const img = new Image();

  const timeout = setTimeout(() => {
    isValidBackgroundImageUrl.value = false;
    isCheckingBackgroundImage.value = false;
  }, 10000);

  img.onload = () => {
    clearTimeout(timeout);
    isValidBackgroundImageUrl.value = true;
    isCheckingBackgroundImage.value = false;
  };

  img.onerror = () => {
    clearTimeout(timeout);
    isValidBackgroundImageUrl.value = false;
    isCheckingBackgroundImage.value = false;
  };

  img.src = url;
}, 500);

// 监听二维码URL变化
watch(() => model.value.qrCodeUrl, (newUrl) => {
  isValidQrCodeImageUrl.value = false;
  if (newUrl) {
    debouncedCheckQrCodeImageValidity(newUrl);
  } else {
    isCheckingQrCodeImage.value = false;
  }
});

// 监听背景图片URL变化
watch(() => model.value.backgroundUrl, (newUrl) => {
  isValidBackgroundImageUrl.value = false;
  if (newUrl) {
    debouncedCheckBackgroundImageValidity(newUrl);
  } else {
    isCheckingBackgroundImage.value = false;
  }
});

// 获取渠道列表
async function getChannelOptions() {
  channelLoading.value = true;
  try {
    const { error, data } = await fetchGetChannelList();

    if (error) {
      console.error("Failed to fetch channels:", error);
      channelOptions.value = [];
      return;
    }

    const options = Array.isArray(data)
      ? data.map((item: any) => ({
          label: item.channelName || item.name || '',
          value: item.channelName || item.name || '',  // 使用渠道名称作为value
        }))
      : [];
    channelOptions.value = options;
  } catch (error) {
    console.error("Error fetching channel options:", error);
    channelOptions.value = [];
  } finally {
    channelLoading.value = false;
  }
}

type RuleKey = "title";

const rules: Record<RuleKey, App.Global.FormRule> = {
  title: defaultRequiredRule,
};

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === "edit" && props.rowData) {
    // 处理渠道代码字符串转数组
    let channelCodeArray: string[] = [];
    if (props.rowData.channelCode) {
      if (typeof props.rowData.channelCode === 'string') {
        channelCodeArray = props.rowData.channelCode.split(',').map((c: string) => c.trim()).filter(Boolean);
      } else if (Array.isArray(props.rowData.channelCode)) {
        channelCodeArray = props.rowData.channelCode.map((c: any) => String(c));
      }
    }

    Object.assign(model.value, {
      title: props.rowData.title || "",
      description: props.rowData.description || "",
      buttonText: props.rowData.buttonText || "",
      qrCodeUrl: props.rowData.qrCodeUrl || "",
      backgroundUrl: props.rowData.backgroundUrl || "",
      jumpUrl: props.rowData.jumpUrl || "",
      channelCode: channelCodeArray,
      sortOrder: props.rowData.sortOrder ?? 0,
      status: props.rowData.status ?? 1,
    });

    if (model.value.qrCodeUrl) {
      debouncedCheckQrCodeImageValidity(model.value.qrCodeUrl);
    }
    if (model.value.backgroundUrl) {
      debouncedCheckBackgroundImageValidity(model.value.backgroundUrl);
    }
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  try {
    // 将渠道代码数组转换为逗号分隔的字符串
    const channelCodeString = Array.isArray(model.value.channelCode)
      ? model.value.channelCode.join(',')
      : model.value.channelCode;

    const activityData: any = {
      title: model.value.title || "",
      description: model.value.description || "",
      buttonText: model.value.buttonText || "",
      qrCodeUrl: model.value.qrCodeUrl || "",
      backgroundUrl: model.value.backgroundUrl || "",
      jumpUrl: model.value.jumpUrl || "",
      channelCode: channelCodeString,
      sortOrder: model.value.sortOrder ?? 0,
      status: model.value.status ?? 1,
    };

    if (props.operateType === "edit" && props.rowData) {
      activityData.id = props.rowData.id;
    }

    let response: any;
    if (props.operateType === "add") {
      response = await fetchAddCustomerServiceActivity(activityData);
    } else {
      response = await fetchEditCustomerServiceActivity(activityData);
    }

    const operationType = props.operateType === "add" ? $t("page.manage.operateqrcode.addCustomerServiceActivity") : $t("page.manage.operateqrcode.editCustomerServiceActivity");
    if (handleApiResponseError(response, operationType)) {
      return;
    }

    if (props.operateType === "add") {
      window.$message?.success($t("page.manage.operateqrcode.addSuccess"));
    } else {
      window.$message?.success($t("page.manage.operateqrcode.updateSuccess"));
    }

    closeDrawer();
    emit("submitted");
  } catch (error: any) {
    const operationType = props.operateType === "add" ? $t("page.manage.operateqrcode.addCustomerServiceActivity") : $t("page.manage.operateqrcode.editCustomerServiceActivity");
    handleApiCatchError(error, operationType);
  }
}

watch(visible, async (newVal) => {
  if (newVal) {
    handleInitModel();
    restoreValidation();
    if (channelOptions.value.length === 0) {
      await getChannelOptions();
    }
  }
});

onMounted(() => {
  getChannelOptions();
});
</script>


<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-1300px">
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
            span="24"
            :label="$t('page.manage.operateqrcode.activityTitle')"
            path="title"
          >
            <NInput
              v-model:value="model.title"
              :placeholder="$t('page.manage.operateqrcode.form.title')"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.operateqrcode.activityDescription')"
            path="description"
          >
            <NInput
              v-model:value="model.description"
              type="textarea"
              :placeholder="$t('page.manage.operateqrcode.form.description')"
              :rows="3"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.operateqrcode.channelCode')"
            path="channelCode"
          >
            <NSelect
              v-model:value="model.channelCode"
              multiple
              :options="channelOptions"
              :loading="channelLoading"
              :placeholder="$t('page.manage.operateqrcode.form.channelCode')"
              clearable
              filterable
            />
          </NFormItemGi>


          <NFormItemGi
            span="24"
            :label="$t('page.manage.operateqrcode.buttonText')"
            path="buttonText"
          >
            <NInput
              v-model:value="model.buttonText"
              :placeholder="$t('page.manage.operateqrcode.form.buttonText')"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.operateqrcode.qrCodeUrl')"
            path="qrCodeUrl"
          >
            <NInput
              v-model:value="model.qrCodeUrl"
              :placeholder="$t('page.manage.operateqrcode.form.qrCodeUrl')"
            />
          </NFormItemGi>

          <!-- 二维码图片预览 -->
          <NFormItemGi v-if="model.qrCodeUrl" span="24">
            <div class="image-preview-container">
              <div v-if="isCheckingQrCodeImage" class="image-loading">
                <NSpin size="small" />
                <span class="ml-2">{{ $t('page.manage.operateqrcode.loading') }}</span>
              </div>
              <div v-else-if="isValidQrCodeImageUrl" class="image-preview">
                <NImage
                  :src="model.qrCodeUrl"
                  object-fit="contain"
                  :preview-src="model.qrCodeUrl"
                  width="250"
                  show-toolbar-tooltip
                  class="preview-image"
                />
                <div class="image-hint">
                  <NIcon size="14" class="mr-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4v-2h4V5h-4V3m-1 4h-2.5A1.5 1.5 0 0 0 10 8.5V11h2V9h2v2h-2v6h5v2H9v-2h2v-6H9v-2h2V8.5A3.5 3.5 0 0 1 14.5 5H14v2z" />
                    </svg>
                  </NIcon>
                  {{ $t('page.manage.operateqrcode.clickToPreview') }}
                </div>
              </div>
              <div v-else class="image-error">
                <NIcon size="16" class="mr-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M13 13h-2V7h2v6m0 4h-2v-2h2v2M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2z" />
                  </svg>
                </NIcon>
                {{ $t('page.manage.operateqrcode.imageUrlInvalid') }}
              </div>
            </div>
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.operateqrcode.backgroundUrl')"
            path="backgroundUrl"
          >
            <NInput
              v-model:value="model.backgroundUrl"
              :placeholder="$t('page.manage.operateqrcode.form.backgroundUrl')"
            />
          </NFormItemGi>

          <!-- 背景图片预览 -->
          <NFormItemGi v-if="model.backgroundUrl" span="24">
            <div class="image-preview-container">
              <div v-if="isCheckingBackgroundImage" class="image-loading">
                <NSpin size="small" />
                <span class="ml-2">{{ $t('page.manage.operateqrcode.loading') }}</span>
              </div>
              <div v-else-if="isValidBackgroundImageUrl" class="image-preview">
                <NImage
                  :src="model.backgroundUrl"
                  object-fit="contain"
                  :preview-src="model.backgroundUrl"
                  width="250"
                  show-toolbar-tooltip
                  class="preview-image"
                />
                <div class="image-hint">
                  <NIcon size="14" class="mr-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4v-2h4V5h-4V3m-1 4h-2.5A1.5 1.5 0 0 0 10 8.5V11h2V9h2v2h-2v6h5v2H9v-2h2v-6H9v-2h2V8.5A3.5 3.5 0 0 1 14.5 5H14v2z" />
                    </svg>
                  </NIcon>
                  {{ $t('page.manage.operateqrcode.clickToPreview') }}
                </div>
              </div>
              <div v-else class="image-error">
                <NIcon size="16" class="mr-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M13 13h-2V7h2v6m0 4h-2v-2h2v2M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2z" />
                  </svg>
                </NIcon>
                {{ $t('page.manage.operateqrcode.imageUrlInvalid') }}
              </div>
            </div>
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.operateqrcode.jumpUrl')"
            path="jumpUrl"
          >
            <NInput
              v-model:value="model.jumpUrl"
              :placeholder="$t('page.manage.operateqrcode.form.jumpUrl')"
            />
          </NFormItemGi>

          <NFormItemGi
            span="12"
            :label="$t('page.manage.operateqrcode.sortOrder')"
            path="sortOrder"
          >
            <NInputNumber
              v-model:value="model.sortOrder"
              :placeholder="$t('page.manage.operateqrcode.form.sortOrder')"
              style="width: 100%"
              :min="0"
            />
          </NFormItemGi>

          <NFormItemGi
            span="12"
            :label="$t('page.manage.operateqrcode.status')"
            path="status"
          >
            <NSelect
              v-model:value="model.status"
              :options="[
                { label: $t('page.manage.operateqrcode.statusOptions.enable'), value: 1 },
                { label: $t('page.manage.operateqrcode.statusOptions.disable'), value: 0 }
              ]"
              :placeholder="$t('page.manage.operateqrcode.form.status')"
            />
          </NFormItemGi>

        </NGrid>
      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
.image-preview-container {
  padding: 16px;
  display: flex;
  justify-content: center;
  margin: 0 auto;
  max-width: 90%;
}

.image-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  width: 100%;
  max-width: 500px;
}

.preview-image {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  object-fit: contain;
  background-color: white;
  padding: 4px;
  max-height: 250px;
}

.preview-image:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.image-hint {
  margin-top: 12px;
  font-size: 13px;
  color: #606266;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  padding: 6px 12px;
  border-radius: 4px;
  width: fit-content;
}

.image-error {
  color: #f56c6c;
  padding: 16px;
  background-color: #fef0f0;
  border-radius: 4px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #fde2e2;
}

.mr-1 {
  margin-right: 4px;
}

.ml-2 {
  margin-left: 8px;
}

.image-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 4px;
  color: #606266;
  font-size: 14px;
}
</style>
