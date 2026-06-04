<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { fetchBatchAddServerCross, fetchGetServerCrossServerList } from "@/service/api";
import { $t } from "@/locales";
import { useServerStore } from "@/store/modules/server";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

import {
  NSpace,
  NFormItemGi,
  NGrid,
  NTreeSelect,
  NModal,
  NForm,
  NButton,
  NScrollbar,
  NCard,
  NText,
} from "naive-ui";

defineOptions({
  name: "ConfigOperateDrawer",
});

interface Props {
  rowData?: any;
  readonly?: boolean;
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
const { defaultRequiredRule } = useFormRules();

const title = computed(() => "批量分配服务器");

// 表单验证规则
const rules = {
  servers: defaultRequiredRule
};

// 目标服务器信息
const targetServer = computed(() => {
  return props.rowData
    ? {
        serverId: props.rowData.serverId,
        serverName:
          props.rowData.serverName || `服务器${props.rowData.serverId}`,
      }
    : null;
});

const serverStore = useServerStore();
const serverTreeOptions = computed(() => serverStore.serverTreeOptions);

const selectedServerIds = ref<string[]>([]);

// 表单模型
const model = computed(() => ({
  servers: selectedServerIds.value
}));

// 获取已分配的服务器列表
async function loadAssignedServers() {
  if (!targetServer.value?.serverId) {
    return;
  }

  try {
    const response = await fetchGetServerCrossServerList(targetServer.value.serverId);

    const responseData = response?.data || response?.response?.data || response;

    if (responseData && Array.isArray(responseData)) {
      // 将已分配的服务器ID设置为选中状态
      const assignedServerIds = responseData.map((server: any) => {
        // 尝试不同的字段名
        const id = String(server.normalServerId || server.serverId || server.id || server.server_id);
        return id;
      });
      selectedServerIds.value = assignedServerIds;
    } else {
    }
  } catch (error) {
    // 使用通用异常错误处理函数
    handleApiCatchError(error, $t("page.manage.servercross.loadAssignedServers"));
  }
}

function closeDrawer() {
  visible.value = false;
  selectedServerIds.value = [];
  restoreValidation();
}

async function handleSubmit() {
  await validate();
  try {
    const serverIds: number[] = selectedServerIds.value
      .filter((id) => !String(id).startsWith("region_"))
      .map((id) => Number(id))
      .filter((id) => !isNaN(id));

    if (serverIds.length === 0) {
      window.$message?.error($t("page.manage.servercross.assignFailedTip"));
      return;
    }

    if (!targetServer.value?.serverId) {
      window.$message?.error($t("page.manage.servercross.assignFailedTip2"));
      return;
    }

    const response = await fetchBatchAddServerCross({
      crossServerId: targetServer.value.serverId,
      normalServerIds: serverIds,
    });

    // 使用通用错误处理函数
    if (handleApiResponseError(response, $t("page.manage.servercross.assign"))) {
      return;
    }

    window.$message?.success($t("page.manage.servercross.assignSuccess"));
    closeDrawer();
    emit("submitted");
  } catch (error: any) {
    // 使用通用异常错误处理函数
    handleApiCatchError(error, $t("page.manage.servercross.assign"));
  }
}

// 监听弹窗打开状态，在打开时加载已分配的服务器
watch(visible, async (newVisible) => {
  if (newVisible) {
    await loadAssignedServers();
  }
});

onMounted(() => {
  serverStore.fetchServerList();
});

const readonlyMode = computed(() => Boolean(props.readonly));
</script>

<template>
  <NModal v-model:show="visible" :title="$t('page.manage.servercross.assignServers')" preset="card" class="w-600px">
    <NScrollbar class="h-300px pr-20px">
      <NCard v-if="targetServer" :title="$t('page.manage.servercross.assignTarget')" class="mb-4">
        <NSpace>
          <NText strong>{{ $t("page.manage.servercross.crossServer") }}：</NText>
          <NText
            >{{ targetServer.serverName }} (ID:
            {{ targetServer.serverId }})</NText
          >
        </NSpace>
      </NCard>

      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        :label-width="120"
      >
        <NGrid responsive="screen" item-responsive>
          <NFormItemGi span="24 m:24" :label="$t('page.manage.servercross.normal')" path="servers">
            <NTreeSelect
              v-model:value="selectedServerIds"
              :options="serverTreeOptions"
              :placeholder="$t('page.manage.servercross.form.normalServer')"
              multiple
              cascade
              checkable
              clearable
              :check-strategy="'child'"
              :disabled="readonlyMode"
            />
          </NFormItemGi>
        </NGrid>
      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeDrawer">{{ $t("common.cancel") }}</NButton>
        <NButton type="primary" @click="handleSubmit" :disabled="readonlyMode">
          {{ $t("common.confirm") }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
