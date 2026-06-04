<script setup lang="ts">
import { NModal, NTable, NTag, NButton, NCard, NEmpty, NDataTable } from "naive-ui";
import { computed, h, watch } from "vue";
import { $t } from "@/locales";

defineOptions({
  name: "ViewStatusModal",
});

interface ServerData {
  serverId: number;
  serverName: string;
  ok?: boolean; // 未发送的邮件可能没有这个属性
  msg?: string;
}

interface Props {
  serverData: ServerData[] | null;
}

const props = defineProps<Props>();

const visible = defineModel<boolean>("visible", {
  default: false,
});

const columns = [
  {
    title: $t("page.manage.operateserver.serverId"),
    key: "serverId",
    align: "center",
    width: 100,
  },
  {
    title: $t("page.manage.mailGuildController.guildId"),
    key: "guildId",
    align: "center",
    width: 120,
    ellipsis: { tooltip: true }
  },
  {
    title: $t("page.manage.mailGuildController.guildName"),
    key: "guildName",
    align: "center",
    width: 130,
  },
  {
    title: $t("page.manage.operateserver.Sending"),
    key: "ok",
    align: "center",
    width: 150,
    render: (row: any) => {

      if (row.ok === undefined) {
        return h(
          NTag,
          {
            type: "info",
            style: "min-width: 70px; text-align: center; display: flex; justify-content: center;",
          },
          { default: () => "未发送" }
        );
      }
      return h(
        NTag,
        {
          type: row.ok ? "success" : "error",
          style: "min-width: 70px; text-align: center; display: flex; justify-content: center;",
        },
        { default: () => (row.ok ? "发送成功" : "发送失败") }
      );
    },
  },
  {
    title: $t("page.manage.operateserver.msg"),
    key: "msg",
    align: "left",
    ellipsis: { tooltip: true },
    render: (row: any) => {
      return row.msg || "-";
    },
  },
];

function closeModal() {
  visible.value = false;
}
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <NModal
      v-model:show="visible"
      preset="dialog"
      :title="$t('page.manage.operateserver.titleserver')"
      style="width: 1300px; height: 600px;"
      :mask-closable="true"
      :close-on-esc="true"
    >
      <NCard size="small" :bordered="false" >
        <NDataTable
          :columns="columns"
          :data="props.serverData || []"
          :bordered="true"
          size="small"
        />
      </NCard>
    </NModal>
  </div>
</template>


