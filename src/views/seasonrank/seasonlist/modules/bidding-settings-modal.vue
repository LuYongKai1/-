<script setup lang="ts">
import { ref, computed, watch, defineAsyncComponent } from "vue";
import { NModal, NForm, NFormItem, NSelect, NInput, NInputNumber, NButton, NSpace } from "naive-ui";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { useServerStore } from "@/store/modules/server";
import { handleApiCatchError } from "@/utils/common";
import { fetchSetSeasonBidding } from "@/service/api/game-manage";

const ResultModal = defineAsyncComponent(() => import("./result-modal.vue"));

defineOptions({
  name: "BiddingSettingsModal"
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

// Long类型的最大值（Java Long.MAX_VALUE）
const MAX_LONG_VALUE = '9223372036854775807';

interface ResultData {
  success: boolean;
  serverId: number;
  errorMsg?: string;
}

// 表单数据
const model = ref({
  gameId: 101,
  serverId: null as number | null,
  guildId: '' as string,
  score: null as number | null
});

// 表单验证规则
const rules = {
  serverId: {
    required: true,
    type: "number",
    message: "请选择跨服服务器",
    trigger: ["blur", "change"]
  },
  guildId: [
    {
      required: true,
      message: "请输入公会ID",
      trigger: ["blur", "change"]
    },
    {
      validator: (rule: any, value: string) => {
        // 如果为空，由 required 规则处理，这里不重复验证
        if (!value || value.trim() === '') {
          return true;
        }
        // 验证是否为纯数字
        if (!/^\d+$/.test(value)) {
          return new Error("公会ID必须为纯数字");
        }
        // 验证是否为0
        if (value === '0') {
          return new Error("公会ID必须大于0");
        }
        // 验证是否以0开头
        if (value.length > 1 && value[0] === '0') {
          return new Error("公会ID不能以0开头");
        }
        // 验证是否超过Long类型最大值
        if (value.length > MAX_LONG_VALUE.length ||
            (value.length === MAX_LONG_VALUE.length && value > MAX_LONG_VALUE)) {
          return new Error(`公会ID超出最大值（${MAX_LONG_VALUE}）`);
        }
        return true;
      },
      trigger: ["blur", "change"]
    }
  ],
  score: {
    required: true,
    type: "number",
    message: "请输入竞价分数",
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
    serverId: null,
    guildId: '',
    score: null
  };
}

// 限制只能输入数字
function handleKeyPress(e: KeyboardEvent) {
  if (!/[0-9]/.test(e.key)) {
    e.preventDefault();
  }
}

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

    if (!model.value.serverId) {
      window.$message?.warning("请选择跨服服务器");
      return;
    }

    if (!model.value.guildId || model.value.guildId.trim() === '') {
      window.$message?.warning("请输入公会ID");
      return;
    }

    if (model.value.score === null || model.value.score === undefined) {
      window.$message?.warning("请输入竞价分数");
      return;
    }

    submitLoading.value = true;

    // 调用设置赛季竞价 API
    const response = await fetchSetSeasonBidding({
      gameId: model.value.gameId,
      serverId: model.value.serverId,
      guildId: model.value.guildId,
      score: model.value.score
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
      // 如果返回的是数组结果，显示结果模态框
      if (Array.isArray(results) && results.length > 0) {
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
        // 单个结果直接提示
        window.$message?.success("设置赛季竞价成功");
      }

      emit("success");
      closeModal();
    } else {
      window.$message?.error(
        responseData?.msg || responseData?.message || "操作失败"
      );
    }
  } catch (error) {
    console.error("设置赛季竞价失败:", error);
    handleApiCatchError(error, "设置赛季竞价");
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
    title="设置赛季竞价"
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
          path="serverId"
        >
          <NSelect
            v-model:value="model.serverId"
            placeholder="请选择跨服服务器"
            :options="crossServerOptions"
            :loading="serverLoading"
            clearable
            filterable
          />
        </NFormItem>

        <NFormItem
          label="公会ID"
          path="guildId"
        >
          <NInput
            v-model:value="model.guildId"
            placeholder="请输入公会ID（最大值: 9223372036854775807）"
            class="w-full"
            clearable
            maxlength="19"
            @keypress="handleKeyPress"
          />
        </NFormItem>

        <NFormItem
          label="竞价分数"
          path="score"
        >
          <NInputNumber
            v-model:value="model.score"
            placeholder="请输入竞价分数"
            class="w-full"
            :min="0"
            :show-button="false"
          />
        </NFormItem>
      </NForm>
    </div>

    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeModal">取消</NButton>
        <NButton
          type="primary"
          :loading="submitLoading"
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
