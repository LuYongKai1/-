<script setup lang="ts">
import { ref, computed } from "vue";
import { $t } from "@/locales";
import { debounce } from "@/utils/common";
import { questionnaireStatusOptions } from "@/constants/business";

defineOptions({
  name: "QuestionnaireSearch",
});

interface Emits {
  (e: "reset"): void;
  (e: "search", title: string, status: string, createdBy: string): void;
}
const emit = defineEmits<Emits>();

const model = ref({
  title: "",
  status: "",
  createdBy: "",
});

function reset() {
  model.value = {
    title: "",
    status: "",
    createdBy: "",
  };
  emit("reset");
}

const debouncedSearch = debounce(() => {
  emit("search", model.value.title, model.value.status, model.value.createdBy);
}, 300);

function search() {
  debouncedSearch();
}

defineExpose({
  reset,
});
</script>

<script lang="ts">
export default {
  name: "QuestionnaireSearch",
};
</script>

<template>
  <NCard :title="$t('common.search')" :bordered="false" size="small" class="card-wrapper">
    <NForm ref="formRef" :model="model" label-placement="left" :label-width="80">
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.questionnaire.title')" path="title" class="pr-24px">
          <NInput v-model:value="model.title" :placeholder="$t('page.manage.questionnaire.form.title')" @input="search" />
        </NFormItemGi>

        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.questionnaire.status')" path="status" class="pr-24px">
          <NSelect
            v-model:value="model.status"
            :placeholder="$t('page.manage.questionnaire.form.status')"
            :options="questionnaireStatusOptions"
            clearable
            @update:value="search"
          />
        </NFormItemGi>

        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.questionnaire.createdBy')" path="createdBy" class="pr-24px">
          <NInput v-model:value="model.createdBy" :placeholder="$t('page.manage.questionnaire.form.createdBy')" @input="search" />
        </NFormItemGi>

        <NFormItemGi span="24 s:12 m:6" class="pr-24px">
          <NSpace class="w-full" justify="end">
            <NButton @click="reset">
              <template #icon>
                <icon-ic-round-refresh class="text-icon" />
              </template>
              {{ $t("common.reset") }}
            </NButton>
            <NButton type="primary" ghost @click="search">
              <template #icon>
                <icon-ic-round-search class="text-icon" />
              </template>
              {{ $t("common.search") }}
            </NButton>
          </NSpace>
        </NFormItemGi>
      </NGrid>
    </NForm>
  </NCard>
</template>

<style scoped></style>
