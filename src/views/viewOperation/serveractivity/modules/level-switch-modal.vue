<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useNaiveForm } from "@/hooks/common/form";
import { fetchUpdateConfigSwitch } from "@/service/api";
import { $t } from "@/locales";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import { useServerStore } from "@/store/modules/server";

import {
  NSpace,
  NFormItemGi,
  NGrid,
  NModal,
  NForm,
  NButton,
  NScrollbar,
  NTreeSelect,
  NSwitch,
} from "naive-ui";

defineOptions({
  name: "DungeonSwitchModal",
});

interface Emits {
  (e: "submitted"): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", { default: false });
const { formRef, validate, restoreValidation } = useNaiveForm();
const serverStore = useServerStore();
const serverTreeOptions = computed(() => serverStore.serverTreeOptions);

// 等级开关状态
const isOpen = ref<number>(1); // 1表示开启，0表示关闭

// 选中的服务器ID
const selectedServerIds = ref<string[]>([]);

// 表单模型
const model = computed(() => ({
  servers: selectedServerIds.value,
  isOpen: isOpen.value,
}));

// 表单验证规则
const rules = {
  servers: {
    required: true,
    message: $t("common.pleaseSelectServer"),
    trigger: ["change", "blur"],
    validator: () => getFilteredServerIds().length > 0,
  },
};

// 过滤服务器ID（排除区域节点）
function getFilteredServerIds(): number[] {
  return selectedServerIds.value
    .filter((id) => !String(id).startsWith("region_"))
    .map((id) => Number(id));
}

// 监听弹框显示状态
watch(visible, (newVal) => {
  if (!newVal) {
    // 关闭时重置表单
    resetForm();
  }
});

// 重置表单
function resetForm() {
  isOpen.value = 1;
  selectedServerIds.value = [];
  restoreValidation();
}

// 关闭弹框
function closeModal() {
  visible.value = false;
}

// 提交
async function handleSubmit() {
  await validate();
  try {
    const serverIds = getFilteredServerIds();
    if (serverIds.length === 0) {
      window.$message?.warning($t("common.pleaseSelectServer"));
      return;
    }

    const response = await fetchUpdateConfigSwitch({
      gid: serverIds,
      isOpen: isOpen.value,
    });

    // 使用封装好的错误处理方法
    const hasError = handleApiResponseError(
      response,
      $t("common.levelSwitch")
    );
    if (hasError) {
      return;
    }

    window.$message?.success(
      isOpen.value === 1
        ? $t("common.levelSwitch") + $t("common.enableSuccess")
        : $t("common.levelSwitch") + $t("common.disableSuccess")
    );

    closeModal();
    emit("submitted");
  } catch (error) {
    console.error("更新等级开关失败:", error);
    handleApiCatchError(error, $t("common.levelSwitch"));
  }
}
</script>

<template>
  <NModal
    v-model:show="visible"
    :title="$t('common.levelSwitch')"
    preset="card"
    class="w-600px"
  >
    <NScrollbar class="h-200px pr-20px">
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        :label-width="120"
      >
        <NGrid responsive="screen" item-responsive>
          <NFormItemGi
            span="24 m:24"
            :label="$t('common.levelSwitch')"
            path="isOpen"
          >
            <NSpace>
              <NSwitch
                v-model:value="isOpen"
                :checked-value="1"
                :unchecked-value="0"
              />
              <span>{{ isOpen === 1 ? $t("common.enable") : $t("common.disable") }}</span>
            </NSpace>
          </NFormItemGi>

          <NFormItemGi
            span="24 m:24"
            :label="$t('common.pleaseSelectServer')"
            path="servers"
          >
            <NTreeSelect
              v-model:value="selectedServerIds"
              :options="serverTreeOptions"
              :placeholder="$t('common.pleaseSelectServer')"
              multiple
              cascade
              checkable
              clearable
              :check-strategy="'child'"
              :max-tag-count="3"
              tag
            />
          </NFormItemGi>
        </NGrid>
      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeModal">{{ $t("common.cancel") }}</NButton>
        <NButton type="primary" @click="handleSubmit">
          {{ $t("common.confirm") }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>

