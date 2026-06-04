<script setup lang="ts">
import { computed, reactive, watch, ref } from 'vue';
import { NModal, NSpin, NCheckboxGroup, NCheckbox, NButton, NEmpty, NForm, NFormItem, NRadioGroup, NRadio, NSpace } from 'naive-ui';
import { useNaiveForm } from '@/hooks/common/form';
import { fetchSaveCustomerServiceSwitch } from '@/service/api/operate-mange';
import { fetchGetChannelList } from '@/service/api/game-manage';
import { $t } from '@/locales';

defineOptions({
  name: 'CsToggleOperateDrawer',
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.CustomerServiceSwitch | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false,
});

const { formRef, validate, restoreValidation } = useNaiveForm();

// 渠道选项（使用 channelName 作为 value 传递）
const channelOptions = ref<Array<{ label: string; value: string }>>([]);
const channelLoading = ref(false);

// 获取渠道选项列表
async function getChannelOptions() {
  channelLoading.value = true;
  try {
    const response = await fetchGetChannelList();

    // 处理不同的响应格式
    let channelList: any[] = [];

    if (response?.response?.data?.data && Array.isArray(response.response.data.data)) {
      channelList = response.response.data.data;
    } else if (response?.data?.data && Array.isArray(response.data.data)) {
      channelList = response.data.data;
    } else if (response?.data && Array.isArray(response.data)) {
      channelList = response.data;
    } else if (Array.isArray(response)) {
      channelList = response;
    }

    const options = channelList.map((item: any) => {
      const channelName = item.channelName || item.name || '';
      const briefName = item.channelBriefName || '';
      const label = briefName ? `${channelName}(${briefName})` : channelName;

      return {
        label,
        value: channelName,
      };
    });

    channelOptions.value = options;
  } catch (error) {
    channelOptions.value = [];
  } finally {
    channelLoading.value = false;
  }
}

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: '新增客服开关配置',
    edit: '编辑客服开关配置',
  };
  return titles[props.operateType];
});

// 选中的渠道（数组形式）
const selectedChannels = ref<string[]>([]);

// 搜索关键词
const searchKeyword = ref('');

// 过滤后的渠道列表
const filteredChannels = computed(() => {
  if (!searchKeyword.value) {
    return channelOptions.value;
  }
  const keyword = searchKeyword.value.toLowerCase();
  return channelOptions.value.filter(channel =>
    channel.label.toLowerCase().includes(keyword)
  );
});

type Model = Pick<Api.SystemManage.CustomerServiceSwitch, 'channelCodes' | 'status'>;

const model: Model = reactive(createDefaultModel());

function createDefaultModel(): Model {
  return {
    channelCodes: '',
    status: 1,
  };
}

type RuleKey = 'selectedChannels' | 'status';

const rules: Record<RuleKey, App.Global.FormRule> = {
  selectedChannels: {
    required: true,
    type: 'array',
    message: '请选择渠道',
  },
  status: {
    required: true,
    type: 'number',
    message: '请选择状态',
  },
};

const statusOptions = [
  { label: '禁用', value: 0 },
  { label: '启用', value: 1 },
];

function handleInitModel() {
  Object.assign(model, createDefaultModel());
  selectedChannels.value = [];

  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model, props.rowData);
    // 将 channelCodes 字符串转换为数组
    if (props.rowData.channelCodes) {
      selectedChannels.value = props.rowData.channelCodes.split(',').map(code => code.trim());
    }
  }
}

// 切换渠道选中状态
function toggleChannel(channelKey: string) {
  const index = selectedChannels.value.indexOf(channelKey);
  if (index > -1) {
    selectedChannels.value.splice(index, 1);
  } else {
    selectedChannels.value.push(channelKey);
  }
}

// 全选
function selectAll() {
  selectedChannels.value = filteredChannels.value.map(c => c.value);
}

// 清空选择
function clearSelection() {
  selectedChannels.value = [];
}

// 移除选中的渠道
function removeChannel(channelKey: string) {
  selectedChannels.value = selectedChannels.value.filter(key => key !== channelKey);
}

// 获取渠道显示名称
function getChannelLabel(channelKey: string) {
  const channel = channelOptions.value.find(opt => opt.value === channelKey);
  return channel ? channel.label : channelKey;
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  try {
    // 选中的渠道为 channelName，转为逗号分隔字符串传递
    const submitData = {
      channelCodes: selectedChannels.value.join(','),
      status: model.status,
    };

    const response = await fetchSaveCustomerServiceSwitch(submitData);

    if (response.error) {
      window.$message?.error(response.error.message || '操作失败');
      return;
    }

    window.$message?.success(props.operateType === 'add' ? '新增成功' : '修改成功');
    closeDrawer();
    emit('submitted');
  } catch (error) {
    console.error('提交失败:', error);
    window.$message?.error('操作失败');
  }
}

watch(visible, () => {
  if (visible.value) {
    handleInitModel();
    restoreValidation();
    // 获取渠道列表
    if (channelOptions.value.length === 0) {
      getChannelOptions();
    }
  }
});
</script>

<template>
  <NModal
    v-model:show="visible"
    :title="title"
    preset="card"
    style="width: 900px; max-width: 90vw;"
    class="sync-modal"
  >
    <div v-if="channelLoading" class="flex justify-center items-center py-12">
      <NSpin size="large" />
      <span class="ml-4 text-lg" style="color: var(--n-text-color);">加载中...</span>
    </div>

    <div v-else-if="channelOptions.length === 0" class="text-center py-12">
      <div class="mb-4" style="color: var(--n-error-color);">
        <icon-mdi-alert-circle class="w-16 h-16 mx-auto" />
      </div>
      <p class="text-lg" style="color: var(--n-error-color);">暂无渠道数据</p>
    </div>

    <!-- 主内容区 -->
    <div v-else class="modal-content-wrapper">
      <NForm ref="formRef" :model="{ selectedChannels, status: model.status }" :rules="rules">
        <!-- 穿梭框布局 -->
        <div v-if="channelOptions.length > 0" class="transfer-layout">
          <!-- 左侧面板：可选渠道列表 -->
          <div class="transfer-panel">
            <div class="panel-header">
              <span class="panel-title">共 {{ filteredChannels.length }} 项</span>
              <div>
                <NButton text size="small" @click="selectAll">全选</NButton>
                <span style="margin: 0 4px; color: var(--n-divider-color);">|</span>
                <NButton text size="small" @click="clearSelection">清空</NButton>
              </div>
            </div>
            <div class="panel-body">
              <NCheckboxGroup v-model:value="selectedChannels">
                <div class="channel-list">
                  <div
                    v-for="channel in filteredChannels"
                    :key="channel.value"
                    class="channel-item"
                    :class="{ 'channel-item-selected': selectedChannels.includes(channel.value) }"
                  >
                    <NCheckbox :value="channel.value" :label="channel.label" />
                  </div>
                </div>
              </NCheckboxGroup>
            </div>
          </div>

          <!-- 右侧面板：已选渠道列表 -->
          <div class="transfer-panel">
            <div class="panel-header">
              <span class="panel-title">已选 {{ selectedChannels.length }} 项</span>
              <NButton text size="small" @click="clearSelection">清空</NButton>
            </div>
            <div class="panel-body">
              <!-- 已选渠道列表 -->
              <div v-if="selectedChannels.length > 0" class="selected-list">
                <div
                  v-for="channelKey in selectedChannels"
                  :key="channelKey"
                  class="selected-item"
                >
                  <span>{{ getChannelLabel(channelKey) }}</span>
                  <NButton
                    text
                    size="small"
                    @click="removeChannel(channelKey)"
                    class="remove-btn"
                  >
                    ×
                  </NButton>
                </div>
              </div>
              <!-- 空状态 -->
              <NEmpty v-else description="暂无已选服务器" size="small" />
            </div>
          </div>
        </div>

        <!-- 无数据状态 -->
        <NEmpty v-else description="暂无渠道数据" />

        <!-- 状态选择 -->
        <NFormItem label="状态" path="status" label-placement="top" style="margin-top: 24px;">
          <NRadioGroup v-model:value="model.status">
            <NSpace :size="16">
              <NRadio v-for="item in statusOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </NRadio>
            </NSpace>
          </NRadioGroup>
        </NFormItem>
      </NForm>
    </div>

    <!-- 底部操作按钮 -->
    <template #footer>
      <div class="flex gap-2 justify-end">
        <NButton
          @click="closeDrawer"
          size="medium"
        >
          {{ $t("common.cancel") }}
        </NButton>
        <NButton
          type="primary"
          @click="handleSubmit"
          :disabled="selectedChannels.length === 0"
          size="medium"
        >
          {{ $t("common.confirm") }}
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
.modal-content-wrapper {
  min-height: 500px;
}

.transfer-layout {
  display: flex;
  gap: 1rem;
  height: 500px;
}

.transfer-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--n-border-color);
  border-radius: 0.5rem;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--n-divider-color);
}

.panel-title {
  font-size: 0.875rem;
  font-weight: 500;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
}

.channel-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.channel-item {
  padding: 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.channel-item:hover {
  background-color: var(--n-color-hover);
}

.channel-item-selected {
  background-color: var(--n-color-hover);
}

.selected-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.selected-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  border: 1px solid var(--n-border-color);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.selected-item:hover {
  border-color: var(--n-border-color-hover);
}

.remove-btn {
  font-size: 1.25rem;
  font-weight: bold;
  min-width: 24px;
}
</style>
