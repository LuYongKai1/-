<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import {
  unlockTypeOptions,
  questionnaireStatusOptions,
} from "@/constants/business";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import WangEditor from "@/components/custom/wang-editor.vue";
import { $t } from "@/locales";
import { useItemPackage } from "@/hooks/business/useItemPackage";
import { useThemeStore } from "@/store/modules/theme";
import { useAuthStore } from "@/store/modules/auth";
import {
  fetchAddQuestionnaire,
  fetchUpdateQuestionnaire,
  fetchGetMailTemplateList,
} from "@/service/api";
// 添加邮件模板API导入

defineOptions({
  name: "QuestionnaireOperateDrawer",
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

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t("page.manage.questionnaire.addQuestionnaire"),
    edit: $t("page.manage.questionnaire.editQuestionnaire"),
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.SystemManage.questionnaire,
  | "title"
  | "richContentMd"
  | "unlockType"
  | "unlockLevel"
  | "wjxUrl"
  | "goodsJson"
  | "status"
  | "mailId"
  | "mailTitle"
  | "mailContent"
>;

const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    title: "",
    richContentMd: "",
    unlockType: "1",
    unlockLevel: 0,
    wjxUrl: "",
    goodsJson: "",
    status: "1",
    mailId: "8888",
    mailTitle: "",
    mailContent: "",
  };
}

// 邮件模板相关状态
interface MailTemplateOption extends CommonType.Option<string> {
  template: {
    title: string;
    content: string;
  };
}
const mailTemplateOptions = ref<MailTemplateOption[]>([]);

// 获取邮件模板选项
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

// 邮件模板选择处理函数
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

// 判断是否为自定义模板
const isCustomTemplate = computed(() => {
  return model.value.mailId === "8888" || !model.value.mailId;
});

// 监听mailId的变化
watch(() => model.value.mailId, (newVal) => {
  handleTemplateChange(newVal || null);
  restoreValidation();
});

// 物品搜索相关状态
const goodsSearchValue = ref("");
const searchResults = ref<{ id: string; name: string; names: string }[]>([]);
const selectedItems = ref<{ id: string; names: string; count: number }[]>([]);
const itemData = ref<any>(null);
const themeStore = useThemeStore();

// 获取物品数据
onMounted(async () => {
  try {
    const data = await useItemPackage();
    itemData.value = data;
  } catch (error) {
    console.error("获取物品数据失败:", error);
    itemData.value = null;
  }
});

// 物品搜索方法
function handleSearch(value: string) {
  if (!value) {
    searchResults.value = [];
    return;
  }

  const results: { id: string; name: string; names: string }[] = [];
  const searchValue = value.toLowerCase();

  // 从itemData中获取数据
  if (itemData.value?.data?.item) {
    const items = itemData.value.data.item;
    Object.entries(items).forEach(([id, item]: [string, any]) => {
      const itemName = item.name || String(id);
      const itemNames = item.names || "";
      if (
        String(id).includes(searchValue) ||
        itemName.toLowerCase().includes(searchValue) ||
        itemNames.toLowerCase().includes(searchValue)
      ) {
        results.push({
          id: String(id),
          name: itemName,
          names: itemNames,
        });
      }
    });
  }

  searchResults.value = results;
}

// 添加物品
function addItem(item: { id: string; name: string; names: string }) {
  const existingItem = selectedItems.value.find((i) => i.id === item.id);
  if (!existingItem) {
    selectedItems.value.push({ ...item, count: 1 });
    updateGoodsJson();
  }
  searchResults.value = [];
  goodsSearchValue.value = "";
}

// 删除物品
function removeItem(itemId: string) {
  selectedItems.value = selectedItems.value.filter((i) => i.id !== itemId);
  updateGoodsJson();
}

// 更新物品JSON数据
function updateGoodsJson() {
  const itemIds = selectedItems.value.map((item) => Number(item.id));
  const itemCounts = selectedItems.value.map((item) => Number(item.count));

  model.value.goodsJson = JSON.stringify({
    item_ids: itemIds,
    item_counts: itemCounts,
  });
}

// 表单验证规则
const rules = {
  title: defaultRequiredRule,
  richContentMd: defaultRequiredRule,
  unlockType: defaultRequiredRule,
  unlockLevel: defaultRequiredRule,
  wjxUrl: defaultRequiredRule,
  goodsJson: defaultRequiredRule,
  status: defaultRequiredRule,
  // 添加邮件相关验证规则
  mailId: defaultRequiredRule,
  mailTitle: defaultRequiredRule,
  mailContent: defaultRequiredRule,
};

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === "edit" && props.rowData) {
    Object.assign(model.value, {
      id: props.rowData.id,
      title: props.rowData.title || "",
      richContentMd: props.rowData.richContentMd || "",
      unlockType: String(props.rowData.unlockType || "1"),
      unlockLevel: Number(props.rowData.unlockLevel || ""),
      wjxUrl: props.rowData.wjxUrl || "",
      goodsJson: props.rowData.goodsJson || '{"item_ids":[],"item_counts":[]}',
      gameId: props.rowData.gameId || 101,
      createdBy: authStore.userInfo.user.userName,
      // 添加邮件相关字段的编辑处理
      mailId: String(props.rowData.mailId || "8888"),
      mailTitle: props.rowData.mailTitle || "",
      mailContent: props.rowData.mailContent || "",
    });

    // 处理已选择的物品数据
    if (model.value.goodsJson) {
      try {
        const goodsData = JSON.parse(model.value.goodsJson);
        const itemIds = goodsData.item_ids || [];
        const itemCounts = goodsData.item_counts || [];

        selectedItems.value = itemIds.map((id: number, index: number) => {
          let itemInfo = {
            name: String(id),
            names: "",
          };

          if (itemData.value?.data?.item) {
            const item = itemData.value.data.item[id];
            if (item) {
              itemInfo = {
                name: item.name || String(id),
                names: item.names || "",
              };
            }
          }

          return {
            id: String(id),
            name: itemInfo.name,
            names: itemInfo.names,
            count: itemCounts[index] || 1,
          };
        });
      } catch (e) {
        console.error("解析goodsJson失败:", e);
        selectedItems.value = [];
      }
    }
  } else {
    selectedItems.value = [];
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  try {
    // 更新物品数据
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

    const submitData = {
      ...model.value,
    };

    if (props.operateType === "add") {
      const response = await fetchAddQuestionnaire(submitData);
      if (handleApiResponseError(response, "添加问卷")) {
        return;
      }
      window.$message?.success($t("common.addSuccess"));
    } else {
      const response = await fetchUpdateQuestionnaire(submitData);
      if (handleApiResponseError(response, "更新问卷")) {
        return;
      }
      window.$message?.success($t("common.updateSuccess"));
    }

    // 清空已选择的物品
    selectedItems.value = [];
    closeDrawer();
    emit("submitted");
  } catch (error) {
    handleApiCatchError(error, "操作失败");
  }
}

// 富文本编辑器事件处理 - 问卷内容
function handleEditorChange(content: string) {
  model.value.richContentMd = content;
}

// 监听抽屉显示状态
watch(visible, async (newVal) => {
  if (newVal) {
    restoreValidation();
    // 加载邮件模板数据
    await getMailTemplateOptions();
    handleInitModel();
    // 清空搜索相关状态
    goodsSearchValue.value = "";
    searchResults.value = [];
  }
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
        :label-width="120"
      >
        <NGrid responsive="screen" item-responsive>
          <!-- 问卷标题 -->
          <NFormItemGi
            span="24"
            :label="$t('page.manage.questionnaire.title')"
            path="title"
          >
            <NInput
              v-model:value="model.title"
              :placeholder="$t('page.manage.questionnaire.form.title')"
              maxlength="100"
              show-count
            />
          </NFormItemGi>

          <!-- 富文本编辑器 -->
          <NFormItemGi
            span="24"
            :label="$t('page.manage.questionnaire.richContentMd')"
            path="richContentMd"
          >
            <WangEditor
              v-model="model.richContentMd"
              :placeholder="$t('page.manage.questionnaire.form.richContentMd')"
              :height="400"
              @change="handleEditorChange"
            />
          </NFormItemGi>

          <!-- 解锁类型 -->
          <NFormItemGi
            span="24 m:5"
            :label="$t('page.manage.questionnaire.unlockType')"
            path="unlockType"
          >
            <NSelect
              v-model:value="model.unlockType"
              :options="unlockTypeOptions"
            />
          </NFormItemGi>

          <!-- 解锁等级 -->
          <NFormItemGi span="24 m:19" path="unlockLevel">
            <NInputNumber
              v-model:value="model.unlockLevel"
              :placeholder="$t('page.manage.questionnaire.form.unlockLevel')"
              :min="0"
              style="width: 100%"
            />
          </NFormItemGi>

          <!-- 邮件模板选择 -->
          <NFormItemGi
            span="24"
            :label="$t('page.manage.questionnaire.mailTemplate')"
            path="mailId"
          >
            <NSelect
              v-model:value="model.mailId"
              :options="mailTemplateOptions"
              :placeholder="$t('page.manage.questionnaire.form.mailTemplate')"
              clearable
              @update:value="handleTemplateChange"
            />
          </NFormItemGi>

          <!-- 邮件标题 -->
          <NFormItemGi
            span="24"
            :label="$t('page.manage.questionnaire.mailTitle')"
            path="mailTitle"
          >
            <NInput
              v-model:value="model.mailTitle"
              :placeholder="$t('page.manage.questionnaire.form.mailTitle')"
              maxlength="100"
              show-count
              :disabled="!isCustomTemplate"
            />
          </NFormItemGi>

          <!-- 邮件内容 -->
          <NFormItemGi
            span="24"
            :label="$t('page.manage.questionnaire.mailContent')"
            path="mailContent"
          >
            <NInput
              v-model:value="model.mailContent"
              type="textarea"
              :placeholder="$t('page.manage.questionnaire.form.mailContent')"
              :rows="4"
              :disabled="!isCustomTemplate"
            />
          </NFormItemGi>

          <!-- 问卷链接 -->
          <NFormItemGi
            span="24 m:24"
            :label="$t('page.manage.questionnaire.wjxUrl')"
            path="wjxUrl"
          >
            <NInput
              v-model:value="model.wjxUrl"
              :placeholder="$t('page.manage.questionnaire.form.wjxUrl')"
              maxlength="100"
            />
          </NFormItemGi>

          <!-- 物品搜索 -->
          <NFormItemGi
            span="24 m:24"
            :label="$t('page.manage.questionnaire.goodsJson')"
            path="goodsJson"
          >
            <NInput
              v-model:value="goodsSearchValue"
              :placeholder="$t('page.manage.questionnaire.form.goodsJson')"
              @input="handleSearch"
              style="width: 100%"
            />
            <div
              v-show="searchResults.length > 0"
              class="absolute left-0 right-0 top-full mt-1 rounded z-50 max-h-[400px] overflow-y-auto shadow-sm w-full"
              :class="[
                themeStore.darkMode
                  ? 'bg-[rgb(44,44,50)] border border-[#333]'
                  : 'bg-white border border-[#e5e7eb]',
              ]"
            >
              <div
                v-for="item in searchResults"
                :key="item.id"
                class="p-3 cursor-pointer border-b last:border-b-0 transition-colors duration-200"
                :class="[
                  themeStore.darkMode
                    ? 'hover:bg-[rgb(55,55,60)] border-[#333]'
                    : 'hover:bg-[#f3f4f6] border-[#e5e7eb]',
                ]"
                @click="addItem(item)"
              >
                <div
                  class="font-medium text-sm whitespace-normal break-words"
                  :class="themeStore.darkMode ? 'text-white' : 'text-[#1f1f1f]'"
                >
                  {{ item.names || item.name }}
                </div>
                <div
                  class="text-xs mt-1"
                  :class="themeStore.darkMode ? 'text-[#aaa]' : 'text-[#666]'"
                >
                  ID: {{ item.id }}
                </div>
              </div>
            </div>
          </NFormItemGi>

          <!-- 已选择的物品展示 -->
          <NFormItemGi
            span="24"
            :label="$t('page.manage.questionnaire.goodsJson')"
            path="goodsJson"
          >
            <div class="space-y-4">
              <div v-if="selectedItems.length > 0" class="flex flex-wrap gap-3">
                <NCard
                  v-for="item in selectedItems"
                  :key="item.id"
                  :class="[
                    '!shadow-sm',
                    themeStore.darkMode
                      ? '!border-[#333] !bg-[rgb(44,44,50)]'
                      : '!border-[#e5e7eb] !bg-[#f9fafb]',
                  ]"
                  style="width: 329px"
                >
                  <div class="flex flex-col gap-2">
                    <div
                      class="font-medium text-sm"
                      :class="
                        themeStore.darkMode ? 'text-white' : 'text-[#1f1f1f]'
                      "
                    >
                      {{ item.names }}
                    </div>
                    <div class="flex items-center gap-2">
                      <div
                        class="text-xs flex-1"
                        :class="
                          themeStore.darkMode ? 'text-[#aaa]' : 'text-[#666]'
                        "
                      >
                        ID: {{ item.id }}
                      </div>
                      <NTooltip :show-arrow="false">
                        <template #trigger>
                          <NInputNumber
                            v-model:value="item.count"
                            :min="1"
                            :max="99999999999"
                            class="!w-20"
                            size="small"
                            @update:value="updateGoodsJson"
                          />
                        </template>
                        {{ $t("page.manage.questionnaire.form.count") }}:
                        {{ item.count?.toLocaleString() || 0 }}
                      </NTooltip>
                      <div
                        class="flex items-center justify-center cursor-pointer w-12 text-center -mt-6"
                        @click="removeItem(item.id)"
                      >
                        <SvgIcon
                          icon="mdi:delete"
                          class="text-4 text-red-500 hover:text-red-600"
                        />
                      </div>
                    </div>
                  </div>
                </NCard>
              </div>
              <div v-else class="text-center py-8 text-gray-400">
                {{ $t("page.manage.questionnaire.form.goodsJson") }}
              </div>
            </div>
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.questionnaire.status')"
            path="status"
          >
            <NRadioGroup v-model:value="model.status">
              <NRadio
                v-for="item in questionnaireStatusOptions"
                :key="item.value"
                :value="item.value"
                :label="item.label"
              />
            </NRadioGroup>
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
/* 自定义样式 */
.n-input--disabled {
  cursor: not-allowed;
}
</style>
