<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { NModal, NForm, NFormItem, NSelect, NButton, NSpace, NRadioGroup, NRadio, NInputNumber } from "naive-ui";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { fetchClearRank } from "@/service/api";
import { useServerStore } from "@/store/modules/server";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "ClearRankModal",
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
  rankingType: "",
  action: "",
  updateBless: false,
  rewardKindGroup: 0,
});

// 表单验证规则
const rules = {
  serverId: defaultRequiredRule,
  rankingType: defaultRequiredRule,
  action: defaultRequiredRule,
  rewardKindGroup: defaultRequiredRule,
};

// 服务器数据
const serverStore = useServerStore();
const serverTreeOptions = computed(() => serverStore.serverTreeOptions);
const serverLoading = ref(false);

// 排行榜类型选项
const rankingTypeOptions = [
  { label: "雕像", value: "1" },
];

// 操作类型选项
const actionOptions = [
  { label: "更新", value: "1" },
  { label: "重置", value: "2" },
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
  model.value.rankingType = "";
  model.value.action = "";
  model.value.updateBless = false;
  model.value.rewardKindGroup = 0;
}

// 关闭弹窗
function closeModal() {
  visible.value = false;
  emit("close");
}

// 提交加载状态
const submitLoading = ref(false);

// 确认清空排行榜
async function handleConfirm() {
  try {
    await validate();

    // 验证是否选择了必填项
    if (!model.value.serverId) {
      window.$message?.warning("请先选择区服");
      return;
    }
    if (!model.value.rankingType) {
      window.$message?.warning("请先选择排行榜类型");
      return;
    }
    if (!model.value.action) {
      window.$message?.warning("请先选择操作类型");
      return;
    }
    if (model.value.rewardKindGroup === undefined || model.value.rewardKindGroup === null) {
      window.$message?.warning("请先输入奖励类型组");
      return;
    }

    submitLoading.value = true;

    // 调用清空排行榜API
    const response = await fetchClearRank({
      serverId: model.value.serverId,
      rankingType: model.value.rankingType,
      action: model.value.action,
      updateBless: model.value.updateBless,
      rewardKindGroup: model.value.rewardKindGroup,
    });

    // 使用通用响应处理函数检查错误
    const hasError = handleApiResponseError(response, "清空排行榜");

    if (!hasError) {
      // 成功
      window.$message?.success("清空排行榜成功");
      // 触发成功事件
      emit("success");
      closeModal();
    }
  } catch (error) {
    console.error("清空排行榜失败:", error);
    handleApiCatchError(error, "清空排行榜");
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
    title="清空排行榜"
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
          label="操作类型"
          path="action"
          required
        >
          <NSelect
            v-model:value="model.action"
            :options="actionOptions"
            placeholder="请选择操作类型"
          />
        </NFormItem>
           <NFormItem
          label="排行榜类型"
          path="rankingType"
          required
        >
          <NSelect
            v-model:value="model.rankingType"
            :options="rankingTypeOptions"
            placeholder="请选择排行榜类型"
          />
        </NFormItem>
        <NFormItem
          label="奖励类型组"
          path="rewardKindGroup"
          required
        >
          <NInputNumber
            v-model:value="model.rewardKindGroup"
            placeholder="请输入奖励类型组"
            :min="0"
            class="w-full"
          />
        </NFormItem>
        <NFormItem
          label="是否更新膜拜"
          path="updateBless"
        >
          <NRadioGroup v-model:value="model.updateBless">
            <NRadio :value="true">是</NRadio>
            <NRadio :value="false">否</NRadio>
          </NRadioGroup>
        </NFormItem>
      </NForm>
      <div class="mt-4 text-gray-500">
        <p>确认要清空选中区服的排行榜数据吗？</p>
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
