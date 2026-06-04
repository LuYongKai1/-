<script setup lang="ts">
import { computed } from 'vue';
import { $t } from '@/locales';
import { serviceStatusOptions } from '@/constants/business';

defineOptions({
  name: 'ServiceSearch'
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const model = defineModel<any>('model', { required: true });

// 状态选项（添加"全部"选项）
const statusOptions = computed(() => {
  return [
    { label: '全部', value: null },
    ...serviceStatusOptions.map(option => ({
      label: $t(option.label),
      value: Number(option.value)
    }))
  ];
});

function reset() {
  emit('reset');
}

function search() {
  emit('search');
}
</script>

<template>
  <NCard :title="$t('common.search')" :bordered="false" size="small" class="card-wrapper">
    <NForm :model="model" label-placement="left" :label-width="80">
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi span="24 s:12 m:6" label="服务类型" path="serviceType" class="pr-24px">
          <NInput
            v-model:value="model.serviceType"
            placeholder="请输入服务类型代码"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi span="24 s:12 m:6" label="服务名称" path="serviceName" class="pr-24px">
          <NInput
            v-model:value="model.serviceName"
            placeholder="请输入服务名称"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi span="24 s:12 m:6" label="服务状态" path="status" class="pr-24px">
          <NSelect
            v-model:value="model.status"
            :options="statusOptions"
            placeholder="请选择服务状态"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi span="24 s:12 m:6" class="pr-24px">
          <NSpace class="w-full" justify="end">
            <NButton @click="reset">
              <template #icon>
                <icon-ic-round-refresh class="text-icon" />
              </template>
              {{ $t('common.reset') }}
            </NButton>
            <NButton type="primary" ghost @click="search">
              <template #icon>
                <icon-ic-round-search class="text-icon" />
              </template>
              {{ $t('common.search') }}
            </NButton>
          </NSpace>
        </NFormItemGi>
      </NGrid>
    </NForm>
  </NCard>
</template>

<style scoped></style>
