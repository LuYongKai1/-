<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import {
  fetchGetServerGroup,
  fetchAddActivityImages,
  fetchUpdateActivityImages,
} from "@/service/api";
import { $t } from "@/locales";
import { useServerStore } from '@/store/modules/server';
import { format } from 'date-fns';
import { useDebounceFn } from '@vueuse/core';
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";


defineOptions({
  name: "ActivityOperateDrawer",
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.activityimages | null;
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
    add: $t("page.manage.activityimages.addAnnouncementImages"),
    edit: $t("page.manage.activityimages.editAnnouncementImages"),
  };
  return titles[props.operateType];
});


type Model = Pick<
  Api.SystemManage.activityimages,
  | "name"
  | "url"
  | "servers"
  | "startTime"
  | "endTime"
  | "sorter"
> & {
  startTime: number | null;
  endTime: number | null;
  servers: string;
  sorter: number;
};

const model = ref(createDefaultModel());
const isValidImageUrl = ref(false);

function createDefaultModel(): Model {
  const now = Date.now();
  const sevenDaysLater = now + 7 * 24 * 60 * 60 * 1000;
  return {
    name: "",
    url: "",
    startTime: now,
    endTime: sevenDaysLater,
    servers: "",
    sorter: 0, // 新增：默认排序值为0
  };
}

// 添加图片验证加载状态
const isCheckingImage = ref(false);

// 优化图片验证函数，添加防抖
const debouncedCheckImageValidity = useDebounceFn((url: string) => {
  if (!url) {
    isValidImageUrl.value = false;
    isCheckingImage.value = false;
    return;
  }

  isCheckingImage.value = true;
  const img = new Image();

  const timeout = setTimeout(() => {
    isValidImageUrl.value = false;
    isCheckingImage.value = false;
  }, 10000); // 10秒超时

  img.onload = () => {
    clearTimeout(timeout);
    isValidImageUrl.value = true;
    isCheckingImage.value = false;
  };

  img.onerror = () => {
    clearTimeout(timeout);
    isValidImageUrl.value = false;
    isCheckingImage.value = false;
  };

  img.src = url;
}, 500);

// 更新watch函数使用防抖
watch(() => model.value.url, (newUrl) => {
  isValidImageUrl.value = false;
  if (newUrl) {
    debouncedCheckImageValidity(newUrl);
  } else {
    isCheckingImage.value = false;
  }
});

function checkImageValidity(url: string) {
  debouncedCheckImageValidity(url);
}

// 优化时间格式化函数
const formatDateTime = (dateValue: number | null): string => {
  if (!dateValue) return "";
  try {
    return format(new Date(dateValue), 'yyyy-MM-dd\'T\'HH:mm:ss');
  } catch (error) {
    console.error('时间格式化失败:', error);
    return "";
  }
};

// 优化服务器ID解析逻辑
const parseServerIds = (servers: string | string[]): string[] => {
  if (!servers) return [];

  try {
    if (Array.isArray(servers)) {
      return servers.map(id => String(id));
    }

    if (typeof servers === 'string') {
      // 如果是JSON数组格式
      if (servers.startsWith('[') && servers.endsWith(']')) {
        const parsed = JSON.parse(servers);
        return Array.isArray(parsed) ? parsed.map(id => String(id)) : [];
      }
      // 如果是逗号分隔的字符串
      return servers.split(',').filter(id => id.trim() !== '').map(id => String(id.trim()));
    }
  } catch (error) {
    console.error('解析服务器ID失败:', error);
  }

  return [];
};


type RuleKey = "name" | "servers";

const rules: Record<RuleKey, App.Global.FormRule> = {
  name: defaultRequiredRule,
  servers: {
    required: true,
    message: $t('page.manage.activity.form.servers'),
    trigger: ['change', 'blur'],
    validator: (rule: any, value: string) => {
      try {
        return selectedServerIds.value.length > 0;
      } catch {
        return false;
      }
    }
  },
};

const serverStore = useServerStore();
const serverTreeOptions = computed(() => serverStore.serverTreeOptions);

const selectedServerIds = ref<string[]>([]);
watch(() => model.value.servers, (newVal) => {
  if (!newVal) {
    selectedServerIds.value = [];
    return;
  }
  selectedServerIds.value = newVal.split(',').filter(id => id.trim() !== '').map(id => String(id.trim()));
}, { immediate: true });

watch(selectedServerIds, (val) => {
  const filteredIds = val.filter(id => !String(id).startsWith('region_'));
  model.value.servers = filteredIds.join(',');
});

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === "edit" && props.rowData) {
    const { channelIds, enable, userMerge, ...rest } = props.rowData as any;

    // 使用优化的服务器ID解析函数
    const serverIds = parseServerIds(rest.servers || "");

    // 优化时间处理
    const startTime = rest.startTime ? new Date(rest.startTime).getTime() : null;
    const endTime = rest.endTime ? new Date(rest.endTime).getTime() : null;

    Object.assign(model.value, {
      ...rest,
      startTime,
      endTime,
      servers: serverIds.join(','),
      sorter: rest.sorter || 0
    });

    selectedServerIds.value = serverIds;

    if (model.value.url) {
      checkImageValidity(model.value.url);
    }
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  try {
    let serverIdString = model.value.servers || "";

    const startTime = formatDateTime(model.value.startTime);
    const endTime = formatDateTime(model.value.endTime);

    const activityData: any = {
      name: model.value.name || "",
      url: model.value.url || "",
      servers: serverIdString,
      startTime,
      endTime,
      imageType: 1,
      sorter: model.value.sorter || 0
    };

    if (props.operateType === "edit" && props.rowData) {
      activityData.id = props.rowData.id;
    }

    let response: any;
    if (props.operateType === "add") {
      response = await fetchAddActivityImages(activityData);
    } else {
      response = await fetchUpdateActivityImages(activityData);
    }

    const operationType = props.operateType === "add" ? "新增活动图片" : "修改活动图片";
    if (handleApiResponseError(response, operationType)) {
      return;
    }

    if (props.operateType === "add") {
      window.$message?.success($t("common.addSuccess"));
    } else {
      window.$message?.success($t("common.updateSuccess"));
    }

    closeDrawer();
    emit("submitted");
  } catch (error: any) {
    const operationType = props.operateType === "add" ? "新增活动图片" : "修改活动图片";
    handleApiCatchError(error, operationType);
  }
}

watch(visible, async (newVal) => {
  if (newVal) {
    handleInitModel();
    restoreValidation();
    serverStore.fetchServerList();
  }
});

onMounted(() => {
  serverStore.fetchServerList();
});
</script>


<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-800px">
    <NScrollbar class="h-530px pr-20px">
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
            :label="$t('page.manage.activityimages.name')"
            path="name"
          >
            <NInput
              v-model:value="model.name"
              :placeholder="$t('page.manage.activityimages.form.name')"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            label="排序"
            path="sorter"
          >
            <NInputNumber
              v-model:value="model.sorter"
              :min="0"
              :max="999"
              :step="1"
              placeholder="请输入排序值（数字越小越靠前）"
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.activityimages.url')"
            path="url"
          >
            <NInput
              v-model:value="model.url"
              :placeholder="$t('page.manage.activityimages.form.url')"
            />
          </NFormItemGi>

          <!-- 添加服务器选择组件 -->
          <NFormItemGi
            span="24 m:24"
            :label="$t('page.manage.activity.servers')"
            path="servers"
          >
            <NTreeSelect
              v-model:value="selectedServerIds"
              :options="serverTreeOptions"
              :placeholder="$t('page.manage.activity.form.servers')"
              multiple
              cascade
              checkable
              clearable
              :check-strategy="'child'"
              :max-tag-count="3"
              tag
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.activity.startTime')"
          >
            <NDatePicker
              v-model:value="model.startTime"
              type="datetime"
              :placeholder="$t('page.manage.activity.form.startTime')"
              clearable
              format="yyyy-MM-dd HH:mm:ss"
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.activity.endTime')"
          >
            <NDatePicker
              v-model:value="model.endTime"
              type="datetime"
              :placeholder="$t('page.manage.activity.form.endTime')"
              clearable
              format="yyyy-MM-dd HH:mm:ss"
              style="width: 100%"
            />
          </NFormItemGi>

              <!-- 添加图片预览区域 -->
          <NFormItemGi v-if="model.url" span="24">
            <div class="image-preview-container">
              <!-- 加载状态 -->
              <div v-if="isCheckingImage" class="image-loading">
                <NSpin size="small" />
                <span class="ml-2">{{ $t('common.loading') }}...</span>
              </div>
              <!-- 图片预览 -->
              <div v-else-if="isValidImageUrl" class="image-preview">
                <NImage
                  :src="model.url"
                  object-fit="contain"
                  :preview-src="model.url"
                  width="300"
                  show-toolbar-tooltip
                  class="preview-image"
                />
                <div class="image-hint">
                  <NIcon size="14" class="mr-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4v-2h4V5h-4V3m-1 4h-2.5A1.5 1.5 0 0 0 10 8.5V11h2V9h2v2h-2v6h5v2H9v-2h2v-6H9v-2h2V8.5A3.5 3.5 0 0 1 14.5 5H14v2z" />
                    </svg>
                  </NIcon>
                  {{ $t('common.preview')}}
                </div>
              </div>
              <!-- 错误状态 -->
              <div v-else class="image-error">
                <NIcon size="16" class="mr-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M13 13h-2V7h2v6m0 4h-2v-2h2v2M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2z" />
                  </svg>
                </NIcon>
                {{ $t('common.invalidImageUrl')}}
              </div>
            </div>
          </NFormItemGi>

        </NGrid>
      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeDrawer">{{ $t("common.cancel") }}</NButton>
        <NButton type="primary" @click="handleSubmit">{{
          $t("common.confirm")
        }}</NButton>
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
