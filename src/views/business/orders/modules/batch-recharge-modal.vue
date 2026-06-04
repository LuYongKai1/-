<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { NModal, NForm, NFormItem, NInput, NButton, NSpace } from "naive-ui";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { fetchBatchRecharge } from "@/service/api";
import { $t } from "@/locales";
import { useAuthStore } from "@/store/modules/auth";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "BatchRechargeModal",
});

interface Props {
  /** 选中的订单数据 */
  selectedOrders: Array<any>;
  /** 选中的行键 */
  checkedRowKeys: Array<string | number>;
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

const authStore = useAuthStore();
const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

// 表单数据
const model = ref({
  reason: '',
  operator: ''
});

// 表单验证规则
const rules = {
  reason: defaultRequiredRule,
  operator: defaultRequiredRule,
};

// 计算属性：选中订单数量
const selectedCount = computed(() => props.checkedRowKeys.length);

// 计算属性：有效的补单订单数量
const validOrdersCount = computed(() => {
  const allowedStatuses = ['0', '2', '3', '4', '6']; // 支付成功、支付失败、发货中、已发货、待补单
  return props.selectedOrders.filter(order =>
    allowedStatuses.includes(String(order.status))
  ).length;
});

// 重置表单
function resetForm() {
  model.value.reason = '';
  model.value.operator = authStore.userInfo.user.userName || '';
}

// 关闭弹窗
function closeModal() {
  visible.value = false;
  emit("close");
}

// 确认批量补单
async function handleConfirm() {
  try {
    await validate();

    // 验证选中订单
    if (props.checkedRowKeys.length === 0) {
      window.$message?.warning($t("page.manage.orders.selectOrder"));
      return;
    }

    // 检查订单状态，只有特定状态的订单才能补单
    const allowedStatuses = ['0', '2', '3', '4', '6']; // 支付成功、支付失败、发货中、已发货、待补单
    const validOrders = props.selectedOrders.filter(order =>
      allowedStatuses.includes(String(order.status))
    );

    if (validOrders.length !== props.selectedOrders.length) {
      window.$message?.error($t("page.manage.orders.noOrderReplenish", { count: props.selectedOrders.length - validOrders.length }));
      return;
    }

    const outOrderNos = validOrders
      .map(order => order.outOrderNo)
      .filter(outOrderNo => outOrderNo); // 过滤掉空值

    if (outOrderNos.length === 0) {
      window.$message?.error($t("page.manage.orders.noOrderReplenish"));
      return;
    }

    // 调用批量补单API
    const params = {
      outOrderNos,
      operator: model.value.operator,
      reason: model.value.reason
    };

    await fetchBatchRecharge(params);

    window.$message?.success($t("page.manage.orders.batchRechargeSuccess", { count: outOrderNos.length }));

    // 触发成功事件
    emit("success");
    closeModal();

  } catch (error) {
    console.error('批量补单失败:', error);
    handleApiCatchError(error, "批量补单");
  }
}

// 监听弹窗显示状态
watch(visible, (newVal) => {
  if (newVal) {
    resetForm();
    restoreValidation();
  }
});
</script>

<template>
  <NModal
    v-model:show="visible"
    :title="$t('common.batchRecharge')"
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
        <!-- <NFormItem
          :label="$t('page.manage.orders.operator')"
          path="operator"
          required
        >
          <NInput
            v-model:value="model.operator"
            :placeholder="$t('page.manage.orders.operator')"
            readonly
            disabled
          />
        </NFormItem> -->
        <NFormItem
          :label="$t('page.manage.orders.reason')"
          path="reason"
          required
        >
          <NInput
            v-model:value="model.reason"
            type="textarea"
            :placeholder="$t('page.manage.orders.reason')"
            :rows="4"
            clearable
          />
        </NFormItem>
      </NForm>
      <div class="mt-4 text-gray-500">
        <p>{{ $t('page.manage.orders.batchRechargeSelected', { count: selectedCount }) }}</p>
        <p v-if="validOrdersCount !== selectedCount" class="text-orange-500 mt-1">
          {{ $t('page.manage.orders.batchRechargeValidOrders', { count: validOrdersCount }) }}
        </p>
      </div>
    </div>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeModal">{{ $t("common.cancel") }}</NButton>
        <NButton type="primary" @click="handleConfirm">{{
          $t("common.confirm")
        }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
