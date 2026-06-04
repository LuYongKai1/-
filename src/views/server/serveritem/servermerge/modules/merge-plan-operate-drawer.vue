<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { FormItemRule, FormRules } from "naive-ui";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { fetchAddMergePlan, fetchGetServeritemList } from "@/service/api/game-manage";
import { $t } from "@/locales";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import { useServerStore } from "@/store/modules/server";
import ParamsTemplateModal from './params-template-modal.vue';
import ActivitySelectModal from './activity-select-modal.vue';

defineOptions({
  name: "MergePlanOperateDrawer",
});

/** 含只读查看，与列表页 operateType 一致 */
export type MergePlanOperateType = NaiveUI.TableOperateType | "view";

interface Props {
  /** the type of operation */
  operateType: MergePlanOperateType;
  /** the edit row data */
  rowData?: any;
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
const serverStore = useServerStore();

const serverLoading = ref(false);
const paramsTemplateVisible = ref(false);
const activityModalVisible = ref(false);

const isView = computed(() => props.operateType === "view");

const title = computed(() => {
  const titles: Record<MergePlanOperateType, string> = {
    add: "新增合服计划",
    edit: "编辑合服计划",
    view: "查看合服计划",
  };
  return titles[props.operateType];
});

// 服务器树形选项（显示专区和服务器）
const serverTreeOptions = computed(() => {
  return serverStore.serverTreeOptions.map(region => ({
    ...region,
    children: region.children?.map((server: any) => ({
      ...server,
      label: `${server.key} - ${server.label}`,
    })) || []
  }));
});

// 加载服务器列表
async function loadServerList() {
  serverLoading.value = true;
  try {
    await serverStore.fetchServerList();
  } catch (error) {
    handleApiCatchError(error, '获取服务器列表');
  } finally {
    serverLoading.value = false;
  }
}

type Model = {
  originalServerId: string | number | null;
  targetServerId: string | number | null;
  originalActivityGuids: string[];
  targetActivityGuids: string[];
  originalActivityNames: string[];
  targetActivityNames: string[];
  resultData: string;
};

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  // 合服参数默认值
  const defaultParams = {
    rename_card_itemid: 1008250,
    rename_card_mailid: 9839,
    rename_card_mail_keeptime: 864000,
    rename_card_guild_itemid: 1008251,
    rename_card_guild_mailid: 9840,
    rename_card_guild_mail_keeptime: 864000,
    manually_activity_guid_list: '[]',
  };

  return {
    originalServerId: null,
    targetServerId: null,
    originalActivityGuids: [],
    targetActivityGuids: [],
    originalActivityNames: [],
    targetActivityNames: [],
    resultData: JSON.stringify(defaultParams, null, 2),
  };
}

// 验证源服务器和目标服务器不能相同
const validateServerNotSame = (
  _rule: FormItemRule,
  value: string | number | null
): true | Error => {
  if (!value) return true;
  const valueStr = String(value);
  const originalStr = model.value.originalServerId ? String(model.value.originalServerId) : '';
  const targetStr = model.value.targetServerId ? String(model.value.targetServerId) : '';

  // 如果当前字段是源服务器，检查是否与目标服务器相同
  if (_rule.key === 'originalServerId' && targetStr && valueStr === targetStr) {
    return new Error('源服务器和目标服务器不能相同');
  }
  // 如果当前字段是目标服务器，检查是否与源服务器相同
  if (_rule.key === 'targetServerId' && originalStr && valueStr === originalStr) {
    return new Error('源服务器和目标服务器不能相同');
  }
  return true;
};

const rules: FormRules = {
  originalServerId: [
    defaultRequiredRule,
    { validator: validateServerNotSame, trigger: ['blur', 'change'], key: 'originalServerId' },
  ],
  targetServerId: [
    defaultRequiredRule,
    { validator: validateServerNotSame, trigger: ['blur', 'change'], key: 'targetServerId' },
  ],
  // 活动配对：可选。不选时允许提交；选了则必须左右成对且数量一致
  originalActivityGuids: [
    {
      validator: () => {
        const leftLen = Array.isArray(model.value.originalActivityGuids) ? model.value.originalActivityGuids.length : 0;
        const rightLen = Array.isArray(model.value.targetActivityGuids) ? model.value.targetActivityGuids.length : 0;
        if (leftLen === 0 && rightLen === 0) return true;
        if (leftLen === 0) return new Error('已选择目标服务器活动，请先选择源服务器活动');
        if (rightLen === 0) return new Error('已选择源服务器活动，请先选择目标服务器活动');
        if (leftLen !== rightLen) return new Error('源/目标服务器活动数量不一致，请重新配对');
        return true;
      },
      trigger: ['blur', 'change'],
    },
  ],
  targetActivityGuids: [
    {
      validator: () => {
        const leftLen = Array.isArray(model.value.originalActivityGuids) ? model.value.originalActivityGuids.length : 0;
        const rightLen = Array.isArray(model.value.targetActivityGuids) ? model.value.targetActivityGuids.length : 0;
        if (leftLen === 0 && rightLen === 0) return true;
        if (leftLen === 0) return new Error('已选择目标服务器活动，请先选择源服务器活动');
        if (rightLen === 0) return new Error('已选择源服务器活动，请先选择目标服务器活动');
        if (leftLen !== rightLen) return new Error('源/目标服务器活动数量不一致，请重新配对');
        return true;
      },
      trigger: ['blur', 'change'],
    },
  ],
  resultData: [
    defaultRequiredRule,
  ],
};

function handleInitModel() {
  // 新增时使用默认模型（包含默认合服参数）
  model.value = createDefaultModel();

  if ((props.operateType === "edit" || props.operateType === "view") && props.rowData) {
    const {
      originalServerId,
      targetServerId,
      originalActivityGuids,
      targetActivityGuids,
      originalActivityNames,
      targetActivityNames,
      resultData,
    } = props.rowData;

    model.value = {
      originalServerId:
        originalServerId !== undefined && originalServerId !== null
          ? String(originalServerId)
          : null,
      targetServerId:
        targetServerId !== undefined && targetServerId !== null
          ? String(targetServerId)
          : null,
      originalActivityGuids: Array.isArray(originalActivityGuids) ? originalActivityGuids : [],
      targetActivityGuids: Array.isArray(targetActivityGuids) ? targetActivityGuids : [],
      originalActivityNames: Array.isArray(originalActivityNames) ? originalActivityNames : [],
      targetActivityNames: Array.isArray(targetActivityNames) ? targetActivityNames : [],
      // 如果编辑数据里没有 resultData，则用默认值
      resultData: resultData || createDefaultModel().resultData,
    };
  }
}

// 打开参数选择器
function handleViewParamsTemplates() {
  paramsTemplateVisible.value = true;
}

// 处理选择模板
function handleSelectTemplate(selectedItem: any) {
  if (selectedItem && selectedItem.resultData) {
    model.value.resultData = selectedItem.resultData;
    window.$message?.success('已应用参数模板');
  }
}

// 打开活动选择弹框
function handleSelectActivity() {
  if (!model.value.originalServerId) {
    window.$message?.warning('请先选择源服务器（被合服）');
    return;
  }
  if (!model.value.targetServerId) {
    window.$message?.warning('请先选择目标服务器（主服）');
    return;
  }
  activityModalVisible.value = true;
}

// 处理选择活动
function handleActivitySelected(data: { originalActivities: any[]; targetActivities: any[] }) {
  model.value.originalActivityGuids = data.originalActivities.map(item => item.activityGuid);
  model.value.originalActivityNames = data.originalActivities.map(item => item.activityName || '');
  model.value.targetActivityGuids = data.targetActivities.map(item => item.activityGuid);
  model.value.targetActivityNames = data.targetActivities.map(item => item.activityName || '');

  // 更新 resultData 中的 manually_activity_guid_list
  updateManuallyActivityGuidList();

  window.$message?.success(`已选择源服务器活动 ${data.originalActivities.length} 个，目标服务器活动 ${data.targetActivities.length} 个`);
}

// 更新合服参数中的活动列表
function updateManuallyActivityGuidList() {
  try {
    // 解析现有的 resultData
    let resultDataObj: any = {};
    if (model.value.resultData) {
      try {
        resultDataObj = JSON.parse(model.value.resultData);
      } catch (e) {
        // 如果解析失败，使用默认值
        resultDataObj = {};
      }
    }

    // 构建活动对应关系数组 [[源活动GUID, 目标活动GUID], ...]
    const activityPairs: Array<[string | number, string | number]> = [];
    const minLength = Math.min(model.value.originalActivityGuids.length, model.value.targetActivityGuids.length);

    for (let i = 0; i < minLength; i++) {
      activityPairs.push([
        model.value.originalActivityGuids[i],
        model.value.targetActivityGuids[i],
      ]);
    }

    // 设置默认值（如果不存在）
    if (!resultDataObj.rename_card_itemid) {
      resultDataObj.rename_card_itemid = 1008250;
    }
    if (!resultDataObj.rename_card_mailid) {
      resultDataObj.rename_card_mailid = 9839;
    }
    if (!resultDataObj.rename_card_mail_keeptime) {
      resultDataObj.rename_card_mail_keeptime = 864000;
    }
    if (!resultDataObj.rename_card_guild_itemid) {
      resultDataObj.rename_card_guild_itemid = 1008251;
    }
    if (!resultDataObj.rename_card_guild_mailid) {
      resultDataObj.rename_card_guild_mailid = 9840;
    }
    if (!resultDataObj.rename_card_guild_mail_keeptime) {
      resultDataObj.rename_card_guild_mail_keeptime = 864000;
    }

    // 更新 manually_activity_guid_list
    // 注意：这里按后端期望的字符串格式生成，例如：[[6213...,6313...],[...]]
    const activityPairsText = `[${activityPairs
      .map(([left, right]) => `[${left},${right}]`)
      .join(",")}]`;
    resultDataObj.manually_activity_guid_list = activityPairsText;

    // 更新 model.value.resultData
    model.value.resultData = JSON.stringify(resultDataObj, null, 2);
  } catch (error) {
    console.error('更新活动列表失败:', error);
  }
}

// 获取服务器名称
function getServerName(serverId: string | number | null): string {
  if (!serverId) return '';

  for (const region of serverStore.serverTreeOptions) {
    const server = region.children?.find((s: any) => String(s.key) === String(serverId));
    if (server) {
      return server.label || '';
    }
  }
  return '';
}

// 关闭抽屉
function closeDrawer() {
  visible.value = false;
}

// 提交表单
async function handleSubmit() {
  if (props.operateType === "view") return;
  await validate();

  try {
    const submitData = {
      originalServerId: model.value.originalServerId ? Number(model.value.originalServerId) : null,
      targetServerId: model.value.targetServerId ? Number(model.value.targetServerId) : null,
      originalActivityGuids: model.value.originalActivityGuids,
      targetActivityGuids: model.value.targetActivityGuids,
      resultData: model.value.resultData,
    };

    const operationType = props.operateType === "add" ? "新增合服计划" : "编辑合服计划";
    const response = await fetchAddMergePlan(submitData as any);

    if (handleApiResponseError(response, operationType)) {
      return;
    }

    window.$message?.success(props.operateType === "add" ? $t("common.addSuccess") : $t("common.updateSuccess"));
    closeDrawer();
    emit("submitted");
  } catch (error) {
    const operationType = props.operateType === "add" ? "新增合服计划" : "编辑合服计划";
    handleApiCatchError(error, operationType);
  }
}

watch(visible, async (newVisible) => {
  if (newVisible) {
    handleInitModel();
    restoreValidation();
    await loadServerList();
  }
});

watch(
  () => props.rowData,
  (newRowData) => {
    if (visible.value && (props.operateType === "edit" || props.operateType === "view") && newRowData) {
      handleInitModel();
    }
  },
  { deep: true }
);
</script>

<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-700px">
    <!-- 加一个可滚动容器，避免整体过高 -->
    <div style="max-height: 70vh; overflow-y: auto; padding-right: 4px;">
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        :label-width="140"
      >
      <NFormItem label="源服务器(被合)" path="originalServerId">
        <template v-if="isView">
          <div class="text-14px">{{ rowData?.originalServerName || '-' }}</div>
        </template>
        <NTreeSelect
          v-else
          v-model:value="model.originalServerId"
          :options="serverTreeOptions"
          :loading="serverLoading"
          placeholder="请选择源服务器"
          filterable
          clearable
          :show-path="true"
          :leaf-only="true"
          :node-props="({ option }) => ({
            onClick: () => {
              const key = String(option.key || '');
              if (key.startsWith('region_')) {
                return false;
              }
            }
          })"
          @update:value="() => { model.originalActivityGuids = []; model.originalActivityNames = []; }"
        />
      </NFormItem>

      <NFormItem label="目标服务器(主服)" path="targetServerId">
        <template v-if="isView">
          <div class="text-14px">{{ rowData?.targetServerName || '-' }}</div>
        </template>
        <NTreeSelect
          v-else
          v-model:value="model.targetServerId"
          :options="serverTreeOptions"
          :loading="serverLoading"
          placeholder="请选择目标服务器"
          filterable
          clearable
          :show-path="true"
          :leaf-only="true"
          :node-props="({ option }) => ({
            onClick: () => {
              const key = String(option.key || '');
              if (key.startsWith('region_')) {
                return false;
              }
            }
          })"
          @update:value="() => { model.originalActivityGuids = []; model.originalActivityNames = []; model.targetActivityGuids = []; model.targetActivityNames = []; }"
        />
      </NFormItem>

      <NFormItem label="服务器活动" path="originalActivityGuids">
        <div class="w-full">
          <div v-if="!isView" class="flex items-center gap-8px mb-8px">
            <NButton
              type="primary"
              :disabled="!model.originalServerId || !model.targetServerId"
              @click="handleSelectActivity"
            >
              <template #icon>
                <icon-mdi-format-list-bulleted />
              </template>
              选择活动
            </NButton>
            <span v-if="model.originalActivityGuids.length > 0 || model.targetActivityGuids.length > 0" class="text-12px text-gray-400">
              源服务器: {{ model.originalActivityGuids.length }} 个 | 目标服务器: {{ model.targetActivityGuids.length }} 个
            </span>
          </div>

          <!-- 源服务器活动 -->
          <div v-if="model.originalActivityNames.length > 0" class="mb-12px">
            <div class="text-14px font-medium mb-8px">源服务器活动:</div>
            <div class="flex flex-wrap gap-8px">
              <NTag
                v-for="(name, index) in model.originalActivityNames"
                :key="model.originalActivityGuids[index]"
                type="info"
                :closable="!isView"
                @close="() => {
                  model.originalActivityGuids.splice(index, 1);
                  model.originalActivityNames.splice(index, 1);
                  updateManuallyActivityGuidList();
                }"
              >
                {{ name }}
              </NTag>
            </div>
          </div>

          <!-- 目标服务器活动 -->
          <div v-if="model.targetActivityNames.length > 0" class="mb-12px">
            <div class="text-14px font-medium mb-8px">目标服务器活动:</div>
            <div class="flex flex-wrap gap-8px">
              <NTag
                v-for="(name, index) in model.targetActivityNames"
                :key="model.targetActivityGuids[index]"
                type="success"
                :closable="!isView"
                @close="() => {
                  model.targetActivityGuids.splice(index, 1);
                  model.targetActivityNames.splice(index, 1);
                  updateManuallyActivityGuidList();
                }"
              >
                {{ name }}
              </NTag>
            </div>
          </div>

          <div v-if="model.originalActivityNames.length === 0 && model.targetActivityNames.length === 0" class="text-gray-400 text-14px">
            未选择活动
          </div>
        </div>
      </NFormItem>

      <NFormItem label="合服参数" path="resultData">
        <div class="w-full">
          <div v-if="!isView" class="flex items-center gap-8px mb-8px">
            <NButton
              size="small"
              type="primary"
              ghost
              @click="handleViewParamsTemplates"
            >
              <template #icon>
                <icon-mdi-file-document-multiple-outline />
              </template>
              选择已有参数
            </NButton>
            <span class="text-12px text-gray-400">点击选择历史合服参数模板</span>
          </div>
          <NInput
            v-model:value="model.resultData"
            type="textarea"
            :disabled="isView"
            placeholder="请输入合服参数，例如：&#10;is_text_check = true&#10;is_cheat_check = false&#10;business_id = xxx"
            :rows="4"
            :autosize="{
              minRows: 4,
              maxRows: 8
            }"
          />
        </div>
      </NFormItem>
    </NForm>
    </div>

    <template #footer>
      <NSpace justify="end" :size="16">
        <template v-if="isView">
          <NButton type="primary" @click="closeDrawer">
            {{ $t("common.close") }}
          </NButton>
        </template>
        <template v-else>
          <NButton @click="closeDrawer">
            {{ $t("common.cancel") }}
          </NButton>
          <NButton type="primary" @click="handleSubmit">
            {{ $t("common.confirm") }}
          </NButton>
        </template>
      </NSpace>
    </template>
  </NModal>

  <!-- 参数选择器 -->
  <ParamsTemplateModal
    v-model:visible="paramsTemplateVisible"
    select-mode
    @select="handleSelectTemplate"
  />

  <!-- 活动选择弹框 -->
  <ActivitySelectModal
    v-model:visible="activityModalVisible"
    :original-server-id="model.originalServerId"
    :target-server-id="model.targetServerId"
    :original-server-name="getServerName(model.originalServerId)"
    :target-server-name="getServerName(model.targetServerId)"
    @select="handleActivitySelected"
  />
</template>

<style scoped>
:deep(.n-form-item-label) {
  white-space: nowrap;
}
:deep(.n-form-item-label__text) {
  white-space: nowrap;
}
</style>
