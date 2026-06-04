<script setup lang="tsx">
import { ref, computed, watch } from 'vue';
import {
  NDrawer,
  NDrawerContent,
  NButton,
  NSpace,
  NCard,
  NAlert,
  NSpin,
  NTransfer
} from 'naive-ui';
import { $t } from '@/locales';
import { scopeTypeRecord } from '@/constants/business';
import { useChannel } from '@/hooks/business/useChannel';
import { useServerStore } from '@/store/modules/server';
import { useAuth } from '@/hooks/business/auth';
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import {
  fetchAssignChannelRange,
  fetchAssignServerRange,
  fetchGetAssignChannelList,
  fetchGetAssignServerList
} from '@/service/api';

// 类型定义
interface Props {
  visible: boolean;
  activityId: number | null;
  activityName: string;
  campaignCode: string;
  scopeChannel: number;
  scopeServer: number;
  channelIds?: string;
  serverIds?: string;
}

interface Emits {
  (e: 'update:visible', visible: boolean): void;
  (e: 'submitted'): void;
}

interface FormData {
  channelIds: string[];
  serverIds: string[];
}

interface AssignedItem {
  channelId?: number | string;
  serverId?: number | string;
}

// Props 和 Emits
const props = withDefaults(defineProps<Props>(), {
  visible: false,
  activityId: null,
  activityName: '',
  campaignCode: '',
  scopeChannel: 0,
  scopeServer: 0,
  channelIds: '',
  serverIds: ''
});

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", {
  default: false,
});
// 响应式数据
const formData = ref<FormData>({
  channelIds: [],
  serverIds: []
});

const serverLoading = ref(false);
const submitting = ref(false);

// Hooks 和 Store
const { channelOptions, channelLoading, getChannelOptions } = useChannel();
const serverStore = useServerStore();
const { hasAuth } = useAuth();

// 计算属性
const canAssignChannel = computed(() => props.scopeChannel === 1);
const canAssignServer = computed(() => props.scopeServer === 1);

const channelScopeText = computed(() =>
  $t(scopeTypeRecord[String(props.scopeChannel) as Api.SystemManage.scopeType])
);

const serverScopeText = computed(() =>
  $t(scopeTypeRecord[String(props.scopeServer) as Api.SystemManage.scopeType])
);

const channelTransferOptions = computed(() => {
  const options = channelOptions.value
    .filter(item => item.value !== '')
    .map(item => ({
      label: item.label,
      value: String(item.value),
      key: String(item.value)
    }));

  return options;
});

const serverTransferOptions = computed(() => {
  const options = serverStore.serverList.map((item: any) => ({
    label: item.serverName,
    value: String(item.serverId),
    key: String(item.serverId)
  }));

  return options;
});

// 工具函数 - 提取数据列表的公共逻辑
function extractDataList(response: any): any[] {
  if (response.response?.data?.rows) {
    return response.response.data.rows;
  }
  if (response.data?.rows) {
    return response.data.rows;
  }
  if (response.data) {
    return Array.isArray(response.data) ? response.data : [];
  }
  return [];
}

// 业务函数
async function getServerList(): Promise<void> {
  try {
    serverLoading.value = true;
    const response = await serverStore.fetchServerList();
    handleApiResponseError(response);
  } catch (error) {
    handleApiCatchError(error, '获取区服列表失败');
  } finally {
    serverLoading.value = false;
  }
}

async function getAssignedChannelList(): Promise<void> {
  if (!props.activityId) return;

  try {
    const response = await fetchGetAssignChannelList({ campaignId: props.activityId });
    handleApiResponseError(response);

    const dataList = extractDataList(response);

    if (dataList.length > 0) {
      const assignedChannelIds = dataList.map((item: AssignedItem) => String(item.channelId));

      formData.value.channelIds = assignedChannelIds;
    } else {
      formData.value.channelIds = [];
    }
  } catch (error) {
    handleApiCatchError(error, '获取已分配渠道列表失败');
  }
}

async function getAssignedServerList(): Promise<void> {
  if (!props.activityId) return;

  try {
    const response = await fetchGetAssignServerList({ campaignId: props.activityId });
    handleApiResponseError(response);

    const dataList = extractDataList(response);

    if (dataList.length > 0) {
      const assignedServerIds = dataList.map((item: AssignedItem) => String(item.serverId));

      formData.value.serverIds = assignedServerIds;
    } else {
      formData.value.serverIds = [];
    }
  } catch (error) {
    handleApiCatchError(error, '获取已分配区服列表失败');
  }
}

async function initializeDrawerData(): Promise<void> {

  formData.value.channelIds = [];
  formData.value.serverIds = [];

  try {
    // 获取基础数据
    const baseDataPromises: Promise<any>[] = [];

    if (canAssignChannel.value) {
      baseDataPromises.push(getChannelOptions());
    }
    if (canAssignServer.value) {
      baseDataPromises.push(getServerList());
    }

    if (baseDataPromises.length > 0) {
      await Promise.all(baseDataPromises);
    }

    // 获取已分配数据进行回显
    const assignPromises: Promise<any>[] = [];

    if (canAssignChannel.value) {
      assignPromises.push(getAssignedChannelList());
    }
    if (canAssignServer.value) {
      assignPromises.push(getAssignedServerList());
    }

    if (assignPromises.length > 0) {
      await Promise.all(assignPromises);
    }
  } catch (error) {
    console.error('初始化分配抽屉数据失败:', error);
  }
}

// 事件处理函数
function closeDrawer() {
  visible.value = false;
}
async function handleSubmit(): Promise<void> {
  if (submitting.value) return;

  try {
    submitting.value = true;
    const promises: Promise<any>[] = [];

    // 分配渠道
    if (canAssignChannel.value && formData.value.channelIds.length > 0) {
      promises.push(
        fetchAssignChannelRange({
          campaignId: props.activityId!,
          channelIds: formData.value.channelIds
        })
      );
    }

    // 分配区服
    if (canAssignServer.value && formData.value.serverIds.length > 0) {
      promises.push(
        fetchAssignServerRange({
          campaignId: props.activityId!,
          serverIds: formData.value.serverIds
        })
      );
    }

    // 执行分配请求
    if (promises.length > 0) {
      const responses = await Promise.all(promises);

      // 处理每个响应的错误
      responses.forEach(response => {
        handleApiResponseError(response);
      });

      window.$message?.success($t('page.manage.giftactivity.allocationDrawer.success'));
      emit('submitted');
      closeDrawer();
    } else {
      window.$message?.warning($t('page.manage.giftactivity.allocationDrawer.pleaseSelectChannelOrServer'));
    }
  } catch (error) {
    handleApiCatchError(error, $t('page.manage.giftactivity.allocationDrawer.allocationFailed'));
  } finally {
    submitting.value = false;
  }
}

// 计算提交按钮是否禁用
const isSubmitDisabled = computed(() => {
  if (!canAssignChannel.value && !canAssignServer.value) return true;
  if (submitting.value) return true;

  const hasChannelSelection = canAssignChannel.value && formData.value.channelIds.length > 0;
  const hasServerSelection = canAssignServer.value && formData.value.serverIds.length > 0;

  return !hasChannelSelection && !hasServerSelection;
});

// 监听器
watch(() => props.visible, async (visible) => {
  if (visible && props.activityId) {
    await initializeDrawerData();
  }
});
</script>

<template>
  <NDrawer
    :width="600"
    :trap-focus="false"
    placement="right"
    v-model:show="visible"
  >
    <NDrawerContent
      :title="`${$t(
        'page.manage.giftactivity.allocationDrawer.title'
      )} - ${activityName}`"
      :native-scrollbar="false"
      closable
    >
      <div class="drawer-content">
        <!-- 活动信息 -->
        <NCard title="活动信息" size="small" class="info-card">
          <div class="info-list">
            <div class="info-item">
              <span class="info-label"
                >{{
                  $t("page.manage.giftactivity.allocationDrawer.activityId")
                }}:</span
              >
              <span>{{ activityId }}</span>
            </div>
            <div class="info-item">
              <span class="info-label"
                >{{
                  $t("page.manage.giftactivity.allocationDrawer.activityName")
                }}:</span
              >
              <span>{{ activityName }}</span>
            </div>
            <!-- <div class="info-item">
              <span class="info-label"
                >{{
                  $t("page.manage.giftactivity.campaignCode")
                }}:</span
              >
              <span>{{ campaignCode }}</span>
            </div> -->
          </div>
        </NCard>

        <!-- 渠道分配 -->
        <NCard
          :title="$t('page.manage.giftactivity.allocationDrawer.channelScope')"
          size="small"
          class="allocation-card"
        >
          <div class="allocation-content">
            <div class="scope-info">
              <span class="scope-label"
                >{{ $t("page.manage.giftactivity.scopeChannel") }}:</span
              >
              <span
                class="scope-text"
                :class="{ 'scope-active': canAssignChannel }"
              >
                {{ channelScopeText }}
              </span>
            </div>

            <div v-if="!canAssignChannel" class="alert-container">
              <NAlert type="info" show-icon>
                {{
                  $t(
                    "page.manage.giftactivity.allocationDrawer.channelScopeTips"
                  )
                }}
              </NAlert>
            </div>

            <div v-else class="transfer-container">
              <NSpin :show="channelLoading">
                <div class="transfer-wrapper">
                  <div class="transfer-label">
                    {{
                      $t(
                        "page.manage.giftactivity.allocationDrawer.selectChannel"
                      )
                    }}:
                  </div>

                  <NTransfer
                    v-model:value="formData.channelIds"
                    :options="channelTransferOptions"
                    source-filterable
                    target-filterable
                    source-filter-placeholder="搜索可选渠道"
                    target-filter-placeholder="搜索已选渠道"
                  />

                  <div class="selection-count">
                    {{
                      $t(
                        "page.manage.giftactivity.allocationDrawer.selectedChannel",
                        {
                          count: formData.channelIds.length,
                          total: channelTransferOptions.length,
                        }
                      )
                    }}
                  </div>
                </div>
              </NSpin>
            </div>
          </div>
        </NCard>

        <!-- 区服分配 -->
        <NCard
          :title="$t('page.manage.giftactivity.allocationDrawer.serverScope')"
          size="small"
          class="allocation-card"
        >
          <div class="allocation-content">
            <div class="scope-info">
              <span class="scope-label"
                >{{ $t("page.manage.giftactivity.scopeServer") }}:</span
              >
              <span
                class="scope-text"
                :class="{ 'scope-active': canAssignServer }"
              >
                {{ serverScopeText }}
              </span>
            </div>

            <div v-if="!canAssignServer" class="alert-container">
              <NAlert type="info" show-icon>
                {{
                  $t(
                    "page.manage.giftactivity.allocationDrawer.serverScopeTips"
                  )
                }}
              </NAlert>
            </div>

            <div v-else class="transfer-container">
              <NSpin :show="serverLoading">
                <div class="transfer-wrapper">
                  <div class="transfer-label">
                    {{
                      $t(
                        "page.manage.giftactivity.allocationDrawer.selectServer"
                      )
                    }}:
                  </div>

                  <NTransfer
                    v-model:value="formData.serverIds"
                    :options="serverTransferOptions"
                    source-filterable
                    target-filterable
                    source-filter-placeholder="搜索可选区服"
                    target-filter-placeholder="搜索已选区服"
                  />

                  <div class="selection-count">
                    {{
                      $t(
                        "page.manage.giftactivity.allocationDrawer.selectedServer",
                        {
                          count: formData.serverIds.length,
                          total: serverTransferOptions.length,
                        }
                      )
                    }}
                  </div>
                </div>
              </NSpin>
            </div>
          </div>
        </NCard>
      </div>

      <template #footer>
        <NSpace>
          <NButton @click="closeDrawer">{{ $t("common.cancel") }}</NButton>
          <NButton
            v-if="hasAuth('operate:campaignChannel:add') && hasAuth('operate:giftCampaignServer:add')"
            type="primary"
            :disabled="isSubmitDisabled"
            :loading="submitting"
            @click="handleSubmit"
          >
            {{ $t("common.confirm") }}
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-card,
.allocation-card {
  margin-bottom: 0;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-label {
  width: 5rem;
  color: #6b7280;
  flex-shrink: 0;
}

.allocation-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.scope-info {
  display: flex;
  align-items: center;
}

.scope-label {
  width: 5rem;
  color: #6b7280;
  flex-shrink: 0;
}

.scope-text {
  font-weight: 500;
  color: #9ca3af;
}

.scope-text.scope-active {
  color: #2563eb;
}

.alert-container {
  margin-top: 0;
}

.transfer-container {
  margin-top: 0;
}

.transfer-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.transfer-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.selection-count {
  font-size: 0.875rem;
  color: #9ca3af;
}
</style>
