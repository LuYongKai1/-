<script setup lang="ts">
import { computed, h } from "vue";
import { NModal, NCard, NDataTable, NTag } from "naive-ui";
import { useServerStore } from "@/store/modules/server";

defineOptions({
  name: "SeasonResultModal"
});

interface ResultData {
  success: boolean;
  serverId: number;
  errorMsg?: string;
}

interface Props {
  resultData: ResultData[] | null;
}

const props = defineProps<Props>();

const visible = defineModel<boolean>("visible", {
  default: false
});

const serverStore = useServerStore();

const serverNameMap = computed(() => {
  const map = new Map<number, string>();
  serverStore.serverList.forEach(server => {
    map.set(server.serverId, server.serverName);
  });
  return map;
});

function getServerName(serverId: number): string {
  return serverNameMap.value.get(serverId) || `服务器${serverId}`;
}

const columns = computed(() => [
  {
    title: "服务器ID",
    key: "serverId",
    align: "center" as const,
    width: 100
  },
  {
    title: "服务器名称",
    key: "serverName",
    align: "center" as const,
    width: 150,
    render: (row: ResultData) => getServerName(row.serverId)
  },
  {
    title: "状态",
    key: "success",
    align: "center" as const,
    width: 120,
    render: (row: ResultData) => {
      return h(
        NTag,
        {
          type: row.success ? "success" : "error",
          style: "min-width: 70px; text-align: center; display: flex; justify-content: center;"
        },
        { default: () => (row.success ? "成功" : "失败") }
      );
    }
  },
  {
    title: "消息",
    key: "errorMsg",
    align: "left" as const,
    ellipsis: { tooltip: true },
    render: (row: ResultData) => {
      return row.errorMsg || "-";
    }
  }
]);

const summary = computed(() => {
  if (!props.resultData || props.resultData.length === 0) {
    return { total: 0, success: 0, failed: 0 };
  }
  const total = props.resultData.length;
  const success = props.resultData.filter(item => item.success).length;
  const failed = total - success;
  return { total, success, failed };
});

function closeModal() {
  visible.value = false;
}
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="dialog"
    title="操作结果"
    style="width: 1200px; max-width: 90vw"
    :mask-closable="true"
    :close-on-esc="true"
  >
    <div class="result-summary">
      <NTag type="info" size="medium" round>
        总计: {{ summary.total }}
      </NTag>
      <NTag type="success" size="medium" round>
        成功: {{ summary.success }}
      </NTag>
      <NTag type="error" size="medium" round>
        失败: {{ summary.failed }}
      </NTag>
    </div>

    <NCard size="small" :bordered="false" class="mt-16px">
      <NDataTable
        :columns="columns"
        :data="props.resultData || []"
        :bordered="true"
        size="small"
        :max-height="400"
        :scroll-x="600"
      />
    </NCard>
  </NModal>
</template>

<style scoped>
.result-summary {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  padding: 12px 0;
}
</style>
