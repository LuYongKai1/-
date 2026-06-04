<script setup lang="ts">
import { ref, watch } from "vue";
import { $t } from "@/locales";
import { fetchGetActivityGM } from "@/service/api";

defineOptions({
  name: "FilterSelect",
});

interface Emits {
  (e: "reset"): void;
  (e: "search", id: string): void;
}
const emit = defineEmits<Emits>();

const templateOptions = ref<{ label: string; value: string; name: string }[]>(
  []
);
const model = ref({
  activeGmId: "",
});

async function getTemplateOptions() {
  try {
    const data = await fetchGetActivityGM();
    const rows = Array.isArray(data) ? data : data?.data || [];
    const allOption = { label: "全部", value: "", name: "" };
    templateOptions.value = [
      allOption,
      ...rows.map((item: any) => ({
        label: item.name,
        value: item.id,
        name: item.name,
      })),
    ];
  } catch (error) {
    window.$message?.error("请求失败");
    templateOptions.value = [{ label: "全部", value: "", name: "" }];
  }
}

getTemplateOptions();

watch(
  () => model.value.activeGmId,
  (newId) => {
    emit("search", newId);
  }
);
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper" :title="$t('common.search')" name="user-search">
        <NForm :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.manage.gmTemplateParams.selectTemplate')"
              path="templateName"
              class="pr-24px"
            >
              <NSelect
                v-model:value="model.activeGmId"
                :placeholder="$t('page.manage.gmTemplateParams.selectTemplate')"
                :options="templateOptions"
                filterable
              />
            </NFormItemGi>
          </NGrid>
        </NForm>
  </NCard>
</template>

<style scoped></style>
