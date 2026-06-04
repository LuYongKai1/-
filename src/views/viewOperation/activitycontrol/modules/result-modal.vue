<script setup lang="ts">
import { computed } from "vue";
import { NModal, NSpace, NTag, NButton, NEmpty, NScrollbar } from "naive-ui";

defineOptions({
  name: "ResultModal",
});

interface ResultItem {
  success: boolean;
  serverId: number;
  errorMsg?: string;
}

interface Props {
  visible: boolean;
  operation: 'enable' | 'disable';
  activityName: string;
  results: ResultItem[];
}

interface Emits {
  (e: "update:visible", visible: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const statistics = computed(() => {
  const total = props.results.length;
  const success = props.results.filter(r => r.success === true).length;
  const failed = total - success;
  return { total, success, failed };
});

const successServers = computed(() =>
  props.results.filter(r => r.success === true)
);

const failedServers = computed(() =>
  props.results.filter(r => r.success !== true)
);

const operationText = computed(() =>
  props.operation === 'enable' ? '开启' : '关闭'
);

function handleClose() {
  emit('update:visible', false);
}
</script>

<template>
  <NModal
    :show="visible"
    preset="card"
    :title="`${operationText}${activityName}结果`"
    class="w-600px"
    :segmented="{
      content: true,
      footer: 'soft'
    }"
    @update:show="(val) => $emit('update:visible', val)"
  >
    <div class="flex flex-col gap-16px">
      <!-- 统计信息 -->
      <div class="p-12px bg-gray-50 dark:bg-gray-800 rounded">
        <NSpace>
          <NTag type="info" size="medium">
            <template #icon>
              <icon-mdi-information />
            </template>
            总计: {{ statistics.total }}
          </NTag>
          <NTag v-if="statistics.success > 0" type="success" size="medium">
            <template #icon>
              <icon-mdi-check-circle />
            </template>
            成功: {{ statistics.success }}
          </NTag>
          <NTag v-if="statistics.failed > 0" type="error" size="medium">
            <template #icon>
              <icon-mdi-close-circle />
            </template>
            失败: {{ statistics.failed }}
          </NTag>
        </NSpace>
      </div>

      <!-- 结果列表 -->
      <NScrollbar style="max-height: 400px">
        <div class="flex flex-col gap-12px pr-8px">
          <!-- 成功列表 -->
          <div v-if="successServers.length > 0">
            <div class="text-14px font-medium mb-8px text-green-600 dark:text-green-400">
              <icon-mdi-check-circle class="align-text-bottom" />
              成功的服务器 ({{ successServers.length }})
            </div>
            <div class="flex flex-col gap-8px">
              <div
                v-for="item in successServers"
                :key="item.serverId"
                class="p-12px bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-8px">
                    <icon-mdi-server class="text-16px text-green-600 dark:text-green-400" />
                    <span class="font-medium">服务器 {{ item.serverId }}</span>
                  </div>
                  <NTag type="success" size="small">
                    {{ operationText }}成功
                  </NTag>
                </div>
              </div>
            </div>
          </div>

          <!-- 失败列表 -->
          <div v-if="failedServers.length > 0">
            <div class="text-14px font-medium mb-8px text-red-600 dark:text-red-400">
              <icon-mdi-close-circle class="align-text-bottom" />
              失败的服务器 ({{ failedServers.length }})
            </div>
            <div class="flex flex-col gap-8px">
              <div
                v-for="item in failedServers"
                :key="item.serverId"
                class="p-12px bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
              >
                <div class="flex items-center justify-between mb-8px">
                  <div class="flex items-center gap-8px">
                    <icon-mdi-server class="text-16px text-red-600 dark:text-red-400" />
                    <span class="font-medium">服务器 {{ item.serverId }}</span>
                  </div>
                  <NTag type="error" size="small">
                    {{ operationText }}失败
                  </NTag>
                </div>
                <div v-if="item.errorMsg" class="text-12px text-gray-600 dark:text-gray-400 pl-24px">
                  <div class="flex items-start gap-4px">
                    <icon-mdi-alert-circle class="text-14px flex-shrink-0 mt-2px" />
                    <span class="break-all">{{ item.errorMsg }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <NEmpty v-if="results.length === 0" description="暂无结果数据" />
        </div>
      </NScrollbar>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <NButton type="primary" @click="handleClose">
          确定
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped></style>
