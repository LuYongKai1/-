<script setup lang="ts">
import { computed } from "vue";
import { NModal, NButton } from "naive-ui";

defineOptions({
  name: "UpdateResultModal",
});

interface Props {
  visible: boolean;
  message: string;
  operationType: 'add' | 'edit';
}

interface Emits {
  (e: "update:visible", visible: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const title = computed(() =>
  props.operationType === 'add' ? '添加结果' : '修改结果'
);

const formattedMessage = computed(() => {
  if (!props.message) return '';
  return props.message.replace(/\n/g, '<br>');
});

function handleClose() {
  emit('update:visible', false);
}
</script>

<template>
  <NModal
    :show="visible"
    preset="card"
    :title="title"
    class="w-600px"
    :segmented="{
      content: true,
      footer: 'soft'
    }"
    @update:show="(val) => $emit('update:visible', val)"
  >
    <div class="flex flex-col gap-16px">
      <div class="p-16px bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
        <div
          class="text-14px whitespace-pre-wrap break-words leading-relaxed"
          v-html="formattedMessage"
        />
      </div>
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
