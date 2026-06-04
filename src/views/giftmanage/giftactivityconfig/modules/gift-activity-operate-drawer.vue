<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import {
  scopeTypeOptions,
  giftActivityStatusOptions,
} from "@/constants/business";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import { $t } from "@/locales";
import { useItemPackage } from "@/hooks/business/useItemPackage";
import { useThemeStore } from "@/store/modules/theme";
import { useAuthStore } from "@/store/modules/auth";
import { fetchAddGiftActivity, fetchUpdateGiftActivity } from "@/service/api";

defineOptions({
  name: "GiftActivityOperateDrawer",
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
    add: $t("page.manage.giftactivity.addGiftActivity"),
    edit: $t("page.manage.giftactivity.editGiftActivity"),
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.SystemManage.giftActivity,
  | "campaignCode"
  | "name"
  | "scopeChannel"
  | "scopeServer"
  | "startTime"
  | "endTime"
  | "goodsJson"
  | "status"
  | "remark"
  | "perUserLimit"
  | "perDeviceLimit"
  | "perIpLimit"
  | "totalLimit"
>;

const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    campaignCode: "",
    name: "",
    scopeChannel: "0",
    scopeServer: "0",
    startTime: null,
    endTime: null,
    perUserLimit: 0,
    perDeviceLimit: 0,
    perIpLimit: "0",
    totalLimit: "0",
    rewardJson: "",
    status: "1",
    remark: "",
    goodsJson: '{"item_ids": [], "item_counts": []}',
    mailTitle: "",
    mailContent: "",
  };
}

// 监听邮件标题和内容变化，更新rewardJson
watch([() => model.value.mailTitle, () => model.value.mailContent], () => {
  updateGoodsJson();
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

  // 更新goodsJson（保持向后兼容）
  model.value.goodsJson = JSON.stringify({
    item_ids: itemIds,
    item_counts: itemCounts,
  });

  // 更新rewardJson
  const rewardData = {
    mailTitle: model.value.mailTitle,
    mailContent: model.value.mailContent,
    itemIds: itemIds,
    itemCounts: itemCounts,
  };
  model.value.rewardJson = JSON.stringify(rewardData);
}

// 表单验证规则
const rules = {
  name: defaultRequiredRule,
  scopeChannel: defaultRequiredRule,
  scopeServer: defaultRequiredRule,
  goodsJson: defaultRequiredRule,
  status: defaultRequiredRule,
  mailTitle: defaultRequiredRule,
  mailContent: defaultRequiredRule,
};

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === "edit" && props.rowData) {
    // 解析rewardJson获取邮件和物品信息
    let rewardData = {
      mailTitle: "",
      mailContent: "",
      itemIds: [],
      itemCounts: [],
    };
    try {
      if (props.rowData.rewardJson) {
        rewardData = JSON.parse(props.rowData.rewardJson);
      }
    } catch (e) {
      console.error("解析rewardJson失败:", e);
    }

    Object.assign(model.value, {
      id: props.rowData.id,
      campaignCode: props.rowData.campaignCode || "",
      name: props.rowData.name || "",
      scopeChannel: String(props.rowData.scopeChannel || "0"),
      scopeServer: String(props.rowData.scopeServer || "0"),
      startTime: props.rowData.startTime
        ? new Date(props.rowData.startTime).getTime()
        : null,
      endTime: props.rowData.endTime
        ? new Date(props.rowData.endTime).getTime()
        : null,
      perUserLimit: props.rowData.perUserLimit || 0,
      status: String(props.rowData.status || "1"),
      remark: props.rowData.remark || "",
      rewardJson: props.rowData.rewardJson || "",
      mailTitle: rewardData.mailTitle || "",
      mailContent: rewardData.mailContent || "",
      goodsJson: JSON.stringify({
        item_ids: rewardData.itemIds || [],
        item_counts: rewardData.itemCounts || [],
      }),
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
    }

    // 构建rewardJson数据结构
    const rewardData = {
      mailTitle: model.value.mailTitle,
      mailContent: model.value.mailContent,
      itemIds: itemIds,
      itemCounts: itemCounts,
    };

    // 格式化时间为字符串 - 使用LocalDateTime格式
    const formatDateTime = (timestamp: number | null) => {
      if (!timestamp) return null;
      const date = new Date(timestamp);
      // 格式化为 yyyy-MM-ddTHH:mm:ss 格式
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    };

    const submitData = {
      ...model.value,
      scopeChannel: Number(model.value.scopeChannel),
      scopeServer: Number(model.value.scopeServer),
      startTime: formatDateTime(model.value.startTime),
      endTime: formatDateTime(model.value.endTime),
      perUserLimit: model.value.perUserLimit || 0,
      perDeviceLimit: 0,
      perIpLimit: 0,
      totalLimit: 0,
      rewardJson: JSON.stringify(rewardData),
      status: Number(model.value.status),
      creator: authStore.userInfo.user.userName,
    };

    if (props.operateType === "add") {
      const response = await fetchAddGiftActivity(submitData);
      if (handleApiResponseError(response, "添加礼包活动")) {
        return;
      }
      window.$message?.success($t("common.addSuccess"));
    } else {
      const response = await fetchUpdateGiftActivity(submitData);
      if (handleApiResponseError(response, "更新礼包活动")) {
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

// 监听抽屉显示状态
watch(visible, async (newVal) => {
  if (newVal) {
    restoreValidation();
    handleInitModel();
    // 清空搜索相关状态
    goodsSearchValue.value = "";
    searchResults.value = [];
  }
});
</script>

<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-1000px">
    <NScrollbar class="h-700px pr-20px">
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        :label-width="120"
      >
        <NGrid responsive="screen" item-responsive>
          <!-- 活动名称 -->
          <NFormItemGi
            span="24"
            :label="$t('page.manage.giftactivity.name')"
            path="name"
          >
            <NInput
              v-model:value="model.name"
              :placeholder="$t('page.manage.giftactivity.form.name')"
              maxlength="100"
              show-count
            />
          </NFormItemGi>

          <!-- 邮件标题 -->
          <NFormItemGi span="24" :label="$t('page.manage.giftactivity.mailTitle')" path="mailTitle">
            <NInput
              v-model:value="model.mailTitle"
              :placeholder="$t('page.manage.giftactivity.form.mailTitle')"
              maxlength="100"
              show-count
            />
          </NFormItemGi>

          <!-- 邮件内容 -->
          <NFormItemGi span="24" :label="$t('page.manage.giftactivity.mailContent')" path="mailContent">
            <NInput
              v-model:value="model.mailContent"
              type="textarea"
              :placeholder="$t('page.manage.giftactivity.form.mailContent')"
              :rows="4"
            />
          </NFormItemGi>

             <!-- 状态 -->
             <NFormItemGi span="24 m:8" :label="$t('page.manage.giftactivity.status')" path="status">
            <NRadioGroup v-model:value="model.status">
              <NRadio
                v-for="item in giftActivityStatusOptions"
                :key="item.value"
                :value="item.value"
                :label="item.label"
              />
            </NRadioGroup>
          </NFormItemGi>

          <NFormItemGi span="24 m:8" :label="$t('page.manage.giftactivity.scopeChannel')" path="scopeChannel">
            <NRadioGroup v-model:value="model.scopeChannel">
              <NRadio
                v-for="item in scopeTypeOptions"
                :key="item.value"
                :value="item.value"
                :label="item.label"
              />
            </NRadioGroup>
          </NFormItemGi>

          <NFormItemGi span="24 m:8" :label="$t('page.manage.giftactivity.scopeServer')" path="scopeServer">
            <NRadioGroup v-model:value="model.scopeServer">
              <NRadio
                v-for="item in scopeTypeOptions"
                :key="item.value"
                :value="item.value"
                :label="item.label"
              />
            </NRadioGroup>
          </NFormItemGi>

          <!-- 每人限领次数 -->
          <NFormItemGi span="24 " :label="$t('page.manage.giftactivity.perUserLimit')" path="perUserLimit">
            <NInputNumber
              v-model:value="model.perUserLimit"
              :min="0"
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi span="24 m:12" :label="$t('page.manage.giftactivity.startTime')" path="startTime">
            <NDatePicker
              v-model:value="model.startTime"
              type="datetime"
              clearable
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi span="24 m:12" :label="$t('page.manage.giftactivity.endTime')" path="endTime">
            <NDatePicker
              v-model:value="model.endTime"
              type="datetime"
              clearable
              style="width: 100%"
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
