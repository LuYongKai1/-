<script setup lang="ts">
import { NModal, NDataTable, NTag } from "naive-ui";
import type { DataTableColumns } from "naive-ui";
import { computed, h } from "vue";

defineOptions({
  name: "ResultModal"
});

interface ResultData {
  roleId?: string | number;
  serverId?: string | number;
  success: boolean;
  errorMsg?: string;
}

interface Props {
  resultData: ResultData[] | null;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "操作结果"
});

const visible = defineModel<boolean>("visible", {
  default: false
});

const columns = computed<DataTableColumns<ResultData>>(() => [
  {
    title: "角色ID",
    key: "roleId",
    align: "center",
    width: 180,
    ellipsis: { tooltip: true },
    render: (row) => {
      return row.roleId || "-";
    }
  },
  {
    title: "服务器ID",
    key: "serverId",
    align: "center",
    width: 120,
    render: (row) => {
      return row.serverId || "-";
    }
  },
  {
    title: "状态",
    key: "success",
    align: "center",
    width: 120,
    render: (row) => {
      return h(
        NTag,
        {
          type: row.success ? "success" : "error",
          style: "min-width: 80px; text-align: center; display: flex; justify-content: center;"
        },
        { default: () => (row.success ? "成功" : "失败") }
      );
    }
  },
  {
    title: "错误信息",
    key: "errorMsg",
    align: "left",
    minWidth: 300,
    ellipsis: { tooltip: true },
    render: (row) => {
      return row.errorMsg || "-";
    }
  }
]);

const totalCount = computed(() => {
  return props.resultData?.length || 0;
});

const successCount = computed(() => {
  return props.resultData?.filter(item => item.success).length || 0;
});

const failCount = computed(() => {
  return totalCount.value - successCount.value;
});
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="`${title} (共 ${totalCount} 条，成功 ${successCount} 条，失败 ${failCount} 条)`"
    style="width: 1200px; max-width: 90vw"
    :mask-closable="true"
    :close-on-esc="true"
  >
    <div style="height: 600px; display: flex; flex-direction: column">
      <NDataTable
        :columns="columns"
        :data="resultData || []"
        :bordered="true"
        size="small"
        :max-height="560"
        flex-height
        style="flex: 1"
      />
    </div>
  </NModal>
</template>

<style scoped></style>
