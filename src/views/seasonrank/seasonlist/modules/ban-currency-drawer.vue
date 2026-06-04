<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, reactive, ref, watch } from "vue";
import { fetchBanCurrency } from "@/service/api/game-manage";
import { useServerStore } from "@/store/modules/server";
import { handleApiCatchError } from "@/utils/common";

const ResultModal = defineAsyncComponent(() => import("./result-modal.vue"));

defineOptions({
  name: "BanCurrencyDrawer"
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
  banList: "",
  selectedServerIds: [] as string[]
});

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
  model.banList = "";
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

  // 解析输入的数组格式，支持 [1,2,3] 或 1,2,3 格式
  let banListArray: number[] = [];
  try {
    const input = model.banList.trim();
    // 空值时按空数组提交
    if (input === "") {
      banListArray = [];
    }
    // 如果输入包含方括号，直接解析 JSON
    else if (input.startsWith('[') && input.endsWith(']')) {
      banListArray = JSON.parse(input);
    } else {
      // 否则按逗号分割
      banListArray = input.split(',').map(item => Number(item.trim()));
    }

    // 验证是否都是有效数字
    if (banListArray.some(num => isNaN(num))) {
      window.$message?.warning("禁止货币列表格式错误，请输入数字数组，如：[1,2,3] 或 1,2,3");
      return;
    }
  } catch (error) {
    window.$message?.warning("禁止货币列表格式错误，请输入数字数组，如：[1,2,3] 或 1,2,3");
    return;
  }

  submitLoading.value = true;

  try {
    const response = await fetchBanCurrency({
      gameId: 101,
      serverList: serverIds,
      banList: banListArray
    });

    // 解析响应数据
    let responseData = response;
    if (response?.data) {
      responseData = response.data;
    }
    if (response?.response?.data) {
      responseData = response.response.data;
    }

    const code = (responseData as any)?.code;
    const results = (responseData as any)?.data || [];

    if (code === 200 || code === 0) {
      // 显示结果模态框
      if (results && results.length > 0) {
        resultData.value = results;
        resultModalVisible.value = true;

        // 统计成功和失败数量
        const successCount = results.filter((item: any) => item.success).length;
        const failCount = results.length - successCount;

        if (failCount === 0) {
          window.$message?.success(`禁止货币操作成功，共 ${successCount} 个服务器`);
        } else if (successCount === 0) {
          window.$message?.error(`禁止货币操作失败，共 ${failCount} 个服务器失败`);
        } else {
          window.$message?.warning(`禁止货币操作完成，成功 ${successCount} 个，失败 ${failCount} 个`);
        }
      } else {
        window.$message?.success(
          `禁止货币操作成功，共 ${serverIds.length} 个服务器`
        );
      }

      emit("submitted");
      closeDrawer();
    } else {
      window.$message?.error(
        (responseData as any)?.msg || (responseData as any)?.message || "操作失败"
      );
    }
  } catch (error) {
    handleApiCatchError(error, "禁止货币");
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
    <NDrawerContent title="禁止货币" :native-scrollbar="false" closable>
      <NForm label-placement="left" :label-width="120" :show-feedback="false">
        <NGrid responsive="screen" item-responsive :x-gap="16" :y-gap="16">
          <NFormItemGi span="24" label="禁止货币列表">
            <NInput
              v-model:value="model.banList"
              placeholder="请输入禁止货币列表（可为空），如：[1,2,3,4] 或 1,2,3,4"
              clearable
            />
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
