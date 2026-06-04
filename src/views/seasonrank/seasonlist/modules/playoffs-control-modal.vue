<script setup lang="ts">
import { ref, computed, watch, defineAsyncComponent } from "vue";
import { NModal, NForm, NFormItem, NSelect, NRadioGroup, NRadio, NButton, NSpace, NAlert } from "naive-ui";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { useServerStore } from "@/store/modules/server";
import { handleApiCatchError } from "@/utils/common";
import { fetchControlPlayoffs } from "@/service/api/game-manage";

const ResultModal = defineAsyncComponent(() => import("./result-modal.vue"));

defineOptions({
  name: "PlayoffsControlModal"
});

interface Emits {
  (e: "success"): void;
  (e: "close"): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", {
  default: false
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

interface ResultData {
  success: boolean;
  serverId: number;
  errorMsg?: string;
}

// 表单数据
const model = ref({
  gameId: 101,
  serverList: [] as number[],
  semifinal: false,
  final: false
});

// 表单验证规则
const rules = {
  serverList: {
    required: true,
    type: "array",
    min: 1,
    message: "请至少选择一个服务器",
    trigger: ["blur", "change"]
  }
};

// 服务器数据
const serverStore = useServerStore();
const serverLoading = ref(false);
const resultModalVisible = ref(false);
const resultData = ref<ResultData[] | null>(null);

// 跨服服务器选项
const crossServerOptions = computed(() => {
  const options: CommonType.Option<number>[] = [];

  serverStore.crossServerList?.forEach((crossServer: any) => {
    options.push({
      label: crossServer.serverName,
      value: Number(crossServer.serverId)
    });
  });

  return options;
});

// 获取跨服服务器列表
async function loadCrossServers() {
  serverLoading.value = true;
  try {
    await serverStore.fetchCrossServerList();
  } catch (err) {
    console.error("获取跨服列表失败:", err);
    window.$message?.error("获取跨服列表失败");
  } finally {
    serverLoading.value = false;
  }
}

// 重置表单
function resetForm() {
  model.value = {
    gameId: 101,
    serverList: [],
    semifinal: false,
    final: false
  };
}

// 监听半决赛变化，如果开启则关闭决赛
watch(() => model.value.semifinal, (newVal) => {
  if (newVal && model.value.final) {
    model.value.final = false;
  }
});

// 监听决赛变化，如果开启则关闭半决赛
watch(() => model.value.final, (newVal) => {
  if (newVal && model.value.semifinal) {
    model.value.semifinal = false;
  }
});

// 计算提示信息
const validationTip = computed(() => {
  const semifinalOpen = model.value.semifinal;
  const finalOpen = model.value.final;

  if (semifinalOpen && finalOpen) {
    return { type: 'error' as const, text: '半决赛和决赛不能同时开启' };
  }
  if (!semifinalOpen && !finalOpen) {
    return { type: 'info' as const, text: '两者都关闭时，将关闭季后赛功能' };
  }
  if (semifinalOpen) {
    return { type: 'success' as const, text: '已开启半决赛，决赛将自动关闭' };
  }
  if (finalOpen) {
    return { type: 'success' as const, text: '已开启决赛，半决赛将自动关闭' };
  }
  return { type: 'info' as const, text: '' };
});

// 关闭弹窗
function closeModal() {
  visible.value = false;
  emit("close");
}

// 提交加载状态
const submitLoading = ref(false);

// 确认提交
async function handleConfirm() {
  try {
    await validate();

    if (model.value.serverList.length === 0) {
      window.$message?.warning("请至少选择一个跨服服务器");
      return;
    }

    // 验证业务规则：半决赛和决赛不能同时开启
    if (model.value.semifinal && model.value.final) {
      window.$message?.error("半决赛和决赛不能同时开启，请只选择一个");
      return;
    }

    submitLoading.value = true;

    // 调用控制季后赛 API
    const response = await fetchControlPlayoffs({
      gameId: model.value.gameId,
      serverList: model.value.serverList,
      semifinal: model.value.semifinal,
      final: model.value.final
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
        window.$message?.success("控制季后赛操作成功");
      }

      emit("success");
      closeModal();
    } else {
      window.$message?.error(
        responseData?.msg || responseData?.message || "操作失败"
      );
    }
  } catch (error) {
    console.error("控制季后赛失败:", error);
    handleApiCatchError(error, "控制季后赛");
  } finally {
    submitLoading.value = false;
  }
}

// 监听弹窗显示状态
watch(visible, (newVal) => {
  if (newVal) {
    resetForm();
    restoreValidation();
    loadCrossServers();
  }
});
</script>

<template>
  <NModal
    v-model:show="visible"
    title="控制季后赛"
    preset="card"
    class="w-700px"
  >
    <div class="mt-4">
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        label-width="120"
        require-mark-placement="right-hanging"
      >
        <NFormItem
          label="跨服服务器"
          path="serverList"
        >
          <NSelect
            v-model:value="model.serverList"
            placeholder="请选择跨服服务器（支持多选）"
            :options="crossServerOptions"
            :loading="serverLoading"
            multiple
            clearable
            filterable
          />
        </NFormItem>

        <NFormItem
          label="半决赛"
          path="semifinal"
        >
          <NRadioGroup v-model:value="model.semifinal" name="semifinal">
            <NSpace :size="16">
              <NRadio :value="true">开启</NRadio>
              <NRadio :value="false">关闭</NRadio>
            </NSpace>
          </NRadioGroup>
        </NFormItem>

        <NFormItem
          label="决赛"
          path="final"
        >
          <NRadioGroup v-model:value="model.final" name="final">
            <NSpace :size="16">
              <NRadio :value="true">开启</NRadio>
              <NRadio :value="false">关闭</NRadio>
            </NSpace>
          </NRadioGroup>
        </NFormItem>
      </NForm>

      <NAlert
        v-if="validationTip.text"
        :type="validationTip.type"
        class="mt-16px"
        :show-icon="true"
      >
        {{ validationTip.text }}
      </NAlert>

      <div class="mt-16px text-gray-500 text-sm">
        <p class="font-medium mb-8px">规则说明：</p>
        <ul class="list-disc list-inside ml-2 space-y-4px">
          <li>半决赛和决赛可以都关闭</li>
          <li>半决赛和决赛只能开启一个，不能同时开启</li>
          <li>开启其中一个时，另一个将自动关闭</li>
        </ul>
      </div>
    </div>

    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton secondary @click="closeModal">取消</NButton>
        <NButton
          type="primary"
          :loading="submitLoading"
          :disabled="model.semifinal && model.final"
          @click="handleConfirm"
        >
          确认
        </NButton>
      </NSpace>
    </template>
  </NModal>

  <ResultModal
    v-model:visible="resultModalVisible"
    :result-data="resultData"
  />
</template>

<style scoped></style>
