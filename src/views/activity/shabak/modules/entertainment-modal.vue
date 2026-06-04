<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { NModal, NForm, NFormItem, NSelect, NButton, NSpace } from "naive-ui";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { fetchCreateEntertainmentActivity } from "@/service/api";
import { useServerStore } from "@/store/modules/server";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "EntertainmentModal",
});

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
const model = ref({
  serverId: "",
  amusementId: "",
});

// 表单验证规则
const rules = {
  serverId: defaultRequiredRule,
  amusementId: defaultRequiredRule,
};

// 服务器数据
const serverStore = useServerStore();
const serverTreeOptions = computed(() => serverStore.serverTreeOptions);
const serverLoading = ref(false);

// 娱乐活动类型选项
const amusementTypeOptions = [
  { label: "绝地争锋", value: "101" },
  { label: "迷宫猎踪", value: "600" },
  { label: "比奇保卫战", value: "610" },
  { label: "地宫血斗", value: "620" },
];

// 计算服务器选项
const serverOptions = computed(() => {
  const options: CommonType.Option<string>[] = [];

  serverTreeOptions.value.forEach((region: any) => {
    if (region.children && region.children.length > 0) {
      region.children.forEach((server: any) => {
        options.push({
          label: server.label,
          value: server.key,
        });
      });
    }
  });
  return options;
});

// 获取服务器列表
async function getServerOptions() {
  serverLoading.value = true;
  try {
    await serverStore.fetchServerList();
  } catch (err) {
    console.error("Error fetching server options:", err);
  } finally {
    serverLoading.value = false;
  }
}

// 重置表单
function resetForm() {
  model.value.serverId = "";
  model.value.amusementId = "";
}

// 关闭弹窗
function closeModal() {
  visible.value = false;
  emit("close");
}

// 提交加载状态
const submitLoading = ref(false);

// 确认创建活动
async function handleConfirm() {
  try {
    await validate();

    // 验证是否选择了必填项
    if (!model.value.serverId) {
      window.$message?.warning("请先选择区服");
      return;
    }
    if (!model.value.amusementId) {
      window.$message?.warning("请先选择活动类型");
      return;
    }

    submitLoading.value = true;

    // 调用创建娱乐活动API
    const response = await fetchCreateEntertainmentActivity({
      serverId: model.value.serverId,
      amusementId: model.value.amusementId,
    });

    // 使用通用响应处理函数检查错误
    const hasError = handleApiResponseError(response, "创建娱乐活动");

    if (!hasError) {
      // 成功
      window.$message?.success("创建娱乐活动成功");
      // 触发成功事件
      emit("success");
      closeModal();
    }
  } catch (error) {
    console.error("创建娱乐活动失败:", error);
    handleApiCatchError(error, "创建娱乐活动");
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
</script>

<template>
  <NModal
    v-model:show="visible"
    title="创建娱乐活动"
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
            :filter="(pattern, option) => (option.label as string)?.includes(pattern) ?? false"
          />
        </NFormItem>
        <NFormItem
          label="活动类型"
          path="amusementId"
          required
        >
          <NSelect
            v-model:value="model.amusementId"
            :options="amusementTypeOptions"
            placeholder="请选择活动类型"
          />
        </NFormItem>
      </NForm>
      <div class="mt-4 text-gray-500">
        <p>确认要在选中的区服创建娱乐活动吗？</p>
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
