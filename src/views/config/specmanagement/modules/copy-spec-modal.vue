<script setup lang="ts">
import { ref, watch } from 'vue';
import { $t } from '@/locales';
import { fetchCopySpec } from '@/service/api/game-manage';
import { handleApiCatchError } from '@/utils/common';

interface Props {
  visible: boolean;
  sourceSpec?: any;
}

interface Emits {
  (e: 'update:visible', visible: boolean): void;
  (e: 'success'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const loading = ref(false);
const formRef = ref();

const formModel = ref({
  newSpecName: '',
  newSpecCode: ''
});

const rules = {
  newSpecName: [
    { required: true, message: '请输入新规格名称', trigger: 'blur' }
  ],
  newSpecCode: [
    { required: true, message: '请输入新规格代码', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_-]+$/, message: '规格代码只能包含字母、数字、下划线和横杠', trigger: 'blur' }
  ]
};

watch(() => props.visible, (val) => {
  if (val && props.sourceSpec) {
    // 初始化表单数据，使用源规格的名称和代码添加后缀
    formModel.value = {
      newSpecName: `${props.sourceSpec.specName}_copy`,
      newSpecCode: `${props.sourceSpec.specCode}_copy`
    };
  } else {
    formModel.value = {
      newSpecName: '',
      newSpecCode: ''
    };
  }
});

function closeModal() {
  emit('update:visible', false);
}

async function handleSubmit() {
  try {
    await formRef.value?.validate();
    loading.value = true;

    await fetchCopySpec({
      id: props.sourceSpec.id,
      newSpecName: formModel.value.newSpecName,
      newSpecCode: formModel.value.newSpecCode
    });

    window.$message?.success('复制规格成功');
    closeModal();
    emit('success');
  } catch (error: any) {
    if (error?.errors) {
      // 表单验证错误，不需要处理
      return;
    }
    handleApiCatchError(error, '复制规格');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <NModal
    :show="visible"
    preset="card"
    :title="$t('common.copySpecs')"
    class="w-600px"
    @update:show="closeModal"
  >
    <NForm
      ref="formRef"
      :model="formModel"
      :rules="rules"
      label-placement="left"
      label-width="120"
      require-mark-placement="left"
    >
      <NFormItem label="源规格名称" path="sourceSpecName">
        <NInput :value="sourceSpec?.specName" disabled placeholder="源规格名称" />
      </NFormItem>

      <NFormItem label="源规格代码" path="sourceSpecCode">
        <NInput :value="sourceSpec?.specCode" disabled placeholder="源规格代码" />
      </NFormItem>

      <NDivider />

      <NFormItem label="新规格名称" path="newSpecName">
        <NInput
          v-model:value="formModel.newSpecName"
          placeholder="请输入新规格名称"
          clearable
        />
      </NFormItem>

      <NFormItem label="新规格代码" path="newSpecCode">
        <NInput
          v-model:value="formModel.newSpecCode"
          placeholder="请输入新规格代码（只能包含字母、数字、下划线和横杠）"
          clearable
        />
      </NFormItem>

      <NAlert type="info" :show-icon="false" class="mb-16px">
        <template #icon>
          <icon-ic-round-info class="text-16px" />
        </template>
        复制操作将会复制规格的所有配置信息，包括服务配置和参数设置。
      </NAlert>
    </NForm>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="closeModal">
          {{ $t('common.cancel') }}
        </NButton>
        <NButton
          type="primary"
          :loading="loading"
          @click="handleSubmit"
        >
          {{ $t('common.confirm') }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>

