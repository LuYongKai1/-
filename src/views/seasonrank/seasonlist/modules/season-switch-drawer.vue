<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, reactive, ref, watch } from "vue";
import { fetchSetSeasonFeatureState } from "@/service/api/game-manage";
import { useServerStore } from "@/store/modules/server";
import { handleApiCatchError } from "@/utils/common";

const ResultModal = defineAsyncComponent(() => import("./result-modal.vue"));

defineOptions({
  name: "SeasonSwitchDrawer"
});

interface ResultData {
  success: boolean;
  serverId: number;
  errorMsg?: string;
}

interface Emits {
  (e: "submitted"): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", {
  default: false
});

const serverStore = useServerStore();
const submitLoading = ref(false);
const loadingServers = ref(false);
const resultModalVisible = ref(false);
const resultData = ref<ResultData[] | null>(null);

const model = reactive({
  feature: 0,
  state: 0,
  selectedServerIds: [] as string[]
});

const featureOptions = [
  { label: "all（全部）", value: 0 },
  { label: "shop（商店）", value: 1 },
  { label: "achievement（成就）", value: 2 },
  { label: "must_do（必做）", value: 3 },
  { label: "ranking（排行榜）", value: 4 },
  { label: "mandala（曼陀罗）", value: 5 },
  { label: "currency（货币）", value: 6 }
];

const stateOptions = [
  { label: "运行", value: 0 },
  { label: "关闭", value: 1 }
];

// 使用封装好的包含跨服的服务器树选项
const serverTreeOptions = computed(() => serverStore.mixedServerTreeOptions);

const canSubmit = computed(() => getFilteredServerIds().length > 0 && !submitLoading.value && !loadingServers.value);
const isBusy = computed(() => submitLoading.value || loadingServers.value);

// 过滤掉区域节点和跨服组节点，处理跨服ID（去掉 cross_ 前缀）
function getFilteredServerIds(): number[] {
  return model.selectedServerIds
    .filter(id => {
      const idStr = String(id);
      return !idStr.startsWith("region_") && idStr !== "cross_server_group";
    })
    .map(id => {
      const idStr = String(id);
      if (idStr.startsWith("cross_")) {
        return Number(idStr.replace("cross_", ""));
      }
      return Number(id);
    });
}

function getServerName(serverId: number) {
  // 使用 serverStore 的统一方法获取服务器名称（支持普通服和跨服）
  return serverStore.getServerNameById(serverId);
}

async function loadServers() {
  loadingServers.value = true;
  try {
    // 同时加载普通服和跨服列表
    await Promise.all([
      serverStore.fetchServerList(),
      serverStore.fetchCrossServerList()
    ]);
  } finally {
    loadingServers.value = false;
  }
}

function resetForm() {
  model.feature = 0;
  model.state = 0;
  model.selectedServerIds = [];
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  if (submitLoading.value) return;

  const serverIds = getFilteredServerIds();
  if (serverIds.length === 0) {
    window.$message?.warning("请选择服务器");
    return;
  }

  if (!Number.isInteger(model.feature) || model.feature < 0 || model.feature > 6) {
    window.$message?.warning("功能编号仅支持 0~6");
    return;
  }

  submitLoading.value = true;

  try {
    const response = await fetchSetSeasonFeatureState({
      serverList: serverIds,
      feature: model.feature,
      state: model.state
    });

    // 解析响应数据
    let responseData = response;
    if (response?.data) {
      responseData = response.data;
    }
    if (response?.response?.data) {
      responseData = response.response.data;
    }

    const code = responseData?.code;
    const results = responseData?.data || [];

    if (code === 200 || code === 0) {
      // 显示结果模态框
      if (results && results.length > 0) {
        resultData.value = results;
        resultModalVisible.value = true;

        // 统计成功和失败数量
        const successCount = results.filter((item: any) => item.success).length;
        const failCount = results.length - successCount;

        if (failCount === 0) {
          window.$message?.success(`操作成功，共 ${successCount} 个服务器`);
        } else if (successCount === 0) {
          window.$message?.error(`操作失败，共 ${failCount} 个服务器失败`);
        } else {
          window.$message?.warning(`操作完成，成功 ${successCount} 个，失败 ${failCount} 个`);
        }
      } else {
        const actionText = model.state === 0 ? "运行" : "关闭";
        window.$message?.success(
          `赛季功能${actionText}成功，共 ${serverIds.length} 个服务器`
        );
      }

      emit("submitted");
      closeDrawer();
    } else {
      window.$message?.error(
        responseData?.msg || responseData?.message || "操作失败"
      );
    }
  } catch (error) {
    handleApiCatchError(error, "设置赛季开关");
  } finally {
    submitLoading.value = false;
  }
}

watch(visible, (newVal) => {
  if (newVal) {
    loadServers();
    resetForm();
  }
});

onMounted(() => {
  loadServers();
});
</script>

<template>
  <NDrawer v-model:show="visible" :width="720" display-directive="show">
    <NDrawerContent title="赛季开关" :native-scrollbar="false" closable>
      <NForm label-placement="left" :label-width="120" :show-feedback="false">
        <NGrid responsive="screen" item-responsive :x-gap="16" :y-gap="16">
          <NFormItemGi span="24" label="功能编号">
            <NSelect
              v-model:value="model.feature"
              :options="featureOptions"
              placeholder="请选择功能编号"
              filterable
              clearable
            />
          </NFormItemGi>

          <NFormItemGi span="24" label="开关状态">
            <NRadioGroup v-model:value="model.state" name="season-switch-state">
              <NSpace :size="16">
                <NRadio :value="0">运行</NRadio>
                <NRadio :value="1">关闭</NRadio>
              </NSpace>
            </NRadioGroup>
          </NFormItemGi>

          <NFormItemGi span="24" label="服务器选择">
            <NTreeSelect
              v-model:value="model.selectedServerIds"
              :options="serverTreeOptions"
              placeholder="请选择服务器（支持批量）"
              multiple
              cascade
              checkable
              clearable
              :check-strategy="'child'"
              :max-tag-count="3"
              tag
              :loading="loadingServers"
              :disabled="loadingServers"
            />
          </NFormItemGi>
        </NGrid>
      </NForm>

      <template #footer>
        <NSpace justify="end" :size="16">
          <NButton secondary :disabled="isBusy" @click="resetForm">
            重置
          </NButton>
          <NButton secondary :disabled="isBusy" @click="closeDrawer">
            取消
          </NButton>
          <NButton type="primary" :loading="submitLoading" :disabled="!canSubmit" @click="handleSubmit">
            确认
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>

  <ResultModal
    v-model:visible="resultModalVisible"
    :result-data="resultData"
  />
</template>

