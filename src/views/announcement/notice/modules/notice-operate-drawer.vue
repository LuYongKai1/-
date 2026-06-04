<script setup lang="ts">
import { computed, ref, watch, h } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { fetchCreateNotice, fetchUpdateNotice } from "@/service/api";
import { $t } from "@/locales";
import {
  serverNoticeStatusOptions,
  serverNoticeOptions,
  serverNoticeLabelOptions,
  serverNewOptions,
} from "@/constants/business";
import { useChannel } from "@/hooks/business/useChannel";
import { useServerStore } from "@/store/modules/server";
import {
  NUl,
  NCheckboxGroup,
  NCheckbox,
  NSpace,
  NDatePicker,
  NInput,
  NButton,
  NFormItemGi,
  NRadioGroup,
  NRadio,
  NInputNumber,
  NModal,
  NScrollbar,
  NGrid,
  NTreeSelect,
  type FormItemRule,
  type FormRules,
} from "naive-ui";

defineOptions({
  name: "noticeOperateDrawer",
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.norice | null;
  /** selected region id */
  selectedRegionId?: string;
  /** current notice list for calculating max sort index */
  noticeList?: Api.SystemManage.norice[];
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
const { channelOptions, channelLoading, getChannelOptions } = useChannel();

// 使用 serverStore
const serverStore = useServerStore();
const serverLoading = ref(false);

// 选择类型：channel 或 server
const selectionType = ref<'channel' | 'server'>('channel');

// 计算服务器树形选项（不添加"全部"选项）
const serverTreeOptions = computed(() => {
  return serverStore.serverTreeOptions;
});

// 渠道树形选项（添加"全部"选项）
const channelTreeOptions = computed(() => {
  const allOption = {
    label: $t('common.all' as any),
    key: 'ALL_CHANNELS'
  };

  const options = channelOptions.value
    .filter(option => option.value !== '') // 过滤掉原来的"全部"选项
    .map(option => ({
      label: option.label,
      key: option.value
    }));

  return [allOption, ...options];
});

// 选中的渠道ID列表（用于 NTreeSelect）
const selectedChannelIds = ref<string[]>([]);

// 选中的服务器ID列表（用于 NTreeSelect）
const selectedServerIds = ref<string[]>([]);

// 监听 selectedChannelIds 变化，更新 model.channelIds
watch(selectedChannelIds, (val) => {
  // 如果选中了"全部渠道"
  if (val.includes('ALL_CHANNELS')) {
    // 如果只有"全部"，保持；如果还有其他，移除"全部"
    if (val.length === 1) {
      model.value.channelIds = ['ALL'];
    } else {
      // 移除"全部"选项，只保留其他选中的
      const filtered = val.filter(id => id !== 'ALL_CHANNELS');
      selectedChannelIds.value = filtered;
      model.value.channelIds = filtered;
    }
  } else {
    model.value.channelIds = val.length > 0 ? val : [];
  }
});

// 监听 selectedServerIds 变化，更新 model.serverIds
watch(selectedServerIds, (val) => {
  // 过滤掉 region_ 开头的（分组节点）
  const filteredIds = val.filter(id => !String(id).startsWith('region_'));
  model.value.serverIds = filteredIds.length > 0 ? filteredIds : [];
});

const rules: FormRules = {
  noticeName: defaultRequiredRule,
  noticeIndex: [
      { required: true, message: $t('page.manage.norice.form.noticeIndexRequired'), trigger: ['input', 'blur'], type: 'number' },
      {
          trigger: ['input', 'blur'],
          validator(rule: FormItemRule, value: number | null) {
              if (value !== null && value < 0) {
              }
              return true;
          }
      }
  ],
  noticeType: defaultRequiredRule,
  noticeExplain: defaultRequiredRule,
  enable: defaultRequiredRule,
  channelIds: {
    required: true,
    trigger: ['input', 'blur', 'change'],
    validator(rule: FormItemRule, value: string[]) {
      if (selectionType.value === 'channel' && (!value || value.length === 0)) {
        return new Error($t('page.manage.norice.form.channelRequired') || '请选择渠道');
      }
      return true;
    }
  },
  serverIds: {
    required: true,
    trigger: ['input', 'blur', 'change'],
    validator(rule: FormItemRule, value: string[]) {
      if (selectionType.value === 'server' && (!value || value.length === 0)) {
        return new Error($t('page.manage.norice.form.serverRequired') || '请选择区服');
      }
      return true;
    }
  },
  noticeContent: {
    required: true,
    trigger: ['input', 'blur', 'change'],
    validator(rule: FormItemRule, value: Array<{ title: string; content: string; }>) {
      if (!value || value.length === 0 || !value.some(item => item.content?.trim())) {
        return new Error($t('page.manage.norice.form.contentRequired'));
      }
      return true;
    }
  }
};

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t("page.manage.norice.noriceadd"),
    edit: $t("page.manage.norice.noriceedit"),
  };
  return titles[props.operateType];
});

type Model = {
  id?: number;
  gameId: number;
  regionId: string;
  noticeName: string;
  noticeIndex: number | null;
  noticeType: string;
  noticeExplain: string;
  enable: string;
  startDate: number | null;
  endDate: number | null;
  noticeContent: Array<{ title: string; content: string; }>;
  channelIds: string[];
  serverIds: string[];
};

const model = ref<Model>(createDefaultModel());

function getMaxNoticeIndex(): number {
  if (!props.noticeList || props.noticeList.length === 0) {
    return 1;
  }

  const maxIndex = Math.max(
    ...props.noticeList.map(item => {
      const index = Number(item.noticeIndex);
      return isNaN(index) ? 0 : index;
    })
  );

  return maxIndex + 1;
}

function createDefaultModel(): Model {
  const now = Date.now();
  return {
    id: undefined,
    gameId: 1,
    regionId: "",
    noticeName: "",
    noticeIndex: props.operateType === 'add' ? getMaxNoticeIndex() : 1,
    noticeType: "",
    noticeExplain: "",
    enable: "1",
    startDate: now,
    endDate: now,
    noticeContent: [{ title: "", content: "" }],
    channelIds: [],
    serverIds: [],
  };
}

function handleInitModel() {
  if (props.operateType === 'edit' && props.rowData) {
    const row = props.rowData;

    let initialContent: Array<{ title: string; content: string; }> = [{ title: '', content: '' }];
    if (typeof row.noticeContent === 'string' && row.noticeContent.trim() !== '') {
      try {
        const parsed = JSON.parse(row.noticeContent);
        if (Array.isArray(parsed)) {
          initialContent = parsed.map(item => ({
            title: String(item?.title ?? ''),
            content: String(item?.content ?? '')
          }));
        } else if (typeof parsed === 'object' && parsed !== null) {
           initialContent = [{ title: String(parsed?.title ?? ''), content: String(parsed?.content ?? '')}];
        } else {
           initialContent = [{ title: '', content: String(row.noticeContent) }];
        }
      } catch (e) {
          initialContent = [{ title: '', content: String(row.noticeContent) }];
      }
    } else if (Array.isArray(row.noticeContent)) {
       initialContent = row.noticeContent.map(item => ({
         title: String(item?.title ?? ''),
         content: String(item?.content ?? '')
       }));
    }
    if (initialContent.length === 0) {
       initialContent = [{ title: '', content: '' }];
    }

    // Determine the string value ('1' or '0') for model.enable
    let enableStringValue: string = '0'; // Default to disabled
    const enableValue = row.enable;
    const enableValueString = String(enableValue).toLowerCase(); // Convert to lowercase string

    // Check if the string representation indicates 'enabled'
    if (enableValueString === '1' || enableValueString === 'true') {
      enableStringValue = '1';
    }
    // All other string values ('0', 'false', null, undefined, etc.) will result in '0'

    // Parse channelCode from the row data
    let channelIds: string[] = [];
    let serverIds: string[] = [];
    let selectedChannelIdsForTree: string[] = [];
    let selectedServerIdsForTree: string[] = [];

    // 判断数据来源：channelCode 还是 serverId
    if (row.channelCode) {
      selectionType.value = 'channel';
      if (row.channelCode === 'ALL') {
        channelIds = ['ALL'];
        selectedChannelIdsForTree = ['ALL_CHANNELS']; // 用于 TreeSelect 显示
      } else if (typeof row.channelCode === 'string') {
        channelIds = row.channelCode.split(',').map(id => id.trim()).filter(id => id);
        selectedChannelIdsForTree = channelIds; // 直接使用原始ID
      }
    } else if (row.serverId) {
      selectionType.value = 'server';
      if (typeof row.serverId === 'string') {
        serverIds = row.serverId.split(',').map((id: string) => id.trim()).filter((id: string) => id);
        selectedServerIdsForTree = serverIds; // 直接使用原始ID
      } else if (typeof row.serverId === 'number') {
        serverIds = [String(row.serverId)];
        selectedServerIdsForTree = serverIds;
      }
    }

    model.value = {
      id: row.id,
      gameId: Number(row.gameId ?? 1),
      regionId: String(row.regionId ?? ''),
      noticeName: String(row.noticeName ?? ''),
      noticeIndex: row.noticeIndex ? Number(row.noticeIndex) : null,
      noticeType: String(row.noticeType ?? ''),
      noticeExplain: String(row.noticeExplain ?? ''),
      enable: enableStringValue,          // Assign the determined string value
      startDate: row.startDate ? new Date(row.startDate).getTime() : Date.now(),
      endDate: row.endDate ? new Date(row.endDate).getTime() : Date.now(),
      noticeContent: initialContent,
      channelIds: channelIds,
      serverIds: serverIds,
    };

    // 设置选中的ID（用于 TreeSelect 回显）
    selectedChannelIds.value = selectedChannelIdsForTree;
    selectedServerIds.value = selectedServerIdsForTree;
  } else {
    model.value = createDefaultModel();
    // 确保新增时使用最新的最大排序值
    if (props.operateType === 'add') {
      model.value.noticeIndex = getMaxNoticeIndex();
    }
    // 清空选中的ID
    selectedChannelIds.value = [];
    selectedServerIds.value = [];
  }
}

function closeDrawer() {
  visible.value = false;
}

// Helper function to format date-time in local timezone according to ISO 8601 (T separator)
function formatLocalDateTime(timestamp: number | null): string | null {
  if (timestamp === null) return null;
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  // Use 'T' as the separator instead of space
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

async function handleSubmit() {
  await validate();
  try {
    const formattedStartDate = formatLocalDateTime(model.value.startDate);
    const formattedEndDate = formatLocalDateTime(model.value.endDate);

    // Process channelIds or serverIds based on selection type
    let channelCode = '';
    let serverId: string | undefined = undefined;

    if (selectionType.value === 'channel') {
      if (model.value.channelIds && model.value.channelIds.length > 0) {
        // 检查是否包含 'ALL' 或 'ALL_CHANNELS'
        if (model.value.channelIds.includes('ALL') || model.value.channelIds.includes('ALL_CHANNELS')) {
          channelCode = 'ALL';
        } else {
          channelCode = model.value.channelIds.join(',');
        }
      }
    } else if (selectionType.value === 'server') {
      if (model.value.serverIds && model.value.serverIds.length > 0) {
        serverId = model.value.serverIds.join(',');
      }
    }

    const commonData: any = {
      gameId: model.value.gameId,
      regionId: Number(model.value.regionId),
      noticeName: model.value.noticeName,
      noticeIndex: model.value.noticeIndex,
      noticeType: model.value.noticeType,
      noticeExplain: model.value.noticeExplain,
      enable: model.value.enable === "1",
      startDate: formattedStartDate || formatLocalDateTime(Date.now()), // Use current time if null
      noticeContent: model.value.noticeContent,
    };

    // Add channelCode or serverId based on selection type
    if (selectionType.value === 'channel') {
      commonData.channelCode = channelCode;
    } else {
      commonData.serverId = serverId;
    }

    if (props.operateType === "add") {
       const addData = {
         ...commonData,
         endDate: formattedEndDate || formatLocalDateTime(Date.now()), // Use current time if null
       };
      await fetchCreateNotice(addData);
      window.$message?.success($t("common.addSuccess"));
    } else {
       const updateData = {
         id: model.value.id,
         ...commonData,
         endDate: formattedEndDate || formatLocalDateTime(Date.now()), // Use current time if null
       };
      await fetchUpdateNotice(updateData);
      window.$message?.success($t("common.updateSuccess"));
    }

    closeDrawer();
    emit("submitted");
  } catch (error) {
    window.$message?.error($t("common.requestFailed"));
  }
}

function addContent() {
  if (Array.isArray(model.value.noticeContent)) {
    // 检查是否有空内容
    const hasEmpty = model.value.noticeContent.some(item => !item.title?.trim() && !item.content?.trim());
    if (hasEmpty) {
      window.$message?.warning('请先填写完当前内容后再添加新内容');
      return;
    }
    // 添加到最上面
    model.value.noticeContent.unshift({ title: "", content: "" });
  }
}

function removeContent(index: number) {
  if (Array.isArray(model.value.noticeContent)) {
     model.value.noticeContent.splice(index, 1);
  }
}

// 拖拽排序
let dragIndex = -1;
const isDragging = ref(false);

function onDragStart(index: number) {
  dragIndex = index;
  isDragging.value = true;
}

function onDragEnd() {
  isDragging.value = false;
}

function onDrop(index: number) {
  if (dragIndex === -1 || dragIndex === index) return;
  const [item] = model.value.noticeContent.splice(dragIndex, 1);
  model.value.noticeContent.splice(index, 0, item);
  dragIndex = -1;
}

// 监听选择类型变化，清空对应的选项
watch(selectionType, (newType) => {
  if (newType === 'channel') {
    model.value.serverIds = [];
    selectedServerIds.value = [];
  } else {
    model.value.channelIds = [];
    selectedChannelIds.value = [];
  }
  // 重新验证表单
  restoreValidation();
});

watch(visible, async (newVal) => {
  if (newVal) {
    serverLoading.value = true;
    try {
      await Promise.all([
        getChannelOptions(),
        serverStore.fetchServerList()
      ]);
      handleInitModel();
      restoreValidation();
    } finally {
      serverLoading.value = false;
    }
  }
});
</script>


<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-900px">
    <NScrollbar class="h-600px pr-50px">
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
            :label="$t('page.manage.norice.noticeName')"
            path="noticeName"
          >
            <NInput
              v-model:value="model.noticeName"
              :placeholder="$t('page.manage.norice.form.noticeName')"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.norice.noticeIndex')"
            path="noticeIndex"
          >
            <NInputNumber
              v-model:value="model.noticeIndex"
              :placeholder="$t('page.manage.norice.form.noticeIndex')"
              :min="0"
              style="width: 100%"
            />
          </NFormItemGi>

          <!-- <NFormItemGi
            span="24 m:24"
            :label="$t('page.manage.norice.noticeType')"
            path="noticeType"
          >
            <NRadioGroup v-model:value="model.noticeType">
              <NRadio
                v-for="item in serverNoticeOptions"
                :key="item.value"
                :value="item.value"
                :label="$t(item.label)"
              />
            </NRadioGroup>
          </NFormItemGi> -->

          <!-- <NFormItemGi
            span="24 m:24"
            :label="$t('page.manage.norice.noticeExplain')"
            path="noticeExplain"
          >
            <NRadioGroup v-model:value="model.noticeExplain">
              <NRadio
                v-for="item in serverNoticeLabelOptions"
                :key="item.value"
                :value="item.value"
                :label="$t(item.label)"
              />
            </NRadioGroup>
          </NFormItemGi> -->

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.norice.createDate')"
          >
            <NDatePicker
              v-model:value="model.startDate"
              type="datetime"
              :placeholder="$t('page.manage.norice.form.createDate')"
              clearable
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.norice.updateDate')"
          >
            <NDatePicker
              v-model:value="model.endDate"
              type="datetime"
              :placeholder="$t('page.manage.norice.form.updateDate')"
              clearable
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:24"
            :label="$t('page.manage.norice.enable')"
            path="enable"
          >
            <NRadioGroup v-model:value="model.enable">
              <NRadio
                v-for="item in serverNoticeStatusOptions"
                :key="item.value"
                :value="item.value"
                :label="$t(item.label)"
              />
            </NRadioGroup>
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.norice.selectionType')"
            path="selectionType"
          >
            <NRadioGroup v-model:value="selectionType">
              <NRadio value="channel">
                {{ $t('page.manage.norice.selectChannel') }}
              </NRadio>
              <NRadio value="server">
                {{ $t('page.manage.norice.selectServer') }}
              </NRadio>
            </NRadioGroup>
          </NFormItemGi>

          <NFormItemGi
            v-if="selectionType === 'channel'"
            span="24"
            :label="$t('page.manage.game.channel')"
            path="channelIds"
          >
            <NTreeSelect
              v-model:value="selectedChannelIds"
              :options="channelTreeOptions"
              :placeholder="$t('page.manage.game.channel')"
              :loading="channelLoading"
              multiple
              checkable
              cascade
              clearable
              :check-strategy="'all'"
              :max-tag-count="3"
              tag
            />
          </NFormItemGi>

          <NFormItemGi
            v-if="selectionType === 'server'"
            span="24"
            :label="$t('page.manage.serveritem.serverId')"
            path="serverIds"
          >
            <NTreeSelect
              v-model:value="selectedServerIds"
              :options="serverTreeOptions"
              :placeholder="$t('common.pleaseSelectServer')"
              :loading="serverLoading"
              multiple
              checkable
              cascade
              clearable
              :check-strategy="'child'"
              :max-tag-count="3"
              tag
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.norice.content')"
            path="noticeContent"
          >
            <div style="display: flex; flex-direction: column; gap: 16px; width: 100%">
              <div v-if="model.noticeContent.length > 1" style="color: #999; font-size: 12px; margin-bottom: -8px;">
                💡 {{ $t('page.manage.norice.form.dragTip') }}
              </div>
              <div
                v-for="(item, index) in model.noticeContent"
                :key="index"
                draggable="true"
                @dragstart="onDragStart(index)"
                @dragend="onDragEnd"
                @dragover.prevent
                @drop="onDrop(index)"
                class="content-item"
                :class="{ 'is-dragging': isDragging }"
              >
                <div class="drag-handle">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="4" cy="3" r="1.5"/>
                    <circle cx="4" cy="8" r="1.5"/>
                    <circle cx="4" cy="13" r="1.5"/>
                    <circle cx="12" cy="3" r="1.5"/>
                    <circle cx="12" cy="8" r="1.5"/>
                    <circle cx="12" cy="13" r="1.5"/>
                  </svg>
                </div>
                <div class="content-body">
                  <NInput
                    v-model:value="item.title"
                    placeholder="Title"
                    style="margin-bottom: 8px; width: 100%"
                  />
                  <NInput
                    v-model:value="item.content"
                    type="textarea"
                    :rows="3"
                    placeholder="Content"
                    style="margin-bottom: 8px; width: 100%"
                  />
                  <NButton
                    v-if="model.noticeContent.length > 1"
                    @click="removeContent(index)"
                    style="margin-bottom: 8px"
                  >
                    {{ $t("common.cancel") }}
                  </NButton>
                </div>
              </div>
              <div style="margin-top: 8px">
                <NButton type="primary" @click="addContent">
                  {{ $t("common.add") }}
                </NButton>
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
.content-item {
  width: 100%;
  border: 1px solid #eee;
  padding: 10px;
  border-radius: 4px;
  cursor: move;
  display: flex;
  gap: 10px;
  transition: all 0.2s;
}

.content-item:hover {
  border-color: #18a058;
  box-shadow: 0 2px 8px rgba(24, 160, 88, 0.15);
}

.content-item.is-dragging {
  opacity: 0.5;
}

.drag-handle {
  display: flex;
  align-items: center;
  color: #999;
  cursor: grab;
  padding: 4px;
  flex-shrink: 0;
}

.drag-handle:active {
  cursor: grabbing;
}

.content-item:hover .drag-handle {
  color: #18a058;
}

.content-body {
  flex: 1;
  min-width: 0;
}
</style>
