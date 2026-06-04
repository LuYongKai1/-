<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NButton, NForm, NFormItemGi, NGrid, NInput, NModal, NScrollbar, NSpace, NTag } from "naive-ui";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { fetchAuditGsRoleTag } from "@/service/api/game-manage";
import { $t } from "@/locales";
import { handleApiCatchError, handleApiResponseError } from "@/utils/common";
import { gsRoleTagTypeRecord } from "@/constants/business";

defineOptions({
  name: "RoleAuditModal",
});

interface Props {
  /** 角色数据 */
  rowData?: any;
}

const props = defineProps<Props>();

interface Emits {
  (e: "submitted"): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", {
  default: false,
});

const { formRef, validate, restoreValidation } = useNaiveForm();
useFormRules();

type AuditStatus = 0 | 1;

type Model = Record<string, never>;

function createDefaultModel(): Model {
  return {};
}

const model = ref<Model>(createDefaultModel());

/** 当前准备提交的审核结果：通过(1)/拒绝(0) */
const pendingAuditStatus = ref<AuditStatus>(1);

// 加载状态
const loading = ref(false);

// 计算属性
const title = computed(() => {
  return `${$t("page.manage.gsRole.auditrole")} - ${props.rowData?.roleId || ""}`;
});

const currentStatusText = computed(() => {
  const statusMap = {
    0: $t("page.manage.gsRole.statusOptions.disable"),
    1: $t("page.manage.gsRole.statusOptions.enable"),
    2: $t("page.manage.gsRole.statusOptions.pending"),
  };
  return statusMap[props.rowData?.status as keyof typeof statusMap] || "-";
});

const currentStatusType = computed<NaiveTagType>(() => {
  const status = props.rowData?.status;
  return status === 1 ? "success" : status === 0 ? "error" : "warning";
});

// 格式化额度显示
const formattedQuota = computed(() => {
  const quota = props.rowData?.quota;

  if (quota === null || quota === undefined) {
    return "-";
  }

  // 如果是数字，可以添加千分位格式化
  if (typeof quota === "number") {
    return quota.toLocaleString();
  }

  return String(quota);
});

// 获取标签类型显示文本
const getTagTypeText = (tagType: any) => {
  if (tagType === null || tagType === undefined) {
    return "-";
  }

  try {
    const typeKey = `${tagType}` as keyof typeof gsRoleTagTypeRecord;
    return $t(gsRoleTagTypeRecord[typeKey]);
  } catch (error) {
    return String(tagType);
  }
};

// 获取标签类型样式
type NaiveTagType = "default" | "info" | "success" | "warning" | "error" | "primary";
const getTagTypeStyle = (tagType: any) => {
  const typeMap: Record<string, NaiveTagType> = {
    "0": "default",
    "1": "info",
    "2": "success",
    "3": "warning",
    "4": "error",
  };

  const key = String(tagType) as keyof typeof typeMap;
  return typeMap[key] || "default";
};

const rules: Record<string, App.Global.FormRule | App.Global.FormRule[]> = {};

function handleInitModel() {
  model.value = createDefaultModel();
  pendingAuditStatus.value = 1;
}

// 关闭弹窗
function closeModal() {
  visible.value = false;
  restoreValidation();
  loading.value = false;
  pendingAuditStatus.value = 1;
  model.value = createDefaultModel();
}

// 提交审核
async function handleAudit(auditStatus: AuditStatus) {
  try {
    pendingAuditStatus.value = auditStatus;
    await validate();

    loading.value = true;

    const auditData = {
      id: props.rowData?.id,
      status: auditStatus,
    };

    const response = await fetchAuditGsRoleTag(auditData);

    if (handleApiResponseError(response, "审核操作")) {
      loading.value = false;
      return;
    }

    window.$message?.success(
      auditStatus === 1
        ? $t("common.auditPass")
        : $t("common.auditReject")
    );

    closeModal();
    emit('submitted');

  } catch (error) {
    loading.value = false;
    handleApiCatchError(error, "审核操作");
  }
}

// 通过审核
function handleApprove() {
  handleAudit(1);
}

// 拒绝审核
function handleReject() {
  handleAudit(0);
}

// 监听弹窗显示
watch(visible, newVal => {
  if (newVal) {
    restoreValidation();
    loading.value = false;
    handleInitModel();
    loading.value = false;
  }
});

// 监听 rowData 变化
watch(() => props.rowData, () => {
  if (visible.value) {
    // noop
  }
}, { deep: true });
</script>

<template>
  <NModal
    v-model:show="visible"
    :mask-closable="true"
    preset="card"
    :title="title"
    class="w-600px"
  >
    <NScrollbar class="max-h-500px pr-20px"> <!-- 增加高度以容纳更多内容 -->
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        :label-width="100"
      >
        <NGrid responsive="screen" item-responsive>
          <!-- 角色ID显示 -->
          <NFormItemGi span="24" :label="$t('page.manage.gsRole.roleId')">
            <NInput
              :value="props.rowData?.roleId || ''"
              placeholder="-"
              disabled
              style="width: 100%"
            />
          </NFormItemGi>

          <!-- 使用者姓名显示 -->
          <NFormItemGi span="24" :label="$t('page.manage.gsRole.userName')">
            <NInput
              :value="props.rowData?.userName || ''"
              placeholder="-"
              disabled
              style="width: 100%"
            />
          </NFormItemGi>

          <!-- 额度显示 -->
          <NFormItemGi span="24" :label="$t('page.manage.gsRole.quota')">
            <NInput
              :value="formattedQuota"
              placeholder="-"
              disabled
              style="width: 100%"
            />
          </NFormItemGi>

          <!-- 标签类型显示 -->
          <NFormItemGi span="24" :label="$t('page.manage.gsRole.tagType')">
            <NTag :type="getTagTypeStyle(props.rowData?.tagType)">
              {{ getTagTypeText(props.rowData?.tagType) }}
            </NTag>
          </NFormItemGi>

          <!-- 当前状态显示 -->
          <NFormItemGi span="24" :label="$t('page.manage.gsRole.status')">
            <NTag :type="currentStatusType">
              {{ currentStatusText }}
            </NTag>
          </NFormItemGi>
        </NGrid>
      </NForm>
    </NScrollbar>

    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton
          type="error"
          ghost
          :loading="loading"
          @click="handleReject"
        >
          {{ $t('common.reject') }}
        </NButton>
        <NButton
          type="primary"
          ghost
          :loading="loading"
          @click="handleApprove"
        >
          {{ $t('common.approve') }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>

</style>
