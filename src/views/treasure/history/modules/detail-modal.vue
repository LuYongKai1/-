<script setup lang="ts">
import { computed } from "vue";
import { NModal, NDescriptions, NDescriptionsItem, NTag } from "naive-ui";
import { $t } from "@/locales";

defineOptions({
  name: "DetailModal",
});

interface Props {
  show: boolean;
  data: any;
}

interface Emits {
  (e: "update:show", value: boolean): void;
  (e: "openContentModal", title: string, content: any): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 格式化字段值显示
function formatFieldValue(value: any): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

// 获取操作类型文本
function getOperationTypeText(type: number): string {
  const typeMap: Record<number, string> = {
    1: $t('page.manage.treasure.operationTypeConsignment'),
    2: $t('page.manage.treasure.operationTypeRetrieve'),
    3: $t('page.manage.treasure.operationTypeTransfer'),
  };
  return typeMap[type] || `${$t('page.manage.treasure.unknown')}(${type})`;
}

// 处理JSON字段点击
function handleJsonClick(fieldName: string, value: any) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    emit("openContentModal", fieldName, parsed);
  } catch {
    emit("openContentModal", fieldName, value);
  }
}

const showModal = computed({
  get: () => props.show,
  set: (value) => emit("update:show", value),
});
</script>

<template>
  <NModal
    v-model:show="showModal"
    :title="$t('page.manage.treasure.detailInfo')"
    preset="card"
    style="width: 90%; max-width: 1200px"
  >
    <NDescriptions
      v-if="data"
      :column="2"
      bordered
      label-placement="left"
      :label-style="{ width: '150px', fontWeight: 'bold' }"
    >
      <NDescriptionsItem :label="$t('page.manage.treasure.logId')">
        {{ data.logId || '-' }}
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.manage.treasure.consignmentRecordId')">
        {{ data.consignmentId || '-' }}
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.manage.treasure.serverId')">
        {{ data.serverId || '-' }}
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.manage.treasure.serverName')">
        {{ data.serverName || '-' }}
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.manage.treasure.sourceOpenId')">
        {{ data.sourceOpenId || '-' }}
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.manage.treasure.sourceRoleId')">
        {{ data.sourceRoleId || '-' }}
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.manage.treasure.targetOpenId')">
        {{ data.targetOpenId || '-' }}
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.manage.treasure.targetRoleId')">
        {{ data.targetRoleId || '-' }}
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.manage.treasure.iuid')">
        {{ data.iuid || '-' }}
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.manage.treasure.itemId')">
        {{ data.itemId || '-' }}
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.manage.treasure.itemCount')">
        {{ data.itemCount || '-' }}
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.manage.treasure.operationType')">
        {{ getOperationTypeText(data.operationType) }}
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.manage.treasure.operationStatus')">
        <NTag
          :type="data.status === 'SUCCESS' ? 'success' : data.status === 'FAILURE' ? 'error' : 'default'"
        >
          {{ data.status || '-' }}
        </NTag>
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.manage.treasure.failReason')" :span="2">
        {{ data.failReason || '-' }}
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.manage.treasure.consignmentTime')">
        {{ data.createTime || '-' }}
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.manage.treasure.operateTime')">
        {{ data.operateTime || '-' }}
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.manage.treasure.operator')">
        {{ data.operator || '-' }}
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.manage.treasure.remark')" :span="2">
        {{ data.remark || '-' }}
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.manage.treasure.itemData')" :span="2">
        <pre
          v-if="data.itemData"
          class="json-preview"
          @click="handleJsonClick($t('page.manage.treasure.itemData'), data.itemData)"
        >
          {{ formatFieldValue(data.itemData) }}
        </pre>
        <span v-else>-</span>
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.manage.treasure.extrasParams')" :span="2">
        <pre
          v-if="data.extrasParams"
          class="json-preview"
          @click="handleJsonClick($t('page.manage.treasure.extrasParams'), data.extrasParams)"
        >
          {{ formatFieldValue(data.extrasParams) }}
        </pre>
        <span v-else>-</span>
      </NDescriptionsItem>
    </NDescriptions>
  </NModal>
</template>

<style scoped>
/* JSON预览样式 */
.json-preview {
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  padding: 8px;
  margin: 0;
  background-color: var(--n-code-color);
  border-radius: 4px;
  font-family: "Consolas", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.5;
  cursor: pointer;
  transition: background-color 0.2s;
}

.json-preview:hover {
  background-color: var(--n-code-color-hover, rgba(0, 0, 0, 0.05));
}
</style>

