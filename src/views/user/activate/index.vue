<script setup lang="ts">
import { ref, defineProps, defineEmits } from "vue";
import { $t } from "@/locales";
import { fetchGmTest } from "@/service/api/gm";
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NSpace,
  useDialog,
  useMessage
} from 'naive-ui';

const message = useMessage();
const formRef = ref(null);

const formValue = ref({
  type: '',
  data: ''
});

const handleSubmit = async () => {
  try {
    await fetchGmTest(formValue.value);
    message.success('提交成功');
  } catch (error) {
    message.error('提交失败');
  }
};
</script>

<template>
  <div class="user-activate">
    <div class="modal-wrapper">
      <n-form
        ref="formRef"
        :model="formValue"
        label-placement="left"
        label-width="80"
        require-mark-placement="right-hanging"
      >
        <n-form-item label="类型" path="type">
          <n-input v-model:value="formValue.type" placeholder="请输入类型"
          />
        </n-form-item>
        <n-form-item label="数据" path="data">
          <n-input v-model:value="formValue.data" placeholder="请输入数据"
          type="textarea"
          />
        </n-form-item>
        <n-space justify="center">
          <n-button type="primary" @click="handleSubmit">
            确认提交
          </n-button>
        </n-space>
      </n-form>
    </div>
  </div>
</template>

<style scoped>
.user-activate {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-wrapper {
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 500px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}
</style>
