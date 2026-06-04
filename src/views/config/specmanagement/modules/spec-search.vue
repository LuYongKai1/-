<script setup lang="ts">
import { watch } from 'vue';
import { $t } from '@/locales';
import { specTypeOptions } from '@/constants/business';

defineOptions({
  name: 'SpecSearch'
});



interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const model = defineModel<any>('model', { required: true });

// 监听搜索条件变化，自动触发搜索
watch(
  () => [model.value.specName, model.value.specCode, model.value.specType],
  () => {
    emit('search');
  }
);

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
        <NFormItemGi span="24 s:12 m:6" label="规格名称" path="specName" class="pr-24px">
          <NInput
            v-model:value="model.specName"
            placeholder="请输入规格名称"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi span="24 s:12 m:6" label="规格代码" path="specCode" class="pr-24px">
          <NInput
            v-model:value="model.specCode"
            placeholder="请输入规格代码"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi span="24 s:12 m:6" label="规格类型" path="specType" class="pr-24px">
          <NSelect
            v-model:value="model.specType"
            :options="specTypeOptions"
            placeholder="请选择规格类型"
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
