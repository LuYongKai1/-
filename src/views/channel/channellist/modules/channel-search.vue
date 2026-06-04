<script setup lang="ts">
import { computed } from "vue";
import { $t } from "@/locales";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { translateOptions } from "@/utils/common";

defineOptions({
  name: "UserSearch",
});

interface Emits {
  (e: "reset"): void;
  (e: "search"): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useNaiveForm();

const model = defineModel<Api.SystemManage.channeSearchParams>("model", {
  required: true,
});

type RuleKey = Extract<
  keyof Api.SystemManage.channeSearchParams,
  "channelId" | "channelName"
>;

const rules = computed<Record<RuleKey, App.Global.FormRule>>(() => {
  const { patternRules } = useFormRules(); // inside computed to make locale reactive

  return {
    channelId: patternRules.channelId,
    channelName: patternRules.channelName,
  };
});

async function reset() {
  await restoreValidation();
  emit("reset");
}

async function search() {
  await validate();
  emit("search");
}
</script>

<template>
  <NCard
    :bordered="false"
    size="small"
    class="card-wrapper"
    :title="$t('common.search')"
    name="user-search"
  >
    <!-- <NCollapse> -->
    <!-- <NCollapseItem > -->
    <NForm
      ref="formRef"
      :model="model"
      :rules="rules"
      label-placement="left"
      :label-width="80"
    >
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.channel.channelId')"
          path="channelId"
          class="pr-24px"
        >
          <NInputNumber
            v-model:value="model.channelId"
            :placeholder="$t('page.manage.channel.form.channelId')"
            clearable
            :show-button="false"
            style="width: 100%"
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.channel.channelName')"
          path="channelName"
          class="pr-24px"
        >
          <NInput
            v-model:value="model.channelName"
            :placeholder="$t('page.manage.channel.form.channelName')"
          />
        </NFormItemGi>

        <NFormItemGi span="24 m:12" class="pr-24px">
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
    <!-- </NCollapseItem> -->
    <!-- </NCollapse> -->
  </NCard>
</template>

<style scoped></style>
