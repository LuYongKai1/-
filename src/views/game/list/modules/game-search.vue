<script setup lang="ts">
import { computed } from "vue";
import { $t } from "@/locales";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { enableStatusOptions, userGenderOptions } from "@/constants/business";
import { translateOptions } from "@/utils/common";

defineOptions({
  name: "GameSearch",
});

interface Emits {
  (e: "reset"): void;
  (e: "search"): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useNaiveForm();

const model = defineModel<Api.SystemManage.GameSearchParams>("model", {
  required: true,
});

type RuleKey = Extract<
  keyof Api.SystemManage.GameSearchParams,
  "gameId" | "gameName"
>;

const rules = computed<Record<RuleKey, App.Global.FormRule>>(() => {
  const { patternRules } = useFormRules(); // inside computed to make locale reactive

  return {
    gameId: patternRules.gameId,
    gameName: patternRules.gameName,
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
    name="game-search"
  >
    <!-- <NCollapse> -->
    <!-- <NCollapseItem :title="$t('common.search')" name="game-search"> -->
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
          :label="$t('page.manage.game.gameId')"
          path="gameId"
          class="pr-24px"
        >
          <NInputNumber
            v-model:value="model.gameId"
            :placeholder="$t('page.manage.game.form.gameId')"
            clearable
            :show-button="false"
            style="width: 100%"
          />
        </NFormItemGi>
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.game.gameName')"
          path="gameName"
          class="pr-24px"
        >
          <NInput
            v-model:value="model.gameName"
            :placeholder="$t('page.manage.game.form.gameName')"
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
