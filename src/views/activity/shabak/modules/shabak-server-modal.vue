<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { NModal, NForm, NFormItem, NSelect, NButton, NSpace } from "naive-ui";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { fetchCreateShabakActivity } from "@/service/api";
import { useServerStore } from "@/store/modules/server";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "ShabakServerModal",
});

interface Props {
  /** 活动阶段类型: 1-竞标开始, 2-竞标结束, 3-战场开始 */
  phase: number;
  /** 阶段名称 */
  phaseName: string;
}

const props = defineProps<Props>();

interface Emits {
  (e: "success"): void;
  (e: "close"): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", {
  default: false,
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

// 表单数据
const model = ref<{
  serverId: string;
  crossServer: number;
}>({
  serverId: "",
  crossServer: 0,
});

// 表单验证规则
const rules = {
  serverId: defaultRequiredRule,
};

// 服务器数据
const serverStore = useServerStore();
const serverTreeOptions = computed(() => serverStore.serverTreeOptions);
const serverLoading = ref(false);

// 类型选项
const crossServerOptions = [
  { label: "本服", value: 0 },
  { label: "跨服", value: 1 },
];

// 计算服务器选项 - 根据类型显示不同列表
const serverOptions = computed(() => {
  const options: CommonType.Option<string>[] = [];

  if (model.value.crossServer) {
    // 跨服：显示跨服列表
    serverStore.crossServerList.forEach((crossServer: any) => {
      options.push({
        label: crossServer.serverName,
        value: String(crossServer.serverId),
      });
    });
  } else {
    // 本服：显示本服列表
    serverStore.serverList.forEach((server: any) => {
      options.push({
        label: server.serverName,
        value: String(server.serverId),
      });
    });
  }

  return options;
});

// 获取服务器列表
async function getServerOptions() {
  serverLoading.value = true;
  try {
    if (model.value.crossServer) {
      // 获取跨服列表
      await serverStore.fetchCrossServerList();
    } else {
      // 获取本服列表
      await serverStore.fetchServerList();
    }
  } catch (err) {
    console.error("Error fetching server options:", err);
  } finally {
    serverLoading.value = false;
  }
}

// 重置表单
function resetForm() {
  model.value.serverId = "";
  model.value.crossServer = 0;
}

// 关闭弹窗
function closeModal() {
  visible.value = false;
  emit("close");
}

// 提交加载状态
const submitLoading = ref(false);

// 确认开启活动
async function handleConfirm() {
  try {
    await validate();

    // 验证是否选择了服务器
    if (!model.value.serverId) {
      window.$message?.warning("请先选择区服");
      return;
    }

    submitLoading.value = true;

    // 调用开启沙巴克活动API
    const response = await fetchCreateShabakActivity({
      serverId: model.value.serverId,
      phase: props.phase,
      crossServer: model.value.crossServer === 1,
    });

    // 使用通用响应处理函数检查错误
    const hasError = handleApiResponseError(response, `开启沙巴克活动-${props.phaseName}`);

    if (!hasError) {
      // 成功
      window.$message?.success(`【${props.phaseName}】开启成功`);
      // 触发成功事件
      emit("success");
      closeModal();
    }
  } catch (error) {
    console.error("开启沙巴克活动失败:", error);
    handleApiCatchError(error, `开启沙巴克活动-${props.phaseName}`);
  } finally {
    submitLoading.value = false;
  }
}

// 监听弹窗显示状态
watch(visible, (newVal) => {
  if (newVal) {
    resetForm();
    restoreValidation();
    getServerOptions();
  }
});

// 监听类型切换，重新加载服务器列表
watch(() => model.value.crossServer, () => {
  // 切换类型时清空已选择的服务器
  model.value.serverId = "";
  // 重新加载对应类型的服务器列表
  getServerOptions();
});
</script>

<template>
  <NModal
    v-model:show="visible"
    :title="`${phaseName} - 选择区服`"
    preset="card"
    class="w-600px"
  >
    <div class="mt-4">
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        label-width="auto"
        require-mark-placement="right-hanging"
      >
        <NFormItem
          label="区服选择"
          path="serverId"
          required
        >
          <NSelect
            v-model:value="model.serverId"
            placeholder="请选择区服"
            :options="serverOptions"
            :loading="serverLoading"
            clearable
            filterable
          />
        </NFormItem>
        <NFormItem
          label="开启沙巴克类型"
          path="crossServer"
        >
          <NSelect
            v-model:value="model.crossServer"
            :options="crossServerOptions"
            placeholder="请选择类型"
          />
        </NFormItem>
      </NForm>
      <div class="mt-4 text-gray-500">
        <p>确认要在选中的区服开启【{{ phaseName }}】吗？</p>
      </div>
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
</template>

<style scoped></style>
